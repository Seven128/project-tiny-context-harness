import { applyPacketV2, applyScopeV2, bindCampaignGoalV2, compositeCampaignV2Contract, createCampaignV2, handoffCampaignV2, nextCampaignSliceV2, preflightCampaignV2, recordCampaignResultV2, renderCampaignV2 } from "../lib/composite-campaign-v2.js";

export async function compositeCampaign(args: string[]): Promise<void> { const command = args[0] ?? "help"; if (command === "help") { help(); return; } const options = parse(args.slice(1)); const root = process.cwd(); let result: unknown;
  if (command === "contract") result = compositeCampaignV2Contract();
  else if (command === "create") result = await createCampaignV2(root, required(options, "--id"), required(options, "--request-file"));
  else if (command === "apply-scope") result = await applyScopeV2(root, required(options, "--campaign"), required(options, "--input"));
  else if (command === "apply-packet") result = await applyPacketV2(root, required(options, "--campaign"), required(options, "--slice"), required(options, "--input"));
  else if (command === "render") result = await renderCampaignV2(root, required(options, "--campaign"), required(options, "--slice"));
  else if (command === "preflight") result = await preflightCampaignV2(root, required(options, "--campaign"), required(options, "--slice"));
  else if (command === "next") result = await nextCampaignSliceV2(root, required(options, "--campaign"));
  else if (command === "handoff") result = await handoffCampaignV2(root, required(options, "--campaign"), required(options, "--slice"));
  else if (command === "start") result = await bindCampaignGoalV2(root, required(options, "--campaign"), required(options, "--slice"), required(options, "--goal-id"));
  else if (command === "record-result") result = await recordCampaignResultV2(root, required(options, "--campaign"), required(options, "--slice"), required(options, "--workdir"));
  else throw new Error(`Unknown composite-campaign subcommand: ${command}`); console.log(JSON.stringify(result, null, options.has("--json") ? 0 : 2)); }
function parse(args: string[]) { const result = new Map<string, string>(); for (let i=0;i<args.length;i++) { const key=args[i]; if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`); if (key === "--json") { result.set(key, "true"); continue; } const value=args[++i]; if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`); if (result.has(key)) throw new Error(`Duplicate option: ${key}`); result.set(key,value); } return result; }
function required(options: Map<string,string>, key: string) { const value=options.get(key); if (!value) throw new Error(`Missing required option: ${key}`); return value; }
function help() { console.log("ty-context composite-campaign V2 commands: contract, create, apply-scope, apply-packet, render, preflight, next, handoff, start, record-result"); }
