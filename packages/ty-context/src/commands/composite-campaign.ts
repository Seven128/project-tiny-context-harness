import {
  advanceCampaignV5,
  bindCampaignGoalV5,
  bindCampaignRepairGoalV5,
  recordCampaignResultV5,
  statusCampaignV5,
} from "../lib/composite-campaign-orchestrator.js";
import {
  applyCampaignPacketV5,
  applyCampaignScopeV5,
  preflightCampaignPacketV5,
  renderCampaignPacketV5,
} from "../lib/composite-runtime-v5/campaign-packet-store.js";
import { compositeCampaignContractV5 } from "../lib/composite-campaign-contract.js";
import {
  applyCampaignCoverageV5,
  createCampaignV5,
  loadCampaignV5,
} from "../lib/composite-campaign-v5.js";
import {
  checkAppServerV5,
  inspectModelRoutingV5,
  interruptCampaignSliceV5,
  listCampaignThreadsV5,
  runCampaignV5,
} from "../lib/composite-campaign-thread-orchestrator.js";
import path from "node:path";

export async function compositeCampaign(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  if (command === "help") {
    help();
    return;
  }
  const root = process.cwd();
  const parsed = parse(args.slice(1), allowedOptions(command));
  const value = parsed.values;
  const definition = await executeDefinitionCommand(command, root, value);
  const result = definition.handled
    ? definition.result
    : await executeRuntimeCommand(command, root, value);
  console.log(JSON.stringify(result, null, parsed.json ? 0 : 2));
}

type OptionalCommandResult =
  { handled: true; result: unknown } | { handled: false };

async function executeDefinitionCommand(
  command: string,
  root: string,
  value: Map<string, string>,
): Promise<OptionalCommandResult> {
  if (command === "contract")
    return { handled: true, result: compositeCampaignContractV5() };
  if (command === "create")
    return {
      handled: true,
      result: await createCampaignV5(
        root,
        required(value, "--id"),
        required(value, "--plan-file"),
        value.get("--target-branch"),
        { auto_push: optionalBoolean(value, "--auto-push") ?? true },
      ),
    };
  if (command === "apply-coverage")
    return {
      handled: true,
      result: await applyCampaignCoverageV5(
        root,
        required(value, "--campaign"),
        required(value, "--input"),
      ),
    };
  if (command === "apply-scope") {
    const campaign = required(value, "--campaign");
    const coverage =
      value.get("--coverage") ??
      path.join(
        (await loadCampaignV5(root, campaign)).root,
        "source-coverage.json",
      );
    return {
      handled: true,
      result: await applyCampaignScopeV5(
        root,
        campaign,
        required(value, "--input"),
        coverage,
      ),
    };
  }
  if (command === "apply-packet")
    return {
      handled: true,
      result: await applyCampaignPacketV5(
        root,
        required(value, "--campaign"),
        required(value, "--slice"),
        required(value, "--input"),
      ),
    };
  if (command === "render")
    return {
      handled: true,
      result: await renderCampaignPacketV5(
        root,
        required(value, "--campaign"),
        required(value, "--slice"),
      ),
    };
  if (command === "preflight")
    return {
      handled: true,
      result: await preflightCampaignPacketV5(
        root,
        required(value, "--campaign"),
        required(value, "--slice"),
      ),
    };
  return { handled: false };
}

