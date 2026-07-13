import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { ModelRoutingReason } from "./codex-model-router.js";

export interface SliceGoalManifestV1 {
  schema_version: "slice-goal-manifest-v1";
  campaign_id: string;
  slice_id: string;
  wave_id: string;
  worktree: string;
  branch: string;
  base_commit: string;
  packet_revision: number;
  packet_sha256: string;
  contract_workdir: string;
  integration_branch: string;
  allowed_implementation_bindings: string[];
  forbidden_campaign_state_paths: string[];
  launch_token: string;
  manifest_sha256: string;
}

export interface SliceGoalManifestInput extends Omit<SliceGoalManifestV1, "schema_version" | "launch_token" | "manifest_sha256"> {
  launch_token?: string;
}

export interface SliceGoalManifestV2 extends Omit<SliceGoalManifestV1, "schema_version"> {
  schema_version: "slice-goal-manifest-v2";
  thread_id: string;
  authoring_model: string;
  authoring_effort: string;
  execution_model: string;
  execution_effort: string;
  routing_reason: ModelRoutingReason;
}

export interface SliceGoalManifestInputV2 extends Omit<SliceGoalManifestV2, "schema_version" | "launch_token" | "manifest_sha256"> { launch_token?: string }

export async function createSliceGoalManifest(campaignRoot: string, input: SliceGoalManifestInput): Promise<{ manifest: SliceGoalManifestV1; manifest_path: string; objective_path: string }> {
  assertSha(input.base_commit, "base_commit");
  assertSha(input.packet_sha256, "packet_sha256");
  const identity = {
    schema_version: "slice-goal-manifest-v1" as const,
    ...input,
    worktree: path.resolve(input.worktree),
    contract_workdir: path.resolve(input.contract_workdir),
    allowed_implementation_bindings: stable(input.allowed_implementation_bindings),
    forbidden_campaign_state_paths: stable(input.forbidden_campaign_state_paths),
    launch_token: input.launch_token ?? sha256Hex(canonicalJson({ campaign_id: input.campaign_id, slice_id: input.slice_id, wave_id: input.wave_id, packet_sha256: input.packet_sha256, base_commit: input.base_commit })).slice(0, 32)
  };
  const manifest: SliceGoalManifestV1 = { ...identity, manifest_sha256: sha256Hex(canonicalJson(identity)) };
  const manifestPath = path.join(path.resolve(campaignRoot), "waves", input.wave_id, "goals", input.slice_id, "goal-manifest.json");
  await writeImmutableOrSame(manifestPath, manifest);
  const objectivePath = path.join(manifest.contract_workdir, "goal-objective.txt");
  await mkdir(path.dirname(objectivePath), { recursive: true });
  await writeFile(objectivePath, renderSliceGoalObjective(manifest), "utf8");
  return { manifest, manifest_path: manifestPath, objective_path: objectivePath };
}

export async function createSliceGoalManifestV2(campaignRoot: string, input: SliceGoalManifestInputV2): Promise<{ manifest: SliceGoalManifestV2; manifest_path: string; objective_path: string }> {
  assertSha(input.base_commit, "base_commit"); assertSha(input.packet_sha256, "packet_sha256");
  for (const [label, value] of [["thread_id", input.thread_id], ["authoring_model", input.authoring_model], ["authoring_effort", input.authoring_effort], ["execution_model", input.execution_model], ["execution_effort", input.execution_effort]] as const) if (!value.trim()) throw new Error(`${label} must not be empty`);
  const identity = {
    schema_version: "slice-goal-manifest-v2" as const, ...input, worktree: path.resolve(input.worktree), contract_workdir: path.resolve(input.contract_workdir),
    allowed_implementation_bindings: stable(input.allowed_implementation_bindings), forbidden_campaign_state_paths: stable(input.forbidden_campaign_state_paths),
    launch_token: input.launch_token ?? sha256Hex(canonicalJson({ campaign_id: input.campaign_id, slice_id: input.slice_id, wave_id: input.wave_id, packet_sha256: input.packet_sha256, base_commit: input.base_commit, thread_id: input.thread_id })).slice(0, 32)
  };
  const manifest: SliceGoalManifestV2 = { ...identity, manifest_sha256: sha256Hex(canonicalJson(identity)) };
  const objective = renderSliceGoalObjectiveV2(manifest); if (objective.length > 4000) throw new Error("goal_objective_too_long:maximum_4000_characters");
  const manifestPath = path.join(path.resolve(campaignRoot), "waves", input.wave_id, "goals", input.slice_id, "goal-manifest.json"); await writeImmutableOrSame(manifestPath, manifest);
  const objectivePath = path.join(manifest.contract_workdir, "goal-objective.txt"); await mkdir(path.dirname(objectivePath), { recursive: true }); await writeFile(objectivePath, objective, "utf8");
  return { manifest, manifest_path: manifestPath, objective_path: objectivePath };
}

