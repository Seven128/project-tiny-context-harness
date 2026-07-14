import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  parseStrictJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import {
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  activateLongTask,
  clearCampaignLongTaskBinding,
} from "./long-task-active-task.js";
import {
  compileLongTaskContract,
  writeCompiledLongTaskContract,
} from "./long-task-contract-compiler.js";
import { runLongTaskFinalGate } from "./long-task-final-gate.js";
import { assertLongTaskCompletionGate } from "./long-task-hook-preflight.js";
import type {
  FinalResultV3,
  VerificationRunResultV2,
} from "./long-task-run-result.js";
import { LONG_TASK_SOURCE_FILES } from "./long-task-contract-schema.js";
import { atomic } from "./long-task-status.js";
import { createLongTaskSnapshot } from "./long-task-snapshot.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import {
  verifyLongTask,
  type VerificationSpecResultCache,
} from "./long-task-verifier.js";
import { readSliceExecutionReceiptV2 } from "./composite-campaign-receipt.js";
import { validateChangeEnvelopeV1 } from "./composite-campaign-change-envelope.js";
import {
  splitWaveSpecId,
  type WaveImpactDecisionV2,
} from "./composite-campaign-wave-impact.js";

export interface CampaignFinalSliceInput {
  slice_id: string;
  packet_revision_path: string;
  receipt_path: string;
}

export interface CampaignGlobalConstraintBindingV1 {
  constraint_id: string;
  applies_to: string[];
  requirement_ids: string[];
  acceptance_criterion_ids: string[];
  verification_spec_ids: string[];
}

export interface CampaignFinalSliceResultV1 {
  slice_id: string;
  contract_sha256: string;
  final_result_sha256: string;
  run_id: string;
  final_snapshot_sha256: string;
  workflow_status: FinalResultV3["workflow_status"];
}

export interface CampaignConstraintResultV1 {
  constraint_id: string;
  status: "passed" | "failed";
  matched_slice_ids: string[];
  missing_refs: string[];
}

export interface CampaignFinalResultV1 {
  schema_version: "campaign-final-result-v1";
  campaign_id: string;
  workflow_status: "needs_work" | "ready_to_merge" | "accepted";
  integration_branch: string;
  integration_head: string;
  integration_tree: string;
  final_snapshot_sha256: string | null;
  source_plan_sha256: string;
  source_coverage_sha256: string;
  source_coverage_complete: boolean;
  slice_results: CampaignFinalSliceResultV1[];
  global_constraint_results: CampaignConstraintResultV1[];
  target_commit: string | null;
  completed_at: string;
  result_sha256: string;
}

export interface WaveIntegrationResultV1 {
  schema_version: "wave-integration-result-v1";
  campaign_id: string;
  wave_id: string;
  workflow_status: "needs_work" | "integration_verified";
  integration_head: string;
  integration_tree: string;
  final_snapshot_sha256: string | null;
  slice_results: CampaignFinalSliceResultV1[];
  completed_at: string;
  result_sha256: string;
}

export interface WaveIntegrationSliceResultV2 {
  slice_id: string;
  contract_sha256: string;
  run_id: string;
  final_snapshot_sha256: string;
  verification_scope: "impact_repair";
  spec_results: Record<string, "passed" | "failed" | "blocked">;
  finding_categories: string[];
}

export interface WaveIntegrationResultV2 {
  schema_version: "wave-integration-result-v2";
  campaign_id: string;
  wave_id: string;
  workflow_status: "needs_work" | "integration_verified";
  integration_head: string;
  integration_tree: string;
  final_snapshot_sha256: string;
  impact_analysis_sha256: string;
  affected_spec_ids: string[];
  slice_results: WaveIntegrationSliceResultV2[];
  completed_at: string;
  result_sha256: string;
}

