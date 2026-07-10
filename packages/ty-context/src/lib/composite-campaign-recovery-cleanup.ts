import { lstat } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  encodeCompositeCampaignTransactionMarker,
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  assertCompositeRegularFileIdentity,
  compositeRegularFileIdentity,
  directoryEntries,
  exactRegularFile,
  hasCode,
  openBoundCompositeRegularFile,
  syncCompositeDirectory
} from "./composite-campaign-atomic-io.js";
import {
  removeOwnedCompositeRegularFile,
  removeOwnedCompositeSingleFileDirectory
} from "./composite-campaign-owned-removal.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import type { VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import { verifiedCompositeCampaignSuffixBytes } from "./composite-campaign-recovery-validation.js";
import {
  COMPOSITE_CAMPAIGN_TRANSACTION_MARKER,
  compositeCampaignTransactionMarkerTempPath
} from "./composite-campaign-transaction-cleanup.js";

export async function rollbackVerifiableCompositeCampaignTransaction(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  lock: CompositeCampaignLock
): Promise<boolean> {
  const root = snapshot.paths.campaign_root;
  const eventTemp = path.join(root, marker.next.event_temp);
  const manifestTemp = path.join(root, marker.next.manifest_temp);
  const markerPath = path.join(root, COMPOSITE_CAMPAIGN_TRANSACTION_MARKER);
  const markerTemp = compositeCampaignTransactionMarkerTempPath(root, marker);
  await assertCompositeCampaignLockOwner(lock);
  const eventTempExists = await ownedFileExists(
    lock.project_root, eventTemp, marker.next.event_sha256, marker.next.event_bytes
  );
  if (eventTempExists === false) return false;
  const manifestBytes = await ownedManifestBytes(lock.project_root, manifestTemp, marker.next.manifest_sha256);
  if (manifestBytes === false) return false;
  const markerRaw = encodeCompositeCampaignTransactionMarker(marker);
  const markerHash = sha256Hex(markerRaw);
  const markerBytes = Buffer.byteLength(markerRaw);
  if (!await exactRegularFile(markerPath, markerHash, markerBytes)) return false;
  if (await pathExists(markerTemp) && !await exactRegularFile(markerTemp, markerHash, markerBytes)) return false;
  const ownedStages = marker.content ? await ownedStagesForRollback(root, marker, lock) : [];
  if (ownedStages === false) return false;
  const expectedEvent = eventTempExists ? (await readCompositeCampaignRegularFile(
    lock.project_root, eventTemp, "Prepared composite campaign event", marker.next.event_bytes
  )).raw : null;
  if (!await truncateVerifiedEventSuffix(snapshot, marker, expectedEvent, lock)) return false;
  if (!await removeOwnedFile(eventTemp, marker.next.event_sha256, marker.next.event_bytes,
    marker.token, "rollback-event", lock)) return false;
  if (!await removeOwnedFile(manifestTemp, marker.next.manifest_sha256,
    manifestBytes || 0, marker.token, "rollback-manifest", lock)) return false;
  if (marker.content) {
    for (const claim of ownedStages) {
      await assertCompositeCampaignLockOwner(lock);
      const removed = await removeOwnedCompositeSingleFileDirectory({
        project_root: lock.project_root, target: claim.path, file_name: claim.file,
        sha256: claim.sha256, bytes: claim.bytes,
        token: marker.token, purpose: "rollback-stage"
      });
      if (!removed) return false;
    }
  }
  if (!await removeOwnedFile(markerTemp, markerHash, markerBytes,
    marker.token, "rollback-marker-temp", lock)) return false;
  if (!await removeOwnedFile(markerPath, markerHash, markerBytes,
    marker.token, "rollback-marker", lock)) return false;
  await assertCompositeCampaignLockOwner(lock);
  await syncCompositeDirectory(root);
  return true;
}