export async function readSliceGoalManifest(file: string): Promise<SliceGoalManifestV1 | SliceGoalManifestV2> {
  const parsed=JSON.parse(await readFile(file,"utf8"));if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid Slice Goal manifest schema");const value=parsed as unknown as SliceGoalManifestV1|SliceGoalManifestV2;
  if (value.schema_version !== "slice-goal-manifest-v1" && value.schema_version !== "slice-goal-manifest-v2") throw new Error("Invalid Slice Goal manifest schema");validateManifest(value);
  const { manifest_sha256, ...identity } = value;
  if (manifest_sha256 !== sha256Hex(canonicalJson(identity))) throw new Error("Slice Goal manifest hash mismatch");
  return value;
}

export function renderSliceGoalObjectiveV2(manifest: SliceGoalManifestV2): string {
  return `Composite Campaign V5 Slice Goal\n\nCampaign: ${manifest.campaign_id}\nSlice: ${manifest.slice_id}\nWave: ${manifest.wave_id}\nApp Server thread: ${manifest.thread_id}\nAuthoring profile: ${manifest.authoring_model} / ${manifest.authoring_effort}\nExecution profile: ${manifest.execution_model} / ${manifest.execution_effort}\nRouting: ${manifest.routing_reason}\nWorktree: ${manifest.worktree}\nBranch: ${manifest.branch}\nBase commit: ${manifest.base_commit}\nPacket: revision ${manifest.packet_revision}, ${manifest.packet_sha256}\nContract workdir: ${manifest.contract_workdir}\nIntegration branch: ${manifest.integration_branch}\nManifest: ${manifest.manifest_sha256}\nAllowed implementation bindings: ${manifest.allowed_implementation_bindings.join(", ") || "none"}\nForbidden campaign-state paths: ${manifest.forbidden_campaign_state_paths.join(", ") || "none"}\n\nRequired loop:\n1. Verify cwd, worktree, branch, base, Packet, thread and manifest identities.\n2. Read current project Context and all three Contract V3 authorities; resolve Context Delta before implementation.\n3. Run: ty-context composite-long-task compile ${quote(manifest.contract_workdir)} --campaign-id ${quote(manifest.campaign_id)} --slice-id ${quote(manifest.slice_id)}\n4. Implement only this Slice, verify, and repair every needs_work finding.\n5. Stage intended Slice changes, commit, and confirm the worktree is clean.\n6. Run final-gate after the commit; repair, recommit and rerun while it reports needs_work.\n7. After a fresh accepted final-gate, modify nothing; the orchestrator records the receipt.\n\nDo not switch branches, merge, change Scope Fit or any Packet, modify Campaign/Integration state, delete worktrees, weaken contracts, or claim Campaign completion. Only the Campaign Final Gate can accept the whole Campaign.\n`;
}

