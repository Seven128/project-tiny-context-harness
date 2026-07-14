import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  parseStrictJson,
  parseStrictYaml,
  sha256Hex,
} from "./composite-campaign-codec.js";
import {
  asciiCompare,
  atomicDurable,
  fileHash,
  optionalDirectories,
  replaceFromStaging,
  syncDirectory,
  transactionRelative,
} from "./composite-campaign-transaction-io.js";

const INTENT_FILE = ".campaign-transaction.json";

export interface CampaignTransactionIntentV1 {
  schema_version: "campaign-transaction-intent-v1";
  operation_id: string;
  operation: string;
  phase:
    "prepared" | "artifacts_replaced" | "campaign_replaced" | "events_replaced";
  expected_generation: number;
  next_generation: number;
  before_state_sha256: string;
  after_state_sha256: string;
  before_campaign_sha256: string;
  after_campaign_sha256: string;
  before_events_sha256: string;
  after_events_sha256: string;
  staged_campaign_path: string;
  staged_events_path: string;
  event_line: string;
  event_hash: string;
  previous_event_hash: string | null;
  staged_artifacts: CampaignStagedArtifactV1[];
  pid: number;
  host: string;
  started_at: string;
}

export interface CampaignStagedArtifactV1 {
  target_path: string;
  staged_path: string;
  before_sha256: string | null;
  after_sha256: string;
}

export async function reconcileStagedArtifacts(
  root: string,
  intent: CampaignTransactionIntentV1,
): Promise<boolean> {
  let recovered = false;
  for (const artifact of intent.staged_artifacts) {
    const target = path.join(root, ...artifact.target_path.split("/"));
    const staged = path.join(root, ...artifact.staged_path.split("/"));
    const targetHash = await fileHash(target);
    if (targetHash === artifact.after_sha256) continue;
    if (targetHash !== artifact.before_sha256)
      return quarantineAmbiguousTransaction(
        root,
        intent,
        `artifact_target_ambiguous_${safeLabel(artifact.target_path)}`,
      );
    if ((await fileHash(staged)) !== artifact.after_sha256)
      return quarantineAmbiguousTransaction(
        root,
        intent,
        `artifact_staging_corrupt_${safeLabel(artifact.target_path)}`,
      );
    await mkdir(path.dirname(target), { recursive: true });
    await replaceFromStaging(staged, target);
    recovered = true;
  }
  return recovered;
}

