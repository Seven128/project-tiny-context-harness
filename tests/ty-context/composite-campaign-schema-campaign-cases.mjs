import test from "node:test";
import assert from "node:assert/strict";
import { COMPOSITE_INPUT_CONTRACT } from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { validateCompositeCampaignV1 } from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import {
  CREATED_AT,
  HASH_A,
  HASH_B,
  HASH_C,
  bindingFixture,
  campaignFixture,
  goalFixture,
  resultFixture
} from "./composite-campaign-schema-fixtures.mjs";
import { reverseObjectKeysDeep } from "./composite-campaign-schema-fixtures.mjs";

const HASH_D = "d".repeat(64);

export function registerCampaignSchemaCases() {
  test("campaign binding combinations enforce ready, started, and current-result identity", () => {
    const ready = campaignFixture(bindingFixture());
    assert.deepEqual(validateCompositeCampaignV1(ready), ready);

    const readyWithGoal = campaignFixture(bindingFixture({ goal: goalFixture() }));
    assert.throws(() => validateCompositeCampaignV1(readyWithGoal), /handoff_status.*ready|goal/i);
    const startedWithoutGoal = campaignFixture(bindingFixture());
    startedWithoutGoal.slices["SFC-001"].handoff_status = "started";
    assert.throws(() => validateCompositeCampaignV1(startedWithoutGoal), /handoff_status.*started|goal/i);

    const started = campaignFixture(bindingFixture({ goal: goalFixture() }));
    started.slices["SFC-001"].handoff_status = "started";
    assert.deepEqual(validateCompositeCampaignV1(started), started);

    const accepted = acceptedCampaign();
    assert.deepEqual(validateCompositeCampaignV1(accepted), accepted);
    const resultMismatch = structuredClone(accepted);
    resultMismatch.slices["SFC-001"].binding.result.task_attempt_id = "ATTEMPT-other";
    assert.throws(() => validateCompositeCampaignV1(resultMismatch), /result.*task_attempt_id|current.*attempt/i);
  });

  test("campaign lifecycle states match revisions, projections, bindings, goals, and results", () => {
    const initial = campaignFixture(null);
    Object.assign(initial, {
      generation: 1, updated_at: initial.created_at, scope_fit: null, scope_fit_sha256: null,
      event_cursor: { sequence: 1, last_event_sha256: HASH_A }, slices: {}
    });
    assert.deepEqual(validateCompositeCampaignV1(initial), initial);

    const scopedDraft = campaignFixture(null);
    scopedDraft.generation = 2;
    scopedDraft.event_cursor.sequence = 2;
    Object.assign(scopedDraft.slices["SFC-001"], {
      authoring_status: "draft", handoff_status: "none", current_revision: null, revisions: [], binding: null
    });
    assert.deepEqual(validateCompositeCampaignV1(scopedDraft), scopedDraft);

    const packetDraft = structuredClone(scopedDraft);
    packetDraft.generation = 3;
    packetDraft.event_cursor.sequence = 3;
    packetDraft.slices["SFC-001"].current_revision = 1;
    packetDraft.slices["SFC-001"].revisions = [{
      revision: 1, created_at: CREATED_AT, packet_sha256: HASH_B, previous_packet_sha256: null,
      input_contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256, projections: null
    }];
    assert.deepEqual(validateCompositeCampaignV1(packetDraft), packetDraft);

    const projected = campaignFixture(null);
    projected.generation = 4;
    projected.event_cursor.sequence = 4;
    projected.slices["SFC-001"].handoff_status = "none";
    projected.slices["SFC-001"].binding = null;
    assert.deepEqual(validateCompositeCampaignV1(projected), projected);
    assert.deepEqual(validateCompositeCampaignV1(campaignFixture(bindingFixture())), campaignFixture(bindingFixture()));

    const started = campaignFixture(bindingFixture({ goal: goalFixture() }));
    started.slices["SFC-001"].handoff_status = "started";
    assert.deepEqual(validateCompositeCampaignV1(started), started);
    assert.deepEqual(validateCompositeCampaignV1(acceptedCampaign()), acceptedCampaign());

    const resultBeforeStart = campaignFixture(bindingFixture({ result: resultFixture() }));
    resultBeforeStart.slices["SFC-001"].result_projection = "accept";
    assert.throws(() => validateCompositeCampaignV1(resultBeforeStart), /result.*started|goal|handoff_status/i);
    const readyWithoutProjection = campaignFixture(bindingFixture());
    readyWithoutProjection.slices["SFC-001"].revisions[0].projections = null;
    assert.throws(() => validateCompositeCampaignV1(readyWithoutProjection), /authoring_status.*ready|projection|handoff/i);
  });

  test("accepted dependencies unlock the next stable SFC only after a refreshed Scope Fit", () => {
    const accepted = acceptedCampaign();
    assert.deepEqual(validateCompositeCampaignV1(accepted), accepted);

    const refreshed = refreshSelection(accepted, "SFC-002");
    refreshed.slices["SFC-001"].selection_status = "superseded";
    refreshed.slices["SFC-002"].selection_status = "selected";
    assert.deepEqual(validateCompositeCampaignV1(refreshed), refreshed);
    assert.deepEqual(refreshed.scope_fit.slices.map(stableIdentity), accepted.scope_fit.slices.map(stableIdentity));

    for (const status of ["blocked", "reject"]) {
      const terminal = acceptedCampaign(status);
      assert.deepEqual(
        validateCompositeCampaignV1(terminal),
        terminal,
        `record-result-only ${status} must preserve the unchanged historical selection`
      );
      terminal.scope_fit.slices[1].depends_on = [];
      terminal.slices["SFC-002"].depends_on = [];
      const independentSibling = refreshSelection(terminal, "SFC-002");
      independentSibling.slices["SFC-001"].selection_status = "superseded";
      independentSibling.slices["SFC-002"].selection_status = "selected";
      assert.deepEqual(validateCompositeCampaignV1(independentSibling), independentSibling, status);
    }

    for (const status of ["blocked", "reject", "unrecorded"]) {
      const predecessor = status === "unrecorded"
        ? startedCampaignWithoutResult()
        : acceptedCampaign(status);
      const invalid = refreshSelection(predecessor, "SFC-002");
      invalid.slices["SFC-001"].selection_status = "superseded";
      invalid.slices["SFC-002"].selection_status = "selected";
      assert.throws(
        () => validateCompositeCampaignV1(invalid),
        /SFC-002.*dependency|dependency.ready|depends_on|accepted dependency|superseded.*terminal/i,
        status
      );
    }

    for (const status of ["accept", "blocked", "reject"]) {
      const historicalWithNewDecision = acceptedCampaign(status);
      historicalWithNewDecision.scope_fit.slices[0].decisions_required = [`decision-after-${status}`];
      historicalWithNewDecision.scope_fit_sha256 = sha256Hex(canonicalJson(historicalWithNewDecision.scope_fit));
      assert.throws(
        () => validateCompositeCampaignV1(historicalWithNewDecision),
        /selected.*decision|decisions_required|unresolved/i,
        status
      );
    }

    const corruptedClosure = acceptedCampaign("blocked");
    const acceptedChild = structuredClone(acceptedCampaign().slices["SFC-001"]);
    Object.assign(acceptedChild, {
      slice_id: "SFC-002", stable_key: "storage", title: "Implement storage",
      depends_on: ["SFC-001"], priority: 2, selection_status: "selected"
    });
    Object.assign(acceptedChild.binding, {
      binding_id: "binding-2", slice_id: "SFC-002",
      workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-002-r1/",
      task: { task_id: "TASK-2", task_attempt_id: "ATTEMPT-2" }
    });
    acceptedChild.revisions[0].packet_sha256 = HASH_D;
    acceptedChild.binding.packet_sha256 = HASH_D;
    acceptedChild.binding.goal.goal_id = "goal-2";
    acceptedChild.binding.result.task_attempt_id = "ATTEMPT-2";
    corruptedClosure.slices["SFC-001"].selection_status = "superseded";
    corruptedClosure.slices["SFC-002"] = acceptedChild;
    corruptedClosure.scope_fit.selected_slice_id = "SFC-002";
    corruptedClosure.scope_fit_sha256 = sha256Hex(canonicalJson(corruptedClosure.scope_fit));
    corruptedClosure.generation = 12;
    corruptedClosure.event_cursor.sequence = 12;
    assert.throws(
      () => validateCompositeCampaignV1(corruptedClosure),
      /satisfied.*dependency|dependency.*satisfied|accepted.*closure|SFC-002.*SFC-001/i
    );
  });

  for (const childStatus of ["blocked", "reject"]) {
    test(`terminal ${childStatus} child cannot depend on an unaccepted parent`, () => {
      const terminalChildClosure = terminalChildWithUnacceptedParent(childStatus);
      assert.throws(
        () => validateCompositeCampaignV1(terminalChildClosure),
        /terminal.*accepted dependency|accepted dependency.*terminal|SFC-002.*SFC-001/i
      );
    });
  }

  test("campaign state matrix rejects reverse-invalid authoring, handoff, and selection combinations", () => {
    const candidateWithHistory = campaignFixture(bindingFixture());
    const historicalRevision = structuredClone(candidateWithHistory.slices["SFC-001"].revisions[0]);
    historicalRevision.projections = null;
    Object.assign(candidateWithHistory.slices["SFC-002"], {
      current_revision: 1, revisions: [historicalRevision]
    });
    assert.throws(() => validateCompositeCampaignV1(candidateWithHistory), /SFC-002.*candidate|candidate.*history/i);

    for (const authoringStatus of ["draft", "stale"]) {
      const publishedButNotReady = campaignFixture(null);
      publishedButNotReady.slices["SFC-001"].authoring_status = authoringStatus;
      assert.throws(
        () => validateCompositeCampaignV1(publishedButNotReady),
        /authoring_status|projection.*ready|ready.*projection/i,
        authoringStatus
      );
    }

    const candidateHandoff = campaignFixture(bindingFixture());
    candidateHandoff.slices["SFC-001"].selection_status = "candidate";
    assert.throws(() => validateCompositeCampaignV1(candidateHandoff), /handoff.*selected|candidate.*handoff/i);
    const staleHandoff = campaignFixture(bindingFixture());
    staleHandoff.slices["SFC-001"].authoring_status = "stale";
    assert.throws(() => validateCompositeCampaignV1(staleHandoff), /handoff.*ready|authoring_status/i);

    const syncBeforeStart = campaignFixture(bindingFixture());
    syncBeforeStart.slices["SFC-001"].result_projection = "sync_pending";
    assert.throws(() => validateCompositeCampaignV1(syncBeforeStart), /sync_pending.*started|started.*sync_pending/i);
    const syncWithoutGoal = campaignFixture(bindingFixture());
    syncWithoutGoal.slices["SFC-001"].handoff_status = "started";
    syncWithoutGoal.slices["SFC-001"].result_projection = "sync_pending";
    assert.throws(() => validateCompositeCampaignV1(syncWithoutGoal), /sync_pending.*goal|started.*goal|requires a goal/i);

    const nonterminalSuperseded = campaignFixture(bindingFixture());
    nonterminalSuperseded.slices["SFC-001"].selection_status = "superseded";
    assert.throws(() => validateCompositeCampaignV1(nonterminalSuperseded), /superseded.*terminal|terminal.*superseded/i);
  });

  test("campaign generation is a lower bound for every materialized lifecycle event", () => {
    const acceptedTooEarly = acceptedCampaign();
    acceptedTooEarly.generation = 6;
    acceptedTooEarly.event_cursor.sequence = 6;
    assert.throws(() => validateCompositeCampaignV1(acceptedTooEarly), /generation.*lifecycle|at least.*7|event.*lower bound/i);

    const handoffTooEarly = campaignFixture(bindingFixture());
    handoffTooEarly.generation = 4;
    handoffTooEarly.event_cursor.sequence = 4;
    assert.throws(() => validateCompositeCampaignV1(handoffTooEarly), /generation.*lifecycle|at least.*5|event.*lower bound/i);

    const nullCursorHash = campaignFixture(bindingFixture());
    nullCursorHash.event_cursor.last_event_sha256 = null;
    assert.throws(() => validateCompositeCampaignV1(nullCursorHash), /last_event_sha256|SHA-256/i);

    const missingSelectionRefresh = terminalSiblingCampaign();
    missingSelectionRefresh.generation = 12;
    missingSelectionRefresh.event_cursor.sequence = 12;
    assert.throws(
      () => validateCompositeCampaignV1(missingSelectionRefresh),
      /generation.*lifecycle|scope_fit_applied|selection refresh|at least.*13/i
    );
  });

  test("campaign binding identities are injective across terminal sibling SFCs", () => {
    const valid = terminalSiblingCampaign();
    assert.deepEqual(validateCompositeCampaignV1(valid), valid);

    for (const [label, mutate] of [
      ["binding_id", (left, right) => { right.binding_id = left.binding_id; }],
      ["workdir", (left, right) => { right.workdir = left.workdir; }],
      ["task_id", (left, right) => { right.task.task_id = left.task.task_id; }],
      ["task_attempt_id", (left, right) => {
        right.task.task_attempt_id = left.task.task_attempt_id;
        right.result.task_attempt_id = left.task.task_attempt_id;
      }],
      ["goal_id", (left, right) => { right.goal.goal_id = left.goal.goal_id; }]
    ]) {
      const duplicate = terminalSiblingCampaign();
      const left = duplicate.slices["SFC-001"].binding;
      const right = duplicate.slices["SFC-002"].binding;
      mutate(left, right);
      assert.throws(
        () => validateCompositeCampaignV1(duplicate),
        new RegExp(`${label}|duplicate|unique|injective|workdir`, "i"),
        label
      );
    }
  });

  test("campaign provenance timestamps form a monotonic authoring-to-result chain", () => {
    const valid = chronologicalAcceptedCampaign();
    assert.deepEqual(validateCompositeCampaignV1(valid), valid);

    for (const [label, mutate] of [
      ["revision before campaign", (campaign) => { campaign.slices["SFC-001"].revisions[0].created_at = instant(2); }],
      ["projection before revision", (campaign) => { campaign.slices["SFC-001"].revisions[0].projections.rendered_at = instant(3); }],
      ["handoff before projection", (campaign) => { campaign.slices["SFC-001"].binding.handed_off_at = instant(4); }],
      ["goal before handoff", (campaign) => { campaign.slices["SFC-001"].binding.goal.started_at = instant(5); }],
      ["result before goal", (campaign) => { campaign.slices["SFC-001"].binding.result.recorded_at = instant(6); }],
      ["result after updated_at", (campaign) => { campaign.updated_at = instant(7); }],
      ["revision after updated_at", (campaign) => { campaign.slices["SFC-001"].revisions[0].created_at = instant(10); }],
      ["projection after updated_at", (campaign) => { campaign.slices["SFC-001"].revisions[0].projections.rendered_at = instant(10); }]
    ]) {
      const inverted = chronologicalAcceptedCampaign();
      mutate(inverted);
      assert.throws(
        () => validateCompositeCampaignV1(inverted),
        /timestamp|chronolog|precedes|later|created_at|rendered_at|handed_off_at|started_at|recorded_at|updated_at/i,
        label
      );
    }
  });

  test("all revision histories are nondecreasing and bounded by campaign updated_at", () => {
    const valid = twoRevisionProjectedCampaign();
    assert.deepEqual(validateCompositeCampaignV1(valid), valid);

    const backwards = twoRevisionProjectedCampaign();
    backwards.slices["SFC-001"].revisions[1].created_at = instant(3);
    assert.throws(() => validateCompositeCampaignV1(backwards), /revision.*created_at|nondecreasing|chronolog|precedes/i);

    const beforePreviousProjection = twoRevisionProjectedCampaign();
    beforePreviousProjection.slices["SFC-001"].revisions[1].created_at = instant(4);
    assert.throws(
      () => validateCompositeCampaignV1(beforePreviousProjection),
      /revision.*created_at|previous projection.*rendered_at|provenance|chronolog|precedes/i
    );

    const lateHistoricalProjection = twoRevisionProjectedCampaign();
    lateHistoricalProjection.slices["SFC-001"].revisions[0].projections.rendered_at = instant(10);
    assert.throws(() => validateCompositeCampaignV1(lateHistoricalProjection), /projection|rendered_at|updated_at|later/i);

    const noOpRevision = twoRevisionProjectedCampaign();
    noOpRevision.slices["SFC-001"].revisions[1].packet_sha256 = HASH_B;
    assert.throws(
      () => validateCompositeCampaignV1(noOpRevision),
      /packet_sha256|previous_packet_sha256|no-op|self-link|distinct/i
    );

    const duplicateAcrossSlices = terminalSiblingCampaign();
    duplicateAcrossSlices.slices["SFC-002"].revisions[0].packet_sha256 = HASH_B;
    duplicateAcrossSlices.slices["SFC-002"].binding.packet_sha256 = HASH_B;
    assert.throws(
      () => validateCompositeCampaignV1(duplicateAcrossSlices),
      /packet_sha256|duplicate|unique|injective/i
    );
  });

  test("a terminal dependency ancestor cannot be restored as the latest historical selection", () => {
    const rollback = terminalSiblingCampaign();
    rollback.slices["SFC-001"].selection_status = "selected";
    rollback.slices["SFC-002"].selection_status = "superseded";
    rollback.scope_fit.selected_slice_id = "SFC-001";
    rollback.scope_fit_sha256 = sha256Hex(canonicalJson(rollback.scope_fit));
    assert.throws(
      () => validateCompositeCampaignV1(rollback),
      /historical selection|selected terminal|terminal descendant|SFC-001.*SFC-002/i
    );
  });

  test("a selected terminal historical slice cannot predate a newer independent terminal result", () => {
    const rollback = independentHistoricalSelection(8, 9);
    assert.throws(
      () => validateCompositeCampaignV1(rollback),
      /historical selection|selected terminal|newer terminal|recorded_at|SFC-001.*SFC-002/i
    );

    const equal = independentHistoricalSelection(8, 8);
    assert.deepEqual(validateCompositeCampaignV1(equal), equal);
  });

  test("accepted dependency results must precede downstream authoring history", () => {
    const tooEarly = dependencyChronologyCampaign(8, 7);
    assert.throws(
      () => validateCompositeCampaignV1(tooEarly),
      /SFC-002.*dependency|SFC-001.*result|recorded_at|first revision|created_at|chronolog/i
    );

    const afterDependency = dependencyChronologyCampaign(8, 9);
    assert.deepEqual(validateCompositeCampaignV1(afterDependency), afterDependency);
  });

  test("campaign and Scope Fit normalization sort canonical SFC map and graph identities", () => {
    const campaign = campaignFixture(bindingFixture());
    const reversed = reverseObjectKeysDeep(campaign);
    reversed.scope_fit.slices.reverse();
    const normalized = validateCompositeCampaignV1(reversed);
    const expected = validateCompositeCampaignV1(campaign);
    assert.deepEqual(Object.keys(normalized.slices), ["SFC-001", "SFC-002"]);
    assert.deepEqual(normalized.scope_fit.slices.map((slice) => slice.slice_id), ["SFC-001", "SFC-002"]);
    assert.equal(canonicalJson(normalized), canonicalJson(expected));
  });
}