async function truncateVerifiedEventSuffix(
  snapshot: VerifiedCompositeCampaignSnapshot,
  marker: CompositeCampaignTransactionMarker,
  expected: Buffer | null,
  lock: CompositeCampaignLock
): Promise<boolean> {
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, snapshot.paths.events_path);
  const identity = await compositeRegularFileIdentity(snapshot.paths.events_path);
  const handle = await openBoundCompositeRegularFile(snapshot.paths.events_path, identity);
  try {
    const suffixBytes = await verifiedCompositeCampaignSuffixBytes(
      handle, marker.old.event_prefix_bytes, expected
    );
    if (suffixBytes === null) return false;
    if (suffixBytes > 0) {
      await assertCompositeCampaignPathSafe(lock.project_root, snapshot.paths.events_path);
      await assertCompositeRegularFileIdentity(snapshot.paths.events_path, identity);
      await assertCompositeCampaignLockOwner(lock);
      await handle.truncate(marker.old.event_prefix_bytes);
      await handle.sync();
      await assertCompositeRegularFileIdentity(snapshot.paths.events_path, identity);
    }
    return true;
  } finally { await handle.close(); }
}

interface OwnedStageClaim { path: string; file: string; sha256: string; bytes: number }

async function ownedStagesForRollback(
  root: string,
  marker: CompositeCampaignTransactionMarker,
  lock: CompositeCampaignLock
): Promise<OwnedStageClaim[] | false> {
  const content = marker.content!;
  if (isCompositeCampaignProjectionMarkerContent(content)) {
    const result: OwnedStageClaim[] = [];
    for (const claim of Object.values(content.projection_files)) {
      const final = path.join(root, ...content.final_directory.split("/"), claim.file);
      await assertCompositeCampaignPathSafe(lock.project_root, final);
      if (await pathExists(final)) return false;
      const stage = path.join(root, ...claim.staged_directory.split("/"));
      await assertCompositeCampaignPathSafe(lock.project_root, stage);
      if (!await pathExists(stage)) continue;
      const entries = await directoryEntries(stage);
      if (entries?.length !== 1 || entries[0] !== claim.file ||
        !await exactRegularFile(path.join(stage, claim.file), claim.sha256, claim.bytes)) return false;
      result.push({ path: stage, file: claim.file, sha256: claim.sha256, bytes: claim.bytes });
    }
    return result;
  }
  const final = path.join(root, ...content.final_directory.split("/"));
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, final);
  if (await pathExists(final)) return false;
  const stage = path.join(root, ...content.staged_directory.split("/"));
  await assertCompositeCampaignPathSafe(lock.project_root, stage);
  if (!await pathExists(stage)) return [];
  const entries = await directoryEntries(stage);
  const packet = path.join(stage, "authoring-packet.json");
  return entries?.length === 1 && entries[0] === "authoring-packet.json" &&
    await exactRegularFile(packet, content.packet_sha256, content.packet_bytes)
    ? [{ path: stage, file: "authoring-packet.json", sha256: content.packet_sha256, bytes: content.packet_bytes }]
    : false;
}

async function ownedFileExists(
  projectRoot: string,
  target: string,
  hash: string,
  bytes: number
): Promise<boolean | null> {
  await assertCompositeCampaignPathSafe(projectRoot, target);
  if (!await pathExists(target)) return null;
  return await exactRegularFile(target, hash, bytes);
}

async function ownedManifestBytes(
  projectRoot: string,
  target: string,
  hash: string
): Promise<number | null | false> {
  await assertCompositeCampaignPathSafe(projectRoot, target);
  if (!await pathExists(target)) return null;
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.isSymbolicLink() ||
    !await exactRegularFile(target, hash, metadata.size)) return false;
  return metadata.size;
}

async function removeOwnedFile(
  target: string,
  hash: string,
  bytes: number,
  token: string,
  purpose: string,
  lock: CompositeCampaignLock
): Promise<boolean> {
  await assertCompositeCampaignLockOwner(lock);
  return await removeOwnedCompositeRegularFile({
    project_root: lock.project_root, target, sha256: hash, bytes, token, purpose
  });
}

async function pathExists(target: string): Promise<boolean> {
  try { await lstat(target); return true; }
  catch (error) { if (hasCode(error, "ENOENT")) return false; throw error; }
}
