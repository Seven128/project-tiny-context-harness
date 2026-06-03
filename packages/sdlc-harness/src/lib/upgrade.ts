import path from "node:path";
import { runDoctor } from "./doctor.js";
import { pathExists } from "./fs.js";
import { runMigrations } from "./migrations.js";
import { runSync } from "./sync-engine.js";

export async function runUpgrade(projectRoot: string): Promise<string[]> {
  const lines: string[] = [];
  const migrationReport = await runMigrations(projectRoot);
  lines.push(`migrations changed=${migrationReport.changed.length} skipped=${migrationReport.skipped.length}`);

  const syncReport = await runSync(projectRoot);
  lines.push(`sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`);
  for (const skipped of syncReport.skipped.filter((line) => line.includes("customized"))) {
    lines.push(`sync skipped: ${skipped}`);
  }

  const doctor = await runDoctor(projectRoot);
  lines.push(`doctor warnings=${doctor.warnings.length} errors=${doctor.errors.length}`);
  const legacyStageFacts = await hasLegacyStageFacts(projectRoot);
  if (legacyStageFacts) {
    lines.push("Run npx sdlc-harness migrate-context --dry-run to preview Minimal Context migration.");
  }
  const blockingDoctorErrors = legacyStageFacts
    ? doctor.errors.filter((error) => !isMissingContextError(error))
    : doctor.errors;
  if (syncReport.blocked.length > 0 || blockingDoctorErrors.length > 0) {
    throw new Error("upgrade completed with blockers");
  }
  return lines;
}

async function hasLegacyStageFacts(projectRoot: string): Promise<boolean> {
  return (
    (await pathExists(path.join(projectRoot, ".work_products"))) ||
    (await pathExists(path.join(projectRoot, ".docs"))) ||
    (await pathExists(path.join(projectRoot, ".agent", "state", "lifecycle.yaml"))) ||
    (await pathExists(path.join(projectRoot, ".harness", "state", "lifecycle.yaml"))) ||
    (await pathExists(path.join(projectRoot, ".codex", "state", "lifecycle.yaml")))
  );
}

function isMissingContextError(error: string): boolean {
  return error === "missing project_context/global.md" || error === "missing project_context/modules";
}
