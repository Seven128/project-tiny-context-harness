import type { Stats } from "node:fs";
import { link, lstat, mkdir, readdir, rename, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  assertCompositeRemovalApproval,
  assertCompositeRemovalApprovalShape,
  publishCompositeRemovalApproval,
  type CompositeRemovalKind
} from "./composite-campaign-removal-approval.js";
import {
  assertCompositeRegularFileIdentity,
  compositeRegularFileIdentity,
  exactRegularFile,
  hasCode,
  syncCompositeDirectory,
  writeExclusiveSynced
} from "./composite-campaign-atomic-io.js";

interface OwnedRemovalInput {
  project_root: string;
  target: string;
  sha256: string;
  bytes: number;
  token: string;
  purpose: string;
}

export async function removeOwnedCompositeRegularFile(input: OwnedRemovalInput): Promise<boolean> {
  const prepared = await prepareMove(input);
  if ("complete" in prepared) return prepared.complete;
  const { paths, quarantine, approved } = prepared;
  const targetExists = await exists(paths.target);
  if (targetExists && !approved) {
    if (await sameNode(paths.target, paths.moved)) {
      await unlink(paths.moved);
      await finishQuarantine(paths, approved);
    }
    return false;
  }
  if (!approved) {
    let identity: Awaited<ReturnType<typeof compositeRegularFileIdentity>>;
    let matches = false;
    try {
      identity = await compositeRegularFileIdentity(paths.moved);
      matches = await exactRegularFile(paths.moved, input.sha256, input.bytes);
      await assertQuarantine(input.project_root, paths, quarantine);
      await assertCompositeRegularFileIdentity(paths.moved, identity);
    } catch {
      await restoreMovedRegular(input.project_root, paths, quarantine);
      return false;
    }
    if (!matches) {
      await restoreMovedRegular(input.project_root, paths, quarantine);
      return false;
    }
    await approveRemoval(input.project_root, paths, quarantine, "file", identity);
    await assertCompositeRegularFileIdentity(paths.moved, identity);
  }
  const replacementExists = await exists(paths.target);
  await assertQuarantine(input.project_root, paths, quarantine);
  const moved = await statIfExists(paths.moved);
  if (moved) {
    try {
      await assertCompositeRemovalApproval(paths.approval, "file", moved);
      if (!moved.isFile() || moved.isSymbolicLink() ||
        !await exactRegularFile(paths.moved, input.sha256, input.bytes)) return false;
      await assertCompositeRegularFileIdentity(paths.moved, moved);
    } catch { return false; }
    await unlink(paths.moved);
  }
  await finishQuarantine(paths, true);
  return !replacementExists && !await exists(paths.target);
}

export async function removeOwnedCompositeSingleFileDirectory(
  input: OwnedRemovalInput & { file_name: string }
): Promise<boolean> {
  const prepared = await prepareMove(input);
  if ("complete" in prepared) return prepared.complete;
  const { paths, quarantine, approved } = prepared;
  const targetExists = await exists(paths.target);
  if (targetExists && !approved) return false;
  let moved: Stats | null = await statIfExists(paths.moved);
  if (!approved) {
    try {
      if (!moved?.isDirectory() || moved.isSymbolicLink()) throw new Error("Moved cleanup target is not a directory");
      const packet = path.join(paths.moved, input.file_name);
      const entries = await readdir(paths.moved);
      const matches = entries.length === 1 && entries[0] === input.file_name &&
        await exactRegularFile(packet, input.sha256, input.bytes);
      if (!matches) throw new Error("Moved cleanup directory differs from ownership");
      const packetIdentity = await compositeRegularFileIdentity(packet);
      await approveRemoval(input.project_root, paths, quarantine, "directory", moved);
      await assertDirectoryIdentity(paths.moved, moved);
      await assertCompositeRegularFileIdentity(packet, packetIdentity);
    } catch {
      await restoreMovedDirectory(input.project_root, paths, quarantine);
      return false;
    }
  }
  const replacementExists = await exists(paths.target);
  moved = await statIfExists(paths.moved);
  if (moved) {
    try { await assertCompositeRemovalApproval(paths.approval, "directory", moved); }
    catch { return false; }
    await assertDirectoryIdentity(paths.moved, moved);
    const entries = await readdir(paths.moved);
    if (entries.length === 1 && entries[0] === input.file_name) {
      const packet = path.join(paths.moved, input.file_name);
      if (!await exactRegularFile(packet, input.sha256, input.bytes)) return false;
      const packetIdentity = await compositeRegularFileIdentity(packet);
      await assertCompositeRegularFileIdentity(packet, packetIdentity);
      await unlink(packet);
    } else if (entries.length !== 0) {
      return false;
    }
    await assertDirectoryIdentity(paths.moved, moved);
    await rmdir(paths.moved);
  }
  await finishQuarantine(paths, true);
  return !replacementExists && !await exists(paths.target);
}

interface RemovalPaths {
  target: string;
  parent: string;
  quarantine: string;
  moved: string;
  approval: string;
  owner: string;
  owner_raw: string;
}

type PreparedMove =
  | { complete: boolean }
  | { paths: RemovalPaths; quarantine: Stats; approved: boolean };

function removalPaths(input: OwnedRemovalInput): RemovalPaths {
  const { target, token, purpose } = input;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(token) ||
    !/^[a-z][a-z0-9-]{0,31}$/.test(purpose)) {
    throw new Error("Composite campaign removal identity is unsafe");
  }
  const parent = path.dirname(target);
  const quarantine = path.join(parent, `.composite-remove.${token}.${purpose}`);
  const ownerRaw = canonicalJson({
    schema_version: "composite-removal-v1", target: path.resolve(target),
    sha256: input.sha256, bytes: input.bytes, token, purpose
  });
  return {
    target, parent, quarantine,
    moved: path.join(quarantine, "owned"),
    approval: path.join(quarantine, ".delete-approved"),
    owner: path.join(quarantine, ".owner.json"), owner_raw: ownerRaw
  };
}

