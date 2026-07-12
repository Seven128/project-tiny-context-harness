import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 64;

export interface MaterializedHostReleaseV1 {
  root: string;
  cleanup(): Promise<void>;
}

export async function materializeHostReleaseSourceV1(source: string): Promise<MaterializedHostReleaseV1> {
  const link = await lstat(source).catch(() => undefined);
  if (!link) throw new Error("host_release_source_missing");
  if (link.isSymbolicLink()) throw new Error("host_release_source_symlink_forbidden");
  if (link.isDirectory()) return { root: await realpath(source), cleanup: async () => undefined };
  if (!link.isFile() || link.size > MAX_ARCHIVE_BYTES) throw new Error("host_release_archive_size_invalid");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-context-host-release-"));
  try {
    const root = await extractOfficialArchive(await readFile(source), temporary);
    return { root, cleanup: () => rm(temporary, { recursive: true, force: true }) };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

async function extractOfficialArchive(compressed: Buffer, destination: string): Promise<string> {
  let archive: Buffer;
  try {
    archive = gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED_BYTES });
  } catch {
    throw new Error("host_release_archive_gzip_invalid");
  }
  if (archive.length < 1024 || archive.length % 512 !== 0) throw new Error("host_release_archive_framing_invalid");
  const entries: Array<{ root: string; name: string; bytes: Buffer; mode: number }> = [];
  let offset = 0;
  let terminal = false;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (zero(header)) {
      const next = archive.subarray(offset + 512, offset + 1024);
      if (next.length !== 512 || !zero(next) || !zero(archive.subarray(offset + 1024))) throw new Error("host_release_archive_terminator_invalid");
      terminal = true;
      break;
    }
    verifyHeader(header);
    const type = header[156];
    if (type !== 0 && type !== 0x30) throw new Error("host_release_archive_entry_type_invalid");
    const size = octal(header.subarray(124, 136), "size");
    if (size > MAX_FILE_BYTES || entries.length >= MAX_FILES) throw new Error("host_release_archive_size_invalid");
    const end = offset + 512 + size;
    if (end > archive.length) throw new Error("host_release_archive_framing_invalid");
    const { root, name } = archivePath(text(header.subarray(0, 100)));
    entries.push({ root, name, bytes: Buffer.from(archive.subarray(offset + 512, end)), mode: executable(name) ? 0o755 : 0o644 });
    offset = end + ((512 - (size % 512)) % 512);
  }
  if (!terminal || entries.length === 0 || new Set(entries.map((entry) => entry.name)).size !== entries.length) throw new Error("host_release_archive_entries_invalid");
  const roots = new Set(entries.map((entry) => entry.root));
  if (roots.size !== 1) throw new Error("host_release_archive_root_invalid");
  const releaseRoot = path.join(destination, entries[0]!.root);
  await mkdir(releaseRoot, { recursive: false });
  for (const entry of entries) await writeFile(path.join(releaseRoot, entry.name), entry.bytes, { flag: "wx", mode: entry.mode });
  return releaseRoot;
}

function verifyHeader(header: Buffer): void {
  if (text(header.subarray(257, 263)) !== "ustar") throw new Error("host_release_archive_format_invalid");
  if (text(header.subarray(345, 500))) throw new Error("host_release_archive_path_invalid");
  const expected = octal(header.subarray(148, 156), "checksum");
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  if (copy.reduce((sum, byte) => sum + byte, 0) !== expected) throw new Error("host_release_archive_checksum_invalid");
}

function archivePath(value: string): { root: string; name: string } {
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => !portable(part))) throw new Error("host_release_archive_path_invalid");
  return { root: parts[0]!, name: parts[1]! };
}

function portable(value: string): boolean {
  if (!value || value === "." || value === ".." || !/^[A-Za-z0-9._-]+$/u.test(value)) return false;
  const stem = value.split(".")[0]!.toUpperCase();
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(stem);
}

function octal(bytes: Buffer, field: string): number {
  const value = text(bytes).trim();
  if (!/^[0-7]+$/u.test(value)) throw new Error(`host_release_archive_${field}_invalid`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`host_release_archive_${field}_invalid`);
  return parsed;
}

function text(bytes: Buffer): string {
  const end = bytes.indexOf(0);
  const value = bytes.subarray(0, end >= 0 ? end : bytes.length).toString("utf8");
  if (!Buffer.from(value, "utf8").equals(bytes.subarray(0, end >= 0 ? end : bytes.length))) throw new Error("host_release_archive_text_invalid");
  return value.trimEnd();
}

function zero(bytes: Buffer): boolean {
  return bytes.every((byte) => byte === 0);
}

function executable(name: string): boolean {
  return /^ty-context-host-(?:helper|admin|installer-ui)(?:\.exe)?$/u.test(name);
}
