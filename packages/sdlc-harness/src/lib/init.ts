import path from "node:path";
import { writeConfigIfMissing } from "./config.js";
import { harnessConfigPath } from "./harness-root.js";
import { ensureDir, pathExists, writeTextIfChanged } from "./fs.js";
import { runSync } from "./sync-engine.js";

export interface InitOptions {
  adopt: boolean;
  force: boolean;
}

export async function runInit(projectRoot: string, options: InitOptions): Promise<string[]> {
  const report: string[] = [];
  const existingEntries = await projectHasExistingFiles(projectRoot);
  if (existingEntries && !options.adopt && !options.force) {
    report.push("Project is not empty; continuing with non-destructive init. Use --adopt to mark this as an existing project adoption.");
  }

  const configPath = await harnessConfigPath(projectRoot);
  if (await writeConfigIfMissing(projectRoot)) {
    report.push(`created ${configPath}`);
  } else {
    report.push(`kept existing ${configPath}`);
  }

  await createProjectContext(projectRoot, report);

  const syncReport = await runSync(projectRoot);
  report.push(`sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`);
  report.push(options.adopt ? "adopt mode complete" : "init complete");
  return report;
}

async function projectHasExistingFiles(projectRoot: string): Promise<boolean> {
  const markers = ["README.md", "src", "pyproject.toml", "go.mod"];
  for (const marker of markers) {
    if (await pathExists(path.join(projectRoot, marker))) {
      return true;
    }
  }
  return false;
}

async function createProjectContext(projectRoot: string, report: string[]): Promise<void> {
  const modulesRoot = path.join(projectRoot, "project_context", "modules");
  await ensureDir(modulesRoot);
  const files: Array<[string, string]> = [
    ["project_context/global.md", globalContextTemplate()],
    ["project_context/modules/main.md", moduleContextTemplate("main")]
  ];
  for (const [relative, content] of files) {
    if (await writeTextIfChanged(path.join(projectRoot, relative), content)) {
      report.push(`created ${relative}`);
    }
  }
}

function globalContextTemplate(): string {
  return [
    "# Project / Delivery Context",
    "",
    "## Project Goal",
    "",
    "- Describe the user-visible goal this project is trying to achieve.",
    "",
    "## Non-goals / Boundaries",
    "",
    "- List what this project intentionally does not do.",
    "",
    "## Background",
    "",
    "- Capture the minimum background a fresh agent needs before changing code.",
    "",
    "## Design Rationale",
    "",
    "- Record only durable choices that are hard to infer from code or tests.",
    "",
    "## Product / Delivery Brief",
    "",
    "- Capture durable product goals, users, core flows, acceptance signals and non-goals.",
    "",
    "## UX / Screen Brief",
    "",
    "- Capture durable screen, flow, interaction, responsive and accessibility facts. Use `DESIGN.md` for visual identity and design tokens when needed.",
    "",
    "## Verification Entry Points",
    "",
    "- `npm test` or the project-specific command that proves product behavior.",
    "",
    "## Current State",
    "",
    "- Summarize what is currently implemented or intentionally blocked.",
    "",
    "## Next Safe Action",
    "",
    "- State the safest next step for a fresh agent.",
    "",
    "## Module Index",
    "",
    "- [main](modules/main.md)",
    ""
  ].join("\n");
}

function moduleContextTemplate(moduleName: string): string {
  return [
    `# Module Context: ${moduleName}`,
    "",
    "## Responsibility",
    "",
    "- Describe this module's responsibility.",
    "",
    "## User / System Contract",
    "",
    "- Describe the external behavior, API, CLI, UI, screen state, interaction or data contract.",
    "",
    "## Core Data / API / State",
    "",
    "- Summarize the important data structures, APIs, state transitions, or rules.",
    "",
    "## Key Constraints",
    "",
    "- List constraints that are not obvious from code alone, including product rules, responsive/a11y needs or visual boundaries.",
    "",
    "## Code Entry Points",
    "",
    "- `src/` or the concrete file/function entry points.",
    "",
    "## Test Entry Points",
    "",
    "- `npm test` or focused test commands for this module.",
    "",
    "## Open Risks",
    "",
    "- List unresolved risks or blockers.",
    ""
  ].join("\n");
}
