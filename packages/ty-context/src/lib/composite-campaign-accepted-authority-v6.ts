import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  buildAcceptedCampaignFinalResult,
  readCampaignFinalResult,
  type CampaignFinalResultV1,
} from "./composite-campaign-final-gate.js";
import {
  assertTargetFinalizationReceipt,
  readTargetFinalizationReceipt,
  readTargetRevalidationResult,
  type CampaignTargetFinalizationReceiptV1,
  type CampaignTargetRevalidationResultV1,
} from "./composite-campaign-target-receipts.js";
import { assertTargetFinalizationReceiptCurrent } from "./composite-campaign-target-freshness.js";
import { cleanupManagedCampaignWorktreesV1 } from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";

export interface AcceptedCampaignAuthorityV6 {
  schema_version: "accepted-campaign-authority-v6";
  target_commit: string;
  cleanup_status: "pending" | "complete";
  final_result: CampaignFinalResultV1;
  receipt: CampaignTargetFinalizationReceiptV1;
}

export async function commitCampaignAcceptanceV6(options: {
  projectRoot: string;
  campaignPath: string;
  lock: CampaignLockHandleV6;
  receipt: CampaignTargetFinalizationReceiptV1;
}): Promise<AcceptedCampaignAuthorityV6> {
  const receipt = assertTargetFinalizationReceipt(options.receipt);
  await assertTargetFinalizationReceiptCurrent(options.projectRoot, receipt);
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    "campaign_accepted",
    async (root, campaign, artifacts) => {
      if (campaign.campaign_status === "accepted")
        throw new Error("campaign_acceptance_already_committed");
      const finalResult = await readCampaignFinalResult(
        path.join(root, "campaign-final-result.json"),
      );
      const revalidation = await referencedRevalidation(root, receipt);
      if (
        receipt.campaign_id !== campaign.campaign_id ||
        receipt.target_branch !== campaign.target_branch ||
        finalResult.campaign_id !== campaign.campaign_id ||
        finalResult.integration_branch !== campaign.integration_ref ||
        finalResult.source_plan_sha256 !== campaign.source_plan_sha256 ||
        finalResult.result_sha256 !==
          receipt.source_campaign_final_result_sha256 ||
        finalResult.integration_head !== receipt.verified_integration_commit ||
        finalResult.integration_tree !== receipt.verified_integration_tree
      )
        throw new Error("campaign_v6_target_receipt_source_mismatch");
      assertReceiptBasis(receipt, revalidation);
      const accepted = buildAcceptedCampaignFinalResult(
        finalResult,
        receipt.target_commit,
      );
      artifacts.stageFile(
        "campaign-final-result.json",
        canonicalJson(accepted),
      );
      artifacts.stageFile(
        "target-finalization-receipt.json",
        canonicalJson(receipt),
      );
      campaign.campaign_status = "accepted";
      campaign.integration_head = receipt.target_commit;
      campaign.block_reason = null;
      campaign.finalization = {
        target_commit: receipt.target_commit,
        target_receipt_sha256: receipt.receipt_sha256,
        accepted_at: receipt.completed_at,
        cleanup_status: "pending",
        cleanup_error_code: null,
      };
      return campaign;
    },
    options.lock,
  );
  return assertAcceptedCampaignAuthorityV6(
    options.projectRoot,
    options.campaignPath,
  );
}

export async function assertAcceptedCampaignAuthorityV6(
  projectRoot: string,
  campaignPath: string,
): Promise<AcceptedCampaignAuthorityV6> {
  const { root, campaign } = await loadCampaignStoreV6(
    projectRoot,
    campaignPath,
  );
  try {
    const finalization = campaign.finalization;
    if (campaign.campaign_status !== "accepted" || !finalization)
      throw new Error("campaign_state");
    const [finalResult, receipt] = await Promise.all([
      readCampaignFinalResult(path.join(root, "campaign-final-result.json")),
      readTargetFinalizationReceipt(
        path.join(root, "target-finalization-receipt.json"),
      ),
    ]);
    if (
      finalResult.workflow_status !== "accepted" ||
      finalResult.target_commit !== finalization.target_commit ||
      receipt.target_commit !== finalization.target_commit ||
      receipt.receipt_sha256 !== finalization.target_receipt_sha256 ||
      receipt.completed_at !== finalization.accepted_at ||
      receipt.campaign_id !== campaign.campaign_id ||
      receipt.target_branch !== campaign.target_branch ||
      finalResult.campaign_id !== campaign.campaign_id ||
      finalResult.integration_branch !== campaign.integration_ref ||
      finalResult.source_plan_sha256 !== campaign.source_plan_sha256 ||
      sourceReadyResultHash(finalResult) !==
        receipt.source_campaign_final_result_sha256
    )
      throw new Error("authority_identity");
    const revalidation = await referencedRevalidation(root, receipt);
    assertReceiptBasis(receipt, revalidation);
    return {
      schema_version: "accepted-campaign-authority-v6",
      target_commit: finalization.target_commit,
      cleanup_status: finalization.cleanup_status,
      final_result: finalResult,
      receipt,
    };
  } catch (error) {
    throw new Error("accepted_authority_v6_inconsistent", { cause: error });
  }
}