export async function runCampaignFinalGate(options: {
  campaignRoot: string;
  campaignId: string;
  integrationWorktree: string;
  integrationBranch: string;
  sourcePlanSha256: string;
  sourceCoverageFile: string;
  sourceCoverageComplete: boolean;
  slices: CampaignFinalSliceInput[];
  globalConstraints: CampaignGlobalConstraintBindingV1[];
}): Promise<CampaignFinalResultV1> {
  const integration = path.resolve(options.integrationWorktree);
  if (!(await gitStatus(integration)).clean)
    throw new Error("campaign_final_gate_requires_clean_integration_worktree");
  const integrationHead = await currentHead(integration);
  const integrationTree = (
    await runGit(integration, ["rev-parse", `${integrationHead}^{tree}`])
  ).stdout.trim();
  const sourceCoverageSha256 = sha256Hex(
    await readFile(path.resolve(options.sourceCoverageFile)),
  );
  const set = await runSliceSet(
    integration,
    options.campaignId,
    "campaign-final",
    options.slices,
  );
  if (!set.accepted)
    return writeCampaignFinalResult(
      options,
      integrationHead,
      integrationTree,
      sourceCoverageSha256,
      set.sliceResults,
      [],
      null,
      "needs_work",
    );
  const constraintResults = evaluateGlobalConstraints(
    options.globalConstraints,
    set.fullResults,
  );
  const accepted =
    options.sourceCoverageComplete &&
    constraintResults.every((item) => item.status === "passed");
  return writeCampaignFinalResult(
    options,
    integrationHead,
    integrationTree,
    sourceCoverageSha256,
    set.sliceResults,
    constraintResults,
    set.commonSnapshot,
    accepted ? "ready_to_merge" : "needs_work",
  );
}

export async function runWaveIntegrationGate(options: {
  campaignRoot: string;
  campaignId: string;
  waveId: string;
  integrationWorktree: string;
  slices: CampaignFinalSliceInput[];
  impact: WaveImpactDecisionV2;
}): Promise<WaveIntegrationResultV2> {
  const integration = path.resolve(options.integrationWorktree);
  if (!(await gitStatus(integration)).clean)
    throw new Error("wave_integration_gate_requires_clean_worktree");
  const integrationHead = await currentHead(integration);
  const integrationTree = (
    await runGit(integration, ["rev-parse", `${integrationHead}^{tree}`])
  ).stdout.trim();
  if (options.impact.schema_version !== "campaign-wave-impact-v2")
    throw new Error("wave_integration_gate_requires_impact_v2");
  const actualSlices = options.slices
    .map((slice) => slice.slice_id)
    .sort(asciiCompare);
  const impactSlices = [...options.impact.affected_slice_ids].sort(
    asciiCompare,
  );
  if (actualSlices.join("\n") !== impactSlices.join("\n"))
    throw new Error("wave_integration_gate_slice_impact_mismatch");
  const set = await runWaveSliceSet(
    integration,
    options.campaignId,
    `wave-${options.waveId}`,
    options.slices,
    options.impact.affected_spec_ids,
  );
  const identity = {
    schema_version: "wave-integration-result-v2" as const,
    campaign_id: options.campaignId,
    wave_id: options.waveId,
    workflow_status: set.accepted
      ? ("integration_verified" as const)
      : ("needs_work" as const),
    integration_head: integrationHead,
    integration_tree: integrationTree,
    final_snapshot_sha256: set.commonSnapshot,
    impact_analysis_sha256: sha256Hex(canonicalJson(options.impact)),
    affected_spec_ids: [...options.impact.affected_spec_ids].sort(asciiCompare),
    slice_results: set.sliceResults,
    completed_at: new Date().toISOString(),
  };
  const result: WaveIntegrationResultV2 = {
    ...identity,
    result_sha256: sha256Hex(canonicalJson(identity)),
  };
  await atomic(
    path.join(
      path.resolve(options.campaignRoot),
      "waves",
      options.waveId,
      "integration-result.json",
    ),
    result,
  );
  return result;
}

export async function markCampaignTargetAccepted(
  file: string,
  targetCommit: string,
): Promise<CampaignFinalResultV1> {
  const current = await readCampaignFinalResult(file);
  if (current.workflow_status !== "ready_to_merge")
    throw new Error("campaign_final_result_not_ready_to_merge");
  if (targetCommit !== current.integration_head)
    throw new Error("campaign_target_commit_does_not_match_verified_snapshot");
  const { result_sha256: _oldHash, ...identity } = current;
  const nextIdentity = {
    ...identity,
    workflow_status: "accepted" as const,
    target_commit: targetCommit,
    completed_at: new Date().toISOString(),
  };
  const next: CampaignFinalResultV1 = {
    ...nextIdentity,
    result_sha256: sha256Hex(canonicalJson(nextIdentity)),
  };
  await atomic(file, next);
  return next;
}

