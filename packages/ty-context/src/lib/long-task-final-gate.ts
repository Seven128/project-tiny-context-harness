import {
  readCompiledLongTaskContract,
  assertLongTaskContractFresh,
} from "./long-task-contract-compiler.js";
import {
  createLongTaskSnapshot,
  hashLongTaskWorkspace,
} from "./long-task-snapshot.js";
import { verifyLongTask } from "./long-task-verifier.js";
import { evaluateLongTaskBindings } from "./long-task-binding-evaluator.js";
import { runLongTaskCounterfactuals } from "./long-task-counterfactual-runner.js";
import { projectLongTaskEntities } from "./long-task-entity-projector.js";
import type {
  FinalResultV3,
  LongTaskEntityResultV3,
  LongTaskFindingV2,
} from "./long-task-run-result.js";
import { writeLongTaskFinalAuthority } from "./long-task-final-receipt.js";
import type { SnapshotHandle } from "./long-task-run-result.js";
import type { VerificationSpecResultCache } from "./long-task-verifier.js";

export async function runLongTaskFinalGate(
  workdir: string,
  options: {
    snapshot?: SnapshotHandle;
    specResultCache?: VerificationSpecResultCache;
  } = {},
): Promise<FinalResultV3> {
  const contract = await readCompiledLongTaskContract(workdir);
  await assertLongTaskContractFresh(contract);
  const runId = `FINAL-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${process.pid}-${contract.contract_sha256.slice(0, 8)}`;
  const snapshot =
    options.snapshot ??
    (await createLongTaskSnapshot(contract.repository_root, contract, runId));
  const ownsSnapshot = options.snapshot === undefined;
  const before = snapshot.manifest.snapshot_sha256;
  try {
    const run = await verifyLongTask(
      workdir,
      contract.verification_specs.map((spec) => spec.id),
      {
        contract,
        snapshot,
        run_id: runId,
        acceptanceGate: true,
        specResultCache: options.specResultCache,
      },
    );
    if (
      !run.acceptance_authorized ||
      run.verification_scope !== "full_acceptance" ||
      run.spec_results.length !== contract.verification_specs.length
    )
      throw new Error("final_gate_full_slice_scope_required");
    const binding = evaluateLongTaskBindings(
      contract,
      snapshot.manifest,
      run,
      workdir,
    );
    const counterfactual = await runLongTaskCounterfactuals(
      contract,
      snapshot.root,
      workdir,
      run,
    );
    const after = await hashLongTaskWorkspace(
      contract.repository_root,
      contract,
    );
    const findings: LongTaskFindingV2[] = [
      ...run.findings,
      ...binding.findings,
      ...counterfactual.findings,
    ];
    if (before !== after || after !== run.snapshot.snapshot_sha256)
      findings.push(
        workspaceFinding(
          workdir,
          run.run_id,
          run.snapshot.snapshot_sha256,
          after,
        ),
      );
    const globalCodes = findings
      .filter(
        (item) =>
          !item.requirement_id &&
          !item.obligation_id &&
          !item.ac_id &&
          !item.verification_spec_id,
      )
      .map((item) => item.category);
    const projection = projectLongTaskEntities(
      contract,
      run,
      binding.binding_results,
      counterfactual.counterfactual_results,
      globalCodes,
    );
    const everyEntityPassed =
      [
        projection.requirement_results,
        projection.plan_item_results,
        projection.obligation_results,
        projection.acceptance_results,
        projection.proof_requirement_results,
      ].every(allPassed) &&
      Object.values(projection.binding_results).every(
        (item) => item.status === "passed",
      ) &&
      Object.values(projection.counterfactual_results).every(
        (item) => item.status === "passed",
      ) &&
      run.spec_results.every((item) => item.status === "passed");
    const accepted = findings.length === 0 && everyEntityPassed;
    const result: FinalResultV3 = {
      schema_version: "long-task-final-result-v3",
      workflow_status: accepted ? "accepted" : "needs_work",
      contract_sha256: contract.contract_sha256,
      run_id: run.run_id,
      final_snapshot_sha256: run.snapshot.snapshot_sha256,
      source_hashes: Object.fromEntries(
        Object.entries(contract.sources).map(([key, value]) => [
          key,
          value.sha256,
        ]),
      ),
      context_hashes: contract.context_snapshot.sha256,
      oracle_hashes: Object.assign(
        {},
        ...contract.verification_specs.map((spec) => spec.oracle_sha256),
      ),
      verifier_identity: contract.verifier_identity,
      ...projection,
      spec_results: Object.fromEntries(
        run.spec_results.map((value) => [value.spec_id, value.status]),
      ),
      workspace_hash_before: before,
      workspace_hash_after: after,
      findings,
      started_at: run.started_at,
      completed_at: new Date().toISOString(),
      atomic_write_complete: true,
    };
    await writeLongTaskFinalAuthority(contract, workdir, result);
    return result;
  } finally {
    if (ownsSnapshot) await snapshot.dispose();
  }
}
function allPassed(values: Record<string, LongTaskEntityResultV3>): boolean {
  return Object.values(values).every((item) => item.status === "passed");
}
function workspaceFinding(
  workdir: string,
  runId: string,
  expected: string,
  actual: string,
): LongTaskFindingV2 {
  return {
    category: "workspace_changed_during_or_after_final",
    expected,
    actual,
    evidence_path: `runs/${runId}/snapshot-manifest.json`,
    next_action: "Restore a stable workspace and rerun final-gate",
    reverify_command: `ty-context composite-long-task final-gate ${quote(workdir)}`,
  };
}
function quote(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
