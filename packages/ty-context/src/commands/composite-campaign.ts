import path from "node:path";
import { checkCodexExecV1 } from "../lib/codex-exec-client.js";
import {
  auditCampaignV5,
  rejectCampaignV5Execution,
} from "../lib/composite-audit-v5/campaign-store.js";
import {
  cleanupCampaignV6,
  interruptCampaignV6,
  listCampaignWorkersV6,
  statusCampaignV6,
} from "../lib/composite-campaign-control-v6.js";
import { compositeCampaignContractV6 } from "../lib/composite-campaign-contract-v6.js";
import { routeCodexExecProfileV1 } from "../lib/composite-campaign-exec-policy.js";
import {
  dryRunCampaignV6,
  runCampaignV6,
} from "../lib/composite-campaign-runner-v6.js";
import { readCompositeCampaignSchemaVersion } from "../lib/composite-campaign-version.js";
import {
  applyCampaignCoverageV6,
  createCampaignV6,
  loadCampaignV6,
} from "../lib/composite-campaign-v6.js";
import {
  applyCampaignPacketV6,
  applyCampaignScopeV6,
  preflightCampaignPacketV6,
  renderCampaignPacketV6,
} from "../lib/composite-runtime-v6/campaign-packet-store.js";
import { abandonCampaignV6 } from "../lib/composite-campaign-abandon-v6.js";

const RETIRED_RUNTIME_COMMANDS = new Set([
  "advance",
  "bind-goal",
  "bind-repair-goal",
  "record-result",
  "app-server-check",
  "threads",
]);

export async function compositeCampaign(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  if (command === "help") {
    help();
    return;
  }
  if (RETIRED_RUNTIME_COMMANDS.has(command))
    throw new Error(`composite_campaign_app_server_runtime_retired:${command}`);
  const root = process.cwd();
  const parsed = parse(args.slice(1), allowedOptions(command));
  const result = await execute(command, root, parsed.values, parsed.flags);
  console.log(JSON.stringify(result, null, parsed.flags.has("--json") ? 0 : 2));
}

async function execute(
  command: string,
  root: string,
  value: Map<string, string>,
  flags: Set<string>,
): Promise<unknown> {
  if (command === "contract") return compositeCampaignContractV6();
  if (command === "create")
    return createCampaignV6(
      root,
      required(value, "--id"),
      required(value, "--plan-file"),
      value.get("--target-branch"),
      { auto_push: optionalBoolean(value, "--auto-push") ?? true },
    );
  if (command === "exec-check")
    return checkCodexExecV1({
      projectRoot: root,
      executable: process.env.TY_CONTEXT_CODEX_EXECUTABLE,
    });
  if (command === "model-routing")
    return routeCodexExecProfileV1(optionalProfile(value));

  const campaignPath = required(value, "--campaign");
  const schema = await readCompositeCampaignSchemaVersion(root, campaignPath);
  if (command === "status")
    return schema === "composite-campaign-v5"
      ? auditCampaignV5(root, campaignPath)
      : statusCampaignV6(root, campaignPath);
  if (schema === "composite-campaign-v5")
    return rejectCampaignV5Execution(root, campaignPath);

  if (command === "apply-coverage")
    return applyCampaignCoverageV6(
      root,
      campaignPath,
      required(value, "--input"),
    );
  if (command === "apply-scope") {
    const coverage =
      value.get("--coverage") ??
      path.join(
        (await loadCampaignV6(root, campaignPath)).root,
        "source-coverage.json",
      );
    return applyCampaignScopeV6(
      root,
      campaignPath,
      required(value, "--input"),
      coverage,
    );
  }
  if (command === "apply-packet")
    return applyCampaignPacketV6(
      root,
      campaignPath,
      required(value, "--slice"),
      required(value, "--input"),
    );
  if (command === "render")
    return renderCampaignPacketV6(
      root,
      campaignPath,
      required(value, "--slice"),
    );
  if (command === "preflight")
    return preflightCampaignPacketV6(
      root,
      campaignPath,
      required(value, "--slice"),
    );
  if (command === "run") {
    const controller = optionalProfile(value);
    return flags.has("--dry-run")
      ? dryRunCampaignV6({
          projectRoot: root,
          campaignPath,
          controllerProfile: controller,
        })
      : runCampaignV6({
          projectRoot: root,
          campaignPath,
          controllerProfile: controller,
          codexExecutable: process.env.TY_CONTEXT_CODEX_EXECUTABLE,
        });
  }
  if (command === "workers") return listCampaignWorkersV6(root, campaignPath);
  if (command === "interrupt") return interruptCampaignV6(root, campaignPath);
  if (command === "abandon") return abandonCampaignV6(root, campaignPath);
  if (command === "cleanup") return cleanupCampaignV6(root, campaignPath);
  throw new Error(`Unknown composite-campaign subcommand: ${command}`);
}

