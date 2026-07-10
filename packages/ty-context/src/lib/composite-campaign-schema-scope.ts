import {
  SCOPE_FIT_RESULT_SCHEMA_VERSION,
  type CompositeSfcIdV1,
  type ScopeFitDecisionRequiredV1,
  type ScopeFitDecisionV1,
  type ScopeFitResultV1,
  type ScopeFitSliceV1
} from "./composite-campaign-types.js";
import {
  enumValue,
  exactKeys,
  guardSchemaVersion,
  hashValue,
  integerValue,
  nullableSfcId,
  rejectAggregateCompletionKeys,
  requireRecord,
  sfcIdValue,
  stringArray,
  stringValue,
  uniqueValues
} from "./composite-campaign-schema-common.js";

const DECISIONS = ["fit_for_three_inputs", "split_required", "blocked_for_decision", "not_long_task"] as const;

export interface ScopeFitValidationContextV1 {
  acceptedSliceIds?: ReadonlySet<CompositeSfcIdV1>;
  terminalSliceIds?: ReadonlySet<CompositeSfcIdV1>;
  historicalSelectedSliceId?: CompositeSfcIdV1 | null;
}

export function validateScopeFitResultV1(
  value: unknown,
  context: ScopeFitValidationContextV1 = {}
): ScopeFitResultV1 {
  const normalized = normalizeScopeFitResultV1Shape(value);
  validateDecision(
    normalized.decision,
    normalized.slices,
    normalized.selected_slice_id,
    normalized.decision_required,
    context
  );
  return normalized;
}

export function normalizeScopeFitResultV1Shape(value: unknown): ScopeFitResultV1 {
  const object = guardSchemaVersion(value, SCOPE_FIT_RESULT_SCHEMA_VERSION, "ScopeFitResultV1");
  rejectAggregateCompletionKeys(value);
  exactKeys(object, [
    "schema_version", "request_sha256", "decision", "rationale", "slices", "selected_slice_id", "decision_required"
  ], [], "ScopeFitResultV1");
  const decision = enumValue(object.decision, DECISIONS, "ScopeFitResultV1.decision");
  const rationale = stringArray(object.rationale, "ScopeFitResultV1.rationale");
  if (rationale.length === 0) throw new Error("ScopeFitResultV1.rationale must not be empty");
  if (!Array.isArray(object.slices)) throw new Error("ScopeFitResultV1.slices must be an array");
  const slices = object.slices
    .map((entry, index) => scopeSlice(entry, index))
    .sort((left, right) => left.slice_id.localeCompare(right.slice_id));
  validateGraph(slices);
  const selectedSliceId = nullableSfcId(object.selected_slice_id, "ScopeFitResultV1.selected_slice_id");
  const decisionRequired = object.decision_required === null ? null : decisionRequirement(object.decision_required);
  validateDecisionShape(decision, slices, selectedSliceId, decisionRequired);
  return {
    schema_version: SCOPE_FIT_RESULT_SCHEMA_VERSION,
    request_sha256: hashValue(object.request_sha256, "ScopeFitResultV1.request_sha256"),
    decision,
    rationale,
    slices,
    selected_slice_id: selectedSliceId,
    decision_required: decisionRequired
  };
}

function validateDecisionShape(
  decision: ScopeFitDecisionV1,
  slices: ScopeFitSliceV1[],
  selected: CompositeSfcIdV1 | null,
  requirement: ScopeFitDecisionRequiredV1 | null
): void {
  const byId = new Map(slices.map((slice) => [slice.slice_id, slice]));
  if (selected && !byId.has(selected)) throw new Error(`selected_slice_id references unknown ${selected}`);
  if (decision === "not_long_task") {
    if (slices.length !== 0 || selected !== null || requirement !== null) {
      throw new Error("not_long_task requires no slices, no selected slice, and no decision_required");
    }
    return;
  }
  if (decision === "fit_for_three_inputs") {
    if (slices.length !== 1) throw new Error("fit_for_three_inputs requires exactly one slice");
    if (selected !== slices[0].slice_id || requirement !== null) {
      throw new Error("fit_for_three_inputs must select its only slice without decision_required");
    }
    return;
  }
  if (decision === "split_required") {
    if (slices.length < 2) throw new Error("split_required requires multiple slices");
    if (!selected || requirement !== null) throw new Error("split_required requires one selected_slice_id and no decision_required");
    return;
  }
  if (selected !== null || !requirement) {
    throw new Error("blocked_for_decision requires no selected slice and a decision_required payload");
  }
  for (const candidate of requirement.candidates) {
    if (!byId.has(candidate)) throw new Error(`blocked_for_decision candidate references unknown ${candidate}`);
  }
  if (requirement.candidates.length === 0) throw new Error("blocked_for_decision requires at least one candidate");
}

