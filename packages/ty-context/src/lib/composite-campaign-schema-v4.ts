import { parseStrictJson } from "./composite-campaign-codec.js";

export const SCOPE_FIT_SCHEMA_V3 = "scope-fit-result-v3" as const;
export const CAMPAIGN_SCHEMA_V4 = "composite-campaign-v4" as const;
export const SLICE_STATUSES_V4 = [
  "planned",
  "packet_pending",
  "packet_ready",
  "scheduled",
  "worktree_ready",
  "goal_running",
  "accepted",
  "merge_pending",
  "merged",
  "integration_verified",
  "decision_blocked",
  "externally_blocked",
] as const;
export const CAMPAIGN_STATUSES_V4 = [
  "planning",
  "authoring",
  "executing",
  "integrating",
  "finalizing",
  "accepted",
  "decision_blocked",
  "externally_blocked",
] as const;
export const CAMPAIGN_WAVE_STATUSES_V4 = [
  "scheduled",
  "running",
  "accepted",
  "merged",
  "integration_verified",
  "repair_required",
  "decision_blocked",
  "externally_blocked",
] as const;

export type SliceStatusV4 = (typeof SLICE_STATUSES_V4)[number];
export type CampaignStatusV4 = (typeof CAMPAIGN_STATUSES_V4)[number];
export type CampaignWaveStatusV4 = (typeof CAMPAIGN_WAVE_STATUSES_V4)[number];
export type ScopeFitDecisionV3 =
  | "fit_for_three_inputs"
  | "split_required"
  | "blocked_for_decision"
  | "not_long_task";

export interface GlobalConstraintV3 {
  constraint_id: string;
  statement: string;
  applies_to: string[];
}

export interface ScopeDecisionRequiredV3 {
  decision_id: string;
  question: string;
  candidates: string[];
}

export interface ScopeSliceV3 {
  slice_id: string;
  stable_key: string;
  title: string;
  objective: string;
  depends_on: string[];
  priority: number;
  source_refs: string[];
  scope_summary: string[];
  out_of_scope: string[];
  produces_contracts: string[];
  consumes_contracts: string[];
  conflict_domains: string[];
  resource_locks: string[];
}

export interface ScopeFitResultV3 {
  schema_version: typeof SCOPE_FIT_SCHEMA_V3;
  request_sha256: string;
  decision: ScopeFitDecisionV3;
  campaign_goal: string;
  rationale?: string[];
  global_constraints: GlobalConstraintV3[];
  slices: ScopeSliceV3[];
  decision_required?: ScopeDecisionRequiredV3 | null;
}

export interface CampaignGraphSliceV4 {
  stable_key: string;
  depends_on: string[];
  priority: number;
}

export interface CampaignGraphV4 {
  graph_revision: number;
  graph_sha256: string;
  slices: Record<string, CampaignGraphSliceV4>;
}

export interface CampaignSliceV4 {
  status: SliceStatusV4;
  packet_revision: number | null;
  packet_sha256: string | null;
  wave_id: string | null;
  branch: string | null;
  worktree: string | null;
  goal_id: string | null;
  base_commit: string | null;
  head_commit: string | null;
  final_receipt_sha256: string | null;
  merge_commit: string | null;
}

export interface CampaignWaveV4 {
  base_commit: string;
  slice_ids: string[];
  status: CampaignWaveStatusV4;
  schedule_sha256: string;
  integration_result_sha256: string | null;
}

export interface CampaignV4 {
  schema_version: typeof CAMPAIGN_SCHEMA_V4;
  campaign_id: string;
  source_plan_sha256: string;
  source_kind: "discussed_plan";
  created_at: string;
  target_branch: string;
  base_commit: string | null;
  integration_branch: string;
  integration_head: string | null;
  graph: CampaignGraphV4;
  slices: Record<string, CampaignSliceV4>;
  waves: Record<string, CampaignWaveV4>;
  generation: number;
  campaign_status: CampaignStatusV4;
}

export function parseScopeFitResultV3(content: string): ScopeFitResultV3 {
  return assertScopeFitResultV3(parseStrictJson(content));
}