export async function continueAcceptedCleanupV6(options: {
  projectRoot: string;
  campaignPath: string;
  lock: CampaignLockHandleV6;
}): Promise<AcceptedCampaignAuthorityV6> {
  let current = await assertAcceptedCampaignAuthorityV6(
    options.projectRoot,
    options.campaignPath,
  );
  if (current.cleanup_status === "complete") return current;
  const loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  let cleanupError: string | null = null;
  try {
    deriveExpectedManagedWorktreesV6({
      repositoryRoot: options.projectRoot,
      campaign: loaded.campaign,
    });
    await cleanupManagedCampaignWorktreesV1({
      repositoryRoot: options.projectRoot,
      campaignId: loaded.campaign.campaign_id,
      integrationRef: loaded.campaign.integration_ref,
    });
  } catch (error) {
    cleanupError = boundedError(error);
  }
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    cleanupError ? "campaign_cleanup_deferred" : "campaign_cleanup_completed",
    async (_root, campaign) => {
      if (campaign.campaign_status !== "accepted" || !campaign.finalization)
        throw new Error("accepted_cleanup_authority_missing");
      campaign.finalization.cleanup_status = cleanupError
        ? "pending"
        : "complete";
      campaign.finalization.cleanup_error_code = cleanupError;
      if (!cleanupError)
        for (const slice of Object.values(campaign.slices))
          slice.worktree_path = null;
      return campaign;
    },
    options.lock,
  );
  current = await assertAcceptedCampaignAuthorityV6(
    options.projectRoot,
    options.campaignPath,
  );
  return current;
}

async function referencedRevalidation(
  root: string,
  receipt: CampaignTargetFinalizationReceiptV1,
): Promise<CampaignTargetRevalidationResultV1 | null> {
  if (!receipt.target_revalidation_result_sha256) return null;
  const value = await readTargetRevalidationResult(
    path.join(root, "target-revalidation-result.json"),
  );
  if (value.result_sha256 !== receipt.target_revalidation_result_sha256)
    throw new Error("target_revalidation_hash_mismatch");
  return value;
}

function assertReceiptBasis(
  receipt: CampaignTargetFinalizationReceiptV1,
  revalidation: CampaignTargetRevalidationResultV1 | null,
): void {
  if (
    receipt.acceptance_basis !== "target_snapshot_revalidated" &&
    (receipt.target_revalidation_result_sha256 !== null ||
      revalidation !== null)
  )
    throw new Error("target_receipt_unexpected_revalidation");
  if (
    receipt.acceptance_basis === "exact_commit" &&
    (receipt.target_commit !== receipt.verified_integration_commit ||
      receipt.target_tree !== receipt.verified_integration_tree)
  )
    throw new Error("target_receipt_exact_commit_invalid");
  if (
    receipt.acceptance_basis === "exact_tree" &&
    (receipt.target_commit === receipt.verified_integration_commit ||
      receipt.target_tree !== receipt.verified_integration_tree)
  )
    throw new Error("target_receipt_exact_tree_invalid");
  if (
    ["remote_fast_forward", "local_ref_fast_forward"].includes(
      receipt.acceptance_basis,
    ) &&
    (receipt.target_commit !== receipt.verified_integration_commit ||
      receipt.target_tree !== receipt.verified_integration_tree)
  )
    throw new Error("target_receipt_fast_forward_invalid");
  if (
    receipt.acceptance_basis === "target_snapshot_revalidated" &&
    (!revalidation ||
      revalidation.workflow_status !== "target_verified" ||
      revalidation.campaign_id !== receipt.campaign_id ||
      revalidation.target_branch !== receipt.target_branch ||
      revalidation.target_commit !== receipt.target_commit ||
      revalidation.target_tree !== receipt.target_tree ||
      revalidation.source_campaign_final_result_sha256 !==
        receipt.source_campaign_final_result_sha256)
  )
    throw new Error("target_receipt_revalidation_invalid");
}

function sourceReadyResultHash(accepted: CampaignFinalResultV1): string {
  const { result_sha256: _hash, ...identity } = accepted;
  return sha256Hex(
    canonicalJson({
      ...identity,
      workflow_status: "ready_to_merge",
      target_commit: null,
    }),
  );
}
function boundedError(error: unknown): string {
  return (
    (error instanceof Error ? error.message : String(error))
      .replace(/[^A-Za-z0-9_:.-]+/gu, "_")
      .slice(0, 128) || "accepted_cleanup_failed"
  );
}
