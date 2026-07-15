import { parseStrictYaml } from "./composite-campaign-codec.js";
import type { CampaignGraphV4 } from "./composite-campaign-schema-v4.js";
import type { CampaignContextBaseline } from "./context-graph-snapshot.js";
import {
  MODEL_ROUTING_REASONS,
  type ModelProfile,
  type ModelRoutingReason,
} from "./codex-model-profile.js";

export const CAMPAIGN_SCHEMA_V6 = "composite-campaign-v6" as const;
export const EXECUTION_ENGINE_V1 = "codex-exec-v1" as const;
export const WORKER_COMMAND_TEMPLATE_V1 =
  "codex-exec-worker-command-v1" as const;

export const SLICE_STATUSES_V6 = [
  "planned",
  "packet_pending",
  "packet_ready",
  "scheduled",
  "worker_running",
  "needs_work",
  "needs_attention",
  "accepted",
  "merged",
  "integration_verified",
  "decision_blocked",
  "externally_blocked",
  "interrupted",
] as const;
export type SliceStatusV6 = (typeof SLICE_STATUSES_V6)[number];

export const CAMPAIGN_STATUSES_V6 = [
  "planning",
  "authoring",
  "executing",
  "integrating",
  "finalizing",
  "accepted",
  "abandoned",
  "blocked",
  "decision_blocked",
  "externally_blocked",
  "interrupted",
] as const;
export type CampaignStatusV6 = (typeof CAMPAIGN_STATUSES_V6)[number];

export const WAVE_STATUSES_V6 = [
  "scheduled",
  "running",
  "accepted",
  "merged",
  "integration_verified",
  "repair_required",
  "blocked",
  "interrupted",
] as const;
export type CampaignWaveStatusV6 = (typeof WAVE_STATUSES_V6)[number];

export interface CampaignWorkerRunV6 {
  run_id: string;
  kind: "authoring" | "execution" | "repair";
  attempt: number;
  run_generation: number;
  pid: number | null;
  process_start_identity: string | null;
  started_at: string;
  completed_at: string | null;
  profile: ModelProfile;
  cwd: string;
  prompt_sha256: string;
  status: "starting" | "running" | "exited" | "interrupted";
  exit_code: number | null;
}

export interface CampaignExecutionEngineV6 {
  execution_engine_id: typeof EXECUTION_ENGINE_V1;
  frozen: boolean;
  codex_cli_version: string | null;
  model_routing_policy_id: string;
  model_routing_policy_sha256: string;
  routing_decision_sha256: string | null;
  routing_reason: ModelRoutingReason | null;
  fallback_reason: "target_unavailable_passthrough" | null;
  authoring_profile: ModelProfile | null;
  execution_profile: ModelProfile | null;
  worker_command_template_version: typeof WORKER_COMMAND_TEMPLATE_V1;
  max_parallelism: {
    authoring: number;
    sfc: number;
  };
  process_sandbox_policy: {
    authoring: "read-only";
    execution: "workspace-write";
    repair: "workspace-write";
  };
}

export interface CampaignPolicyV6 {
  auto_push: boolean;
  protected_branch_mode: "pull_request";
  preserve_primary_worktree: true;
  max_authoring_attempts_per_slice: 3;
  max_execution_attempts_per_run: 4;
  max_repair_attempts_per_run: 4;
  worker_timeout_ms: number;
  worker_termination_grace_ms: number;
}

export interface CampaignSliceV6 {
  status: SliceStatusV6;
  packet_revision: number | null;
  packet_sha256: string | null;
  wave_id: string | null;
  base_commit: string | null;
  head_commit: string | null;
  attempt_count: {
    authoring: number;
    execution: number;
  };
  worktree_path: string | null;
  current_worker_run: CampaignWorkerRunV6 | null;
  final_receipt_sha256: string | null;
  merge_commit: string | null;
  integration_result_sha256: string | null;
  last_error_code: string | null;
}

export interface CampaignWaveV6 {
  base_commit: string;
  slice_ids: string[];
  status: CampaignWaveStatusV6;
  schedule_sha256: string;
  integration_result_sha256: string | null;
}

export interface CampaignRepairV6 {
  status: "idle" | "running" | "needs_work" | "blocked" | "interrupted";
  kind:
    | "merge_conflict"
    | "integration_regression"
    | "campaign_final_regression"
    | null;
  attempt_count: number;
  worktree_path: string;
  base_commit: string | null;
  head_commit: string | null;
  affected_slice_ids: string[];
  manifest_path: string | null;
  manifest_sha256: string | null;
  current_worker_run: CampaignWorkerRunV6 | null;
  last_error_code: string | null;
}

