import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

test("Campaign V4 CLI drives one Slice through worktree, receipt, integration, final gate, target merge, and cleanup", { timeout: 120_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v4-cli-"));
  const authored = await writeHappyV3Contract(root);
  const planText = "SRC-001: deliver the value capability through one verified Slice\n";
  await writeFile(path.join(root, "plan.md"), planText);
  const contract = runCli(root, ["composite-campaign", "contract", "--json"]);
  assert.equal(contract.schema_version, "composite-campaign-v4");
  assert.ok(contract.advance_actions.includes("launch_wave"));
  const created = runCli(root, ["composite-campaign", "create", "--id", "campaign-one", "--plan-file", "plan.md", "--json"]);
  const campaignPath = path.relative(root, created.campaign_path);
  const sourceHash = sha(planText);
  const scope = {
    schema_version: "scope-fit-result-v3", request_sha256: sourceHash, decision: "fit_for_three_inputs", campaign_goal: "Deliver the value capability", global_constraints: [],
    slices: [{ slice_id: "SFC-001", stable_key: "value-capability", title: "Value capability", objective: "Deliver the verified value", depends_on: [], priority: 1, source_refs: ["SRC-001"], scope_summary: ["value"], out_of_scope: [], produces_contracts: [], consumes_contracts: [], conflict_domains: ["value-capability"], resource_locks: [] }], decision_required: null
  };
  const coverage = { schema_version: "composite-source-coverage-v1", source_plan_sha256: sourceHash, items: [{ source_item_id: "SRC-001", statement: "deliver the value capability", disposition: "slice", slice_refs: ["SFC-001"], global_constraint_refs: [], rationale: "The Slice owns the complete source item" }], global_constraint_bindings: [] };
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope));
  await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage));
  runCli(root, ["composite-campaign", "apply-scope", "--campaign", campaignPath, "--input", "scope.json", "--coverage", "coverage.json", "--json"]);
  const packet = await packetFrom(authored, "campaign-one", "SFC-001");
  await writeFile(path.join(root, "packet.json"), JSON.stringify(packet));
  runCli(root, ["composite-campaign", "apply-packet", "--campaign", campaignPath, "--slice", "SFC-001", "--input", "packet.json", "--json"]);
  assert.equal(runCli(root, ["composite-campaign", "preflight", "--campaign", campaignPath, "--slice", "SFC-001", "--json"]).packet_ready, true);
  const launch = runCli(root, ["composite-campaign", "advance", "--campaign", campaignPath, "--json"], 120_000);
  assert.equal(launch.action, "launch_wave");
  assert.equal(launch.goals.length, 1);
  const goal = launch.goals[0];
  runCli(root, ["composite-campaign", "bind-goal", "--campaign", campaignPath, "--slice", "SFC-001", "--goal-id", "goal-one", "--launch-token", goal.launch_token, "--json"]);
  const manifest = JSON.parse(await readFile(path.join(created.campaign_path, "waves", launch.wave_id, "goals", "SFC-001", "goal-manifest.json"), "utf8"));
  runCli(goal.worktree, ["composite-long-task", "compile", manifest.contract_workdir, "--campaign-id", "campaign-one", "--slice-id", "SFC-001"]);
  await writeFile(path.join(goal.worktree, "src", "value.txt"), "good\n\n");
  await writeFile(path.join(goal.worktree, campaignPath, "source-plan.md"), "worker must not change campaign state\n");
  git(goal.worktree, ["add", "-A"]); git(goal.worktree, ["commit", "--no-gpg-sign", "-m", "feat: implement SFC-001"]);
  assert.equal(runCli(goal.worktree, ["composite-long-task", "final-gate", manifest.contract_workdir], 120_000).workflow_status, "accepted");
  const forbiddenRecord=rawCli(root,["composite-campaign","record-result","--campaign",campaignPath,"--slice","SFC-001","--goal-id","goal-one","--workdir",manifest.contract_workdir,"--json"],120_000);
  assert.notEqual(forbiddenRecord.status,0);assert.match(forbiddenRecord.stderr,/forbidden_campaign_state_change/);
  await writeFile(path.join(goal.worktree,campaignPath,"source-plan.md"),planText);git(goal.worktree,["add","-A"]);git(goal.worktree,["commit","--no-gpg-sign","-m","fix: restore forbidden Campaign state"]);
  assert.equal(runCli(goal.worktree,["composite-long-task","final-gate",manifest.contract_workdir],120_000).workflow_status,"accepted");
  const runCountBeforeRecord=(await readdir(path.join(manifest.contract_workdir,"runs"))).length;
  runCli(root, ["composite-campaign", "record-result", "--campaign", campaignPath, "--slice", "SFC-001", "--goal-id", "goal-one", "--workdir", manifest.contract_workdir, "--json"], 120_000);
  assert.equal((await readdir(path.join(manifest.contract_workdir,"runs"))).length,runCountBeforeRecord,"record-result must not rerun final-gate");
  const finished = runCli(root, ["composite-campaign", "advance", "--campaign", campaignPath, "--json"], 120_000);
  assert.equal(finished.action, "finished");
  assert.equal(finished.campaign_status, "accepted");
  assert.equal(git(root, ["rev-parse", "HEAD"]), finished.target_commit);
  assert.equal((await readFile(path.join(root, "src", "value.txt"), "utf8")).replace(/\r\n/gu, "\n"), "good\n\n");
  const status = runCli(root, ["composite-campaign", "status", "--campaign", campaignPath, "--json"]);
  assert.equal(status.derived_status, "accepted");
  assert.equal(status.campaign.slices["SFC-001"].worktree, null);
});

