import { lstat } from "node:fs/promises";
import path from "node:path";
import { canonicalYaml, parseStrictJson, parseStrictYaml, sha256Hex } from "./composite-campaign-codec.js";
import { encodeCompositeCampaignEventLine } from "./composite-campaign-events.js";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  expectedCompositeCampaignMarkerPaths,
  isCompositeCampaignProjectionMarkerContent,
  parseCompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import { validateCompositeCampaignV1, validateCompositeCampaignEventV1 } from "./composite-campaign-schema.js";
import {
  executeCompositeCampaignTransaction
} from "./composite-campaign-atomic.js";
import {
  cleanupCompositeCampaignTransaction,
  COMPOSITE_CAMPAIGN_TRANSACTION_MARKER
} from "./composite-campaign-transaction-cleanup.js";
import {
  exactRegularFile,
  hasCode
} from "./composite-campaign-atomic-io.js";
import type { CompositeCampaignStoreDependencies } from "./composite-campaign-store-create.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import {
  loadVerifiedCompositeCampaignSnapshot,
  type VerifiedCompositeCampaignSnapshot
} from "./composite-campaign-store-read.js";
import {
  assertMarkerContentIsNewToOldManifest,
  assertPreparedCompositeCampaignTransition
} from "./composite-campaign-recovery-validation.js";
import { rollbackVerifiableCompositeCampaignTransaction } from "./composite-campaign-recovery-cleanup.js";

export async function recoverCompositeCampaignTransaction(
  snapshot: VerifiedCompositeCampaignSnapshot,
  lock: CompositeCampaignLock,
  dependencies: CompositeCampaignStoreDependencies
): Promise<boolean> {
  const root = snapshot.paths.campaign_root;
  const markerPath = path.join(root, COMPOSITE_CAMPAIGN_TRANSACTION_MARKER);
  await assertCompositeCampaignLockOwner(lock);
  if (!(await pathExists(markerPath))) {
    if (snapshot.event_file_bytes !== snapshot.committed_event_bytes) {
      throw new Error("Composite campaign has an event suffix without a transaction marker");
    }
    return false;
  }
  const rawMarker = (await readCompositeCampaignRegularFile(
    lock.project_root, markerPath, "Composite campaign transaction marker"
  )).content;
  const marker = parseCompositeCampaignTransactionMarker(rawMarker);
  expectedCompositeCampaignMarkerPaths(marker);
  await assertMarkerPathsSafe(snapshot, marker, lock.project_root);
  const currentHash = snapshot.manifest_etag_sha256;
  if (currentHash === marker.next.manifest_sha256) {
    verifyCommittedProjection(snapshot, marker);
    await assertCompositeCampaignLockOwner(lock);
    await cleanupCompositeCampaignTransaction(marker, root, lock.project_root);
    return true;
  }
  if (currentHash !== marker.old.manifest_etag_sha256) {
    throw new Error("Composite campaign manifest matches neither side of the pending transaction");
  }
  verifyOldProjection(snapshot, marker);
  assertMarkerContentIsNewToOldManifest(snapshot, marker);
  try {
    const nextManifestPath = path.join(root, marker.next.manifest_temp);
    const nextManifest = await readCompositeCampaignRegularFile(
      lock.project_root, nextManifestPath, "Prepared composite campaign manifest"
    );
    if (sha256Hex(nextManifest.raw) !== marker.next.manifest_sha256) {
      throw new Error("Prepared composite campaign manifest hash does not match marker");
    }
    const nextCampaign = validateCompositeCampaignV1(parseStrictYaml(nextManifest.content));
    if (canonicalYaml(nextCampaign) !== nextManifest.content || nextCampaign.generation !== snapshot.generation + 1 ||
      nextCampaign.event_cursor.sequence !== snapshot.generation + 1 ||
      nextCampaign.event_cursor.last_event_sha256 !== marker.next.event_sha256 ||
      nextCampaign.campaign_id !== snapshot.campaign.campaign_id) {
      throw new Error("Prepared composite campaign manifest does not represent the exact next state");
    }
    const eventLine = await verifyPreparedEvent(snapshot, marker, lock.project_root);
    await verifyPreparedContent(snapshot, marker, nextCampaign, lock.project_root);
    await assertPreparedCompositeCampaignTransition(snapshot, marker, nextCampaign, eventLine, lock.project_root);
    await executeCompositeCampaignTransaction(marker, snapshot, lock, dependencies);
  } catch (error) {
    const current = await loadVerifiedCompositeCampaignSnapshot(
      lock.project_root, snapshot.campaign.campaign_id
    );
    if (current.manifest_etag_sha256 === marker.next.manifest_sha256) {
      verifyCommittedProjection(current, marker);
      throw error;
    }
    if (current.manifest_etag_sha256 !== marker.old.manifest_etag_sha256) {
      throw new Error("Composite campaign manifest changed while recovery was executing", { cause: error });
    }
    verifyOldProjection(current, marker);
    assertMarkerContentIsNewToOldManifest(current, marker);
    if (!(await rollbackVerifiableCompositeCampaignTransaction(current, marker, lock))) throw error;
  }
  return true;
}

