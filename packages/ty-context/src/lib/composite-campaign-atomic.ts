import { link, lstat, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { canonicalYaml, sha256Hex } from "./composite-campaign-codec.js";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  buildCompositeCampaignTransactionMarker,
  encodeCompositeCampaignTransactionMarker,
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignMutationKind,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  assertCompositeCampaignTrackedFileSize,
  COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES
} from "./composite-campaign-security.js";
import {
  assertCompositeRegularFileIdentity,
  compositeRegularFileIdentity,
  exactRegularFile,
  openBoundCompositeRegularFile,
  removeDirectoryIfExists,
  removeFileIfExists,
  syncExactRegularFile,
  syncCompositeDirectory,
  writeExclusiveSynced,
  type CompositeRegularFileIdentity
} from "./composite-campaign-atomic-io.js";
import { removeOwnedCompositeRegularFile } from "./composite-campaign-owned-removal.js";
import type { CompositeCampaignStoreDependencies } from "./composite-campaign-store-create.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import type { VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import type { CompositeCampaignV1 } from "./composite-campaign-types.js";
import {
  cleanupCompositeCampaignTransaction,
  COMPOSITE_CAMPAIGN_TRANSACTION_MARKER,
  compositeCampaignTransactionMarkerTempPath
} from "./composite-campaign-transaction-cleanup.js";
import {
  assertInstalledCompositeCampaignPacket,
  installCompositeCampaignPacketContent
} from "./composite-campaign-packet-install.js";
import {
  assertInstalledCompositeCampaignProjection,
  installCompositeCampaignProjectionContent
} from "./composite-campaign-projection-install.js";
import {
  compositeCampaignMarkerContent,
  compositeCampaignStagedDirectories,
  stageCompositeCampaignContent,
  type CompositeCampaignAtomicContent
} from "./composite-campaign-atomic-content.js";

export async function commitCompositeCampaignTransaction(input: {
  snapshot: VerifiedCompositeCampaignSnapshot;
  next_campaign: CompositeCampaignV1;
  event_line: string;
  event_sha256: string;
  transaction_id: string;
  operation_id: string;
  kind: CompositeCampaignMutationKind;
  content: CompositeCampaignAtomicContent | null;
}, lock: CompositeCampaignLock, dependencies: CompositeCampaignStoreDependencies): Promise<void> {
  if (input.snapshot.event_file_bytes !== input.snapshot.committed_event_bytes) {
    throw new Error("Composite campaign event suffix exists without a recoverable transaction marker");
  }
  const root = input.snapshot.paths.campaign_root;
  const token = dependencies.token();
  const manifestRaw = canonicalYaml(input.next_campaign);
  assertCompositeCampaignTrackedFileSize(manifestRaw);
  const marker = markerFor(input, token, manifestRaw);
  const markerRaw = encodeCompositeCampaignTransactionMarker(marker);
  const manifestTemp = path.join(root, marker.next.manifest_temp);
  const eventTemp = path.join(root, marker.next.event_temp);
  const markerPath = path.join(root, COMPOSITE_CAMPAIGN_TRANSACTION_MARKER);
  const markerTemp = compositeCampaignTransactionMarkerTempPath(root, marker);
  let contentStaged = false;
  let eventStaged = false;
  let manifestStaged = false;
  let markerPublished = false;
  try {
    await stageCompositeCampaignContent(input.snapshot.paths.campaign_root, input.content, marker, lock.project_root);
    contentStaged = input.content !== null;
    await writeExclusiveSynced(lock.project_root, eventTemp, input.event_line);
    eventStaged = true;
    await writeExclusiveSynced(lock.project_root, manifestTemp, manifestRaw);
    manifestStaged = true;
    await writeExclusiveSynced(lock.project_root, markerTemp, markerRaw);
    await syncCompositeDirectory(root);
    if (!await syncExactRegularFile(markerTemp, sha256Hex(markerRaw), Buffer.byteLength(markerRaw))) {
      throw new Error("Composite campaign transaction marker temp changed before publication");
    }
    const markerIdentity = await compositeRegularFileIdentity(markerTemp);
    await assertCompositeCampaignPathSafe(lock.project_root, markerTemp);
    await assertCompositeCampaignPathSafe(lock.project_root, markerPath);
    await assertCompositeRegularFileIdentity(markerTemp, markerIdentity);
    await assertCompositeCampaignLockOwner(lock);
    await link(markerTemp, markerPath);
    markerPublished = true;
    if (!await exactRegularFile(markerPath, sha256Hex(markerRaw), Buffer.byteLength(markerRaw))) {
      throw new Error("Published composite campaign transaction marker differs from prepared bytes");
    }
    await assertCompositeRegularFileIdentity(markerPath, markerIdentity);
  } catch (error) {
    if (!markerPublished) {
      await removeOwnedCompositeRegularFile({
        project_root: lock.project_root, target: markerTemp, sha256: sha256Hex(markerRaw),
        bytes: Buffer.byteLength(markerRaw), token: marker.token, purpose: "transaction-marker-temp"
      }).catch(() => false);
      if (manifestStaged) await removeFileIfExists(manifestTemp);
      if (eventStaged) await removeFileIfExists(eventTemp);
      if (contentStaged && marker.content) for (const stage of compositeCampaignStagedDirectories(marker)) await removeDirectoryIfExists(path.join(root, ...stage.split("/")));
    }
    throw error;
  }
  await syncCompositeDirectory(root);
  await dependencies.checkpoint("after_marker_fsync");
  await executeCompositeCampaignTransaction(marker, input.snapshot, lock, dependencies);
}