export function renderSliceGoalObjective(manifest: SliceGoalManifestV1): string {
  return `Composite Campaign V4 Slice Goal\n\nCampaign: ${manifest.campaign_id}\nSlice: ${manifest.slice_id}\nWave: ${manifest.wave_id}\nWorktree: ${manifest.worktree}\nBranch: ${manifest.branch}\nBase commit: ${manifest.base_commit}\nPacket: revision ${manifest.packet_revision}, ${manifest.packet_sha256}\nContract workdir: ${manifest.contract_workdir}\nIntegration branch: ${manifest.integration_branch}\nManifest: ${manifest.manifest_sha256}\nAllowed implementation bindings: ${manifest.allowed_implementation_bindings.join(", ") || "none"}\nForbidden campaign-state paths: ${manifest.forbidden_campaign_state_paths.join(", ") || "none"}\n\nRequired loop:\n1. Verify cwd, worktree, branch, base, packet and manifest identities.\n2. Read current project Context and the three Contract V3 YAML authorities; resolve Context Delta before implementation.\n3. Run: ty-context composite-long-task compile ${quote(manifest.contract_workdir)} --campaign-id ${quote(manifest.campaign_id)} --slice-id ${quote(manifest.slice_id)}\n4. Implement only this Slice, verify, and repair every needs_work finding.\n5. Stage all intended Slice changes and create the Slice commit. Confirm the worktree is clean.\n6. Run final-gate only after the commit. If it returns needs_work, repair, recommit, and rerun it.\n7. After a fresh accepted final-gate, do not modify any file. The orchestrator records the receipt.\n\nForbidden actions: do not switch branches, merge any branch, modify the Campaign graph or another SFC packet, modify the Integration Branch, delete worktrees, weaken either contract, or claim Campaign completion.\nOnly a fresh accepted Slice final result permits this Goal to finish.\n`;
}

async function writeImmutableOrSame(file: string, value: unknown): Promise<void> {
  const content = canonicalJson(value);
  try {
    const current = await readFile(file, "utf8");
    if (current === content) return;
    throw new Error(`Immutable Goal manifest already exists with different content: ${file}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, { flag: "wx" });
}

function stable(values: string[]): string[] {
  return [...new Set(values)].sort(asciiCompare);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSha(value: string, label: string): void {
  if (!/^[a-f0-9]{40,64}$/u.test(value)) throw new Error(`${label} must be a Git or SHA-256 identity`);
}

function validateManifest(value:SliceGoalManifestV1|SliceGoalManifestV2):void{const base=["schema_version","campaign_id","slice_id","wave_id","worktree","branch","base_commit","packet_revision","packet_sha256","contract_workdir","integration_branch","allowed_implementation_bindings","forbidden_campaign_state_paths","launch_token","manifest_sha256"];const v2=["thread_id","authoring_model","authoring_effort","execution_model","execution_effort","routing_reason"];const expected=value.schema_version==="slice-goal-manifest-v2"?[...base,...v2]:base;for(const key of expected)if(!Object.hasOwn(value,key))throw new Error(`Invalid Slice Goal manifest field: ${key}`);for(const key of Object.keys(value))if(!expected.includes(key))throw new Error(`Unknown Slice Goal manifest field: ${key}`);for(const key of ["campaign_id","slice_id","wave_id","worktree","branch","contract_workdir","integration_branch","launch_token"] as const)if(typeof value[key]!=="string"||!value[key].trim())throw new Error(`Invalid Slice Goal manifest field: ${key}`);if(!path.isAbsolute(value.worktree)||!path.isAbsolute(value.contract_workdir))throw new Error("Slice Goal manifest worktree paths must be absolute");assertSha(value.base_commit,"base_commit");if(!/^[a-f0-9]{64}$/u.test(value.packet_sha256)||!Number.isInteger(value.packet_revision)||value.packet_revision<1)throw new Error("Invalid Slice Goal manifest Packet identity");for(const key of ["allowed_implementation_bindings","forbidden_campaign_state_paths"] as const)if(!Array.isArray(value[key])||value[key].some(item=>typeof item!=="string")||new Set(value[key]).size!==value[key].length)throw new Error(`Invalid Slice Goal manifest field: ${key}`);if(!/^[a-f0-9]{64}$/u.test(value.manifest_sha256))throw new Error("Invalid Slice Goal manifest hash");if(value.schema_version==="slice-goal-manifest-v2"){for(const key of ["thread_id","authoring_model","authoring_effort","execution_model","execution_effort"] as const)if(typeof value[key]!=="string"||!value[key].trim())throw new Error(`Invalid Slice Goal manifest field: ${key}`);if(!["sol_xhigh_to_medium","sol_max_to_medium","catalog_upgrade_to_sol_medium","below_threshold_passthrough","unknown_profile_passthrough","target_unavailable_passthrough"].includes(value.routing_reason))throw new Error("Invalid Slice Goal manifest routing_reason");}}

function quote(value: string): string {
  return /\s/u.test(value) ? JSON.stringify(value) : value;
}
