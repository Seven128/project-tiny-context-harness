import {
  canonicalValueJson,
  parseStrictYaml,
  sha256Hex,
} from "./composite-campaign-codec.js";
import {
  assertCampaignV4,
  CAMPAIGN_SCHEMA_V4,
  type CampaignSliceV4,
  type CampaignV4,
} from "./composite-campaign-schema-v4.js";
import type { ModelProfile, ModelRoutingReason } from "./codex-model-router.js";
import type { CampaignContextBaseline } from "./context-graph-snapshot.js";

export const CAMPAIGN_SCHEMA_V5 = "composite-campaign-v5" as const;
export const THREAD_PHASES_V5 = [
  "thread_pending",
  "authoring",
  "packet_validation",
  "worktree_ready",
  "goal_active",
  "executing",
  "accepted",
  "failed",
  "interrupted",
] as const;
export type ThreadPhaseV5 = (typeof THREAD_PHASES_V5)[number];
export type ThreadTurnStatusV5 =
  | "idle"
  | "inProgress"
  | "completed"
  | "interrupted"
  | "failed"
  | "system_error";
export interface TurnObservationV5 {
  turn_id: string;
  kind: "authoring" | "execution";
  status: "running" | "completed" | "failed" | "interrupted" | "unknown";
  observed_at: string;
  reconciliation_required: boolean;
}

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
  routing_freeze: {
    policy_id: string;
    policy_sha256: string;
    catalog_sha256: string;
    routing_decision: {
      authoring_profile: ModelProfile;
      execution_profile: ModelProfile;
      switched: boolean;
      reason: ModelRoutingReason;
    };
    decision_sha256: string;
  } | null;
  authoring_turn_ids: string[];
  goal: ThreadGoalStateV5;
  execution_turn_ids: string[];
  turn_observations: Record<string, TurnObservationV5>;
  active_turn_id: string | null;
  last_turn_status: ThreadTurnStatusV5;
  launch_token: string | null;
  last_error_code: string | null;
}

export interface CampaignSliceV5 extends CampaignSliceV4 {
  thread: CampaignThreadStateV5;
}
export interface CampaignRepairThreadV5 {
  wave_id: string;
  repair_id: string;
  thread: CampaignThreadStateV5;
}
export interface CampaignPolicyV5 {
  auto_push: boolean;
  protected_branch_mode: "pull_request";
  preserve_primary_worktree: true;
}

export interface CampaignFinalizationV1 {
  target_commit: string;
  target_receipt_sha256: string;
  accepted_at: string;
  cleanup_status: "pending" | "complete";
  cleanup_error_code: string | null;
}

export interface CampaignV5 extends Omit<
  CampaignV4,
  "schema_version" | "slices"
> {
  schema_version: typeof CAMPAIGN_SCHEMA_V5;
  context_baseline: CampaignContextBaseline;
  campaign_policy: CampaignPolicyV5;
  execution_host: CampaignExecutionHostV5;
  slices: Record<string, CampaignSliceV5>;
  repair_threads: Record<string, CampaignRepairThreadV5>;
  finalization: CampaignFinalizationV1 | null;
}

export function parseCampaignV5(content: string): CampaignV5 {
  return assertCampaignV5(parseStrictYaml(content));
}