export async function executeCompositeCampaignTransaction(
  marker: CompositeCampaignTransactionMarker,
  oldSnapshot: VerifiedCompositeCampaignSnapshot,
  lock: CompositeCampaignLock,
  dependencies: CompositeCampaignStoreDependencies
): Promise<void> {
  const root = oldSnapshot.paths.campaign_root;
  if (marker.content && isCompositeCampaignProjectionMarkerContent(marker.content)) {
    await installCompositeCampaignProjectionContent(marker, root, lock);
  } else if (marker.content) {
    await installCompositeCampaignPacketContent(marker, root, lock);
  }
  await dependencies.checkpoint("after_content_install");
  if (marker.content && isCompositeCampaignProjectionMarkerContent(marker.content)) {
    await assertInstalledCompositeCampaignProjection(marker, root, lock);
  } else if (marker.content) {
    await assertInstalledCompositeCampaignPacket(marker, root, lock);
  }
  await assertCompositeCampaignPathSafe(lock.project_root, path.join(root, marker.next.event_temp));
  const eventLine = await verifiedTemp(root, marker.next.event_temp, marker.next.event_sha256, marker.next.event_bytes);
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, oldSnapshot.paths.events_path);
  const eventIdentity = await compositeRegularFileIdentity(oldSnapshot.paths.events_path);
  await ensureEventLine(oldSnapshot, eventLine, marker.next.event_sha256, eventIdentity);
  await dependencies.checkpoint("after_event_fsync");
  await assertCompositeCampaignPathSafe(lock.project_root, oldSnapshot.paths.events_path);
  await assertCompositeRegularFileIdentity(oldSnapshot.paths.events_path, eventIdentity);
  if (marker.content && isCompositeCampaignProjectionMarkerContent(marker.content)) {
    await assertInstalledCompositeCampaignProjection(marker, root, lock);
  } else if (marker.content) {
    await assertInstalledCompositeCampaignPacket(marker, root, lock);
  }
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, oldSnapshot.paths.manifest_path);
  const manifestTemp = path.join(root, marker.next.manifest_temp);
  await assertCompositeCampaignPathSafe(lock.project_root, manifestTemp);
  const manifestTempMetadata = await lstat(manifestTemp);
  if (!manifestTempMetadata.isFile() || manifestTempMetadata.isSymbolicLink() ||
    manifestTempMetadata.size > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES ||
    !(await exactRegularFile(manifestTemp, marker.next.manifest_sha256, manifestTempMetadata.size))) {
    throw new Error("Staged campaign manifest does not match transaction marker");
  }
  const currentManifest = await readCompositeCampaignRegularFile(
    lock.project_root, oldSnapshot.paths.manifest_path, "Composite campaign manifest before commit"
  );
  const currentHash = sha256Hex(currentManifest.raw);
  if (currentHash === marker.old.manifest_etag_sha256) {
    await assertCompositeCampaignPathSafe(lock.project_root, oldSnapshot.paths.manifest_path);
    await assertCompositeCampaignPathSafe(lock.project_root, manifestTemp);
    const finalManifest = await readCompositeCampaignRegularFile(
      lock.project_root, oldSnapshot.paths.manifest_path, "Composite campaign manifest at commit point"
    );
    const finalTempMetadata = await lstat(manifestTemp);
    if (sha256Hex(finalManifest.raw) !== marker.old.manifest_etag_sha256 ||
      !finalTempMetadata.isFile() || finalTempMetadata.isSymbolicLink() ||
      !await exactRegularFile(manifestTemp, marker.next.manifest_sha256, finalTempMetadata.size)) {
      throw new Error("Composite campaign manifest commit authority changed before replace");
    }
    await assertCompositeCampaignLockOwner(lock);
    await rename(manifestTemp, oldSnapshot.paths.manifest_path);
  } else if (currentHash !== marker.next.manifest_sha256) {
    throw new Error("Campaign manifest changed outside the prepared transaction");
  }
  await dependencies.checkpoint("after_manifest_replace");
  await syncCompositeDirectory(root);
  await dependencies.checkpoint("after_directory_sync");
  await cleanupCompositeCampaignTransaction(marker, root, lock.project_root);
  await syncCompositeDirectory(root);
}

