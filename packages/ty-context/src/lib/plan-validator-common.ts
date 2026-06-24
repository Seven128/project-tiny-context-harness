import { promises as fs } from "node:fs";
import path from "node:path";
import { pathExists, readText } from "./fs.js";

export interface PlanTableRow {
  index: number;
  line: number;
  cells: Record<string, string>;
  text: string;
}

export interface ParsedPlanTable {
  rows: PlanTableRow[];
  headers: string[];
}

const PATH_PATTERN =
  /(?:`([^`]+)`)|((?:\.\/)?(?:project_context|packages|tests|tmp|src|app|pages|components|\.codex|tools|examples)\/[A-Za-z0-9._@+/-]+(?:\.(?:md|ts|tsx|js|mjs|json|yaml|yml|toml|png|jpe?g|webp|html|css|scss|py|go|rs|java|cs|sh|ps1))?)/g;

const WEAK_PROOF_PATTERNS = [
  /\bchecked path(?:s)?\b/i,
  /\bsampled(?:[_ -]?only)?\b/i,
  /\bnot live-proven\b/i,
  /\blacks?\b/i,
  /\bmissing\b/i,
  /\bgap\b/i,
  /\bpartial\b/i,
  /\bblocked\b/i,
  /\bunconfigured\b/i,
  /\bnot visible by default\b/i
];

export async function resolveInputFile(projectRoot: string, value: string | undefined, defaultPath: string): Promise<string> {
  const raw = value ?? defaultPath;
  const absolute = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(projectRoot, raw);
  let candidate = absolute;
  try {
    const stat = await fs.stat(absolute);
    if (stat.isDirectory()) {
      candidate = path.join(absolute, defaultPath);
    }
  } catch {
    if (!path.extname(absolute)) {
      candidate = path.join(absolute, defaultPath);
    }
  }
  return candidate;
}

export async function resolveInputDir(projectRoot: string, value: string | undefined, defaultPath: string): Promise<string> {
  return path.isAbsolute(value ?? defaultPath)
    ? path.resolve(value ?? defaultPath)
    : path.resolve(projectRoot, value ?? defaultPath);
}

export function repoRelative(projectRoot: string, file: string): string {
  return path.relative(projectRoot, file).split(path.sep).join("/");
}

export async function readRequiredFile(projectRoot: string, file: string, label: string, errors: string[]): Promise<string | undefined> {
  if (!isInside(projectRoot, file)) {
    errors.push(`${label} must stay inside the project root: ${file}`);
    return undefined;
  }
  if (!(await pathExists(file))) {
    errors.push(`${label} is missing: ${repoRelative(projectRoot, file)}`);
    return undefined;
  }
  return readText(file);
}

export function parseRequiredTable(
  content: string,
  heading: string,
  expectedHeaders: string[],
  label: string,
  errors: string[]
): ParsedPlanTable | undefined {
  const section = sectionBody(content, heading);
  if (section === undefined) {
    errors.push(`plan contract is missing section: ${heading}`);
    return undefined;
  }
  const lines = section.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("|")) {
      continue;
    }
    const headers = splitTableLine(lines[index]);
    const normalized = headers.map(normalizeHeader);
    if (!expectedHeaders.every((header) => normalized.includes(normalizeHeader(header)))) {
      continue;
    }
    const rows: PlanTableRow[] = [];
    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex];
      if (!line.includes("|")) {
        break;
      }
      if (isSeparatorLine(line)) {
        continue;
      }
      const values = splitTableLine(line);
      const cells: Record<string, string> = {};
      for (const [cellIndex, header] of normalized.entries()) {
        cells[header] = values[cellIndex]?.trim() ?? "";
      }
      rows.push({
        index: rows.length + 1,
        line: rowIndex + 1,
        cells,
        text: Object.values(cells).join(" ")
      });
    }
    const missing = expectedHeaders.filter((header) => !normalized.includes(normalizeHeader(header)));
    if (missing.length > 0) {
      errors.push(`${label} table is missing column(s): ${missing.join(", ")}`);
    }
    return { rows, headers: normalized };
  }
  errors.push(`${label} section must include a markdown table with columns: ${expectedHeaders.join(" | ")}`);
  return undefined;
}

export function cell(row: PlanTableRow, header: string): string {
  return row.cells[normalizeHeader(header)] ?? "";
}

export function isBlankish(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isBlankish);
  }
  if (value === undefined || value === null) {
    return true;
  }
  const text = String(value).trim().toLowerCase();
  return text === "" || text === "-" || text === "n/a" || text === "na" || text === "none" || text === "[]" || text === "not applicable";
}

export function weakProofHit(text: string): string | undefined {
  return WEAK_PROOF_PATTERNS.find((pattern) => pattern.test(text))?.source;
}

export async function assertReferencedPathsExist(
  projectRoot: string,
  label: string,
  text: string,
  errors: string[]
): Promise<void> {
  for (const reference of extractPathReferences(text)) {
    const absolute = path.resolve(projectRoot, reference);
    if (!isInside(projectRoot, absolute)) {
      errors.push(`${label} references a path outside the project root: ${reference}`);
      continue;
    }
    if (!(await pathExists(absolute))) {
      errors.push(`${label} references missing path: ${reference}`);
    }
  }
}

export function primitiveText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(primitiveText).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(primitiveText).join(" ");
  }
  return "";
}

export function valuesAsArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(valuesAsArray);
  }
  if (isBlankish(value)) {
    return [];
  }
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasRealPageEvidence(text: string): boolean {
  return /\b(real[- ]page|browser|route|screen|screenshot|url|localhost|https?:\/\/|page)\b/i.test(text);
}

export function isUiFacing(text: string): boolean {
  return /\b(ui|browser|page|screen|console|frontend|route|surface)\b/i.test(text);
}

export function isRuntimeFacing(text: string): boolean {
  return /\b(runtime|worker|api|schema|endpoint|service|queue|daemon|runner)\b/i.test(text);
}

function sectionBody(content: string, heading: string): string | undefined {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(content);
  if (!match) {
    return undefined;
  }
  const rest = content.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function splitTableLine(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cellValue) => cellValue.trim());
}

function isSeparatorLine(line: string): boolean {
  return splitTableLine(line).every((value) => /^:?-{3,}:?$/.test(value.trim()));
}

function normalizeHeader(value: string): string {
  return value.replace(/`/g, "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function extractPathReferences(text: string): string[] {
  const references = new Set<string>();
  for (const match of text.matchAll(PATH_PATTERN)) {
    const raw = (match[1] ?? match[2] ?? "").trim();
    if (!raw || raw.includes("*") || /^https?:\/\//i.test(raw)) {
      continue;
    }
    references.add(raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/[),.;:]+$/, ""));
  }
  return [...references];
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
