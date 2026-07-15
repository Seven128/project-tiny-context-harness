import type {
  CheckExecutionResultV1,
  CompiledCheckV1,
  CompiledDeliveryContractV1,
  LongTaskFindingV1,
  TargetedVerificationResultV1,
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
  writeProgressRecord,
} from "./long-task-state.js";
import { createProgressRecord } from "./long-task-progress.js";
import { deliverySetWorkspaceExclusions } from "./long-task-delivery-set-state.js";
import { matchesRepoPattern } from "./long-task-paths.js";
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
): Promise<TargetedVerificationResultV1> {
  const compiled = await readCompiledDeliveryContract(workdir);
  await assertMatchingActiveBinding(compiled);
  const selected = selectChecks(compiled, selection);
  const exclusions = await deliverySetWorkspaceExclusions(compiled);
  const snapshot = await createWorkspaceSnapshot(
    compiled.repository_root,
    compiled.workdir,
    `verify-${compiled.task.id}`,
    exclusions,
  );
  try {
    const run = await runDeliveryChecks(compiled, snapshot, selected, true);
    const records = run.check_results.map((result) => {
      const check = selected.find(
        (item) => item.internal_id === result.internal_id,
      );
      if (!check)
        throw new Error(`compiled_check_not_found:${result.internal_id}`);
      return createProgressRecord(compiled, snapshot.manifest, check, result);
    });
    await Promise.all(
      records.map((record) => writeProgressRecord(workdir, record)),
    );
    return {
      schema_version: "long-task-targeted-progress-v1",
      compiled_identity: compiled.compiled_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      acceptance_authorized: false,
      selected_outcome: selection.outcome ?? null,
      selected_check: selection.check ?? null,
      updated_progress_records: records.map(
        (record) => record.check_internal_id,
      ),
      check_results: run.check_results,
      findings: run.findings,
      completed_at: new Date().toISOString(),
    };
  } finally {
    await snapshot.dispose();
  }
}

export async function runDeliveryChecks(
  compiled: CompiledDeliveryContractV1,
  snapshot: WorkspaceSnapshotV1,
  checks: CompiledCheckV1[],
  includeCounterfactuals: boolean,
  finalGate = false,
  scopeOverride?: { allowed: string[]; forbidden: string[] },
): Promise<DeliveryRunV1> {
  const findings = await preRunFindings(
    compiled,
    snapshot.manifest,
    scopeOverride,
  );
  if (finalGate)
    findings.push(...finalPathFindings(compiled, snapshot.manifest));
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

function finalPathFindings(
  compiled: CompiledDeliveryContractV1,
  manifest: WorkspaceManifestV1,
): LongTaskFindingV1[] {
  const findings: LongTaskFindingV1[] = [];
  for (const check of allCompiledChecks(compiled))
    for (const pattern of check.expected_output_paths)
      if (
        !manifest.files.some((file) => matchesRepoPattern(file.path, pattern))
      )
        findings.push({
          code: "expected_output_path_missing",
          outcome_key: check.outcome_key,
          check_key: check.key,
          message: `Expected output path did not exist: ${pattern}`,
          expected: pattern,
          next_action: "Create the declared output and rerun verification.",
        });
  for (const outcome of compiled.outcomes)
    for (const binding of outcome.technical.bindings)
      if (
        binding.existence === "planned" &&
        !binding.carrier_paths.every((pattern) =>
          manifest.files.some((file) => matchesRepoPattern(file.path, pattern)),
        )
      )
        findings.push({
          code: "planned_binding_missing",
          outcome_key: outcome.key,
          check_key: null,
          message: `Planned binding is missing: ${binding.target}`,
          expected: binding.carrier_paths,
          next_action: "Implement the declared binding and rerun verification.",
        });
  return findings;
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
  scopeOverride?: { allowed: string[]; forbidden: string[] },
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
  const protectedAuthorityFiles = new Set([
    ...Object.keys(compiled.contract_files),
    ...Object.keys(compiled.source_hashes),
    ...Object.keys(compiled.context_snapshot.sha256),
    ...allCompiledChecks(compiled).flatMap((check) =>
      Object.keys(check.runner.frozen_files),
    ),
  ]);
  const changed = changedWorkspacePaths(
    compiled.initial_task_base.workspace_manifest,
    current,
  ).filter((file) => !protectedAuthorityFiles.has(file));
  const allowed =
    scopeOverride?.allowed ??
    compiled.outcomes.flatMap((outcome) => [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ]);
  const forbidden = scopeOverride?.forbidden ?? [
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
