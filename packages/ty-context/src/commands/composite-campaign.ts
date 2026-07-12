import { applyPacketV3, applyScopeV3, bindCampaignGoalV3, compositeCampaignV3Contract, createCampaignV3, handoffCampaignV3, nextCampaignSfcV3, preflightCampaignV3, recordCampaignResultV3, renderCampaignV3 } from "../lib/composite-campaign-v3.js";
import { assertLongTaskHostGate } from "../lib/long-task-hook-preflight.js";
import { compileAndSealLongTaskContractViaHost, readCurrentLongTaskFinalResultViaHost } from "../lib/long-task-host-client.js";

export async function compositeCampaign(args: string[]): Promise<void> { const command = args[0] ?? "help"; if (command === "help") { help(); return; } const options = parse(args.slice(1)); const root = process.cwd(); let result: unknown;
  if (command === "contract") result = compositeCampaignV3Contract();
  else if (command === "create") result = await createCampaignV3(root, required(options, "--id"), required(options, "--request-file"));
  else if (command === "apply-scope") result = await applyScopeV3(root, required(options, "--campaign"), required(options, "--input"));
  else if (command === "apply-packet") result = await applyPacketV3(root, required(options, "--campaign"), required(options, "--sfc"), required(options, "--input"));
  else if (command === "render") result = await renderCampaignV3(root, required(options, "--campaign"), required(options, "--sfc"));
  else if (command === "preflight") result = await preflightCampaignV3(root, required(options, "--campaign"), required(options, "--sfc"));
  else if (command === "next") result = await nextCampaignSfcV3(root, required(options, "--campaign"));
  else if (command === "handoff") result = await handoffCampaignV3(root, required(options, "--campaign"), required(options, "--sfc"));
  else if (command === "start") { await assertLongTaskHostGate(root,{allow_existing_authority:true}); result = await bindCampaignGoalV3(root, required(options, "--campaign"), required(options, "--sfc"), required(options, "--goal-id"),compileAndSealLongTaskContractViaHost); }
  else if (command === "record-result") result = await recordCampaignResultV3(root, required(options, "--campaign"), required(options, "--sfc"), required(options, "--workdir"),readCurrentLongTaskFinalResultViaHost);
  else throw new Error(`Unknown composite-campaign subcommand: ${command}`); console.log(JSON.stringify(result, null, options.has("--json") ? 0 : 2)); }
function parse(args: string[]) { const result = new Map<string, string>(); for (let i=0;i<args.length;i++) { const key=args[i]; if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`); if (key === "--json") { result.set(key, "true"); continue; } const value=args[++i]; if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`); if (result.has(key)) throw new Error(`Duplicate option: ${key}`); result.set(key,value); } return result; }
function required(options: Map<string,string>, key: string) { const value=options.get(key); if (!value) throw new Error(`Missing required option: ${key}`); return value; }
function help() { console.log("ty-context composite-campaign V3 commands: contract, create, apply-scope, apply-packet, render, preflight, next, handoff, start, record-result"); }