function verifyOldProjection(snapshot: VerifiedCompositeCampaignSnapshot, marker: ReturnType<typeof parseCompositeCampaignTransactionMarker>): void {
  if (snapshot.generation !== marker.old.generation ||
    snapshot.campaign.event_cursor.sequence !== marker.old.event_sequence ||
    snapshot.campaign.event_cursor.last_event_sha256 !== marker.old.event_sha256 ||
    snapshot.committed_event_bytes !== marker.old.event_prefix_bytes) {
    throw new Error("Pending transaction old projection does not match committed campaign authority");
  }
}

function verifyCommittedProjection(snapshot: VerifiedCompositeCampaignSnapshot, marker: ReturnType<typeof parseCompositeCampaignTransactionMarker>): void {
  const event = snapshot.events.at(-1);
  if (!event || snapshot.generation !== marker.old.generation + 1 || event.transaction_id !== marker.transaction_id ||
    event.operation_id !== marker.operation_id || event.kind !== marker.kind ||
    snapshot.campaign.event_cursor.last_event_sha256 !== marker.next.event_sha256) {
    throw new Error("Committed campaign state does not match pending transaction marker");
  }
  if (marker.content) {
    const slice = snapshot.campaign.slices[marker.content.slice_id];
    const revision = slice?.revisions[marker.content.revision - 1];
    if (isCompositeCampaignProjectionMarkerContent(marker.content)) {
      if (!revision?.projections || revision.packet_sha256 !== marker.content.packet_sha256 ||
        revision.projections.bundle_sha256 !== marker.content.bundle_sha256) {
        throw new Error("Committed campaign projection reference does not match pending transaction marker");
      }
    } else if (!revision || revision.packet_sha256 !== marker.content.packet_sha256) {
      throw new Error("Committed campaign packet reference does not match pending transaction marker");
    }
  }
}

async function verifyPreparedEvent(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: ReturnType<typeof parseCompositeCampaignTransactionMarker>,
  projectRoot: string
): Promise<string> {
  const eventPath = path.join(snapshot.paths.campaign_root, marker.next.event_temp);
  const raw = (await readCompositeCampaignRegularFile(
    projectRoot, eventPath, "Prepared composite campaign event", marker.next.event_bytes
  )).content;
  const event = validateCompositeCampaignEventV1(parseStrictJson(raw.slice(0, -1)));
  const encoded = encodeCompositeCampaignEventLine(event);
  if (raw !== encoded.line || encoded.sha256 !== marker.next.event_sha256 || encoded.bytes !== marker.next.event_bytes ||
    event.transaction_id !== marker.transaction_id || event.operation_id !== marker.operation_id ||
    event.kind !== marker.kind || event.sequence !== marker.old.event_sequence + 1 ||
    event.previous_event_sha256 !== marker.old.event_sha256 || event.campaign_id !== snapshot.campaign.campaign_id) {
    throw new Error("Prepared composite campaign event does not match transaction marker");
  }
  return raw;
}

