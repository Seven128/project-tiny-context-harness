import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rm, unlink, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import { COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES } from "./composite-campaign-security.js";

export interface CompositeRegularFileIdentity { dev: number | bigint; ino: number | bigint }

export async function compositeRegularFileIdentity(filePath: string): Promise<CompositeRegularFileIdentity> {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("Composite campaign path is not a regular file");
  return { dev: metadata.dev, ino: metadata.ino };
}

export async function assertCompositeRegularFileIdentity(
  filePath: string, expected: CompositeRegularFileIdentity
): Promise<void> {
  const current = await compositeRegularFileIdentity(filePath);
  if (current.dev !== expected.dev || current.ino !== expected.ino) {
    throw new Error("Composite campaign regular file identity changed");
  }
}

export async function openBoundCompositeRegularFile(
  filePath: string, expected: CompositeRegularFileIdentity
): Promise<FileHandle> {
  const flags = process.platform === "win32" ? "r+" : constants.O_RDWR | constants.O_NOFOLLOW;
  const handle = await open(filePath, flags);
  const current = await handle.stat();
  if (!current.isFile() || current.dev !== expected.dev || current.ino !== expected.ino) {
    await handle.close();
    throw new Error("Composite campaign opened file does not match verified leaf identity");
  }
  return handle;
}

export async function writeExclusiveSynced(projectRoot: string, filePath: string, content: string): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, filePath);
  const handle = await open(filePath, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await removeFileIfExists(filePath);
    throw error;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

export async function syncCompositeDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } catch (error) {
    if (process.platform !== "win32" || !["EINVAL", "ENOTSUP", "EISDIR", "EPERM"].some((code) => hasCode(error, code))) throw error;
  } finally {
    await handle.close();
  }
}

export async function ensureCompositeDirectories(projectRoot: string, campaignRoot: string, target: string): Promise<void> {
  const components = path.relative(campaignRoot, target).split(path.sep).filter(Boolean);
  let current = campaignRoot;
  for (const component of components) {
    current = path.join(current, component);
    await assertCompositeCampaignPathSafe(projectRoot, current);
    let created = false;
    try {
      await mkdir(current);
      created = true;
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      const metadata = await lstat(current);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`Composite campaign path is not a safe directory: ${current}`);
    }
    if (created) await syncCompositeDirectory(path.dirname(current));
  }
}

export async function exactRegularFile(filePath: string, expectedHash: string, expectedBytes: number): Promise<boolean> {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0 ||
    expectedBytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) return false;
  try {
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size !== expectedBytes) return false;
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(expectedBytes);
      let offset = 0;
      while (offset < buffer.length) {
        const result = await handle.read(buffer, offset, buffer.length - offset, offset);
        if (result.bytesRead === 0) return false;
        offset += result.bytesRead;
      }
      return sha256Hex(buffer) === expectedHash;
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}

export async function syncExactRegularFile(
  filePath: string, expectedHash: string, expectedBytes: number
): Promise<boolean> {
  if (!await exactRegularFile(filePath, expectedHash, expectedBytes)) return false;
  const before = await lstat(filePath);
  const handle = await open(filePath, "r+");
  try {
    const current = await handle.stat();
    if (before.dev !== current.dev || before.ino !== current.ino || current.size !== expectedBytes) return false;
    const buffer = Buffer.alloc(expectedBytes);
    let offset = 0;
    while (offset < buffer.length) {
      const read = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (read.bytesRead === 0) return false;
      offset += read.bytesRead;
    }
    if (sha256Hex(buffer) !== expectedHash) return false;
    await handle.sync();
    return true;
  } finally { await handle.close(); }
}

export async function exactSingleFileDirectory(
  directory: string, fileName: string, expectedHash: string, expectedBytes: number
): Promise<boolean> {
  const entries = await directoryEntries(directory);
  return entries?.length === 1 && entries[0] === fileName &&
    await exactRegularFile(path.join(directory, fileName), expectedHash, expectedBytes);
}

export async function assertOwnedPacketDirectory(
  directory: string, expectedHash: string, expectedBytes: number
): Promise<void> {
  const packet = path.join(directory, "authoring-packet.json");
  if (!await exactSingleFileDirectory(directory, "authoring-packet.json", expectedHash, expectedBytes) ||
    !await syncExactRegularFile(packet, expectedHash, expectedBytes)) {
    throw new Error("Composite campaign staged packet differs from transaction ownership");
  }
}

export async function removeFileIfExists(target: string): Promise<void> {
  try { await unlink(target); } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
}

export async function removeDirectoryIfExists(target: string): Promise<void> {
  try { await rm(target, { recursive: true, force: false }); } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
}

export async function directoryEntries(target: string): Promise<string[] | null> {
  try { return (await readdir(target)).sort(); } catch (error) { if (hasCode(error, "ENOENT")) return null; throw error; }
}

export function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
