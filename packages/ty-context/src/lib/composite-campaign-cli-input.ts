import { lstat, open, realpath } from "node:fs/promises";
import type { Stats } from "node:fs";
import path from "node:path";
import { parseStrictJson } from "./composite-campaign-codec.js";

export async function readCompositeCampaignCliTextFile(
  projectRoot: string,
  suppliedPath: string
): Promise<string> {
  if (typeof suppliedPath !== "string" || !suppliedPath || path.isAbsolute(suppliedPath) ||
    suppliedPath.split(/[\\/]+/).includes("..")) {
    throw new Error("Composite campaign input path must be a relative in-project file without traversal");
  }
  const root = await realpath(path.resolve(projectRoot));
  const target = path.resolve(root, suppliedPath);
  if (!isInside(root, target)) throw new Error("Composite campaign input path is outside the project root");
  await rejectLinks(root, target);
  const canonical = await realpath(target);
  if (!isInside(root, canonical) || canonical !== target) {
    throw new Error("Composite campaign input path must not use a symbolic link or escape the project root");
  }
  const handle = await open(target, "r");
  try {
    const metadata = await handle.stat();
    await assertBoundRegularFile(target, canonical, metadata);
    if (metadata.size > 1024 * 1024) throw new Error("Composite campaign input exceeds the 1 MiB limit");
    const raw = Buffer.alloc(metadata.size);
    let offset = 0;
    while (offset < raw.length) {
      const read = await handle.read(raw, offset, raw.length - offset, offset);
      if (read.bytesRead === 0) throw new Error("Composite campaign input changed while it was being read");
      offset += read.bytesRead;
    }
    const after = await handle.stat();
    if (!sameFile(metadata, after) || after.size !== metadata.size) throw new Error("Composite campaign input changed while it was being read");
    await assertBoundRegularFile(target, canonical, after);
    try { return new TextDecoder("utf-8", { fatal: true }).decode(raw); }
    catch { throw new Error("Composite campaign input must contain valid UTF-8"); }
  } finally {
    await handle.close();
  }
}

async function assertBoundRegularFile(target: string, canonical: string, handleStats: Stats): Promise<void> {
  const leaf = await lstat(target);
  if (!handleStats.isFile() || !leaf.isFile() || leaf.isSymbolicLink() || !sameFile(handleStats, leaf) ||
    await realpath(target) !== canonical) {
    throw new Error("Composite campaign input changed identity or is not a bound regular in-project file");
  }
}

function sameFile(left: Stats, right: Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

export async function readCompositeCampaignCliJsonFile(projectRoot: string, suppliedPath: string): Promise<unknown> {
  return parseStrictJson(await readCompositeCampaignCliTextFile(projectRoot, suppliedPath));
}

async function rejectLinks(root: string, target: string): Promise<void> {
  let current = root;
  for (const component of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) throw new Error("Composite campaign input path contains a symbolic link");
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}
