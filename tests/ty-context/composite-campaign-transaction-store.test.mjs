import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { hostname } from "node:os";
import path from "node:path";
import {
  acquireCampaignLeaseV1,
  buildInitialCampaignEventV1,
  commitCampaignTransactionV1,
  createCampaignMutationTransactionV1,
  recoverCampaignStoreV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-transaction-store.js";

test("stale_lock_is_recovered", async () => {
  const fixture = await storeFixture("stale-lock");
  await writeFile(
    path.join(fixture.root, ".campaign.lock"),
    JSON.stringify({
      schema_version: "campaign-lease-v1",
      operation_id: "00000000-0000-0000-0000-000000000000",
      operation: "dead",
      pid: 999999,
      host: "gone",
      started_at: "2000-01-01T00:00:00.000Z",
      lease_expires_at: "2000-01-01T00:00:01.000Z",
    }),
  );
  const lease = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(lease.lease.operation, "recovered");
  await lease.close();
});

test("crash_after_revision_write_is_reconciled", async () => {
  const fixture = await storeFixture("revision-crash");
  const handle = await acquireCampaignLeaseV1(fixture.root, "packet_applied");
  const transaction = createCampaignMutationTransactionV1(
    fixture.root,
    handle.lease,
  );
  await transaction.stageFile(
    "slices/SFC-001/revisions/0001/authoring-packet.json",
    "{}\n",
  );
  const prior = process.env.TY_CONTEXT_TX_CRASH_AT;
  process.env.TY_CONTEXT_TX_CRASH_AT = "after_revision_write";
  try {
    await assert.rejects(
      () =>
        commitCampaignTransactionV1({
          root: fixture.root,
          lease: handle.lease,
          beforeCampaign: fixture.beforeCampaign,
          afterCampaign: fixture.afterCampaign.replace(
            "packet_revision: null",
            "packet_revision: 1",
          ),
          event: { type: "packet_applied", generation: 2 },
          expectedGeneration: 1,
          nextGeneration: 2,
          stagedArtifacts: transaction.stagedArtifacts(),
        }),
      /simulated_crash/u,
    );
  } finally {
    if (prior === undefined) delete process.env.TY_CONTEXT_TX_CRASH_AT;
    else process.env.TY_CONTEXT_TX_CRASH_AT = prior;
    await handle.close();
  }
  const intent = JSON.parse(
    await readFile(
      path.join(fixture.root, ".transactions", "transaction-intent.json"),
      "utf8",
    ),
  );
  assert.equal(intent.expected_generation, 1);
  assert.equal(intent.next_generation, 2);
  assert.equal(intent.pid, process.pid);
  assert.equal(intent.host, hostname());
  assert.equal(intent.staged_artifacts.length, 1);
  assert.match(intent.before_state_sha256, /^[a-f0-9]{64}$/u);
  assert.match(intent.after_state_sha256, /^[a-f0-9]{64}$/u);
  const recovered = await recoverCampaignStoreV1(fixture.root);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.quarantined_revisions.length, 0);
  assert.equal(
    await readFile(
      path.join(
        fixture.root,
        "slices",
        "SFC-001",
        "revisions",
        "0001",
        "authoring-packet.json",
      ),
      "utf8",
    ),
    "{}\n",
  );
});

test("unexpired_lock_with_dead_local_owner_is_recovered", async () => {
  const fixture = await storeFixture("dead-local-owner");
  await writeFile(
    path.join(fixture.root, ".campaign.lock"),
    JSON.stringify({
      schema_version: "campaign-lease-v1",
      operation_id: "00000000-0000-0000-0000-000000000000",
      operation: "dead",
      pid: 2147483647,
      host: hostname(),
      started_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
    }),
  );
  const lease = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(lease.lease.operation, "recovered");
  await lease.close();
});

test("live_lease_owner_rejects_concurrent_writer", async () => {
  const fixture = await storeFixture("live-owner");
  const first = await acquireCampaignLeaseV1(fixture.root, "first");
  try {
    await assert.rejects(
      () => acquireCampaignLeaseV1(fixture.root, "second"),
      /campaign_lease_active/u,
    );
  } finally {
    await first.close();
  }
});

test("crash_after_campaign_state_before_event_is_reconciled", async () => {
  const fixture = await storeFixture("state-event-crash");
  await createInterruptedTransaction(fixture);
  const recovered = await recoverCampaignStoreV1(fixture.root);
  assert.equal(recovered.recovered, true);
  assert.match(
    await readFile(path.join(fixture.root, "campaign.yaml"), "utf8"),
    /generation: 2/u,
  );
  assert.match(
    await readFile(path.join(fixture.root, "events.ndjson"), "utf8"),
    /"type":"mutated"/u,
  );
});

test("orphan_revision_is_quarantined", async () => {
  const fixture = await storeFixture("orphan");
  const orphan = path.join(
    fixture.root,
    "slices",
    "SFC-UNKNOWN",
    "revisions",
    "0001.tmp-dead",
  );
  await mkdir(orphan, { recursive: true });
  const recovered = await recoverCampaignStoreV1(fixture.root);
  assert.equal(recovered.quarantined_revisions.length, 1);
  assert.match(
    recovered.quarantined_revisions[0],
    /^quarantine\/orphan-revisions\/SFC-UNKNOWN-/u,
  );
});

test("recovery_is_idempotent", async () => {
  const fixture = await storeFixture("idempotent");
  await createInterruptedTransaction(fixture);
  const first = await recoverCampaignStoreV1(fixture.root);
  const second = await recoverCampaignStoreV1(fixture.root);
  assert.equal(first.recovered, true);
  assert.deepEqual(second, { recovered: false, quarantined_revisions: [] });
});

async function storeFixture(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), `campaign-store-${name}-`));
  const beforeCampaign =
    "schema_version: composite-campaign-v5\ngeneration: 1\nslices:\n  SFC-001:\n    packet_revision: null\n";
  await writeFile(path.join(root, "campaign.yaml"), beforeCampaign);
  await writeFile(
    path.join(root, "events.ndjson"),
    `${buildInitialCampaignEventV1({ type: "created" })}\n`,
  );
  return {
    root,
    beforeCampaign,
    afterCampaign: beforeCampaign.replace("generation: 1", "generation: 2"),
  };
}

async function createInterruptedTransaction(fixture) {
  const handle = await acquireCampaignLeaseV1(fixture.root, "mutated");
  const prior = process.env.TY_CONTEXT_TX_CRASH_AT;
  process.env.TY_CONTEXT_TX_CRASH_AT = "after_campaign_state_before_event";
  try {
    await assert.rejects(
      () =>
        commitCampaignTransactionV1({
          root: fixture.root,
          lease: handle.lease,
          beforeCampaign: fixture.beforeCampaign,
          afterCampaign: fixture.afterCampaign,
          event: { type: "mutated", generation: 2 },
          expectedGeneration: 1,
          nextGeneration: 2,
          stagedArtifacts: [],
        }),
      /simulated_crash/u,
    );
  } finally {
    if (prior === undefined) delete process.env.TY_CONTEXT_TX_CRASH_AT;
    else process.env.TY_CONTEXT_TX_CRASH_AT = prior;
    await handle.close();
  }
}