function allowedOptions(command: string): string[] {
  const common = ["--json"];
  if (command === "contract" || command === "exec-check") return common;
  if (command === "model-routing")
    return [...common, "--controller-model", "--controller-effort"];
  if (command === "create")
    return [...common, "--id", "--plan-file", "--target-branch", "--auto-push"];
  if (command === "apply-coverage") return [...common, "--campaign", "--input"];
  if (command === "apply-scope")
    return [...common, "--campaign", "--input", "--coverage"];
  if (command === "apply-packet")
    return [...common, "--campaign", "--slice", "--input"];
  if (command === "render" || command === "preflight")
    return [...common, "--campaign", "--slice"];
  if (
    ["status", "workers", "interrupt", "abandon", "cleanup"].includes(command)
  )
    return [...common, "--campaign"];
  if (command === "run")
    return [
      ...common,
      "--campaign",
      "--controller-model",
      "--controller-effort",
      "--dry-run",
    ];
  throw new Error(`Unknown composite-campaign subcommand: ${command}`);
}

function parse(
  args: string[],
  allowed: string[],
): { values: Map<string, string>; flags: Set<string> } {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const accepted = new Set(allowed);
  const booleanFlags = new Set(["--json", "--dry-run"]);
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!accepted.has(key))
      throw new Error(`Unknown option for composite-campaign command: ${key}`);
    if (values.has(key) || flags.has(key))
      throw new Error(`Duplicate option: ${key}`);
    if (booleanFlags.has(key)) {
      flags.add(key);
      continue;
    }
    const next = args[++index];
    if (!next || next.startsWith("--"))
      throw new Error(`${key} requires a value`);
    values.set(key, next);
  }
  return { values, flags };
}

function required(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) throw new Error(`Missing required option: ${key}`);
  return value;
}
function optionalProfile(options: Map<string, string>) {
  const model = options.get("--controller-model");
  const effort = options.get("--controller-effort");
  if (Boolean(model) !== Boolean(effort))
    throw new Error(
      "--controller-model and --controller-effort must be provided together",
    );
  return model && effort ? { model, effort } : null;
}
function optionalBoolean(
  options: Map<string, string>,
  key: string,
): boolean | undefined {
  const value = options.get(key);
  if (value === undefined) return undefined;
  if (value !== "true" && value !== "false")
    throw new Error(`${key} must be true or false`);
  return value === "true";
}
function help(): void {
  console.log(`ty-context composite-campaign V6 commands:
  contract [--json]
  create --id <id> --plan-file <file> [--target-branch <branch>] [--auto-push true|false]
  apply-coverage --campaign <path> --input <source-coverage.json>
  apply-scope --campaign <path> --input <scope-v4.json> [--coverage <source-coverage.json>]
  apply-packet --campaign <path> --slice <id> --input <packet-v3.json>
  render|preflight --campaign <path> --slice <id>
  status|workers|interrupt|abandon|cleanup --campaign <path>
  run --campaign <path> [--controller-model <id> --controller-effort <effort>] [--dry-run]
  exec-check [--json]
  model-routing [--controller-model <id> --controller-effort <effort>] [--json]

V6 run is one foreground scheduler using bounded ephemeral codex exec workers. V5 is accepted audit-only; unfinished V5 execution is retired.`);
}