export async function readCampaignFinalResult(
  file: string,
): Promise<CampaignFinalResultV1> {
  const value = JSON.parse(
    await readFile(file, "utf8"),
  ) as CampaignFinalResultV1;
  if (value.schema_version !== "campaign-final-result-v1")
    throw new Error("campaign_final_result_invalid");
  const { result_sha256, ...identity } = value;
  if (result_sha256 !== sha256Hex(canonicalJson(identity)))
    throw new Error("campaign_final_result_hash_mismatch");
  return value;
}

interface PreparedSliceV1 {
  slice: CampaignFinalSliceInput;
  workdir: string;
  contract: CompiledContractV3;
}

async function runWaveSliceSet(
  integration: string,
  campaignId: string,
  phase: string,
  slices: CampaignFinalSliceInput[],
  affectedSpecIds: string[],
): Promise<{
  accepted: boolean;
  commonSnapshot: string;
  sliceResults: WaveIntegrationSliceResultV2[];
}> {
  await assertCampaignFinalScopeV1(slices);
  const gate = await assertLongTaskCompletionGate(integration);
  await clearCampaignLongTaskBinding(integration, campaignId);
  const prepared = await prepareSliceSet(
    integration,
    campaignId,
    phase,
    slices,
  );
  const selectedBySlice = new Map<string, string[]>();
  if (new Set(affectedSpecIds).size !== affectedSpecIds.length)
    throw new Error("wave_integration_gate_duplicate_spec_identity");
  for (const value of affectedSpecIds) {
    const selected = splitWaveSpecId(value);
    if (!prepared.some((item) => item.slice.slice_id === selected.slice_id))
      throw new Error(
        `wave_integration_gate_unknown_slice:${selected.slice_id}`,
      );
    const current = selectedBySlice.get(selected.slice_id) ?? [];
    current.push(selected.spec_id);
    selectedBySlice.set(selected.slice_id, current);
  }
  for (const item of prepared) {
    const selected = selectedBySlice.get(item.slice.slice_id) ?? [];
    if (!selected.length)
      throw new Error(
        `wave_integration_gate_slice_without_spec:${item.slice.slice_id}`,
      );
    const known = new Set(
      item.contract.verification_specs.map((spec) => spec.id),
    );
    for (const specId of selected)
      if (!known.has(specId))
        throw new Error(
          `wave_integration_gate_unknown_spec:${item.slice.slice_id}:${specId}`,
        );
  }
  const snapshot = await createLongTaskSnapshot(
    integration,
    prepared[0].contract,
    `${campaignId}-${phase}`,
  );
  const specResultCache: VerificationSpecResultCache = new Map();
  const sliceResults: WaveIntegrationSliceResultV2[] = [];
  let accepted = true;
  try {
    for (const item of prepared) {
      await activateLongTask(item.contract, gate.bundle_sha256, {
        campaign_id: campaignId,
        slice_id: item.slice.slice_id,
      });
      let run: VerificationRunResultV2;
      try {
        run = await verifyLongTask(
          item.workdir,
          selectedBySlice.get(item.slice.slice_id),
          {
            contract: item.contract,
            snapshot,
            run_id: `WAVE-${phase}-${item.slice.slice_id}-${Date.now()}`,
            repairScope: "impact_repair",
            specResultCache,
          },
        );
      } finally {
        await clearCampaignLongTaskBinding(integration, campaignId);
      }
      if (
        run.verification_scope !== "impact_repair" ||
        run.acceptance_authorized ||
        run.snapshot.snapshot_sha256 !== snapshot.manifest.snapshot_sha256
      )
        throw new Error("wave_integration_gate_verification_identity_invalid");
      if (
        run.findings.length ||
        run.spec_results.some((result) => result.status !== "passed")
      )
        accepted = false;
      sliceResults.push({
        slice_id: item.slice.slice_id,
        contract_sha256: item.contract.contract_sha256,
        run_id: run.run_id,
        final_snapshot_sha256: run.snapshot.snapshot_sha256,
        verification_scope: "impact_repair",
        spec_results: Object.fromEntries(
          run.spec_results.map((result) => [result.spec_id, result.status]),
        ),
        finding_categories: [
          ...new Set(run.findings.map((item) => item.category)),
        ].sort(asciiCompare),
      });
    }
    return {
      accepted,
      commonSnapshot: snapshot.manifest.snapshot_sha256,
      sliceResults,
    };
  } finally {
    await snapshot.dispose();
  }
}

