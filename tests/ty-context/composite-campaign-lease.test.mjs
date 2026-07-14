import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os, { hostname } from "node:os";
import path from "node:path";
import {
  acquireCampaignLeaseV1,
  buildInitialCampaignEventV1,
  commitCampaignTransactionV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-transaction-store.js";

test("expired_lease_with_live_local_owner_is_not_stolen", async () => {
  const fixture = await storeFixture("expired-live-local");
  await writeLock(fixture.root, lockValue({
    pid: process.pid,
    host: hostname(),
    lease_expires_at: "2000-01-01T00:00:01.000Z",
  }));
  await assert.rejects(
    () => acquireCampaignLeaseV1(fixture.root, "blocked"),
    /campaign_lease_active/u,
  );
});

test("expired_lease_with_dead_local_owner_is_recovered", async () => {
  const fixture = await storeFixture("expired-dead-local");
  await writeLock(fixture.root, lockValue({
    pid: 2147483647,
    host: hostname(),
    lease_expires_at: "2000-01-01T00:00:01.000Z",
  }));
  const handle = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(handle.operation, "recovered");
  await handle.close();
});

test("unexpired_remote_lease_is_not_stolen", async () => {
  const fixture = await storeFixture("unexpired-remote");
  await writeLock(fixture.root, lockValue({
    host: "remote-host.example",
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
  }));
  await assert.rejects(
    () => acquireCampaignLeaseV1(fixture.root, "blocked"),
    /campaign_lease_active/u,
  );
});

test("expired_remote_lease_is_recoverable", async () => {
  const fixture = await storeFixture("expired-remote");
  await writeLock(fixture.root, lockValue({
    host: "remote-host.example",
    lease_expires_at: "2000-01-01T00:00:01.000Z",
  }));
  const handle = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(handle.operation, "recovered");
  await handle.close();
});

test("lease_heartbeat_extends_expiry", async () => {
  const fixture = await storeFixture("heartbeat");
  const handle = await acquireCampaignLeaseV1(fixture.root, "heartbeat");
  try {
    const before = handle.lease.lease_expires_at;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await handle.renew();
    const current = JSON.parse(
      await readFile(path.join(fixture.root, ".campaign.lock"), "utf8"),
    );
    assert.ok(Date.parse(current.lease_expires_at) > Date.parse(before));
    assert.equal(handle.lease.lease_expires_at, current.lease_expires_at);
  } finally {
    await handle.close();
  }
});

test("transaction_aborts_if_lock_operation_id_changes", async () => {
  const fixture = await storeFixture("ownership-change");
  const handle = await acquireCampaignLeaseV1(fixture.root, "mutated");
  const replacement = lockValue({
    operation_id: "11111111-1111-1111-1111-111111111111",
    pid: process.pid,
    host: hostname(),
  });
  await writeLock(fixture.root, replacement);
  try {
    await assert.rejects(() => handle.renew(), /campaign_lease_not_owned/u);
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(fixture.root, ".campaign.lock"), "utf8"),
      ),
      replacement,
    );
    await assert.rejects(
      () => commitCampaignTransactionV1({
        root: fixture.root,
        handle,
        operation: "mutated",
        beforeCampaign: fixture.beforeCampaign,
        afterCampaign: fixture.afterCampaign,
        event: { type: "mutated", generation: 2 },
        expectedGeneration: 1,
        nextGeneration: 2,
        stagedArtifacts: [],
      }),
      /campaign_lease_not_owned/u,
    );
    assert.equal(
      await readFile(path.join(fixture.root, "campaign.yaml"), "utf8"),
      fixture.beforeCampaign,
    );
  } finally {
    await handle.close();
  }
});

test("close_does_not_delete_another_owner_lock", async () => {
  const fixture = await storeFixture("close-other-owner");
  const handle = await acquireCampaignLeaseV1(fixture.root, "first");
  const replacement = lockValue({
    operation_id: "22222222-2222-2222-2222-222222222222",
    pid: process.pid,
    host: hostname(),
  });
  await writeLock(fixture.root, replacement);
  await handle.close();
  assert.deepEqual(
    JSON.parse(await readFile(path.join(fixture.root, ".campaign.lock"), "utf8")),
    replacement,
  );
});

async function storeFixture(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), `campaign-lease-${name}-`));
  const beforeCampaign = "schema_version: composite-campaign-v5\ngeneration: 1\nslices: {}\n";
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

async function writeLock(root, value) {
  await writeFile(path.join(root, ".campaign.lock"), JSON.stringify(value));
}

function lockValue(overrides = {}) {
  const now = new Date();
  return {
    schema_version: "campaign-lock-v1",
    operation_id: "00000000-0000-0000-0000-000000000000",
    pid: 2147483647,
    host: "remote-host.example",
    started_at: now.toISOString(),
    lease_expires_at: new Date(now.getTime() + 60_000).toISOString(),
    ...overrides,
  };
}
