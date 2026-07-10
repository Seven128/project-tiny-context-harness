import { lstat, mkdir, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import { assertCompositeCampaignLockOwner, type CompositeCampaignLock } from "./composite-campaign-lock.js";
import {
  assertCompositeCampaignCreateMarkerMatches,
  ensureCompositeCampaignCreateMarker,
  pendingCompositeCampaignCreateTimestamp,
  readCompositeCampaignCreateMarker,
  removeCompositeCampaignCreateMarker,
  type CompositeCampaignCreateFile,
  type CompositeCampaignCreateMarkerOwnership,
  type CompositeCampaignCreatePublication
} from "./composite-campaign-create-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  directoryEntries,
  exactRegularFile,
  hasCode,
  syncExactRegularFile,
  syncCompositeDirectory,
  writeExclusiveSynced
} from "./composite-campaign-atomic-io.js";
import { installCompositeCampaignExactLink } from "./composite-campaign-link-install.js";
import { removeOwnedCompositeRegularFile } from "./composite-campaign-owned-removal.js";

export type { CompositeCampaignCreatePublication } from "./composite-campaign-create-marker.js";
export { pendingCompositeCampaignCreateTimestamp } from "./composite-campaign-create-marker.js";

export interface CompositeCampaignCreatePublicationDependencies {
  token(): string;
  checkpoint(name: "before_create_publish" | "after_create_manifest"): Promise<void>;
}

const OWNER_FILE = ".composite-create-owner.json";

export async function publishCompositeCampaignCreate(
  projectRoot: string,
  campaignsRoot: string,
  publication: CompositeCampaignCreatePublication,
  lock: CompositeCampaignLock,
  dependencies: CompositeCampaignCreatePublicationDependencies
): Promise<void> {
  const owned = await ensureCompositeCampaignCreateMarker(
    projectRoot, campaignsRoot, publication, dependencies.token
  );
  const campaignRoot = path.join(campaignsRoot, publication.campaign_id);
  try {
    await assertCompositeCampaignLockOwner(lock);
    await ensureOwnedRoot(projectRoot, campaignsRoot, campaignRoot, owned, lock);
    const files = createFiles(campaignRoot, owned, publication);
    await stageFile(projectRoot, files.request_temp, publication.request, campaignRoot, owned, lock);
    await stageFile(projectRoot, files.event_temp, publication.event, campaignRoot, owned, lock);
    await stageFile(projectRoot, files.manifest_temp, publication.manifest, campaignRoot, owned, lock);
    await installExactLink(projectRoot, files.request_temp, files.request_final, publication.request, lock);
    await installExactLink(projectRoot, files.event_temp, files.event_final, publication.event, lock);
    await syncCompositeDirectory(campaignRoot);
    await dependencies.checkpoint("before_create_publish");
    await assertCompositeCampaignLockOwner(lock);
    await assertCreateAuthority(projectRoot, campaignRoot, owned, publication, false);
    await installExactLink(projectRoot, files.manifest_temp, files.manifest_final, publication.manifest, lock);
    await syncCompositeDirectory(campaignRoot);
    await syncCompositeDirectory(campaignsRoot);
    await dependencies.checkpoint("after_create_manifest");
    await cleanupCommittedArtifacts(projectRoot, campaignsRoot, campaignRoot, owned, publication, lock);
  } catch (error) {
    await cleanupUncommittedCreate(projectRoot, campaignsRoot, campaignRoot, owned, publication, lock);
    throw error;
  }
}

export async function cleanupCommittedCompositeCampaignCreate(
  projectRoot: string,
  campaignsRoot: string,
  publication: CompositeCampaignCreatePublication,
  lock: CompositeCampaignLock
): Promise<void> {
  const owned = await readCompositeCampaignCreateMarker(
    projectRoot, campaignsRoot, publication.campaign_id
  );
  if (!owned) return;
  assertCompositeCampaignCreateMarkerMatches(owned.marker, publication);
  const campaignRoot = path.join(campaignsRoot, publication.campaign_id);
  await cleanupCommittedArtifacts(projectRoot, campaignsRoot, campaignRoot, owned, publication, lock);
}

