import type { Stats } from "node:fs";
import { link, lstat, mkdir, open, readFile, rename, rmdir, unlink, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson } from "./composite-campaign-codec.js";
import { assertCompositeCampaignPathSafe, validateCompositeCampaignId } from "./composite-campaign-paths.js";

interface LockOwner {
  schema_version: "composite-campaign-lock-v1";
  token: string;
  pid: number;
  acquired_at: string;
}

export interface CompositeCampaignLock {
  project_root: string;
  lock_path: string;
  owner: LockOwner;
  raw_owner: string;
  handle: FileHandle;
}

export interface CompositeCampaignLockOptions {
  token(): string;
  now(): string;
  timeout_ms?: number;
  retry_ms?: number;
  after_owner_write?(): Promise<void>;
}

export async function acquireCompositeCampaignLock(
  projectRoot: string,
  campaignsRoot: string,
  campaignId: string,
  options: CompositeCampaignLockOptions
): Promise<CompositeCampaignLock> {
  validateCompositeCampaignId(campaignId);
  const lockPath = path.join(campaignsRoot, `.${campaignId}.lock`);
  await assertCompositeCampaignPathSafe(projectRoot, lockPath);
  const deadline = Date.now() + (options.timeout_ms ?? 10_000);
  while (true) {
    await assertCompositeCampaignPathSafe(projectRoot, lockPath);
    const owner: LockOwner = {
      schema_version: "composite-campaign-lock-v1",
      token: lockToken(options.token()),
      pid: process.pid,
      acquired_at: lockTimestamp(options.now())
    };
    const raw = canonicalJson(owner);
    try {
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(raw, "utf8");
        await options.after_owner_write?.();
        await handle.sync();
        return { project_root: projectRoot, lock_path: lockPath, owner, raw_owner: raw, handle };
      } catch (error) {
        await handle.close();
        await quarantineOwnedPath(projectRoot, lockPath, raw, owner.token, "failed").catch(() => false);
        throw error;
      }
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
    }
    const observed = await readOwner(lockPath);
    if (observed && isConclusiveDead(observed.owner.pid)) {
      const reclaimed = await quarantineOwnedPath(projectRoot, lockPath, observed.raw, lockToken(options.token()), "reclaim");
      if (reclaimed) continue;
    }
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for composite campaign lock ${campaignId}`);
    await delay(options.retry_ms ?? 25);
  }
}

export async function assertCompositeCampaignLockOwner(lock: CompositeCampaignLock): Promise<void> {
  await assertCompositeCampaignPathSafe(lock.project_root, lock.lock_path);
  const observed = await readOwner(lock.lock_path);
  if (!observed || observed.owner.token !== lock.owner.token || observed.raw !== lock.raw_owner) {
    throw new Error("Composite campaign lock ownership was lost");
  }
}

export async function releaseCompositeCampaignLock(lock: CompositeCampaignLock): Promise<void> {
  await lock.handle.close().catch(() => undefined);
  await quarantineOwnedPath(
    lock.project_root,
    lock.lock_path,
    lock.raw_owner,
    lock.owner.token,
    "release"
  ).catch((error) => {
    if (!hasCode(error, "ENOENT")) throw error;
  });
}

async function quarantineOwnedPath(
  projectRoot: string,
  lockPath: string,
  expectedRaw: string,
  token: string,
  purpose: string
): Promise<boolean> {
  const quarantine = `${lockPath}.${token}.${purpose}`;
  const moved = path.join(quarantine, "owner");
  await assertCompositeCampaignPathSafe(projectRoot, lockPath);
  await assertCompositeCampaignPathSafe(projectRoot, quarantine);
  try {
    await mkdir(quarantine);
  } catch (error) {
    if (hasCode(error, "EEXIST")) return false;
    throw error;
  }
  const quarantineOwner = await lstat(quarantine);
  if (!quarantineOwner.isDirectory() || quarantineOwner.isSymbolicLink()) {
    throw new Error("Composite campaign lock quarantine is not an owned directory");
  }
  try {
    await assertOwnedQuarantine(projectRoot, quarantine, moved, quarantineOwner);
    await rename(lockPath, moved);
  } catch (error) {
    await rmdir(quarantine).catch(() => undefined);
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
  await assertOwnedQuarantine(projectRoot, quarantine, moved, quarantineOwner);
  let observed: string;
  try {
    observed = await readBoundedRegular(moved);
  } catch (error) {
    await restoreMovedPath(projectRoot, moved, lockPath, quarantine, quarantineOwner);
    throw error;
  }
  if (observed !== expectedRaw) {
    await restoreMovedPath(projectRoot, moved, lockPath, quarantine, quarantineOwner);
    return false;
  }
  await assertOwnedQuarantine(projectRoot, quarantine, moved, quarantineOwner);
  await unlink(moved);
  await rmdir(quarantine);
  return true;
}

async function assertOwnedQuarantine(
  projectRoot: string,
  quarantine: string,
  moved: string,
  expected: Stats
): Promise<void> {
  await assertCompositeCampaignPathSafe(projectRoot, quarantine);
  await assertCompositeCampaignPathSafe(projectRoot, moved);
  const current = await lstat(quarantine);
  if (!current.isDirectory() || current.isSymbolicLink() ||
    current.dev !== expected.dev || current.ino !== expected.ino) {
    throw new Error("Composite campaign lock quarantine ownership was lost");
  }
}

async function restoreMovedPath(
  projectRoot: string,
  moved: string,
  lockPath: string,
  quarantine: string,
  expected: Stats
): Promise<void> {
  try {
    await assertOwnedQuarantine(projectRoot, quarantine, moved, expected);
    await link(moved, lockPath);
    await assertOwnedQuarantine(projectRoot, quarantine, moved, expected);
    await unlink(moved);
    await rmdir(quarantine);
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
  }
}

async function readBoundedRegular(target: string): Promise<string> {
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 4096) {
    throw new Error("Composite campaign lock path is not a bounded regular file");
  }
  return await readFile(target, "utf8");
}

async function readOwner(lockPath: string): Promise<{ owner: LockOwner; raw: string } | null> {
  try {
    const raw = await readBoundedRegular(lockPath);
    const parsed = parseStrictJson(raw) as Partial<LockOwner>;
    if (canonicalJson(parsed) !== raw || parsed.schema_version !== "composite-campaign-lock-v1" ||
      typeof parsed.token !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(parsed.token) ||
      !Number.isSafeInteger(parsed.pid) || (parsed.pid ?? 0) < 1 ||
      typeof parsed.acquired_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.acquired_at)) return null;
    return { owner: parsed as LockOwner, raw };
  } catch (error) {
    if (hasCode(error, "ENOENT") || error instanceof SyntaxError) return null;
    return null;
  }
}

function isConclusiveDead(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return hasCode(error, "ESRCH");
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function lockToken(value: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error("Composite campaign lock token is unsafe");
  }
  return value;
}

function lockTimestamp(value: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error("Composite campaign lock timestamp must be canonical UTC ISO-8601");
  }
  return value;
}

function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
