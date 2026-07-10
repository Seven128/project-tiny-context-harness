import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCompositeScopeFitTransition,
  createCompositeCampaignInitialTransition,
  createCompositePacketRevisionTransition,
  normalizeCompositeScopeFitForFingerprint
} from "../../packages/ty-context/dist/lib/composite-campaign-store-transitions.js";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { sanitizeCompositeCampaignRequest } from "../../packages/ty-context/dist/lib/composite-campaign-security.js";
import {
  bindingFixture,
  campaignFixture,
  packetFixture,
  resultFixture,
  scopeFitFixture,
  scopeSlice
} from "./composite-campaign-schema-fixtures.mjs";

const CREATED = "2026-07-10T01:02:03.000Z";
const LATER = "2026-07-10T01:03:03.000Z";

test("initial transition binds exact sanitized request bytes to generation/event one", () => {
  const sanitized = sanitizeCompositeCampaignRequest("Build the campaign.\r\nAuthorization: Bearer secret-value\r\n");
  const transition = createCompositeCampaignInitialTransition({
    campaign_id: "campaign-1",
    sanitized_request: sanitized,
    operation_id: "create:1",
    created_at: CREATED
  });
  assert.equal(transition.request_content, "Build the campaign.\nAuthorization: Bearer [REDACTED]\n");
  assert.equal(transition.campaign.generation, 1);
  assert.deepEqual(transition.campaign.request, {
    sha256: sha256Hex(transition.request_content),
    bytes: Buffer.byteLength(transition.request_content)
  });
  assert.equal(transition.campaign.scope_fit, null);
  assert.deepEqual(transition.campaign.slices, {});
  assert.equal(transition.event.sequence, 1);
  assert.equal(transition.event.kind, "campaign_created");
  assert.deepEqual(transition.event.payload, {
    request_sha256: transition.campaign.request.sha256,
    redaction_count: 1
  });
  assert.equal(transition.campaign.event_cursor.last_event_sha256, transition.event_line_sha256);
  assert.equal(transition.payload_sha256, sha256Hex(canonicalJson({
    request_sha256: transition.campaign.request.sha256,
    request_bytes: transition.campaign.request.bytes,
    redaction_count: 1
  })));
  assert.throws(() => createCompositeCampaignInitialTransition({
    campaign_id: "campaign-2", sanitized_request: { content: "  \n", redaction_count: 0 },
    operation_id: "create:2", created_at: CREATED
  }), /blank|request/i);
});

test("Scope Fit normalization is context free but exact and canonical for fingerprinting", () => {
  const continuation = scopeFitFixture();
  continuation.request_sha256 = "a".repeat(64);
  continuation.selected_slice_id = "SFC-002";
  const normalized = normalizeCompositeScopeFitForFingerprint(continuation);
  assert.equal(normalized.selected_slice_id, "SFC-002");
  assert.equal(sha256Hex(canonicalJson(normalized)), sha256Hex(canonicalJson(normalizeCompositeScopeFitForFingerprint(structuredClone(continuation)))));
  assert.throws(() => normalizeCompositeScopeFitForFingerprint({ ...continuation, acceptedSliceIds: ["SFC-001"] }), /unknown key/i);
});

test("Scope Fit transition preserves stable identities and may add only higher SFC IDs", () => {
  const initial = initialCampaign();
  const first = scopeFitFor(initial, scopeFitFixture());
  const applied = applyCompositeScopeFitTransition(initial.campaign, first, "scope:1", LATER);
  assert.equal(applied.campaign.generation, 2);
  assert.equal(applied.campaign.slices["SFC-001"].selection_status, "selected");
  assert.equal(applied.campaign.slices["SFC-002"].selection_status, "candidate");
  assert.equal(applied.event.kind, "scope_fit_applied");
  assert.equal(applied.event.previous_event_sha256, initial.campaign.event_cursor.last_event_sha256);

  const added = structuredClone(first);
  added.slices.push(scopeSlice("SFC-003", "verification", ["SFC-001"], 3, "Verify"));
  const extended = applyCompositeScopeFitTransition(applied.campaign, added, "scope:2", LATER);
  assert.equal(extended.campaign.slices["SFC-003"].selection_status, "candidate");

  for (const mutate of [
    (scope) => scope.slices.pop(),
    (scope) => { scope.slices[0].stable_key = "changed"; },
    (scope) => { scope.slices[0].slice_id = "SFC-003"; },
    (scope) => scope.slices.push(scopeSlice("SFC-000", "new-low", [], 1, "Bad"))
  ]) {
    const invalid = structuredClone(first);
    mutate(invalid);
    assert.throws(() => applyCompositeScopeFitTransition(applied.campaign, invalid, "scope:invalid", LATER), /retain|stable|mapping|higher|SFC|remove|identity|multiple|split_required/i);
  }
});

test("accepted terminal selection unlocks a dependency and preserves terminal history as superseded", () => {
  const binding = bindingFixture({ goal: { goal_id: "goal-1", started_at: CREATED }, result: resultFixture() });
  const current = campaignFixture(binding);
  current.slices["SFC-001"].handoff_status = "started";
  current.slices["SFC-001"].result_projection = "accept";
  const next = scopeFitFixture();
  next.selected_slice_id = "SFC-002";
  next.slices.push(scopeSlice("SFC-003", "later", ["SFC-002"], 3, "Later"));
  const transition = applyCompositeScopeFitTransition(current, next, "scope:next", LATER);
  assert.equal(transition.campaign.slices["SFC-001"].selection_status, "superseded");
  assert.equal(transition.campaign.slices["SFC-001"].result_projection, "accept");
  assert.equal(transition.campaign.slices["SFC-001"].binding.result.status, "accept");
  assert.equal(transition.campaign.slices["SFC-002"].selection_status, "selected");
  assert.equal(transition.campaign.slices["SFC-003"].selection_status, "candidate");
});

