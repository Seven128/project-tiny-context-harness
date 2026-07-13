import { parseStrictYaml } from "./composite-campaign-codec.js";
import { assertCampaignV4, CAMPAIGN_SCHEMA_V4, type CampaignSliceV4, type CampaignV4 } from "./composite-campaign-schema-v4.js";
import type { ModelProfile, ModelRoutingReason } from "./codex-model-router.js";

export const CAMPAIGN_SCHEMA_V5 = "composite-campaign-v5" as const;
export const THREAD_PHASES_V5 = ["thread_pending", "authoring", "packet_validation", "worktree_ready", "goal_active", "executing", "accepted", "failed", "interrupted"] as const;
export type ThreadPhaseV5 = typeof THREAD_PHASES_V5[number];
export type ThreadTurnStatusV5 = "idle" | "inProgress" | "completed" | "interrupted" | "failed" | "system_error";

export interface ControllerProfileV5 {
  model: string | null;
  effort: string | null;
  source: "controller_thread" | "host_explicit" | "unknown";
}

export interface CampaignExecutionHostV5 {
  kind: "codex_app_server";
  controller_thread_id: string | null;
  controller_profile: ControllerProfileV5;
  model_catalog_sha256: string | null;
  app_server_version: string | null;
  status: "disconnected" | "connected" | "reconnecting" | "wait_external";
  restart_count: 0 | 1;
  last_error_code: string | null;
}

export interface ThreadGoalStateV5 {
  status: "not_set" | "active" | "complete" | "blocked";
  objective_sha256: string | null;
}

export interface CampaignThreadStateV5 {
  thread_id: string | null;
  session_id: string | null;
  phase: ThreadPhaseV5;
  authoring_profile: ModelProfile | null;
  execution_profile: ModelProfile | null;
  routing_reason: ModelRoutingReason | null;
  authoring_turn_ids: string[];
  goal: ThreadGoalStateV5;
  execution_turn_ids: string[];
  active_turn_id: string | null;
  last_turn_status: ThreadTurnStatusV5;
  launch_token: string | null;
  last_error_code: string | null;
}

export interface CampaignSliceV5 extends CampaignSliceV4 { thread: CampaignThreadStateV5 }
export interface CampaignRepairThreadV5 { wave_id: string; repair_id: string; thread: CampaignThreadStateV5 }

export interface CampaignV5 extends Omit<CampaignV4, "schema_version" | "slices"> {
  schema_version: typeof CAMPAIGN_SCHEMA_V5;
  execution_host: CampaignExecutionHostV5;
  slices: Record<string, CampaignSliceV5>;
  repair_threads: Record<string, CampaignRepairThreadV5>;
}

export function parseCampaignV5(content: string): CampaignV5 { return assertCampaignV5(parseStrictYaml(content)); }

export function assertCampaignV5(value: unknown): CampaignV5 {
  const root = record(value, "campaign");
  if (root.schema_version !== CAMPAIGN_SCHEMA_V5) invalid(`expected_${CAMPAIGN_SCHEMA_V5}`);
  const expected = ["schema_version", "campaign_id", "source_plan_sha256", "source_kind", "created_at", "target_branch", "base_commit", "integration_branch", "integration_head", "graph", "slices", "waves", "generation", "campaign_status", "execution_host", "repair_threads"];
  exact(root, expected);
  const slices = record(root.slices, "slices");
  const projectedSlices: Record<string, unknown> = {};
  for (const [sliceId, value] of Object.entries(slices)) {
    const slice = record(value, `slices.${sliceId}`); exact(slice, ["status", "packet_revision", "packet_sha256", "wave_id", "branch", "worktree", "goal_id", "base_commit", "head_commit", "final_receipt_sha256", "merge_commit", "thread"]);
    assertThreadStateV5(slice.thread, `${sliceId}.thread`);
    const { thread: _thread, ...legacy } = slice; projectedSlices[sliceId] = legacy;
  }
  const { execution_host: _host, repair_threads: _repairs, ...base } = root;
  assertCampaignV4({ ...base, schema_version: CAMPAIGN_SCHEMA_V4, slices: projectedSlices });
  assertExecutionHost(root.execution_host);
  const repairs = record(root.repair_threads, "repair_threads");
  for (const [repairId, value] of Object.entries(repairs)) {
    const repair = record(value, `repair_threads.${repairId}`); exact(repair, ["wave_id", "repair_id", "thread"]);
    if (repair.repair_id !== repairId || typeof repair.wave_id !== "string") invalid(`repair_identity:${repairId}`);
    assertThreadStateV5(repair.thread, `${repairId}.thread`);
  }
  return root as unknown as CampaignV5;
}

export function emptyThreadStateV5(): CampaignThreadStateV5 {
  return {
    thread_id: null, session_id: null, phase: "thread_pending", authoring_profile: null, execution_profile: null,
    routing_reason: null, authoring_turn_ids: [], goal: { status: "not_set", objective_sha256: null },
    execution_turn_ids: [], active_turn_id: null, last_turn_status: "idle", launch_token: null, last_error_code: null
  };
}

export function emptyExecutionHostV5(): CampaignExecutionHostV5 {
  return { kind: "codex_app_server", controller_thread_id: null, controller_profile: { model: null, effort: null, source: "unknown" }, model_catalog_sha256: null, app_server_version: null, status: "disconnected", restart_count: 0, last_error_code: null };
}

export function campaignHasGoalV5(campaign: CampaignV5): boolean {
  return Object.values(campaign.slices).some((slice) => slice.thread.goal.status !== "not_set");
}

