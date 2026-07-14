import { readFile } from "node:fs/promises";
import {
  canonicalJson,
  parseStrictJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import type {
  CampaignConstraintResultV1,
  CampaignFinalResultV1,
  CampaignFinalSliceResultV1,
  CampaignSnapshotGateEvaluationV1,
} from "./composite-campaign-final-gate.js";
import { atomic } from "./long-task-status.js";

export type CampaignTargetAcceptanceBasisV1 =
  | "exact_commit"
  | "exact_tree"
  | "target_snapshot_revalidated"
  | "remote_fast_forward"
  | "local_ref_fast_forward";

export interface CampaignTargetRevalidationResultV1 {
  schema_version: "campaign-target-revalidation-result-v1";
  campaign_id: string;
  target_branch: string;
  target_commit: string;
  target_tree: string;
  source_campaign_final_result_sha256: string;
  final_snapshot_sha256: string;
  workflow_status: "target_verified" | "needs_work";
  slice_results: CampaignFinalSliceResultV1[];
  global_constraint_results: CampaignConstraintResultV1[];
  completed_at: string;
  result_sha256: string;
}

export interface CampaignTargetFinalizationReceiptV1 {
  schema_version: "campaign-target-finalization-receipt-v1";
  campaign_id: string;
  target_branch: string;
  verified_integration_commit: string;
  verified_integration_tree: string;
  target_commit: string;
  target_tree: string;
  acceptance_basis: CampaignTargetAcceptanceBasisV1;
  source_campaign_final_result_sha256: string;
  target_revalidation_result_sha256: string | null;
  completed_at: string;
  receipt_sha256: string;
}

export function buildTargetRevalidationResult(options: {
  campaignId: string;
  targetBranch: string;
  targetCommit: string;
  targetTree: string;
  sourceCampaignFinalResultSha256: string;
  evaluation: CampaignSnapshotGateEvaluationV1;
}): CampaignTargetRevalidationResultV1 {
  if (
    options.evaluation.snapshot_head !== options.targetCommit ||
    options.evaluation.snapshot_tree !== options.targetTree ||
    !options.evaluation.final_snapshot_sha256
  )
    throw new Error("campaign_target_revalidation_snapshot_identity_mismatch");
  const identity = {
    schema_version: "campaign-target-revalidation-result-v1" as const,
    campaign_id: options.campaignId,
    target_branch: options.targetBranch,
    target_commit: options.targetCommit,
    target_tree: options.targetTree,
    source_campaign_final_result_sha256:
      options.sourceCampaignFinalResultSha256,
    final_snapshot_sha256: options.evaluation.final_snapshot_sha256,
    workflow_status:
      options.evaluation.workflow_status === "verified"
        ? ("target_verified" as const)
        : ("needs_work" as const),
    slice_results: options.evaluation.slice_results,
    global_constraint_results: options.evaluation.global_constraint_results,
    completed_at: new Date().toISOString(),
  };
  return {
    ...identity,
    result_sha256: sha256Hex(canonicalJson(identity)),
  };
}

export async function writeTargetRevalidationResult(
  file: string,
  result: CampaignTargetRevalidationResultV1,
): Promise<void> {
  assertTargetRevalidationResult(result);
  await atomic(file, result);
}

export function buildTargetFinalizationReceipt(options: {
  finalResult: CampaignFinalResultV1;
  targetBranch: string;
  targetCommit: string;
  targetTree: string;
  acceptanceBasis: CampaignTargetAcceptanceBasisV1;
  targetRevalidation: CampaignTargetRevalidationResultV1 | null;
}): CampaignTargetFinalizationReceiptV1 {
  if (options.finalResult.workflow_status !== "ready_to_merge")
    throw new Error("campaign_target_receipt_source_not_ready");
  const identity = {
    schema_version: "campaign-target-finalization-receipt-v1" as const,
    campaign_id: options.finalResult.campaign_id,
    target_branch: options.targetBranch,
    verified_integration_commit: options.finalResult.integration_head,
    verified_integration_tree: options.finalResult.integration_tree,
    target_commit: options.targetCommit,
    target_tree: options.targetTree,
    acceptance_basis: options.acceptanceBasis,
    source_campaign_final_result_sha256: options.finalResult.result_sha256,
    target_revalidation_result_sha256:
      options.targetRevalidation?.result_sha256 ?? null,
    completed_at: new Date().toISOString(),
  };
  return {
    ...identity,
    receipt_sha256: sha256Hex(canonicalJson(identity)),
  };
}

export async function readTargetFinalizationReceipt(
  file: string,
): Promise<CampaignTargetFinalizationReceiptV1> {
  return assertTargetFinalizationReceipt(
    parseStrictJson(await readFile(file, "utf8")),
  );
}

export async function readTargetRevalidationResult(
  file: string,
): Promise<CampaignTargetRevalidationResultV1> {
  return assertTargetRevalidationResult(
    parseStrictJson(await readFile(file, "utf8")),
  );
}

export function assertTargetFinalizationReceipt(
  value: unknown,
): CampaignTargetFinalizationReceiptV1 {
  const row = object(value, "campaign_target_finalization_receipt_invalid");
  exact(
    row,
    [
      "schema_version",
      "campaign_id",
      "target_branch",
      "verified_integration_commit",
      "verified_integration_tree",
      "target_commit",
      "target_tree",
      "acceptance_basis",
      "source_campaign_final_result_sha256",
      "target_revalidation_result_sha256",
      "completed_at",
      "receipt_sha256",
    ],
    "campaign_target_receipt_fields_invalid",
  );
  const receipt = row as unknown as CampaignTargetFinalizationReceiptV1;
  if (
    receipt.schema_version !== "campaign-target-finalization-receipt-v1" ||
    !receipt.campaign_id ||
    !receipt.target_branch ||
    !oid(receipt.verified_integration_commit) ||
    !oid(receipt.verified_integration_tree) ||
    !oid(receipt.target_commit) ||
    !oid(receipt.target_tree) ||
    ![
      "exact_commit",
      "exact_tree",
      "target_snapshot_revalidated",
      "remote_fast_forward",
      "local_ref_fast_forward",
    ].includes(receipt.acceptance_basis) ||
    !hash(receipt.source_campaign_final_result_sha256) ||
    (receipt.target_revalidation_result_sha256 !== null &&
      !hash(receipt.target_revalidation_result_sha256)) ||
    !Number.isFinite(Date.parse(receipt.completed_at)) ||
    !hash(receipt.receipt_sha256)
  )
    throw new Error("campaign_target_finalization_receipt_invalid");
  const { receipt_sha256, ...identity } = receipt;
  if (receipt_sha256 !== sha256Hex(canonicalJson(identity)))
    throw new Error("campaign_target_finalization_receipt_hash_mismatch");
  return receipt;
}

export function assertTargetRevalidationResult(
  value: unknown,
): CampaignTargetRevalidationResultV1 {
  const row = object(value, "campaign_target_revalidation_result_invalid");
  exact(
    row,
    [
      "schema_version",
      "campaign_id",
      "target_branch",
      "target_commit",
      "target_tree",
      "source_campaign_final_result_sha256",
      "final_snapshot_sha256",
      "workflow_status",
      "slice_results",
      "global_constraint_results",
      "completed_at",
      "result_sha256",
    ],
    "campaign_target_revalidation_result_fields_invalid",
  );
  const result = row as unknown as CampaignTargetRevalidationResultV1;
  if (
    result.schema_version !== "campaign-target-revalidation-result-v1" ||
    !result.campaign_id ||
    !result.target_branch ||
    !oid(result.target_commit) ||
    !oid(result.target_tree) ||
    !hash(result.source_campaign_final_result_sha256) ||
    !hash(result.final_snapshot_sha256) ||
    !["target_verified", "needs_work"].includes(result.workflow_status) ||
    !Array.isArray(result.slice_results) ||
    !Array.isArray(result.global_constraint_results) ||
    !Number.isFinite(Date.parse(result.completed_at)) ||
    !hash(result.result_sha256)
  )
    throw new Error("campaign_target_revalidation_result_invalid");
  const { result_sha256, ...identity } = result;
  if (result_sha256 !== sha256Hex(canonicalJson(identity)))
    throw new Error("campaign_target_revalidation_result_hash_mismatch");
  return result;
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(code);
  return value as Record<string, unknown>;
}
function exact(
  row: Record<string, unknown>,
  keys: string[],
  code: string,
): void {
  if (
    keys.some((key) => !Object.hasOwn(row, key)) ||
    Object.keys(row).some((key) => !keys.includes(key))
  )
    throw new Error(code);
}
function oid(value: unknown): value is string {
  return (
    typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
  );
}
function hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