async function ensureOwnedRoot(
  projectRoot: string,
  campaignsRoot: string,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  lock: CompositeCampaignLock
): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, campaignRoot);
  let created = false;
  try {
    await assertCompositeCampaignLockOwner(lock);
    await mkdir(campaignRoot);
    created = true;
    await syncCompositeDirectory(campaignsRoot);
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
    if (!owned.preexisting) throw new Error("Composite campaign root appeared during create-only publication");
  }
  const ownerPath = path.join(campaignRoot, OWNER_FILE);
  if (!created && !await exactRegularFile(ownerPath, sha256Hex(owned.raw), Buffer.byteLength(owned.raw))) {
    const entries = await directoryEntries(campaignRoot);
    if (entries?.length !== 0) throw new Error("Composite campaign partial root is not bound to its create marker");
  }
  await installCompositeCampaignExactLink({
    project_root: projectRoot, source: owned.marker_path, target: ownerPath,
    sha256: sha256Hex(owned.raw), bytes: Buffer.byteLength(owned.raw), lock,
    label: "Composite campaign create owner"
  });
  await syncCompositeDirectory(campaignRoot);
}

async function stageFile(
  projectRoot: string,
  target: string,
  file: CompositeCampaignCreateFile,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  lock: CompositeCampaignLock
): Promise<void> {
  await assertCompositeCampaignLockOwner(lock);
  await assertCompositeCampaignPathSafe(projectRoot, target);
  if (await exists(target) && !await exactRegularFile(target, file.sha256, file.bytes)) {
    await assertCompositeCampaignLockOwner(lock);
    await assertRootOwner(campaignRoot, owned);
    await unlink(target);
    await syncCompositeDirectory(campaignRoot);
  }
  if (!await exists(target)) await writeExclusiveSynced(projectRoot, target, file.content);
  if (!await syncExactRegularFile(target, file.sha256, file.bytes)) {
    throw new Error("Composite campaign create temp differs from marker ownership");
  }
}

async function installExactLink(
  projectRoot: string,
  source: string,
  target: string,
  file: CompositeCampaignCreateFile,
  lock: CompositeCampaignLock
): Promise<void> {
  await installCompositeCampaignExactLink({
    project_root: projectRoot, source, target, sha256: file.sha256,
    bytes: file.bytes, lock, label: "Composite campaign create"
  });
}

async function assertCreateAuthority(
  projectRoot: string,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  publication: CompositeCampaignCreatePublication,
  committed: boolean
): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, campaignRoot);
  await assertRootOwner(campaignRoot, owned);
  const files = createFiles(campaignRoot, owned, publication);
  const required = [OWNER_FILE, path.basename(files.request_temp), path.basename(files.event_temp),
    path.basename(files.manifest_temp), "request.md", "events.ndjson"];
  if (committed) required.push("campaign.yaml");
  if (JSON.stringify(await directoryEntries(campaignRoot)) !== JSON.stringify(required.sort())) {
    throw new Error("Composite campaign create root contains unknown or missing members");
  }
  for (const [target, file] of filePairs(files, publication, committed)) {
    if (!await exactRegularFile(target, file.sha256, file.bytes)) {
      throw new Error("Composite campaign create files differ from publication ownership");
    }
  }
}

async function cleanupCommittedArtifacts(
  projectRoot: string,
  campaignsRoot: string,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  publication: CompositeCampaignCreatePublication,
  lock: CompositeCampaignLock
): Promise<void> {
  await assertCompositeCampaignLockOwner(lock);
  await assertCommittedAuthority(projectRoot, campaignRoot, owned, publication);
  const files = createFiles(campaignRoot, owned, publication);
  for (const [target, file] of tempPairs(files, publication)) {
    await removeExactIfPresent(projectRoot, target, file, owned.marker.token);
  }
  await removeOwnerIfPresent(projectRoot, campaignRoot, owned);
  await syncCompositeDirectory(campaignRoot);
  await assertCompositeCampaignLockOwner(lock);
  await removeCompositeCampaignCreateMarker(projectRoot, campaignsRoot, owned);
  await syncCompositeDirectory(campaignsRoot);
}

async function assertCommittedAuthority(
  projectRoot: string,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  publication: CompositeCampaignCreatePublication
): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, campaignRoot);
  const files = createFiles(campaignRoot, owned, publication);
  const allowed = new Set([OWNER_FILE, path.basename(files.request_temp), path.basename(files.event_temp),
    path.basename(files.manifest_temp), "request.md", "events.ndjson", "campaign.yaml"]);
  const entries = await directoryEntries(campaignRoot);
  if (!entries || entries.some((entry) => !allowed.has(entry)) ||
    !entries.includes("request.md") || !entries.includes("events.ndjson") || !entries.includes("campaign.yaml")) {
    throw new Error("Committed composite campaign create root contains unknown or missing members");
  }
  for (const [target, file] of filePairs(files, publication, true)) {
    if (await exists(target) && !await exactRegularFile(target, file.sha256, file.bytes)) {
      throw new Error("Committed composite campaign create artifact differs from marker ownership");
    }
  }
  const owner = path.join(campaignRoot, OWNER_FILE);
  if (await exists(owner) && !await exactRegularFile(owner, sha256Hex(owned.raw), Buffer.byteLength(owned.raw))) {
    throw new Error("Committed composite campaign create owner differs from marker ownership");
  }
}

