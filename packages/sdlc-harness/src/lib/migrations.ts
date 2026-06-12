import path from "node:path";
import { promises as fs } from "node:fs";
import { CONTEXT_MANIFEST_PATH, contextManifestFromExistingAreas } from "./context-manifest.js";
import {
  architectureContextTemplate,
  areaContextTemplate,
  globalContextTemplate,
  verificationContextTemplate
} from "./context-templates.js";
import { CURRENT_SCHEMA_VERSION } from "./constants.js";
import { defaultConfig, readConfig } from "./config.js";
import { createDesignMdIfMissing, DESIGN_MD_PATH } from "./design-md.js";
import { ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { stringifyYaml } from "./yaml.js";

export type UpgradePlanItemStatus = "safe_pending" | "manual_required" | "blocked";

export interface UpgradePlanItem {
  id: string;
  introducedIn: string;
  description: string;
  scope: string;
  status: UpgradePlanItemStatus;
  message: string;
  path?: string;
}

export interface UpgradePlan {
  safe_pending: UpgradePlanItem[];
  manual_required: UpgradePlanItem[];
  blocked: UpgradePlanItem[];
}

export type ReleaseUpdateMode = "sync-only" | "upgrade-required" | "manual-required";

export interface Migration {
  id: string;
  introducedIn: string;
  description: string;
  scope: string;
  risk: "safe" | "manual";
  manualMessage: string;
  detect(projectRoot: string, root: string, migrationId: string): Promise<UpgradePlanItem[]>;
  apply?(projectRoot: string, root: string, report: MigrationReport): Promise<void>;
  verify(projectRoot: string, root: string): Promise<void>;
}

export interface MigrationReport {
  changed: string[];
  skipped: string[];
  manualRequired: UpgradePlanItem[];
  blocked: UpgradePlanItem[];
}

async function verifyNoop(): Promise<void> {
  return;
}

export const migrations: Migration[] = [
  {
    id: "schema-v4-config-refresh",
    introducedIn: "0.2.0",
    description: "Refresh Harness config core metadata and managed-file list for Schema v4.",
    scope: "<harnessRoot>/config.yaml",
    risk: "safe",
    manualMessage: "Review Harness config manually if custom managed-file paths still drift after upgrade.",
    detect: detectConfigRefresh,
    apply: migrateConfig,
    verify: verifyNoop
  },
  {
    id: "legacy-modules-to-areas",
    introducedIn: "0.2.0",
    description: "Move legacy project_context/modules/**/*.md files to project_context/areas/**/*.md.",
    scope: "project_context/modules/**",
    risk: "safe",
    manualMessage: "Resolve target conflicts manually; the Harness will not overwrite existing area Context files.",
    detect: detectLegacyModulesToAreas,
    apply: migrateLegacyModulesToAreas,
    verify: verifyNoop
  },
  {
    id: "context-manifest-baseline",
    introducedIn: "0.2.0",
    description: "Create the Schema v4 project_context/context.toml manifest when missing.",
    scope: "project_context/context.toml and project_context/areas/**",
    risk: "safe",
    manualMessage: "Review deep area files without manifest roles and assign explicit context roles when needed.",
    detect: detectContextManifestBaseline,
    apply: migrateContextManifest,
    verify: verifyNoop
  },
  {
    id: "global-context-v4-sections",
    introducedIn: "0.2.0",
    description: "Add missing Schema v4 global Context sections and rewrite legacy module links.",
    scope: "project_context/global.md",
    risk: "safe",
    manualMessage: "Review global Context manually if project-specific long-term facts need refinement.",
    detect: detectGlobalContextSections,
    apply: migrateGlobalContextSections,
    verify: verifyNoop
  },
  {
    id: "design-md-baseline",
    introducedIn: "0.2.0",
    description: "Create DESIGN.md for existing Harness projects when missing.",
    scope: "DESIGN.md",
    risk: "safe",
    manualMessage: "Review the starter design baseline and replace it with project-specific visual facts when available.",
    detect: detectDesignMdBaseline,
    apply: migrateDesignMd,
    verify: verifyNoop
  },
  {
    id: "deprecated-skill-overrides",
    introducedIn: "0.2.0",
    description: "Report deprecated managed skill overrides that must move to standalone project-local Skills.",
    scope: "<harnessRoot>/pjsdlc_managed/override_skills/**",
    risk: "manual",
    manualMessage: "Move override files into standalone project-local Skills before running sync.",
    detect: detectDeprecatedSkillOverrides,
    verify: verifyNoop
  }
];

export async function createUpgradePlan(projectRoot: string): Promise<UpgradePlan> {
  const root = await harnessRoot(projectRoot);
  const plan: UpgradePlan = { safe_pending: [], manual_required: [], blocked: [] };
  for (const migration of migrations) {
    for (const item of await migration.detect(projectRoot, root, migration.id)) {
      plan[item.status].push(item);
    }
  }
  return plan;
}

export function hasUpgradePlanWork(plan: UpgradePlan): boolean {
  return plan.safe_pending.length > 0 || plan.manual_required.length > 0 || plan.blocked.length > 0;
}

export function updateModeForPlan(plan: UpgradePlan): ReleaseUpdateMode {
  if (plan.manual_required.length > 0 || plan.blocked.length > 0) {
    return "manual-required";
  }
  if (plan.safe_pending.length > 0) {
    return "upgrade-required";
  }
  return "sync-only";
}

export function formatUpgradePlan(plan: UpgradePlan): string[] {
  const lines: string[] = [
    `upgrade plan mode=${updateModeForPlan(plan)} safe_pending=${plan.safe_pending.length} manual_required=${plan.manual_required.length} blocked=${plan.blocked.length}`
  ];
  for (const status of ["safe_pending", "manual_required", "blocked"] as const) {
    for (const item of plan[status]) {
      const location = item.path ? ` ${item.path}` : "";
      lines.push(`${status}: ${item.id}${location} - ${item.message}`);
    }
  }
  return lines;
}

export async function runMigrations(projectRoot: string, existingPlan?: UpgradePlan): Promise<MigrationReport> {
  const report: MigrationReport = { changed: [], skipped: [], manualRequired: [], blocked: [] };
  const root = await harnessRoot(projectRoot);
  const plan = existingPlan ?? (await createUpgradePlan(projectRoot));
  report.manualRequired.push(...plan.manual_required);
  report.blocked.push(...plan.blocked);
  if (plan.blocked.length > 0) {
    return report;
  }

  for (const migration of migrations) {
    if (!migration.apply) {
      continue;
    }
    if (!plan.safe_pending.some((item) => item.id === migration.id)) {
      report.skipped.push(migration.id);
      continue;
    }
    await migration.apply(projectRoot, root, report);
    await migration.verify(projectRoot, root);
  }

  await migrateBaseProjectContext(projectRoot, report);
  await migrateManifestModulePaths(projectRoot, report);
  return report;
}

async function migrateBaseProjectContext(projectRoot: string, report: MigrationReport): Promise<void> {
  await ensureDir(path.join(projectRoot, "project_context", "areas"));
  const files: Array<[string, string]> = [
    ["project_context/global.md", globalContextTemplate()],
    ["project_context/architecture.md", architectureContextTemplate()]
  ];
  if (await contextManifestReferences(projectRoot, "project_context/areas/main.md")) {
    files.push(["project_context/areas/main.md", areaContextTemplate("main")]);
  }
  if (await contextManifestReferences(projectRoot, "project_context/areas/main/verification.md")) {
    files.push(["project_context/areas/main/verification.md", verificationContextTemplate("main")]);
  }
  for (const [relative, content] of files) {
    const target = path.join(projectRoot, ...relative.split("/"));
    if (await pathExists(target)) {
      report.skipped.push(relative);
      continue;
    }
    if (await writeTextIfChanged(target, content)) {
      report.changed.push(relative);
    } else {
      report.skipped.push(relative);
    }
  }
}

async function contextManifestReferences(projectRoot: string, relative: string): Promise<boolean> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  if (!(await pathExists(manifestPath))) {
    return true;
  }
  return manifestReferencesPath(await readText(manifestPath), relative);
}