export function assertThreadStateV5(value: unknown, label = "thread"): CampaignThreadStateV5 {
  const row = record(value, label);
  exact(row, ["thread_id", "session_id", "phase", "authoring_profile", "execution_profile", "routing_reason", "authoring_turn_ids", "goal", "execution_turn_ids", "active_turn_id", "last_turn_status", "launch_token", "last_error_code"]);
  nullableText(row.thread_id, `${label}.thread_id`); nullableText(row.session_id, `${label}.session_id`); oneOf(row.phase, THREAD_PHASES_V5, `${label}.phase`);
  if (row.authoring_profile !== null) modelProfile(row.authoring_profile, `${label}.authoring_profile`);
  if (row.execution_profile !== null) modelProfile(row.execution_profile, `${label}.execution_profile`);
  if (row.routing_reason !== null) oneOf(row.routing_reason, ["sol_xhigh_to_medium", "sol_max_to_medium", "catalog_upgrade_to_sol_medium", "below_threshold_passthrough", "unknown_profile_passthrough", "target_unavailable_passthrough"], `${label}.routing_reason`);
  stringList(row.authoring_turn_ids, `${label}.authoring_turn_ids`); stringList(row.execution_turn_ids, `${label}.execution_turn_ids`);
  const goal = record(row.goal, `${label}.goal`); exact(goal, ["status", "objective_sha256"]); oneOf(goal.status, ["not_set", "active", "complete", "blocked"], `${label}.goal.status`); nullableHash(goal.objective_sha256, `${label}.goal.objective_sha256`);
  nullableText(row.active_turn_id, `${label}.active_turn_id`); oneOf(row.last_turn_status, ["idle", "inProgress", "completed", "interrupted", "failed", "system_error"], `${label}.last_turn_status`);
  nullableText(row.launch_token, `${label}.launch_token`); nullableText(row.last_error_code, `${label}.last_error_code`);
  if (row.thread_id === null && ((row.authoring_turn_ids as string[]).length || (row.execution_turn_ids as string[]).length || goal.status !== "not_set")) invalid(`${label}:identity_missing`);
  if ((row.thread_id===null)!==(row.session_id===null)) invalid(`${label}:session_identity_incomplete`);
  if ((goal.status==="not_set")!==(goal.objective_sha256===null)) invalid(`${label}:goal_objective_state_mismatch`);
  if (["goal_active","executing","accepted"].includes(row.phase as string)&&goal.status==="not_set") invalid(`${label}:goal_phase_without_goal`);
  if (row.phase==="accepted"&&goal.status!=="complete") invalid(`${label}:accepted_goal_incomplete`);
  const turns=new Set([...(row.authoring_turn_ids as string[]),...(row.execution_turn_ids as string[])]);if(row.active_turn_id!==null&&!turns.has(row.active_turn_id as string))invalid(`${label}:active_turn_untracked`);
  if((row.last_turn_status==="inProgress")!==(row.active_turn_id!==null))invalid(`${label}:active_turn_status_mismatch`);
  return row as unknown as CampaignThreadStateV5;
}

function assertExecutionHost(value:unknown):void{const row=record(value,"execution_host");exact(row,["kind","controller_thread_id","controller_profile","model_catalog_sha256","app_server_version","status","restart_count","last_error_code"]);if(row.kind!=="codex_app_server")invalid("execution_host.kind");nullableText(row.controller_thread_id,"controller_thread_id");const profile=record(row.controller_profile,"controller_profile");exact(profile,["model","effort","source"]);nullableText(profile.model,"controller.model");nullableText(profile.effort,"controller.effort");oneOf(profile.source,["controller_thread","host_explicit","unknown"],"controller.source");if(profile.source!=="unknown"&&(profile.model===null||profile.effort===null))invalid("controller_profile_incomplete");if(profile.source==="unknown"&&(profile.model!==null||profile.effort!==null))invalid("unknown_controller_profile_must_be_null");if(profile.source==="controller_thread"&&row.controller_thread_id===null)invalid("controller_thread_id_missing");nullableHash(row.model_catalog_sha256,"model_catalog_sha256");nullableText(row.app_server_version,"app_server_version");oneOf(row.status,["disconnected","connected","reconnecting","wait_external"],"execution_host.status");if(row.status==="connected"&&(row.model_catalog_sha256===null||row.app_server_version===null))invalid("connected_host_identity_incomplete");if(row.restart_count!==0&&row.restart_count!==1)invalid("restart_count");nullableText(row.last_error_code,"last_error_code");}
function modelProfile(value:unknown,label:string):void{const row=record(value,label);exact(row,["model","effort"]);text(row.model,`${label}.model`);text(row.effort,`${label}.effort`);}
function record(value:unknown,label:string):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))invalid(`${label}_not_object`);return value as Record<string,unknown>;}
function exact(row:Record<string,unknown>,keys:string[]):void{for(const key of keys)if(!Object.hasOwn(row,key))invalid(`missing_field:${key}`);for(const key of Object.keys(row))if(!keys.includes(key))invalid(`unknown_field:${key}`);}
function text(value:unknown,label:string):void{if(typeof value!=="string"||!value.trim())invalid(`${label}_empty`);}
function nullableText(value:unknown,label:string):void{if(value!==null)text(value,label);}
function nullableHash(value:unknown,label:string):void{if(value!==null&&(typeof value!=="string"||!/^[a-f0-9]{64}$/u.test(value)))invalid(`${label}_invalid`);}
function stringList(value:unknown,label:string):void{if(!Array.isArray(value)||value.some((item)=>typeof item!=="string"||!item)||new Set(value).size!==value.length)invalid(`${label}_invalid`);}
function oneOf<T extends string>(value:unknown,allowed:readonly T[],label:string):void{if(typeof value!=="string"||!allowed.includes(value as T))invalid(`${label}_unsupported`);}
function invalid(reason:string):never{throw new Error(`composite_campaign_v5_invalid:${reason}`);}