export function assertScopeFitResultV3(value: unknown): ScopeFitResultV3 {
  const root = object(value, "scope-fit-result-v3");
  if (root.schema_version !== SCOPE_FIT_SCHEMA_V3)
    fail(
      `Legacy Scope Fit results are not supported; expected ${SCOPE_FIT_SCHEMA_V3}`,
    );
  keys(
    root,
    [
      "schema_version",
      "request_sha256",
      "decision",
      "campaign_goal",
      "global_constraints",
      "slices",
    ],
    ["rationale", "decision_required"],
  );
  hash(root.request_sha256, "request_sha256");
  oneOf(
    root.decision,
    [
      "fit_for_three_inputs",
      "split_required",
      "blocked_for_decision",
      "not_long_task",
    ],
    "scope decision",
  );
  text(root.campaign_goal, "campaign_goal");
  if (root.rationale !== undefined) strings(root.rationale, "rationale");
  array(root.global_constraints, "global_constraints").forEach((item, index) =>
    constraint(item, index),
  );
  array(root.slices, "slices").forEach((item, index) =>
    scopeSlice(item, index),
  );
  if (root.decision_required !== undefined && root.decision_required !== null)
    decision(root.decision_required);
  const result = root as unknown as ScopeFitResultV3;
  if (result.decision === "fit_for_three_inputs" && result.slices.length !== 1)
    fail("fit_for_three_inputs requires exactly one slice");
  if (result.decision === "split_required" && result.slices.length < 2)
    fail("split_required requires at least two slices");
  if (
    result.decision === "not_long_task" &&
    (result.slices.length || result.global_constraints.length)
  )
    fail("not_long_task cannot declare slices or global constraints");
  if (result.decision === "blocked_for_decision" && !result.decision_required)
    fail("blocked_for_decision requires decision_required");
  if (result.decision !== "blocked_for_decision" && result.decision_required)
    fail(`${result.decision} cannot declare decision_required`);
  return result;
}

export function assertCampaignV4(value: unknown): CampaignV4 {
  const root = object(value, "composite-campaign-v4");
  if (root.schema_version !== CAMPAIGN_SCHEMA_V4)
    fail(
      `Legacy Campaign state is not supported; expected ${CAMPAIGN_SCHEMA_V4}`,
    );
  keys(root, [
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
  ]);
  id(root.campaign_id, "campaign_id");
  hash(root.source_plan_sha256, "source_plan_sha256");
  equal(root.source_kind, "discussed_plan", "source_kind");
  text(root.created_at, "created_at");
  if (Number.isNaN(Date.parse(root.created_at as string)))
    fail("created_at must be an ISO date-time");
  text(root.target_branch, "target_branch");
  nullableGitOid(root.base_commit, "base_commit");
  text(root.integration_branch, "integration_branch");
  nullableGitOid(root.integration_head, "integration_head");
  integer(root.generation, "generation", 1);
  oneOf(root.campaign_status, CAMPAIGN_STATUSES_V4, "campaign_status");
  const graph = object(root.graph, "graph");
  keys(graph, ["graph_revision", "graph_sha256", "slices"]);
  integer(graph.graph_revision, "graph_revision", 0);
  hash(graph.graph_sha256, "graph_sha256");
  const graphSlices = record(graph.slices, "graph.slices");
  for (const [sliceId, item] of Object.entries(graphSlices))
    graphSlice(sliceId, item);
  assertCampaignGraph(graphSlices);
  const slices = record(root.slices, "slices");
  for (const [sliceId, item] of Object.entries(slices))
    campaignSlice(sliceId, item);
  if (
    JSON.stringify(Object.keys(graphSlices).sort()) !==
    JSON.stringify(Object.keys(slices).sort())
  )
    fail("graph and runtime slice ids must match");
  const waves = record(root.waves, "waves");
  for (const [waveId, item] of Object.entries(waves))
    campaignWave(waveId, item, new Set(Object.keys(slices)));
  return root as unknown as CampaignV4;
}

