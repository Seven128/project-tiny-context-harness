import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  canonicalYaml,
  parseStrictYaml,
  sha256Hex,
} from "../composite-campaign-codec.js";
import {
  assertCampaignV5,
  type CampaignV5,
} from "../composite-campaign-schema-v5.js";
import {
  acquireCampaignLeaseV1,
  commitCampaignTransactionV1,
  createCampaignMutationTransactionV1,
  recoverCampaignStoreV1,
  type CampaignMutationTransactionV1,
} from "../composite-campaign-transaction-store.js";
import {
  artifactsForCampaignMutationPlanV1,
  createCampaignMutationPlanV1,
  type CampaignMutationPlan,
} from "../composite-campaign-transaction-artifacts.js";

const MAX_CAMPAIGN_FILE_BYTES = 1024 * 1024;

interface CampaignPacketRevisionState {
  slices: Record<string, { packet_revision: number | null }>;
}

export async function loadCampaignStoreV5(
  projectRoot: string,
  supplied: string,
): Promise<{ root: string; campaign: CampaignV5 }> {
  const project = path.resolve(projectRoot);
  const base = path.join(project, ".codex", "composite-long-task", "campaigns");
  const root = path.resolve(project, supplied);
  if (!inside(base, root) || root === base)
    throw new Error("Campaign path escapes the V5 campaign root");
  const [baseReal, rootReal] = await Promise.all([
    realpath(base),
    realpath(root),
  ]);
  if (!inside(baseReal, rootReal) || rootReal === baseReal)
    throw new Error("Campaign realpath escapes the V5 campaign root");
  await recoverCampaignStoreV1(rootReal);
  const parsed = parseStrictYaml(
    await readBounded(path.join(rootReal, "campaign.yaml"), "campaign.yaml"),
  );
  if (schemaOf(parsed) === "composite-campaign-v4")
    throw new Error(
      "campaign_v4_audit_only:automatic execution requires composite-campaign-v5",
    );
  const campaign = assertCampaignV5(parsed);
  const source = await readBounded(
    path.join(rootReal, "source-plan.md"),
    "source-plan.md",
  );
  if (sha256Hex(source) !== campaign.source_plan_sha256)
    throw new Error("Immutable source-plan.md hash mismatch");
  return { root: rootReal, campaign };
}

export async function mutateCampaignStoreV5(
  projectRoot: string,
  campaignPath: string,
  eventType: string,
  mutate: (
    root: string,
    campaign: CampaignV5,
    transaction: CampaignMutationTransactionV1,
  ) => Promise<CampaignV5>,
): Promise<CampaignV5> {
  return withCampaignMutation(
    projectRoot,
    campaignPath,
    eventType,
    async (root, campaign, transaction) =>
      createCampaignMutationPlanV1(
        await mutate(root, campaign, transaction),
        eventType,
        transaction,
      ),
  );
}

export function currentPacketRevisionPathV5(
  campaignRoot: string,
  campaign: CampaignPacketRevisionState,
  sliceId: string,
): string {
  const revision = campaign.slices[sliceId]?.packet_revision;
  if (!revision) throw new Error("Slice has no Packet revision");
  return path.join(
    path.resolve(campaignRoot),
    "slices",
    sliceId,
    "revisions",
    String(revision).padStart(4, "0"),
  );
}

async function withCampaignMutation(
  projectRoot: string,
  campaignPath: string,
  eventType: string,
  mutate: (
    root: string,
    campaign: CampaignV5,
    transaction: CampaignMutationTransactionV1,
  ) => Promise<CampaignMutationPlan<CampaignV5>>,
): Promise<CampaignV5> {
  const loaded = await loadCampaignStoreV5(projectRoot, campaignPath);
  const handle = await acquireCampaignLeaseV1(loaded.root, eventType);
  try {
    const current = (await loadCampaignStoreV5(projectRoot, loaded.root))
      .campaign;
    if (current.generation !== loaded.campaign.generation)
      throw new Error("Campaign generation changed; retry the operation");
    const expectedGeneration = current.generation;
    const beforeCampaign = canonicalYaml(current);
    const transaction = createCampaignMutationTransactionV1(
      loaded.root,
      handle.lease,
    );
    const plan = await mutate(loaded.root, current, transaction);
    if (plan.eventType !== eventType)
      throw new Error("campaign_mutation_plan_event_type_mismatch");
    const next = plan.nextCampaign;
    next.generation = expectedGeneration + 1;
    assertCampaignV5(next);
    await commitCampaignTransactionV1({
      root: loaded.root,
      handle,
      operation: eventType,
      beforeCampaign,
      afterCampaign: canonicalYaml(next),
      event: event(eventType, next),
      expectedGeneration,
      nextGeneration: next.generation,
      stagedArtifacts: artifactsForCampaignMutationPlanV1(plan, transaction),
    });
    return next;
  } finally {
    await handle.close();
  }
}

async function readBounded(file: string, label: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_CAMPAIGN_FILE_BYTES)
    throw new Error(
      `${label} must be a regular file no larger than ${MAX_CAMPAIGN_FILE_BYTES} bytes`,
    );
  return readFile(file, "utf8");
}

function schemaOf(value: unknown): string | undefined {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).schema_version === "string"
    ? (value as Record<string, string>).schema_version
    : undefined;
}

function event(type: string, campaign: CampaignV5): Record<string, unknown> {
  return {
    type,
    campaign_id: campaign.campaign_id,
    generation: campaign.generation,
    campaign_status: campaign.campaign_status,
    occurred_at: new Date().toISOString(),
  };
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
