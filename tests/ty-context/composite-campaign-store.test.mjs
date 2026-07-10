import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const storeModulePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const writerChild = fileURLToPath(new URL("./helpers/composite-campaign-writer-child.mjs", import.meta.url));

test("the store facade exposes exactly five functions and none leak through the package index", async () => {
  const store = await import(storeModulePath);
  assert.deepEqual(Object.keys(store).sort(), [
    "applyScopeFitCas", "campaignsRoot", "createCampaign", "createPacketRevisionCas", "loadCampaignSnapshot"
  ]);
  const rootApi = await import("../../packages/ty-context/dist/index.js");
  for (const name of Object.keys(store)) assert.equal(name in rootApi, false, name);
  for (const forbidden of [
    "createCompositeCampaignStore", "appendCompositeCampaignEvent", "mutateCampaignCas",
    "writeCompositeCampaignManifest", "CompositeCampaignLoadedSnapshotV1"
  ]) {
    assert.equal(forbidden in store, false, forbidden);
    assert.equal(forbidden in rootApi, false, forbidden);
  }
});

test("campaign creation publishes one complete canonical directory under the configured root", async () => {
  const root = await emptyProject();
  const defaultSentinel = path.join(root, ".agent", "sentinel.txt");
  await mkdir(path.dirname(defaultSentinel), { recursive: true });
  await writeFile(defaultSentinel, "untouched\n", "utf8");
  const store = await import(storeModulePath);
  try {
    const expectedRoot = path.join(root, ".harness", "composite-long-task", "campaigns");
    assert.equal(await store.campaignsRoot(root), expectedRoot);
    await assert.rejects(lstat(expectedRoot), /ENOENT/);

    const loaded = await store.createCampaign(root, {
      campaign_id: "campaign-1",
      request: "Build a deterministic tracked campaign.\r\nAuthorization: Bearer synthetic-secret\r\n",
      operation_id: "create:1"
    });
    assert.equal(loaded.campaign.campaign_id, "campaign-1");
    assert.equal(loaded.generation, 1);
    assert.equal(loaded.manifest_etag_sha256, sha256Hex(loaded.raw_manifest));
    const campaignRoot = path.join(expectedRoot, "campaign-1");
    assert.deepEqual(await relativeTree(campaignRoot), ["campaign.yaml", "events.ndjson", "request.md"]);
    assert.equal(await readFile(path.join(campaignRoot, "request.md"), "utf8"),
      "Build a deterministic tracked campaign.\nAuthorization: Bearer [REDACTED]\n");
    assert.equal(await readFile(defaultSentinel, "utf8"), "untouched\n");
    assert.deepEqual((await readdir(expectedRoot)).sort(), ["campaign-1"]);
    const reloaded = await store.loadCampaignSnapshot(root, "campaign-1");
    assert.deepEqual(reloaded, loaded);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("create retry is an exact no-op while changed operation payloads conflict", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  try {
    const options = { campaign_id: "campaign-1", request: "Stable request.\n", operation_id: "create:1" };
    const first = await store.createCampaign(root, options);
    const campaignRoot = path.dirname(first.paths?.manifest_path ?? path.join(await store.campaignsRoot(root), "campaign-1", "campaign.yaml"));
    const before = await treeSnapshot(campaignRoot);
    const retry = await store.createCampaign(root, options);
    assert.equal(retry.manifest_etag_sha256, first.manifest_etag_sha256);
    assert.deepEqual(await treeSnapshot(campaignRoot), before);
    await assert.rejects(
      store.createCampaign(root, { ...options, request: "Different request.\n" }),
      /operation.*conflict|campaign.*conflict|different/i
    );
    await assert.rejects(
      store.createCampaign(root, { ...options, operation_id: "create:2" }),
      /already exists|operation.*conflict|campaign.*conflict/i
    );
    assert.deepEqual(await treeSnapshot(campaignRoot), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid create inputs and injected pre-publish failure leave no live or staged campaign", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    for (const [id, request, pattern] of [
      ["blank", "  \r\n", /blank|request/i],
      ["oversize", `x${"界".repeat(400_000)}\n`, /1 MiB|byte limit|exceeds/i]
    ]) {
      await assert.rejects(store.createCampaign(root, {
        campaign_id: id, request, operation_id: `create:${id}`
      }), pattern);
    }
    const campaigns = await store.campaignsRoot(root);
    await assert.rejects(lstat(campaigns), /ENOENT/);

    const crashing = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name === "before_create_publish") throw new Error("injected create failure");
      }
    });
    await assert.rejects(crashing.createCampaign(root, {
      campaign_id: "campaign-1", request: "Valid but interrupted.\n", operation_id: "create:crash"
    }), /injected create failure/);
    assert.deepEqual(await readdir(campaigns), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("tracked request and packet store boundaries accept exactly 1 MiB of canonical UTF-8", async () => {
  const store = await import(storeModulePath);
  const requestRoot = await emptyProject();
  try {
    const exactRequest = "r".repeat(1024 * 1024 - 1);
    const created = await store.createCampaign(requestRoot, {
      campaign_id: "campaign-1", request: exactRequest, operation_id: "create:limit"
    });
    assert.equal(created.campaign.request.bytes, 1024 * 1024);
    assert.equal((await stat(path.join(await store.campaignsRoot(requestRoot), "campaign-1", "request.md"))).size, 1024 * 1024);
  } finally {
    await rm(requestRoot, { recursive: true, force: true });
  }

  const packetRoot = await emptyProject();
  try {
    const { scoped } = await createdAndScoped(packetRoot, store);
    const packet = packetFor(scoped, 1, null);
    packet.context_delta_candidate.notes = ["x"];
    const baseBytes = Buffer.byteLength(canonicalJson(packet));
    packet.context_delta_candidate.notes[0] += "x".repeat(1024 * 1024 - baseBytes);
    assert.equal(Buffer.byteLength(canonicalJson(packet)), 1024 * 1024);
    const authored = await store.createPacketRevisionCas(packetRoot, {
      campaign_id: "campaign-1", packet,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:limit"
    });
    assert.equal(authored.campaign.slices["SFC-001"].current_revision, 1);
    const packetPath = path.join(await store.campaignsRoot(packetRoot), "campaign-1", "slices", "SFC-001", "revisions", "0001", "authoring-packet.json");
    assert.equal((await stat(packetPath)).size, 1024 * 1024);
  } finally {
    await rm(packetRoot, { recursive: true, force: true });
  }
});

test("unsafe configured harness components fail before mkdir or tracked writes", async () => {
  const store = await import(storeModulePath);
  for (const harnessFolderName of ["CON", "bad.", "name:stream", "nested/PRN.txt"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-create-unsafe-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName } }), "utf8");
      const before = await relativeTree(root);
      await assert.rejects(store.createCampaign(root, {
        campaign_id: "campaign-1", request: "Valid request.\n", operation_id: "create:1"
      }), /configured harness|reserved|unsafe|component/i);
      assert.deepEqual(await relativeTree(root), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("Scope Fit CAS commits once and orders idempotence/conflict before stale etag", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Scope the campaign.\n", operation_id: "create:1"
    });
    const scope = scopeFor(created);
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const eventsPath = path.join(campaignRoot, "events.ndjson");
    const oldEvents = await readFile(eventsPath);
    const applied = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scope,
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    });
    assert.equal(applied.generation, 2);
    assert.equal(applied.campaign.scope_fit.selected_slice_id, "SFC-001");
    assert.equal(applied.campaign.slices["SFC-001"].stable_key, "contracts");
    const newEvents = await readFile(eventsPath);
    assert.deepEqual(newEvents.subarray(0, oldEvents.length), oldEvents);
    assert.equal(newEvents.toString("utf8").trimEnd().split("\n").length, 2);

    const beforeRetry = await treeSnapshot(campaignRoot);
    const retry = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: structuredClone(scope),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    });
    assert.equal(retry.manifest_etag_sha256, applied.manifest_etag_sha256);
    assert.deepEqual(await treeSnapshot(campaignRoot), beforeRetry);

    const changed = structuredClone(scope);
    changed.rationale.push("Different canonical payload.");
    await assert.rejects(store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: changed,
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    }), /operation.*conflict|different payload/i);
    await assert.rejects(store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scope,
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:2"
    }), /stale|etag|snapshot/i);
    assert.deepEqual(await treeSnapshot(campaignRoot), beforeRetry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Scope Fit CAS rejects invalid or spoofed context without any tracked write", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Scope safely.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const before = await treeSnapshot(campaignRoot);
    for (const scope_fit of [
      { ...scopeFor(created), schema_version: "scope-fit-result-v2" },
      { ...scopeFor(created), acceptedSliceIds: ["SFC-001"] }
    ]) {
      await assert.rejects(store.applyScopeFitCas(root, {
        campaign_id: "campaign-1", scope_fit,
        expected_etag: created.manifest_etag_sha256, operation_id: "scope:invalid"
      }), /future schema|unknown key|acceptedSliceIds/i);
      assert.deepEqual(await treeSnapshot(campaignRoot), before);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Scope Fit CAS rejects recursively nested secrets before any tracked mutation", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const secret = "scope-fit-secret-value";
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Scope without persisting credentials.\n", operation_id: "create:1"
    });
    const scope = scopeFor(created);
    scope.slices[0].scope_summary.push(`Authorization: Bearer ${secret}`);
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const before = await treeSnapshot(campaignRoot);
    await assert.rejects(
      store.applyScopeFitCas(root, {
        campaign_id: "campaign-1", scope_fit: scope,
        expected_etag: created.manifest_etag_sha256, operation_id: "scope:secret"
      }),
      (error) => {
        assert.match(error.message, /Scope Fit.*secret|Scope Fit.*credential/i);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      }
    );
    assert.deepEqual(await treeSnapshot(campaignRoot), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("packet CAS publishes immutable hash-chained revision directories and exact event prefixes", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  try {
    const { created, scoped } = await createdAndScoped(root, store);
    const packet1 = packetFor(scoped, 1, null);
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const eventsPath = path.join(campaignRoot, "events.ndjson");
    const oldEvents = await readFile(eventsPath);
    const first = await store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packet1,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
    });
    const revision1 = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001");
    assert.deepEqual(await relativeTree(revision1), ["authoring-packet.json"]);
    const packet1Before = await treeSnapshot(revision1);
    const afterFirstEvents = await readFile(eventsPath);
    assert.deepEqual(afterFirstEvents.subarray(0, oldEvents.length), oldEvents);

    const packet1Hash = first.campaign.slices["SFC-001"].revisions[0].packet_sha256;
    const packet2 = packetFor(first, 2, packet1Hash);
    packet2.context_delta_candidate.notes.push("Second immutable authoring revision.");
    const second = await store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packet2,
      expected_etag: first.manifest_etag_sha256, operation_id: "packet:2"
    });
    assert.equal(second.generation, 4);
    assert.equal(second.campaign.slices["SFC-001"].revisions.length, 2);
    assert.deepEqual(await treeSnapshot(revision1), packet1Before);
    const revision2 = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0002");
    assert.deepEqual(await relativeTree(revision2), ["authoring-packet.json"]);
    const finalEvents = await readFile(eventsPath);
    assert.deepEqual(finalEvents.subarray(0, afterFirstEvents.length), afterFirstEvents);
    assert.equal(finalEvents.toString("utf8").trimEnd().split("\n").length, 4);

    const beforeRetry = await treeSnapshot(campaignRoot);
    const scopeRetry = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256,
      operation_id: "scope:1"
    });
    assert.equal(scopeRetry.manifest_etag_sha256, second.manifest_etag_sha256);
    assert.deepEqual(await treeSnapshot(campaignRoot), beforeRetry);
    const retry = await store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packet1,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
    });
    assert.equal(retry.manifest_etag_sha256, second.manifest_etag_sha256);
    assert.deepEqual(await treeSnapshot(campaignRoot), beforeRetry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("packet CAS conflict, stale, secret, size, and chain failures are zero-write", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  try {
    const { scoped } = await createdAndScoped(root, store);
    const packet = packetFor(scoped, 1, null);
    const first = await store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const before = await treeSnapshot(campaignRoot);
    const changed = structuredClone(packet);
    changed.context_delta_candidate.notes.push("different");
    await assert.rejects(store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: changed,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
    }), /operation.*conflict|different payload/i);
    await assert.rejects(store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:other"
    }), /stale|etag|snapshot/i);

    const nextHash = first.campaign.slices["SFC-001"].revisions[0].packet_sha256;
    const invalidPackets = [];
    const wrongChain = packetFor(first, 2, "f".repeat(64));
    invalidPackets.push([wrongChain, /previous|chain/i]);
    const secret = packetFor(first, 2, nextHash);
    secret.authorities.product_architecture_source.fields.primary_capability_path = `sk-${"x".repeat(48)}`;
    invalidPackets.push([secret, /secret|credential/i]);
    const oversized = packetFor(first, 2, nextHash);
    oversized.context_delta_candidate.notes = ["界".repeat(400_000)];
    invalidPackets.push([oversized, /1 MiB|byte limit|exceeds/i]);
    for (const [candidate, pattern] of invalidPackets) {
      await assert.rejects(store.createPacketRevisionCas(root, {
        campaign_id: "campaign-1", packet: candidate,
        expected_etag: first.manifest_etag_sha256, operation_id: `packet:invalid:${invalidPackets.indexOf(candidate)}`
      }), pattern);
      assert.deepEqual(await treeSnapshot(campaignRoot), before);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two barrier-coordinated child writers with one etag yield one commit and one stale result", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const children = [];
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Concurrent scope writers.\n", operation_id: "create:1"
    });
    const barrier = path.join(root, "start.barrier");
    for (const suffix of ["a", "b"]) {
      const scope = scopeFor(created);
      scope.rationale.push(`writer-${suffix}`);
      const inputPath = path.join(root, `input-${suffix}.json`);
      await writeFile(inputPath, JSON.stringify({
        campaign_id: "campaign-1", scope_fit: scope,
        expected_etag: created.manifest_etag_sha256, operation_id: `scope:${suffix}`
      }), "utf8");
      children.push(spawn(process.execPath, [writerChild, root, inputPath, barrier], {
        stdio: ["ignore", "pipe", "pipe"], windowsHide: true
      }));
    }
    await Promise.all(children.map(waitForChildReady));
    await writeFile(barrier, "start\n", "utf8");
    const results = await Promise.all(children.map(readChildResult));
    assert.deepEqual(results.map((result) => result.status).sort(), ["error", "success"]);
    assert.match(results.find((result) => result.status === "error").message, /stale|etag|snapshot/i);
    const final = await store.loadCampaignSnapshot(root, "campaign-1");
    assert.equal(final.generation, 2);
    const events = await readFile(path.join(await store.campaignsRoot(root), "campaign-1", "events.ndjson"), "utf8");
    assert.equal(events.trimEnd().split("\n").length, 2);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
    await rm(root, { recursive: true, force: true });
  }
});