test("blocked or rejected terminal slices leave the frontier but cannot satisfy dependencies", () => {
  for (const status of ["blocked", "reject"]) {
    const result = { ...resultFixture(), status };
    const binding = bindingFixture({ goal: { goal_id: "goal-1", started_at: CREATED }, result });
    const current = campaignFixture(binding);
    current.slices["SFC-001"].handoff_status = "started";
    current.slices["SFC-001"].result_projection = status;
    const dependent = scopeFitFixture();
    dependent.selected_slice_id = "SFC-002";
    assert.throws(() => applyCompositeScopeFitTransition(current, dependent, `scope:${status}:bad`, LATER), /dependency|frontier|accepted/i);

    const independent = scopeFitFixture();
    independent.slices.push(scopeSlice("SFC-003", `independent-${status}`, [], 2, "Independent"));
    independent.selected_slice_id = "SFC-003";
    const transitioned = applyCompositeScopeFitTransition(current, independent, `scope:${status}:ok`, LATER);
    assert.equal(transitioned.campaign.slices["SFC-001"].selection_status, "superseded");
    assert.equal(transitioned.campaign.slices["SFC-003"].selection_status, "selected");
  }
});

test("a nonterminal authored selection cannot be silently deselected", () => {
  const initial = initialCampaign();
  const scoped = applyCompositeScopeFitTransition(initial.campaign, scopeFitFor(initial, scopeFitFixture()), "scope:1", LATER);
  const packet = packetFor(scoped.campaign, 1, null, LATER);
  const authored = createCompositePacketRevisionTransition(scoped.campaign, packet, "packet:1", LATER);
  const changed = structuredClone(scoped.campaign.scope_fit);
  changed.slices.push(scopeSlice("SFC-003", "independent", [], 1, "Independent"));
  changed.selected_slice_id = "SFC-003";
  assert.throws(() => applyCompositeScopeFitTransition(authored.campaign, changed, "scope:deselect", LATER), /deselect|nonterminal|selected|author/i);
});

test("packet transition enforces identity, exact revision chain, safety, and immutable history", () => {
  const initial = initialCampaign();
  const scoped = applyCompositeScopeFitTransition(initial.campaign, scopeFitFor(initial, scopeFitFixture()), "scope:1", LATER);
  const packet1 = packetFor(scoped.campaign, 1, null, LATER);
  const first = createCompositePacketRevisionTransition(scoped.campaign, packet1, "packet:1", LATER);
  assert.equal(first.campaign.generation, 3);
  assert.equal(first.campaign.slices["SFC-001"].current_revision, 1);
  assert.equal(first.campaign.slices["SFC-001"].authoring_status, "draft");
  assert.equal(first.campaign.slices["SFC-001"].revisions[0].packet_sha256, first.packet_sha256);
  assert.equal(first.event.kind, "packet_revision_created");

  const packet2 = packetFor(first.campaign, 2, first.packet_sha256, "2026-07-10T01:04:03.000Z");
  packet2.context_delta_candidate.notes.push("A real semantic revision.");
  const second = createCompositePacketRevisionTransition(first.campaign, packet2, "packet:2", "2026-07-10T01:04:04.000Z");
  assert.equal(second.campaign.slices["SFC-001"].revisions.length, 2);
  assert.deepEqual(second.campaign.slices["SFC-001"].revisions[0], first.campaign.slices["SFC-001"].revisions[0]);
  assert.equal(second.campaign.slices["SFC-001"].revisions[1].previous_packet_sha256, first.packet_sha256);

  for (const [mutate, pattern] of [
    [(packet) => { packet.revision = 4; }, /revision|next/i],
    [(packet) => { packet.previous_packet_sha256 = "f".repeat(64); }, /previous|chain/i],
    [(packet) => { packet.campaign_id = "other"; }, /campaign/i],
    [(packet) => { packet.slice_id = "SFC-002"; }, /selected|slice/i],
    [(packet) => { packet.request_sha256 = "e".repeat(64); }, /request/i],
    [(packet) => { packet.authorities.product_architecture_source.fields.primary_capability_path = `sk-${"x".repeat(48)}`; }, /secret|credential/i]
  ]) {
    const invalid = structuredClone(packet2);
    mutate(invalid);
    assert.throws(() => createCompositePacketRevisionTransition(first.campaign, invalid, "packet:invalid", LATER), pattern);
  }
});

function initialCampaign() {
  return createCompositeCampaignInitialTransition({
    campaign_id: "campaign-1",
    sanitized_request: { content: "Build a deterministic campaign.\n", redaction_count: 0 },
    operation_id: "create:1",
    created_at: CREATED
  });
}

function scopeFitFor(initial, scope) {
  const value = structuredClone(scope);
  value.request_sha256 = initial.campaign.request.sha256;
  return value;
}

function packetFor(campaign, revision, previous, createdAt) {
  const packet = packetFixture();
  packet.campaign_id = campaign.campaign_id;
  packet.slice_id = "SFC-001";
  packet.revision = revision;
  packet.created_at = createdAt;
  packet.request_sha256 = campaign.request.sha256;
  packet.previous_packet_sha256 = previous;
  return packet;
}