async function detectGlobalContextSections(projectRoot: string, _root: string, migration: string): Promise<UpgradePlanItem[]> {
  const relative = "project_context/global.md";
  const target = path.join(projectRoot, ...relative.split("/"));
  if (!(await pathExists(target))) {
    return [];
  }
  const original = await readText(target);
  const rewritten = rewriteLegacyModuleReferences(original);
  const needsSections =
    !hasHeading(rewritten, "Architecture Context") ||
    !hasHeading(rewritten, "Context Graph") ||
    !hasHeading(rewritten, "Context Index");
  if (!needsSections && rewritten === original) {
    return [];
  }
  return [
    item(migration, "safe_pending", relative, "Global Context needs Schema v4 sections or legacy module path rewrites.")
  ];
}

async function migrateGlobalContextSections(projectRoot: string, _root: string, report: MigrationReport): Promise<void> {
  const relative = "project_context/global.md";
  const target = path.join(projectRoot, ...relative.split("/"));
  if (!(await pathExists(target))) {
    report.skipped.push(relative);
    return;
  }
  const original = await readText(target);
  const rewritten = rewriteLegacyModuleReferences(original);
  const additions: string[] = [];
  if (!hasHeading(rewritten, "Architecture Context")) {
    additions.push(
      "## Architecture Context",
      "",
      "- See `project_context/architecture.md` for the restrained architecture context.",
      ""
    );
  }
  if (!hasHeading(rewritten, "Context Graph")) {
    additions.push(
      "## Context Graph",
      "",
      "- See `project_context/context.toml` for area/context_unit roles, read policy and boundary metadata.",
      ""
    );
  }
  if (!hasHeading(rewritten, "Context Index")) {
    additions.push(
      "## Context Index",
      "",
      "- See `project_context/context.toml` for the current area and context node list.",
      ""
    );
  }
  if (additions.length === 0 && rewritten === original) {
    report.skipped.push(`${relative}#schema-v4-sections`);
    return;
  }
  const next = additions.length === 0 ? rewritten : `${rewritten.replace(/\s*$/, "\n\n")}${additions.join("\n")}`;
  if (await writeTextIfChanged(target, next)) {
    report.changed.push(`${relative}#schema-v4-sections`);
  } else {
    report.skipped.push(`${relative}#schema-v4-sections`);
  }
}

