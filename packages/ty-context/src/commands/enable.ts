import { enableHarnessProfile } from "../lib/profiles.js";
import { runSync } from "../lib/sync-engine.js";

export async function enable(args: string[]): Promise<void> {
  const profile = args[0];
  if (!profile || args.length !== 1)
    throw new Error("usage: ty-context enable composite-codex");
  const root = process.cwd();
  const result = await enableHarnessProfile(root, profile);
  const sync = await runSync(root);
  console.log(
    `${result.changed ? "enabled" : "kept enabled"} profile ${profile}`,
  );
  console.log(
    `sync changed=${sync.changed.length} skipped=${sync.skipped.length} blocked=${sync.blocked.length}`,
  );
  if (sync.blocked.length) throw new Error(sync.blocked.join("\n"));
}
