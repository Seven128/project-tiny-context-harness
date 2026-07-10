import path from "node:path";
import { readFile } from "node:fs/promises";
import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { readCompositeCampaignCliJsonFile, readCompositeCampaignCliTextFile } from "./composite-campaign-cli-input.js";
import { handoffCompositeCampaign } from "./composite-campaign-handoff.js";
import { assertCompositeCampaignHandoffWorkdir } from "./composite-campaign-handoff-artifacts.js";
import { assertOwnedCompositeCampaignHandoffInstall } from "./composite-campaign-handoff-install.js";
import { resolveExistingCompositeCampaignExecutionPath } from "./composite-campaign-execution-path.js";
import { bindGoalCas } from "./composite-campaign-lifecycle-store.js";
import { preflightCompositeCampaignPacket } from "./composite-campaign-preflight.js";
import { publishProjectionCas } from "./composite-campaign-projection-store.js";
import { recordCompositeCampaignResult } from "./composite-campaign-result.js";
import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import { loadVerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import {
  applyScopeFitCas,
  createCampaign,
  createPacketRevisionCas
} from "./composite-campaign-store.js";
import {
  COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
  SCOPE_FIT_RESULT_SCHEMA_VERSION,
  type CompositeCampaignLoadedSnapshotV1,
  type CompositeCampaignSliceV1
} from "./composite-campaign-types.js";
import { findCompositeCampaignPacketSecrets } from "./composite-campaign-security.js";

export function compositeCampaignContract() {
  return {
    contract: COMPOSITE_INPUT_CONTRACT,
    schemas: {
      scope_fit: SCOPE_FIT_RESULT_SCHEMA_VERSION,
      authoring_packet: COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
      campaign: COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
      event: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
      binding: COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION
    }
  };
}

export async function createCompositeCampaignFromFile(
  projectRoot: string,
  input: { campaign_id: string; request_file: string }
) {
  const request = await readCompositeCampaignCliTextFile(projectRoot, input.request_file);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  return createCampaign(projectRoot, {
    campaign_id: campaignId,
    request,
    operation_id: operationId("create", { campaign_id: campaignId, request_sha256: sha256Hex(request) })
  });
}

export async function applyCompositeCampaignScopeFromFile(
  projectRoot: string,
  input: { campaign_path: string; input_file: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  const scope = await readCompositeCampaignCliJsonFile(projectRoot, input.input_file);
  return applyScopeFitCas(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    scope_fit: scope,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId("scope", scope)
  });
}

export async function applyCompositeCampaignPacketFromFile(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string; input_file: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  const sliceId = validateCompositeSfcId(input.slice_id);
  const packet = await readCompositeCampaignCliJsonFile(projectRoot, input.input_file);
  if (!packet || typeof packet !== "object" || Array.isArray(packet) || (packet as Record<string, unknown>).slice_id !== sliceId) {
    throw new Error("Composite campaign packet slice_id must match --slice");
  }
  return createPacketRevisionCas(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    packet,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId("packet", packet)
  });
}

export async function renderCompositeCampaignCurrentRevision(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  const sliceId = validateCompositeSfcId(input.slice_id);
  const slice = snapshot.campaign.slices[sliceId];
  if (!slice?.current_revision) throw new Error("Composite campaign render requires an authored current revision");
  return publishProjectionCas(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    slice_id: sliceId,
    revision: slice.current_revision,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId("render", { slice_id: sliceId, revision: slice.current_revision })
  });
}

export async function preflightCompositeCampaignCurrentRevision(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  const sliceId = validateCompositeSfcId(input.slice_id);
  const slice = snapshot.campaign.slices[sliceId];
  if (!slice?.current_revision) throw new Error("Composite campaign preflight requires an authored current revision");
  const packetPath = snapshot.paths.revision_files(sliceId, slice.current_revision).authoring_packet;
  const packet = parseStrictJson((await readCompositeCampaignRegularFile(
    projectRoot, packetPath, "Composite campaign preflight authoring packet"
  )).content);
  return preflightCompositeCampaignPacket(packet);
}

export async function nextCompositeCampaignSlice(projectRoot: string, campaignPath: string) {
  const snapshot = await campaignSnapshot(projectRoot, campaignPath);
  const scope = snapshot.campaign.scope_fit;
  if (!scope) return nextReport("scope_fit_required", null, []);
  if (scope.decision === "not_long_task") return nextReport("not_long_task", null, []);
  if (scope.decision_required) return nextReport("decision_required", null, scope.decision_required.candidates);
  const selected = Object.values(snapshot.campaign.slices).find((slice) => slice?.selection_status === "selected");
  if (selected && !terminal(selected)) return nextReport("selected", selected.slice_id, []);
  const accepted = new Set(Object.values(snapshot.campaign.slices)
    .filter((slice) => slice?.result_projection === "accept").map((slice) => slice!.slice_id));
  const ready = Object.values(snapshot.campaign.slices).filter((slice): slice is CompositeCampaignSliceV1 =>
    Boolean(slice && slice.selection_status === "candidate" && slice.depends_on.every((id) => accepted.has(id))));
  if (ready.length === 0) return nextReport("no_ready_slice", null, []);
  const priority = Math.min(...ready.map((slice) => slice.priority));
  const frontier = ready.filter((slice) => slice.priority === priority).sort((a, b) => a.slice_id.localeCompare(b.slice_id));
  return frontier.length === 1
    ? nextReport("recommended", frontier[0]!.slice_id, [])
    : nextReport("decision_required", null, frontier.map((slice) => slice.slice_id));
}

