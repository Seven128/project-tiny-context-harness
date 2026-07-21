import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { readdir } from "node:fs/promises";
import {
  DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES,
  DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES,
  inspectDefaultContextFootprint,
} from "./context-default-footprint.js";
import { readConfig } from "./config.js";
import { inspectDesignAuthorityStatus } from "./design-md.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { pathExists } from "./fs.js";
import { unsupportedSchemaMessage } from "./schema-guard.js";

const require = createRequire(import.meta.url);
const packageMetadata = require("../../package.json") as { version?: string };

export interface DoctorReport {
  info: string[];
  warnings: string[];
  errors: string[];
}

export async function runDoctor(projectRoot: string): Promise<DoctorReport> {
  const report: DoctorReport = { info: [], warnings: [], errors: [] };
  const root = await harnessRoot(projectRoot);
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    report.errors.push(`missing ${relativeConfigPath}`);
    return report;
  }

  const config = await readConfig(projectRoot);
  const packageVersion = packageMetadata.version ?? "0.0.0";
  report.info.push(`harness root: ${root}`);
  report.info.push(`core package: ${config.core.package}@${packageVersion}`);
  report.info.push(`schema version: ${config.core.schema_version}`);
  const unsupportedSchema = unsupportedSchemaMessage(
    config.core.schema_version,
    "doctor",
  );
  if (unsupportedSchema) {
    report.errors.push(unsupportedSchema);
    return report;
  }

  for (const required of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
    "project_context/areas",
  ]) {
    if (!(await pathExists(path.join(projectRoot, required)))) {
      report.errors.push(`missing ${required}`);
    }
  }

  for (const managed of config.managed_files) {
    const exists = await pathExists(path.join(projectRoot, managed.path));
    if (!exists && managed.strategy !== "create-if-missing") {
      report.warnings.push(`managed path missing: ${managed.path}`);
    }
  }

  try {
    const footprint = await inspectDefaultContextFootprint(projectRoot);
    report.info.push(
      `default Context read path: ${footprint.files.length} file(s), ${footprint.total_bytes} bytes`,
    );
    if (footprint.total_bytes > DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES) {
      report.warnings.push(
        `default Context read path is ${footprint.total_bytes} bytes, above the ${DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES}-byte soft budget; shorten near-universal facts or move specialized role Context to read_policy=\"on-demand\"`,
      );
    }
    for (const file of footprint.files) {
      if (file.bytes <= DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES) continue;
      report.warnings.push(
        `default Context file ${file.path} is ${file.bytes} bytes, above the ${DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES}-byte per-file soft budget`,
      );
    }
    for (const group of footprint.duplicate_groups) {
      report.warnings.push(
        `default Context contains byte-identical files: ${group.join(", ")}; keep one owning fact source and replace duplicates with a short pointer`,
      );
    }
  } catch (error) {
    report.warnings.push(
      `default Context footprint unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const designAuthority = await inspectDesignAuthorityStatus(projectRoot);
  if (designAuthority === "unconfigured") {
    report.info.push(
      "design authority: unconfigured; DESIGN.md is a starter scaffold and does not authorize material production UI until project-specific tokens and exact-target/constraint/inspiration references are selected",
    );
  } else {
    report.info.push(`design authority: ${designAuthority}`);
  }

  for (const location of await findUserSuperpowersSkills()) {
    report.warnings.push(
      `user-level using-superpowers Skill detected at ${location}. Tiny Context workflows do not depend on it and doctor will not modify global configuration. To disable it explicitly for Codex, remove/disable that plugin or add a matching [[skills.config]] entry with enabled = false in ${path.join(os.homedir(), ".codex", "config.toml")}.`,
    );
  }

  report.info.push("doctor complete");
  return report;
}

async function findUserSuperpowersSkills(): Promise<string[]> {
  const home = os.homedir();
  const direct = path.join(
    home,
    ".codex",
    "skills",
    "using-superpowers",
    "SKILL.md",
  );
  const result: string[] = [];
  if (await pathExists(direct)) result.push(direct);
  const cache = path.join(home, ".codex", "plugins", "cache");
  try {
    for (const owner of await readdir(cache)) {
      const candidateRoot = path.join(cache, owner);
      for (const plugin of await readdir(candidateRoot)) {
        if (plugin !== "superpowers") continue;
        for (const version of await readdir(path.join(candidateRoot, plugin))) {
          const candidate = path.join(
            candidateRoot,
            plugin,
            version,
            "skills",
            "using-superpowers",
            "SKILL.md",
          );
          if (await pathExists(candidate)) result.push(candidate);
        }
      }
    }
  } catch {}
  return [...new Set(result)].sort();
}