function scopeSlice(value: unknown, index: number): ScopeFitSliceV1 {
  const path = `ScopeFitResultV1.slices[${index}]`;
  const object = requireRecord(value, path);
  exactKeys(object, [
    "slice_id", "stable_key", "title", "objective", "depends_on", "priority",
    "scope_summary", "out_of_scope", "decisions_required"
  ], [], path);
  const dependsOn = stringArray(object.depends_on, `${path}.depends_on`)
    .map((entry, dependencyIndex) => sfcIdValue(entry, `${path}.depends_on[${dependencyIndex}]`))
    .sort();
  uniqueValues(dependsOn, `${path}.depends_on`);
  return {
    slice_id: sfcIdValue(object.slice_id, `${path}.slice_id`),
    stable_key: stringValue(object.stable_key, `${path}.stable_key`),
    title: stringValue(object.title, `${path}.title`),
    objective: stringValue(object.objective, `${path}.objective`),
    depends_on: dependsOn,
    priority: integerValue(object.priority, `${path}.priority`, 1),
    scope_summary: stringArray(object.scope_summary, `${path}.scope_summary`),
    out_of_scope: stringArray(object.out_of_scope, `${path}.out_of_scope`),
    decisions_required: stringArray(object.decisions_required, `${path}.decisions_required`)
  };
}

function decisionRequirement(value: unknown): ScopeFitDecisionRequiredV1 {
  const path = "ScopeFitResultV1.decision_required";
  const object = requireRecord(value, path);
  exactKeys(object, ["decision_id", "question", "candidates"], [], path);
  const candidates = stringArray(object.candidates, `${path}.candidates`)
    .map((entry, index) => sfcIdValue(entry, `${path}.candidates[${index}]`))
    .sort();
  uniqueValues(candidates, `${path}.candidates`);
  return {
    decision_id: stringValue(object.decision_id, `${path}.decision_id`),
    question: stringValue(object.question, `${path}.question`),
    candidates
  };
}

