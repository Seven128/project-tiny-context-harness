import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { renderCompositeCampaignPacket } from "../../packages/ty-context/dist/lib/composite-campaign-renderer.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const storeModulePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const projectionStoreModulePath = "../../packages/ty-context/dist/lib/composite-campaign-projection-store.js";

test("projection CAS publishes exactly three preflighted immutable source files and one manifest event", async () => {
  const root = await emptyProject();
  const store = await campaignStore();
  try {
    const { authored, packet, revisionRoot, campaignRoot } = await authoredCampaign(root, store, true);
    const rendered = renderCompositeCampaignPacket(packet);
    const oldEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
    const published = await store.publishProjectionCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
    });

    assert.equal(published.generation, 4);
    assert.equal(published.campaign.slices["SFC-001"].authoring_status, "ready");
    assert.deepEqual(await relativeTree(revisionRoot), [
      "acceptance-checklist.md",
      "authoring-packet.json",
      "product-architecture-source.md",
      "technical-realization-plan.md"
    ]);
    for (const document of Object.values(rendered.documents)) {
      assert.equal(await readFile(path.join(revisionRoot, document.file), "utf8"), document.content);
    }
    assert.deepEqual(published.campaign.slices["SFC-001"].revisions[0].projections, {
      product_architecture_source_sha256: rendered.source_hashes.product_architecture_source,
      technical_realization_plan_sha256: rendered.source_hashes.technical_realization_plan,
      acceptance_checklist_sha256: rendered.source_hashes.acceptance_checklist,
      bundle_sha256: rendered.bundle_sha256,
      rendered_at: published.campaign.updated_at
    });
    const newEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
    assert.deepEqual(newEvents.subarray(0, oldEvents.length), oldEvents);
    assert.equal(newEvents.toString("utf8").trimEnd().split("\n").at(-1).includes('"kind":"projection_published"'), true);

    const beforeRetry = await snapshotTree(campaignRoot);
    const retry = await store.publishProjectionCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
    });
    assert.equal(retry.manifest_etag_sha256, published.manifest_etag_sha256);
    assert.deepEqual(await snapshotTree(campaignRoot), beforeRetry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("semantic preflight failures and pre-existing projection drift fail before any store write", async () => {
  const store = await campaignStore();
  for (const mode of ["semantic", "drift"]) {
    const root = await emptyProject();
    try {
      const { authored, revisionRoot, campaignRoot } = await authoredCampaign(root, store, mode === "drift");
      if (mode === "drift") await writeFile(path.join(revisionRoot, "product-architecture-source.md"), "manual drift\n", "utf8");
      const before = await snapshotTree(campaignRoot);
      await assert.rejects(store.publishProjectionCas(root, {
        campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
        expected_etag: authored.manifest_etag_sha256, operation_id: `projection:${mode}`
      }), mode === "semantic" ? /preflight|implementation_paths|observable/i : /drift|already exists|projection/i);
      assert.deepEqual(await snapshotTree(campaignRoot), before);
      const loaded = await store.loadCampaignSnapshot(root, "campaign-1");
      assert.equal(loaded.campaign.slices["SFC-001"].authoring_status, "draft");
      assert.equal(loaded.campaign.slices["SFC-001"].revisions[0].projections, null);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("a later projection stage conflict safely removes earlier owned stages and preserves the conflict", async () => {
  const root = await emptyProject();
  const store = await campaignStore();
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const { authored, campaignRoot } = await authoredCampaign(root, store, true);
    const token = "projection-stage-token";
    const revisions = path.join(campaignRoot, "slices", "SFC-001", "revisions");
    const conflict = path.join(revisions, `.0001.${token}.technical_realization_plan.stage`);
    await mkdir(conflict);
    await writeFile(path.join(conflict, "foreign.txt"), "foreign\n", "utf8");
    const before = await snapshotTree(campaignRoot);
    const deterministic = internal.createCompositeCampaignStore({ token: () => token });
    await assert.rejects(deterministic.publishProjectionCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      expected_etag: authored.manifest_etag_sha256, operation_id: "projection:stage-conflict"
    }), /exist|stage|conflict/i);
    assert.deepEqual(await snapshotTree(campaignRoot), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("projection publication rejects stale identity and post-publication manual drift", async () => {
  const root = await emptyProject();
  const store = await campaignStore();
  try {
    const { authored, revisionRoot, campaignRoot } = await authoredCampaign(root, store, true);
    const published = await store.publishProjectionCas(root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
    });
    const before = await snapshotTree(campaignRoot);
    for (const input of [
      { campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1, expected_etag: authored.manifest_etag_sha256, operation_id: "projection:2" },
      { campaign_id: "campaign-1", slice_id: "SFC-002", revision: 1, expected_etag: published.manifest_etag_sha256, operation_id: "projection:other" },
      { campaign_id: "campaign-1", slice_id: "SFC-001", revision: 2, expected_etag: published.manifest_etag_sha256, operation_id: "projection:revision" }
    ]) {
      await assert.rejects(store.publishProjectionCas(root, input), /already|selected|revision|stale|projection/i);
      assert.deepEqual(await snapshotTree(campaignRoot), before);
    }

    await writeFile(path.join(revisionRoot, "acceptance-checklist.md"), "manual drift\n", "utf8");
    await assert.rejects(store.loadCampaignSnapshot(root, "campaign-1"), /acceptance_checklist|hash|manifest/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const checkpoint of [
  "after_marker_fsync", "after_content_install", "after_event_fsync",
  "after_manifest_replace", "after_directory_sync"
]) {
  test(`fresh store retry completes an all-three projection transaction interrupted at ${checkpoint}`, async () => {
    const root = await emptyProject();
    const store = await campaignStore();
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    try {
      const { authored, revisionRoot, campaignRoot } = await authoredCampaign(root, store, true);
      const operation = {
        campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
        expected_etag: authored.manifest_etag_sha256, operation_id: `projection:crash:${checkpoint}`
      };
      const crashing = internal.createCompositeCampaignStore({
        checkpoint: async (name) => { if (name === checkpoint) throw new Error(`simulated projection crash at ${checkpoint}`); }
      });
      await assert.rejects(crashing.publishProjectionCas(root, operation), /simulated projection crash/);

      const recovered = await store.publishProjectionCas(root, operation);
      assert.equal(recovered.campaign.slices["SFC-001"].authoring_status, "ready");
      assert.equal((await readdir(revisionRoot)).filter((file) => file.endsWith(".md")).length, 3);
      assert.equal((await readFile(path.join(campaignRoot, "events.ndjson"), "utf8")).trimEnd().split("\n").length, 4);
      assert.equal((await readdir(campaignRoot)).some((entry) => entry.includes("transaction")), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("a repeated recovery failure after projection install keeps the marker for a later convergent retry", async () => {
  const root = await emptyProject();
  const store = await campaignStore();
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const { authored, revisionRoot, campaignRoot } = await authoredCampaign(root, store, true);
    const operation = {
      campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
      expected_etag: authored.manifest_etag_sha256, operation_id: "projection:repeat-recovery"
    };
    const repeatedFailure = internal.createCompositeCampaignStore({
      checkpoint: async (name) => { if (name === "after_content_install") throw new Error("repeat recovery failure"); }
    });
    await assert.rejects(repeatedFailure.publishProjectionCas(root, operation), /repeat recovery failure/);
    await assert.rejects(repeatedFailure.publishProjectionCas(root, operation), /repeat recovery failure/);
    assert.equal((await readdir(revisionRoot)).filter((file) => file.endsWith(".md")).length, 3);
    assert.equal((await readdir(campaignRoot)).includes(".composite-transaction.json"), true);

    const recovered = await store.publishProjectionCas(root, operation);
    assert.equal(recovered.campaign.slices["SFC-001"].authoring_status, "ready");
    assert.equal((await readdir(campaignRoot)).includes(".composite-transaction.json"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const targetKind of ["packet", "projection"]) {
  test(`JIT ${targetKind} byte replacement cannot reach the projection manifest commit point`, async () => {
    const root = await emptyProject();
    const store = await campaignStore();
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    try {
      const { authored, packet, revisionRoot, campaignRoot } = await authoredCampaign(root, store, true);
      const rendered = renderCompositeCampaignPacket(packet);
      const packetPath = path.join(revisionRoot, "authoring-packet.json");
      const projectionPath = path.join(revisionRoot, "acceptance-checklist.md");
      const target = targetKind === "packet" ? packetPath : projectionPath;
      const original = targetKind === "packet" ? await readFile(packetPath) : Buffer.from(rendered.documents.acceptance_checklist.content);
      const checkpoint = targetKind === "packet" ? "after_marker_fsync" : "after_content_install";
      const manifestBefore = await readFile(path.join(campaignRoot, "campaign.yaml"));
      const operation = {
        campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
        expected_etag: authored.manifest_etag_sha256, operation_id: `projection:jit:${targetKind}`
      };
      const hostile = internal.createCompositeCampaignStore({
        checkpoint: async (name) => {
          if (name === checkpoint) await writeFile(target, `JIT ${targetKind} replacement\n`, "utf8");
        }
      });
      await assert.rejects(hostile.publishProjectionCas(root, operation), /changed|differs|hash|packet|projection/i);
      assert.deepEqual(await readFile(path.join(campaignRoot, "campaign.yaml")), manifestBefore);
      assert.equal((await readFile(path.join(campaignRoot, "events.ndjson"), "utf8")).trimEnd().split("\n").length, 3);

      await writeFile(target, original);
      const recovered = await store.publishProjectionCas(root, operation);
      assert.equal(recovered.campaign.slices["SFC-001"].authoring_status, "ready");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

async function authoredCampaign(root, store, makeRenderable) {
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: "Render one strict packet.\n", operation_id: "create:1"
  });
  const scope = scopeFitFixture();
  scope.request_sha256 = created.campaign.request.sha256;
  const scoped = await store.applyScopeFitCas(root, {
    campaign_id: "campaign-1", scope_fit: scope,
    expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
  });
  const packet = packetFixture();
  packet.request_sha256 = scoped.campaign.request.sha256;
  packet.created_at = new Date().toISOString();
  if (makeRenderable) makePacketRenderable(packet);
  const authored = await store.createPacketRevisionCas(root, {
    campaign_id: "campaign-1", packet,
    expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
  });
  const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
  const revisionRoot = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001");
  return { authored, packet, campaignRoot, revisionRoot };
}

async function campaignStore() {
  return { ...await import(storeModulePath), ...await import(projectionStoreModulePath) };
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
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-projection-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}

async function relativeTree(root) {
  return (await readdir(root, { recursive: true, withFileTypes: true }))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .sort();
}

async function snapshotTree(root) {
  const entries = await relativeTree(root);
  return await Promise.all(entries.map(async (relative) => {
    const target = path.join(root, ...relative.split("/"));
    const metadata = await stat(target);
    return [relative, metadata.size, metadata.mtimeMs, metadata.isFile() ? sha256Hex(await readFile(target)) : null];
  }));
}
