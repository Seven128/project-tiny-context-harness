import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import {
  compositeCampaignExecutionChildFile,
  resolveExistingCompositeCampaignExecutionPath
} from "./composite-campaign-execution-path.js";
import { readCurrentCompositeCampaignFinalGateEvent } from "./composite-campaign-final-gate-event.js";
import { projectResultCas } from "./composite-campaign-lifecycle-store.js";
import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import { sourceHashesSha256 } from "./composite-campaign-schema-binding.js";
import { loadVerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import { completionOutputContractFromState } from "./superpowers-task-completion-output.js";
import type {
  CompositeCampaignBindingResultV1,
  CompositeCampaignLoadedSnapshotV1,
  CompositeCampaignResultStatusV1
} from "./composite-campaign-types.js";
import type { ExecutionAttempt, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface CompositeCampaignResultInput {
  campaign_id: string;
  slice_id: string;
  workdir: string;
}

export async function verifyCompositeCampaignResult(
  projectRoot: string,
  input: CompositeCampaignResultInput
): Promise<CompositeCampaignBindingResultV1> {
  exactInput(input);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const sliceId = validateCompositeSfcId(input.slice_id);
  const snapshot = await loadVerifiedCompositeCampaignSnapshot(projectRoot, campaignId);
  const slice = snapshot.campaign.slices[sliceId];
  if (!slice?.binding?.goal || slice.handoff_status !== "started") {
    throw new Error("Composite campaign result recording requires the selected started Goal binding");
  }
  const supplied = path.resolve(projectRoot, input.workdir);
  const expected = path.resolve(projectRoot, ...slice.binding.workdir.split("/").filter(Boolean));
  if (supplied !== expected) throw new Error("Composite campaign result workdir is a sibling or differs from the frozen binding path");
  const paths = await resolveExistingCompositeCampaignExecutionPath(projectRoot, slice.binding.workdir);
  if (paths.final_path !== expected) throw new Error("Composite campaign result workdir does not resolve to the frozen binding path");
  const state = await readState(paths.project_root, paths.final_path);
  if (state.meta.task_id !== slice.binding.task.task_id) throw new Error("Composite campaign result task_id differs from the handoff binding");
  const attempt = currentAttempt(state);
  await assertFrozenSources(paths.project_root, paths.final_path, state, attempt, slice.binding.source_hashes);
  const eventsPath = await compositeCampaignExecutionChildFile(paths.project_root, paths.final_path, "events.ndjson");
  const finalGate = await readCurrentCompositeCampaignFinalGateEvent(eventsPath, attempt.task_attempt_id);
  assertFinalGateIdentity(state, attempt, finalGate.event);
  const contract = completionOutputContractFromState(state);
  if (contract.completion_output_status !== finalGate.event.completion_output_status ||
    contract.product_goal_complete !== finalGate.event.product_goal_complete) {
    throw new Error("Current final_gate event status does not match canonical task-state completion output");
  }
  if (contract.completion_output_status === "accept" && !contract.product_goal_complete) {
    throw new Error("Current final_gate accept status cannot promote an incomplete product goal");
  }
  return {
    status: contract.completion_output_status as CompositeCampaignResultStatusV1,
    task_attempt_id: attempt.task_attempt_id,
    source_hashes_sha256: sourceHashesSha256(slice.binding.source_hashes),
    final_gate_event_sha256: finalGate.sha256,
    recorded_at: new Date().toISOString()
  };
}

export async function recordCompositeCampaignResult(
  projectRoot: string,
  input: CompositeCampaignResultInput
): Promise<{ campaign: CompositeCampaignLoadedSnapshotV1["campaign"]; result: CompositeCampaignBindingResultV1 }> {
  const result = await verifyCompositeCampaignResult(projectRoot, input);
  const snapshot = await loadVerifiedCompositeCampaignSnapshot(projectRoot, input.campaign_id);
  const operationId = `result:${sha256Hex(`${result.task_attempt_id}\0${result.final_gate_event_sha256}`).slice(0, 48)}`;
  const projected = await projectResultCas(projectRoot, {
    campaign_id: input.campaign_id,
    slice_id: input.slice_id,
    result,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId
  });
  return { campaign: projected.campaign, result: projected.campaign.slices[validateCompositeSfcId(input.slice_id)]!.binding!.result! };
}

async function readState(projectRoot: string, workdir: string): Promise<SuperpowersTaskState> {
  const statePath = await compositeCampaignExecutionChildFile(projectRoot, workdir, "task-state.json");
  return JSON.parse(await readFile(statePath, "utf8")) as SuperpowersTaskState;
}

function currentAttempt(state: SuperpowersTaskState): ExecutionAttempt {
  const attempt = state.attempts.find((candidate) => candidate.task_attempt_id === state.current_attempt_id);
  if (!attempt) throw new Error("Composite campaign result current task attempt is missing");
  return attempt;
}

async function assertFrozenSources(
  projectRoot: string,
  workdir: string,
  state: SuperpowersTaskState,
  attempt: ExecutionAttempt,
  expected: { product_architecture_source: string; technical_realization_plan: string; acceptance_checklist: string }
): Promise<void> {
  const bindings = [
    ["product_architecture_source", "product-architecture-source.md", "product_source_hash"],
    ["technical_realization_plan", "technical-realization-plan.md", "technical_plan_hash"],
    ["acceptance_checklist", "acceptance-checklist.md", "acceptance_checklist_hash"]
  ] as const;
  for (const [key, file, attemptKey] of bindings) {
    const sourcePath = await compositeCampaignExecutionChildFile(projectRoot, workdir, file);
    const actual = sha256Hex(await readFile(sourcePath));
    if (actual !== expected[key] || state.sources[key]?.sha256 !== expected[key] || attempt[attemptKey] !== expected[key]) {
      throw new Error(`Composite campaign result source hash mismatch for ${file}`);
    }
  }
}

function assertFinalGateIdentity(
  state: SuperpowersTaskState,
  attempt: ExecutionAttempt,
  event: Awaited<ReturnType<typeof readCurrentCompositeCampaignFinalGateEvent>>["event"]
): void {
  if (event.task_id !== state.meta.task_id || event.task_attempt_id !== attempt.task_attempt_id ||
    event.source_bundle_hash !== attempt.source_bundle_hash ||
    event.product_source_hash !== attempt.product_source_hash ||
    event.technical_plan_hash !== attempt.technical_plan_hash ||
    event.acceptance_checklist_hash !== attempt.acceptance_checklist_hash) {
    throw new Error("Current final_gate event identity or source hashes differ from the current attempt");
  }
  if (Date.parse(event.created_at) < Date.parse(attempt.started_at)) {
    throw new Error("Current final_gate event predates the current task attempt");
  }
  if (!state.gates?.final_gate || typeof state.gates.final_gate !== "object") {
    throw new Error("Current final_gate state is missing even though an event was recorded");
  }
}

function exactInput(input: CompositeCampaignResultInput): void {
  if (Object.keys(input).length !== 3 || !Object.hasOwn(input, "campaign_id") ||
    !Object.hasOwn(input, "slice_id") || !Object.hasOwn(input, "workdir")) {
    throw new Error("Composite campaign result input contains unknown or missing keys");
  }
}
