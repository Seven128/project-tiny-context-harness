import { disableHarnessProfile } from "../lib/profiles.js";
import { runSync } from "../lib/sync-engine.js";

export async function disable(args: string[]): Promise<void> {
  const profile = args[0];
  if (profile !== "composite-codex" || args.length !== 1) {
    throw new Error("usage: ty-context disable composite-codex");
  }
  const root = process.cwd();
  const result = await disableHarnessProfile(root, profile);
  const sync = await runSync(root);
  console.log(
    `${result.changed ? "disabled" : "kept disabled"} profile ${profile}`,
  );
  console.log(
    `sync changed=${sync.changed.length} skipped=${sync.skipped.length} blocked=${sync.blocked.length}`,
  );
  if (sync.blocked.length) throw new Error(sync.blocked.join("\n"));
}
