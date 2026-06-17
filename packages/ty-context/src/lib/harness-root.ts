import path from "node:path";
import { DEFAULT_HARNESS_ROOT, HARNESS_JSON_CONFIG_PATH } from "./paths.js";
import { pathExists, readText } from "./fs.js";

export interface HarnessRootConfig {
  harnessFolderName: string;
  source: string;
}

export interface HarnessRootConfigCandidate extends HarnessRootConfig {
  legacy: boolean;
}

export const LEGACY_HARNESS_JSON_CONFIG_PATH = "sdlc-harness.config.json";

export async function readHarnessRootConfig(projectRoot: string): Promise<HarnessRootConfig> {
  const candidates = await readHarnessRootConfigCandidates(projectRoot);
  if (candidates.length > 0) {
    const candidate = candidates[0];
    return { harnessFolderName: candidate.harnessFolderName, source: candidate.source };
  }
  return { harnessFolderName: DEFAULT_HARNESS_ROOT, source: "default" };
}

export async function readHarnessRootConfigCandidates(projectRoot: string): Promise<HarnessRootConfigCandidate[]> {
  const candidates: HarnessRootConfigCandidate[] = [];
  const packageJson = await readJsonConfig(path.join(projectRoot, "package.json"));
  const packageConfig = packageJson && typeof packageJson === "object" ? (packageJson as Record<string, unknown>).tyContext : undefined;
  const packageValue = folderNameFromObject(packageConfig);
  if (packageValue) {
    candidates.push({ harnessFolderName: normalizeHarnessFolderName(packageValue), source: "package.json#tyContext", legacy: false });
  }

  const explicitConfig = await readJsonConfig(path.join(projectRoot, HARNESS_JSON_CONFIG_PATH));
  const explicitValue = folderNameFromObject(explicitConfig);
  if (explicitValue) {
    candidates.push({ harnessFolderName: normalizeHarnessFolderName(explicitValue), source: HARNESS_JSON_CONFIG_PATH, legacy: false });
  }

  const legacyPackageConfig =
    packageJson && typeof packageJson === "object" ? (packageJson as Record<string, unknown>).sdlcHarness : undefined;
  const legacyPackageValue = folderNameFromObject(legacyPackageConfig);
  if (legacyPackageValue) {
    candidates.push({
      harnessFolderName: normalizeHarnessFolderName(legacyPackageValue),
      source: "package.json#sdlcHarness",
      legacy: true
    });
  }

  const legacyExplicitConfig = await readJsonConfig(path.join(projectRoot, LEGACY_HARNESS_JSON_CONFIG_PATH));
  const legacyExplicitValue = folderNameFromObject(legacyExplicitConfig);
  if (legacyExplicitValue) {
    candidates.push({
      harnessFolderName: normalizeHarnessFolderName(legacyExplicitValue),
      source: LEGACY_HARNESS_JSON_CONFIG_PATH,
      legacy: true
    });
  }

  return candidates;
}

export async function harnessRoot(projectRoot: string): Promise<string> {
  return (await readHarnessRootConfig(projectRoot)).harnessFolderName;
}

export async function harnessConfigPath(projectRoot: string): Promise<string> {
  return harnessPath(await harnessRoot(projectRoot), "config.yaml");
}

export function harnessPath(root: string, ...segments: string[]): string {
  return [root, ...segments].join("/").replace(/\/+/g, "/");
}

function folderNameFromObject(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const folderName = record.harnessFolderName ?? record.harnessFloderName;
  return typeof folderName === "string" && folderName.trim() ? folderName : undefined;
}

async function readJsonConfig(filePath: string): Promise<unknown> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }
  return JSON.parse(await readText(filePath)) as unknown;
}

export function normalizeHarnessFolderName(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("harnessFolderName must be a non-empty relative directory");
  }
  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error("harnessFolderName must not be absolute or contain '..'");
  }
  return normalized;
}
