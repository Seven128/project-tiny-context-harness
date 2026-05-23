import path from "node:path";
import { readConfig } from "./config.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { DEFAULT_CONFIG_PATH } from "./paths.js";
import type { ManagedFile } from "./types.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

export const CURRENT_SCHEMA_VERSION = "1";

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
  await migrateConfig(projectRoot, report);
  await migrateTasks(projectRoot, report);
  await ensureMemory(projectRoot, report);
  return report;
}

async function migrateConfig(projectRoot: string, report: MigrationReport): Promise<void> {
  const configPath = path.join(projectRoot, DEFAULT_CONFIG_PATH);
  if (!(await pathExists(configPath))) {
    report.skipped.push(DEFAULT_CONFIG_PATH);
    return;
  }
  const config = await readConfig(projectRoot);
  config.core.schema_version = CURRENT_SCHEMA_VERSION;
  config.managed_files = migrateManagedFiles(config.managed_files);
  config.local_overrides = config.local_overrides.map((item) =>
    item === ".harness/policies/*.local.yaml" ? ".harness/managed/policies/*.local.yaml" : item
  );
  if (await writeTextIfChanged(configPath, stringifyYaml(config))) {
    report.changed.push(DEFAULT_CONFIG_PATH);
  } else {
    report.skipped.push(DEFAULT_CONFIG_PATH);
  }
}

function migrateManagedFiles(managedFiles: ManagedFile[]): ManagedFile[] {
  const migrated: ManagedFile[] = [];
  const seen = new Set<string>();
  const push = (item: ManagedFile) => {
    if (seen.has(item.path)) {
      return;
    }
    seen.add(item.path);
    migrated.push(item);
  };

  for (const item of managedFiles) {
    if (item.path === ".agents/skills") {
      push({ path: ".harness/agents/skills", strategy: "managed" });
      push({ path: ".agents/skills", strategy: "generated-compat" });
      continue;
    }
    if (item.path === ".harness/templates") {
      push({ path: ".harness/managed/templates", strategy: "managed" });
      continue;
    }
    if (item.path === ".harness/policies") {
      push({ path: ".harness/managed/policies", strategy: "merge-with-local" });
      continue;
    }
    if (item.path === ".harness/make/sdlc-harness.mk") {
      push({ path: ".harness/managed/make/sdlc-harness.mk", strategy: "managed" });
      continue;
    }
    push(item);
  }

  return migrated;
}

async function migrateTasks(projectRoot: string, report: MigrationReport): Promise<void> {
  const tasksPath = path.join(projectRoot, ".harness/state/tasks.yaml");
  if (!(await pathExists(tasksPath))) {
    report.skipped.push(".harness/state/tasks.yaml");
    return;
  }
  const data = (parseYaml(await readText(tasksPath)) ?? {}) as Record<string, unknown>;
  let changed = false;
  if (!("current_phase" in data)) {
    data.current_phase = "SPRINTING";
    changed = true;
  }
  if (!("current_task_id" in data)) {
    data.current_task_id = "";
    changed = true;
  }
  if (!Array.isArray(data.tasks)) {
    data.tasks = [];
    changed = true;
  }
  if (changed && (await writeTextIfChanged(tasksPath, stringifyYaml(data)))) {
    report.changed.push(".harness/state/tasks.yaml");
  } else {
    report.skipped.push(".harness/state/tasks.yaml");
  }
}

async function ensureMemory(projectRoot: string, report: MigrationReport): Promise<void> {
  const memoryPath = path.join(projectRoot, ".harness/state/memory.md");
  if (await pathExists(memoryPath)) {
    report.skipped.push(".harness/state/memory.md");
    return;
  }
  const content = "# Project Memory\n\n记录跨阶段长期有效的稳定知识，并链接到 `.docs/` 正式出处。\n";
  if (await writeTextIfChanged(memoryPath, content)) {
    report.changed.push(".harness/state/memory.md");
  }
}
