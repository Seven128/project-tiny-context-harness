import { runContextMigration } from "../lib/context-migration.js";

export async function migrateContext(args: string[]): Promise<void> {
  const write = args.includes("--write");
  const report = await runContextMigration(process.cwd(), { write });
  console.log(`migrate-context mode=${report.mode} changed=${report.changed.length} warnings=${report.warnings.length}`);
  for (const line of report.preview) {
    console.log(`preview: ${line}`);
  }
  for (const line of report.changed) {
    console.log(`changed: ${line}`);
  }
  for (const warning of report.warnings) {
    console.log(`warning: ${warning}`);
  }
}