async function detectContextManifestBaseline(projectRoot: string, _root: string, migration: string): Promise<UpgradePlanItem[]> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  if (await pathExists(manifestPath)) {
    return [];
  }

  const items = [
    item(migration, "safe_pending", CONTEXT_MANIFEST_PATH, "Context graph manifest is missing and can be created from existing area files.")
  ];
  for (const ambiguous of await ambiguousAreaContextFiles(projectRoot)) {
    items.push(
      item(
        migration,
        "manual_required",
        ambiguous,
        "Deep area Context cannot be safely role-classified by path alone; review context.toml after upgrade."
      )
    );
  }
  return items;
}

async function migrateContextManifest(projectRoot: string, _root: string, report: MigrationReport): Promise<void> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  if (await pathExists(manifestPath)) {
    report.skipped.push(CONTEXT_MANIFEST_PATH);
    return;
  }
  if (await writeTextIfChanged(manifestPath, await contextManifestFromExistingAreas(projectRoot))) {
    report.changed.push(CONTEXT_MANIFEST_PATH);
  } else {
    report.skipped.push(CONTEXT_MANIFEST_PATH);
  }
}

async function detectLegacyModulesToAreas(projectRoot: string, _root: string, migration: string): Promise<UpgradePlanItem[]> {
  const modulesRoot = path.join(projectRoot, "project_context", "modules");
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  const moduleFiles = (await listFiles(modulesRoot)).filter((file) => file.endsWith(".md")).sort();
  const items: UpgradePlanItem[] = [];
  for (const source of moduleFiles) {
    const relativeToModules = path.relative(modulesRoot, source);
    const sourceRelative = `project_context/modules/${relativeToModules.split(path.sep).join("/")}`;
    const targetRelative = `project_context/areas/${relativeToModules.split(path.sep).join("/")}`;
    const target = path.join(areasRoot, relativeToModules);
    if (await pathExists(target)) {
      items.push(item(migration, "blocked", sourceRelative, `Cannot move to ${targetRelative} because the target already exists.`));
    } else {
      items.push(item(migration, "safe_pending", sourceRelative, `Move to ${targetRelative}.`));
    }
  }
  return items;
}

