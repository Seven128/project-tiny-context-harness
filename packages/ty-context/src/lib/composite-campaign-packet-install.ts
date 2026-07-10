import { mkdir } from "node:fs/promises";
import path from "node:path";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignPacketMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  assertOwnedPacketDirectory,
  directoryEntries,
  exactSingleFileDirectory,
  hasCode,
  syncExactRegularFile,
  syncCompositeDirectory
} from "./composite-campaign-atomic-io.js";
import { installCompositeCampaignExactLink } from "./composite-campaign-link-install.js";
import { removeOwnedCompositeSingleFileDirectory } from "./composite-campaign-owned-removal.js";

export async function installCompositeCampaignPacketContent(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  lock: CompositeCampaignLock
): Promise<void> {
  const content = packetContent(marker);
  const stage = path.join(root, ...content.staged_directory.split("/"));
  const stagedPacket = path.join(stage, "authoring-packet.json");
  const final = path.join(root, ...content.final_directory.split("/"));
  const packet = path.join(final, "authoring-packet.json");
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, stage);
  await assertCompositeCampaignPathSafe(lock.project_root, final);
  await assertCompositeCampaignPathSafe(lock.project_root, packet);
  let entries = await directoryEntries(final);
  if (entries === null) {
    await assertOwnedPacketDirectory(stage, content.packet_sha256, content.packet_bytes);
    try {
      await mkdir(final);
      await syncCompositeDirectory(path.dirname(final));
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
    }
    entries = await directoryEntries(final);
  }
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, stage);
  await assertCompositeCampaignPathSafe(lock.project_root, final);
  if (entries?.length === 0) {
    await assertOwnedPacketDirectory(stage, content.packet_sha256, content.packet_bytes);
    await installCompositeCampaignExactLink({
      project_root: lock.project_root, source: stagedPacket, target: packet,
      sha256: content.packet_sha256, bytes: content.packet_bytes, lock,
      label: "Composite campaign packet"
    });
  }
  await assertInstalledCompositeCampaignPacket(marker, root, lock);
  await syncCompositeDirectory(final);
  if (await directoryEntries(stage) !== null) {
    await assertOwnedPacketDirectory(stage, content.packet_sha256, content.packet_bytes);
    const removed = await removeOwnedCompositeSingleFileDirectory({
      project_root: lock.project_root, target: stage, file_name: "authoring-packet.json",
      sha256: content.packet_sha256, bytes: content.packet_bytes,
      token: marker.token, purpose: "installed-stage"
    });
    if (!removed) throw new Error("Composite campaign staged packet ownership changed during cleanup");
  }
  await syncCompositeDirectory(path.dirname(final));
}

export async function assertInstalledCompositeCampaignPacket(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  lock: CompositeCampaignLock
): Promise<void> {
  const content = packetContent(marker);
  const final = path.join(root, ...content.final_directory.split("/"));
  const packet = path.join(final, "authoring-packet.json");
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(lock.project_root, final);
  if (!await exactSingleFileDirectory(
    final, "authoring-packet.json", content.packet_sha256, content.packet_bytes
  ) || !await syncExactRegularFile(packet, content.packet_sha256, content.packet_bytes)) {
    throw new Error("Composite campaign installed packet differs from transaction ownership");
  }
}

function packetContent(marker: CompositeCampaignTransactionMarker): CompositeCampaignPacketMarkerContent {
  const content = marker.content;
  if (!content || isCompositeCampaignProjectionMarkerContent(content)) {
    throw new Error("Packet install requires packet transaction content");
  }
  return content;
}
