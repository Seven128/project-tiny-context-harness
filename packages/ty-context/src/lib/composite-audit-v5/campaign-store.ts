import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  parseCampaignV5,
  type CampaignV5,
} from "../composite-campaign-schema-v5.js";
import { sha256Hex } from "../composite-campaign-codec.js";
import { readCampaignFinalResult } from "../composite-campaign-final-gate.js";
import { readTargetFinalizationReceipt } from "../composite-campaign-target-receipts.js";

const MAX_AUDIT_FILE_BYTES = 1024 * 1024;

export interface CampaignAuditV5 {
  schema_version: "composite-campaign-v5-audit-v1";
  behavior: "audit_only";
  campaign_id: string;
  campaign_status: CampaignV5["campaign_status"];
  accepted_authority: "consistent" | "not_accepted";
  target_commit: string | null;
  cleanup_status: "pending" | "complete" | null;
  execution_retired: true;
}

export async function loadCampaignAuditV5(
  projectRoot: string,
  supplied: string,
): Promise<{ root: string; campaign: CampaignV5 }> {
  const project = await realpath(path.resolve(projectRoot));
  const base = await realpath(
    path.join(project, ".codex", "composite-long-task", "campaigns"),
  );
  const root = await realpath(path.resolve(project, supplied));
  if (!strictlyInside(base, root))
    throw new Error("campaign_path_escapes_campaign_root");
  const campaign = parseCampaignV5(
    await readBounded(path.join(root, "campaign.yaml"), "campaign.yaml"),
  );
  const source = await readBounded(
    path.join(root, "source-plan.md"),
    "source-plan.md",
  );
  if (sha256Hex(source) !== campaign.source_plan_sha256)
    throw new Error("immutable_source_plan_hash_mismatch");
  return { root, campaign };
}

export async function auditCampaignV5(
  projectRoot: string,
  supplied: string,
): Promise<CampaignAuditV5> {
  const { root, campaign } = await loadCampaignAuditV5(projectRoot, supplied);
  if (campaign.campaign_status !== "accepted")
    return {
      schema_version: "composite-campaign-v5-audit-v1",
      behavior: "audit_only",
      campaign_id: campaign.campaign_id,
      campaign_status: campaign.campaign_status,
      accepted_authority: "not_accepted",
      target_commit: null,
      cleanup_status: null,
      execution_retired: true,
    };
  const finalization = campaign.finalization;
  if (!finalization) throw new Error("v5_accepted_finalization_missing");
  const [result, receipt] = await Promise.all([
    readCampaignFinalResult(path.join(root, "campaign-final-result.json")),
    readTargetFinalizationReceipt(
      path.join(root, "target-finalization-receipt.json"),
    ),
  ]);
  if (
    result.workflow_status !== "accepted" ||
    result.campaign_id !== campaign.campaign_id ||
    result.integration_branch !== campaign.integration_branch ||
    result.source_plan_sha256 !== campaign.source_plan_sha256 ||
    result.target_commit !== finalization.target_commit ||
    receipt.campaign_id !== campaign.campaign_id ||
    receipt.target_branch !== campaign.target_branch ||
    receipt.target_commit !== finalization.target_commit ||
    receipt.receipt_sha256 !== finalization.target_receipt_sha256
  )
    throw new Error("v5_accepted_authority_inconsistent");
  return {
    schema_version: "composite-campaign-v5-audit-v1",
    behavior: "audit_only",
    campaign_id: campaign.campaign_id,
    campaign_status: campaign.campaign_status,
    accepted_authority: "consistent",
    target_commit: finalization.target_commit,
    cleanup_status: finalization.cleanup_status,
    execution_retired: true,
  };
}

export async function rejectCampaignV5Execution(
  projectRoot: string,
  supplied: string,
): Promise<never> {
  const { campaign } = await loadCampaignAuditV5(projectRoot, supplied);
  if (campaign.campaign_status === "accepted")
    throw new Error("campaign_v5_accepted_audit_only");
  throw new Error("campaign_v5_execution_retired_recreate_required");
}

async function readBounded(file: string, label: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_AUDIT_FILE_BYTES)
    throw new Error(`${label}_invalid_for_v5_audit`);
  return readFile(file, "utf8");
}
function strictlyInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}