test("Campaign V4 CLI rejects removed V3 commands and unknown options", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v4-cli-reject-"));
  const removed = rawCli(root, ["composite-campaign", "next", "--campaign", "x"]);
  assert.notEqual(removed.status, 0); assert.match(removed.stderr, /Unknown composite-campaign subcommand/);
  const injected = rawCli(root, ["composite-campaign", "contract", "--force"]);
  assert.notEqual(injected.status, 0); assert.match(injected.stderr, /Unknown option/);
});

test("Campaign V4 rejects legacy Scope Fit and Packet schemas without an alias", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v4-legacy-"));
  await writeHappyV3Contract(root);
  const planText = "SRC-001: current V4 only\n";
  await writeFile(path.join(root, "plan.md"), planText);
  const created = runCli(root, ["composite-campaign", "create", "--id", "legacy-rejected", "--plan-file", "plan.md", "--json"]);
  const campaignPath = path.relative(root, created.campaign_path);
  await writeFile(path.join(root, "legacy-scope.json"), JSON.stringify({ schema_version: "scope-fit-result-v2", selected_slice_id: "SFC-001" }));
  await writeFile(path.join(root, "empty-coverage.json"), "{}");
  const legacyScope = rawCli(root, ["composite-campaign", "apply-scope", "--campaign", campaignPath, "--input", "legacy-scope.json", "--coverage", "empty-coverage.json", "--json"]);
  assert.notEqual(legacyScope.status, 0);
  assert.match(legacyScope.stderr, /scope-fit-result-v3|legacy Scope Fit/i);

  const sourceHash = sha(planText);
  const scope = {
    schema_version: "scope-fit-result-v3", request_sha256: sourceHash, decision: "fit_for_three_inputs", campaign_goal: "current V4 only", global_constraints: [],
    slices: [{ slice_id: "SFC-001", stable_key: "current-v4", title: "Current V4", objective: "Reject legacy state", depends_on: [], priority: 1, source_refs: ["SRC-001"], scope_summary: ["V4"], out_of_scope: [], produces_contracts: [], consumes_contracts: [], conflict_domains: ["v4"], resource_locks: [] }], decision_required: null
  };
  const coverage = { schema_version: "composite-source-coverage-v1", source_plan_sha256: sourceHash, items: [{ source_item_id: "SRC-001", statement: "current V4 only", disposition: "slice", slice_refs: ["SFC-001"], global_constraint_refs: [], rationale: "V4 Slice owns this item" }], global_constraint_bindings: [] };
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope));
  await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage));
  runCli(root, ["composite-campaign", "apply-scope", "--campaign", campaignPath, "--input", "scope.json", "--coverage", "coverage.json", "--json"]);
  await writeFile(path.join(root, "legacy-packet.json"), JSON.stringify({ schema_version: "composite-authoring-packet-v2" }));
  const legacyPacket = rawCli(root, ["composite-campaign", "apply-packet", "--campaign", campaignPath, "--slice", "SFC-001", "--input", "legacy-packet.json", "--json"]);
  assert.notEqual(legacyPacket.status, 0);
  assert.match(legacyPacket.stderr, /Legacy packets are not supported|composite-authoring-packet-v3/i);
});

test("Campaign V4 fails closed when immutable source-plan.md changes",async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"campaign-v4-source-drift-"));await writeHappyV3Contract(root);await writeFile(path.join(root,"plan.md"),"SRC-001: immutable\n");const created=runCli(root,["composite-campaign","create","--id","source-drift","--plan-file","plan.md","--json"]);await writeFile(path.join(created.campaign_path,"source-plan.md"),"changed\n");const result=rawCli(root,["composite-campaign","status","--campaign",path.relative(root,created.campaign_path),"--json"]);assert.notEqual(result.status,0);assert.match(result.stderr,/source-plan\.md hash mismatch/);});

async function packetFrom(task, campaignId, sliceId) {
  return { schema_version: "composite-authoring-packet-v3", campaign_id: campaignId, slice_id: sliceId, revision: 1, previous_packet_sha256: null, authorities: { product_architecture_source: YAML.parse(await readFile(path.join(task, "product-architecture-source.yaml"), "utf8")), technical_realization_plan: YAML.parse(await readFile(path.join(task, "technical-realization-plan.yaml"), "utf8")), acceptance_checklist: YAML.parse(await readFile(path.join(task, "acceptance-checklist.yaml"), "utf8")) } };
}

function runCli(root, args, timeout = 30_000) {
  const result = rawCli(root, args, timeout);
  assert.equal(result.status, 0, `CLI failed: ${result.stderr}\n${result.stdout}`);
  const line = result.stdout.trim().split(/\r?\n/u).at(-1);
  return line?.startsWith("{") || line?.startsWith("[") ? JSON.parse(line) : result.stdout.trim();
}
function rawCli(root, args, timeout = 30_000) { return spawnSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8", timeout, env: { ...process.env, NO_COLOR: "1" } }); }
function git(root, args) { const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