async function prepareMove(input: OwnedRemovalInput): Promise<PreparedMove> {
  const paths = removalPaths(input);
  await assertCompositeCampaignPathSafe(input.project_root, paths.quarantine);
  await assertCompositeCampaignPathSafe(input.project_root, paths.moved);
  let created = false;
  try { await mkdir(paths.quarantine); created = true; }
  catch (error) { if (!hasCode(error, "EEXIST")) throw error; }
  if (created) {
    await writeExclusiveSynced(input.project_root, paths.owner, paths.owner_raw);
    await syncCompositeDirectory(paths.quarantine);
    await syncCompositeDirectory(paths.parent);
  }
  const quarantine = await lstat(paths.quarantine);
  if (!quarantine.isDirectory() || quarantine.isSymbolicLink()) {
    throw new Error("Composite campaign removal quarantine is not an owned directory");
  }
  await assertQuarantine(input.project_root, paths, quarantine);
  const entries = (await readdir(paths.quarantine)).sort();
  if (!entries.includes(".owner.json") ||
    entries.some((entry) => !["owned", ".delete-approved", ".owner.json"].includes(entry))) {
    throw new Error("Composite campaign removal quarantine contains unknown members");
  }
  const approved = entries.includes(".delete-approved");
  if (approved) await assertCompositeRemovalApprovalShape(paths.approval);
  if (entries.includes("owned")) return { paths, quarantine, approved };
  if (approved) {
    await finishQuarantine(paths, true);
    return { complete: !await exists(paths.target) };
  }
  await assertCompositeCampaignPathSafe(input.project_root, paths.target);
  await assertQuarantine(input.project_root, paths, quarantine);
  try { await rename(paths.target, paths.moved); }
  catch (error) {
    await finishQuarantine(paths, false);
    if (hasCode(error, "ENOENT")) return { complete: true };
    throw error;
  }
  return { paths, quarantine, approved: false };
}

async function approveRemoval(
  projectRoot: string,
  paths: RemovalPaths,
  quarantine: Stats,
  kind: CompositeRemovalKind,
  identity: Stats | Awaited<ReturnType<typeof compositeRegularFileIdentity>>
): Promise<void> {
  await assertQuarantine(projectRoot, paths, quarantine);
  await publishCompositeRemovalApproval(projectRoot, paths.approval, kind, identity);
  await syncCompositeDirectory(paths.quarantine);
  await assertQuarantine(projectRoot, paths, quarantine);
}

async function assertQuarantine(
  projectRoot: string,
  paths: RemovalPaths,
  expected: Stats
): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, paths.quarantine);
  await assertCompositeCampaignPathSafe(projectRoot, paths.moved);
  const current = await lstat(paths.quarantine);
  if (!current.isDirectory() || current.isSymbolicLink() ||
    current.dev !== expected.dev || current.ino !== expected.ino) {
    throw new Error("Composite campaign removal quarantine ownership was lost");
  }
  if (!await exactRegularFile(paths.owner, sha256Hex(paths.owner_raw), Buffer.byteLength(paths.owner_raw))) {
    throw new Error("Composite campaign removal quarantine descriptor differs from ownership");
  }
}

async function restoreMovedRegular(
  projectRoot: string,
  paths: RemovalPaths,
  quarantine: Stats
): Promise<void> {
  try {
    await assertQuarantine(projectRoot, paths, quarantine);
    await link(paths.moved, paths.target);
    await assertQuarantine(projectRoot, paths, quarantine);
    await unlink(paths.moved);
    await finishQuarantine(paths, false);
  } catch (error) {
    if (hasCode(error, "EEXIST")) return;
    if (await exists(paths.target)) throw error;
    await assertCompositeCampaignPathSafe(projectRoot, paths.target);
    await assertQuarantine(projectRoot, paths, quarantine);
    await rename(paths.moved, paths.target);
    await finishQuarantine(paths, false);
  }
}

async function restoreMovedDirectory(
  projectRoot: string,
  paths: RemovalPaths,
  quarantine: Stats
): Promise<void> {
  if (await exists(paths.target)) return;
  await assertCompositeCampaignPathSafe(projectRoot, paths.target);
  await assertQuarantine(projectRoot, paths, quarantine);
  await rename(paths.moved, paths.target);
  await finishQuarantine(paths, false);
}

async function finishQuarantine(paths: RemovalPaths, approved: boolean): Promise<void> {
  if (approved) await unlink(paths.approval).catch((error) => { if (!hasCode(error, "ENOENT")) throw error; });
  await unlink(paths.owner);
  await rmdir(paths.quarantine);
  await syncCompositeDirectory(paths.parent);
}

async function assertDirectoryIdentity(target: string, expected: Stats): Promise<void> {
  const current = await lstat(target);
  if (!current.isDirectory() || current.isSymbolicLink() ||
    current.dev !== expected.dev || current.ino !== expected.ino) {
    throw new Error("Composite campaign removal directory ownership was lost");
  }
}

async function sameNode(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([statIfExists(left), statIfExists(right)]);
  return Boolean(a && b && a.dev === b.dev && a.ino === b.ino);
}

async function statIfExists(target: string): Promise<Stats | null> {
  try { return await lstat(target); }
  catch (error) { if (hasCode(error, "ENOENT")) return null; throw error; }
}

async function exists(target: string): Promise<boolean> {
  return await statIfExists(target) !== null;
}
