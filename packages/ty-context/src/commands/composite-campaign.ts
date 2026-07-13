import { advanceCampaignV4, bindCampaignGoalV4, bindCampaignRepairGoalV4, recordCampaignResultV4, statusCampaignV4 } from "../lib/composite-campaign-orchestrator.js";
import { applyCampaignPacketV4, applyCampaignScopeV4, compositeCampaignV4Contract, createCampaignV4, preflightCampaignPacketV4, renderCampaignPacketV4 } from "../lib/composite-campaign-v4.js";

export async function compositeCampaign(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  if (command === "help") { help(); return; }
  const root = process.cwd();
  const parsed = parse(args.slice(1), allowedOptions(command));
  const value = parsed.values;
  let result: unknown;
  if (command === "contract") result = compositeCampaignV4Contract();
  else if (command === "create") result = await createCampaignV4(root, required(value, "--id"), required(value, "--plan-file"), value.get("--target-branch"));
  else if (command === "apply-scope") result = await applyCampaignScopeV4(root, required(value, "--campaign"), required(value, "--input"), required(value, "--coverage"));
  else if (command === "apply-packet") result = await applyCampaignPacketV4(root, required(value, "--campaign"), required(value, "--slice"), required(value, "--input"));
  else if (command === "render") result = await renderCampaignPacketV4(root, required(value, "--campaign"), required(value, "--slice"));
  else if (command === "preflight") result = await preflightCampaignPacketV4(root, required(value, "--campaign"), required(value, "--slice"));
  else if (command === "advance") result = await advanceCampaignV4(root, required(value, "--campaign"));
  else if (command === "bind-goal") result = await bindCampaignGoalV4(root, required(value, "--campaign"), required(value, "--slice"), required(value, "--goal-id"), required(value, "--launch-token"));
  else if (command === "bind-repair-goal") result = await bindCampaignRepairGoalV4(root, required(value, "--campaign"), required(value, "--repair-id"), required(value, "--goal-id"), required(value, "--launch-token"));
  else if (command === "record-result") result = await recordCampaignResultV4(root, required(value, "--campaign"), required(value, "--slice"), required(value, "--goal-id"), required(value, "--workdir"));
  else if (command === "status") result = await statusCampaignV4(root, required(value, "--campaign"));
  else throw new Error(`Unknown composite-campaign subcommand: ${command}`);
  console.log(JSON.stringify(result, null, parsed.json ? 0 : 2));
}

function allowedOptions(command: string): string[] {
  const common = ["--json"];
  if (command === "contract") return common;
  if (command === "create") return [...common, "--id", "--plan-file", "--target-branch"];
  if (command === "apply-scope") return [...common, "--campaign", "--input", "--coverage"];
  if (command === "apply-packet") return [...common, "--campaign", "--slice", "--input"];
  if (command === "render" || command === "preflight") return [...common, "--campaign", "--slice"];
  if (command === "advance" || command === "status") return [...common, "--campaign"];
  if (command === "bind-goal") return [...common, "--campaign", "--slice", "--goal-id", "--launch-token"];
  if (command === "bind-repair-goal") return [...common, "--campaign", "--repair-id", "--goal-id", "--launch-token"];
  if (command === "record-result") return [...common, "--campaign", "--slice", "--goal-id", "--workdir"];
  throw new Error(`Unknown composite-campaign subcommand: ${command}`);
}

function parse(args: string[], allowed: string[]): { values: Map<string, string>; json: boolean } {
  const values = new Map<string, string>(); const accepted = new Set(allowed); let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!accepted.has(key)) throw new Error(`Unknown option for composite-campaign command: ${key}`);
    if (values.has(key) || (key === "--json" && json)) throw new Error(`Duplicate option: ${key}`);
    if (key === "--json") { json = true; continue; }
    const value = args[++index]; if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`); values.set(key, value);
  }
  return { values, json };
}

function required(options: Map<string, string>, key: string): string { const value = options.get(key); if (!value) throw new Error(`Missing required option: ${key}`); return value; }
function help(): void { console.log(`ty-context composite-campaign V4 commands:\n  contract [--json]\n  create --id <id> --plan-file <file> [--target-branch <branch>]\n  apply-scope --campaign <path> --input <scope-v3.json> --coverage <source-coverage.json>\n  apply-packet --campaign <path> --slice <id> --input <packet-v3.json>\n  render --campaign <path> --slice <id>\n  preflight --campaign <path> --slice <id> [--json]\n  advance --campaign <path> [--json]\n  bind-goal --campaign <path> --slice <id> --goal-id <id> --launch-token <token>\n  bind-repair-goal --campaign <path> --repair-id <id> --goal-id <id> --launch-token <token>\n  record-result --campaign <path> --slice <id> --goal-id <id> --workdir <path>\n  status --campaign <path> [--json]`); }