for (const mutation of ["scope", "packet"]) {
  for (const checkpoint of [
    "after_marker_fsync", "after_content_install", "after_event_fsync",
    "after_manifest_replace", "after_directory_sync"
  ]) {
    test(`${mutation} transaction recovers exactly once from ${checkpoint} with read-only load unchanged`, async () => {
      const root = await emptyProject();
      const store = await import(storeModulePath);
      const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
      try {
        const created = await store.createCampaign(root, {
          campaign_id: "campaign-1", request: `Recover ${mutation}.\n`, operation_id: "create:1"
        });
        let base = created;
        if (mutation === "packet") {
          base = await store.applyScopeFitCas(root, {
            campaign_id: "campaign-1", scope_fit: scopeFor(created),
            expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
          });
        }
        const operation = mutation === "scope" ? {
          method: "applyScopeFitCas",
          input: {
            campaign_id: "campaign-1", scope_fit: scopeFor(created),
            expected_etag: base.manifest_etag_sha256, operation_id: "scope:crash"
          }
        } : {
          method: "createPacketRevisionCas",
          input: {
            campaign_id: "campaign-1", packet: packetFor(base, 1, null),
            expected_etag: base.manifest_etag_sha256, operation_id: "packet:crash"
          }
        };
        const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
        const oldEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
        const crashing = internal.createCompositeCampaignStore({
          checkpoint: async (name) => {
            if (name === checkpoint) throw new Error(`simulated crash at ${checkpoint}`);
          }
        });
        await assert.rejects(crashing[operation.method](root, operation.input), /simulated crash/);
        const crashedTree = await treeSnapshot(campaignRoot);
        const observed = await store.loadCampaignSnapshot(root, "campaign-1");
        assert.equal(observed.generation, ["after_manifest_replace", "after_directory_sync"].includes(checkpoint)
          ? base.generation + 1 : base.generation);
        assert.deepEqual(await treeSnapshot(campaignRoot), crashedTree);

        const fresh = internal.createCompositeCampaignStore();
        const recovered = await fresh[operation.method](root, operation.input);
        assert.equal(recovered.generation, base.generation + 1);
        const finalEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
        assert.deepEqual(finalEvents.subarray(0, oldEvents.length), oldEvents);
        assert.equal(finalEvents.toString("utf8").trimEnd().split("\n").length, base.generation + 1);
        assert.equal((await relativeTree(campaignRoot)).some((entry) =>
          entry.includes(".composite-transaction") || entry.includes(".tmp") || entry.includes(".stage")), false);
        if (mutation === "packet") {
          assert.deepEqual(await relativeTree(path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001")),
            ["authoring-packet.json"]);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
}

test("a one-time recovery failure before manifest commit rolls back the fresh event suffix and converges", async () => {
  const crash = await crashedMutationFixture("scope", "after_marker_fsync");
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    let failures = 0;
    const recovering = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name === "after_event_fsync" && failures === 0) {
          failures += 1;
          throw new Error("one-time recovery failure before manifest commit");
        }
      }
    });

    const recovered = await recovering[crash.operation.method](crash.root, crash.operation.input);

    assert.equal(failures, 1);
    assert.equal(recovered.generation, crash.base.generation + 1);
    assert.equal((await readFile(path.join(crash.campaignRoot, "events.ndjson"), "utf8")).trimEnd().split("\n").length,
      crash.base.generation + 1);
    assert.equal((await relativeTree(crash.campaignRoot)).some((entry) =>
      entry.includes(".composite-transaction") || entry.includes(".tmp") || entry.includes(".stage")), false);
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("a recovery failure after manifest commit leaves readable authority for a fresh cleanup retry", async () => {
  const crash = await crashedMutationFixture("scope", "after_marker_fsync");
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    let failures = 0;
    const recovering = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name === "after_manifest_replace" && failures === 0) {
          failures += 1;
          throw new Error("one-time recovery failure after manifest commit");
        }
      }
    });

    await assert.rejects(
      recovering[crash.operation.method](crash.root, crash.operation.input),
      /one-time recovery failure after manifest commit/
    );
    assert.equal(failures, 1);
    assert.equal((await store.loadCampaignSnapshot(crash.root, "campaign-1")).generation,
      crash.base.generation + 1);
    assert.equal(await lstat(crash.markerPath).then(() => true), true);

    const recovered = await internal.createCompositeCampaignStore()[crash.operation.method](
      crash.root,
      crash.operation.input
    );
    assert.equal(recovered.generation, crash.base.generation + 1);
    assert.equal((await relativeTree(crash.campaignRoot)).some((entry) =>
      entry.includes(".composite-transaction") || entry.includes(".tmp") || entry.includes(".stage")), false);
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("a canonical marker cannot claim a packet revision already referenced by the old manifest", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const { scoped } = await createdAndScoped(root, store);
    const firstPacket = packetFor(scoped, 1, null);
    const first = await store.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: firstPacket,
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const firstPacketPath = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001", "authoring-packet.json");
    const firstPacketBytes = await readFile(firstPacketPath);
    const operation = {
      method: "createPacketRevisionCas",
      input: {
        campaign_id: "campaign-1", packet: packetFor(first, 2, first.campaign.slices["SFC-001"].revisions[0].packet_sha256),
        expected_etag: first.manifest_etag_sha256, operation_id: "packet:2"
      }
    };
    const crashing = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name === "after_marker_fsync") throw new Error("leave revision-2 marker");
      }
    });
    await assert.rejects(crashing[operation.method](root, operation.input), /leave revision-2 marker/);
    const markerPath = path.join(campaignRoot, ".composite-transaction.json");
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    marker.content = {
      ...marker.content,
      revision: 1,
      final_directory: "slices/SFC-001/revisions/0001",
      staged_directory: `slices/SFC-001/revisions/.0001.${marker.token}.stage`,
      packet_file: "slices/SFC-001/revisions/0001/authoring-packet.json",
      packet_sha256: sha256Hex(firstPacketBytes),
      packet_bytes: firstPacketBytes.length
    };
    await writeFile(markerPath, canonicalJson(marker), "utf8");
    const before = await treeSnapshot(campaignRoot);

    await assert.rejects(
      internal.createCompositeCampaignStore()[operation.method](root, operation.input),
      /marker content.*old manifest|already referenced.*revision/i
    );
    assert.deepEqual(await readFile(firstPacketPath), firstPacketBytes);
    assert.deepEqual(await treeSnapshot(campaignRoot), before);
    assert.equal((await store.loadCampaignSnapshot(root, "campaign-1")).generation, first.generation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verifiably missing staged bytes roll back only marker-owned state and retry from committed authority", async () => {
  const crash = await crashedMutationFixture("scope", "after_marker_fsync");
  try {
    const marker = JSON.parse(await readFile(crash.markerPath, "utf8"));
    await rm(path.join(crash.campaignRoot, marker.next.manifest_temp));
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    const recovered = await internal.createCompositeCampaignStore()[crash.operation.method](crash.root, crash.operation.input);
    assert.equal(recovered.generation, crash.base.generation + 1);
    assert.equal((await relativeTree(crash.campaignRoot)).some((entry) => entry.includes(".tmp") || entry.includes(".stage") || entry.includes(".composite-transaction")), false);
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("ambiguous differing installed packet blocks recovery without deleting or rewriting authority", async () => {
  const crash = await crashedMutationFixture("packet", "after_content_install");
  try {
    const packetPath = path.join(crash.campaignRoot, "slices", "SFC-001", "revisions", "0001", "authoring-packet.json");
    await writeFile(packetPath, "differing untrusted packet\n", "utf8");
    const before = await treeSnapshot(crash.campaignRoot);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    await assert.rejects(
      internal.createCompositeCampaignStore()[crash.operation.method](crash.root, crash.operation.input),
      /packet.*missing|differs|conflict|recovery/i
    );
    assert.deepEqual(await treeSnapshot(crash.campaignRoot), before);
    assert.equal(await readFile(packetPath, "utf8"), "differing untrusted packet\n");
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("partial prepared event suffix is completed, while expected-line-plus-garbage blocks without prefix rewrite", async () => {
  const partial = await crashedMutationFixture("scope", "after_event_fsync");
  try {
    const marker = JSON.parse(await readFile(partial.markerPath, "utf8"));
    const eventTemp = await readFile(path.join(partial.campaignRoot, marker.next.event_temp));
    const eventsPath = path.join(partial.campaignRoot, "events.ndjson");
    await writeFile(eventsPath, Buffer.concat([partial.oldEvents, eventTemp.subarray(0, Math.floor(eventTemp.length / 2))]));
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    const recovered = await internal.createCompositeCampaignStore()[partial.operation.method](partial.root, partial.operation.input);
    assert.equal(recovered.generation, partial.base.generation + 1);
    const final = await readFile(eventsPath);
    assert.deepEqual(final.subarray(0, partial.oldEvents.length), partial.oldEvents);
  } finally {
    await rm(partial.root, { recursive: true, force: true });
  }

  const garbage = await crashedMutationFixture("scope", "after_event_fsync");
  try {
    const eventsPath = path.join(garbage.campaignRoot, "events.ndjson");
    await writeFile(eventsPath, Buffer.concat([await readFile(eventsPath), Buffer.from("garbage\n")]));
    const before = await treeSnapshot(garbage.campaignRoot);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    await assert.rejects(
      internal.createCompositeCampaignStore()[garbage.operation.method](garbage.root, garbage.operation.input),
      /suffix|conflict|garbage|transaction/i
    );
    assert.deepEqual(await treeSnapshot(garbage.campaignRoot), before);
  } finally {
    await rm(garbage.root, { recursive: true, force: true });
  }
});

test("hostile marker path descriptors and markerless suffixes fail closed without repair", async () => {
  const hostile = await crashedMutationFixture("scope", "after_marker_fsync");
  try {
    const marker = JSON.parse(await readFile(hostile.markerPath, "utf8"));
    marker.next.event_temp = "request.md";
    await writeFile(hostile.markerPath, canonicalJson(marker), "utf8");
    const before = await treeSnapshot(hostile.campaignRoot);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    await assert.rejects(
      internal.createCompositeCampaignStore()[hostile.operation.method](hostile.root, hostile.operation.input),
      /marker.*path|derived.*token|temp path/i
    );
    assert.deepEqual(await treeSnapshot(hostile.campaignRoot), before);
  } finally {
    await rm(hostile.root, { recursive: true, force: true });
  }

  const markerless = await crashedMutationFixture("scope", "after_event_fsync");
  try {
    await rm(markerless.markerPath);
    const before = await treeSnapshot(markerless.campaignRoot);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    await assert.rejects(
      internal.createCompositeCampaignStore()[markerless.operation.method](markerless.root, markerless.operation.input),
      /suffix.*without.*marker|event suffix/i
    );
    assert.deepEqual(await treeSnapshot(markerless.campaignRoot), before);
  } finally {
    await rm(markerless.root, { recursive: true, force: true });
  }
});

test("transaction marker byte claims are bounded before temp-file allocation", async () => {
  const crash = await crashedMutationFixture("scope", "after_marker_fsync");
  try {
    const marker = JSON.parse(await readFile(crash.markerPath, "utf8"));
    marker.next.event_bytes = 10_000_000;
    await writeFile(crash.markerPath, canonicalJson(marker), "utf8");
    const before = await treeSnapshot(crash.campaignRoot);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    await assert.rejects(
      internal.createCompositeCampaignStore()[crash.operation.method](crash.root, crash.operation.input),
      /64 KiB|event.*bytes|marker.*limit|byte claim/i
    );
    assert.deepEqual(await treeSnapshot(crash.campaignRoot), before);
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("a pre-marker staging failure cleans only newly owned state and preserves the conflicting temp", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const { scoped } = await createdAndScoped(root, store);
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const conflicting = path.join(campaignRoot, ".event.fixed.tmp");
    await writeFile(conflicting, "foreign temp\n", "utf8");
    const fixed = internal.createCompositeCampaignStore({ token: () => "fixed" });
    await assert.rejects(fixed.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packetFor(scoped, 1, null),
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:pre-marker"
    }), /EEXIST|exist|exclusive/i);
    assert.equal(await readFile(conflicting, "utf8"), "foreign temp\n");
    const tree = await relativeTree(campaignRoot);
    assert.equal(tree.some((entry) => entry.endsWith(".stage") || entry.includes(".campaign.fixed.tmp") ||
      entry.includes(".composite-transaction")), false);
    assert.equal((await store.loadCampaignSnapshot(root, "campaign-1")).generation, scoped.generation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("post-commit cleanup refuses to delete a marker-owned temp replaced with differing bytes", async () => {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Cleanup ownership.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    let replacedPath;
    const adversarial = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name !== "after_directory_sync") return;
        const eventTemp = (await readdir(campaignRoot)).find((entry) => entry.startsWith(".event.") && entry.endsWith(".tmp"));
        replacedPath = path.join(campaignRoot, eventTemp);
        await writeFile(replacedPath, "foreign replacement\n", "utf8");
      }
    });
    await assert.rejects(adversarial.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:cleanup-swap"
    }), /cleanup|temp|marker|differs|ownership/i);
    assert.equal(await readFile(replacedPath, "utf8"), "foreign replacement\n");
    assert.equal((await store.loadCampaignSnapshot(root, "campaign-1")).generation, 2);
    assert.equal(await lstat(path.join(campaignRoot, ".composite-transaction.json")).then(() => true), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("post-commit cleanup resumes after its owned event temp was already removed", async () => {
  const crash = await crashedMutationFixture("scope", "after_directory_sync");
  try {
    const marker = JSON.parse(await readFile(crash.markerPath, "utf8"));
    await rm(path.join(crash.campaignRoot, marker.next.event_temp));
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    const recovered = await internal.createCompositeCampaignStore()[crash.operation.method](
      crash.root,
      crash.operation.input
    );
    assert.equal(recovered.generation, crash.base.generation + 1);
    assert.equal((await relativeTree(crash.campaignRoot)).some((entry) =>
      entry.includes(".composite-transaction") || entry.includes(".tmp") || entry.includes(".stage")), false);
  } finally {
    await rm(crash.root, { recursive: true, force: true });
  }
});

test("JIT packet install safety rejects a stage-directory link swap without following it", async (t) => {
  const root = await emptyProject();
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-swap-outside-"));
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  try {
    const { scoped } = await createdAndScoped(root, store);
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    await writeFile(path.join(outside, "sentinel.txt"), "outside\n", "utf8");
    let swapped = false;
    const adversarial = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name !== "after_marker_fsync") return;
        const revisions = path.join(campaignRoot, "slices", "SFC-001", "revisions");
        const stageName = (await readdir(revisions)).find((entry) => entry.endsWith(".stage"));
        const stage = path.join(revisions, stageName);
        await rm(stage, { recursive: true });
        try {
          await symlink(outside, stage, process.platform === "win32" ? "junction" : "dir");
          swapped = true;
        } catch (error) {
          if (error?.code !== "EPERM") throw error;
        }
      }
    });
    if (process.platform === "win32") {
      // Junction creation normally needs no privilege; keep a defensive skip for locked-down hosts.
      try { await lstat(outside); } catch { t.skip("directory link unavailable"); }
    }
    await assert.rejects(adversarial.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packetFor(scoped, 1, null),
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:swap"
    }), /symbolic link|junction|link|safe|ownership/i);
    assert.equal(swapped, true);
    assert.equal(await readFile(path.join(outside, "sentinel.txt"), "utf8"), "outside\n");
    assert.equal((await store.loadCampaignSnapshot(root, "campaign-1")).generation, scoped.generation);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

for (const [checkpoint, leaf, operation] of [
  ["after_content_install", "events.ndjson", "event append"],
  ["after_event_fsync", "campaign.yaml", "manifest replace"]
]) {
  test(`JIT ${operation} safety rejects an exact-leaf link swap without committing manifest`, async (t) => {
    const root = await emptyProject();
    const outside = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-leaf-swap-"));
    const store = await import(storeModulePath);
    const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
    try {
      const created = await store.createCampaign(root, {
        campaign_id: "campaign-1", request: "Leaf swap.\n", operation_id: "create:1"
      });
      const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
      const outsideFile = path.join(outside, "outside.txt");
      await writeFile(outsideFile, "outside\n", "utf8");
      const backup = path.join(campaignRoot, `${leaf}.backup`);
      let swapped = false;
      const adversarial = internal.createCompositeCampaignStore({
        checkpoint: async (name) => {
          if (name !== checkpoint) return;
          const target = path.join(campaignRoot, leaf);
          await rename(target, backup);
          try {
            await symlink(outsideFile, target, "file");
            swapped = true;
          } catch (error) {
            if (error?.code !== "EPERM") throw error;
            await rename(backup, target);
          }
        }
      });
      try {
        await assert.rejects(adversarial.applyScopeFitCas(root, {
          campaign_id: "campaign-1", scope_fit: scopeFor(created),
          expected_etag: created.manifest_etag_sha256, operation_id: `scope:${checkpoint}`
        }), /symbolic link|junction|link|safe|containment/i);
      } catch (error) {
        if (!swapped && process.platform === "win32") {
          t.skip("file symlink privilege unavailable");
          return;
        }
        throw error;
      }
      assert.equal(swapped, true);
      assert.equal(await readFile(outsideFile, "utf8"), "outside\n");
      if (leaf === "campaign.yaml") {
        assert.equal(sha256Hex(await readFile(backup)), created.manifest_etag_sha256);
      } else {
        assert.equal((await readFile(backup, "utf8")).trimEnd().split("\n").length, 1);
        assert.equal(sha256Hex(await readFile(path.join(campaignRoot, "campaign.yaml"))), created.manifest_etag_sha256);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
}

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-store-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}

async function crashedMutationFixture(mutation, checkpoint) {
  const root = await emptyProject();
  const store = await import(storeModulePath);
  const internal = await import("../../packages/ty-context/dist/lib/composite-campaign-store-internal.js");
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: `Crash ${mutation}.\n`, operation_id: "create:1"
  });
  let base = created;
  if (mutation === "packet") {
    base = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    });
  }
  const operation = mutation === "scope" ? {
    method: "applyScopeFitCas",
    input: {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: base.manifest_etag_sha256, operation_id: "scope:crash"
    }
  } : {
    method: "createPacketRevisionCas",
    input: {
      campaign_id: "campaign-1", packet: packetFor(base, 1, null),
      expected_etag: base.manifest_etag_sha256, operation_id: "packet:crash"
    }
  };
  const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
  const oldEvents = await readFile(path.join(campaignRoot, "events.ndjson"));
  const crashing = internal.createCompositeCampaignStore({
    checkpoint: async (name) => { if (name === checkpoint) throw new Error(`simulated crash at ${checkpoint}`); }
  });
  await assert.rejects(crashing[operation.method](root, operation.input), /simulated crash/);
  return { root, campaignRoot, markerPath: path.join(campaignRoot, ".composite-transaction.json"), oldEvents, base, operation };
}

function scopeFor(snapshot) {
  const scope = scopeFitFixture();
  scope.request_sha256 = snapshot.campaign.request.sha256;
  return scope;
}

async function createdAndScoped(root, store) {
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: "Author packets.\n", operation_id: "create:1"
  });
  const scoped = await store.applyScopeFitCas(root, {
    campaign_id: "campaign-1", scope_fit: scopeFor(created),
    expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
  });
  return { created, scoped };
}