export function assertCampaignV5(value: unknown): CampaignV5 {
  const parsed = record(value, "campaign");
  const root = Object.hasOwn(parsed, "finalization")
    ? parsed
    : { ...parsed, finalization: null };
  if (root.schema_version !== CAMPAIGN_SCHEMA_V5)
    invalid(`expected_${CAMPAIGN_SCHEMA_V5}`);
  const expected = [
    "schema_version",
    "campaign_id",
    "source_plan_sha256",
    "source_kind",
    "created_at",
    "target_branch",
    "base_commit",
    "integration_branch",
    "integration_head",
    "graph",
    "slices",
    "waves",
    "generation",
    "campaign_status",
    "context_baseline",
    "campaign_policy",
    "execution_host",
    "repair_threads",
    "finalization",
  ];
  exact(root, expected);
  const slices = record(root.slices, "slices");
  const projectedSlices: Record<string, unknown> = {};
  for (const [sliceId, value] of Object.entries(slices)) {
    const slice = record(value, `slices.${sliceId}`);
    exact(slice, [
      "status",
      "packet_revision",
      "packet_sha256",
      "wave_id",
      "branch",
      "worktree",
      "goal_id",
      "base_commit",
      "head_commit",
      "final_receipt_sha256",
      "merge_commit",
      "thread",
    ]);
    assertThreadStateV5(slice.thread, `${sliceId}.thread`);
    const { thread: _thread, ...legacy } = slice;
    projectedSlices[sliceId] = legacy;
  }
  const {
    context_baseline: _context,
    campaign_policy: _policy,
    execution_host: _host,
    repair_threads: _repairs,
    finalization: _finalization,
    ...base
  } = root;
  assertCampaignV4({
    ...base,
    schema_version: CAMPAIGN_SCHEMA_V4,
    slices: projectedSlices,
  });
  assertContextBaseline(root.context_baseline);
  assertCampaignPolicy(root.campaign_policy);
  assertExecutionHost(root.execution_host);
  assertCampaignFinalization(root.finalization);
  const repairs = record(root.repair_threads, "repair_threads");
  for (const [repairId, value] of Object.entries(repairs)) {
    const repair = record(value, `repair_threads.${repairId}`);
    exact(repair, ["wave_id", "repair_id", "thread"]);
    if (repair.repair_id !== repairId || typeof repair.wave_id !== "string")
      invalid(`repair_identity:${repairId}`);
    assertThreadStateV5(repair.thread, `${repairId}.thread`);
  }
  return root as unknown as CampaignV5;
}

export function emptyThreadStateV5(): CampaignThreadStateV5 {
  return {
    thread_id: null,
    session_id: null,
    phase: "thread_pending",
    authoring_profile: null,
    execution_profile: null,
    routing_reason: null,
    routing_freeze: null,
    authoring_turn_ids: [],
    goal: { status: "not_set", objective_sha256: null },
    execution_turn_ids: [],
    turn_observations: {},
    active_turn_id: null,
    last_turn_status: "idle",
    launch_token: null,
    last_error_code: null,
  };
}

export function emptyExecutionHostV5(): CampaignExecutionHostV5 {
  return {
    kind: "codex_app_server",
    controller_thread_id: null,
    controller_profile: { model: null, effort: null, source: "unknown" },
    model_catalog_sha256: null,
    app_server_version: null,
    status: "disconnected",
    restart_count: 0,
    last_error_code: null,
  };
}

export function campaignHasGoalV5(campaign: CampaignV5): boolean {
  return Object.values(campaign.slices).some(
    (slice) => slice.thread.goal.status !== "not_set",
  );
}

export function assertThreadStateV5(
  value: unknown,
  label = "thread",
): CampaignThreadStateV5 {
  const row = record(value, label);
  exact(row, [
    "thread_id",
    "session_id",
    "phase",
    "authoring_profile",
    "execution_profile",
    "routing_reason",
    "routing_freeze",
    "authoring_turn_ids",
    "goal",
    "execution_turn_ids",
    "turn_observations",
    "active_turn_id",
    "last_turn_status",
    "launch_token",
    "last_error_code",
  ]);
  nullableText(row.thread_id, `${label}.thread_id`);
  nullableText(row.session_id, `${label}.session_id`);
  oneOf(row.phase, THREAD_PHASES_V5, `${label}.phase`);
  validateThreadRouting(row, label);
  const observations = validateTurnObservations(row, label);
  const goal = validateThreadGoal(row, label);
  validateThreadInvariants(row, goal, observations, label);
  return row as unknown as CampaignThreadStateV5;
}

