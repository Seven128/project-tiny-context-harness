import { lstat } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import {
  encodeCompositeCampaignTransactionMarker,
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import { COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES } from "./composite-campaign-security.js";
import {
  directoryEntries,
  exactRegularFile,
  hasCode,
  syncCompositeDirectory
} from "./composite-campaign-atomic-io.js";
import {
  removeOwnedCompositeRegularFile,
  removeOwnedCompositeSingleFileDirectory
} from "./composite-campaign-owned-removal.js";

export const COMPOSITE_CAMPAIGN_TRANSACTION_MARKER = ".composite-transaction.json";

export function compositeCampaignTransactionMarkerTempPath(
  root: string,
  marker: CompositeCampaignTransactionMarker
): string {
  return path.join(root, `.transaction.${marker.token}.tmp`);
}

export async function cleanupCompositeCampaignTransaction(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  projectRoot: string
): Promise<void> {
  const eventTemp = path.join(root, marker.next.event_temp);
  const manifestTemp = path.join(root, marker.next.manifest_temp);
  const markerPath = path.join(root, COMPOSITE_CAMPAIGN_TRANSACTION_MARKER);
  const markerTemp = compositeCampaignTransactionMarkerTempPath(root, marker);
  await assertCompositeCampaignPathSafe(projectRoot, eventTemp);
  await assertCompositeCampaignPathSafe(projectRoot, manifestTemp);
  await assertCompositeCampaignPathSafe(projectRoot, markerPath);
  if (await exists(eventTemp) &&
    !await exactRegularFile(eventTemp, marker.next.event_sha256, marker.next.event_bytes)) {
    throw new Error("Transaction cleanup event temp differs from marker ownership");
  }
  if (await exists(manifestTemp)) {
    const metadata = await lstat(manifestTemp);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES ||
      !await exactRegularFile(manifestTemp, marker.next.manifest_sha256, metadata.size)) {
      throw new Error("Transaction cleanup manifest temp differs from marker ownership");
    }
  }
  if (marker.content) await assertOwnedStage(marker, root, projectRoot);
  const markerRaw = encodeCompositeCampaignTransactionMarker(marker);
  const markerHash = sha256Hex(markerRaw);
  const markerBytes = Buffer.byteLength(markerRaw);
  if (await exists(markerTemp) && !await exactRegularFile(markerTemp, markerHash, markerBytes)) {
    throw new Error("Transaction cleanup marker temp differs from parsed ownership");
  }
  if (!await exactRegularFile(markerPath, markerHash, markerBytes)) {
    throw new Error("Transaction cleanup marker bytes differ from parsed ownership");
  }
  await removeOwnedFile(projectRoot, eventTemp, marker.next.event_sha256,
    marker.next.event_bytes, marker.token, "transaction-event");
  if (await exists(manifestTemp)) {
    const manifestBytes = (await lstat(manifestTemp)).size;
    await removeOwnedFile(projectRoot, manifestTemp, marker.next.manifest_sha256,
      manifestBytes, marker.token, "transaction-manifest");
  }
  if (marker.content) {
    for (const claim of stageClaims(marker)) {
      const removed = await removeOwnedCompositeSingleFileDirectory({
        project_root: projectRoot,
        target: path.join(root, ...claim.directory.split("/")),
        file_name: claim.file,
        sha256: claim.sha256,
        bytes: claim.bytes,
        token: marker.token,
        purpose: "transaction-stage"
      });
      if (!removed) throw new Error("Transaction cleanup staged directory ownership changed during removal");
    }
  }
  await removeOwnedFile(projectRoot, markerTemp, markerHash, markerBytes,
    marker.token, "transaction-marker-temp");
  await removeOwnedFile(projectRoot, markerPath, markerHash, markerBytes,
    marker.token, "transaction-marker");
  await syncCompositeDirectory(root);
}

async function removeOwnedFile(
  projectRoot: string,
  target: string,
  sha256: string,
  bytes: number,
  token: string,
  purpose: string
): Promise<void> {
  const removed = await removeOwnedCompositeRegularFile({
    project_root: projectRoot, target, sha256, bytes, token, purpose
  });
  if (!removed) throw new Error("Transaction cleanup file ownership changed during removal");
}

async function assertOwnedStage(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  projectRoot: string
): Promise<void> {
  for (const claim of stageClaims(marker)) {
    const stage = path.join(root, ...claim.directory.split("/"));
    if (!await exists(stage)) continue;
    await assertCompositeCampaignPathSafe(projectRoot, stage);
    const entries = await directoryEntries(stage);
    const file = path.join(stage, claim.file);
    if (entries?.length !== 1 || entries[0] !== claim.file ||
      !await exactRegularFile(file, claim.sha256, claim.bytes)) {
      throw new Error("Transaction cleanup staged directory differs from marker ownership");
    }
  }
}

function stageClaims(marker: CompositeCampaignTransactionMarker) {
  const content = marker.content!;
  if (isCompositeCampaignProjectionMarkerContent(content)) {
    return Object.values(content.projection_files).map((claim) => ({
      directory: claim.staged_directory, file: claim.file, sha256: claim.sha256, bytes: claim.bytes
    }));
  }
  return [{
    directory: content.staged_directory, file: "authoring-packet.json",
    sha256: content.packet_sha256, bytes: content.packet_bytes
  }];
}

async function exists(target: string): Promise<boolean> {
  try { await lstat(target); return true; } catch (error) { if (hasCode(error, "ENOENT")) return false; throw error; }
}
