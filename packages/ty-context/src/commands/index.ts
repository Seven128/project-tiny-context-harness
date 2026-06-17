import { checkModularity } from "./check-modularity.js";
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
  package: packageSource
};

export function help(): void {
  console.log(`ty-context commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
  sync                 Refresh managed assets; refuses when upgrade migrations are pending
  upgrade [--check] [--json]
                       Run safe migrations, sync managed assets and doctor
  doctor               Diagnose project configuration and drift
  check-modularity --touched|--file <path>|--base <ref> [--limit 300] [--fail-on-warning]
                       Warn when selected handwritten source files exceed a line-count limit
  export-context --full|--code|--all [--output <path>] [--check]
                       Export a temporary Context summary or code implementation Markdown artifact
  validate <gate>      Run a Harness validation gate
  validate-context     Validate Minimal Context fact-source recoverability
  validate-code-modularity
                       Enforce touched handwritten source file modularity
  validate-harness     Run validate-context and validate-code-modularity
  package <subcommand> Maintain package canonical source`);
}
