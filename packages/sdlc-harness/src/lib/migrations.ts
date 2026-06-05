import path from "node:path";
import { CONTEXT_MANIFEST_PATH, contextManifestFromExistingModules } from "./context-manifest.js";
import { architectureContextTemplate, globalContextTemplate, moduleContextTemplate } from "./context-templates.js";
import { defaultConfig, readConfig } from "./config.js";
import { createDesignMdIfMissing, DESIGN_MD_PATH } from "./design-md.js";
import { ensureDir, pathExists, readText, writeTextIfChanged } from "./fs.js";
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
  await migrateBaseProjectContext(projectRoot, report);
  await migrateContextManifest(projectRoot, report);
  await migrateDesignMd(projectRoot, report);
  return report;
}

async function migrateBaseProjectContext(projectRoot: string, report: MigrationReport): Promise<void> {
  await ensureDir(path.join(projectRoot, "project_context", "modules"));
  const files: Array<[string, string]> = [
    ["project_context/global.md", globalContextTemplate()],
    ["project_context/architecture.md", architectureContextTemplate()],
    ["project_context/modules/main.md", moduleContextTemplate("main")]
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
  const additions: string[] = [];
  if (!hasHeading(original, "Architecture Context")) {
    additions.push(
      "## Architecture Context",
      "",
      "- See `project_context/architecture.md` for the restrained architecture context.",
      ""
    );
  }
  if (!hasHeading(original, "Context Graph")) {
    additions.push(
      "## Context Graph",
      "",
      "- See `project_context/context.toml` for area/context_unit roles, read policy and boundary metadata.",
      ""
    );
  }
  if (additions.length === 0) {
    return;
  }
  const next = `${original.replace(/\s*$/, "\n\n")}${additions.join("\n")}`;
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
  if (await writeTextIfChanged(manifestPath, await contextManifestFromExistingModules(projectRoot))) {
    report.changed.push(CONTEXT_MANIFEST_PATH);
  } else {
    report.skipped.push(CONTEXT_MANIFEST_PATH);
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
