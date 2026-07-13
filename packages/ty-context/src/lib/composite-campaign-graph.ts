import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import { assertScopeFitResultV3, type ScopeFitResultV3, type ScopeSliceV3 } from "./composite-campaign-schema-v4.js";

export interface ScopeGraphAnalysisV4 {
  graph_sha256: string;
  topological_slice_ids: string[];
  slices_by_id: Record<string, ScopeSliceV3>;
}

export function validateScopeFitGraphV3(value: unknown, previous?: ScopeFitResultV3): ScopeGraphAnalysisV4 {
  const scope = assertScopeFitResultV3(value);
  const slices = new Map<string, ScopeSliceV3>();
  const stableKeys = new Map<string, string>();
  for (const slice of scope.slices) {
    if (slices.has(slice.slice_id)) invalid(`duplicate_slice_id:${slice.slice_id}`);
    const prior = stableKeys.get(slice.stable_key);
    if (prior) invalid(`duplicate_stable_key:${slice.stable_key}:${prior}:${slice.slice_id}`);
    slices.set(slice.slice_id, slice); stableKeys.set(slice.stable_key, slice.slice_id);
  }
  for (const slice of scope.slices) {
    if (slice.depends_on.includes(slice.slice_id)) invalid(`self_dependency:${slice.slice_id}`);
    for (const dependency of slice.depends_on) if (!slices.has(dependency)) invalid(`missing_dependency:${slice.slice_id}:${dependency}`);
  }
  const constraintIds = new Set<string>();
  for (const constraint of scope.global_constraints) {
    if (constraintIds.has(constraint.constraint_id)) invalid(`duplicate_global_constraint:${constraint.constraint_id}`);
    constraintIds.add(constraint.constraint_id);
    for (const sliceId of constraint.applies_to) if (!slices.has(sliceId)) invalid(`global_constraint_unknown_slice:${constraint.constraint_id}:${sliceId}`);
  }
  if (scope.decision_required) for (const sliceId of scope.decision_required.candidates) if (!slices.has(sliceId)) invalid(`decision_candidate_unknown:${sliceId}`);
  const topological = topologicalOrder(scope.slices);
  assertContractDependencies(scope.slices, slices);
  if (previous) assertStableScopeEvolutionV3(previous, scope);
  return {
    graph_sha256: hashScopeGraphV3(scope),
    topological_slice_ids: topological,
    slices_by_id: Object.fromEntries([...slices.entries()].sort(([left], [right]) => asciiCompare(left, right)))
  };
}

export function assertStableScopeEvolutionV3(previousValue: unknown, nextValue: unknown): void {
  const previous = assertScopeFitResultV3(previousValue);
  const next = assertScopeFitResultV3(nextValue);
  const nextById = new Map(next.slices.map((slice) => [slice.slice_id, slice]));
  const nextByKey = new Map(next.slices.map((slice) => [slice.stable_key, slice]));
  for (const prior of previous.slices) {
    const byId = nextById.get(prior.slice_id);
    if (!byId) invalid(`stable_slice_removed:${prior.slice_id}`);
    if (byId.stable_key !== prior.stable_key) invalid(`stable_key_changed:${prior.slice_id}:${prior.stable_key}:${byId.stable_key}`);
    const byKey = nextByKey.get(prior.stable_key);
    if (byKey?.slice_id !== prior.slice_id) invalid(`stable_slice_renumbered:${prior.stable_key}:${prior.slice_id}:${byKey?.slice_id ?? "missing"}`);
  }
}

export function computeReadyFrontierV3(scopeValue: unknown, integratedSliceIds: Iterable<string>): ScopeSliceV3[] {
  const scope = assertScopeFitResultV3(scopeValue);
  validateScopeFitGraphV3(scope);
  const known = new Set(scope.slices.map((slice) => slice.slice_id));
  const integrated = new Set(integratedSliceIds);
  for (const sliceId of integrated) if (!known.has(sliceId)) invalid(`integrated_slice_unknown:${sliceId}`);
  return scope.slices
    .filter((slice) => !integrated.has(slice.slice_id) && slice.depends_on.every((dependency) => integrated.has(dependency)))
    .sort(compareScopeSlicesV3);
}

