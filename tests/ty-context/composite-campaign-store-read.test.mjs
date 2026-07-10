import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadVerifiedCompositeCampaignSnapshot
} from "../../packages/ty-context/dist/lib/composite-campaign-store-read.js";
import {
  applyCompositeScopeFitTransition,
  createCompositeCampaignInitialTransition,
  createCompositePacketRevisionTransition
} from "../../packages/ty-context/dist/lib/composite-campaign-store-transitions.js";
import {
  compositeCampaignEventId,
  compositeCampaignTransactionId,
  encodeCompositeCampaignEventLine
} from "../../packages/ty-context/dist/lib/composite-campaign-events.js";
import { canonicalJson, canonicalYaml, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { validateCompositeCampaignV1 } from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import {
  COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION
} from "../../packages/ty-context/dist/lib/composite-campaign-types.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const CREATED = "2026-07-10T01:02:03.000Z";
const LATER = "2026-07-10T01:03:03.000Z";

test("read-only load returns the canonical raw manifest etag and ignores uncommitted suffix/internal files", async () => {
  const fixture = await persistedPacketCampaign();
  try {
    await writeFile(path.join(fixture.campaignRoot, ".composite-transaction.json"), "ignored marker\n", "utf8");
    await writeFile(fixture.eventsPath, fixture.eventsRaw + "uncommitted suffix without authority\n", "utf8");
    const before = await treeSnapshot(fixture.campaignRoot);
    const loaded = await loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1");
    const after = await treeSnapshot(fixture.campaignRoot);
    assert.deepEqual(after, before);
    assert.deepEqual(loaded.campaign, fixture.campaign);
    assert.equal(loaded.raw_manifest, fixture.manifestRaw);
    assert.equal(loaded.manifest_etag_sha256, sha256Hex(fixture.manifestRaw));
    assert.equal(loaded.generation, 3);
    assert.equal(loaded.committed_event_bytes, Buffer.byteLength(fixture.eventsRaw));
    assert.equal(loaded.events.length, 3);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load rejects same-length malformed UTF-8 before deriving manifest etag authority", async () => {
  const fixture = await persistedScopedCampaign({
    mutateScope: (scope) => { scope.rationale[0] = "Preserve the valid replacement marker � exactly."; }
  });
  try {
    const valid = await readFile(fixture.manifestPath);
    const malformed = replaceFirstUtf8ReplacementWithMalformed(valid);
    assert.equal(malformed.byteLength, valid.byteLength);
    await writeFile(fixture.manifestPath, malformed);
    await assert.rejects(
      loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"),
      /manifest.*valid UTF-8|valid UTF-8.*manifest/i
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load rejects same-length malformed UTF-8 before trusting immutable request hashes", async () => {
  const fixture = await persistedScopedCampaign({ requestContent: "Build the � tracked request.\n" });
  try {
    const valid = await readFile(fixture.requestPath);
    const malformed = replaceFirstUtf8ReplacementWithMalformed(valid);
    assert.equal(malformed.byteLength, valid.byteLength);
    await writeFile(fixture.requestPath, malformed);
    await assert.rejects(
      loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"),
      /immutable request.*valid UTF-8|valid UTF-8.*immutable request/i
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load rejects semantically equivalent noncanonical YAML and compact-event drift even with recomputed cursor", async () => {
  const fixture = await persistedPacketCampaign();
  try {
    const noncanonical = `# attacker formatting\n${fixture.manifestRaw}`;
    await writeFile(fixture.manifestPath, noncanonical, "utf8");
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"), /canonical|campaign.yaml|manifest/i);

    await writeFile(fixture.manifestPath, fixture.manifestRaw, "utf8");
    const lines = fixture.eventsRaw.trimEnd().split("\n").map((line) => JSON.parse(line));
    const forgedLines = [];
    let previous = null;
    for (const event of lines) {
      event.previous_event_sha256 = previous;
      const line = ` ${JSON.stringify(event)}\n`;
      previous = sha256Hex(line);
      forgedLines.push(line);
    }
    const forgedCampaign = structuredClone(fixture.campaign);
    forgedCampaign.event_cursor.last_event_sha256 = previous;
    await writeFile(fixture.eventsPath, forgedLines.join(""), "utf8");
    await writeFile(fixture.manifestPath, canonicalYaml(validateCompositeCampaignV1(forgedCampaign)), "utf8");
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"), /compact|canonical|event line/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load verifies immutable request, packet, cursor, regular files, and exact packet identity without repair", async () => {
  for (const [mutate, pattern] of [
    [async (fixture) => writeFile(fixture.requestPath, "mutated request\n", "utf8"), /request.*hash|request.*bytes|immutable/i],
    [async (fixture) => writeFile(fixture.packetPath, `${fixture.packetRaw} `, "utf8"), /packet.*canonical|packet.*hash|immutable/i],
    [async (fixture) => writeFile(fixture.eventsPath, fixture.eventsRaw.slice(0, -1), "utf8"), /partial|LF|event/i],
    [async (fixture) => { await rm(fixture.packetPath); await mkdir(fixture.packetPath); }, /packet.*regular|packet.*file|nonregular/i]
  ]) {
    const fixture = await persistedPacketCampaign();
    try {
      await mutate(fixture);
      const before = await treeSnapshot(fixture.campaignRoot);
      await assert.rejects(loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"), pattern);
      assert.deepEqual(await treeSnapshot(fixture.campaignRoot), before);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("load accepts complete forward V1 state and preserves canonical POSIX binding workdir identity", async () => {
  const fixture = await persistedForwardCampaign();
  try {
    const loaded = await loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1");
    assert.equal(loaded.campaign.slices["SFC-001"].binding.workdir,
      "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1/");
    assert.equal(loaded.events.length, 7);

    const invalid = structuredClone(fixture.campaign);
    invalid.slices["SFC-001"].binding.workdir = "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1";
    const raw = canonicalYaml(invalid);
    await writeFile(fixture.manifestPath, raw, "utf8");
    const before = await treeSnapshot(fixture.campaignRoot);
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"), /workdir|canonical|trailing/i);
    assert.deepEqual(await treeSnapshot(fixture.campaignRoot), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load rejects a hash-consistent but semantically blank immutable request", async () => {
  const root = await projectRoot();
  try {
    const campaignRoot = path.join(root, ".harness", "composite-long-task", "campaigns", "campaign-1");
    await mkdir(campaignRoot, { recursive: true });
    const request = " \n";
    const requestHash = sha256Hex(request);
    const payloadHash = sha256Hex(canonicalJson({ request_sha256: requestHash, request_bytes: 2, redaction_count: 0 }));
    const transaction = compositeCampaignTransactionId("campaign-1", "campaign_created", "create:blank", payloadHash);
    const event = {
      schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
      event_id: compositeCampaignEventId(transaction, 1), transaction_id: transaction, operation_id: "create:blank",
      sequence: 1, campaign_id: "campaign-1", slice_id: null, revision: null, manifest_generation: 1,
      previous_event_sha256: null, kind: "campaign_created",
      payload: { request_sha256: requestHash, redaction_count: 0 }
    };
    const encoded = encodeCompositeCampaignEventLine(event);
    const campaign = validateCompositeCampaignV1({
      schema_version: "composite-campaign-v1", campaign_id: "campaign-1", generation: 1,
      created_at: CREATED, updated_at: CREATED, request: { sha256: requestHash, bytes: 2 },
      scope_fit: null, scope_fit_sha256: null,
      event_cursor: { sequence: 1, last_event_sha256: encoded.sha256 }, slices: {}
    });
    await Promise.all([
      writeFile(path.join(campaignRoot, "request.md"), request, "utf8"),
      writeFile(path.join(campaignRoot, "events.ndjson"), encoded.line, "utf8"),
      writeFile(path.join(campaignRoot, "campaign.yaml"), canonicalYaml(campaign), "utf8")
    ]);
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(root, "campaign-1"), /blank|request/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("load rejects a canonical hash-consistent Scope Fit containing a nested secret without repair", async () => {
  const secret = "seeded-scope-secret-value";
  const fixture = await persistedScopedCampaign({
    mutateScope: (scope) => { scope.slices[0].scope_summary.push(`Authorization: Bearer ${secret}`); }
  });
  try {
    const before = await treeSnapshot(fixture.campaignRoot);
    await assert.rejects(
      loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"),
      (error) => {
        assert.match(error.message, /Scope Fit.*secret|Scope Fit.*credential/i);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      }
    );
    assert.deepEqual(await treeSnapshot(fixture.campaignRoot), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("load rejects an attacker-recomputed creation transaction identity", async () => {
  const root = await projectRoot();
  try {
    const campaignRoot = path.join(root, ".harness", "composite-long-task", "campaigns", "campaign-1");
    await mkdir(campaignRoot, { recursive: true });
    const initial = createCompositeCampaignInitialTransition({
      campaign_id: "campaign-1", sanitized_request: { content: "Valid request.\n", redaction_count: 0 },
      operation_id: "create:1", created_at: CREATED
    });
    const event = structuredClone(initial.event);
    event.transaction_id = "d".repeat(64);
    event.event_id = compositeCampaignEventId(event.transaction_id, 1);
    const encoded = encodeCompositeCampaignEventLine(event);
    const campaign = validateCompositeCampaignV1({
      ...initial.campaign,
      event_cursor: { sequence: 1, last_event_sha256: encoded.sha256 }
    });
    await Promise.all([
      writeFile(path.join(campaignRoot, "request.md"), initial.request_content, "utf8"),
      writeFile(path.join(campaignRoot, "events.ndjson"), encoded.line, "utf8"),
      writeFile(path.join(campaignRoot, "campaign.yaml"), canonicalYaml(campaign), "utf8")
    ]);
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(root, "campaign-1"), /creation.*transaction|transaction.*request|fingerprint/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("load rejects a canonical extra lifecycle event that projects no manifest state", async () => {
  const fixture = await persistedPacketCampaign();
  try {
    const sequence = 4;
    const payload = { packet_sha256: "e".repeat(64), previous_packet_sha256: null };
    const transaction = compositeCampaignTransactionId("campaign-1", "packet_revision_created", "packet:forged", payload.packet_sha256);
    const event = {
      schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
      event_id: compositeCampaignEventId(transaction, sequence), transaction_id: transaction,
      operation_id: "packet:forged", sequence, campaign_id: "campaign-1", slice_id: "SFC-999", revision: 1,
      manifest_generation: sequence, previous_event_sha256: fixture.authored.event_line_sha256,
      kind: "packet_revision_created", payload
    };
    const encoded = encodeCompositeCampaignEventLine(event);
    const campaign = validateCompositeCampaignV1({
      ...fixture.campaign, generation: sequence,
      event_cursor: { sequence, last_event_sha256: encoded.sha256 }
    });
    await writeFile(fixture.eventsPath, fixture.eventsRaw + encoded.line, "utf8");
    await writeFile(fixture.manifestPath, canonicalYaml(campaign), "utf8");
    await assert.rejects(loadVerifiedCompositeCampaignSnapshot(fixture.root, "campaign-1"), /event.*manifest|unreferenced|packet.*authority|projects no/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function persistedPacketCampaign() {
  const root = await projectRoot();
  const campaignRoot = path.join(root, ".harness", "composite-long-task", "campaigns", "campaign-1");
  const initial = createCompositeCampaignInitialTransition({
    campaign_id: "campaign-1", sanitized_request: { content: "Build tracked authoring.\n", redaction_count: 0 },
    operation_id: "create:1", created_at: CREATED
  });
  const scope = scopeFitFixture();
  scope.request_sha256 = initial.campaign.request.sha256;
  const scoped = applyCompositeScopeFitTransition(initial.campaign, scope, "scope:1", LATER);
  const packet = packetFixture();
  packet.request_sha256 = initial.campaign.request.sha256;
  packet.created_at = LATER;
  const authored = createCompositePacketRevisionTransition(scoped.campaign, packet, "packet:1", LATER);
  const revisionRoot = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001");
  await mkdir(revisionRoot, { recursive: true });
  const manifestRaw = canonicalYaml(authored.campaign);
  const eventsRaw = initial.event_line + scoped.event_line + authored.event_line;
  const manifestPath = path.join(campaignRoot, "campaign.yaml");
  const requestPath = path.join(campaignRoot, "request.md");
  const eventsPath = path.join(campaignRoot, "events.ndjson");
  const packetPath = path.join(revisionRoot, "authoring-packet.json");
  await Promise.all([
    writeFile(manifestPath, manifestRaw, "utf8"),
    writeFile(requestPath, initial.request_content, "utf8"),
    writeFile(eventsPath, eventsRaw, "utf8"),
    writeFile(packetPath, authored.packet_content, "utf8")
  ]);
  return {
    root, campaignRoot, campaign: authored.campaign, manifestRaw, eventsRaw, packetRaw: authored.packet_content,
    manifestPath, requestPath, eventsPath, packetPath, initial, scoped, authored
  };
}

async function persistedScopedCampaign({
  requestContent = "Build tracked authoring.\n",
  mutateScope = () => undefined
} = {}) {
  const root = await projectRoot();
  const campaignRoot = path.join(root, ".harness", "composite-long-task", "campaigns", "campaign-1");
  const initial = createCompositeCampaignInitialTransition({
    campaign_id: "campaign-1", sanitized_request: { content: requestContent, redaction_count: 0 },
    operation_id: "create:1", created_at: CREATED
  });
  const scope = scopeFitFixture();
  scope.request_sha256 = initial.campaign.request.sha256;
  mutateScope(scope);
  const scoped = applyCompositeScopeFitTransition(initial.campaign, scope, "scope:1", LATER);
  await mkdir(campaignRoot, { recursive: true });
  const manifestPath = path.join(campaignRoot, "campaign.yaml");
  const requestPath = path.join(campaignRoot, "request.md");
  const eventsPath = path.join(campaignRoot, "events.ndjson");
  await Promise.all([
    writeFile(manifestPath, canonicalYaml(scoped.campaign), "utf8"),
    writeFile(requestPath, initial.request_content, "utf8"),
    writeFile(eventsPath, initial.event_line + scoped.event_line, "utf8")
  ]);
  return { root, campaignRoot, manifestPath, requestPath, eventsPath, initial, scoped };
}

async function persistedForwardCampaign() {
  const fixture = await persistedPacketCampaign();
  const slice = structuredClone(fixture.campaign.slices["SFC-001"]);
  const revision = slice.revisions[0];
  const sourceFiles = {
    product_architecture_source: "# Product\n",
    technical_realization_plan: "# Plan\n",
    acceptance_checklist: "# Acceptance\n"
  };
  const sourceHashes = Object.fromEntries(Object.entries(sourceFiles).map(([key, value]) => [key, sha256Hex(value)]));
  const bundleHash = sha256Hex(canonicalJson(sourceHashes));
  revision.projections = {
    product_architecture_source_sha256: sourceHashes.product_architecture_source,
    technical_realization_plan_sha256: sourceHashes.technical_realization_plan,
    acceptance_checklist_sha256: sourceHashes.acceptance_checklist,
    bundle_sha256: bundleHash,
    rendered_at: LATER
  };
  const binding = {
    schema_version: COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
    binding_id: "binding-1", campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
    request_sha256: fixture.campaign.request.sha256, packet_sha256: revision.packet_sha256,
    input_contract_sha256: revision.input_contract_sha256, source_hashes: sourceHashes,
    workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1/",
    task: { task_id: "TASK-1", task_attempt_id: "ATTEMPT-1" }, handed_off_at: LATER,
    goal: { goal_id: "goal-1", started_at: LATER },
    result: {
      status: "accept", task_attempt_id: "ATTEMPT-1", source_hashes_sha256: bundleHash,
      final_gate_event_sha256: "f".repeat(64), recorded_at: LATER
    }
  };
  Object.assign(slice, {
    authoring_status: "ready", handoff_status: "started", result_projection: "accept", binding
  });
  const events = [fixture.initial.event, fixture.scoped.event, fixture.authored.event];
  let previous = fixture.authored.event_line_sha256;
  for (const [kind, payload] of [
    ["projection_published", { bundle_sha256: bundleHash }],
    ["handoff_published", { binding_id: "binding-1", task_id: "TASK-1", task_attempt_id: "ATTEMPT-1" }],
    ["goal_bound", { binding_id: "binding-1", goal_id: "goal-1" }],
    ["result_projected", { binding_id: "binding-1", status: "accept", final_gate_event_sha256: "f".repeat(64) }]
  ]) {
    const sequence = events.length + 1;
    const transaction = compositeCampaignTransactionId("campaign-1", kind, `forward:${sequence}`, sha256Hex(canonicalJson(payload)));
    const event = {
      schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
      event_id: compositeCampaignEventId(transaction, sequence), transaction_id: transaction,
      operation_id: `forward:${sequence}`, sequence, campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      manifest_generation: sequence, previous_event_sha256: previous, kind, payload
    };
    const encoded = encodeCompositeCampaignEventLine(event);
    events.push(encoded.event);
    previous = encoded.sha256;
  }
  const campaign = validateCompositeCampaignV1({
    ...fixture.campaign, generation: 7, updated_at: LATER,
    event_cursor: { sequence: 7, last_event_sha256: previous },
    slices: { ...fixture.campaign.slices, "SFC-001": slice }
  });
  const eventsRaw = events.map((event) => `${JSON.stringify(event)}\n`).join("");
  const revisionRoot = path.dirname(fixture.packetPath);
  await Promise.all([
    writeFile(path.join(revisionRoot, "product-architecture-source.md"), sourceFiles.product_architecture_source, "utf8"),
    writeFile(path.join(revisionRoot, "technical-realization-plan.md"), sourceFiles.technical_realization_plan, "utf8"),
    writeFile(path.join(revisionRoot, "acceptance-checklist.md"), sourceFiles.acceptance_checklist, "utf8"),
    writeFile(fixture.eventsPath, eventsRaw, "utf8"),
    writeFile(fixture.manifestPath, canonicalYaml(campaign), "utf8")
  ]);
  return { ...fixture, campaign, eventsRaw, manifestRaw: canonicalYaml(campaign) };
}

async function projectRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-read-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  await mkdir(path.join(root, ".harness", "composite-long-task", "campaigns"), { recursive: true });
  return root;
}

async function treeSnapshot(root) {
  const result = [];
  async function visit(current, relative = "") {
    const entries = await (await import("node:fs/promises")).readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      const metadata = await lstat(absolute);
      result.push([child, metadata.size, metadata.mtimeMs, entry.isDirectory() ? null : sha256Hex(await readFile(absolute))]);
      if (entry.isDirectory()) await visit(absolute, child);
    }
  }
  await visit(root);
  return result;
}

function replaceFirstUtf8ReplacementWithMalformed(value) {
  const replacement = Buffer.from("\uFFFD", "utf8");
  const offset = value.indexOf(replacement);
  assert.notEqual(offset, -1, "fixture must contain the valid EF BF BD replacement bytes");
  const malformed = Buffer.from(value);
  Buffer.from([0xf0, 0x90, 0x80]).copy(malformed, offset);
  return malformed;
}