function markerFor(
  input: Parameters<typeof commitCompositeCampaignTransaction>[0],
  token: string,
  manifestRaw: string
): CompositeCampaignTransactionMarker {
  return buildCompositeCampaignTransactionMarker({
    transaction_id: input.transaction_id,
    operation_id: input.operation_id,
    kind: input.kind,
    token,
    old: {
      manifest_etag_sha256: input.snapshot.manifest_etag_sha256,
      generation: input.snapshot.generation,
      event_sequence: input.snapshot.campaign.event_cursor.sequence,
      event_sha256: input.snapshot.campaign.event_cursor.last_event_sha256,
      event_prefix_bytes: input.snapshot.committed_event_bytes
    },
    next: {
      manifest_temp: `.campaign.${token}.tmp`,
      manifest_sha256: sha256Hex(manifestRaw),
      event_temp: `.event.${token}.tmp`,
      event_sha256: input.event_sha256,
      event_bytes: Buffer.byteLength(input.event_line)
    },
    content: compositeCampaignMarkerContent(input.content, token)
  });
}

async function ensureEventLine(
  snapshot: VerifiedCompositeCampaignSnapshot,
  line: string,
  hash: string,
  identity: CompositeRegularFileIdentity
): Promise<void> {
  const handle = await openBoundCompositeRegularFile(snapshot.paths.events_path, identity);
  try {
    const metadata = await handle.stat();
    let prefixBytes = 0;
    for (const event of snapshot.events) {
      const expectedLine = Buffer.from(`${JSON.stringify(event)}\n`);
      const observedLine = Buffer.alloc(expectedLine.length);
      await readFully(handle, observedLine, prefixBytes);
      if (!observedLine.equals(expectedLine)) throw new Error("Committed event prefix changed before append");
      prefixBytes += expectedLine.length;
    }
    if (prefixBytes !== snapshot.committed_event_bytes || metadata.size < prefixBytes) {
      throw new Error("Committed event prefix byte boundary changed before append");
    }
    const expected = Buffer.from(line);
    const suffixBytes = metadata.size - prefixBytes;
    if (suffixBytes > expected.length) throw new Error("Uncommitted event suffix exceeds the prepared event line");
    const suffix = Buffer.alloc(suffixBytes);
    if (suffix.length > 0) await readFully(handle, suffix, prefixBytes);
    if (sha256Hex(expected) !== hash) throw new Error("Prepared event hash mismatch");
    if (suffix.equals(expected)) {
      await handle.sync();
      return;
    }
    if (suffix.length > 0 && !expected.subarray(0, suffix.length).equals(suffix)) {
      throw new Error("Uncommitted event suffix conflicts with prepared transaction");
    }
    if (suffix.length > 0) await handle.truncate(prefixBytes);
    let offset = 0;
    while (offset < expected.length) {
      const result = await handle.write(expected, offset, expected.length - offset, prefixBytes + offset);
      if (result.bytesWritten === 0) throw new Error("Short write while appending composite campaign event");
      offset += result.bytesWritten;
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function verifiedTemp(root: string, relative: string, hash: string, bytes: number): Promise<string> {
  const target = path.join(root, relative);
  if (!(await exactRegularFile(target, hash, bytes))) throw new Error("Prepared transaction temp file does not match marker");
  return await readFile(target, "utf8");
}

async function readFully(handle: import("node:fs/promises").FileHandle, buffer: Buffer, position: number): Promise<void> {
  let offset = 0;
  while (offset < buffer.length) {
    const result = await handle.read(buffer, offset, buffer.length - offset, position + offset);
    if (result.bytesRead === 0) throw new Error("Unexpected EOF while reading composite campaign events");
    offset += result.bytesRead;
  }
}
