import path from "node:path";
import { writeConfigIfMissing } from "./config.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import { ensureDir, pathExists, writeTextIfChanged } from "./fs.js";
import { runSync } from "./sync-engine.js";
import { syncMemoryGuidanceSection, syncWorkProductsIndexMaintenanceSection } from "./user-owned-sections.js";

export interface InitOptions {
  adopt: boolean;
  force: boolean;
}

const WORK_PRODUCT_DIRS = [
  ".work_products/00_raw",
  ".work_products/01_product",
  ".work_products/02_experience",
  ".work_products/02_architecture",
  ".work_products/03_tech_plan",
  ".work_products/04_implementation",
  ".work_products/05_decisions",
  ".work_products/06_review",
  ".work_products/07_test",
  ".work_products/08_release",
  ".work_products/09_runbooks",
  ".work_products/rfc"
];

export async function runInit(projectRoot: string, options: InitOptions): Promise<string[]> {
  const report: string[] = [];
  const existingEntries = await projectHasExistingFiles(projectRoot);
  if (existingEntries && !options.adopt && !options.force) {
    report.push("Project is not empty; continuing with non-destructive init. Use --adopt to mark this as an existing project adoption.");
  }

  const root = await harnessRoot(projectRoot);
  const configPath = await harnessConfigPath(projectRoot);
  if (await writeConfigIfMissing(projectRoot)) {
    report.push(`created ${configPath}`);
  } else {
    report.push(`kept existing ${configPath}`);
  }

  await createProjectState(projectRoot, root, options.adopt, report);
  await createWorkProducts(projectRoot, report);

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

async function createProjectState(projectRoot: string, root: string, adopt: boolean, report: string[]): Promise<void> {
  const stateRoot = path.join(projectRoot, root, "state");
  await ensureDir(stateRoot);
  const lifecycle = adopt
    ? `project_name: "Project"\nversion: "v0.1"\ncurrent_phase: "SPRINTING"\nactive_role: "developer"\nactive_skill: "pjsdlc_dev_sprint"\ncurrent_milestone: "MVP"\nblocked_reason: ""\nsuspended_phase: ""\nallowed_next_phases:\n  - "REVIEWING"\n  - "RFC_RECALIBRATION"\n  - "BLOCKED"\n`
    : `project_name: "Project"\nversion: "v0.1"\ncurrent_phase: "REQUIREMENT_GATHERING"\nactive_role: "product_manager"\nactive_skill: "pjsdlc_pm_prd"\ncurrent_milestone: "MVP"\nblocked_reason: ""\nsuspended_phase: ""\nallowed_next_phases:\n  - "UI_UX_DESIGNING"\n  - "BLOCKED"\n`;
  const files: Array<[string, string]> = [
    [
      harnessPath(root, "state", "lifecycle.yaml"),
      lifecycle
    ],
    [harnessPath(root, "state", "plan.yaml"), `current_task_id: ""\nnext_task_sequence: 1\ntasks: []\n`],
    [harnessPath(root, "state", "plan.draft.yaml"), `next_task_sequence: 1\ntasks: []\n`],
  ];
  for (const [relative, content] of files) {
    if (await writeTextIfChanged(path.join(projectRoot, relative), content)) {
      report.push(`created ${relative}`);
    }
  }
  await syncMemoryGuidanceSection(projectRoot, root, {
    changed: report,
    skipped: []
  });
}

async function createWorkProducts(projectRoot: string, report: string[]): Promise<void> {
  for (const dir of WORK_PRODUCT_DIRS) {
    await ensureDir(path.join(projectRoot, dir));
    await writeTextIfChanged(path.join(projectRoot, dir, ".gitkeep"), "");
  }
  await syncWorkProductsIndexMaintenanceSection(projectRoot, {
    changed: report,
    skipped: []
  });
}