export interface CampaignFinalizationV6 {
  target_commit: string;
  target_receipt_sha256: string;
  accepted_at: string;
  cleanup_status: "pending" | "complete";
  cleanup_error_code: string | null;
}

export interface CampaignV6 {
  schema_version: typeof CAMPAIGN_SCHEMA_V6;
  campaign_id: string;
  source_plan_sha256: string;
  source_kind: "discussed_plan";
  created_at: string;
  target_branch: string;
  base_commit: string | null;
  integration_ref: string;
  integration_head: string | null;
  graph: CampaignGraphV4;
  slices: Record<string, CampaignSliceV6>;
  waves: Record<string, CampaignWaveV6>;
  context_baseline: CampaignContextBaseline;
  campaign_policy: CampaignPolicyV6;
  execution_engine: CampaignExecutionEngineV6;
  active_wave: string | null;
  repair: CampaignRepairV6;
  finalization: CampaignFinalizationV6 | null;
  generation: number;
  run_generation: number;
  campaign_status: CampaignStatusV6;
  block_reason: string | null;
}

export function parseCampaignV6(content: string): CampaignV6 {
  return assertCampaignV6(parseStrictYaml(content));
}

export function assertCampaignV6(value: unknown): CampaignV6 {
  const root = object(value, "campaign");
  if (root.schema_version !== CAMPAIGN_SCHEMA_V6)
    invalid(`expected_${CAMPAIGN_SCHEMA_V6}`);
  exact(root, [
    "schema_version",
    "campaign_id",
    "source_plan_sha256",
    "source_kind",
    "created_at",
    "target_branch",
    "base_commit",
    "integration_ref",
    "integration_head",
    "graph",
    "slices",
    "waves",
    "context_baseline",
    "campaign_policy",
    "execution_engine",
    "active_wave",
    "repair",
    "finalization",
    "generation",
    "run_generation",
    "campaign_status",
    "block_reason",
  ]);
  text(root.campaign_id, "campaign_id");
  hash(root.source_plan_sha256, "source_plan_sha256");
  if (root.source_kind !== "discussed_plan") invalid("source_kind");
  timestamp(root.created_at, "created_at");
  text(root.target_branch, "target_branch");
  nullableOid(root.base_commit, "base_commit");
  text(root.integration_ref, "integration_ref");
  nullableOid(root.integration_head, "integration_head");
  validateGraph(root.graph);
  const slices = object(root.slices, "slices");
  for (const [sliceId, slice] of Object.entries(slices)) {
    if (!/^SFC-[0-9]{3,}$/u.test(sliceId)) invalid(`slice_id:${sliceId}`);
    validateSlice(slice, sliceId);
  }
  const waves = object(root.waves, "waves");
  for (const [waveId, wave] of Object.entries(waves))
    validateWave(wave, waveId, slices);
  validateContextBaseline(root.context_baseline);
  validatePolicy(root.campaign_policy);
  validateExecutionEngine(root.execution_engine);
  nullableText(root.active_wave, "active_wave");
  const activeWave = root.active_wave as string | null;
  if (activeWave !== null && !Object.hasOwn(waves, activeWave))
    invalid("active_wave_unknown");
  validateRepair(root.repair, slices);
  validateFinalization(root.finalization);
  positiveInteger(root.generation, "generation");
  nonnegativeInteger(root.run_generation, "run_generation");
  oneOf(root.campaign_status, CAMPAIGN_STATUSES_V6, "campaign_status");
  nullableText(root.block_reason, "block_reason");
  if (root.campaign_status === "accepted" && root.finalization === null)
    invalid("accepted_finalization_missing");
  if (root.campaign_status !== "accepted" && root.finalization !== null)
    invalid("premature_finalization");
  return root as unknown as CampaignV6;
}

export function emptyCampaignSliceV6(): CampaignSliceV6 {
  return {
    status: "planned",
    packet_revision: null,
    packet_sha256: null,
    wave_id: null,
    base_commit: null,
    head_commit: null,
    attempt_count: { authoring: 0, execution: 0 },
    worktree_path: null,
    current_worker_run: null,
    final_receipt_sha256: null,
    merge_commit: null,
    integration_result_sha256: null,
    last_error_code: null,
  };
}

