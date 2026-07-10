import {
  applyCompositeCampaignPacketFromFile,
  applyCompositeCampaignScopeFromFile,
  compositeCampaignContract,
  createCompositeCampaignFromFile,
  handoffCompositeCampaignFromPath,
  nextCompositeCampaignSlice,
  preflightCompositeCampaignCurrentRevision,
  recordCompositeCampaignResultFromPath,
  renderCompositeCampaignCurrentRevision,
  startCompositeCampaignGoal
} from "../lib/composite-campaign-service.js";

const COMMAND_OPTIONS: Record<string, { values: string[]; flags: string[] }> = {
  contract: { values: [], flags: ["--json"] },
  create: { values: ["--id", "--request-file"], flags: ["--json"] },
  "apply-scope": { values: ["--campaign", "--input"], flags: ["--json"] },
  "apply-packet": { values: ["--campaign", "--slice", "--input"], flags: ["--json"] },
  render: { values: ["--campaign", "--slice"], flags: ["--json"] },
  preflight: { values: ["--campaign", "--slice"], flags: ["--json"] },
  next: { values: ["--campaign"], flags: ["--json"] },
  handoff: { values: ["--campaign", "--slice"], flags: ["--json"] },
  start: { values: ["--campaign", "--slice", "--goal-id"], flags: ["--json"] },
  "record-result": { values: ["--campaign", "--slice", "--workdir"], flags: ["--json"] }
};

export async function compositeCampaign(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") { help(); return; }
  const definition = COMMAND_OPTIONS[subcommand];
  if (!definition) throw new Error(`Unknown composite-campaign subcommand: ${subcommand}`);
  const options = parseOptions(args.slice(1), definition);
  const root = process.cwd();
  let result: unknown;
  if (subcommand === "contract") result = compositeCampaignContract();
  else if (subcommand === "create") result = await createCompositeCampaignFromFile(root, {
    campaign_id: required(options, "--id"), request_file: required(options, "--request-file")
  });
  else if (subcommand === "apply-scope") result = await applyCompositeCampaignScopeFromFile(root, {
    campaign_path: required(options, "--campaign"), input_file: required(options, "--input")
  });
  else if (subcommand === "apply-packet") result = await applyCompositeCampaignPacketFromFile(root, {
    campaign_path: required(options, "--campaign"), slice_id: required(options, "--slice"), input_file: required(options, "--input")
  });
  else if (subcommand === "render") result = await renderCompositeCampaignCurrentRevision(root, campaignSlice(options));
  else if (subcommand === "preflight") result = await preflightCompositeCampaignCurrentRevision(root, campaignSlice(options));
  else if (subcommand === "next") result = await nextCompositeCampaignSlice(root, required(options, "--campaign"));
  else if (subcommand === "handoff") result = await handoffCompositeCampaignFromPath(root, campaignSlice(options));
  else if (subcommand === "start") result = await startCompositeCampaignGoal(root, {
    ...campaignSlice(options), goal_id: required(options, "--goal-id")
  });
  else result = await recordCompositeCampaignResultFromPath(root, {
    ...campaignSlice(options), workdir: required(options, "--workdir")
  });
  output(result, options.has("--json"));
}

function parseOptions(args: string[], definition: { values: string[]; flags: string[] }): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]!;
    if (definition.flags.includes(option)) {
      if (result.has(option)) throw new Error(`Duplicate option: ${option}`);
      result.set(option, "true");
      continue;
    }
    if (!definition.values.includes(option)) throw new Error(`Unknown option for composite-campaign: ${option}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Option ${option} requires a value`);
    if (result.has(option)) throw new Error(`Duplicate option: ${option}`);
    result.set(option, value);
    index += 1;
  }
  for (const option of definition.values) if (!result.has(option)) throw new Error(`Missing required option: ${option}`);
  return result;
}

function campaignSlice(options: Map<string, string>) {
  return { campaign_path: required(options, "--campaign"), slice_id: required(options, "--slice") };
}
function required(options: Map<string, string>, name: string): string {
  const value = options.get(name);
  if (!value) throw new Error(`Missing required option: ${name}`);
  return value;
}
function output(value: unknown, json: boolean): void {
  if (json) console.log(JSON.stringify(value));
  else if (value && typeof value === "object" && "campaign" in value) {
    const campaign = (value as { campaign: { campaign_id: string; generation: number } }).campaign;
    console.log(`Composite campaign ${campaign.campaign_id} generation ${campaign.generation}`);
  } else console.log("Composite campaign command completed");
}
function help(): void {
  console.log(`ty-context composite-campaign commands:
  contract --json
      Read-only current input contract, schema versions, and canonical hash.
  create --id <id> --request-file <path> [--json]
      Create a sanitized immutable campaign request.
  apply-scope --campaign <path> --input <json> [--json]
      Validate and store or transition ScopeFitResultV1, including a resolved selection.
  apply-packet --campaign <path> --slice <id> --input <json> [--json]
      Store the next immutable CompositeAuthoringPacketV1 revision.
  render --campaign <path> --slice <id> [--json]
      Render and atomically publish the canonical three-input bundle.
  preflight --campaign <path> --slice <id> --json
      Read-only strict packet parse and compile diagnostics.
  next --campaign <path> --json
      Read-only deterministic next-SFC recommendation or decision candidates.
  handoff --campaign <path> --slice <id> [--json]
      Materialize and compile a frozen execution workdir without creating a Goal.
  start --campaign <path> --slice <id> --goal-id <id> [--json]
      Bind one successfully created Goal ID; never creates the Goal itself.
  record-result --campaign <path> --slice <id> --workdir <path> [--json]
      Record only a verified current final-gate result projection.`);
}