async function runSliceSet(
  integration: string,
  campaignId: string,
  phase: string,
  slices: CampaignFinalSliceInput[],
): Promise<{
  accepted: boolean;
  commonSnapshot: string | null;
  sliceResults: CampaignFinalSliceResultV1[];
  fullResults: Map<string, FinalResultV3>;
}> {
  await assertCampaignFinalScopeV1(slices);
  const gate = await assertLongTaskCompletionGate(integration);
  await clearCampaignLongTaskBinding(integration, campaignId);
  const sliceResults: CampaignFinalSliceResultV1[] = [];
  const fullResults = new Map<string, FinalResultV3>();
  const prepared = await prepareSliceSet(
    integration,
    campaignId,
    phase,
    slices,
  );
  const snapshot = await createLongTaskSnapshot(
    integration,
    prepared[0].contract,
    `${campaignId}-${phase}`,
  );
  const specResultCache: VerificationSpecResultCache = new Map();
  try {
    for (const item of prepared) {
      await activateLongTask(item.contract, gate.bundle_sha256, {
        campaign_id: campaignId,
        slice_id: item.slice.slice_id,
      });
      let result: FinalResultV3;
      try {
        result = await runLongTaskFinalGate(item.workdir, {
          snapshot,
          specResultCache,
        });
      } finally {
        await clearCampaignLongTaskBinding(integration, campaignId);
      }
      const resultText = await readFile(
        path.join(item.workdir, "final-result.json"),
        "utf8",
      );
      fullResults.set(item.slice.slice_id, result);
      sliceResults.push({
        slice_id: item.slice.slice_id,
        contract_sha256: result.contract_sha256,
        final_result_sha256: sha256Hex(resultText),
        run_id: result.run_id,
        final_snapshot_sha256: result.final_snapshot_sha256,
        workflow_status: result.workflow_status,
      });
      if (result.workflow_status !== "accepted")
        return {
          accepted: false,
          commonSnapshot: snapshot.manifest.snapshot_sha256,
          sliceResults,
          fullResults,
        };
      if (snapshot.manifest.snapshot_sha256 !== result.final_snapshot_sha256)
        throw new Error("campaign_slice_set_snapshots_differ");
    }
    return {
      accepted: true,
      commonSnapshot: snapshot.manifest.snapshot_sha256,
      sliceResults,
      fullResults,
    };
  } finally {
    await snapshot.dispose();
  }
}

async function prepareSliceSet(
  integration: string,
  campaignId: string,
  phase: string,
  slices: CampaignFinalSliceInput[],
): Promise<PreparedSliceV1[]> {
  const prepared: PreparedSliceV1[] = [];
  for (const slice of [...slices].sort((left, right) =>
    asciiCompare(left.slice_id, right.slice_id),
  )) {
    const workdir = path.join(
      integration,
      "tmp",
      "ty-context",
      "plan-acceptance",
      campaignId,
      phase,
      slice.slice_id,
    );
    await rm(workdir, { recursive: true, force: true });
    await mkdir(workdir, { recursive: true });
    for (const file of Object.values(LONG_TASK_SOURCE_FILES))
      await cp(
        path.join(path.resolve(slice.packet_revision_path), file),
        path.join(workdir, file),
      );
    const contract = await compileLongTaskContract(workdir, integration, {
      write: false,
    });
    await writeCompiledLongTaskContract(workdir, contract);
    prepared.push({ slice, workdir, contract });
  }
  if (!prepared.length) throw new Error("campaign_slice_set_empty");
  return prepared;
}

