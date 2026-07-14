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
import {
  CAMPAIGN_LOCK_FILE,
  assertCampaignLockV1,
  campaignLeaseBlocksRecovery,
  type CampaignLeaseV1,
  type CampaignTransactionHandleV1,
} from "./composite-campaign-lease.js";

const INTENT_FILE = ".campaign-transaction.json";

export {
  createCampaignMutationTransactionV1,
  type CampaignMutationTransactionV1,
} from "./composite-campaign-transaction-artifacts.js";
export {
  acquireCampaignLeaseV1,
  type CampaignLeaseV1,
  type CampaignTransactionHandleV1,
} from "./composite-campaign-lease.js";

export async function commitCampaignTransactionV1(input: {
  root: string;
  handle: CampaignTransactionHandleV1;
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
  const operationRoot = path.join(
    transactions,
    input.handle.lease.operation_id,
  );
  const campaignPath = path.join(root, "campaign.yaml");
  const eventsPath = path.join(root, "events.ndjson");
  const intentPath = path.join(root, INTENT_FILE);
  await mkdir(transactions, { recursive: true });
  await mkdir(operationRoot, { recursive: true });
  const beforeEvents = await readFile(eventsPath, "utf8");
  const previousEventHash = lastEventHash(beforeEvents);
  const eventIdentity = {
    ...input.event,
    operation_id: input.handle.lease.operation_id,
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
    operation_id: input.handle.lease.operation_id,
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
    pid: input.handle.lease.pid,
    host: input.handle.lease.host,
    started_at: input.handle.lease.started_at,
  };
  assertTransactionIntent(intent);
  await assertAndRenew(input.handle);
  await atomicDurable(intentPath, canonicalJson(intent));
  if (process.env.TY_CONTEXT_TX_CRASH_AT === "after_transaction_intent")
    throw new Error("simulated_crash_after_transaction_intent");
  await assertAndRenew(input.handle);
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
  await assertAndRenew(input.handle);
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
  await assertAndRenew(input.handle);
  await replaceFromStaging(stagedEvents, eventsPath);
  intent.phase = "events_replaced";
  await atomicDurable(intentPath, canonicalJson(intent));
  await archiveCompletedIntent(root, intent);
}

export async function recoverCampaignStoreV1(
  rootValue: string,
): Promise<{ recovered: boolean; quarantined_revisions: string[] }> {
  const root = path.resolve(rootValue);
  const lock = await optionalJson<CampaignLeaseV1>(
    path.join(root, CAMPAIGN_LOCK_FILE),
  );
  if (lock) assertCampaignLockV1(lock);
  if (lock && campaignLeaseBlocksRecovery(lock))
    return { recovered: false, quarantined_revisions: [] };
  if (lock) await rm(path.join(root, CAMPAIGN_LOCK_FILE), { force: true });
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

async function assertAndRenew(
  handle: CampaignTransactionHandleV1,
): Promise<void> {
  await handle.assertOwned();
  await handle.renew();
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
