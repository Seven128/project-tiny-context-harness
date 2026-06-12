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
  "export-context": exportContext,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  package: packageSource
};

export function help(): void {
  console.log(`sdlc-harness commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
  sync                 Refresh managed assets; refuses when upgrade migrations are pending
  upgrade [--check] [--json]
                       Run safe migrations, sync managed assets and doctor
  doctor               Diagnose project configuration and drift
  export-context --full|--code|--all [--output <path>] [--check]
                       Export a temporary Context summary or code implementation Markdown artifact
  validate <gate>      Run a Harness validation gate (Minimal Context only)
  validate-context     Validate Minimal Context fact-source recoverability
  validate-harness     Compatibility alias for validate-context
  package <subcommand> Maintain package canonical source`);
}
