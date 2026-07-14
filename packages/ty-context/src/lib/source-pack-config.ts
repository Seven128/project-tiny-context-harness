import path from "node:path";
import { harnessConfigPath } from "./harness-root.js";
import { pathExists, readText } from "./fs.js";
import { parseYaml } from "./yaml.js";
import { toPosix } from "./source-files.js";
import type {
  ContextAreaMapping,
  SourcePackProfile,
} from "./source-pack-types.js";

export async function readSourcePackProfile(
  projectRoot: string,
  profileId?: string,
): Promise<SourcePackProfile> {
  if (!profileId) {
    return { context: [], code: [], exclude: [], verification: [] };
  }
  const configPath = path.join(
    projectRoot,
    await harnessConfigPath(projectRoot),
  );
  if (!(await pathExists(configPath))) {
    throw new Error(`source pack profile not found: ${profileId}`);
  }
  const parsed = parseYaml(await readText(configPath));
  const sourcePacks =
    parsed && typeof parsed === "object"
      ? (parsed as { source_packs?: unknown }).source_packs
      : undefined;
  const profileValue =
    sourcePacks && typeof sourcePacks === "object"
      ? (sourcePacks as Record<string, unknown>)[profileId]
      : undefined;
  if (
    !profileValue ||
    typeof profileValue !== "object" ||
    Array.isArray(profileValue)
  ) {
    throw new Error(`source pack profile not found: ${profileId}`);
  }
  const value = profileValue as Record<string, unknown>;
  return {
    context: readPatternList(
      value.context,
      `source_packs.${profileId}.context`,
      "context path",
    ),
    code: readPatternList(
      value.code,
      `source_packs.${profileId}.code`,
      "code path",
    ),
    exclude: readPatternList(
      value.exclude,
      `source_packs.${profileId}.exclude`,
      "exclude path",
    ),
    verification: readStringList(
      value.verification,
      `source_packs.${profileId}.verification`,
    ),
    maxBundleCharacters: readPositiveInteger(
      value.max_bundle_characters,
      `source_packs.${profileId}.max_bundle_characters`,
    ),
  };
}

export async function parseContextAreas(
  projectRoot: string,
): Promise<ContextAreaMapping[]> {
  const manifestPath = path.join(
    projectRoot,
    "project_context",
    "context.toml",
  );
  if (!(await pathExists(manifestPath))) {
    return [];
  }
  const content = await readText(manifestPath);
  const areas: ContextAreaMapping[] = [];
  for (const block of content.split(/\[\[areas\]\]/g).slice(1)) {
    const id = /id\s*=\s*"([^"]+)"/.exec(block)?.[1];
    const root = /root\s*=\s*"([^"]+)"/.exec(block)?.[1];
    const context = /context\s*=\s*"([^"]+)"/.exec(block)?.[1];
    if (id && root && context) {
      areas.push({
        id,
        root: normalizeRepoPath(root, "area root"),
        context: normalizeRepoPath(context, "area context"),
      });
    }
  }
  return areas.sort((left, right) => left.id.localeCompare(right.id));
}

export function mergePatterns(
  ...groups: Array<string[] | undefined>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => group ?? [])
        .map((value) => normalizeRepoPath(value, "include path")),
    ),
  ].sort();
}

export function validatePatternList(values: string[], label: string): string[] {
  return values.map((value) => normalizeRepoPath(value, label));
}

export function matchesAny(relative: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(relative));
}

export function normalizeRepoPath(value: string, label: string): string {
  const normalized = toPosix(value.trim()).replace(/^\.\//, "");
  if (!isAllowedPatternPath(normalized)) {
    throw new Error(
      `${label} must be repo-relative and stay inside the workspace: ${value}`,
    );
  }
  return normalized;
}

function readPatternList(
  value: unknown,
  label: string,
  pathLabel: string,
): string[] {
  return readStringList(value, label).map((item) =>
    normalizeRepoPath(item, pathLabel),
  );
}

function readStringList(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new Error(
      `<harnessRoot>/config.yaml ${label} must be an array of non-empty strings`,
    );
  }
  return value.map((item) => item.trim());
}

function readPositiveInteger(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(
      `<harnessRoot>/config.yaml ${label} must be a positive integer`,
    );
  }
  return Number(value);
}

function isAllowedPatternPath(value: string): boolean {
  return (
    value.length > 0 &&
    !path.posix.isAbsolute(value) &&
    !value.split("/").includes("..")
  );
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, ".*");
  return new RegExp(`^${escaped}$`);
}
