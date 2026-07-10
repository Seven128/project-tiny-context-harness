import path from "node:path";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  directoryEntries,
  exactSingleFileDirectory,
  syncExactRegularFile,
  syncCompositeDirectory
} from "./composite-campaign-atomic-io.js";
import { installCompositeCampaignExactLink } from "./composite-campaign-link-install.js";
import { removeOwnedCompositeSingleFileDirectory } from "./composite-campaign-owned-removal.js";

export async function installCompositeCampaignProjectionContent(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  lock: CompositeCampaignLock
): Promise<void> {
  const content = marker.content;
  if (!content || !isCompositeCampaignProjectionMarkerContent(content)) {
    throw new Error("Projection install requires projection transaction content");
  }
  const final = path.join(root, ...content.final_directory.split("/"));
  await assertProjectionDirectoryShape(marker, root, lock.project_root, false);
  for (const claim of Object.values(content.projection_files)) {
    const stage = path.join(root, ...claim.staged_directory.split("/"));
    const stagedFile = path.join(stage, claim.file);
    const finalFile = path.join(final, claim.file);
    await assertCompositeCampaignLockOwner(lock);
    await assertCompositeCampaignPathSafe(lock.project_root, stage);
    await assertCompositeCampaignPathSafe(lock.project_root, finalFile);
    if (!await syncExactRegularFile(finalFile, claim.sha256, claim.bytes)) {
      if (!await exactSingleFileDirectory(stage, claim.file, claim.sha256, claim.bytes)) {
        throw new Error(`Composite campaign staged projection ${claim.file} differs from transaction ownership`);
      }
      await installCompositeCampaignExactLink({
        project_root: lock.project_root,
        source: stagedFile,
        target: finalFile,
        sha256: claim.sha256,
        bytes: claim.bytes,
        lock,
        label: `Composite campaign projection ${claim.file}`
      });
    }
  }
  await assertProjectionDirectoryShape(marker, root, lock.project_root, true);
  await syncCompositeDirectory(final);
  for (const claim of Object.values(content.projection_files)) {
    const stage = path.join(root, ...claim.staged_directory.split("/"));
    if (await directoryEntries(stage) === null) continue;
    const removed = await removeOwnedCompositeSingleFileDirectory({
      project_root: lock.project_root,
      target: stage,
      file_name: claim.file,
      sha256: claim.sha256,
      bytes: claim.bytes,
      token: marker.token,
      purpose: "installed-stage"
    });
    if (!removed) throw new Error("Composite campaign staged projection ownership changed during cleanup");
  }
  await syncCompositeDirectory(path.dirname(final));
}

export async function assertInstalledCompositeCampaignProjection(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  lock: CompositeCampaignLock
): Promise<void> {
  await assertCompositeCampaignLockOwner(lock);
  await assertProjectionDirectoryShape(marker, root, lock.project_root, true);
}

async function assertProjectionDirectoryShape(
  marker: CompositeCampaignTransactionMarker,
  root: string,
  projectRoot: string,
  requireAll: boolean
): Promise<void> {
  const content = marker.content;
  if (!content || !isCompositeCampaignProjectionMarkerContent(content)) {
    throw new Error("Projection directory verification requires projection content");
  }
  const final = path.join(root, ...content.final_directory.split("/"));
  await assertCompositeCampaignPathSafe(projectRoot, final);
  await assertCompositeCampaignPathSafe(projectRoot, path.join(final, "authoring-packet.json"));
  const entries = await directoryEntries(final);
  if (!entries?.includes("authoring-packet.json")) throw new Error("Projection revision is missing its immutable authoring packet");
  if (!await syncExactRegularFile(
    path.join(final, "authoring-packet.json"), content.packet_sha256, content.packet_bytes
  )) throw new Error("Projection revision immutable authoring packet changed during publication");
  const allowed = new Set(["authoring-packet.json", ...Object.values(content.projection_files).map((claim) => claim.file)]);
  if (entries.some((entry) => !allowed.has(entry))) throw new Error("Projection revision contains manual drift or unknown files");
  for (const claim of Object.values(content.projection_files)) {
    const target = path.join(final, claim.file);
    const exists = await syncExactRegularFile(target, claim.sha256, claim.bytes);
    if (requireAll && !exists) throw new Error(`Composite campaign installed projection ${claim.file} differs from transaction ownership`);
    if (!requireAll && entries.includes(claim.file) && !exists) {
      throw new Error(`Composite campaign projection ${claim.file} conflicts with immutable transaction content`);
    }
  }
}
