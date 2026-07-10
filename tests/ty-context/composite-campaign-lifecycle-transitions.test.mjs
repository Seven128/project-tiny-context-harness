import test from "node:test";
import assert from "node:assert/strict";
import {
  bindCompositeCampaignGoalTransition,
  projectCompositeCampaignResultTransition,
  publishCompositeCampaignHandoffTransition
} from "../../packages/ty-context/dist/lib/composite-campaign-lifecycle-transitions.js";
import { sourceHashesSha256 } from "../../packages/ty-context/dist/lib/composite-campaign-schema-binding.js";
import {
  HASH_A,
  bindingFixture,
  campaignFixture,
  goalFixture,
  resultFixture
} from "./composite-campaign-schema-fixtures.mjs";

const HANDOFF_AT = "2026-07-10T01:03:03.000Z";
const STARTED_AT = "2026-07-10T01:04:03.000Z";
const RECORDED_AT = "2026-07-10T01:05:03.000Z";

test("handoff freezes the selected ready revision without starting a Goal", () => {
  const current = readyCampaign();
  const binding = bindingFixture();
  binding.handed_off_at = HANDOFF_AT;
  const transition = publishCompositeCampaignHandoffTransition(
    current, binding, "handoff:1", HANDOFF_AT
  );

  const slice = transition.campaign.slices["SFC-001"];
  assert.equal(slice.handoff_status, "ready");
  assert.deepEqual(slice.binding, binding);
  assert.equal(slice.binding.goal, null);
  assert.equal(slice.result_projection, "unrecorded");
  assert.equal(transition.event.kind, "handoff_published");
  assert.deepEqual(transition.event.payload, {
    binding_id: "binding-1",
    task_id: "TASK-1",
    task_attempt_id: "ATTEMPT-1"
  });
});

test("a lost pre-start workdir may publish a fresh handoff attempt but a started binding cannot", () => {
  const firstBinding = bindingFixture();
  const current = campaignFixture(firstBinding);
  const replacement = structuredClone(firstBinding);
  replacement.task = { task_id: "TASK-2", task_attempt_id: "ATTEMPT-2" };
  replacement.handed_off_at = HANDOFF_AT;

  const refreshed = publishCompositeCampaignHandoffTransition(
    current, replacement, "handoff:refresh", HANDOFF_AT
  );
  assert.equal(refreshed.campaign.slices["SFC-001"].binding.task.task_attempt_id, "ATTEMPT-2");
  assert.equal(refreshed.campaign.slices["SFC-001"].binding.binding_id, firstBinding.binding_id);

  const started = campaignFixture(bindingFixture({ goal: goalFixture() }));
  started.slices["SFC-001"].handoff_status = "started";
  started.slices["SFC-001"].result_projection = "sync_pending";
  assert.throws(
    () => publishCompositeCampaignHandoffTransition(started, replacement, "handoff:late", HANDOFF_AT),
    /started|goal|active/i
  );
});

test("start binds one Goal and marks result synchronization pending", () => {
  const current = campaignFixture(bindingFixture());
  const transition = bindCompositeCampaignGoalTransition(
    current, "SFC-001", "goal-1", "goal:1", STARTED_AT
  );
  const slice = transition.campaign.slices["SFC-001"];
  assert.equal(slice.handoff_status, "started");
  assert.deepEqual(slice.binding.goal, { goal_id: "goal-1", started_at: STARTED_AT });
  assert.equal(slice.result_projection, "sync_pending");
  assert.equal(transition.event.kind, "goal_bound");
  assert.throws(
    () => bindCompositeCampaignGoalTransition(transition.campaign, "SFC-001", "goal-2", "goal:2", STARTED_AT),
    /already|different|goal/i
  );
});

test("result projection records the verified current attempt independently of the initial handoff attempt", () => {
  const binding = bindingFixture({ goal: { ...goalFixture(), started_at: STARTED_AT } });
  const current = campaignFixture(binding);
  current.updated_at = STARTED_AT;
  current.slices["SFC-001"].handoff_status = "started";
  current.slices["SFC-001"].result_projection = "sync_pending";
  const result = {
    ...resultFixture(),
    status: "blocked",
    task_attempt_id: "ATTEMPT-FINAL",
    source_hashes_sha256: sourceHashesSha256(binding.source_hashes),
    final_gate_event_sha256: HASH_A,
    recorded_at: RECORDED_AT
  };
  const transition = projectCompositeCampaignResultTransition(
    current, "SFC-001", result, "result:1", RECORDED_AT
  );
  const slice = transition.campaign.slices["SFC-001"];
  assert.equal(slice.binding.task.task_attempt_id, "ATTEMPT-FINAL");
  assert.equal(slice.binding.result.task_attempt_id, "ATTEMPT-FINAL");
  assert.equal(slice.result_projection, "blocked");
  assert.equal(transition.event.payload.status, "blocked");
  assert.equal("campaign_complete" in transition.campaign, false);
});

function readyCampaign() {
  const campaign = campaignFixture(null);
  campaign.slices["SFC-001"].handoff_status = "none";
  return campaign;
}
