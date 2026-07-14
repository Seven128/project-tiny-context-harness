import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  buildAcceptedCampaignFinalResult,
  readCampaignFinalResult,
  type CampaignFinalResultV1,
} from "./composite-campaign-final-gate.js";
import type { CampaignV5 } from "./composite-campaign-schema-v5.js";
import {
  assertTargetFinalizationReceipt,
  readTargetFinalizationReceipt,
  readTargetRevalidationResult,
  type CampaignTargetFinalizationReceiptV1,
  type CampaignTargetRevalidationResultV1,
} from "./composite-campaign-target-receipts.js";
import { cleanupAcceptedCampaignAssetsV5 } from "./composite-campaign-accepted-cleanup.js";
import { loadCampaignStoreV5 } from "./composite-runtime-v5/campaign-store.js";
import { loadCampaignV5, mutateCampaignV5 } from "./composite-campaign-v5.js";

export interface AcceptedCampaignAuthorityV1 {
  target_commit: string;
  cleanup_status: "pending" | "complete";
  final_result: CampaignFinalResultV1;
  receipt: CampaignTargetFinalizationReceiptV1;
}

export type CampaignFinalizationCrashPointV1 =
  | "after_target_delivery_before_acceptance_transaction"
  | "after_acceptance_transaction_before_cleanup"
  | "after_cleanup_before_cleanup_status";

export function injectCampaignFinalizationCrash(
  point: CampaignFinalizationCrashPointV1,
): void {
  if (process.env.TY_CONTEXT_FINALIZE_CRASH_AT === point)
    throw new Error(`simulated_crash_${point}`);
}

export async function commitCampaignAcceptanceV5(options: {
  projectRoot: string;
  campaignPath: string;
  receipt: CampaignTargetFinalizationReceiptV1;
}): Promise<AcceptedCampaignAuthorityV1> {
  const receipt = assertTargetFinalizationReceipt(options.receipt);
  await mutateCampaignV5(
    options.projectRoot,
    options.campaignPath,
    "campaign_accepted",
    async (root, campaign, transaction) => {
      if (campaign.campaign_status === "accepted")
        throw new Error("campaign_acceptance_already_committed");
      const finalResult = await readCampaignFinalResult(
        path.join(root, "campaign-final-result.json"),
      );
      const revalidation = await referencedRevalidation(root, receipt);
      assertReceiptAgainstSource(campaign, finalResult, receipt, revalidation);
      const accepted = buildAcceptedCampaignFinalResult(
        finalResult,
        receipt.target_commit,
      );
      await transaction.stageFile(
        "campaign-final-result.json",
        canonicalJson(accepted),
      );
      await transaction.stageFile(
        "target-finalization-receipt.json",
        canonicalJson(receipt),
      );
      campaign.campaign_status = "accepted";
      campaign.integration_head = receipt.target_commit;
      campaign.finalization = {
        target_commit: receipt.target_commit,
        target_receipt_sha256: receipt.receipt_sha256,
        accepted_at: receipt.completed_at,
        cleanup_status: "pending",
        cleanup_error_code: null,
      };
      return campaign;
    },
  );
  injectCampaignFinalizationCrash(
    "after_acceptance_transaction_before_cleanup",
  );
  const loaded = await loadCampaignV5(
    options.projectRoot,
    options.campaignPath,
  );
  return assertAcceptedCampaignAuthority(loaded.root, loaded.campaign);
}

export async function tryAcceptedCampaignAuthorityV5(
  projectRoot: string,
  campaignPath: string,
): Promise<AcceptedCampaignAuthorityV1 | null> {
  const loaded = await loadCampaignStoreV5(projectRoot, campaignPath);
  if (loaded.campaign.campaign_status !== "accepted") return null;
  return assertAcceptedCampaignAuthority(loaded.root, loaded.campaign);
}

export async function assertAcceptedCampaignAuthority(
  rootValue: string,
  campaign: CampaignV5,
): Promise<AcceptedCampaignAuthorityV1> {
  try {
    const root = path.resolve(rootValue);
    const finalization = campaign.finalization;
    if (
      campaign.campaign_status !== "accepted" ||
      !finalization ||
      campaign.integration_head !== finalization.target_commit
    )
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
      finalResult.integration_branch !== campaign.integration_branch ||
      finalResult.source_plan_sha256 !== campaign.source_plan_sha256 ||
      sourceReadyResultHash(finalResult) !==
        receipt.source_campaign_final_result_sha256
    )
      throw new Error("authority_identity");
    const revalidation = await referencedRevalidation(root, receipt);
    assertReceiptBasis(receipt, revalidation);
    return {
      target_commit: finalization.target_commit,
      cleanup_status: finalization.cleanup_status,
      final_result: finalResult,
      receipt,
    };
  } catch (error) {
    throw new Error("accepted_authority_inconsistent", { cause: error });
  }
}

