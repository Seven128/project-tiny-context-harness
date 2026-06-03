import { doctor } from "./doctor.js";
import { init } from "./init.js";
import { migrateContext } from "./migrate-context.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";

export type CommandHandler = (args: string[]) => Promise<void> | void;

export const commands: Record<string, CommandHandler> = {
  help,
  init,
  "migrate-context": migrateContext,
  sync,
  upgrade,
  doctor,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  package: packageSource
};

export function help(): void {
  console.log(`sdlc-harness commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
  sync                 Materialize canonical assets into the workspace
  upgrade              Run migrations and then sync
  migrate-context      Preview or write project_context/** from legacy work products
  doctor               Diagnose project configuration and drift
  validate <gate>      Run a Harness validation gate (Minimal Context only)
  validate-context     Validate Minimal Context fact-source recoverability
  validate-harness     Compatibility alias for validate-context
  package <subcommand> Maintain package canonical source`);
}