async function migrateLegacyModulesToAreas(projectRoot: string, _root: string, report: MigrationReport): Promise<void> {
  const modulesRoot = path.join(projectRoot, "project_context", "modules");
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  const moduleFiles = (await listFiles(modulesRoot)).filter((file) => file.endsWith(".md")).sort();
  if (moduleFiles.length === 0) {
    report.skipped.push("project_context/modules");
    return;
  }

  await ensureDir(areasRoot);
  for (const source of moduleFiles) {
    const relativeToModules = path.relative(modulesRoot, source);
    const target = path.join(areasRoot, relativeToModules);
    const sourceRelative = `project_context/modules/${relativeToModules.split(path.sep).join("/")}`;
    const targetRelative = `project_context/areas/${relativeToModules.split(path.sep).join("/")}`;
    if (await pathExists(target)) {
      report.skipped.push(`${sourceRelative} -> ${targetRelative}`);
      continue;
    }
    await ensureDir(path.dirname(target));
    await fs.rename(source, target);
    report.changed.push(`${sourceRelative} -> ${targetRelative}`);
  }

  const remainingFiles = await listFiles(modulesRoot);
  if (remainingFiles.length === 0 && await pathExists(modulesRoot)) {
    await fs.rm(modulesRoot, { recursive: true, force: true });
    report.changed.push("removed project_context/modules");
  }
}

async function migrateManifestModulePaths(projectRoot: string, report: MigrationReport): Promise<void> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  if (!(await pathExists(manifestPath))) {
    return;
  }
  const original = await readText(manifestPath);
  const next = ensureManifestDefaultArea(rewriteLegacyModuleReferences(original));
  if (next !== original && await writeTextIfChanged(manifestPath, next)) {
    report.changed.push(`${CONTEXT_MANIFEST_PATH}#areas-paths`);
  }
}

async function detectDesignMdBaseline(projectRoot: string, _root: string, migration: string): Promise<UpgradePlanItem[]> {
  return (await pathExists(path.join(projectRoot, DESIGN_MD_PATH)))
    ? []
    : [item(migration, "safe_pending", DESIGN_MD_PATH, "DESIGN.md is missing and can be created with the package baseline.")];
}

async function migrateDesignMd(projectRoot: string, _root: string, report: MigrationReport): Promise<void> {
  if (await createDesignMdIfMissing(projectRoot)) {
    report.changed.push(DESIGN_MD_PATH);
  } else {
    report.skipped.push(DESIGN_MD_PATH);
  }
}

async function detectConfigRefresh(projectRoot: string, root: string, migration: string): Promise<UpgradePlanItem[]> {
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    return [];
  }

  const config = await readConfig(projectRoot);
  const current = defaultConfig(root);
  const managedMatches = JSON.stringify(config.managed_files) === JSON.stringify(current.managed_files);
  const neverOverwriteHasDefaults = current.never_overwrite.every((entry) => config.never_overwrite.includes(entry));
  if (
    config.core.package === current.core.package &&
    config.core.schema_version === CURRENT_SCHEMA_VERSION &&
    managedMatches &&
    neverOverwriteHasDefaults
  ) {
    return [];
  }
  return [
    item(migration, "safe_pending", relativeConfigPath, "Harness config needs current package metadata, schema version or managed-file defaults.")
  ];
}