export async function assertCampaignFinalScopeV1(
  slices: CampaignFinalSliceInput[],
): Promise<void> {
  try {
    for (const slice of slices) {
      const receipt = await readSliceExecutionReceiptV2(
        path.resolve(slice.receipt_path),
      );
      if (receipt.slice_id !== slice.slice_id)
        throw new Error(`receipt_slice_mismatch:${slice.slice_id}`);
      const envelope = validateChangeEnvelopeV1(
        parseStrictJson(
          await readFile(
            path.join(
              path.resolve(slice.packet_revision_path),
              "change-envelope.json",
            ),
            "utf8",
          ),
        ) as ReturnType<typeof validateChangeEnvelopeV1>,
      );
      if (receipt.change_envelope_sha256 !== envelope.envelope_sha256)
        throw new Error(`receipt_envelope_mismatch:${slice.slice_id}`);
      if (receipt.undeclared_changed_paths.length)
        throw new Error(`undeclared_changed_paths:${slice.slice_id}`);
    }
  } catch (error) {
    throw new Error(
      `campaign_final_rejects_scope_leakage:${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function evaluateGlobalConstraints(
  bindings: CampaignGlobalConstraintBindingV1[],
  results: Map<string, FinalResultV3>,
): CampaignConstraintResultV1[] {
  return bindings
    .map((binding) => {
      const missing: string[] = [];
      if (
        !binding.requirement_ids.length ||
        !binding.acceptance_criterion_ids.length ||
        !binding.verification_spec_ids.length
      )
        missing.push("machine_binding_required");
      const candidates = binding.applies_to.map(
        (sliceId) => [sliceId, results.get(sliceId)] as const,
      );
      for (const requirementId of binding.requirement_ids)
        if (
          !candidates.some(
            ([, result]) =>
              result?.requirement_results[requirementId]?.status === "passed",
          )
        )
          missing.push(`requirement:${requirementId}`);
      for (const acId of binding.acceptance_criterion_ids)
        if (
          !candidates.some(
            ([, result]) =>
              result?.acceptance_results[acId]?.status === "passed",
          )
        )
          missing.push(`ac:${acId}`);
      for (const specId of binding.verification_spec_ids)
        if (
          !candidates.some(
            ([, result]) => result?.spec_results[specId] === "passed",
          )
        )
          missing.push(`spec:${specId}`);
      const status: CampaignConstraintResultV1["status"] = missing.length
        ? "failed"
        : "passed";
      return {
        constraint_id: binding.constraint_id,
        status,
        matched_slice_ids: candidates
          .filter(([, result]) => !!result)
          .map(([sliceId]) => sliceId),
        missing_refs: missing.sort(asciiCompare),
      };
    })
    .sort((left, right) =>
      asciiCompare(left.constraint_id, right.constraint_id),
    );
}

async function writeCampaignFinalResult(
  options: {
    campaignRoot: string;
    campaignId: string;
    integrationBranch: string;
    sourcePlanSha256: string;
    sourceCoverageComplete: boolean;
  },
  integrationHead: string,
  integrationTree: string,
  sourceCoverageSha256: string,
  sliceResults: CampaignFinalSliceResultV1[],
  constraintResults: CampaignConstraintResultV1[],
  commonSnapshot: string | null,
  status: "needs_work" | "ready_to_merge",
): Promise<CampaignFinalResultV1> {
  const identity = {
    schema_version: "campaign-final-result-v1" as const,
    campaign_id: options.campaignId,
    workflow_status: status,
    integration_branch: options.integrationBranch,
    integration_head: integrationHead,
    integration_tree: integrationTree,
    final_snapshot_sha256: commonSnapshot,
    source_plan_sha256: options.sourcePlanSha256,
    source_coverage_sha256: sourceCoverageSha256,
    source_coverage_complete: options.sourceCoverageComplete,
    slice_results: sliceResults,
    global_constraint_results: constraintResults,
    target_commit: null,
    completed_at: new Date().toISOString(),
  };
  const result: CampaignFinalResultV1 = {
    ...identity,
    result_sha256: sha256Hex(canonicalJson(identity)),
  };
  await atomic(
    path.join(path.resolve(options.campaignRoot), "campaign-final-result.json"),
    result,
  );
  return result;
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