function validateThreadRouting(
  row: Record<string, unknown>,
  label: string,
): void {
  if (row.authoring_profile !== null)
    modelProfile(row.authoring_profile, `${label}.authoring_profile`);
  if (row.execution_profile !== null)
    modelProfile(row.execution_profile, `${label}.execution_profile`);
  if (row.routing_reason !== null)
    oneOf(
      row.routing_reason,
      [
        "sol_xhigh_to_medium",
        "sol_max_to_medium",
        "catalog_upgrade_to_sol_medium",
        "below_threshold_passthrough",
        "unknown_profile_passthrough",
        "target_unavailable_passthrough",
      ],
      `${label}.routing_reason`,
    );
  if (row.routing_freeze !== null) {
    const freeze = record(row.routing_freeze, `${label}.routing_freeze`);
    exact(freeze, [
      "policy_id",
      "policy_sha256",
      "catalog_sha256",
      "routing_decision",
      "decision_sha256",
    ]);
    text(freeze.policy_id, `${label}.routing_freeze.policy_id`);
    for (const key of [
      "policy_sha256",
      "catalog_sha256",
      "decision_sha256",
    ] as const)
      nullableHash(freeze[key], `${label}.routing_freeze.${key}`);
    validateFrozenRoutingDecision(row, freeze, label);
  }
  if ((row.routing_reason === null) !== (row.routing_freeze === null))
    invalid(`${label}:routing_freeze_mismatch`);
}

function validateFrozenRoutingDecision(
  thread: Record<string, unknown>,
  freeze: Record<string, unknown>,
  label: string,
): void {
  const decision = record(
    freeze.routing_decision,
    `${label}.routing_freeze.routing_decision`,
  );
  exact(decision, [
    "authoring_profile",
    "execution_profile",
    "switched",
    "reason",
  ]);
  modelProfile(
    decision.authoring_profile,
    `${label}.routing_freeze.routing_decision.authoring_profile`,
  );
  modelProfile(
    decision.execution_profile,
    `${label}.routing_freeze.routing_decision.execution_profile`,
  );
  if (typeof decision.switched !== "boolean")
    invalid(`${label}:routing_decision_switched_invalid`);
  oneOf(
    decision.reason,
    [
      "sol_xhigh_to_medium",
      "sol_max_to_medium",
      "catalog_upgrade_to_sol_medium",
      "below_threshold_passthrough",
      "unknown_profile_passthrough",
      "target_unavailable_passthrough",
    ],
    `${label}.routing_freeze.routing_decision.reason`,
  );
  if (
    canonicalValueJson(decision.authoring_profile) !==
      canonicalValueJson(thread.authoring_profile) ||
    canonicalValueJson(decision.execution_profile) !==
      canonicalValueJson(thread.execution_profile) ||
    decision.reason !== thread.routing_reason
  )
    invalid(`${label}:routing_decision_thread_mismatch`);
  const authoring = decision.authoring_profile as ModelProfile;
  const execution = decision.execution_profile as ModelProfile;
  const switched =
    authoring.model !== execution.model ||
    authoring.effort !== execution.effort;
  if (decision.switched !== switched)
    invalid(`${label}:routing_decision_switched_mismatch`);
  const identity = {
    ...decision,
    policy_id: freeze.policy_id,
    policy_sha256: freeze.policy_sha256,
    catalog_sha256: freeze.catalog_sha256,
  };
  if (freeze.decision_sha256 !== sha256Hex(canonicalValueJson(identity)))
    invalid(`${label}:routing_decision_hash_mismatch`);
}

function validateTurnObservations(
  row: Record<string, unknown>,
  label: string,
): Record<string, unknown> {
  stringList(row.authoring_turn_ids, `${label}.authoring_turn_ids`);
  stringList(row.execution_turn_ids, `${label}.execution_turn_ids`);
  const observations = record(
    row.turn_observations,
    `${label}.turn_observations`,
  );
  for (const [turnId, value] of Object.entries(observations)) {
    const observation = record(value, `${label}.turn_observations.${turnId}`);
    exact(observation, [
      "turn_id",
      "kind",
      "status",
      "observed_at",
      "reconciliation_required",
    ]);
    if (observation.turn_id !== turnId)
      invalid(`${label}:turn_observation_identity`);
    oneOf(
      observation.kind,
      ["authoring", "execution"],
      `${label}.turn_observation.kind`,
    );
    oneOf(
      observation.status,
      ["running", "completed", "failed", "interrupted", "unknown"],
      `${label}.turn_observation.status`,
    );
    if (typeof observation.reconciliation_required !== "boolean")
      invalid(`${label}:turn_observation.reconciliation_required`);
    if (
      typeof observation.observed_at !== "string" ||
      !Number.isFinite(Date.parse(observation.observed_at as string))
    )
      invalid(`${label}:turn_observation.time`);
  }
  return observations;
}