async function migrateConfig(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    report.skipped.push(relativeConfigPath);
    return;
  }

  const config = await readConfig(projectRoot);
  const current = defaultConfig(root);
  config.core = current.core;
  config.managed_files = current.managed_files;
  config.never_overwrite = Array.from(new Set([...current.never_overwrite, ...config.never_overwrite]));

  if (await writeTextIfChanged(configPath, stringifyYaml(config))) {
    report.changed.push(relativeConfigPath);
  } else {
    report.skipped.push(relativeConfigPath);
  }
}

async function detectDeprecatedSkillOverrides(projectRoot: string, root: string, migration: string): Promise<UpgradePlanItem[]> {
  const overrideRoot = path.join(projectRoot, root, "pjsdlc_managed", "override_skills");
  if (!(await pathExists(overrideRoot))) {
    return [];
  }
  const deprecatedFiles = (await listFiles(overrideRoot))
    .filter((file) => path.basename(file) !== ".gitkeep")
    .map((file) => path.relative(projectRoot, file).split(path.sep).join("/"))
    .sort();
  return deprecatedFiles.map((file) =>
    item(
      migration,
      "manual_required",
      file,
      "Skill overrides are no longer supported; move rules into a standalone project-local Skill before relying on sync."
    )
  );
}

async function ambiguousAreaContextFiles(projectRoot: string): Promise<string[]> {
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  const areaFiles = (await listFiles(areasRoot)).filter((file) => file.endsWith(".md")).sort();
  const ambiguous: string[] = [];
  for (const file of areaFiles) {
    const relativeToAreas = path.relative(areasRoot, file).split(path.sep).join("/");
    if (!relativeToAreas.includes("/")) {
      continue;
    }
    if (inferredRoleContext(relativeToAreas)) {
      continue;
    }
    const base = path.basename(relativeToAreas, ".md").toLowerCase();
    if (base === "readme" || base === "index") {
      continue;
    }
    ambiguous.push(`project_context/areas/${relativeToAreas}`);
  }
  return ambiguous;
}

function item(
  migrationId: string,
  status: UpgradePlanItemStatus,
  pathLabel: string,
  message: string
): UpgradePlanItem {
  const migration = migrations.find((entry) => entry.id === migrationId);
  if (!migration) {
    throw new Error(`Unknown migration id: ${migrationId}`);
  }
  return {
    id: migration.id,
    introducedIn: migration.introducedIn,
    description: migration.description,
    scope: migration.scope,
    status,
    path: pathLabel,
    message
  };
}

function hasHeading(content: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(content);
}

function rewriteLegacyModuleReferences(content: string): string {
  return content
    .replace(/project_context\/modules\//g, "project_context/areas/")
    .replace(/\(modules\//g, "(areas/");
}

function inferredRoleContext(relativeToAreas: string): "verification" | "deployment" | undefined {
  const normalized = relativeToAreas.toLowerCase();
  if (normalized.endsWith("/verification.md") || normalized === "verification.md") {
    return "verification";
  }
  if (normalized.endsWith("/deployment.md") || normalized === "deployment.md") {
    return "deployment";
  }
  return undefined;
}

function ensureManifestDefaultArea(content: string): string {
  if (/^\s*default\s*=\s*true\s*$/im.test(content)) {
    return content;
  }
  const lines = content.split(/\r?\n/);
  const firstAreaIndex = lines.findIndex((line) => line.trim() === "[[areas]]");
  if (firstAreaIndex === -1) {
    return content;
  }

  let nextTableIndex = lines.findIndex((line, index) => index > firstAreaIndex && /^\s*\[\[/.test(line));
  if (nextTableIndex === -1) {
    nextTableIndex = lines.length;
  }
  for (let index = firstAreaIndex + 1; index < nextTableIndex; index += 1) {
    if (/^\s*default\s*=/.test(lines[index])) {
      lines[index] = "default = true";
      return lines.join("\n");
    }
  }
  lines.splice(nextTableIndex, 0, "default = true");
  return lines.join("\n");
}

function manifestReferencesPath(content: string, relative: string): boolean {
  const escaped = relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(?:\\s*)(?:context|path)\\s*=\\s*["']${escaped}["']\\s*$`, "im").test(content);
}
