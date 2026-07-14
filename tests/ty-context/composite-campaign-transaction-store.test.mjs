import assert from "node:assert/strict";
import test from "node:test";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import os, { hostname } from "node:os";
import path from "node:path";
import {
  acquireCampaignLeaseV1,
  buildInitialCampaignEventV1,
  commitCampaignTransactionV1,
  createCampaignMutationTransactionV1,
  recoverCampaignStoreV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-transaction-store.js";
import {
  artifactsForCampaignMutationPlanV1,
  createCampaignMutationPlanV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-transaction-artifacts.js";

test("mutation_callback_returns_closed_campaign_mutation_plan", async () => {
  const fixture = await storeFixture("mutation-plan");
  const handle = await acquireCampaignLeaseV1(fixture.root, "apply_scope");
  try {
    const transaction = createCampaignMutationTransactionV1(
      fixture.root,
      handle.lease,
    );
    await transaction.stageFile("scope-fit.json", "{}\n");
    const plan = createCampaignMutationPlanV1(
      { generation: 2 },
      "apply_scope",
      transaction,
    );
    assert.deepEqual(plan.nextCampaign, { generation: 2 });
    assert.deepEqual(plan.stagedWrites, [
      {
        target: "scope-fit.json",
        contentPath: `.transactions/${handle.lease.operation_id}/artifacts/scope-fit.json`,
      },
    ]);
    assert.equal(
      artifactsForCampaignMutationPlanV1(plan, transaction).length,
      1,
    );
    await assert.rejects(() => access(path.join(fixture.root, "scope-fit.json")));
  } finally {
    await handle.close();
  }
});

test("stale_lock_owner_dead", async () => {
  const fixture = await storeFixture("stale-lock");
  await writeFile(
    path.join(fixture.root, ".campaign.lock"),
    JSON.stringify({
      schema_version: "campaign-lock-v1",
      operation_id: "00000000-0000-0000-0000-000000000000",
      pid: 999999,
      host: "gone",
      started_at: "2000-01-01T00:00:00.000Z",
      lease_expires_at: "2000-01-01T00:00:01.000Z",
    }),
  );
  const handle = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(handle.operation, "recovered");
  assert.equal(handle.lease.schema_version, "campaign-lock-v1");
  await handle.close();
});

test("crash_after_transaction_intent", async () => {
  const fixture = await storeFixture("intent-crash");
  await interruptTransaction(fixture, "after_transaction_intent", {
    target: "scope-fit.json",
    content: "{}\n",
  });
  const intent = await readIntent(fixture.root);
  assert.equal(intent.operation, "scope_applied");
  assert.equal(intent.expected_generation, 1);
  assert.equal(intent.next_generation, 2);
  assert.equal(intent.pid, process.pid);
  assert.equal(intent.host, hostname());
  assert.match(intent.before_state_sha256, /^[a-f0-9]{64}$/u);
  assert.match(intent.after_state_sha256, /^[a-f0-9]{64}$/u);
  const recovered = await recoverCampaignStoreV1(fixture.root);
  assert.equal(recovered.recovered, true);
  assert.match(await readFile(path.join(fixture.root, "campaign.yaml"), "utf8"), /generation: 1/u);
  await assert.rejects(() => access(path.join(fixture.root, "scope-fit.json")));
  await assert.rejects(() => access(path.join(fixture.root, ".campaign-transaction.json")));
});

test("crash_after_scope_file_rename", async () => {
  const fixture = await storeFixture("scope-crash");
  await interruptTransaction(fixture, "after_scope_file_rename", {
    target: "scope-fit.json",
    content: "{}\n",
  });
  await recoverCampaignStoreV1(fixture.root);
  assert.equal(await readFile(path.join(fixture.root, "scope-fit.json"), "utf8"), "{}\n");
  await assertCommitted(fixture.root);
});

test("crash_after_packet_revision_rename", async () => {
  const fixture = await storeFixture("packet-crash");
  const target = "slices/SFC-001/revisions/0001/authoring-packet.json";
  await interruptTransaction(fixture, "after_packet_revision_rename", {
    target,
    content: "{}\n",
  });
  const recovered = await recoverCampaignStoreV1(fixture.root);
  assert.equal(recovered.quarantined_revisions.length, 0);
  assert.equal(await readFile(path.join(fixture.root, ...target.split("/")), "utf8"), "{}\n");
  await assertCommitted(fixture.root);
});

for (const [name, crashAt] of [
  ["crash_after_campaign_state_write", "after_campaign_state_write"],
  ["crash_before_event_append", "before_event_append"],
]) {
  test(name, async () => {
    const fixture = await storeFixture(crashAt);
    await interruptTransaction(fixture, crashAt);
    const recovered = await recoverCampaignStoreV1(fixture.root);
    assert.equal(recovered.recovered, true);
    await assertCommitted(fixture.root);
  });
}

test("unexpired_lock_with_dead_local_owner_is_recovered", async () => {
  const fixture = await storeFixture("dead-local-owner");
  await writeFile(
    path.join(fixture.root, ".campaign.lock"),
    JSON.stringify({
      schema_version: "campaign-lock-v1",
      operation_id: "00000000-0000-0000-0000-000000000000",
      pid: 2147483647,
      host: hostname(),
      started_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
    }),
  );
  const handle = await acquireCampaignLeaseV1(fixture.root, "recovered");
  assert.equal(handle.operation, "recovered");
  await handle.close();
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

test("orphan_revision_quarantined", async () => {
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
  await interruptTransaction(fixture, "before_event_append");
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

async function interruptTransaction(fixture, crashAt, staged) {
  const operation = staged?.target === "scope-fit.json" ? "scope_applied" : "mutated";
  const afterCampaign = staged?.target?.includes("/revisions/")
    ? fixture.afterCampaign.replace("packet_revision: null", "packet_revision: 1")
    : fixture.afterCampaign;
  const handle = await acquireCampaignLeaseV1(fixture.root, operation);
  const transaction = createCampaignMutationTransactionV1(
    fixture.root,
    handle.lease,
  );
  if (staged) await transaction.stageFile(staged.target, staged.content);
  const prior = process.env.TY_CONTEXT_TX_CRASH_AT;
  process.env.TY_CONTEXT_TX_CRASH_AT = crashAt;
  try {
    await assert.rejects(
      () =>
        commitCampaignTransactionV1({
          root: fixture.root,
          lease: handle.lease,
          operation,
          beforeCampaign: fixture.beforeCampaign,
          afterCampaign,
          event: { type: operation, generation: 2 },
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
}

async function readIntent(root) {
  return JSON.parse(
    await readFile(path.join(root, ".campaign-transaction.json"), "utf8"),
  );
}

async function assertCommitted(root) {
  assert.match(await readFile(path.join(root, "campaign.yaml"), "utf8"), /generation: 2/u);
  assert.match(await readFile(path.join(root, "events.ndjson"), "utf8"), /"generation":2/u);
  await assert.rejects(() => access(path.join(root, ".campaign-transaction.json")));
}