function validateGraph(slices: ScopeFitSliceV1[]): void {
  const byId = new Map<CompositeSfcIdV1, ScopeFitSliceV1>();
  const stableKeys = new Set<string>();
  for (const slice of slices) {
    if (byId.has(slice.slice_id)) throw new Error(`Scope Fit has duplicate slice_id ${slice.slice_id}`);
    if (stableKeys.has(slice.stable_key)) throw new Error(`Scope Fit has duplicate stable_key ${slice.stable_key}`);
    byId.set(slice.slice_id, slice);
    stableKeys.add(slice.stable_key);
  }
  for (const slice of slices) {
    for (const dependency of slice.depends_on) {
      if (dependency === slice.slice_id) throw new Error(`${slice.slice_id}.depends_on contains a self dependency`);
      if (!byId.has(dependency)) throw new Error(`${slice.slice_id}.depends_on references unknown ${dependency}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: CompositeSfcIdV1): void => {
    if (visiting.has(id)) throw new Error(`Scope Fit dependency graph contains a cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)!.depends_on) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
}

function validateDecision(
  decision: ScopeFitDecisionV1,
  slices: ScopeFitSliceV1[],
  selected: CompositeSfcIdV1 | null,
  requirement: ScopeFitDecisionRequiredV1 | null,
  context: ScopeFitValidationContextV1
): void {
  const byId = new Map(slices.map((slice) => [slice.slice_id, slice]));
  if (selected && !byId.has(selected)) throw new Error(`selected_slice_id references unknown ${selected}`);
  const accepted = context.acceptedSliceIds ?? new Set<CompositeSfcIdV1>();
  const terminal = context.terminalSliceIds ?? accepted;
  for (const id of terminal) {
    if (!byId.has(id)) throw new Error(`Scope Fit validation context references unknown terminal slice ${id}`);
  }
  for (const id of accepted) {
    if (!byId.has(id)) throw new Error(`Scope Fit validation context references unknown accepted slice ${id}`);
    if (!terminal.has(id)) throw new Error(`accepted slice ${id} must also be terminal`);
  }
  for (const id of terminal) {
    const slice = byId.get(id)!;
    for (const dependency of slice.depends_on) {
      if (!accepted.has(dependency)) {
        throw new Error(`terminal slice ${id} requires accepted dependency ${dependency}`);
      }
    }
  }
  if (decision === "not_long_task") {
    if (slices.length !== 0 || selected !== null || requirement !== null) {
      throw new Error("not_long_task requires no slices, no selected slice, and no decision_required");
    }
    return;
  }
  if (decision === "fit_for_three_inputs") {
    if (slices.length !== 1) throw new Error("fit_for_three_inputs requires exactly one slice");
    if (selected !== slices[0].slice_id || requirement !== null) {
      throw new Error("fit_for_three_inputs must select its only slice without decision_required");
    }
    if (isHistoricalSelection(selected, accepted, context)) {
      assertSelectedDecisionFree(selected, byId);
    } else {
      assertFrontierSelection(selected, currentFrontier(slices, accepted, terminal));
    }
    return;
  }
  const frontier = currentFrontier(slices, accepted, terminal);
  if (decision === "split_required") {
    if (slices.length < 2) throw new Error("split_required requires multiple slices");
    if (!selected || requirement !== null) throw new Error("split_required requires one selected_slice_id and no decision_required");
    if (isHistoricalSelection(selected, accepted, context)) {
      assertSelectedDecisionFree(selected, byId);
    } else {
      assertFrontierSelection(selected, frontier);
    }
    return;
  }
  if (selected !== null || !requirement) {
    throw new Error("blocked_for_decision requires no selected slice and a decision_required payload");
  }
  const expected = new Set(frontier.map((slice) => slice.slice_id));
  for (const candidate of requirement.candidates) {
    if (!byId.has(candidate)) throw new Error(`blocked_for_decision candidate references unknown ${candidate}`);
    if (!expected.has(candidate)) {
      throw new Error(`blocked_for_decision candidate ${candidate} is not on the dependency-ready priority frontier`);
    }
  }
  if (requirement.candidates.length !== expected.size || requirement.candidates.some((candidate) => !expected.has(candidate))) {
    throw new Error("blocked_for_decision candidates must equal the dependency-ready priority frontier");
  }
  const candidates = requirement.candidates.map((id) => byId.get(id)!);
  if (candidates.length === 0) {
    throw new Error("blocked_for_decision requires at least one dependency-ready priority candidate");
  }
  if (candidates.length >= 2) {
    return;
  }
  if (candidates[0].decisions_required.length === 0) {
    throw new Error("blocked_for_decision has a unique candidate that should be auto-selected");
  }
  if (!candidates[0].decisions_required.includes(requirement.decision_id)) {
    throw new Error("blocked_for_decision decision_id must appear in the unique candidate decisions_required list");
  }
}

function currentFrontier(
  slices: ScopeFitSliceV1[],
  accepted: ReadonlySet<CompositeSfcIdV1>,
  terminal: ReadonlySet<CompositeSfcIdV1>
): ScopeFitSliceV1[] {
  const dependencyReady = slices.filter((slice) =>
    !terminal.has(slice.slice_id) && slice.depends_on.every((dependency) => accepted.has(dependency))
  );
  if (dependencyReady.length === 0) return [];
  const minimumPriority = Math.min(...dependencyReady.map((slice) => slice.priority));
  return dependencyReady.filter((slice) => slice.priority === minimumPriority);
}

function assertFrontierSelection(selected: CompositeSfcIdV1, frontier: ScopeFitSliceV1[]): void {
  if (frontier.length !== 1 || frontier[0].slice_id !== selected) {
    throw new Error(`selected slice ${selected} must be the unique dependency-ready priority candidate`);
  }
  if (frontier[0].decisions_required.length > 0) {
    throw new Error(`selected slice ${selected} still has unresolved decisions_required`);
  }
}

function assertSelectedDecisionFree(
  selected: CompositeSfcIdV1,
  byId: ReadonlyMap<CompositeSfcIdV1, ScopeFitSliceV1>
): void {
  if (byId.get(selected)!.decisions_required.length > 0) {
    throw new Error(`selected slice ${selected} still has unresolved decisions_required`);
  }
}

function isHistoricalSelection(
  selected: CompositeSfcIdV1,
  accepted: ReadonlySet<CompositeSfcIdV1>,
  context: ScopeFitValidationContextV1
): boolean {
  const terminal = context.terminalSliceIds ?? accepted;
  return terminal.has(selected) && context.historicalSelectedSliceId === selected;
}