async function cleanupUncommittedCreate(
  projectRoot: string,
  campaignsRoot: string,
  campaignRoot: string,
  owned: CompositeCampaignCreateMarkerOwnership,
  publication: CompositeCampaignCreatePublication,
  lock: CompositeCampaignLock
): Promise<void> {
  try { await assertCompositeCampaignLockOwner(lock); } catch { return; }
  if (await exists(path.join(campaignRoot, "campaign.yaml")) || !await exists(campaignRoot)) return;
  try { await assertCreateAuthority(projectRoot, campaignRoot, owned, publication, false); } catch { return; }
  const files = createFiles(campaignRoot, owned, publication);
  for (const [target, file] of filePairs(files, publication, false)) {
    await assertCompositeCampaignLockOwner(lock);
    await assertRootOwner(campaignRoot, owned);
    await assertCompositeCampaignPathSafe(projectRoot, target);
    await removeExactIfPresent(projectRoot, target, file, owned.marker.token);
  }
  await assertCompositeCampaignLockOwner(lock);
  await removeOwnerIfPresent(projectRoot, campaignRoot, owned);
  if ((await directoryEntries(campaignRoot))?.length !== 0) return;
  await rmdir(campaignRoot);
  await assertCompositeCampaignLockOwner(lock);
  await removeCompositeCampaignCreateMarker(projectRoot, campaignsRoot, owned);
  await syncCompositeDirectory(campaignsRoot);
}

async function assertRootOwner(root: string, owned: CompositeCampaignCreateMarkerOwnership): Promise<void> {
  if (!await exactRegularFile(path.join(root, OWNER_FILE), sha256Hex(owned.raw), Buffer.byteLength(owned.raw))) {
    throw new Error("Composite campaign root ownership was lost");
  }
}

async function removeOwnerIfPresent(
  projectRoot: string, root: string, owned: CompositeCampaignCreateMarkerOwnership
): Promise<void> {
  const owner = path.join(root, OWNER_FILE);
  const removed = await removeOwnedCompositeRegularFile({
    project_root: projectRoot, target: owner, sha256: sha256Hex(owned.raw),
    bytes: Buffer.byteLength(owned.raw), token: owned.marker.token, purpose: "create-owner"
  });
  if (!removed) throw new Error("Composite campaign create owner changed during cleanup");
}

async function removeExactIfPresent(
  projectRoot: string, target: string, file: CompositeCampaignCreateFile, token: string
): Promise<void> {
  const purpose = `create-${path.basename(target).split(".")[1]}`;
  const removed = await removeOwnedCompositeRegularFile({
    project_root: projectRoot, target, sha256: file.sha256, bytes: file.bytes, token, purpose
  });
  if (!removed) throw new Error("Composite campaign create temp changed during cleanup");
}

function createFiles(root: string, owned: CompositeCampaignCreateMarkerOwnership, publication: CompositeCampaignCreatePublication) {
  const token = owned.marker.token;
  return {
    request_temp: path.join(root, `.request.${token}.tmp`), event_temp: path.join(root, `.event.${token}.tmp`),
    manifest_temp: path.join(root, `.campaign.${token}.tmp`), request_final: path.join(root, "request.md"),
    event_final: path.join(root, "events.ndjson"), manifest_final: path.join(root, "campaign.yaml"), publication
  };
}

function tempPairs(files: ReturnType<typeof createFiles>, publication: CompositeCampaignCreatePublication) {
  return [[files.request_temp, publication.request], [files.event_temp, publication.event],
    [files.manifest_temp, publication.manifest]] as const;
}
function filePairs(files: ReturnType<typeof createFiles>, publication: CompositeCampaignCreatePublication, committed: boolean) {
  const pairs = [...tempPairs(files, publication), [files.request_final, publication.request],
    [files.event_final, publication.event]] as Array<readonly [string, CompositeCampaignCreateFile]>;
  if (committed) pairs.push([files.manifest_final, publication.manifest]);
  return pairs;
}
async function exists(target: string): Promise<boolean> {
  try { await lstat(target); return true; } catch (error) { if (hasCode(error, "ENOENT")) return false; throw error; }
}
