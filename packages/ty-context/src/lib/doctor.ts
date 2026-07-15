import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { readdir } from "node:fs/promises";
import { readConfig } from "./config.js";
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
