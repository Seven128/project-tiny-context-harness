import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import { stableCampaignStagedArtifacts } from "./composite-campaign-transaction-artifacts.js";
import {
  atomicDurable,
  fileHash,
  optionalJson,
  replaceFromStaging,
  transactionRelative,
  writeDurable,
} from "./composite-campaign-transaction-io.js";
import {
  archiveCompletedIntent,
  assertTransactionIntent,
  eventExists,
  lastEventHash,
  quarantineAmbiguousTransaction,
  quarantineOrphanRevisions,
  quarantineOrphanTransactionDrafts,
  reconcileStagedArtifacts,
  rollbackPreparedIntent,
  type CampaignStagedArtifactV1,
  type CampaignTransactionIntentV1,
} from "./composite-campaign-transaction-recovery.js";

const LEASE_MS = 5 * 60 * 1000;
const LOCK_FILE = ".campaign.lock";
const INTENT_FILE = ".campaign-transaction.json";

export interface CampaignLeaseV1 {
  schema_version: "campaign-lock-v1";
  operation_id: string;
  pid: number;
  host: string;
  started_at: string;
  lease_expires_at: string;
}

export interface CampaignTransactionHandleV1 {
  lease: CampaignLeaseV1;
  operation: string;
  close(): Promise<void>;
}

export {
  createCampaignMutationTransactionV1,
  type CampaignMutationTransactionV1,
} from "./composite-campaign-transaction-artifacts.js";

