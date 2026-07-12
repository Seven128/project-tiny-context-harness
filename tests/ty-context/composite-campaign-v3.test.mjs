import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
import {
  applyPacketV3,
  applyScopeV3,
  bindCampaignGoalV3,
  compositeCampaignV3Contract,
  createCampaignV3,
  handoffCampaignV3,
  nextCampaignSfcV3,
  preflightCampaignV3,
  recordCampaignResultV3
} from "../../packages/ty-context/dist/lib/composite-campaign-v3.js";
import { getActiveLongTask } from "../../packages/ty-context/dist/lib/long-task-host-client.js";

test("clean-start V3 campaign uses SFC-only fields and hands off without legacy state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v3-"));
  const authored = await writeHappyV3Contract(root);
  await writeFile(path.join(root, "request.md"), "Build the capability\n");
  const campaign = await createCampaignV3(root, "campaign-1", "request.md");
  const campaignPath = path.join(root, ".codex", "composite-long-task", "campaigns", campaign.campaign_id);
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope(campaign, [sfc("SFC-001")], "SFC-001", "fit_for_three_inputs")));
  const scoped = await applyScopeV3(root, campaignPath, "scope.json");
  assert.equal(scoped.selected_sfc_id, "SFC-001");
  assert.equal("selected_slice_id" in scoped, false);
  assert.equal("slices" in scoped, false);
  const packet = {
    schema_version: "composite-authoring-packet-v3",
    campaign_id: "campaign-1",
    sfc_id: "SFC-001",
    revision: 1,
    previous_packet_sha256: null,
    authorities: {
      product_architecture_source: YAML.parse(await readFile(path.join(authored, "product-architecture-source.yaml"), "utf8")),
      technical_realization_plan: YAML.parse(await readFile(path.join(authored, "technical-realization-plan.yaml"), "utf8")),
      acceptance_checklist: YAML.parse(await readFile(path.join(authored, "acceptance-checklist.yaml"), "utf8"))
    }
  };
  await writeFile(path.join(root, "packet.json"), JSON.stringify(packet));
  await applyPacketV3(root, campaignPath, "SFC-001", "packet.json");
  assert.equal((await preflightCampaignV3(root, campaignPath, "SFC-001")).handoff_ready, true);
  const handoff = await handoffCampaignV3(root, campaignPath, "SFC-001");
  assert.ok(handoff.contract_sha256);
  assert.equal(await getActiveLongTask(root), null, "handoff without a created Goal must not strand Stop enforcement");
  await bindCampaignGoalV3(root, campaignPath, "SFC-001", "goal-001");
  assert.equal((await getActiveLongTask(root)).contract_sha256, handoff.contract_sha256);
  await assert.rejects(readFile(path.join(handoff.workdir, "task-state.json")), /ENOENT/u);
  assert.match(await readFile(path.join(handoff.workdir, "product-architecture-source.yaml"), "utf8"), /product-source-v3/u);
  let reads = 0;
  const projected = await recordCampaignResultV3(root, campaignPath, "SFC-001", path.relative(root, handoff.workdir), async () => {
    reads += 1;
    return { workflow_status: "accepted", contract_sha256: handoff.contract_sha256, run_id: "FINAL-CURRENT" };
  });
  assert.equal(reads, 1, "record-result reads one current result and never reruns final-gate");
  assert.equal(projected.workflow_status, "accepted");
});

test("V2 packet and scope/slice vocabulary are rejected without compatibility parsing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-legacy-"));
  await writeHappyV3Contract(root);
  await writeFile(path.join(root, "request.md"), "Build\n");
  const campaign = await createCampaignV3(root, "campaign-2", "request.md");
  const campaignPath = path.join(root, ".codex", "composite-long-task", "campaigns", "campaign-2");
  await writeFile(path.join(root, "legacy-scope.json"), JSON.stringify({ schema_version: "scope-fit-result-v2", selected_slice_id: "SFC-001" }));
  await assert.rejects(applyScopeV3(root, campaignPath, "legacy-scope.json"), /Legacy scope results.*scope-fit-result-v3/u);
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope(campaign, [sfc("SFC-001")], "SFC-001", "fit_for_three_inputs")));
  await applyScopeV3(root, campaignPath, "scope.json");
  await writeFile(path.join(root, "packet.json"), JSON.stringify({ schema_version: "composite-authoring-packet-v2" }));
  await assert.rejects(applyPacketV3(root, campaignPath, "SFC-001", "packet.json"), /Legacy packets are not supported/u);
});

test("Scope Fit V3 enforces stable acyclic SFC dependencies and read-only next recommendation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-sfc-graph-"));
  await writeFile(path.join(root, "request.md"), "Build two outcomes\n");
  const campaign = await createCampaignV3(root, "campaign-graph", "request.md");
  const campaignPath = path.join(root, ".codex", "composite-long-task", "campaigns", "campaign-graph");
  const first = sfc("SFC-001");
  const second = { ...sfc("SFC-002"), depends_on: ["SFC-001"], priority: 2 };
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope(campaign, [first, second], "SFC-001", "split_required")));
  await applyScopeV3(root, campaignPath, "scope.json");
  assert.deepEqual(await nextCampaignSfcV3(root, campaignPath), { selected_sfc_id: "SFC-001", recommended_sfc_id: null, ready_sfc_ids: ["SFC-001"], next_action: "apply_packet" });
  const cycle = scope(campaign, [{ ...first, depends_on: ["SFC-002"] }, second], "SFC-001", "split_required");
  await writeFile(path.join(root, "cycle.json"), JSON.stringify(cycle));
  await assert.rejects(applyScopeV3(root, campaignPath, "cycle.json"), /scope_dependency_cycle/u);
});

test("campaign contract advertises only V3 Scope Fit and --sfc", () => {
  const contract = compositeCampaignV3Contract();
  assert.equal(contract.scope_schema_version, "scope-fit-result-v3");
  assert.equal(contract.sfc_option, "--sfc");
  assert.equal(JSON.stringify(contract).includes("slice"), false);
});

test("campaign inputs cannot escape the repository", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-path-"));
  const outside = path.join(path.dirname(root), "outside-request.md");
  await writeFile(outside, "escape");
  await assert.rejects(() => createCampaignV3(root, "campaign-escape", outside), /safe repository-relative path|outside repository|escapes/iu);
});

test("campaign request rejects raw credentials before creating state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-secret-"));
  await writeFile(path.join(root, "request.md"), "api_key = abcdefghijklmnop");
  await assert.rejects(() => createCampaignV3(root, "campaign-secret", "request.md"), /raw credential/u);
  await assert.rejects(readFile(path.join(root, ".codex/composite-long-task/campaigns/campaign-secret/campaign.yaml")), /ENOENT/u);
});

function scope(campaign, sfcs, selectedSfcId, decision) {
  return { schema_version: "scope-fit-result-v3", request_sha256: campaign.request_sha256, decision, rationale: ["source-backed decomposition"], sfcs, selected_sfc_id: selectedSfcId, decision_required: null };
}

function sfc(id) {
  return { sfc_id: id, stable_key: id.toLowerCase(), title: id, objective: `Deliver ${id}`, depends_on: [], priority: 1, scope_summary: ["declared outcome"], out_of_scope: [], decisions_required: [] };
}
