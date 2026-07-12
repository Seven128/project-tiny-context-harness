import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";

export interface WindowsPeRuntimeFileV1 {
  path: string;
  sha256: string;
  size: number;
}

const MAX_FILES = 512;
const MAX_BYTES = 1024 * 1024 * 1024;
const INCLUDE_DELAY_IMPORTS = false;

export async function resolveWindowsPeRuntimeV1(
  executable: string,
): Promise<WindowsPeRuntimeFileV1[]> {
  if (process.platform !== "win32") return [];
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot) throw new Error("windows_runtime_system_root_missing");
  const entry = await realpath(executable);
  const applicationRoot = path.dirname(entry);
  const system32 = path.join(systemRoot, "System32");
  const queue = [entry];
  const visited = new Set<string>();
  const runtime = new Map<string, WindowsPeRuntimeFileV1>();
  let totalBytes = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = normalized(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    if (visited.size > MAX_FILES) throw new Error("windows_runtime_file_limit");
    const bytes = await readFile(current);
    totalBytes += bytes.length;
    if (totalBytes > MAX_BYTES) throw new Error("windows_runtime_byte_limit");
    if (currentKey !== normalized(entry)) {
      runtime.set(currentKey, {
        path: current,
        sha256: sha256Hex(bytes),
        size: bytes.length,
      });
    }
    for (const imported of peImports(bytes)) {
      const { name } = imported;
      const resolved = await resolveImport(
        name,
        applicationRoot,
        path.dirname(current),
        system32,
      );
      if (resolved) queue.push(resolved);
      else if (!imported.optional && !/^(?:api|ext)-ms-/iu.test(name)) {
        throw new Error(`windows_runtime_import_missing:${name}`);
      }
    }
  }
  return [...runtime.values()].sort((left, right) =>
    normalized(left.path).localeCompare(normalized(right.path)),
  );
}

async function resolveImport(
  name: string,
  applicationRoot: string,
  moduleRoot: string,
  system32: string,
): Promise<string | null> {
  if (
    !name ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes(":") ||
    name === "." ||
    name === ".."
  ) {
    throw new Error(`windows_runtime_import_name:${name}`);
  }
  for (const root of [applicationRoot, moduleRoot, system32]) {
    const candidate = path.join(root, name);
    try {
      const info = await stat(candidate);
      if (info.isFile()) return await realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

interface PeImport {
  name: string;
  optional: boolean;
}

function peImports(bytes: Buffer): PeImport[] {
  if (bytes.length < 0x40 || bytes.readUInt16LE(0) !== 0x5a4d) {
    throw new Error("windows_runtime_pe_dos_header");
  }
  const pe = bytes.readUInt32LE(0x3c);
  if (pe + 24 > bytes.length || bytes.readUInt32LE(pe) !== 0x00004550) {
    throw new Error("windows_runtime_pe_signature");
  }
  const sectionCount = bytes.readUInt16LE(pe + 6);
  const optionalSize = bytes.readUInt16LE(pe + 20);
  const optional = pe + 24;
  if (optional + optionalSize > bytes.length) {
    throw new Error("windows_runtime_pe_optional_header");
  }
  const magic = bytes.readUInt16LE(optional);
  const directoryStart = magic === 0x20b ? optional + 112 : magic === 0x10b ? optional + 96 : 0;
  const directoryCountOffset = magic === 0x20b ? optional + 108 : optional + 92;
  if (directoryStart === 0) throw new Error("windows_runtime_pe_magic");
  const directoryCount = bytes.readUInt32LE(directoryCountOffset);
  const sections = parseSections(bytes, optional + optionalSize, sectionCount);
  const names = new Map<string, boolean>();
  if (directoryCount > 1) {
    const importRva = bytes.readUInt32LE(directoryStart + 8);
    if (importRva !== 0) readImportTable(bytes, sections, importRva, names);
  }
  if (INCLUDE_DELAY_IMPORTS && directoryCount > 13) {
    const delayRva = bytes.readUInt32LE(directoryStart + 13 * 8);
    if (delayRva !== 0) readDelayImportTable(bytes, sections, delayRva, names);
  }
  return [...names]
    .map(([name, optional]) => ({ name, optional }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

interface PeSection {
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
}

function parseSections(bytes: Buffer, offset: number, count: number): PeSection[] {
  if (count < 1 || count > 128 || offset + count * 40 > bytes.length) {
    throw new Error("windows_runtime_pe_sections");
  }
  const sections: PeSection[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = offset + index * 40;
    sections.push({
      virtualSize: bytes.readUInt32LE(item + 8),
      virtualAddress: bytes.readUInt32LE(item + 12),
      rawSize: bytes.readUInt32LE(item + 16),
      rawOffset: bytes.readUInt32LE(item + 20),
    });
  }
  return sections;
}

function readImportTable(
  bytes: Buffer,
  sections: PeSection[],
  rva: number,
  names: Map<string, boolean>,
): void {
  let offset = rvaOffset(bytes, sections, rva);
  for (let count = 0; count < 4096; count += 1, offset += 20) {
    ensureRange(bytes, offset, 20);
    const allZero =
      bytes.readUInt32LE(offset) === 0 &&
      bytes.readUInt32LE(offset + 4) === 0 &&
      bytes.readUInt32LE(offset + 8) === 0 &&
      bytes.readUInt32LE(offset + 12) === 0 &&
      bytes.readUInt32LE(offset + 16) === 0;
    if (allZero) return;
    names.set(
      readAscii(bytes, rvaOffset(bytes, sections, bytes.readUInt32LE(offset + 12))),
      false,
    );
  }
  throw new Error("windows_runtime_pe_import_limit");
}

function readDelayImportTable(
  bytes: Buffer,
  sections: PeSection[],
  rva: number,
  names: Map<string, boolean>,
): void {
  let offset = rvaOffset(bytes, sections, rva);
  for (let count = 0; count < 4096; count += 1, offset += 32) {
    ensureRange(bytes, offset, 32);
    const attributes = bytes.readUInt32LE(offset);
    const name = bytes.readUInt32LE(offset + 4);
    if (attributes === 0 && name === 0) return;
    if ((attributes & 1) === 0) throw new Error("windows_runtime_pe_delay_va");
    const value = readAscii(bytes, rvaOffset(bytes, sections, name));
    if (!names.has(value)) names.set(value, true);
  }
  throw new Error("windows_runtime_pe_delay_limit");
}

function rvaOffset(bytes: Buffer, sections: PeSection[], rva: number): number {
  for (const section of sections) {
    const size = Math.max(section.virtualSize, section.rawSize);
    if (rva >= section.virtualAddress && rva < section.virtualAddress + size) {
      const offset = section.rawOffset + rva - section.virtualAddress;
      ensureRange(bytes, offset, 1);
      return offset;
    }
  }
  if (rva < bytes.length) return rva;
  throw new Error(`windows_runtime_pe_rva:${rva}`);
}

function readAscii(bytes: Buffer, offset: number): string {
  let end = offset;
  while (end < bytes.length && end - offset <= 260 && bytes[end] !== 0) end += 1;
  if (end === bytes.length || end - offset > 260) {
    throw new Error("windows_runtime_pe_string");
  }
  return bytes.subarray(offset, end).toString("ascii");
}

function ensureRange(bytes: Buffer, offset: number, length: number): void {
  if (offset < 0 || length < 0 || offset + length > bytes.length) {
    throw new Error("windows_runtime_pe_range");
  }
}

function normalized(value: string): string {
  return path.resolve(value).replace(/^\\\\\?\\/u, "").toLocaleLowerCase("en-US");
}