async function executeRuntimeCommand(
  command: string,
  root: string,
  value: Map<string, string>,
): Promise<unknown> {
  if (command === "advance")
    return advanceCampaignV5(root, required(value, "--campaign"));
  if (command === "bind-goal")
    return bindCampaignGoalV5(
      root,
      required(value, "--campaign"),
      required(value, "--slice"),
      required(value, "--goal-id"),
      required(value, "--launch-token"),
    );
  if (command === "bind-repair-goal")
    return bindCampaignRepairGoalV5(
      root,
      required(value, "--campaign"),
      required(value, "--repair-id"),
      required(value, "--goal-id"),
      required(value, "--launch-token"),
    );
  if (command === "record-result")
    return recordCampaignResultV5(
      root,
      required(value, "--campaign"),
      required(value, "--slice"),
      required(value, "--goal-id"),
      required(value, "--workdir"),
    );
  if (command === "status")
    return statusCampaignV5(root, required(value, "--campaign"));
  if (command === "run")
    return runCampaignV5({
      projectRoot: root,
      campaignPath: required(value, "--campaign"),
      controllerProfile: optionalProfile(value),
      controllerThreadId: value.get("--controller-thread-id"),
    });
  if (command === "app-server-check") return checkAppServerV5();
  if (command === "model-routing")
    return inspectModelRoutingV5(optionalProfile(value));
  if (command === "threads")
    return listCampaignThreadsV5(root, required(value, "--campaign"));
  if (command === "interrupt")
    return interruptCampaignSliceV5(
      root,
      required(value, "--campaign"),
      required(value, "--slice"),
    );
  throw new Error(`Unknown composite-campaign subcommand: ${command}`);
}

function allowedOptions(command: string): string[] {
  const common = ["--json"];
  if (command === "contract") return common;
  if (command === "create")
    return [...common, "--id", "--plan-file", "--target-branch", "--auto-push"];
  if (command === "apply-coverage") return [...common, "--campaign", "--input"];
  if (command === "apply-scope")
    return [...common, "--campaign", "--input", "--coverage"];
  if (command === "apply-packet")
    return [...common, "--campaign", "--slice", "--input"];
  if (command === "render" || command === "preflight")
    return [...common, "--campaign", "--slice"];
  if (command === "advance" || command === "status")
    return [...common, "--campaign"];
  if (command === "bind-goal")
    return [...common, "--campaign", "--slice", "--goal-id", "--launch-token"];
  if (command === "bind-repair-goal")
    return [
      ...common,
      "--campaign",
      "--repair-id",
      "--goal-id",
      "--launch-token",
    ];
  if (command === "record-result")
    return [...common, "--campaign", "--slice", "--goal-id", "--workdir"];
  if (command === "run")
    return [
      ...common,
      "--campaign",
      "--controller-model",
      "--controller-effort",
      "--controller-thread-id",
    ];
  if (command === "app-server-check") return common;
  if (command === "model-routing")
    return [...common, "--controller-model", "--controller-effort"];
  if (command === "threads") return [...common, "--campaign"];
  if (command === "interrupt") return [...common, "--campaign", "--slice"];
  throw new Error(`Unknown composite-campaign subcommand: ${command}`);
}

function parse(
  args: string[],
  allowed: string[],
): { values: Map<string, string>; json: boolean } {
  const values = new Map<string, string>();
  const accepted = new Set(allowed);
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!accepted.has(key))
      throw new Error(`Unknown option for composite-campaign command: ${key}`);
    if (values.has(key) || (key === "--json" && json))
      throw new Error(`Duplicate option: ${key}`);
    if (key === "--json") {
      json = true;
      continue;
    }
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw new Error(`${key} requires a value`);
    values.set(key, value);
  }
  return { values, json };
}

function required(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) throw new Error(`Missing required option: ${key}`);
  return value;
}
function optionalProfile(
  options: Map<string, string>,
): { model: string; effort: string } | null {
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
  console.log(
    `ty-context composite-campaign V5 commands:\n  contract [--json]\n  create --id <id> --plan-file <file> [--target-branch <branch>] [--auto-push true|false]\n  apply-coverage --campaign <path> --input <source-coverage.json>\n  apply-scope --campaign <path> --input <scope-v4.json> [--coverage <source-coverage.json>]\n  apply-packet --campaign <path> --slice <id> --input <packet-v3.json>\n  render|preflight|advance|status --campaign <path>\n  record-result --campaign <path> --slice <id> --goal-id <thread-id> --workdir <path>\n  run --campaign <path> [--controller-model <id> --controller-effort <effort>] [--controller-thread-id <id>]\n  app-server-check [--json]\n  model-routing [--controller-model <id> --controller-effort <effort>] [--json]\n  threads --campaign <path> [--json]\n  interrupt --campaign <path> --slice <id>`,
  );
}
