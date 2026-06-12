import { runDoctor } from "./doctor.js";
import { formatUpgradePlan, runMigrations } from "./migrations.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { runSync } from "./sync-engine.js";

export async function runUpgrade(projectRoot: string): Promise<string[]> {
  const lines: string[] = [];
  await assertSupportedSchema(projectRoot, "upgrade");
  const migrationReport = await runMigrations(projectRoot);
  lines.push(
    `migrations changed=${migrationReport.changed.length} skipped=${migrationReport.skipped.length} manual_required=${migrationReport.manualRequired.length} blocked=${migrationReport.blocked.length}`
  );
  if (migrationReport.manualRequired.length > 0 || migrationReport.blocked.length > 0) {
    lines.push(
      ...formatUpgradePlan({
        safe_pending: [],
        manual_required: migrationReport.manualRequired,
        blocked: migrationReport.blocked
      }).slice(1)
    );
  }

  const syncReport = await runSync(projectRoot, { allowPendingMigrations: true });
  lines.push(`sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`);
  for (const skipped of syncReport.skipped.filter((line) => line.includes("customized"))) {
    lines.push(`sync skipped: ${skipped}`);
  }

  const doctor = await runDoctor(projectRoot);
  lines.push(`doctor warnings=${doctor.warnings.length} errors=${doctor.errors.length}`);
  if (
    migrationReport.manualRequired.length > 0 ||
    migrationReport.blocked.length > 0 ||
    syncReport.blocked.length > 0 ||
    doctor.errors.length > 0
  ) {
    throw new Error("upgrade completed with blockers");
  }
  return lines;
}