function validateThreadGoal(
  row: Record<string, unknown>,
  label: string,
): Record<string, unknown> {
  const goal = record(row.goal, `${label}.goal`);
  exact(goal, ["status", "objective_sha256"]);
  oneOf(
    goal.status,
    ["not_set", "active", "complete", "blocked"],
    `${label}.goal.status`,
  );
  nullableHash(goal.objective_sha256, `${label}.goal.objective_sha256`);
  nullableText(row.active_turn_id, `${label}.active_turn_id`);
  oneOf(
    row.last_turn_status,
    [
      "idle",
      "inProgress",
      "completed",
      "interrupted",
      "failed",
      "system_error",
    ],
    `${label}.last_turn_status`,
  );
  nullableText(row.launch_token, `${label}.launch_token`);
  nullableText(row.last_error_code, `${label}.last_error_code`);
  return goal;
}

function validateThreadInvariants(
  row: Record<string, unknown>,
  goal: Record<string, unknown>,
  observations: Record<string, unknown>,
  label: string,
): void {
  if (
    row.thread_id === null &&
    ((row.authoring_turn_ids as string[]).length ||
      (row.execution_turn_ids as string[]).length ||
      goal.status !== "not_set")
  )
    invalid(`${label}:identity_missing`);
  if ((row.thread_id === null) !== (row.session_id === null))
    invalid(`${label}:session_identity_incomplete`);
  if ((goal.status === "not_set") !== (goal.objective_sha256 === null))
    invalid(`${label}:goal_objective_state_mismatch`);
  if (
    ["goal_active", "executing", "accepted"].includes(row.phase as string) &&
    goal.status === "not_set"
  )
    invalid(`${label}:goal_phase_without_goal`);
  if (row.phase === "accepted" && goal.status !== "complete")
    invalid(`${label}:accepted_goal_incomplete`);
  const turns = new Set([
    ...(row.authoring_turn_ids as string[]),
    ...(row.execution_turn_ids as string[]),
  ]);
  if (row.active_turn_id !== null && !turns.has(row.active_turn_id as string))
    invalid(`${label}:active_turn_untracked`);
  for (const turnId of turns)
    if (!Object.hasOwn(observations, turnId))
      invalid(`${label}:turn_observation_missing:${turnId}`);
  for (const turnId of Object.keys(observations))
    if (!turns.has(turnId))
      invalid(`${label}:turn_observation_untracked:${turnId}`);
  if ((row.last_turn_status === "inProgress") !== (row.active_turn_id !== null))
    invalid(`${label}:active_turn_status_mismatch`);
}