export async function quarantineOrphanRevisions(
  root: string,
): Promise<string[]> {
  let campaign: Record<string, unknown>;
  try {
    campaign = parseStrictYaml(
      await readFile(path.join(root, "campaign.yaml"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    return [];
  }
  const slices =
    campaign.slices && typeof campaign.slices === "object"
      ? (campaign.slices as Record<string, { packet_revision?: number | null }>)
      : {};
  const slicesRoot = path.join(root, "slices");
  const quarantined: string[] = [];
  for (const sliceEntry of await optionalDirectories(slicesRoot)) {
    const revisionRoot = path.join(slicesRoot, sliceEntry, "revisions");
    for (const revisionEntry of await optionalDirectories(revisionRoot)) {
      const numeric = /^\d{4,}$/u.test(revisionEntry)
        ? Number.parseInt(revisionEntry, 10)
        : Number.POSITIVE_INFINITY;
      const recorded = slices[sliceEntry]?.packet_revision ?? 0;
      if (numeric <= recorded) continue;
      const source = path.join(revisionRoot, revisionEntry);
      const target = path.join(
        root,
        "quarantine",
        "orphan-revisions",
        `${sliceEntry}-${revisionEntry}-${Date.now()}`,
      );
      await mkdir(path.dirname(target), { recursive: true });
      await rename(source, target);
      quarantined.push(transactionRelative(root, target));
    }
  }
  return quarantined.sort(asciiCompare);
}

export async function archiveCompletedIntent(
  root: string,
  intent: CampaignTransactionIntentV1,
): Promise<void> {
  const transactions = path.join(root, ".transactions");
  const completed = path.join(
    transactions,
    "completed",
    `${intent.operation_id}.json`,
  );
  await mkdir(path.dirname(completed), { recursive: true });
  await atomicDurable(
    completed,
    canonicalJson({
      ...intent,
      recovered_or_committed_at: new Date().toISOString(),
    }),
  );
  await rm(path.join(root, INTENT_FILE), { force: true });
  await rm(path.join(transactions, intent.operation_id), {
    recursive: true,
    force: true,
  });
  await syncDirectory(transactions);
}

export async function rollbackPreparedIntent(
  root: string,
  intent: CampaignTransactionIntentV1,
): Promise<void> {
  await rm(path.join(root, INTENT_FILE), { force: true });
  await rm(path.join(root, ".transactions", intent.operation_id), {
    recursive: true,
    force: true,
  });
  await syncDirectory(root);
}

export async function quarantineAmbiguousTransaction(
  root: string,
  intent: CampaignTransactionIntentV1,
  reason: string,
): Promise<never> {
  const source = path.join(root, INTENT_FILE);
  const target = path.join(
    root,
    "quarantine",
    "transactions",
    `${intent.operation_id}-${reason}.json`,
  );
  await mkdir(path.dirname(target), { recursive: true });
  await rename(source, target);
  throw new Error(`campaign_transaction_quarantined:${reason}`);
}

export async function quarantineOrphanTransactionDrafts(
  root: string,
): Promise<void> {
  const transactions = path.join(root, ".transactions");
  for (const entry of await optionalDirectories(transactions)) {
    if (entry === "completed") continue;
    const source = path.join(transactions, entry);
    const target = path.join(
      root,
      "quarantine",
      "orphan-transactions",
      `${entry}-${Date.now()}`,
    );
    await mkdir(path.dirname(target), { recursive: true });
    await rename(source, target);
  }
}

export function assertTransactionIntent(
  intent: CampaignTransactionIntentV1,
): void {
  if (
    intent.schema_version !== "campaign-transaction-intent-v1" ||
    !/^[a-f0-9-]{32,36}$/iu.test(intent.operation_id)
  )
    throw new Error("campaign_transaction_intent_invalid");
  for (const value of [
    intent.before_state_sha256,
    intent.after_state_sha256,
    intent.before_campaign_sha256,
    intent.after_campaign_sha256,
    intent.before_events_sha256,
    intent.after_events_sha256,
    intent.event_hash,
  ])
    if (!/^[a-f0-9]{64}$/u.test(value))
      throw new Error("campaign_transaction_intent_hash_invalid");
  if (
    !Number.isInteger(intent.expected_generation) ||
    !Number.isInteger(intent.next_generation) ||
    intent.next_generation !== intent.expected_generation + 1
  )
    throw new Error("campaign_transaction_intent_generation_invalid");
  if (
    intent.before_state_sha256 !== intent.before_campaign_sha256 ||
    intent.after_state_sha256 !== intent.after_campaign_sha256
  )
    throw new Error("campaign_transaction_intent_state_hash_mismatch");
  if (
    !Array.isArray(intent.staged_artifacts) ||
    intent.pid < 1 ||
    !intent.host ||
    !Number.isFinite(Date.parse(intent.started_at))
  )
    throw new Error("campaign_transaction_intent_metadata_invalid");
  const targets = new Set<string>();
  for (const artifact of intent.staged_artifacts) {
    assertArtifact(intent, artifact, targets);
  }
}

function assertArtifact(
  intent: CampaignTransactionIntentV1,
  artifact: CampaignStagedArtifactV1,
  targets: Set<string>,
): void {
  if (
    unsafeRelative(artifact.target_path) ||
    unsafeRelative(artifact.staged_path) ||
    !artifact.staged_path.startsWith(
      `.transactions/${intent.operation_id}/artifacts/`,
    ) ||
    !/^[a-f0-9]{64}$/u.test(artifact.after_sha256) ||
    (artifact.before_sha256 !== null &&
      !/^[a-f0-9]{64}$/u.test(artifact.before_sha256)) ||
    targets.has(artifact.target_path)
  )
    throw new Error("campaign_transaction_artifact_invalid");
  targets.add(artifact.target_path);
}

function unsafeRelative(value: string): boolean {
  return (
    !value ||
    path.isAbsolute(value) ||
    value.includes("\\") ||
    value.split("/").includes("..")
  );
}

function safeLabel(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/gu, "_").slice(0, 80);
}

export function lastEventHash(content: string): string | null {
  const lines = content.trim().split(/\r?\n/gu).filter(Boolean);
  if (lines.length === 0) return null;
  const parsed = parseStrictJson(lines.at(-1)!) as Record<string, unknown>;
  return typeof parsed.event_hash === "string"
    ? parsed.event_hash
    : sha256Hex(lines.at(-1)!);
}

export function eventExists(content: string, eventHash: string): boolean {
  return content
    .split(/\r?\n/gu)
    .filter(Boolean)
    .some((line) => {
      try {
        return (
          (parseStrictJson(line) as Record<string, unknown>).event_hash ===
          eventHash
        );
      } catch {
        return false;
      }
    });
}
