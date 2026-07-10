import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { sourceHashesSha256 } from "./composite-campaign-schema-binding.js";
import type { CompositeCampaignBindingV1, CompositeCampaignV1, CompositeSfcIdV1 } from "./composite-campaign-types.js";
import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function compositeCampaignBindingId(
  campaign: CompositeCampaignV1,
  sliceId: CompositeSfcIdV1
): string {
  const slice = campaign.slices[sliceId]!;
  const revision = slice.revisions.at(-1)!;
  const projection = revision.projections!;
  return `binding-${sha256Hex(canonicalJson({
    schema_version: "composite-campaign-binding-id-v1",
    campaign_id: campaign.campaign_id,
    slice_id: sliceId,
    revision: revision.revision,
    request_sha256: campaign.request.sha256,
    packet_sha256: revision.packet_sha256,
    input_contract_sha256: revision.input_contract_sha256,
    projection
  }))}`;
}

export function buildCompositeCampaignBinding(
  campaign: CompositeCampaignV1,
  sliceId: CompositeSfcIdV1,
  state: SuperpowersTaskState
): CompositeCampaignBindingV1 {
  const slice = campaign.slices[sliceId]!;
  const revision = slice.revisions.at(-1)!;
  const projection = revision.projections!;
  return {
    schema_version: "composite-campaign-binding-v1",
    binding_id: compositeCampaignBindingId(campaign, sliceId),
    campaign_id: campaign.campaign_id,
    slice_id: sliceId,
    revision: revision.revision,
    request_sha256: campaign.request.sha256,
    packet_sha256: revision.packet_sha256,
    input_contract_sha256: revision.input_contract_sha256,
    source_hashes: {
      product_architecture_source: projection.product_architecture_source_sha256,
      technical_realization_plan: projection.technical_realization_plan_sha256,
      acceptance_checklist: projection.acceptance_checklist_sha256
    },
    workdir: `tmp/ty-context/plan-acceptance/${campaign.campaign_id}/${sliceId}-r${revision.revision}/`,
    task: { task_id: state.meta.task_id, task_attempt_id: state.current_attempt_id },
    handed_off_at: state.meta.created_at,
    goal: null,
    result: null
  };
}

export async function writeCompositeCampaignHandoffArtifacts(
  stage: string,
  binding: CompositeCampaignBindingV1,
  campaignManifest: string
): Promise<void> {
  const executionPath = path.join(stage, "execution-binding.md");
  const existing = (await readFile(executionPath, "utf8")).trimEnd();
  const sourceHash = sourceHashesSha256(binding.source_hashes);
  const section = [
    "campaign_binding:",
    `  schema_version: ${binding.schema_version}`,
    `  binding_id: ${binding.binding_id}`,
    `  campaign_id: ${binding.campaign_id}`,
    `  slice_id: ${binding.slice_id}`,
    `  revision: ${binding.revision}`,
    `  campaign_manifest: ${campaignManifest}`,
    `  request_sha256: ${binding.request_sha256}`,
    `  packet_sha256: ${binding.packet_sha256}`,
    `  input_contract_sha256: ${binding.input_contract_sha256}`,
    `  source_hashes_sha256: ${sourceHash}`,
    `  product_architecture_source_sha256: ${binding.source_hashes.product_architecture_source}`,
    `  technical_realization_plan_sha256: ${binding.source_hashes.technical_realization_plan}`,
    `  acceptance_checklist_sha256: ${binding.source_hashes.acceptance_checklist}`,
    `  task_id: ${binding.task.task_id}`,
    `  initial_task_attempt_id: ${binding.task.task_attempt_id}`,
    `  handed_off_at: ${binding.handed_off_at}`,
    "  completion_authority: current_final_gate_only",
    "  campaign_result_is_projection_only: true"
  ].join("\n");
  await writeFile(executionPath, `${existing}\n\n${section}\n`, "utf8");
  const goalPath = path.join(stage, "goal-objective.txt");
  const goal = (await readFile(goalPath, "utf8")).trimEnd();
  const campaignPointer = [
    `Campaign binding pointer: ${binding.campaign_id}/${binding.slice_id}/r${binding.revision}`,
    `Read ${binding.workdir}execution-binding.md for the frozen binding identity and source hashes.`,
    `The bound Goal ID is recorded separately after explicit start; campaign result state is projection-only.`
  ].join("\n");
  await writeFile(goalPath, `${goal}\n\n${campaignPointer}\n`, "utf8");
}

export async function assertCompositeCampaignHandoffWorkdir(
  workdir: string,
  binding: CompositeCampaignBindingV1
): Promise<SuperpowersTaskState> {
  const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8")) as SuperpowersTaskState;
  if (state.meta.task_id !== binding.task.task_id || state.current_attempt_id !== binding.task.task_attempt_id) {
    throw new Error("Composite campaign handoff workdir task identity differs from its frozen binding");
  }
  const expected = binding.source_hashes;
  const actual = {
    product_architecture_source: state.sources.product_architecture_source?.sha256,
    technical_realization_plan: state.sources.technical_realization_plan?.sha256,
    acceptance_checklist: state.sources.acceptance_checklist?.sha256
  };
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error("Composite campaign handoff workdir source hashes differ from its frozen binding");
  }
  const objective = await readFile(path.join(workdir, "goal-objective.txt"), "utf8");
  if (!objective.includes("Persistent contract:") || !objective.includes("Only final-gate computes product_goal_complete") ||
    !objective.includes(`Campaign binding pointer: ${binding.campaign_id}/${binding.slice_id}/r${binding.revision}`) ||
    /^\/goal\s+read\s+\S+\s*$/i.test(objective.trim())) {
    throw new Error("Composite campaign handoff Goal objective lost its persistent contract or campaign pointer");
  }
  const execution = await readFile(path.join(workdir, "execution-binding.md"), "utf8");
  if (!execution.includes(`binding_id: ${binding.binding_id}`) || !execution.includes(`packet_sha256: ${binding.packet_sha256}`)) {
    throw new Error("Composite campaign execution-binding.md does not contain the frozen campaign identity");
  }
  return state;
}
