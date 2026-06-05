import path from "node:path";
import { CONTEXT_MANIFEST_PATH, contextManifestFromExistingModules } from "./context-manifest.js";
import { defaultConfig, readConfig } from "./config.js";
import { createDesignMdIfMissing, DESIGN_MD_PATH } from "./design-md.js";
import { pathExists, writeTextIfChanged } from "./fs.js";
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
  await migrateContextManifest(projectRoot, report);
  await migrateDesignMd(projectRoot, report);
  return report;
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