function validateSlice(value: unknown, label: string): void {
  const row = object(value, `slices.${label}`);
  exact(row, [
    "status",
    "packet_revision",
    "packet_sha256",
    "wave_id",
    "base_commit",
    "head_commit",
    "attempt_count",
    "worktree_path",
    "current_worker_run",
    "final_receipt_sha256",
    "merge_commit",
    "integration_result_sha256",
    "last_error_code",
  ]);
  oneOf(row.status, SLICE_STATUSES_V6, `${label}.status`);
  nullablePositiveInteger(row.packet_revision, `${label}.packet_revision`);
  nullableHash(row.packet_sha256, `${label}.packet_sha256`);
  if ((row.packet_revision === null) !== (row.packet_sha256 === null))
    invalid(`${label}.packet_identity_incomplete`);
  nullableText(row.wave_id, `${label}.wave_id`);
  nullableOid(row.base_commit, `${label}.base_commit`);
  nullableOid(row.head_commit, `${label}.head_commit`);
  const attempts = object(row.attempt_count, `${label}.attempt_count`);
  exact(attempts, ["authoring", "execution"]);
  nonnegativeInteger(attempts.authoring, `${label}.authoring_attempts`);
  nonnegativeInteger(attempts.execution, `${label}.execution_attempts`);
  nullableText(row.worktree_path, `${label}.worktree_path`);
  if (row.current_worker_run !== null)
    validateWorkerRun(row.current_worker_run, `${label}.current_worker_run`);
  nullableHash(row.final_receipt_sha256, `${label}.receipt`);
  nullableOid(row.merge_commit, `${label}.merge_commit`);
  nullableHash(row.integration_result_sha256, `${label}.integration_result`);
  nullableText(row.last_error_code, `${label}.last_error_code`);
}

function validateWorkerRun(value: unknown, label: string): void {
  const row = object(value, label);
  if (!Object.hasOwn(row, "process_start_identity"))
    row.process_start_identity = null;
  exact(row, [
    "run_id",
    "kind",
    "attempt",
    "run_generation",
    "pid",
    "process_start_identity",
    "started_at",
    "completed_at",
    "profile",
    "cwd",
    "prompt_sha256",
    "status",
    "exit_code",
  ]);
  text(row.run_id, `${label}.run_id`);
  oneOf(row.kind, ["authoring", "execution", "repair"], `${label}.kind`);
  positiveInteger(row.attempt, `${label}.attempt`);
  positiveInteger(row.run_generation, `${label}.run_generation`);
  if (row.pid !== null) positiveInteger(row.pid, `${label}.pid`);
  nullableText(row.process_start_identity, `${label}.process_start_identity`);
  timestamp(row.started_at, `${label}.started_at`);
  if (row.completed_at !== null)
    timestamp(row.completed_at, `${label}.completed_at`);
  modelProfile(row.profile, `${label}.profile`);
  text(row.cwd, `${label}.cwd`);
  hash(row.prompt_sha256, `${label}.prompt_sha256`);
  oneOf(
    row.status,
    ["starting", "running", "exited", "interrupted"],
    `${label}.status`,
  );
  if (row.exit_code !== null && !Number.isInteger(row.exit_code))
    invalid(`${label}.exit_code`);
  if (row.status === "running" && row.pid === null)
    invalid(`${label}.running_pid_missing`);
  if (
    (row.status === "exited" || row.status === "interrupted") &&
    row.completed_at === null
  )
    invalid(`${label}.completion_time_missing`);
}

function validateWave(
  value: unknown,
  waveId: string,
  slices: Record<string, unknown>,
): void {
  const row = object(value, `waves.${waveId}`);
  exact(row, [
    "base_commit",
    "slice_ids",
    "status",
    "schedule_sha256",
    "integration_result_sha256",
  ]);
  oid(row.base_commit, `${waveId}.base_commit`);
  stringSet(row.slice_ids, `${waveId}.slice_ids`, true);
  for (const sliceId of row.slice_ids as string[])
    if (!Object.hasOwn(slices, sliceId)) invalid(`${waveId}.unknown_slice`);
  oneOf(row.status, WAVE_STATUSES_V6, `${waveId}.status`);
  hash(row.schedule_sha256, `${waveId}.schedule_sha256`);
  nullableHash(
    row.integration_result_sha256,
    `${waveId}.integration_result_sha256`,
  );
}

function validateGraph(value: unknown): void {
  const row = object(value, "graph");
  exact(row, ["graph_revision", "graph_sha256", "slices"]);
  nonnegativeInteger(row.graph_revision, "graph_revision");
  hash(row.graph_sha256, "graph_sha256");
  const slices = object(row.slices, "graph.slices");
  for (const [sliceId, item] of Object.entries(slices)) {
    const slice = object(item, `graph.${sliceId}`);
    exact(slice, ["stable_key", "depends_on", "priority"]);
    text(slice.stable_key, `${sliceId}.stable_key`);
    stringSet(slice.depends_on, `${sliceId}.depends_on`, false);
    nonnegativeInteger(slice.priority, `${sliceId}.priority`);
  }
}