function packetFor(snapshot, revision, previous) {
  const packet = packetFixture();
  packet.campaign_id = snapshot.campaign.campaign_id;
  packet.request_sha256 = snapshot.campaign.request.sha256;
  packet.revision = revision;
  packet.previous_packet_sha256 = previous;
  packet.created_at = new Date().toISOString();
  return packet;
}

async function relativeTree(root) {
  const result = [];
  async function visit(current, relative = "") {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      result.push(child);
      if (entry.isDirectory()) await visit(path.join(current, entry.name), child);
    }
  }
  await visit(root);
  return result;
}

async function treeSnapshot(root) {
  const result = [];
  for (const relative of await relativeTree(root)) {
    const absolute = path.join(root, ...relative.split("/"));
    const metadata = await stat(absolute);
    result.push([relative, metadata.size, metadata.mtimeMs, metadata.isFile() ? sha256Hex(await readFile(absolute)) : null]);
  }
  return result;
}

async function waitForChildReady(child) {
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child._stdoutText = "";
  child._stderrText = "";
  child.stdout.on("data", (chunk) => { child._stdoutText += chunk; });
  child.stderr.on("data", (chunk) => { child._stderrText += chunk; });
  const deadline = Date.now() + 5_000;
  while (!child._stdoutText.includes("ready\n")) {
    if (child.exitCode !== null) throw new Error(`writer child exited early: ${child._stderrText}`);
    if (Date.now() >= deadline) throw new Error(`writer child ready timeout: ${child._stderrText}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function readChildResult(child) {
  if (child.exitCode === null) {
    await new Promise((resolve, reject) => {
      child.once("exit", resolve);
      child.once("error", reject);
    });
  }
  const lines = child._stdoutText.trimEnd().split("\n");
  const result = JSON.parse(lines.at(-1));
  if (!result || !result.status) throw new Error(`writer child produced no result: ${child._stderrText}`);
  return result;
}
