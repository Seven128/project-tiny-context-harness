import { randomUUID } from "node:crypto";
import { open, readFile, readdir, rename, stat } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";

export async function replaceFromStaging(
  staged: string,
  target: string,
): Promise<void> {
  await rename(staged, target);
  await syncDirectory(path.dirname(target));
}

export async function atomicDurable(
  file: string,
  content: string,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeDurable(temporary, content, "wx");
  await rename(temporary, file);
  await syncDirectory(path.dirname(file));
}

export async function writeDurable(
  file: string,
  content: string,
  flag: "w" | "wx",
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(file, flag);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function syncDirectory(directory: string): Promise<void> {
  try {
    const handle = await open(directory, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (
      !(["EISDIR", "EPERM", "EINVAL"] as unknown[]).includes(
        (error as NodeJS.ErrnoException).code,
      )
    )
      throw error;
  }
}

export async function optionalJson<T>(file: string): Promise<T | null> {
  try {
    return parseStrictJson(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function optionalDirectories(root: string): Promise<string[]> {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function fileHash(file: string): Promise<string | null> {
  try {
    const info = await stat(file);
    return info.isFile() ? sha256Hex(await readFile(file, "utf8")) : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function transactionRelative(root: string, value: string): string {
  return path.relative(root, value).replace(/\\/gu, "/");
}

export function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
