import path from "node:path";
import type {
  Migration,
  MigrationReport,
  UpgradePlanItem,
  UpgradePlanItemStatus,
} from "./migrations.js";
import {
  LEGACY_HARNESS_JSON_CONFIG_PATH,
  readHarnessRootConfigCandidates,
} from "./harness-root.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { detectLegacyManagedDirectory } from "./legacy-managed-scan.js";
import { HARNESS_JSON_CONFIG_PATH } from "./paths.js";

type JsonRecord = Record<string, unknown>;

const LEGACY_MANAGED_ROOT = "pjsdlc_managed";
const CURRENT_MANAGED_ROOT = "ty-context-managed";
const LEGACY_MAKEFILE = "sdlc-harness.mk";
const CURRENT_MAKEFILE = "ty-context.mk";

export const legacySdlcHarnessMigration: Migration = {
  id: "legacy-sdlc-harness-rename",
  introducedIn: "0.2.54",
  description:
    "Rename legacy sdlc-harness configuration and pjsdlc_managed package-managed paths.",
  scope:
    "package.json, sdlc-harness.config.json, <harnessRoot>/config.yaml, old managed markers and pjsdlc_managed/**",
  risk: "safe",
  manualMessage:
    "Resolve legacy sdlc-harness conflicts or move old override rules into standalone project-local Skills.",
  detect: detectLegacySdlcHarness,
  apply: migrateLegacySdlcHarness,
  verify: async () => undefined,
};

async function detectLegacySdlcHarness(
  projectRoot: string,
  root: string,
  migration: string,
): Promise<UpgradePlanItem[]> {
  const items: UpgradePlanItem[] = [];
  const candidates = await readHarnessRootConfigCandidates(projectRoot);
  const currentCandidates = candidates.filter((candidate) => !candidate.legacy);
  const legacyCandidates = candidates.filter((candidate) => candidate.legacy);
  const currentRoot = currentCandidates[0]?.harnessFolderName;
  const distinctLegacyRoots = Array.from(
    new Set(legacyCandidates.map((candidate) => candidate.harnessFolderName)),
  );

  if (
    currentRoot &&
    distinctLegacyRoots.some((legacyRoot) => legacyRoot !== currentRoot)
  ) {
    items.push(
      item(
        migration,
        "blocked",
        rootConflictPath(currentCandidates, legacyCandidates),
        "Current ty-context and legacy sdlc-harness root configuration disagree; choose the harness root manually before upgrade.",
      ),
    );
  } else if (!currentRoot && distinctLegacyRoots.length > 1) {
    items.push(
      item(
        migration,
        "blocked",
        rootConflictPath(currentCandidates, legacyCandidates),
        "Legacy sdlc-harness root sources disagree; choose one harness root manually before upgrade.",
      ),
    );
  }

  items.push(
    ...(await detectLegacyManagedDirectory(
      projectRoot,
      root,
      legacySdlcHarnessMigration,
    )),
  );

  if (items.some((entry) => entry.status === "blocked")) {
    return items;
  }

  if (
    await needsLegacySafeMigration(
      projectRoot,
      root,
      legacyCandidates.length > 0,
    )
  ) {
    items.unshift(
      item(
        migration,
        "safe_pending",
        "legacy sdlc-harness surfaces",
        "Legacy sdlc-harness naming can be copied to ty-context configuration and refreshed by sync.",
      ),
    );
  }

  return items;
}

async function migrateLegacySdlcHarness(
  projectRoot: string,
  root: string,
  report: MigrationReport,
): Promise<void> {
  await migratePackageJsonConfig(projectRoot, report);
  await migrateJsonConfig(projectRoot, report);
  await migrateConfigYamlPaths(projectRoot, root, report);
}

async function needsLegacySafeMigration(
  projectRoot: string,
  root: string,
  hasLegacyRootConfig: boolean,
): Promise<boolean> {
  if (
    hasLegacyRootConfig &&
    (await legacyPackageConfigNeedsCopy(projectRoot))
  ) {
    return true;
  }
  if (await legacyJsonConfigNeedsCopy(projectRoot)) {
    return true;
  }
  if (await configYamlHasLegacyManagedPaths(projectRoot, root)) {
    return true;
  }
  if (await hasLegacyManagedMarkers(projectRoot)) {
    return true;
  }
  return false;
}

async function legacyPackageConfigNeedsCopy(
  projectRoot: string,
): Promise<boolean> {
  const packagePath = path.join(projectRoot, "package.json");
  if (!(await pathExists(packagePath))) {
    return false;
  }
  const packageJson = parseJsonRecord(
    await readText(packagePath),
    "package.json",
  );
  return (
    isJsonRecord(packageJson.sdlcHarness) &&
    !isJsonRecord(packageJson.tyContext)
  );
}

async function legacyJsonConfigNeedsCopy(
  projectRoot: string,
): Promise<boolean> {
  const legacyPath = path.join(projectRoot, LEGACY_HARNESS_JSON_CONFIG_PATH);
  const currentPath = path.join(projectRoot, HARNESS_JSON_CONFIG_PATH);
  return (await pathExists(legacyPath)) && !(await pathExists(currentPath));
}