function assertExecutionHost(value: unknown): void {
  const row = record(value, "execution_host");
  exact(row, [
    "kind",
    "controller_thread_id",
    "controller_profile",
    "model_catalog_sha256",
    "app_server_version",
    "status",
    "restart_count",
    "last_error_code",
  ]);
  if (row.kind !== "codex_app_server") invalid("execution_host.kind");
  nullableText(row.controller_thread_id, "controller_thread_id");
  const profile = record(row.controller_profile, "controller_profile");
  exact(profile, ["model", "effort", "source"]);
  nullableText(profile.model, "controller.model");
  nullableText(profile.effort, "controller.effort");
  oneOf(
    profile.source,
    ["controller_thread", "host_explicit", "unknown"],
    "controller.source",
  );
  if (
    profile.source !== "unknown" &&
    (profile.model === null || profile.effort === null)
  )
    invalid("controller_profile_incomplete");
  if (
    profile.source === "unknown" &&
    (profile.model !== null || profile.effort !== null)
  )
    invalid("unknown_controller_profile_must_be_null");
  if (
    profile.source === "controller_thread" &&
    row.controller_thread_id === null
  )
    invalid("controller_thread_id_missing");
  nullableHash(row.model_catalog_sha256, "model_catalog_sha256");
  nullableText(row.app_server_version, "app_server_version");
  oneOf(
    row.status,
    ["disconnected", "connected", "reconnecting", "wait_external"],
    "execution_host.status",
  );
  if (
    row.status === "connected" &&
    (row.model_catalog_sha256 === null || row.app_server_version === null)
  )
    invalid("connected_host_identity_incomplete");
  if (row.restart_count !== 0 && row.restart_count !== 1)
    invalid("restart_count");
  nullableText(row.last_error_code, "last_error_code");
}
function assertCampaignPolicy(value: unknown): void {
  const row = record(value, "campaign_policy");
  exact(row, [
    "auto_push",
    "protected_branch_mode",
    "preserve_primary_worktree",
  ]);
  if (typeof row.auto_push !== "boolean") invalid("campaign_policy.auto_push");
  if (row.protected_branch_mode !== "pull_request")
    invalid("campaign_policy.protected_branch_mode");
  if (row.preserve_primary_worktree !== true)
    invalid("campaign_policy.preserve_primary_worktree");
}
function assertCampaignFinalization(value: unknown): void {
  if (value === null) return;
  const row = record(value, "finalization");
  exact(row, [
    "target_commit",
    "target_receipt_sha256",
    "accepted_at",
    "cleanup_status",
    "cleanup_error_code",
  ]);
  if (
    typeof row.target_commit !== "string" ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(row.target_commit)
  )
    invalid("finalization.target_commit_invalid");
  hash(row.target_receipt_sha256, "finalization.target_receipt_sha256");
  if (
    typeof row.accepted_at !== "string" ||
    !Number.isFinite(Date.parse(row.accepted_at))
  )
    invalid("finalization.accepted_at_invalid");
  oneOf(
    row.cleanup_status,
    ["pending", "complete"] as const,
    "finalization.cleanup_status",
  );
  if (
    row.cleanup_error_code !== null &&
    (typeof row.cleanup_error_code !== "string" ||
      !/^[a-z0-9_]{1,64}$/u.test(row.cleanup_error_code))
  )
    invalid("finalization.cleanup_error_code_invalid");
  if (row.cleanup_status === "complete" && row.cleanup_error_code !== null)
    invalid("finalization.complete_with_error");
}
function assertContextBaseline(value: unknown): void {
  const row = record(value, "context_baseline");
  exact(row, ["graph_sha256", "files", "baseline_sha256"]);
  hash(row.graph_sha256, "graph_sha256");
  hash(row.baseline_sha256, "baseline_sha256");
  const files = record(row.files, "context_baseline.files");
  if (Object.keys(files).length < 3) invalid("context_files_invalid");
  for (const [file, digest] of Object.entries(files)) {
    if (
      !/^project_context\/(?!.*(?:^|\/)\.\.(?:\/|$))[^\\]+\.(?:md|toml)$/u.test(
        file,
      )
    )
      invalid(`context_file_path_invalid:${file}`);
    hash(digest, `context_file_sha256:${file}`);
  }
}
function modelProfile(value: unknown, label: string): void {
  const row = record(value, label);
  exact(row, ["model", "effort"]);
  text(row.model, `${label}.model`);
  text(row.effort, `${label}.effort`);
}
function record(value: unknown, label: string): Record<string, unknown> {
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
function nullableHash(value: unknown, label: string): void {
  if (
    value !== null &&
    (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
  )
    invalid(`${label}_invalid`);
}
function hash(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    invalid(`${label}_invalid`);
}
function stringList(value: unknown, label: string): void {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item) ||
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
  throw new Error(`composite_campaign_v5_invalid:${reason}`);
}