async function verifyPreparedContent(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: ReturnType<typeof parseCompositeCampaignTransactionMarker>,
  nextCampaign: ReturnType<typeof validateCompositeCampaignV1>,
  projectRoot: string
): Promise<void> {
  if (!marker.content) return;
  const content = marker.content;
  const revision = nextCampaign.slices[content.slice_id]?.revisions[content.revision - 1];
  const root = snapshot.paths.campaign_root;
  if (isCompositeCampaignProjectionMarkerContent(content)) {
    if (!revision?.projections || revision.packet_sha256 !== content.packet_sha256 ||
      revision.projections.bundle_sha256 !== content.bundle_sha256) {
      throw new Error("Prepared projection content is not referenced by next campaign manifest");
    }
    const expected = {
      product_architecture_source: revision.projections.product_architecture_source_sha256,
      technical_realization_plan: revision.projections.technical_realization_plan_sha256,
      acceptance_checklist: revision.projections.acceptance_checklist_sha256
    };
    for (const [id, claim] of Object.entries(content.projection_files)) {
      if (claim.sha256 !== expected[id as keyof typeof expected]) {
        throw new Error("Prepared projection claim does not match next campaign manifest");
      }
      const final = path.join(root, ...content.final_directory.split("/"), claim.file);
      const stage = path.join(root, ...claim.staged_directory.split("/"), claim.file);
      await assertCompositeCampaignPathSafe(projectRoot, final);
      await assertCompositeCampaignPathSafe(projectRoot, stage);
      if (!(await exactRegularFile(final, claim.sha256, claim.bytes)) &&
        !(await exactRegularFile(stage, claim.sha256, claim.bytes))) {
        throw new Error("Prepared projection content is missing or differs from transaction marker");
      }
    }
    return;
  }
  if (!revision || revision.packet_sha256 !== content.packet_sha256) {
    throw new Error("Prepared packet content is not referenced by next campaign manifest");
  }
  const finalPacket = path.join(root, ...content.packet_file.split("/"));
  const stagePacket = path.join(root, ...content.staged_directory.split("/"), "authoring-packet.json");
  await assertCompositeCampaignPathSafe(projectRoot, finalPacket);
  await assertCompositeCampaignPathSafe(projectRoot, stagePacket);
  if (!(await exactRegularFile(finalPacket, content.packet_sha256, content.packet_bytes)) &&
    !(await exactRegularFile(stagePacket, content.packet_sha256, content.packet_bytes))) {
    throw new Error("Prepared packet content is missing or differs from transaction marker");
  }
}

async function assertMarkerPathsSafe(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: ReturnType<typeof parseCompositeCampaignTransactionMarker>,
  projectRoot: string
): Promise<void> {
  const root = snapshot.paths.campaign_root;
  const relatives = [marker.next.manifest_temp, marker.next.event_temp];
  if (marker.content) {
    relatives.push(marker.content.final_directory);
    if (isCompositeCampaignProjectionMarkerContent(marker.content)) {
      for (const claim of Object.values(marker.content.projection_files)) {
        relatives.push(claim.staged_directory, `${marker.content.final_directory}/${claim.file}`);
      }
    } else {
      relatives.push(marker.content.staged_directory, marker.content.packet_file);
    }
  }
  for (const relative of relatives) {
    await assertCompositeCampaignPathSafe(projectRoot, path.join(root, ...relative.split("/")));
  }
}

async function pathExists(target: string): Promise<boolean> {
  try { await lstat(target); return true; } catch (error) { if (hasCode(error, "ENOENT")) return false; throw error; }
}
