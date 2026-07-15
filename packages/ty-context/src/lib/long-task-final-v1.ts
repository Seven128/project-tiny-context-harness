import type {
  CheckExecutionResultV1,
  FinalReceiptV1,
  LongTaskFindingV1,
  VerificationCacheV1,
} from "./long-task-delivery-types.js";
import {
  assertMatchingActiveBinding,
  clearFinalReceipt,
  readCompiledDeliveryContract,
  writeFinalReceipt,
  writeVerificationCache,
} from "./long-task-state.js";
import {
  allCompiledChecks,
  runDeliveryChecks,
} from "./long-task-verifier-v1.js";
import {
  captureWorkspaceManifest,
  createWorkspaceSnapshot,
} from "./long-task-workspace.js";

export type FinalGateOutputV1 =
  | FinalReceiptV1
  | {
      schema_version: "long-task-final-result-v1";
      workflow_status: "needs_work" | "blocked_external";
      compiled_identity: string;
      snapshot_sha256: string;
      check_results: CheckExecutionResultV1[];
      outcome_results: Record<string, "passed" | "failed" | "blocked_external">;
      findings: LongTaskFindingV1[];
      started_at: string;
      completed_at: string;
    };

export async function runDeliveryFinalGate(
  workdir: string,
): Promise<FinalGateOutputV1> {
  const startedAt = new Date().toISOString();
  const compiled = await readCompiledDeliveryContract(workdir);
  await assertMatchingActiveBinding(compiled);
  const snapshot = await createWorkspaceSnapshot(
    compiled.repository_root,
    compiled.workdir,
    `final-${compiled.task.id}`,
  );
  try {
    const run = await runDeliveryChecks(
      compiled,
      snapshot,
      allCompiledChecks(compiled),
      true,
    );
    const currentAfter = await captureWorkspaceManifest(
      compiled.repository_root,
      compiled.workdir,
    );
    if (currentAfter.snapshot_sha256 !== snapshot.manifest.snapshot_sha256)
      run.findings.push({
        code: "workspace_changed_during_final_gate",
        outcome_key: null,
        check_key: null,
        message: "The workspace changed while Final Gate was running.",
        next_action:
          "Stop concurrent mutation and rerun the complete Final Gate.",
      });
    const outcomeResults = projectOutcomes(
      compiled,
      run.check_results,
      run.findings,
    );
    const failed =
      Object.values(outcomeResults).includes("failed") ||
      run.check_results.some(
        (check) => check.outcome_key === null && check.status === "failed",
      ) ||
      run.findings.some((finding) => finding.code !== "blocked_external");
    const blocked =
      Object.values(outcomeResults).includes("blocked_external") ||
      run.check_results.some((check) => check.status === "blocked_external");
    const completedAt = new Date().toISOString();
    if (!failed && !blocked && run.findings.length === 0) {
      return writeFinalReceipt(compiled.repository_root, compiled.workdir, {
        schema_version: "long-task-final-receipt-v1",
        workflow_status: "accepted",
        compiled_identity: compiled.compiled_identity,
        contract_sha256: compiled.contract_sha256,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
        source_hashes: compiled.source_hashes,
        context_hashes: compiled.context_snapshot.sha256,
        verifier_identity: compiled.verifier_identity,
        check_results: run.check_results,
        outcome_results: outcomeResults,
        findings: [],
        started_at: startedAt,
        completed_at: completedAt,
      });
    }
    await clearFinalReceipt(compiled.repository_root, compiled.workdir);
    const cache: VerificationCacheV1 = {
      schema_version: "long-task-verification-cache-v1",
      compiled_identity: compiled.compiled_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      acceptance_authorized: false,
      selected_outcome: null,
      selected_check: null,
      check_results: run.check_results,
      findings: run.findings,
      completed_at: completedAt,
    };
    await writeVerificationCache(compiled.workdir, cache);
    return {
      schema_version: "long-task-final-result-v1",
      workflow_status: blocked && !failed ? "blocked_external" : "needs_work",
      compiled_identity: compiled.compiled_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      check_results: run.check_results,
      outcome_results: outcomeResults,
      findings: run.findings,
      started_at: startedAt,
      completed_at: completedAt,
    };
  } finally {
    await snapshot.dispose();
  }
}

function projectOutcomes(
  compiled: Awaited<ReturnType<typeof readCompiledDeliveryContract>>,
  checks: CheckExecutionResultV1[],
  findings: LongTaskFindingV1[],
): Record<string, "passed" | "failed" | "blocked_external"> {
  return Object.fromEntries(
    compiled.outcomes.map((outcome) => {
      const owned = checks.filter((check) => check.outcome_key === outcome.key);
      const ownFindings = findings.filter(
        (finding) =>
          finding.outcome_key === outcome.key || finding.outcome_key === null,
      );
      const status =
        owned.some((check) => check.status === "failed") ||
        ownFindings.some((finding) => finding.code !== "blocked_external")
          ? "failed"
          : owned.some((check) => check.status === "blocked_external")
            ? "blocked_external"
            : "passed";
      return [outcome.key, status];
    }),
  );
}
