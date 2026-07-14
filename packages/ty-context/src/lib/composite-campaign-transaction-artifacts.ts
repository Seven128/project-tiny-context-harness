import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import { fileHash, writeDurable } from "./composite-campaign-transaction-io.js";
import type { CampaignStagedArtifactV1 } from "./composite-campaign-transaction-recovery.js";

export interface CampaignMutationTransactionV1 {
  stageFile(
    targetRelativePath: string,
    content: string,
  ): Promise<CampaignStagedArtifactV1>;
  stagedArtifacts(): CampaignStagedArtifactV1[];
}

export function createCampaignMutationTransactionV1(
  rootValue: string,
  lease: { operation_id: string },
): CampaignMutationTransactionV1 {
  const root = path.resolve(rootValue);
  const artifacts = new Map<string, CampaignStagedArtifactV1>();
  return {
    async stageFile(targetRelativePath, content) {
      const artifact = await stageCampaignArtifactV1(
        root,
        lease.operation_id,
        targetRelativePath,
        content,
      );
      if (artifacts.has(artifact.target_path))
        throw new Error(
          `campaign_transaction_duplicate_artifact:${artifact.target_path}`,
        );
      artifacts.set(artifact.target_path, artifact);
      return artifact;
    },
    stagedArtifacts() {
      return stableCampaignStagedArtifacts([...artifacts.values()]);
    },
  };
}

async function stageCampaignArtifactV1(
  root: string,
  operationId: string,
  targetRelativePath: string,
  content: string,
): Promise<CampaignStagedArtifactV1> {
  const targetPath = normalizeArtifactTarget(targetRelativePath);
  const target = path.join(root, ...targetPath.split("/"));
  const stagedPath = `.transactions/${operationId}/artifacts/${targetPath}`;
  const staged = path.join(root, ...stagedPath.split("/"));
  await writeDurable(staged, content, "wx");
  return {
    target_path: targetPath,
    staged_path: stagedPath,
    before_sha256: await fileHash(target),
    after_sha256: sha256Hex(content),
  };
}

function normalizeArtifactTarget(value: string): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  const forbidden = new Set([
    "campaign.yaml",
    "events.ndjson",
    ".campaign.lock",
    "transaction-intent.json",
  ]);
  if (
    !normalized ||
    path.isAbsolute(value) ||
    normalized.split("/").includes("..") ||
    normalized.startsWith(".transactions/") ||
    normalized.startsWith("quarantine/") ||
    forbidden.has(normalized)
  )
    throw new Error(`campaign_transaction_artifact_path_invalid:${value}`);
  return normalized;
}

export function stableCampaignStagedArtifacts(
  values: CampaignStagedArtifactV1[],
): CampaignStagedArtifactV1[] {
  return [...values].sort((left, right) =>
    left.target_path < right.target_path
      ? -1
      : left.target_path > right.target_path
        ? 1
        : 0,
  );
}