export async function continueAcceptedCleanupIfNeeded(options: {
  projectRoot: string;
  campaignPath: string;
}): Promise<AcceptedCampaignAuthorityV1> {
  const current = await tryAcceptedCampaignAuthorityV5(
    options.projectRoot,
    options.campaignPath,
  );
  if (!current) throw new Error("campaign_not_accepted");
  if (current.cleanup_status === "complete") return current;
  try {
    const loaded = await loadCampaignStoreV5(
      options.projectRoot,
      options.campaignPath,
    );
    await cleanupAcceptedCampaignAssetsV5({
      repositoryRoot: options.projectRoot,
      campaignId: loaded.campaign.campaign_id,
    });
  } catch (error) {
    await commitCleanupStatus(options, "pending", cleanupErrorCode(error));
    return (await tryAcceptedCampaignAuthorityV5(
      options.projectRoot,
      options.campaignPath,
    ))!;
  }
  injectCampaignFinalizationCrash("after_cleanup_before_cleanup_status");
  await commitCleanupStatus(options, "complete", null);
  return (await tryAcceptedCampaignAuthorityV5(
    options.projectRoot,
    options.campaignPath,
  ))!;
}

async function commitCleanupStatus(
  options: { projectRoot: string; campaignPath: string },
  status: "pending" | "complete",
  errorCode: string | null,
): Promise<void> {
  await mutateCampaignV5(
    options.projectRoot,
    options.campaignPath,
    status === "complete"
      ? "campaign_cleanup_completed"
      : "campaign_cleanup_deferred",
    async (_root, campaign) => {
      if (campaign.campaign_status !== "accepted" || !campaign.finalization)
        throw new Error("accepted_cleanup_authority_missing");
      campaign.finalization.cleanup_status = status;
      campaign.finalization.cleanup_error_code = errorCode;
      if (status === "complete")
        for (const slice of Object.values(campaign.slices))
          slice.worktree = null;
      return campaign;
    },
  );
}

async function referencedRevalidation(
  root: string,
  receipt: CampaignTargetFinalizationReceiptV1,
): Promise<CampaignTargetRevalidationResultV1 | null> {
  if (!receipt.target_revalidation_result_sha256) return null;
  const result = await readTargetRevalidationResult(
    path.join(root, "target-revalidation-result.json"),
  );
  if (result.result_sha256 !== receipt.target_revalidation_result_sha256)
    throw new Error("target_revalidation_hash_mismatch");
  return result;
}

function assertReceiptAgainstSource(
  campaign: CampaignV5,
  finalResult: CampaignFinalResultV1,
  receipt: CampaignTargetFinalizationReceiptV1,
  revalidation: CampaignTargetRevalidationResultV1 | null,
): void {
  if (
    campaign.campaign_id !== receipt.campaign_id ||
    campaign.target_branch !== receipt.target_branch ||
    finalResult.campaign_id !== campaign.campaign_id ||
    finalResult.integration_branch !== campaign.integration_branch ||
    finalResult.source_plan_sha256 !== campaign.source_plan_sha256 ||
    finalResult.result_sha256 !== receipt.source_campaign_final_result_sha256 ||
    finalResult.integration_head !== receipt.verified_integration_commit ||
    finalResult.integration_tree !== receipt.verified_integration_tree
  )
    throw new Error("campaign_target_receipt_source_mismatch");
  assertReceiptBasis(receipt, revalidation);
}

function assertReceiptBasis(
  receipt: CampaignTargetFinalizationReceiptV1,
  revalidation: CampaignTargetRevalidationResultV1 | null,
): void {
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
  if (receipt.acceptance_basis === "target_snapshot_revalidated") {
    if (
      !revalidation ||
      revalidation.workflow_status !== "target_verified" ||
      revalidation.campaign_id !== receipt.campaign_id ||
      revalidation.target_branch !== receipt.target_branch ||
      revalidation.target_commit !== receipt.target_commit ||
      revalidation.target_tree !== receipt.target_tree ||
      revalidation.source_campaign_final_result_sha256 !==
        receipt.source_campaign_final_result_sha256
    )
      throw new Error("target_receipt_revalidation_invalid");
  }
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

function cleanupErrorCode(error: unknown): string {
  const first = (error instanceof Error ? error.message : String(error))
    .split(":", 1)[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 64);
  return /^[a-z0-9_]{1,64}$/u.test(first) ? first : "accepted_cleanup_failed";
}