export async function acquireCampaignLeaseV1(
  root: string,
  operation: string,
): Promise<CampaignTransactionHandleV1> {
  if (!operation.trim()) throw new Error("campaign_lock_operation_empty");
  const campaignRoot = path.resolve(root);
  await recoverCampaignStoreV1(campaignRoot);
  const lockPath = path.join(campaignRoot, LOCK_FILE);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prior = await optionalJson<CampaignLeaseV1>(lockPath);
    if (prior) {
      assertCampaignLockV1(prior);
      if (Date.parse(prior.lease_expires_at) > Date.now())
        throw new Error(`campaign_lease_active:${prior.operation_id}`);
      await rm(lockPath, { force: true });
    }
    const now = new Date();
    const lease: CampaignLeaseV1 = {
      schema_version: "campaign-lock-v1",
      operation_id: randomUUID(),
      pid: process.pid,
      host: hostname(),
      started_at: now.toISOString(),
      lease_expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
    };
    try {
      await writeDurable(lockPath, canonicalJson(lease), "wx");
      return {
        lease,
        operation,
        async close() {
          const current = await optionalJson<CampaignLeaseV1>(lockPath);
          if (current?.operation_id === lease.operation_id)
            await rm(lockPath, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt === 2)
        throw error;
    }
  }
  throw new Error("campaign_lease_acquisition_failed");
}

export async function commitCampaignTransactionV1(input: {
  root: string;
  lease: CampaignLeaseV1;
  operation: string;
  beforeCampaign: string;
  afterCampaign: string;
  event: Record<string, unknown>;
  expectedGeneration: number;
  nextGeneration: number;
  stagedArtifacts?: CampaignStagedArtifactV1[];
}): Promise<void> {
  if (!input.operation.trim())
    throw new Error("campaign_transaction_operation_empty");
  const root = path.resolve(input.root);
  const transactions = path.join(root, ".transactions");
  const operationRoot = path.join(transactions, input.lease.operation_id);
  const campaignPath = path.join(root, "campaign.yaml");
  const eventsPath = path.join(root, "events.ndjson");
  const intentPath = path.join(root, INTENT_FILE);
  await mkdir(transactions, { recursive: true });
  await mkdir(operationRoot, { recursive: true });
  const beforeEvents = await readFile(eventsPath, "utf8");
  const previousEventHash = lastEventHash(beforeEvents);
  const eventIdentity = {
    ...input.event,
    operation_id: input.lease.operation_id,
    previous_event_hash: previousEventHash,
  };
  const eventHash = sha256Hex(canonicalValueJson(eventIdentity));
  const eventLine = canonicalValueJson({
    ...eventIdentity,
    event_hash: eventHash,
  });
  const afterEvents = `${beforeEvents.replace(/\s*$/u, "")}\n${eventLine}\n`;
  const stagedCampaign = path.join(operationRoot, "campaign.yaml.next");
  const stagedEvents = path.join(operationRoot, "events.ndjson.next");
  await writeDurable(stagedCampaign, input.afterCampaign, "wx");
  await writeDurable(stagedEvents, afterEvents, "wx");
  const intent: CampaignTransactionIntentV1 = {
    schema_version: "campaign-transaction-intent-v1",
    operation_id: input.lease.operation_id,
    operation: input.operation,
    phase: "prepared",
    expected_generation: input.expectedGeneration,
    next_generation: input.nextGeneration,
    before_state_sha256: sha256Hex(input.beforeCampaign),
    after_state_sha256: sha256Hex(input.afterCampaign),
    before_campaign_sha256: sha256Hex(input.beforeCampaign),
    after_campaign_sha256: sha256Hex(input.afterCampaign),
    before_events_sha256: sha256Hex(beforeEvents),
    after_events_sha256: sha256Hex(afterEvents),
    staged_campaign_path: transactionRelative(root, stagedCampaign),
    staged_events_path: transactionRelative(root, stagedEvents),
    event_line: eventLine,
    event_hash: eventHash,
    previous_event_hash: previousEventHash,
    staged_artifacts: stableCampaignStagedArtifacts(
      input.stagedArtifacts ?? [],
    ),
    pid: input.lease.pid,
    host: input.lease.host,
    started_at: input.lease.started_at,
  };
  assertTransactionIntent(intent);
  await atomicDurable(intentPath, canonicalJson(intent));
  if (process.env.TY_CONTEXT_TX_CRASH_AT === "after_transaction_intent")
    throw new Error("simulated_crash_after_transaction_intent");
  await reconcileStagedArtifacts(root, intent);
  intent.phase = "artifacts_replaced";
  await atomicDurable(intentPath, canonicalJson(intent));
  if (
    process.env.TY_CONTEXT_TX_CRASH_AT === "after_artifacts_before_campaign" ||
    process.env.TY_CONTEXT_TX_CRASH_AT === "after_revision_write" ||
    process.env.TY_CONTEXT_TX_CRASH_AT === "after_scope_file_rename" ||
    process.env.TY_CONTEXT_TX_CRASH_AT === "after_packet_revision_rename"
  )
    throw new Error("simulated_crash_after_artifacts_before_campaign");
  await replaceFromStaging(stagedCampaign, campaignPath);
  intent.phase = "campaign_replaced";
  await atomicDurable(intentPath, canonicalJson(intent));
  if (
    process.env.TY_CONTEXT_TX_CRASH_AT ===
      "after_campaign_state_before_event" ||
    process.env.TY_CONTEXT_TX_CRASH_AT === "after_campaign_state_write" ||
    process.env.TY_CONTEXT_TX_CRASH_AT === "before_event_append"
  )
    throw new Error("simulated_crash_after_campaign_state_before_event");
  await replaceFromStaging(stagedEvents, eventsPath);
  intent.phase = "events_replaced";
  await atomicDurable(intentPath, canonicalJson(intent));
  await archiveCompletedIntent(root, intent);
}

export async function recoverCampaignStoreV1(
  rootValue: string,
): Promise<{ recovered: boolean; quarantined_revisions: string[] }> {
  const root = path.resolve(rootValue);
  const lock = await optionalJson<CampaignLeaseV1>(path.join(root, LOCK_FILE));
  if (lock) assertCampaignLockV1(lock);
  if (lock && leaseIsActive(lock) && leaseOwnerIsAlive(lock))
    return { recovered: false, quarantined_revisions: [] };
  if (lock) await rm(path.join(root, LOCK_FILE), { force: true });
  const intentPath = path.join(root, INTENT_FILE);
  const intent = await optionalJson<CampaignTransactionIntentV1>(intentPath);
  let recovered = false;
  if (intent) {
    assertTransactionIntent(intent);
    const campaignPath = path.join(root, "campaign.yaml");
    const eventsPath = path.join(root, "events.ndjson");
    const currentCampaign = await readFile(campaignPath, "utf8");
    const campaignHash = sha256Hex(currentCampaign);
    const currentEventsBeforeRecovery = await readFile(eventsPath, "utf8");
    if (
      campaignHash === intent.before_campaign_sha256 &&
      sha256Hex(currentEventsBeforeRecovery) === intent.before_events_sha256 &&
      (await artifactsStillBefore(root, intent))
    ) {
      await rollbackPreparedIntent(root, intent);
      recovered = true;
    } else {
      recovered = (await reconcileStagedArtifacts(root, intent)) || recovered;
      if (campaignHash === intent.before_campaign_sha256) {
        const staged = path.join(root, intent.staged_campaign_path);
        if ((await fileHash(staged)) !== intent.after_campaign_sha256)
          return quarantineAmbiguousTransaction(
            root,
            intent,
            "staged_campaign_missing_or_corrupt",
          );
        await replaceFromStaging(staged, campaignPath);
        recovered = true;
      } else if (campaignHash !== intent.after_campaign_sha256) {
        return quarantineAmbiguousTransaction(
          root,
          intent,
          "campaign_hash_ambiguous",
        );
      }
      const currentEvents = await readFile(eventsPath, "utf8");
      if (!eventExists(currentEvents, intent.event_hash)) {
        const reconstructed = `${currentEvents.replace(/\s*$/u, "")}\n${intent.event_line}\n`;
        if (sha256Hex(reconstructed) !== intent.after_events_sha256)
          return quarantineAmbiguousTransaction(
            root,
            intent,
            "events_hash_ambiguous",
          );
        await atomicDurable(eventsPath, reconstructed);
        recovered = true;
      }
      await archiveCompletedIntent(root, intent);
    }
  }
  await quarantineOrphanTransactionDrafts(root);
  const quarantined = await quarantineOrphanRevisions(root);
  return { recovered, quarantined_revisions: quarantined };
}

function leaseIsActive(lease: CampaignLeaseV1): boolean {
  return Date.parse(lease.lease_expires_at) > Date.now();
}

async function artifactsStillBefore(
  root: string,
  intent: CampaignTransactionIntentV1,
): Promise<boolean> {
  for (const artifact of intent.staged_artifacts) {
    const target = path.join(root, ...artifact.target_path.split("/"));
    if ((await fileHash(target)) !== artifact.before_sha256) return false;
  }
  return true;
}

function assertCampaignLockV1(lock: CampaignLeaseV1): void {
  const expected = [
    "schema_version",
    "operation_id",
    "pid",
    "host",
    "started_at",
    "lease_expires_at",
  ];
  if (
    lock.schema_version !== "campaign-lock-v1" ||
    !/^[a-f0-9-]{32,36}$/iu.test(lock.operation_id) ||
    !Number.isInteger(lock.pid) ||
    lock.pid < 1 ||
    !lock.host ||
    !Number.isFinite(Date.parse(lock.started_at)) ||
    !Number.isFinite(Date.parse(lock.lease_expires_at)) ||
    Object.keys(lock).some((key) => !expected.includes(key)) ||
    expected.some((key) => !Object.hasOwn(lock, key))
  )
    throw new Error("campaign_lock_invalid");
}

function leaseOwnerIsAlive(lease: CampaignLeaseV1): boolean {
  if (lease.host !== hostname()) return true;
  if (lease.pid === process.pid) return true;
  try {
    process.kill(lease.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function buildInitialCampaignEventV1(
  event: Record<string, unknown>,
): string {
  const identity = {
    ...event,
    operation_id: "campaign-create",
    previous_event_hash: null,
  };
  return canonicalValueJson({
    ...identity,
    event_hash: sha256Hex(canonicalValueJson(identity)),
  });
}
