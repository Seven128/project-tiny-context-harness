import path from "node:path";
import { promises as fs } from "node:fs";
import { CONTEXT_MANIFEST_PATH, contextManifestFromExistingAreas } from "./context-manifest.js";
import { architectureContextTemplate, areaContextTemplate, globalContextTemplate } from "./context-templates.js";
import { defaultConfig, readConfig } from "./config.js";
import { createDesignMdIfMissing, DESIGN_MD_PATH } from "./design-md.js";
import { ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { stringifyYaml } from "./yaml.js";

export const CURRENT_SCHEMA_VERSION = "4";

export interface Migration {
  from: string;
  to: string;
  description: string;
}

export const migrations: Migration[] = [];

export interface MigrationReport {
  changed: string[];
  skipped: string[];
}

export async function runMigrations(projectRoot: string): Promise<MigrationReport> {
  const report: MigrationReport = { changed: [], skipped: [] };
  const root = await harnessRoot(projectRoot);
  await migrateConfig(projectRoot, root, report);
  await migrateLegacyModulesToAreas(projectRoot, report);
  await migrateBaseProjectContext(projectRoot, report);
  await migrateContextManifest(projectRoot, report);
  await migrateManifestModulePaths(projectRoot, report);
  await migrateDesignMd(projectRoot, report);
  return report;
}

async function migrateBaseProjectContext(projectRoot: string, report: MigrationReport): Promise<void> {
  await ensureDir(path.join(projectRoot, "project_context", "areas"));
  const files: Array<[string, string]> = [
    ["project_context/global.md", globalContextTemplate()],
    ["project_context/architecture.md", architectureContextTemplate()],
    ["project_context/areas/main.md", areaContextTemplate("main")]
  ];
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
  await migrateGlobalContextSections(projectRoot, report);
}

async function migrateGlobalContextSections(projectRoot: string, report: MigrationReport): Promise<void> {
  const relative = "project_context/global.md";
  const target = path.join(projectRoot, ...relative.split("/"));
  if (!(await pathExists(target))) {
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
    return;
  }
  const next = additions.length === 0 ? rewritten : `${rewritten.replace(/\s*$/, "\n\n")}${additions.join("\n")}`;
  if (await writeTextIfChanged(target, next)) {
    report.changed.push(`${relative}#schema-v4-sections`);
  }
}

async function migrateContextManifest(projectRoot: string, report: MigrationReport): Promise<void> {
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

async function migrateLegacyModulesToAreas(projectRoot: string, report: MigrationReport): Promise<void> {
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

async function migrateDesignMd(projectRoot: string, report: MigrationReport): Promise<void> {
  if (await createDesignMdIfMissing(projectRoot)) {
    report.changed.push(DESIGN_MD_PATH);
  } else {
    report.skipped.push(DESIGN_MD_PATH);
  }
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
  config.local_overrides = current.local_overrides;
  config.never_overwrite = Array.from(new Set([...current.never_overwrite, ...config.never_overwrite]));

  if (await writeTextIfChanged(configPath, stringifyYaml(config))) {
    report.changed.push(relativeConfigPath);
  } else {
    report.skipped.push(relativeConfigPath);
  }
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
