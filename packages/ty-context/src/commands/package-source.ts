import { checkSource, syncSource } from "../lib/package-source.js";

export async function packageSource(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "sync-source") {
    const report = await syncSource(process.cwd());
    console.log(`package sync-source changed=${report.changed.length}`);
    return;
  }
  if (subcommand === "check-source") {
    const report = await checkSource(process.cwd());
    if (report.drift.length > 0) {
      for (const item of report.drift) {
        console.error(`drift: ${item}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log("package source OK");
    return;
  }
  console.log(`ty-context package commands:
  sync-source    Update package canonical assets from this source workspace
  check-source   Verify package canonical assets match this source workspace`);
}
