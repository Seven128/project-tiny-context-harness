import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
const campaignPath = ".harness/composite-long-task/campaigns/campaign-1";

test("composite-campaign CLI exposes the English-complete deterministic command surface", async () => {
  const root = await emptyProject();
  try {
    const help = run(root, "composite-campaign", "help");
    assert.equal(help.status, 0, help.stderr);
    for (const command of [
      "contract", "create", "apply-scope", "apply-packet", "render", "preflight",
      "next", "handoff", "start", "record-result"
    ]) assert.match(help.stdout, new RegExp(`\\b${command}\\b`));
    assert.match(help.stdout, /Create|Render|Record|Bind|Read-only/i);
    assert.match(help.stdout, /store or transition ScopeFitResultV1, including a resolved selection/);

    const contract = run(root, "composite-campaign", "contract", "--json");
    assert.equal(contract.status, 0, contract.stderr);
    const parsed = JSON.parse(contract.stdout);
    assert.match(parsed.contract.canonical_sha256, /^[a-f0-9]{64}$/);
    assert.equal(parsed.schemas.campaign, "composite-campaign-v1");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI drives create through explicit start while preflight and next remain read-only", async () => {
  const root = await emptyProject();
  try {
    await writeFile(path.join(root, "request.md"), "Prepare one campaign from a raw requirement.\n", "utf8");
    const create = run(root, "composite-campaign", "create", "--id", "campaign-1", "--request-file", "request.md", "--json");
    assert.equal(create.status, 0, create.stderr);
    const store = await import("../../packages/ty-context/dist/lib/composite-campaign-store.js");
    let snapshot = await store.loadCampaignSnapshot(root, "campaign-1");

    const scope = scopeFitFixture();
    scope.request_sha256 = snapshot.campaign.request.sha256;
    await writeFile(path.join(root, "scope.json"), JSON.stringify(scope), "utf8");
    const applyScope = run(root, "composite-campaign", "apply-scope", "--campaign", campaignPath, "--input", "scope.json", "--json");
    assert.equal(applyScope.status, 0, applyScope.stderr);
    snapshot = await store.loadCampaignSnapshot(root, "campaign-1");

    const packet = packetFixture();
    packet.request_sha256 = snapshot.campaign.request.sha256;
    packet.created_at = snapshot.campaign.updated_at;
    makePacketRenderable(packet);
    await writeFile(path.join(root, "packet.json"), JSON.stringify(packet), "utf8");
    const applyPacket = run(root, "composite-campaign", "apply-packet", "--campaign", campaignPath,
      "--slice", "SFC-001", "--input", "packet.json", "--json");
    assert.equal(applyPacket.status, 0, applyPacket.stderr);
    const render = run(root, "composite-campaign", "render", "--campaign", campaignPath, "--slice", "SFC-001", "--json");
    assert.equal(render.status, 0, render.stderr);

    const campaignRoot = path.join(root, campaignPath);
    const beforeReadOnly = await byteTree(campaignRoot);
    const preflight = run(root, "composite-campaign", "preflight", "--campaign", campaignPath,
      "--slice", "SFC-001", "--json");
    assert.equal(preflight.status, 0, preflight.stderr);
    assert.equal(JSON.parse(preflight.stdout).ok, true);
    const next = run(root, "composite-campaign", "next", "--campaign", campaignPath, "--json");
    assert.equal(next.status, 0, next.stderr);
    assert.equal(JSON.parse(next.stdout).slice_id, "SFC-001");
    assert.deepEqual(await byteTree(campaignRoot), beforeReadOnly);

    const handoff = run(root, "composite-campaign", "handoff", "--campaign", campaignPath, "--slice", "SFC-001", "--json");
    assert.equal(handoff.status, 0, handoff.stderr);
    const handed = JSON.parse(handoff.stdout);
    snapshot = await store.loadCampaignSnapshot(root, "campaign-1");
    assert.equal(snapshot.campaign.slices["SFC-001"].binding.goal, null);

    await rm(handed.workdir, { recursive: true, force: true });
    const missingStart = run(root, "composite-campaign", "start", "--campaign", campaignPath,
      "--slice", "SFC-001", "--goal-id", "goal-created-successfully", "--json");
    assert.equal(missingStart.status, 1);
    assert.match(missingStart.stderr, /workdir|missing|ENOENT/i);
    snapshot = await store.loadCampaignSnapshot(root, "campaign-1");
    assert.equal(snapshot.campaign.slices["SFC-001"].handoff_status, "ready");
    const recoveredHandoff = run(root, "composite-campaign", "handoff", "--campaign", campaignPath, "--slice", "SFC-001", "--json");
    assert.equal(recoveredHandoff.status, 0, recoveredHandoff.stderr);

    const start = run(root, "composite-campaign", "start", "--campaign", campaignPath,
      "--slice", "SFC-001", "--goal-id", "goal-created-successfully", "--json");
    assert.equal(start.status, 0, start.stderr);
    const retry = run(root, "composite-campaign", "start", "--campaign", campaignPath,
      "--slice", "SFC-001", "--goal-id", "goal-created-successfully", "--json");
    assert.equal(retry.status, 0, retry.stderr);
    const conflict = run(root, "composite-campaign", "start", "--campaign", campaignPath,
      "--slice", "SFC-001", "--goal-id", "different-goal", "--json");
    assert.equal(conflict.status, 1);
    assert.match(conflict.stderr, /already|different|goal/i);

    const result = run(root, "composite-campaign", "record-result", "--campaign", campaignPath,
      "--slice", "SFC-001", "--workdir", `tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1`, "--json");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /final.gate/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unknown options and out-of-root input paths fail before campaign writes", async () => {
  const root = await emptyProject();
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-cli-outside-"));
  try {
    await writeFile(path.join(root, "request.md"), "Safe request.\n", "utf8");
    await writeFile(path.join(outside, "request.md"), "Outside request.\n", "utf8");
    const unknown = run(root, "composite-campaign", "create", "--id", "campaign-1",
      "--request-file", "request.md", "--surprise", "yes");
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /unknown|option/i);
    const escaped = run(root, "composite-campaign", "create", "--id", "campaign-1",
      "--request-file", path.join(outside, "request.md"));
    assert.equal(escaped.status, 1);
    assert.match(escaped.stderr, /project|outside|path|root/i);
    assert.deepEqual((await readdir(root)).sort(), ["package.json", "request.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

function run(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

async function byteTree(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) =>
    path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll("\\", "/")).sort();
  return await Promise.all(files.map(async (file) => [file, await readFile(path.join(root, ...file.split("/")), "base64")]));
}

function makePacketRenderable(packet) {
  const product = packet.authorities.product_architecture_source.fields;
  product.representative_samples_do_not_validate = ["manual prose is not machine proof"];
  product.non_completing_outcomes = ["validator-only completion"];
  const plan = packet.authorities.technical_realization_plan.plan_items[0].fields;
  plan.implementation_paths = ["packages/ty-context/src/lib/composite-campaign-service.ts"];
  plan.invalid_implementation_shortcuts = ["implicit Goal creation"];
  const acceptance = packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
  acceptance.ac_validates = ["explicit start binding"];
  acceptance.ac_does_not_validate = ["manual prose is not machine proof"];
  acceptance.required_proof_layers = ["code"];
  acceptance.positive_assertions = ["handoff is Goal-free"];
  acceptance.negative_assertions = ["second Goal is absent"];
  acceptance.invalid_completion_signals = ["validator-only completion"];
}

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-cli-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}
