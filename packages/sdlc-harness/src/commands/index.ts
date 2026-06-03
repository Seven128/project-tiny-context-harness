import { doctor } from "./doctor.js";
import { inspectWorkflow } from "./inspect-workflow.js";
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
  "inspect-workflow": inspectWorkflow,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  "validate-current": (args) => validate(["validate-current", ...args]),
  "validate-plan": (args) => validate(["validate-plan", ...args]),
  "validate-pm": (args) => validate(["validate-pm", ...args]),
  "validate-uiux": (args) => validate(["validate-uiux", ...args]),
  "validate-design": (args) => validate(["validate-design", ...args]),
  "validate-dev": (args) => validate(["validate-dev", ...args]),
  "validate-review": (args) => validate(["validate-review", ...args]),
  "validate-test": (args) => validate(["validate-test", ...args]),
  "validate-release": (args) => validate(["validate-release", ...args]),
  "validate-rfc": (args) => validate(["validate-rfc", ...args]),
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
  inspect-workflow     Lightly inspect workflow weight, fact-source drift, and handoff clarity
  validate <gate>      Run a Harness validation gate
  validate-context     Validate Minimal Context fact-source recoverability
  validate-*           Run a named gate directly, including validate-plan/uiux/design/dev/review/test/release/rfc
  package <subcommand> Maintain package canonical source`);
}
