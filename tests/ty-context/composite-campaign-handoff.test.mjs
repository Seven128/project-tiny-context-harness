import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handoffCompositeCampaign } from "../../packages/ty-context/dist/lib/composite-campaign-handoff.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const baseStorePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const projectionStorePath = "../../packages/ty-context/dist/lib/composite-campaign-projection-store.js";

test("handoff materializes exact frozen sources through the existing execution adapter and creates no Goal", async () => {
  const root = await emptyProject();
  try {
    const { ready, campaignRoot } = await readyCampaign(root);
    const result = await handoffCompositeCampaign(root, {
      campaign_id: "campaign-1",
      slice_id: "SFC-001"
    });
    const workdir = path.join(root, ...result.binding.workdir.split("/").filter(Boolean));
    const revisionRoot = path.join(campaignRoot, "slices/SFC-001/revisions/0001");

    for (const file of ["product-architecture-source.md", "technical-realization-plan.md", "acceptance-checklist.md"]) {
      assert.deepEqual(await readFile(path.join(workdir, file)), await readFile(path.join(revisionRoot, file)));
    }
    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.meta.task_id, result.binding.task.task_id);
    assert.equal(state.current_attempt_id, result.binding.task.task_attempt_id);
    assert.ok(Object.keys(state.graph.plan_items).length > 0);
    assert.ok(Object.keys(state.graph.acceptance_criteria).length > 0);

    const executionBinding = await readFile(path.join(workdir, "execution-binding.md"), "utf8");
    assert.match(executionBinding, /campaign_binding:/);
    assert.match(executionBinding, new RegExp(`binding_id: ${result.binding.binding_id}`));
    assert.match(executionBinding, new RegExp(`packet_sha256: ${result.binding.packet_sha256}`));
    assert.match(executionBinding, /product_architecture_source_sha256: [a-f0-9]{64}/);
    const goalObjective = await readFile(path.join(workdir, "goal-objective.txt"), "utf8");
    assert.match(goalObjective, /Persistent contract:/);
    assert.match(goalObjective, /Only final-gate computes product_goal_complete/);
    assert.match(goalObjective, new RegExp(`Campaign binding pointer: ${result.binding.campaign_id}/${result.binding.slice_id}/r${result.binding.revision}`));
    assert.doesNotMatch(goalObjective.trim(), /^\/goal\s+read\s+\S+$/i);
    const loaded = await (await import(baseStorePath)).loadCampaignSnapshot(root, "campaign-1");
    assert.equal(loaded.campaign.slices["SFC-001"].handoff_status, "ready");
    assert.equal(loaded.campaign.slices["SFC-001"].binding.goal, null);
    assert.equal(loaded.campaign.slices["SFC-001"].result_projection, "unrecorded");
    assert.equal(ready.campaign.generation + 1, loaded.campaign.generation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("handoff is idempotent, while loss before start creates a fresh attempt without reviving evidence", async () => {
  const root = await emptyProject();
  try {
    const { campaignRoot } = await readyCampaign(root);
    const first = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    const workdir = path.join(root, ...first.binding.workdir.split("/").filter(Boolean));
    const firstEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
    const retry = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    assert.deepEqual(retry.binding, first.binding);
    assert.deepEqual(await readFile(path.join(campaignRoot, "events.ndjson")), firstEvents);

    await rm(workdir, { recursive: true, force: true });
    const refreshed = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    assert.equal(refreshed.binding.binding_id, first.binding.binding_id);
    assert.notEqual(refreshed.binding.task.task_attempt_id, first.binding.task.task_attempt_id);
    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.current_attempt_id, refreshed.binding.task.task_attempt_id);
    assert.deepEqual(state.evidence, []);
    assert.deepEqual(state.command_runs, []);
    const events = (await readFile(path.join(campaignRoot, "events.ndjson"), "utf8")).trimEnd().split("\n").map(JSON.parse);
    assert.equal(events.filter((event) => event.kind === "handoff_published").length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an orphaned pre-CAS workdir cannot revive injected execution evidence", async () => {
  const root = await emptyProject();
  try {
    const { campaignRoot } = await readyCampaign(root);
    const manifestPath = path.join(campaignRoot, "campaign.yaml");
    const eventsPath = path.join(campaignRoot, "events.ndjson");
    const oldManifest = await readFile(manifestPath);
    const oldEvents = await readFile(eventsPath);
    const first = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    const statePath = path.join(first.workdir, "task-state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.evidence.push({ evidence_id: "REVIVED-EVIDENCE" });
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await writeFile(manifestPath, oldManifest);
    await writeFile(eventsPath, oldEvents);

    const recovered = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    const recoveredState = JSON.parse(await readFile(path.join(recovered.workdir, "task-state.json"), "utf8"));
    assert.deepEqual(recoveredState.evidence, []);
    assert.deepEqual(recoveredState.command_runs, []);
    assert.notEqual(recovered.binding.task.task_attempt_id, first.binding.task.task_attempt_id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a missing started workdir recovers a fresh attempt under the same Goal ID", async () => {
  const root = await emptyProject();
  try {
    await readyCampaign(root);
    const handoff = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    const lifecycle = await import("../../packages/ty-context/dist/lib/composite-campaign-lifecycle-store.js");
    const base = await import(baseStorePath);
    const snapshot = await base.loadCampaignSnapshot(root, "campaign-1");
    await lifecycle.bindGoalCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-active",
      expected_etag: snapshot.manifest_etag_sha256, operation_id: "goal:active"
    });
    const workdir = path.join(root, ...handoff.binding.workdir.split("/").filter(Boolean));
    await rm(workdir, { recursive: true, force: true });
    const recovered = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
    assert.equal(recovered.binding.goal.goal_id, "goal-active");
    assert.notEqual(recovered.binding.task.task_attempt_id, handoff.binding.task.task_attempt_id);
    const recoveredState = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(recoveredState.current_attempt_id, recovered.binding.task.task_attempt_id);
    assert.deepEqual(recoveredState.evidence, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const checkpoint of [
  "after_marker_fsync", "after_content_install", "after_event_fsync", "after_manifest_replace", "after_directory_sync"
]) {
  test(`started same-Goal handoff recovery converges after ${checkpoint}`, async () => {
    const root = await emptyProject();
    try {
      await readyCampaign(root);
      const input = { campaign_id: "campaign-1", slice_id: "SFC-001" };
      const initial = await handoffCompositeCampaign(root, input);
      const lifecycle = await import("../../packages/ty-context/dist/lib/composite-campaign-lifecycle-store.js");
      const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
      const base = await import(baseStorePath);
      const snapshot = await base.loadCampaignSnapshot(root, "campaign-1");
      await lifecycle.bindGoalCas(root, {
        campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-recover",
        expected_etag: snapshot.manifest_etag_sha256, operation_id: `goal:recover:${checkpoint}`
      });
      await rm(initial.workdir, { recursive: true, force: true });
      const crashing = internal.createCompositeCampaignStore({
        checkpoint: async (name) => {
          if (name === checkpoint) throw new Error(`simulated started recovery crash at ${checkpoint}`);
        }
      });
      await assert.rejects(
        handoffCompositeCampaign(root, input, { publishHandoffCas: crashing.publishHandoffCas }),
        /simulated started recovery crash/
      );
      const recovered = await handoffCompositeCampaign(root, input);
      assert.equal(recovered.binding.goal.goal_id, "goal-recover");
      assert.notEqual(recovered.binding.task.task_attempt_id, initial.binding.task.task_attempt_id);
      await assert.rejects(
        stat(path.join(root, ".harness/composite-long-task/campaigns/campaign-1/.composite-transaction.json")),
        /ENOENT/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

async function readyCampaign(root) {
  const store = { ...await import(baseStorePath), ...await import(projectionStorePath) };
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: "Prepare and hand off one strict SFC.\n", operation_id: "create:1"
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
  const ready = await store.publishProjectionCas(root, {
    campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
    expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
  });
  return {
    ready,
    campaignRoot: path.join(root, ".harness/composite-long-task/campaigns/campaign-1")
  };
}

function makePacketRenderable(packet) {
  const product = packet.authorities.product_architecture_source.fields;
  product.representative_samples_do_not_validate = ["manual prose is not machine proof"];
  product.non_completing_outcomes = ["validation without assertion evidence"];
  const plan = packet.authorities.technical_realization_plan.plan_items[0].fields;
  plan.implementation_paths = ["packages/ty-context/src/lib/composite-campaign-handoff.ts"];
  plan.invalid_implementation_shortcuts = ["handoff creates a Goal"];
  const acceptance = packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
  acceptance.ac_validates = ["frozen sources compile in the handoff workdir"];
  acceptance.ac_does_not_validate = ["manual prose is not machine proof"];
  acceptance.required_proof_layers = ["code"];
  acceptance.positive_assertions = ["source hashes match"];
  acceptance.negative_assertions = ["Goal is absent before explicit start"];
  acceptance.invalid_completion_signals = ["validation without assertion evidence"];
}

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-handoff-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}
