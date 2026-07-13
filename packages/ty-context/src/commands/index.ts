import { checkModularity } from "./check-modularity.js";
import { compositeLongTask } from "./composite-long-task.js";
import { compositeCampaign } from "./composite-campaign.js";
import { doctor } from "./doctor.js";
import { exportContext } from "./export-context.js";
import { init } from "./init.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";

export type CommandHandler = (args: string[]) => Promise<void> | void;

export const commands: Record<string, CommandHandler> = {
  help,
  init,
  sync,
  upgrade,
  doctor,
  "check-modularity": checkModularity,
  "export-context": exportContext,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-code-modularity": (args) => validate(["validate-code-modularity", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  "validate-plan-contract": (args) => validate(["validate-plan-contract", ...args]),
  "validate-plan-acceptance": (args) => validate(["validate-plan-acceptance", ...args]),
  "composite-long-task": compositeLongTask,
  "composite-campaign": compositeCampaign,
  package: packageSource
};

export function help(): void {
  console.log(`ty-context commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
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
  validate-plan-contract <plan.md|dir>
                       Validate workflow-contract plan surface consistency
  validate-plan-acceptance <dir>
                       Validate plan-conformance matrix and final verdict consistency
  composite-long-task <subcommand>
                       Manage explicit composite long-task workflow workdirs
  composite-campaign <subcommand>
                       Run Campaign V5 App Server threads, SFC Goals, integration, repair, and finalization
  package <subcommand> Maintain package canonical source`);
}
