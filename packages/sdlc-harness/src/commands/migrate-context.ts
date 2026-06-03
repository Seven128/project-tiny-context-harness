import { runContextMigration } from "../lib/context-migration.js";

export async function migrateContext(args: string[]): Promise<void> {
  const write = args.includes("--write");
  const archiveLegacy = args.includes("--archive-legacy");
  const report = await runContextMigration(process.cwd(), { write, archiveLegacy });
  console.log(
    `migrate-context mode=${report.mode} changed=${report.changed.length} archived=${report.archived.length} warnings=${report.warnings.length}`
  );
  for (const line of report.preview) {
    console.log(`preview: ${line}`);
  }
  for (const line of report.archivePreview) {
    console.log(`archive-preview: ${line}`);
  }
  for (const line of report.changed) {
    console.log(`changed: ${line}`);
  }
  for (const line of report.archived) {
    console.log(`archived: ${line}`);
  }
  for (const warning of report.warnings) {
    console.log(`warning: ${warning}`);
  }
}