function acceptedCampaign(status = "accept") {
  const result = resultFixture();
  result.status = status;
  const campaign = campaignFixture(bindingFixture({ goal: goalFixture(), result }));
  campaign.slices["SFC-001"].handoff_status = "started";
  campaign.slices["SFC-001"].result_projection = status;
  return campaign;
}

function terminalSiblingCampaign() {
  const campaign = acceptedCampaign();
  const child = structuredClone(campaign.slices["SFC-001"]);
  Object.assign(child, {
    slice_id: "SFC-002", stable_key: "storage", title: "Implement storage",
    depends_on: ["SFC-001"], priority: 2, selection_status: "selected"
  });
  Object.assign(child.binding, {
    binding_id: "binding-2", slice_id: "SFC-002",
    workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-002-r1/",
    task: { task_id: "TASK-2", task_attempt_id: "ATTEMPT-2" }
  });
  child.revisions[0].packet_sha256 = HASH_D;
  child.binding.packet_sha256 = HASH_D;
  child.binding.goal.goal_id = "goal-2";
  child.binding.result.task_attempt_id = "ATTEMPT-2";
  campaign.slices["SFC-001"].selection_status = "superseded";
  campaign.slices["SFC-002"] = child;
  campaign.scope_fit.selected_slice_id = "SFC-002";
  campaign.scope_fit_sha256 = sha256Hex(canonicalJson(campaign.scope_fit));
  campaign.generation = 13;
  campaign.event_cursor.sequence = 13;
  return campaign;
}

