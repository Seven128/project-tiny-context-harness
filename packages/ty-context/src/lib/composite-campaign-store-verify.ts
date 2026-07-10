import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { compositeCampaignTransactionId } from "./composite-campaign-events.js";
import { assertCompositeCampaignPathSafe, type CompositeCampaignPaths } from "./composite-campaign-paths.js";
import { validateCompositeAuthoringPacketV1 } from "./composite-campaign-schema.js";
import { assertCompositeCampaignPacketSafe } from "./composite-campaign-security.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import type {
  CompositeCampaignEventV1,
  CompositeCampaignRevisionV1,
  CompositeCampaignSliceV1,
  CompositeCampaignV1
} from "./composite-campaign-types.js";

export async function verifyCompositeCampaignReferences(
  projectRoot: string,
  paths: CompositeCampaignPaths,
  campaign: CompositeCampaignV1
): Promise<void> {
  for (const slice of Object.values(campaign.slices).filter(isSlice)) {
    for (const revision of slice.revisions) {
      await verifyPacket(projectRoot, paths, campaign, slice, revision);
      if (revision.projections) await verifyProjections(projectRoot, paths, slice, revision);
    }
  }
}

export function verifyCompositeCampaignEventProjection(
  campaign: CompositeCampaignV1,
  events: readonly CompositeCampaignEventV1[]
): void {
  if (events.length !== campaign.event_cursor.sequence) throw new Error("Committed event count does not match campaign cursor");
  const transactions = new Set<string>();
  for (const event of events) {
    if (transactions.has(event.transaction_id)) throw new Error("Committed composite campaign transaction_id is duplicated");
    transactions.add(event.transaction_id);
  }
  const created = events[0];
  if (created?.kind !== "campaign_created" || created.payload.request_sha256 !== campaign.request.sha256) {
    throw new Error("campaign_created event does not match immutable request authority");
  }
  const creationPayloadHash = sha256Hex(canonicalJson({
    request_sha256: campaign.request.sha256,
    request_bytes: campaign.request.bytes,
    redaction_count: created.payload.redaction_count
  }));
  if (created.transaction_id !== compositeCampaignTransactionId(
    campaign.campaign_id, "campaign_created", created.operation_id, creationPayloadHash
  )) {
    throw new Error("Campaign creation transaction does not match its immutable request fingerprint");
  }
  const scopeEvents = eventsOfKind(events, "scope_fit_applied");
  if (!campaign.scope_fit) {
    if (scopeEvents.length !== 0) throw new Error("Campaign without Scope Fit cannot contain scope_fit_applied events");
  } else {
    const latest = scopeEvents.at(-1);
    if (!latest || latest.payload.scope_fit_sha256 !== campaign.scope_fit_sha256 ||
      latest.payload.decision !== campaign.scope_fit.decision ||
      latest.payload.selected_slice_id !== campaign.scope_fit.selected_slice_id) {
      throw new Error("Latest scope_fit_applied event does not project the current campaign Scope Fit");
    }
  }
  for (const slice of Object.values(campaign.slices).filter(isSlice)) verifySliceEvents(slice, events);
  verifyEveryEventProjectsState(campaign, events);
}

function verifyEveryEventProjectsState(
  campaign: CompositeCampaignV1,
  events: readonly CompositeCampaignEventV1[]
): void {
  for (const event of events) {
    if (event.kind === "campaign_created" || event.kind === "scope_fit_applied") continue;
    const slice = event.slice_id ? campaign.slices[event.slice_id] : undefined;
    const revision = slice && event.revision ? slice.revisions[event.revision - 1] : undefined;
    if (!slice || !revision) throw new Error(`${event.kind} event projects no referenced manifest state`);
    if (event.kind === "packet_revision_created") {
      if (event.payload.packet_sha256 !== revision.packet_sha256 ||
        event.payload.previous_packet_sha256 !== revision.previous_packet_sha256) {
        throw new Error("Packet event does not match referenced manifest revision");
      }
      continue;
    }
    if (event.kind === "projection_published") {
      if (!revision.projections || event.payload.bundle_sha256 !== revision.projections.bundle_sha256) {
        throw new Error("Projection event does not match referenced manifest revision");
      }
      continue;
    }
    const binding = slice.binding;
    if (!binding || binding.revision !== event.revision || event.payload.binding_id !== binding.binding_id) {
      throw new Error(`${event.kind} event does not match referenced manifest binding`);
    }
    if (event.kind === "handoff_published" && event.payload.binding_id !== binding.binding_id) {
      throw new Error("Handoff event does not match referenced manifest binding identity");
    }
    if (event.kind === "goal_bound" && (!binding.goal || event.payload.goal_id !== binding.goal.goal_id)) {
      throw new Error("Goal event does not match referenced manifest binding goal");
    }
    if (event.kind === "result_projected" && (!binding.result || event.payload.status !== binding.result.status ||
      event.payload.final_gate_event_sha256 !== binding.result.final_gate_event_sha256)) {
      throw new Error("Result event does not match referenced manifest binding result");
    }
  }
}

