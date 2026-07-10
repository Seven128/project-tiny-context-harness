import { lstat, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { canonicalYaml, parseStrictJson } from "./composite-campaign-codec.js";
import {
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { preflightCompositeCampaignPacket } from "./composite-campaign-preflight.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import type { VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import {
  applyCompositeScopeFitTransition,
  createCompositePacketRevisionTransition,
  publishCompositeProjectionTransition
} from "./composite-campaign-store-transitions.js";
import type { CompositeCampaignV1 } from "./composite-campaign-types.js";
import {
  bindCompositeCampaignGoalTransition,
  projectCompositeCampaignResultTransition,
  publishCompositeCampaignHandoffTransition
} from "./composite-campaign-lifecycle-transitions.js";
import { validateCompositeCampaignEventV1 } from "./composite-campaign-schema.js";

export function assertMarkerContentIsNewToOldManifest(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker
): void {
  if (!marker.content) return;
  const revision = snapshot.campaign.slices[marker.content.slice_id]?.revisions[marker.content.revision - 1];
  if (isCompositeCampaignProjectionMarkerContent(marker.content)) {
    if (!revision || revision.projections !== null) {
      throw new Error("Projection marker must target one existing unprojected old-manifest revision");
    }
  } else if (revision) {
    throw new Error("Transaction marker content revision is already referenced by the old manifest");
  }
}

export async function verifiedCompositeCampaignSuffixBytes(
  handle: FileHandle,
  prefixBytes: number,
  expected: Buffer | null
): Promise<number | null> {
  const size = (await handle.stat()).size;
  if (size < prefixBytes) return null;
  const suffixBytes = size - prefixBytes;
  if (suffixBytes === 0) return 0;
  if (!expected || suffixBytes > expected.length) return null;
  const suffix = Buffer.alloc(suffixBytes);
  let offset = 0;
  while (offset < suffix.length) {
    const read = await handle.read(suffix, offset, suffix.length - offset, prefixBytes + offset);
    if (read.bytesRead === 0) return null;
    offset += read.bytesRead;
  }
  return expected.subarray(0, suffix.length).equals(suffix) ? suffixBytes : null;
}

export async function assertPreparedCompositeCampaignTransition(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  nextCampaign: CompositeCampaignV1,
  eventLine: string,
  projectRoot: string
): Promise<void> {
  const preparedEvent = validateCompositeCampaignEventV1(parseStrictJson(eventLine.slice(0, -1)));
  const transition = marker.kind === "scope_fit_applied"
    ? applyCompositeScopeFitTransition(
      snapshot.campaign,
      nextCampaign.scope_fit,
      marker.operation_id,
      nextCampaign.updated_at
    )
    : marker.kind === "packet_revision_created" ? createCompositePacketRevisionTransition(
      snapshot.campaign,
      parseStrictJson(await preparedPacketContent(snapshot, marker, projectRoot)),
      marker.operation_id,
      nextCampaign.updated_at
    ) : marker.kind === "projection_published" ? publishCompositeProjectionTransition(
      snapshot.campaign,
      marker.content!.slice_id,
      marker.content!.revision,
      await preparedProjection(snapshot, marker, projectRoot),
      marker.operation_id,
      nextCampaign.updated_at
    ) : preparedLifecycleTransition(snapshot, marker, nextCampaign, preparedEvent);
  if (canonicalYaml(transition.campaign) !== canonicalYaml(nextCampaign) ||
    transition.event_line !== eventLine || transition.transaction_id !== marker.transaction_id ||
    transition.event_line_sha256 !== marker.next.event_sha256) {
    throw new Error("Prepared transaction does not exactly project from the committed campaign state");
  }
}

function preparedLifecycleTransition(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  nextCampaign: CompositeCampaignV1,
  event: ReturnType<typeof validateCompositeCampaignEventV1>
) {
  if (!event.slice_id) throw new Error("Prepared lifecycle event must identify one slice");
  const binding = nextCampaign.slices[event.slice_id]?.binding;
  if (!binding) throw new Error("Prepared lifecycle transition must project one binding");
  if (marker.kind === "handoff_published") {
    return publishCompositeCampaignHandoffTransition(
      snapshot.campaign, binding, marker.operation_id, nextCampaign.updated_at
    );
  }
  if (marker.kind === "goal_bound") {
    if (!binding.goal) throw new Error("Prepared Goal transition is missing its Goal binding");
    return bindCompositeCampaignGoalTransition(
      snapshot.campaign, event.slice_id, binding.goal.goal_id, marker.operation_id, nextCampaign.updated_at
    );
  }
  if (marker.kind === "result_projected") {
    if (!binding.result) throw new Error("Prepared result transition is missing its result binding");
    return projectCompositeCampaignResultTransition(
      snapshot.campaign, event.slice_id, binding.result, marker.operation_id, nextCampaign.updated_at
    );
  }
  throw new Error(`Unsupported prepared lifecycle mutation: ${marker.kind}`);
}

async function preparedPacketContent(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  projectRoot: string
): Promise<string> {
  const content = marker.content!;
  if (isCompositeCampaignProjectionMarkerContent(content)) {
    throw new Error("Prepared packet content cannot be read from a projection marker");
  }
  const root = snapshot.paths.campaign_root;
  const finalPacket = path.join(root, ...content.packet_file.split("/"));
  const stagePacket = path.join(root, ...content.staged_directory.split("/"), "authoring-packet.json");
  const packetPath = await exists(finalPacket) ? finalPacket : stagePacket;
  return (await readCompositeCampaignRegularFile(
    projectRoot,
    packetPath,
    "Prepared composite campaign packet",
    content.packet_bytes
  )).content;
}

async function preparedProjection(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  projectRoot: string
) {
  const content = marker.content!;
  if (!isCompositeCampaignProjectionMarkerContent(content)) {
    throw new Error("Prepared projection requires projection marker content");
  }
  const packetPath = path.join(snapshot.paths.campaign_root, ...content.final_directory.split("/"), "authoring-packet.json");
  const packet = parseStrictJson((await readCompositeCampaignRegularFile(
    projectRoot, packetPath, "Prepared projection authoring packet", content.packet_bytes
  )).content);
  const report = preflightCompositeCampaignPacket(packet);
  if (!report.ok || !report.rendered_bundle) throw new Error("Prepared projection packet no longer passes strict campaign preflight");
  if (report.rendered_bundle.bundle_sha256 !== content.bundle_sha256) {
    throw new Error("Prepared projection bundle hash does not match its transaction marker");
  }
  if (report.rendered_bundle.packet_sha256 !== content.packet_sha256) {
    throw new Error("Prepared projection packet hash does not match its transaction marker");
  }
  return report.rendered_bundle;
}

async function exists(target: string): Promise<boolean> {
  try { await lstat(target); return true; } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