function chronologicalAcceptedCampaign() {
  const campaign = acceptedCampaign();
  campaign.created_at = instant(3);
  campaign.slices["SFC-001"].revisions[0].created_at = instant(4);
  campaign.slices["SFC-001"].revisions[0].projections.rendered_at = instant(5);
  campaign.slices["SFC-001"].binding.handed_off_at = instant(6);
  campaign.slices["SFC-001"].binding.goal.started_at = instant(7);
  campaign.slices["SFC-001"].binding.result.recorded_at = instant(8);
  campaign.updated_at = instant(9);
  return campaign;
}

function twoRevisionProjectedCampaign() {
  const campaign = campaignFixture(null);
  const slice = campaign.slices["SFC-001"];
  slice.handoff_status = "none";
  slice.binding = null;
  campaign.created_at = instant(3);
  slice.revisions[0].created_at = instant(4);
  slice.revisions[0].projections.rendered_at = instant(5);
  const second = structuredClone(slice.revisions[0]);
  Object.assign(second, {
    revision: 2,
    created_at: instant(6),
    packet_sha256: HASH_C,
    previous_packet_sha256: HASH_B
  });
  second.projections.rendered_at = instant(7);
  slice.revisions.push(second);
  slice.current_revision = 2;
  campaign.updated_at = instant(8);
  campaign.generation = 6;
  campaign.event_cursor.sequence = 6;
  return campaign;
}