export async function handoffCompositeCampaignFromPath(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  return handoffCompositeCampaign(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    slice_id: validateCompositeSfcId(input.slice_id)
  });
}

export async function startCompositeCampaignGoal(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string; goal_id: string }
): Promise<CompositeCampaignLoadedSnapshotV1> {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  const sliceId = validateCompositeSfcId(input.slice_id);
  const goalId = safeGoalId(input.goal_id);
  const binding = snapshot.campaign.slices[sliceId]?.binding;
  if (!binding) throw new Error("Composite campaign start requires a handoff-ready binding");
  if (binding.goal) {
    if (binding.goal.goal_id === goalId) {
      try {
        await assertStartWorkdir(projectRoot, binding, false);
        return publicSnapshot(snapshot);
      } catch {
        await handoffCompositeCampaign(projectRoot, { campaign_id: snapshot.campaign.campaign_id, slice_id: sliceId });
        return publicSnapshot(await loadVerifiedCompositeCampaignSnapshot(projectRoot, snapshot.campaign.campaign_id));
      }
    }
    throw new Error("Composite campaign binding already has a different Goal ID");
  }
  await assertStartWorkdir(projectRoot, binding, true);
  return bindGoalCas(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    slice_id: sliceId,
    goal_id: goalId,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId("goal", { binding_id: binding.binding_id, goal_id: goalId })
  });
}

async function assertStartWorkdir(
  projectRoot: string,
  binding: NonNullable<CompositeCampaignSliceV1["binding"]>,
  requirePristine: boolean
): Promise<void> {
  const paths = await resolveExistingCompositeCampaignExecutionPath(projectRoot, binding.workdir);
  if (requirePristine) {
    await assertCompositeCampaignHandoffWorkdir(paths.final_path, binding);
    await assertOwnedCompositeCampaignHandoffInstall(paths.final_path, binding);
    return;
  }
  const state = JSON.parse(await readFile(path.join(paths.final_path, "task-state.json"), "utf8")) as {
    meta?: { task_id?: string };
  };
  if (state.meta?.task_id !== binding.task.task_id) throw new Error("Started Goal workdir task_id differs from its binding");
}

export async function recordCompositeCampaignResultFromPath(
  projectRoot: string,
  input: { campaign_path: string; slice_id: string; workdir: string }
) {
  const snapshot = await campaignSnapshot(projectRoot, input.campaign_path);
  return recordCompositeCampaignResult(projectRoot, {
    campaign_id: snapshot.campaign.campaign_id,
    slice_id: validateCompositeSfcId(input.slice_id),
    workdir: input.workdir
  });
}

async function campaignSnapshot(projectRoot: string, suppliedPath: string) {
  const resolved = path.resolve(projectRoot, suppliedPath);
  const campaignId = validateCompositeCampaignId(path.basename(resolved));
  return loadVerifiedCompositeCampaignSnapshot(projectRoot, campaignId, resolved);
}

function operationId(prefix: string, value: unknown): string {
  return `${prefix}:${sha256Hex(canonicalJson(value)).slice(0, 48)}`;
}
function nextReport(status: string, sliceId: string | null, candidates: string[]) {
  return { schema_version: "composite-campaign-next-v1", status, slice_id: sliceId, candidates };
}
function terminal(slice: CompositeCampaignSliceV1): boolean {
  return ["accept", "blocked", "reject"].includes(slice.result_projection);
}
function safeGoalId(value: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new Error("Composite campaign goal_id must be one safe printable identifier of at most 128 characters");
  }
  if (findCompositeCampaignPacketSecrets(value).length > 0) {
    throw new Error("Composite campaign goal_id must not contain secret or credential material");
  }
  return value;
}
function publicSnapshot(snapshot: Awaited<ReturnType<typeof loadVerifiedCompositeCampaignSnapshot>>): CompositeCampaignLoadedSnapshotV1 {
  return {
    campaign: snapshot.campaign,
    raw_manifest: snapshot.raw_manifest,
    manifest_etag_sha256: snapshot.manifest_etag_sha256,
    generation: snapshot.generation
  };
}