function validateExecutionEngine(value: unknown): void {
  const row = object(value, "execution_engine");
  exact(row, [
    "execution_engine_id",
    "frozen",
    "codex_cli_version",
    "model_routing_policy_id",
    "model_routing_policy_sha256",
    "routing_decision_sha256",
    "routing_reason",
    "fallback_reason",
    "authoring_profile",
    "execution_profile",
    "worker_command_template_version",
    "max_parallelism",
    "process_sandbox_policy",
  ]);
  if (row.execution_engine_id !== EXECUTION_ENGINE_V1)
    invalid("execution_engine_id");
  if (typeof row.frozen !== "boolean") invalid("execution_engine.frozen");
  nullableText(row.codex_cli_version, "codex_cli_version");
  text(row.model_routing_policy_id, "model_routing_policy_id");
  hash(row.model_routing_policy_sha256, "model_routing_policy_sha256");
  nullableHash(row.routing_decision_sha256, "routing_decision_sha256");
  if (row.routing_reason !== null)
    oneOf(row.routing_reason, MODEL_ROUTING_REASONS, "routing_reason");
  if (
    row.fallback_reason !== null &&
    row.fallback_reason !== "target_unavailable_passthrough"
  )
    invalid("fallback_reason");
  if (row.authoring_profile !== null)
    modelProfile(row.authoring_profile, "authoring_profile");
  if (row.execution_profile !== null)
    modelProfile(row.execution_profile, "execution_profile");
  if (row.worker_command_template_version !== WORKER_COMMAND_TEMPLATE_V1)
    invalid("worker_command_template_version");
  const parallel = object(row.max_parallelism, "max_parallelism");
  exact(parallel, ["authoring", "sfc"]);
  integerRange(parallel.authoring, 1, 4, "max_parallel_authoring");
  integerRange(parallel.sfc, 1, 4, "max_parallel_sfc");
  const sandbox = object(row.process_sandbox_policy, "sandbox_policy");
  exact(sandbox, ["authoring", "execution", "repair"]);
  if (
    sandbox.authoring !== "read-only" ||
    sandbox.execution !== "workspace-write" ||
    sandbox.repair !== "workspace-write"
  )
    invalid("sandbox_policy");
  const profileComplete =
    row.authoring_profile !== null && row.execution_profile !== null;
  const routingComplete =
    row.routing_decision_sha256 !== null && row.routing_reason !== null;
  if (row.frozen !== (profileComplete && routingComplete))
    invalid("execution_engine_freeze_incomplete");
  if (row.frozen && row.codex_cli_version === null)
    invalid("execution_engine_cli_version_missing");
}

function validatePolicy(value: unknown): void {
  const row = object(value, "campaign_policy");
  exact(row, [
    "auto_push",
    "protected_branch_mode",
    "preserve_primary_worktree",
    "max_authoring_attempts_per_slice",
    "max_execution_attempts_per_run",
    "max_repair_attempts_per_run",
    "worker_timeout_ms",
    "worker_termination_grace_ms",
  ]);
  if (typeof row.auto_push !== "boolean") invalid("policy.auto_push");
  if (row.protected_branch_mode !== "pull_request")
    invalid("policy.protected_branch_mode");
  if (row.preserve_primary_worktree !== true)
    invalid("policy.preserve_primary_worktree");
  if (row.max_authoring_attempts_per_slice !== 3)
    invalid("policy.authoring_attempts");
  if (row.max_execution_attempts_per_run !== 4)
    invalid("policy.execution_attempts");
  if (row.max_repair_attempts_per_run !== 4) invalid("policy.repair_attempts");
  integerRange(row.worker_timeout_ms, 1_000, 86_400_000, "worker_timeout_ms");
  integerRange(
    row.worker_termination_grace_ms,
    100,
    60_000,
    "worker_termination_grace_ms",
  );
}