function verifySliceEvents(slice: CompositeCampaignSliceV1, events: readonly CompositeCampaignEventV1[]): void {
  for (const revision of slice.revisions) {
    const packets = eventsOfKind(events, "packet_revision_created").filter((event) =>
      event.slice_id === slice.slice_id && event.revision === revision.revision);
    if (packets.length !== 1 || packets[0]!.payload.packet_sha256 !== revision.packet_sha256 ||
      packets[0]!.payload.previous_packet_sha256 !== revision.previous_packet_sha256) {
      throw new Error(`Packet event authority mismatch for ${slice.slice_id} revision ${revision.revision}`);
    }
    if (revision.projections) {
      const projections = eventsOfKind(events, "projection_published").filter((event) =>
        event.slice_id === slice.slice_id && event.revision === revision.revision);
      if (projections.length !== 1 || projections[0]!.payload.bundle_sha256 !== revision.projections.bundle_sha256) {
        throw new Error(`Projection event authority mismatch for ${slice.slice_id} revision ${revision.revision}`);
      }
    }
  }
  const binding = slice.binding;
  if (!binding) return;
  const handoffs = eventsOfKind(events, "handoff_published").filter((event) =>
    event.slice_id === slice.slice_id && event.revision === binding.revision);
  const latestHandoff = handoffs.at(-1);
  const handoffTaskMismatch = !binding.result && latestHandoff &&
    (latestHandoff.payload.task_id !== binding.task.task_id ||
      latestHandoff.payload.task_attempt_id !== binding.task.task_attempt_id);
  if (!latestHandoff || handoffs.some((event) => event.payload.binding_id !== binding.binding_id) || handoffTaskMismatch) {
    throw new Error(`Handoff event authority mismatch for ${slice.slice_id}`);
  }
  if (binding.goal) {
    const goals = eventsOfKind(events, "goal_bound").filter((event) => event.payload.binding_id === binding.binding_id);
    if (goals.length !== 1 || goals[0]!.payload.goal_id !== binding.goal.goal_id) {
      throw new Error(`Goal event authority mismatch for ${slice.slice_id}`);
    }
  }
  if (binding.result) {
    const results = eventsOfKind(events, "result_projected").filter((event) => event.payload.binding_id === binding.binding_id);
    if (results.length !== 1 || results[0]!.payload.status !== binding.result.status ||
      results[0]!.payload.final_gate_event_sha256 !== binding.result.final_gate_event_sha256) {
      throw new Error(`Result event authority mismatch for ${slice.slice_id}`);
    }
  }
}

async function verifyPacket(
  projectRoot: string,
  paths: CompositeCampaignPaths,
  campaign: CompositeCampaignV1,
  slice: CompositeCampaignSliceV1,
  revision: CompositeCampaignRevisionV1
): Promise<void> {
  const revisionPath = paths.revision_path(slice.slice_id, revision.revision);
  const packetPath = paths.revision_files(slice.slice_id, revision.revision).authoring_packet;
  await assertCompositeCampaignPathSafe(projectRoot, revisionPath);
  const packetFile = await readCompositeCampaignRegularFile(projectRoot, packetPath, "Composite campaign authoring packet");
  const raw = packetFile.content;
  const parsed = parseStrictJson(raw);
  assertCompositeCampaignPacketSafe(parsed);
  const packet = validateCompositeAuthoringPacketV1(parsed);
  if (canonicalJson(packet) !== raw) throw new Error("Composite campaign authoring packet is not exact canonical JSON");
  if (sha256Hex(packetFile.raw) !== revision.packet_sha256) throw new Error("Composite campaign authoring packet hash does not match manifest");
  if (packet.campaign_id !== campaign.campaign_id || packet.slice_id !== slice.slice_id ||
    packet.revision !== revision.revision || packet.request_sha256 !== campaign.request.sha256 ||
    packet.previous_packet_sha256 !== revision.previous_packet_sha256 || packet.created_at !== revision.created_at ||
    packet.input_contract.contract_sha256 !== revision.input_contract_sha256 ||
    packet.input_contract.contract_sha256 !== COMPOSITE_INPUT_CONTRACT.canonical_sha256) {
    throw new Error("Composite campaign authoring packet identity does not match its immutable manifest reference");
  }
}

async function verifyProjections(
  projectRoot: string,
  paths: CompositeCampaignPaths,
  slice: CompositeCampaignSliceV1,
  revision: CompositeCampaignRevisionV1
): Promise<void> {
  const files = paths.revision_files(slice.slice_id, revision.revision);
  const expected = {
    product_architecture_source: revision.projections!.product_architecture_source_sha256,
    technical_realization_plan: revision.projections!.technical_realization_plan_sha256,
    acceptance_checklist: revision.projections!.acceptance_checklist_sha256
  };
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    const file = await readCompositeCampaignRegularFile(projectRoot, files[key], `Composite campaign ${key}`);
    if (sha256Hex(file.raw) !== expected[key]) throw new Error(`Composite campaign ${key} hash does not match manifest`);
  }
}

function isSlice(value: CompositeCampaignSliceV1 | undefined): value is CompositeCampaignSliceV1 {
  return value !== undefined;
}

function eventsOfKind<Kind extends CompositeCampaignEventV1["kind"]>(
  events: readonly CompositeCampaignEventV1[],
  kind: Kind
): Array<Extract<CompositeCampaignEventV1, { kind: Kind }>> {
  return events.filter((event): event is Extract<CompositeCampaignEventV1, { kind: Kind }> => event.kind === kind);
}