function instant(second) {
  return `2026-07-10T01:02:${String(second).padStart(2, "0")}.000Z`;
}

function startedCampaignWithoutResult() {
  const campaign = campaignFixture(bindingFixture({ goal: goalFixture() }));
  campaign.slices["SFC-001"].handoff_status = "started";
  return campaign;
}

function terminalChildWithUnacceptedParent(childStatus) {
  const campaign = acceptedCampaign("blocked");
  const child = structuredClone(acceptedCampaign(childStatus).slices["SFC-001"]);
  Object.assign(child, {
    slice_id: "SFC-002", stable_key: "storage", title: "Implement storage",
    depends_on: ["SFC-001"], priority: 2, selection_status: "selected"
  });
  Object.assign(child.binding, {
    binding_id: `binding-2-${childStatus}`, slice_id: "SFC-002",
    workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-002-r1/",
    task: { task_id: `TASK-2-${childStatus}`, task_attempt_id: `ATTEMPT-2-${childStatus}` }
  });
  child.revisions[0].packet_sha256 = HASH_D;
  child.binding.packet_sha256 = HASH_D;
  child.binding.goal.goal_id = `goal-2-${childStatus}`;
  child.binding.result.task_attempt_id = `ATTEMPT-2-${childStatus}`;
  campaign.slices["SFC-001"].selection_status = "superseded";
  campaign.slices["SFC-002"] = child;
  campaign.scope_fit.selected_slice_id = "SFC-002";
  campaign.scope_fit_sha256 = sha256Hex(canonicalJson(campaign.scope_fit));
  campaign.generation = 12;
  campaign.event_cursor.sequence = 12;
  return campaign;
}