function validateRepair(value: unknown, slices: Record<string, unknown>): void {
  const row = object(value, "repair");
  exact(row, [
    "status",
    "kind",
    "attempt_count",
    "worktree_path",
    "base_commit",
    "head_commit",
    "affected_slice_ids",
    "manifest_path",
    "manifest_sha256",
    "current_worker_run",
    "last_error_code",
  ]);
  oneOf(
    row.status,
    ["idle", "running", "needs_work", "blocked", "interrupted"],
    "repair.status",
  );
  if (row.kind !== null)
    oneOf(
      row.kind,
      ["merge_conflict", "integration_regression", "campaign_final_regression"],
      "repair.kind",
    );
  nonnegativeInteger(row.attempt_count, "repair.attempt_count");
  text(row.worktree_path, "repair.worktree_path");
  nullableOid(row.base_commit, "repair.base_commit");
  nullableOid(row.head_commit, "repair.head_commit");
  stringSet(row.affected_slice_ids, "repair.affected_slice_ids", false);
  for (const sliceId of row.affected_slice_ids as string[])
    if (!Object.hasOwn(slices, sliceId)) invalid("repair.unknown_slice");
  nullableText(row.manifest_path, "repair.manifest_path");
  nullableHash(row.manifest_sha256, "repair.manifest_sha256");
  if ((row.manifest_path === null) !== (row.manifest_sha256 === null))
    invalid("repair.manifest_identity_incomplete");
  if (row.current_worker_run !== null)
    validateWorkerRun(row.current_worker_run, "repair.current_worker_run");
  nullableText(row.last_error_code, "repair.last_error_code");
}

function validateContextBaseline(value: unknown): void {
  const row = object(value, "context_baseline");
  exact(row, ["graph_sha256", "files", "baseline_sha256"]);
  hash(row.graph_sha256, "context.graph_sha256");
  hash(row.baseline_sha256, "context.baseline_sha256");
  const files = object(row.files, "context.files");
  if (Object.keys(files).length < 3) invalid("context.files_too_small");
  for (const digest of Object.values(files)) hash(digest, "context.file_hash");
}

function validateFinalization(value: unknown): void {
  if (value === null) return;
  const row = object(value, "finalization");
  exact(row, [
    "target_commit",
    "target_receipt_sha256",
    "accepted_at",
    "cleanup_status",
    "cleanup_error_code",
  ]);
  oid(row.target_commit, "finalization.target_commit");
  hash(row.target_receipt_sha256, "finalization.receipt");
  timestamp(row.accepted_at, "finalization.accepted_at");
  oneOf(row.cleanup_status, ["pending", "complete"], "cleanup_status");
  nullableText(row.cleanup_error_code, "cleanup_error_code");
}

function modelProfile(value: unknown, label: string): void {
  const row = object(value, label);
  exact(row, ["model", "effort"]);
  text(row.model, `${label}.model`);
  text(row.effort, `${label}.effort`);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${label}_not_object`);
  return value as Record<string, unknown>;
}
function exact(row: Record<string, unknown>, keys: string[]): void {
  for (const key of keys)
    if (!Object.hasOwn(row, key)) invalid(`missing_field:${key}`);
  for (const key of Object.keys(row))
    if (!keys.includes(key)) invalid(`unknown_field:${key}`);
}
function text(value: unknown, label: string): void {
  if (typeof value !== "string" || !value.trim()) invalid(`${label}_empty`);
}
function nullableText(value: unknown, label: string): void {
  if (value !== null) text(value, label);
}
function hash(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    invalid(`${label}_invalid`);
}
function nullableHash(value: unknown, label: string): void {
  if (value !== null) hash(value, label);
}
function oid(value: unknown, label: string): void {
  if (
    typeof value !== "string" ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
  )
    invalid(`${label}_invalid`);
}
function nullableOid(value: unknown, label: string): void {
  if (value !== null) oid(value, label);
}
function timestamp(value: unknown, label: string): void {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    invalid(`${label}_invalid`);
}
function positiveInteger(value: unknown, label: string): void {
  integerRange(value, 1, Number.MAX_SAFE_INTEGER, label);
}
function nullablePositiveInteger(value: unknown, label: string): void {
  if (value !== null) positiveInteger(value, label);
}
function nonnegativeInteger(value: unknown, label: string): void {
  integerRange(value, 0, Number.MAX_SAFE_INTEGER, label);
}
function integerRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  )
    invalid(`${label}_invalid`);
}
function stringSet(value: unknown, label: string, nonempty: boolean): void {
  if (
    !Array.isArray(value) ||
    (nonempty && value.length === 0) ||
    value.some((item) => typeof item !== "string" || !item.trim()) ||
    new Set(value).size !== value.length
  )
    invalid(`${label}_invalid`);
}
function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): void {
  if (typeof value !== "string" || !allowed.includes(value as T))
    invalid(`${label}_unsupported`);
}
function invalid(reason: string): never {
  throw new Error(`composite_campaign_v6_invalid:${reason}`);
}