export function compareScopeSlicesV3(left: ScopeSliceV3, right: ScopeSliceV3): number {
  return left.priority - right.priority || asciiCompare(left.stable_key, right.stable_key) || asciiCompare(left.slice_id, right.slice_id);
}

export function dependsTransitivelyV3(scopeValue: unknown, sliceId: string, possibleAncestorId: string): boolean {
  const scope = assertScopeFitResultV3(scopeValue);
  const byId = new Map(scope.slices.map((slice) => [slice.slice_id, slice]));
  if (!byId.has(sliceId) || !byId.has(possibleAncestorId)) invalid(`dependency_query_unknown_slice:${sliceId}:${possibleAncestorId}`);
  const pending = [...byId.get(sliceId)!.depends_on]; const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === possibleAncestorId) return true;
    if (!visited.has(current)) { visited.add(current); pending.push(...(byId.get(current)?.depends_on ?? [])); }
  }
  return false;
}

export function hashScopeGraphV3(scopeValue: unknown): string {
  const scope = assertScopeFitResultV3(scopeValue);
  const graph = {
    campaign_goal: scope.campaign_goal,
    global_constraints: [...scope.global_constraints]
      .map((item) => ({ ...item, applies_to: [...item.applies_to].sort() }))
      .sort((left, right) => asciiCompare(left.constraint_id, right.constraint_id)),
    slices: [...scope.slices]
      .map((slice) => ({
        slice_id: slice.slice_id, stable_key: slice.stable_key, depends_on: [...slice.depends_on].sort(), priority: slice.priority,
        source_refs: [...slice.source_refs].sort(), produces_contracts: [...slice.produces_contracts].sort(),
        consumes_contracts: [...slice.consumes_contracts].sort(), conflict_domains: [...slice.conflict_domains].sort(),
        resource_locks: [...slice.resource_locks].sort()
      }))
      .sort((left, right) => left.priority - right.priority || asciiCompare(left.stable_key, right.stable_key) || asciiCompare(left.slice_id, right.slice_id))
  };
  return sha256Hex(canonicalValueJson(graph));
}

function topologicalOrder(slices: ScopeSliceV3[]): string[] {
  const remaining = new Map(slices.map((slice) => [slice.slice_id, new Set(slice.depends_on)]));
  const byId = new Map(slices.map((slice) => [slice.slice_id, slice])); const result: string[] = [];
  while (remaining.size) {
    const ready = [...remaining.entries()].filter(([, dependencies]) => dependencies.size === 0).map(([sliceId]) => byId.get(sliceId)!).sort(compareScopeSlicesV3);
    if (!ready.length) invalid(`dependency_cycle:${[...remaining.keys()].sort().join(",")}`);
    for (const slice of ready) { result.push(slice.slice_id); remaining.delete(slice.slice_id); }
    for (const dependencies of remaining.values()) for (const slice of ready) dependencies.delete(slice.slice_id);
  }
  return result;
}

function assertContractDependencies(slices: ScopeSliceV3[], byId: Map<string, ScopeSliceV3>): void {
  const producers = new Map<string, string>();
  for (const slice of slices) for (const contract of slice.produces_contracts) {
    const prior = producers.get(contract);
    if (prior && prior !== slice.slice_id) invalid(`duplicate_contract_producer:${contract}:${prior}:${slice.slice_id}`);
    producers.set(contract, slice.slice_id);
  }
  for (const consumer of slices) for (const contract of consumer.consumes_contracts) {
    const producer = producers.get(contract);
    if (producer && producer !== consumer.slice_id && !dependsOn(consumer.slice_id, producer, byId)) invalid(`contract_dependency_missing:${consumer.slice_id}:${producer}:${contract}`);
  }
}

function dependsOn(sliceId: string, ancestorId: string, byId: Map<string, ScopeSliceV3>): boolean {
  const pending = [...(byId.get(sliceId)?.depends_on ?? [])]; const visited = new Set<string>();
  while (pending.length) { const current=pending.pop()!;if(current===ancestorId)return true;if(!visited.has(current)){visited.add(current);pending.push(...(byId.get(current)?.depends_on??[]));} }
  return false;
}

function invalid(reason: string): never { throw new Error(`composite_campaign_graph_invalid:${reason}`); }
function asciiCompare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