function refreshSelection(campaign, selectedSliceId) {
  const refreshed = structuredClone(campaign);
  refreshed.generation += 1;
  refreshed.event_cursor.sequence += 1;
  refreshed.scope_fit.selected_slice_id = selectedSliceId;
  refreshed.scope_fit_sha256 = sha256Hex(canonicalJson(refreshed.scope_fit));
  return refreshed;
}

function independentHistoricalSelection(selectedResultSecond, otherResultSecond) {
  const campaign = terminalSiblingCampaign();
  campaign.scope_fit.slices[1].depends_on = [];
  campaign.slices["SFC-002"].depends_on = [];
  campaign.slices["SFC-001"].selection_status = "selected";
  campaign.slices["SFC-002"].selection_status = "superseded";
  campaign.scope_fit.selected_slice_id = "SFC-001";
  campaign.slices["SFC-001"].binding.result.recorded_at = instant(selectedResultSecond);
  campaign.slices["SFC-002"].binding.result.recorded_at = instant(otherResultSecond);
  campaign.updated_at = instant(Math.max(selectedResultSecond, otherResultSecond) + 1);
  campaign.scope_fit_sha256 = sha256Hex(canonicalJson(campaign.scope_fit));
  return campaign;
}

function dependencyChronologyCampaign(parentResultSecond, childRevisionSecond) {
  const campaign = terminalSiblingCampaign();
  campaign.created_at = instant(3);
  const parent = campaign.slices["SFC-001"];
  parent.revisions[0].created_at = instant(4);
  parent.revisions[0].projections.rendered_at = instant(5);
  parent.binding.handed_off_at = instant(6);
  parent.binding.goal.started_at = instant(7);
  parent.binding.result.recorded_at = instant(parentResultSecond);

  const child = campaign.slices["SFC-002"];
  child.revisions[0].created_at = instant(childRevisionSecond);
  child.revisions[0].projections.rendered_at = instant(childRevisionSecond + 1);
  child.binding.handed_off_at = instant(childRevisionSecond + 2);
  child.binding.goal.started_at = instant(childRevisionSecond + 3);
  child.binding.result.recorded_at = instant(childRevisionSecond + 4);
  campaign.updated_at = instant(Math.max(parentResultSecond, childRevisionSecond + 4) + 1);
  return campaign;
}

function stableIdentity(slice) {
  return {
    slice_id: slice.slice_id,
    stable_key: slice.stable_key,
    title: slice.title,
    depends_on: slice.depends_on,
    priority: slice.priority
  };
}