async function configYamlHasLegacyManagedPaths(
  projectRoot: string,
  root: string,
): Promise<boolean> {
  const configPath = path.join(projectRoot, root, "config.yaml");
  if (!(await pathExists(configPath))) {
    return false;
  }
  return hasLegacyManagedPath(await readText(configPath));
}

async function hasLegacyManagedMarkers(projectRoot: string): Promise<boolean> {
  for (const relative of [
    "AGENTS.md",
    "Makefile",
    ".github/workflows/harness.yml",
  ]) {
    const target = path.join(projectRoot, ...relative.split("/"));
    if ((await pathExists(target)) && hasLegacyMarker(await readText(target))) {
      return true;
    }
  }
  return false;
}

async function migratePackageJsonConfig(
  projectRoot: string,
  report: MigrationReport,
): Promise<void> {
  const packagePath = path.join(projectRoot, "package.json");
  if (!(await pathExists(packagePath))) {
    report.skipped.push("package.json#sdlcHarness");
    return;
  }

  const packageJson = parseJsonRecord(
    await readText(packagePath),
    "package.json",
  );
  if (
    !isJsonRecord(packageJson.sdlcHarness) ||
    isJsonRecord(packageJson.tyContext)
  ) {
    report.skipped.push("package.json#sdlcHarness");
    return;
  }

  packageJson.tyContext = { ...packageJson.sdlcHarness };
  if (
    await writeTextIfChanged(
      packagePath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
    )
  ) {
    report.changed.push("package.json#tyContext");
  } else {
    report.skipped.push("package.json#tyContext");
  }
}

async function migrateJsonConfig(
  projectRoot: string,
  report: MigrationReport,
): Promise<void> {
  const legacyPath = path.join(projectRoot, LEGACY_HARNESS_JSON_CONFIG_PATH);
  const currentPath = path.join(projectRoot, HARNESS_JSON_CONFIG_PATH);
  if (!(await pathExists(legacyPath))) {
    report.skipped.push(LEGACY_HARNESS_JSON_CONFIG_PATH);
    return;
  }
  if (await pathExists(currentPath)) {
    report.skipped.push(HARNESS_JSON_CONFIG_PATH);
    return;
  }

  if (await writeTextIfChanged(currentPath, await readText(legacyPath))) {
    report.changed.push(HARNESS_JSON_CONFIG_PATH);
  } else {
    report.skipped.push(HARNESS_JSON_CONFIG_PATH);
  }
}

async function migrateConfigYamlPaths(
  projectRoot: string,
  root: string,
  report: MigrationReport,
): Promise<void> {
  const relative = `${root}/config.yaml`;
  const configPath = path.join(projectRoot, root, "config.yaml");
  if (!(await pathExists(configPath))) {
    report.skipped.push(relative);
    return;
  }

  const original = await readText(configPath);
  const next = rewriteLegacyManagedPaths(original);
  if (next === original) {
    report.skipped.push(relative);
    return;
  }
  if (await writeTextIfChanged(configPath, next)) {
    report.changed.push(`${relative}#legacy-managed-paths`);
  } else {
    report.skipped.push(`${relative}#legacy-managed-paths`);
  }
}

function rewriteLegacyManagedPaths(content: string): string {
  return content
    .replaceAll(LEGACY_MANAGED_ROOT, CURRENT_MANAGED_ROOT)
    .replaceAll(LEGACY_MAKEFILE, CURRENT_MAKEFILE);
}

function hasLegacyManagedPath(content: string): boolean {
  return (
    content.includes(LEGACY_MANAGED_ROOT) || content.includes(LEGACY_MAKEFILE)
  );
}

function hasLegacyMarker(content: string): boolean {
  return [
    "<!-- pjsdlc:sdlc-harness:begin -->",
    "<!-- sdlc-harness:begin -->",
    "# pjsdlc:sdlc-harness:make:begin",
    "# sdlc-harness:make:begin",
    "# pjsdlc:sdlc-harness:github-workflow:begin",
  ].some((marker) => content.includes(marker));
}

function rootConflictPath(
  currentCandidates: Array<{ source: string; harnessFolderName: string }>,
  legacyCandidates: Array<{ source: string; harnessFolderName: string }>,
): string {
  return [...currentCandidates, ...legacyCandidates]
    .map((candidate) => `${candidate.source}=${candidate.harnessFolderName}`)
    .join(", ");
}

function item(
  migrationId: string,
  status: UpgradePlanItemStatus,
  pathLabel: string,
  message: string,
): UpgradePlanItem {
  return {
    id: legacySdlcHarnessMigration.id,
    introducedIn: legacySdlcHarnessMigration.introducedIn,
    description: legacySdlcHarnessMigration.description,
    scope: legacySdlcHarnessMigration.scope,
    status,
    path: pathLabel,
    message,
  };
}

function parseJsonRecord(content: string, pathLabel: string): JsonRecord {
  const parsed = JSON.parse(content) as unknown;
  if (!isJsonRecord(parsed)) {
    throw new Error(`${pathLabel} must contain a JSON object`);
  }
  return parsed;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