function constraint(value: unknown, index: number): void {
  const row = object(value, `global_constraints[${index}]`);
  keys(row, ["constraint_id", "statement", "applies_to"]);
  prefixed(
    row.constraint_id,
    "GC",
    `global_constraints[${index}].constraint_id`,
  );
  text(row.statement, `global_constraints[${index}].statement`);
  uniqueIds(
    row.applies_to,
    "SFC",
    `global_constraints[${index}].applies_to`,
    true,
  );
}
function decision(value: unknown): void {
  const row = object(value, "decision_required");
  keys(row, ["decision_id", "question", "candidates"]);
  id(row.decision_id, "decision_required.decision_id");
  text(row.question, "decision_required.question");
  uniqueIds(row.candidates, "SFC", "decision_required.candidates", true);
}
function scopeSlice(value: unknown, index: number): void {
  const row = object(value, `slices[${index}]`);
  keys(row, [
    "slice_id",
    "stable_key",
    "title",
    "objective",
    "depends_on",
    "priority",
    "source_refs",
    "scope_summary",
    "out_of_scope",
    "produces_contracts",
    "consumes_contracts",
    "conflict_domains",
    "resource_locks",
  ]);
  prefixed(row.slice_id, "SFC", `slices[${index}].slice_id`);
  stable(row.stable_key, `slices[${index}].stable_key`);
  text(row.title, `slices[${index}].title`);
  text(row.objective, `slices[${index}].objective`);
  uniqueIds(row.depends_on, "SFC", `slices[${index}].depends_on`);
  integer(row.priority, `slices[${index}].priority`, 0);
  uniqueIds(row.source_refs, "SRC", `slices[${index}].source_refs`, true);
  strings(row.scope_summary, `slices[${index}].scope_summary`);
  strings(row.out_of_scope, `slices[${index}].out_of_scope`);
  tokens(row.produces_contracts, `slices[${index}].produces_contracts`);
  tokens(row.consumes_contracts, `slices[${index}].consumes_contracts`);
  tokens(row.conflict_domains, `slices[${index}].conflict_domains`);
  tokens(row.resource_locks, `slices[${index}].resource_locks`);
}
function graphSlice(sliceId: string, value: unknown): void {
  prefixed(sliceId, "SFC", "graph slice id");
  const row = object(value, `graph.slices.${sliceId}`);
  keys(row, ["stable_key", "depends_on", "priority"]);
  stable(row.stable_key, `${sliceId}.stable_key`);
  uniqueIds(row.depends_on, "SFC", `${sliceId}.depends_on`);
  integer(row.priority, `${sliceId}.priority`, 0);
}
function campaignSlice(sliceId: string, value: unknown): void {
  prefixed(sliceId, "SFC", "runtime slice id");
  const row = object(value, `slices.${sliceId}`);
  keys(row, [
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
  ]);
  oneOf(row.status, SLICE_STATUSES_V4, `${sliceId}.status`);
  nullableInteger(row.packet_revision, `${sliceId}.packet_revision`);
  nullableHash(row.packet_sha256, `${sliceId}.packet_sha256`);
  nullableText(row.wave_id, `${sliceId}.wave_id`);
  nullableText(row.branch, `${sliceId}.branch`);
  nullableText(row.worktree, `${sliceId}.worktree`);
  nullableText(row.goal_id, `${sliceId}.goal_id`);
  nullableGitOid(row.base_commit, `${sliceId}.base_commit`);
  nullableGitOid(row.head_commit, `${sliceId}.head_commit`);
  nullableHash(row.final_receipt_sha256, `${sliceId}.final_receipt_sha256`);
  nullableGitOid(row.merge_commit, `${sliceId}.merge_commit`);
}
function campaignWave(
  waveId: string,
  value: unknown,
  slices: Set<string>,
): void {
  id(waveId, "wave id");
  const row = object(value, `waves.${waveId}`);
  keys(row, [
    "base_commit",
    "slice_ids",
    "status",
    "schedule_sha256",
    "integration_result_sha256",
  ]);
  gitOid(row.base_commit, `${waveId}.base_commit`);
  const ids = uniqueIds(row.slice_ids, "SFC", `${waveId}.slice_ids`, true);
  for (const sliceId of ids)
    if (!slices.has(sliceId))
      fail(`${waveId} references unknown slice ${sliceId}`);
  oneOf(row.status, CAMPAIGN_WAVE_STATUSES_V4, `${waveId}.status`);
  hash(row.schedule_sha256, `${waveId}.schedule_sha256`);
  nullableHash(
    row.integration_result_sha256,
    `${waveId}.integration_result_sha256`,
  );
}
function assertCampaignGraph(values: Record<string, unknown>): void {
  const keysByStable = new Set<string>();
  const remaining = new Map<string, Set<string>>();
  for (const [sliceId, value] of Object.entries(values)) {
    const row = value as CampaignGraphSliceV4;
    if (keysByStable.has(row.stable_key))
      fail(`duplicate graph stable_key ${row.stable_key}`);
    keysByStable.add(row.stable_key);
    for (const dependency of row.depends_on)
      if (!Object.hasOwn(values, dependency))
        fail(`${sliceId} references unknown dependency ${dependency}`);
    remaining.set(sliceId, new Set(row.depends_on));
  }
  while (remaining.size) {
    const ready = [...remaining]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([sliceId]) => sliceId);
    if (!ready.length) fail("graph contains a dependency cycle");
    for (const sliceId of ready) remaining.delete(sliceId);
    for (const dependencies of remaining.values())
      for (const sliceId of ready) dependencies.delete(sliceId);
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function record(value: unknown, label: string): Record<string, unknown> {
  return object(value, label);
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}
function keys(
  value: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
): void {
  for (const key of required)
    if (!Object.hasOwn(value, key)) fail(`missing required field ${key}`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value))
    if (!allowed.has(key)) fail(`unknown field ${key}`);
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    fail(`${label} must be a non-empty string`);
}
function nullableText(value: unknown, label: string): void {
  if (value !== null) text(value, label);
}
function strings(value: unknown, label: string): string[] {
  const rows = array(value, label);
  for (const item of rows) text(item, label);
  return rows as string[];
}
function tokens(value: unknown, label: string): string[] {
  const rows = strings(value, label);
  if (new Set(rows).size !== rows.length) fail(`${label} contains duplicates`);
  for (const item of rows)
    if (item.length > 200 || /\s/u.test(item))
      fail(`${label} contains an invalid token`);
  return rows;
}
function id(value: unknown, label: string): asserts value is string {
  text(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value))
    fail(`${label} is not portable`);
}
function prefixed(
  value: unknown,
  prefix: string,
  label: string,
): asserts value is string {
  text(value, label);
  if (!new RegExp(`^${prefix}-[0-9]{3,}$`, `u`).test(value))
    fail(`${label} must use ${prefix}-###`);
}
function stable(value: unknown, label: string): asserts value is string {
  text(value, label);
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(value))
    fail(`${label} must be a stable lowercase key`);
}
function hash(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    fail(`${label} must be a sha256`);
}
function nullableHash(value: unknown, label: string): void {
  if (value !== null) hash(value, label);
}
function gitOid(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !(/^[a-f0-9]{40}$/u.test(value) || /^[a-f0-9]{64}$/u.test(value))
  )
    fail(`${label} must be a Git object id`);
}
function nullableGitOid(value: unknown, label: string): void {
  if (value !== null) gitOid(value, label);
}
function integer(
  value: unknown,
  label: string,
  min: number,
): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < min)
    fail(`${label} must be an integer >= ${min}`);
}
function nullableInteger(value: unknown, label: string): void {
  if (value !== null) integer(value, label, 1);
}
function uniqueIds(
  value: unknown,
  prefix: string,
  label: string,
  nonempty = false,
): string[] {
  const rows = array(value, label);
  if (nonempty && !rows.length) fail(`${label} must not be empty`);
  for (const item of rows) prefixed(item, prefix, label);
  if (new Set(rows).size !== rows.length) fail(`${label} contains duplicates`);
  return rows as string[];
}
function equal(value: unknown, expected: string, label: string): void {
  if (value !== expected) fail(`${label} must be ${expected}`);
}
function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    fail(`${label} is unsupported`);
}
function fail(message: string): never {
  throw new Error(`composite_campaign_schema_invalid:${message}`);
}
