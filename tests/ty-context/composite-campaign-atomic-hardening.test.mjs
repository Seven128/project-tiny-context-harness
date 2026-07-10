import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const storePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const internalPath = "../../packages/ty-context/dist/lib/composite-campaign-store-internal.js";
const atomicIoPath = "../../packages/ty-context/dist/lib/composite-campaign-atomic-io.js";
const ownedRemovalPath = "../../packages/ty-context/dist/lib/composite-campaign-owned-removal.js";
const createCrashChild = fileURLToPath(new URL("./helpers/composite-campaign-create-crash-child.mjs", import.meta.url));

test("a regular-file stage swap cannot commit a packet manifest", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const internal = await import(internalPath);
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Packet stage integrity.\n", operation_id: "create:1"
    });
    const scoped = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    let swapped = false;
    const adversarial = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name !== "after_marker_fsync") return;
        const revisions = path.join(campaignRoot, "slices", "SFC-001", "revisions");
        const stageName = (await readdir(revisions)).find((entry) => entry.endsWith(".stage"));
        await writeFile(path.join(revisions, stageName, "authoring-packet.json"), "foreign packet bytes\n", "utf8");
        swapped = true;
      }
    });
    await assert.rejects(adversarial.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packetFor(scoped),
      expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:swap"
    }), /packet|stage|hash|ownership|canonical/i);
    assert.equal(swapped, true);
    assert.equal(sha256Hex(await readFile(path.join(campaignRoot, "campaign.yaml"))), scoped.manifest_etag_sha256);
    assert.equal((await store.loadCampaignSnapshot(root, "campaign-1")).generation, scoped.generation);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the transaction marker is atomically published from a synced create-only temp", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const internal = await import(internalPath);
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Atomic marker publication.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    let inspected = false;
    const fixed = internal.createCompositeCampaignStore({
      token: () => "fixed",
      checkpoint: async (name) => {
        if (name !== "after_marker_fsync") return;
        const marker = path.join(campaignRoot, ".composite-transaction.json");
        const temp = path.join(campaignRoot, ".transaction.fixed.tmp");
        const [markerStat, tempStat] = await Promise.all([lstat(marker), lstat(temp)]);
        assert.equal(markerStat.isFile(), true);
        assert.equal(tempStat.isFile(), true);
        assert.equal(markerStat.dev, tempStat.dev);
        assert.equal(markerStat.ino, tempStat.ino);
        assert.equal(await readFile(marker, "utf8"), await readFile(temp, "utf8"));
        inspected = true;
      }
    });
    const scoped = await fixed.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:atomic-marker"
    });
    assert.equal(scoped.generation, 2);
    assert.equal(inspected, true);
    assert.equal((await readdir(campaignRoot)).some((entry) => entry.includes(".transaction.fixed.tmp")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bound mutable-file opens reject a leaf replaced after identity capture", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const atomicIo = await import(atomicIoPath);
  try {
    await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Bound event handle.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const events = path.join(campaignRoot, "events.ndjson");
    const identity = await atomicIo.compositeRegularFileIdentity(events);
    await rename(events, `${events}.original`);
    await writeFile(events, "replacement\n", "utf8");
    await assert.rejects(atomicIo.openBoundCompositeRegularFile(events, identity), /identity|verified leaf/i);
    assert.equal(await readFile(events, "utf8"), "replacement\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("owned-file quarantine resumes after a crash and conditionally restores mismatches", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const removal = await import(ownedRemovalPath);
  try {
    await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Removal recovery.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const target = path.join(campaignRoot, ".owned-test.tmp");
    const expected = "owned bytes\n";
    const expectedHash = sha256Hex(expected);
    await writeFile(target, expected, "utf8");
    const quarantine = path.join(campaignRoot, ".composite-remove.fixed.test-file");
    await mkdir(quarantine);
    await writeFile(path.join(quarantine, ".owner.json"), canonicalJson({
      schema_version: "composite-removal-v1", target: path.resolve(target),
      sha256: expectedHash, bytes: Buffer.byteLength(expected), token: "fixed", purpose: "test-file"
    }), "utf8");
    await rename(target, path.join(quarantine, "owned"));
    assert.equal(await removal.removeOwnedCompositeRegularFile({
      project_root: root, target, sha256: expectedHash, bytes: Buffer.byteLength(expected),
      token: "fixed", purpose: "test-file"
    }), true);
    await assert.rejects(lstat(quarantine), /ENOENT/);

    await writeFile(target, "foreign bytes\n", "utf8");
    assert.equal(await removal.removeOwnedCompositeRegularFile({
      project_root: root, target, sha256: expectedHash, bytes: Buffer.byteLength(expected),
      token: "fixed", purpose: "test-file"
    }), false);
    assert.equal(await readFile(target, "utf8"), "foreign bytes\n");
    await assert.rejects(lstat(quarantine), /ENOENT/);

    const unownedTarget = path.join(campaignRoot, ".unowned-test.tmp");
    const unownedQuarantine = path.join(campaignRoot, ".composite-remove.fixed.unowned-file");
    await mkdir(unownedQuarantine);
    await writeFile(path.join(unownedQuarantine, "owned"), "injected foreign bytes\n", "utf8");
    await assert.rejects(removal.removeOwnedCompositeRegularFile({
      project_root: root, target: unownedTarget, sha256: expectedHash, bytes: Buffer.byteLength(expected),
      token: "fixed", purpose: "unowned-file"
    }), /quarantine|owner|descriptor|members/i);
    await assert.rejects(lstat(unownedTarget), /ENOENT/);
    assert.equal(await readFile(path.join(unownedQuarantine, "owned"), "utf8"), "injected foreign bytes\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("owned-directory quarantine restores a moved replacement instead of deleting it", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const removal = await import(ownedRemovalPath);
  try {
    await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Directory removal recovery.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const target = path.join(campaignRoot, ".owned-stage");
    await mkdir(target);
    await writeFile(path.join(target, "authoring-packet.json"), "foreign packet\n", "utf8");
    assert.equal(await removal.removeOwnedCompositeSingleFileDirectory({
      project_root: root, target, file_name: "authoring-packet.json",
      sha256: sha256Hex("owned packet\n"), bytes: Buffer.byteLength("owned packet\n"),
      token: "fixed", purpose: "test-stage"
    }), false);
    assert.equal(await readFile(path.join(target, "authoring-packet.json"), "utf8"), "foreign packet\n");
    await assert.rejects(lstat(path.join(campaignRoot, ".composite-remove.fixed.test-stage")), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("approved quarantine resume blocks a replaced owned leaf without restoring or deleting it", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const removal = await import(ownedRemovalPath);
  try {
    await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Approved removal recovery.\n", operation_id: "create:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    const target = path.join(campaignRoot, ".approved-test.tmp");
    const expected = "approved owned bytes\n";
    const expectedHash = sha256Hex(expected);
    const purpose = "approved-file";
    const quarantine = path.join(campaignRoot, `.composite-remove.fixed.${purpose}`);
    const moved = path.join(quarantine, "owned");
    await mkdir(quarantine);
    await writeFile(path.join(quarantine, ".owner.json"), canonicalJson({
      schema_version: "composite-removal-v1", target: path.resolve(target),
      sha256: expectedHash, bytes: Buffer.byteLength(expected), token: "fixed", purpose
    }), "utf8");
    await writeFile(moved, expected, "utf8");
    const approvedIdentity = await lstat(moved);
    await writeFile(path.join(quarantine, ".delete-approved"), canonicalJson({
      schema_version: "composite-removal-approval-v1", kind: "file",
      dev: String(approvedIdentity.dev), ino: String(approvedIdentity.ino)
    }), "utf8");
    await rename(moved, path.join(campaignRoot, ".approved-original"));
    await writeFile(moved, "replacement after approval\n", "utf8");
    assert.equal(await removal.removeOwnedCompositeRegularFile({
      project_root: root, target, sha256: expectedHash, bytes: Buffer.byteLength(expected),
      token: "fixed", purpose
    }), false);
    await assert.rejects(lstat(target), /ENOENT/);
    assert.equal(await readFile(moved, "utf8"), "replacement after approval\n");
    assert.equal((await readdir(quarantine)).includes(".delete-approved"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const checkpoint of ["after_content_install", "after_event_fsync"]) {
test(`an installed-packet swap at ${checkpoint} cannot reach the manifest commit point`, async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const internal = await import(internalPath);
  try {
    const created = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Installed packet integrity.\n", operation_id: "create:1"
    });
    const scoped = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
    });
    const campaignRoot = path.join(await store.campaignsRoot(root), "campaign-1");
    let swapped = false;
    const adversarial = internal.createCompositeCampaignStore({
      checkpoint: async (name) => {
        if (name !== checkpoint) return;
        const packet = path.join(campaignRoot, "slices", "SFC-001", "revisions", "0001", "authoring-packet.json");
        await writeFile(packet, "foreign installed packet\n", "utf8");
        swapped = true;
      }
    });
    await assert.rejects(adversarial.createPacketRevisionCas(root, {
      campaign_id: "campaign-1", packet: packetFor(scoped),
      expected_etag: scoped.manifest_etag_sha256, operation_id: `packet:installed-swap:${checkpoint}`
    }), /packet|hash|ownership|canonical/i);
    assert.equal(swapped, true);
    assert.equal(sha256Hex(await readFile(path.join(campaignRoot, "campaign.yaml"))), scoped.manifest_etag_sha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
}

test("campaign creation revalidates exact leaf bytes before publishing", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const internal = await import(internalPath);
  try {
    const campaigns = await store.campaignsRoot(root);
    let swapped = false;
    const adversarial = internal.createCompositeCampaignStore({
      token: () => "fixed",
      checkpoint: async (name) => {
        if (name !== "before_create_publish") return;
        const legacyStage = path.join(campaigns, ".campaign-1.fixed.create");
        const liveRoot = path.join(campaigns, "campaign-1");
        const target = await lstat(legacyStage).then(() => legacyStage, () => liveRoot);
        await writeFile(path.join(target, "request.md"), "foreign request\n", "utf8");
        swapped = true;
      }
    });
    await assert.rejects(adversarial.createCampaign(root, {
      campaign_id: "campaign-1", request: "Original request.\n", operation_id: "create:swap"
    }), /request|stage|hash|ownership|publish/i);
    assert.equal(swapped, true);
    await assert.rejects(lstat(path.join(campaigns, "campaign-1", "campaign.yaml")), /ENOENT/);
    assert.equal(await readFile(path.join(campaigns, "campaign-1", "request.md"), "utf8"), "foreign request\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("campaign creation reasserts lock ownership immediately before publishing", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  const internal = await import(internalPath);
  try {
    const campaigns = await store.campaignsRoot(root);
    let replaced = false;
    const adversarial = internal.createCompositeCampaignStore({
      token: () => "fixed",
      checkpoint: async (name) => {
        if (name !== "before_create_publish") return;
        await writeFile(path.join(campaigns, ".campaign-1.lock"), "{\"replacement\":true}\n", "utf8");
        replaced = true;
      }
    });
    await assert.rejects(adversarial.createCampaign(root, {
      campaign_id: "campaign-1", request: "Lock ownership.\n", operation_id: "create:owner"
    }), /lock.*ownership|owner.*lost/i);
    assert.equal(replaced, true);
    await assert.rejects(lstat(path.join(campaigns, "campaign-1", "campaign.yaml")), /ENOENT/);
    const partial = await readdir(path.join(campaigns, "campaign-1"));
    assert.equal(partial.includes("request.md"), true);
    assert.equal(partial.includes("events.ndjson"), true);
    assert.equal(partial.includes(".composite-create-owner.json"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a killed creator resumes a marker-owned partial temp without replacing foreign content", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  try {
    const child = spawn(process.execPath, [createCrashChild, root], {
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true
    });
    const { code, stderr } = await childResult(child);
    assert.equal(code, 73, stderr);
    const campaigns = await store.campaignsRoot(root);
    const partial = await readdir(path.join(campaigns, "campaign-1"));
    assert.equal(partial.includes("request.md"), true);
    assert.equal(partial.includes("events.ndjson"), true);
    assert.equal(partial.includes(".composite-create-owner.json"), true);
    const liveRoot = path.join(campaigns, "campaign-1");
    const requestTemp = partial.find((entry) => entry.startsWith(".request.") && entry.endsWith(".tmp"));
    assert.ok(requestTemp);
    for (const entry of partial) {
      if (entry !== ".composite-create-owner.json") await rm(path.join(liveRoot, entry), { force: true });
    }
    await writeFile(path.join(liveRoot, requestTemp), "partial bytes", "utf8");
    const recovered = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Recover interrupted creation.\n", operation_id: "create:crash"
    });
    assert.equal(recovered.generation, 1);
    assert.deepEqual((await readdir(path.join(campaigns, "campaign-1"))).sort(), [
      "campaign.yaml", "events.ndjson", "request.md"
    ]);
    assert.deepEqual(await readdir(campaigns), ["campaign-1"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a committed create marker blocks mutation until an exact create retry cleans it", async () => {
  const root = await emptyProject();
  const store = await import(storePath);
  try {
    const child = spawn(process.execPath, [createCrashChild, root, "after_create_manifest"], {
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true
    });
    const { code, stderr } = await childResult(child);
    assert.equal(code, 73, stderr);
    const created = await store.loadCampaignSnapshot(root, "campaign-1");
    assert.equal(created.generation, 1);
    await assert.rejects(store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(created),
      expected_etag: created.manifest_etag_sha256, operation_id: "scope:blocked-by-create"
    }), /pending create|retry createCampaign/i);
    const retried = await store.createCampaign(root, {
      campaign_id: "campaign-1", request: "Recover interrupted creation.\n", operation_id: "create:crash"
    });
    assert.equal(retried.manifest_etag_sha256, created.manifest_etag_sha256);
    const scoped = await store.applyScopeFitCas(root, {
      campaign_id: "campaign-1", scope_fit: scopeFor(retried),
      expected_etag: retried.manifest_etag_sha256, operation_id: "scope:after-create-cleanup"
    });
    assert.equal(scoped.generation, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-atomic-hardening-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}

function scopeFor(snapshot) {
  const scope = scopeFitFixture();
  scope.request_sha256 = snapshot.campaign.request.sha256;
  return scope;
}

function packetFor(snapshot) {
  const packet = packetFixture();
  packet.campaign_id = snapshot.campaign.campaign_id;
  packet.request_sha256 = snapshot.campaign.request.sha256;
  packet.revision = 1;
  packet.previous_packet_sha256 = null;
  packet.created_at = new Date().toISOString();
  return packet;
}

async function childResult(child) {
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.once("exit", resolve);
    child.once("error", reject);
  });
  return { code, stderr };
}
