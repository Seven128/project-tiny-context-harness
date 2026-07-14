import path from "node:path";
import { resolveTargetAuthority } from "./composite-campaign-target-delivery.js";
import {
  assertTargetFinalizationReceipt,
  type CampaignTargetFinalizationReceiptV1,
} from "./composite-campaign-target-receipts.js";

export class CampaignTargetReceiptStaleError extends Error {
  readonly expectedCommit: string;
  readonly expectedTree: string;
  readonly actualCommit: string;
  readonly actualTree: string;

  constructor(options: {
    expectedCommit: string;
    expectedTree: string;
    actualCommit: string;
    actualTree: string;
  }) {
    super("campaign_target_finalization_receipt_stale");
    this.name = "CampaignTargetReceiptStaleError";
    this.expectedCommit = options.expectedCommit;
    this.expectedTree = options.expectedTree;
    this.actualCommit = options.actualCommit;
    this.actualTree = options.actualTree;
  }
}

export async function assertTargetFinalizationReceiptCurrent(
  repositoryRoot: string,
  receiptValue: CampaignTargetFinalizationReceiptV1,
): Promise<void> {
  const receipt = assertTargetFinalizationReceipt(receiptValue);
  const authority = await resolveTargetAuthority({
    repository: path.resolve(repositoryRoot),
    targetBranch: receipt.target_branch,
  });
  if (
    authority.target_commit !== receipt.target_commit ||
    authority.target_tree !== receipt.target_tree
  )
    throw new CampaignTargetReceiptStaleError({
      expectedCommit: receipt.target_commit,
      expectedTree: receipt.target_tree,
      actualCommit: authority.target_commit,
      actualTree: authority.target_tree,
    });
}
