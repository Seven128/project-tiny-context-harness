import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { COMPOSITE_INPUT_CONTRACT } from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import { sourceHashesSha256 } from "../../packages/ty-context/dist/lib/composite-campaign-schema-binding.js";
import { COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION } from "../../packages/ty-context/dist/lib/composite-campaign-types.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const baseStorePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const projectionStorePath = "../../packages/ty-context/dist/lib/composite-campaign-projection-store.js";
const lifecycleStorePath = "../../packages/ty-context/dist/lib/composite-campaign-lifecycle-store.js";

test("lifecycle CAS atomically publishes handoff, one Goal, and one minimal result", async () => {
  const root = await emptyProject();
  try {
    const store = {
      ...await import(baseStorePath),
      ...await import(projectionStorePath),
      ...await import(lifecycleStorePath)
    };
    const ready = await readyCampaign(root, store);
    const binding = bindingFor(ready);
    const handed = await store.publishHandoffCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", binding,
      expected_etag: ready.manifest_etag_sha256, operation_id: "handoff:1"
    });
    assert.equal(handed.campaign.slices["SFC-001"].handoff_status, "ready");
    assert.equal(handed.campaign.slices["SFC-001"].binding.goal, null);

    const started = await store.bindGoalCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-1",
      expected_etag: handed.manifest_etag_sha256, operation_id: "goal:1"
    });
    assert.equal(started.campaign.slices["SFC-001"].handoff_status, "started");
    assert.equal(started.campaign.slices["SFC-001"].result_projection, "sync_pending");

    const result = {
      status: "reject",
      task_attempt_id: "ATT-FINAL",
      source_hashes_sha256: sourceHashesSha256(binding.source_hashes),
      final_gate_event_sha256: "f".repeat(64),
      recorded_at: laterThan(started.campaign.updated_at)
    };
    const projected = await store.projectResultCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", result,
      expected_etag: started.manifest_etag_sha256, operation_id: "result:1"
    });
    assert.equal(projected.campaign.slices["SFC-001"].result_projection, "reject");
    assert.equal(projected.campaign.slices["SFC-001"].binding.result.task_attempt_id, "ATT-FINAL");
    assert.equal("campaign_complete" in projected.campaign, false);

    const retried = await store.projectResultCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", result,
      expected_etag: started.manifest_etag_sha256, operation_id: "result:1"
    });
    assert.equal(retried.manifest_etag_sha256, projected.manifest_etag_sha256);
    const events = (await readFile(path.join(root, ".harness/composite-long-task/campaigns/campaign-1/events.ndjson"), "utf8"))
      .trimEnd().split("\n").map(JSON.parse);
    assert.deepEqual(events.slice(-3).map((event) => event.kind), [
      "handoff_published", "goal_bound", "result_projected"
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a second Goal ID conflicts without changing tracked campaign bytes", async () => {
  const root = await emptyProject();
  try {
    const store = {
      ...await import(baseStorePath),
      ...await import(projectionStorePath),
      ...await import(lifecycleStorePath)
    };
    const ready = await readyCampaign(root, store);
    const handed = await store.publishHandoffCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", binding: bindingFor(ready),
      expected_etag: ready.manifest_etag_sha256, operation_id: "handoff:1"
    });
    const started = await store.bindGoalCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-1",
      expected_etag: handed.manifest_etag_sha256, operation_id: "goal:1"
    });
    const manifest = path.join(root, ".harness/composite-long-task/campaigns/campaign-1/campaign.yaml");
    const before = await readFile(manifest);
    await assert.rejects(store.bindGoalCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-2",
      expected_etag: started.manifest_etag_sha256, operation_id: "goal:2"
    }), /already|different|goal/i);
    assert.deepEqual(await readFile(manifest), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const checkpoint of ["after_marker_fsync", "after_event_fsync", "after_manifest_replace"]) {
  test(`a lifecycle transaction interrupted at ${checkpoint} converges exactly once`, async () => {
    const root = await emptyProject();
    try {
      const base = await import(baseStorePath);
      const projection = await import(projectionStorePath);
      const lifecycle = await import(lifecycleStorePath);
      const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
      const ready = await readyCampaign(root, { ...base, ...projection });
      const operation = {
        campaign_id: "campaign-1", slice_id: "SFC-001", binding: bindingFor(ready),
        expected_etag: ready.manifest_etag_sha256, operation_id: `handoff:crash:${checkpoint}`
      };
      const crashing = internal.createCompositeCampaignStore({
        checkpoint: async (name) => {
          if (name === checkpoint) throw new Error(`simulated lifecycle crash at ${checkpoint}`);
        }
      });
      await assert.rejects(crashing.publishHandoffCas(root, operation), /simulated lifecycle crash/);
      const recovered = await lifecycle.publishHandoffCas(root, operation);
      assert.equal(recovered.campaign.slices["SFC-001"].handoff_status, "ready");
      const events = (await readFile(path.join(root, ".harness/composite-long-task/campaigns/campaign-1/events.ndjson"), "utf8"))
        .trimEnd().split("\n").map(JSON.parse);
      assert.equal(events.filter((event) => event.operation_id === operation.operation_id).length, 1);
      assert.equal(events.at(-1).kind, "handoff_published");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

async function readyCampaign(root, store) {
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: "Deliver one composite campaign slice.\n", operation_id: "create:1"
  });
  const scope = scopeFitFixture();
  scope.request_sha256 = created.campaign.request.sha256;
  const scoped = await store.applyScopeFitCas(root, {
    campaign_id: "campaign-1", scope_fit: scope,
    expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
  });
  const packet = packetFixture();
  packet.request_sha256 = created.campaign.request.sha256;
  packet.created_at = scoped.campaign.updated_at;
  makePacketRenderable(packet);
  const authored = await store.createPacketRevisionCas(root, {
    campaign_id: "campaign-1", packet,
    expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
  });
  return store.publishProjectionCas(root, {
    campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
    expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
  });
}

function bindingFor(snapshot) {
  const revision = snapshot.campaign.slices["SFC-001"].revisions[0];
  const projection = revision.projections;
  return {
    schema_version: COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
    binding_id: "binding-campaign-1-SFC-001-r1",
    campaign_id: "campaign-1",
    slice_id: "SFC-001",
    revision: 1,
    request_sha256: snapshot.campaign.request.sha256,
    packet_sha256: revision.packet_sha256,
    input_contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
    source_hashes: {
      product_architecture_source: projection.product_architecture_source_sha256,
      technical_realization_plan: projection.technical_realization_plan_sha256,
      acceptance_checklist: projection.acceptance_checklist_sha256
    },
    workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1/",
    task: { task_id: "TASK-1", task_attempt_id: "ATT-INITIAL" },
    handed_off_at: laterThan(snapshot.campaign.updated_at),
    goal: null,
    result: null
  };
}

function makePacketRenderable(packet) {
  const product = packet.authorities.product_architecture_source.fields;
  product.representative_samples_do_not_validate = ["manual prose is not machine proof"];
  product.non_completing_outcomes = ["validation without assertion evidence"];
  const plan = packet.authorities.technical_realization_plan.plan_items[0].fields;
  plan.implementation_paths = ["packages/ty-context/src/lib/composite-campaign-renderer.ts"];
  plan.invalid_implementation_shortcuts = ["publish only one projection"];
  const acceptance = packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
  acceptance.ac_validates = ["all three canonical sources compile"];
  acceptance.ac_does_not_validate = ["manual prose is not machine proof"];
  acceptance.required_proof_layers = ["code"];
  acceptance.positive_assertions = ["three source hashes match"];
  acceptance.negative_assertions = ["partial publication is absent"];
  acceptance.invalid_completion_signals = ["validation without assertion evidence"];
}

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-lifecycle-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}

function laterThan(value) {
  return new Date(Date.parse(value) + 1000).toISOString();
}
