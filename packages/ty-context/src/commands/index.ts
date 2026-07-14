import { checkModularity } from "./check-modularity.js";
import { compositeLongTask } from "./composite-long-task.js";
import { compositeCampaign } from "./composite-campaign.js";
import { doctor } from "./doctor.js";
import { exportContext } from "./export-context.js";
import { enable } from "./enable.js";
import { disable } from "./disable.js";
import { init } from "./init.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";
import { assertHarnessProfileEnabled } from "../lib/profiles.js";

export type CommandHandler = (args: string[]) => Promise<void> | void;

export const commands: Record<string, CommandHandler> = {
  help,
  init,
  enable,
  disable,
  sync,
  upgrade,
  doctor,
  "check-modularity": checkModularity,
  "export-context": exportContext,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-code-modularity": (args) =>
    validate(["validate-code-modularity", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  "composite-long-task": (args) =>
    withCompositeCodexProfile(args, compositeLongTask),
  "composite-campaign": (args) =>
    withCompositeCodexProfile(args, compositeCampaign, ["contract"]),
  package: packageSource,
};

export function help(): void {
  console.log(`ty-context commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
  enable composite-codex
                       Explicitly install Codex Hooks and Long-Task Workflow Skills
  disable composite-codex
                       Remove package-owned Codex Hooks and disable Composite execution
  sync                 Refresh managed assets; does not run migrations
  upgrade [--check] [--json]
                       Run safe migrations, sync managed assets and doctor
  doctor               Diagnose project configuration and drift
  check-modularity --touched|--file <path>|--base <ref> [--limit 300] [--fail-on-warning]
                       Warn when selected handwritten source files exceed a line-count limit
  export-context --full|--code|--all|--source-pack|--code-index|--task-context
                       Export temporary Context, code snapshot or bounded Source Pack artifacts
  validate <gate>      Run a Harness validation gate
  validate-context     Validate Minimal Context fact-source recoverability
  validate-code-modularity
                       Enforce touched handwritten source file modularity
  validate-harness     Run validate-context and validate-code-modularity
  composite-long-task <subcommand>
                       Manage explicit Contract V3 workdirs; requires composite-codex
  composite-campaign <subcommand>
                       Run Campaign V5 orchestration; mutations require composite-codex
  package <subcommand> Maintain package canonical source`);
}

async function withCompositeCodexProfile(
  args: string[],
  handler: CommandHandler,
  discoverable: string[] = [],
): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand !== "help" && !discoverable.includes(subcommand))
    await assertHarnessProfileEnabled(process.cwd(), "composite-codex");
  await handler(args);
}
