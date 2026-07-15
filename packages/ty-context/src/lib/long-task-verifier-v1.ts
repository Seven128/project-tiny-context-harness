import type {
  CheckExecutionResultV1,
  CompiledCheckV1,
  CompiledDeliveryContractV1,
  LongTaskFindingV1,
  VerificationCacheV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import {
  executeCheckRunner,
  type RunnerEvidenceV1,
} from "./long-task-check-runner.js";
import {
  evaluateCheckEvidence,
  evaluateOutcomeCounterfactuals,
} from "./long-task-evidence-v1.js";
import { findScopeEscapes } from "./long-task-paths.js";
import {
  assertMatchingActiveBinding,
  readCompiledDeliveryContract,
  writeVerificationCache,
} from "./long-task-state.js";
import {
  changedWorkspacePaths,
  createWorkspaceSnapshot,
  type WorkspaceSnapshotV1,
} from "./long-task-workspace.js";

export interface DeliveryRunV1 {
  snapshot: WorkspaceManifestV1;
  check_results: CheckExecutionResultV1[];
  findings: LongTaskFindingV1[];
}

export async function verifyDeliveryContract(
  workdir: string,
  selection: { outcome?: string; check?: string } = {},
): Promise<VerificationCacheV1> {
  const compiled = await readCompiledDeliveryContract(workdir);
  await assertMatchingActiveBinding(compiled);
  const selected = selectChecks(compiled, selection);
  const snapshot = await createWorkspaceSnapshot(
    compiled.repository_root,
    compiled.workdir,
    `verify-${compiled.task.id}`,
  );
  try {
    const run = await runDeliveryChecks(compiled, snapshot, selected, true);
    const cache: VerificationCacheV1 = {
      schema_version: "long-task-verification-cache-v1",
      compiled_identity: compiled.compiled_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      acceptance_authorized: false,
      selected_outcome: selection.outcome ?? null,
      selected_check: selection.check ?? null,
      check_results: run.check_results,
      findings: run.findings,
      completed_at: new Date().toISOString(),
    };
    await writeVerificationCache(workdir, cache);
    return cache;
  } finally {
    await snapshot.dispose();
  }
}

export async function runDeliveryChecks(
  compiled: CompiledDeliveryContractV1,
  snapshot: WorkspaceSnapshotV1,
  checks: CompiledCheckV1[],
  includeCounterfactuals: boolean,
): Promise<DeliveryRunV1> {
  const findings = await preRunFindings(compiled, snapshot.manifest);
  if (findings.length)
    return { snapshot: snapshot.manifest, check_results: [], findings };

  const evidence = new Map<string, RunnerEvidenceV1>();
  const checkResults: CheckExecutionResultV1[] = [];
  for (const check of checks) {
    let value = evidence.get(check.runner.execution_identity);
    if (!value) {
      value = await executeCheckRunner(check, snapshot.root);
      evidence.set(check.runner.execution_identity, value);
    }
    const outcome = check.outcome_key
      ? compiled.outcomes.find((item) => item.key === check.outcome_key)
      : undefined;
    checkResults.push(evaluateCheckEvidence(check, value, outcome));
  }
  findings.push(...checkResults.flatMap((result) => result.findings));

  if (includeCounterfactuals) {
    const outcomeKeys = new Set(
      checks
        .map((check) => check.outcome_key)
        .filter((key): key is string => Boolean(key)),
    );
    for (const outcome of compiled.outcomes.filter((item) =>
      outcomeKeys.has(item.key),
    )) {
      const selectedKeys = new Set(
        checks
          .filter((check) => check.outcome_key === outcome.key)
          .map((check) => check.key),
      );
      const relevant = {
        ...outcome,
        acceptance: {
          ...outcome.acceptance,
          counterfactual_controls:
            outcome.acceptance.counterfactual_controls.filter((control) =>
              selectedKeys.has(control.check_key),
            ),
        },
      };
      findings.push(
        ...(await evaluateOutcomeCounterfactuals(relevant, snapshot.root)),
      );
    }
  }
  return { snapshot: snapshot.manifest, check_results: checkResults, findings };
}

export function allCompiledChecks(
  compiled: CompiledDeliveryContractV1,
): CompiledCheckV1[] {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

function selectChecks(
  compiled: CompiledDeliveryContractV1,
  selection: { outcome?: string; check?: string },
): CompiledCheckV1[] {
  const checks = allCompiledChecks(compiled);
  if (
    selection.outcome &&
    !compiled.outcomes.some((outcome) => outcome.key === selection.outcome)
  )
    throw new Error(`outcome_not_found:${selection.outcome}`);
  const filtered = checks.filter(
    (check) =>
      (!selection.outcome || check.outcome_key === selection.outcome) &&
      (!selection.check || check.key === selection.check),
  );
  if (selection.check && !filtered.length)
    throw new Error(`check_not_found:${selection.check}`);
  return filtered;
}

async function preRunFindings(
  compiled: CompiledDeliveryContractV1,
  current: WorkspaceManifestV1,
): Promise<LongTaskFindingV1[]> {
  const stale = await deliveryCompileFreshness(compiled);
  if (stale.length)
    return stale.map((code) => ({
      code,
      outcome_key: null,
      check_key: null,
      message: "A compiled Contract input changed.",
      next_action:
        "Run ty-context long-task compile after reviewing the Contract change.",
    }));
  const changed = changedWorkspacePaths(compiled.baseline_workspace, current);
  const allowed = compiled.outcomes.flatMap((outcome) => [
    ...outcome.technical.expected_change_paths,
    ...outcome.technical.allowed_support_paths,
  ]);
  const forbidden = [
    ...compiled.global.technical.forbidden_paths,
    ...compiled.outcomes.flatMap(
      (outcome) => outcome.technical.forbidden_paths,
    ),
  ];
  const escaped = findScopeEscapes(changed, allowed, forbidden);
  return escaped.length
    ? [
        {
          code: "scope_or_risk_escalation_required",
          outcome_key: null,
          check_key: null,
          message: `Changed paths are outside the Contract boundary: ${escaped.join(",")}`,
          actual: escaped,
          next_action:
            "Review risk/ownership, update declared change paths and recompile in the same Goal.",
        },
      ]
    : [];
}
