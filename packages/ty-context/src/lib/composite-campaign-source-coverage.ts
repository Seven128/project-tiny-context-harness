import { parseStrictJson } from "./composite-campaign-codec.js";
import { assertScopeFitResultV3, type ScopeFitResultV3 } from "./composite-campaign-schema-v4.js";
import { assertScopeFitResultV4, type ScopeFitResultV4 } from "./scope-fit-v4.js";

export const SOURCE_COVERAGE_SCHEMA_V1 = "composite-source-coverage-v1" as const;
export type SourceCoverageDispositionV1 = "slice" | "global_constraint" | "out_of_scope" | "decision_required";

export interface SourceCoverageItemV1 {
  source_item_id: string;
  statement: string;
  disposition: SourceCoverageDispositionV1;
  slice_refs: string[];
  global_constraint_refs: string[];
  rationale: string;
}

export interface GlobalConstraintPacketBindingV1 {
  constraint_id: string;
  slice_id: string;
  requirement_ids: string[];
  acceptance_criterion_ids: string[];
  verification_spec_ids: string[];
}

export interface SourceCoverageV1 {
  schema_version: typeof SOURCE_COVERAGE_SCHEMA_V1;
  source_plan_sha256: string;
  items: SourceCoverageItemV1[];
  global_constraint_bindings: GlobalConstraintPacketBindingV1[];
}

export interface CampaignPacketEntityIndexV1 {
  slice_id: string;
  requirement_ids: string[];
  acceptance_criterion_ids: string[];
  verification_spec_ids: string[];
  global_invariant_spec_ids: string[];
}

export interface SourceCoverageAnalysisV1 {
  source_item_count: number;
  covered_slice_ids: string[];
  covered_global_constraint_ids: string[];
  pending_global_constraint_binding_pairs: string[];
}

export function parseSourceCoverageV1(content: string): SourceCoverageV1 {
  return assertSourceCoverageV1(parseStrictJson(content));
}

export function assertSourceCoverageV1(value: unknown): SourceCoverageV1 {
  const root = object(value, "source coverage");
  exact(root, ["schema_version", "source_plan_sha256", "items", "global_constraint_bindings"]);
  if (root.schema_version !== SOURCE_COVERAGE_SCHEMA_V1) invalid("schema_version");
  sha(root.source_plan_sha256, "source_plan_sha256");
  const items = list(root.items, "items"); if (!items.length) invalid("items_empty");
  items.forEach((item, index) => coverageItem(item, index));
  list(root.global_constraint_bindings, "global_constraint_bindings").forEach((item, index) => constraintBinding(item, index));
  unique((items as SourceCoverageItemV1[]).map((item) => item.source_item_id), "source_item_id");
  return root as unknown as SourceCoverageV1;
}

export function validateSourceCoverageAgainstScopeV3(scopeValue: unknown, coverageValue: unknown): SourceCoverageAnalysisV1 {
  return validateSourceCoverage(assertScopeFitResultV3(scopeValue), assertSourceCoverageV1(coverageValue));
}

export function validateSourceCoverageAgainstScopeV4(scopeValue: unknown, coverageValue: unknown): SourceCoverageAnalysisV1 {
  const scope = assertScopeFitResultV4(scopeValue); const coverage = assertSourceCoverageV1(coverageValue);
  const analysis = validateSourceCoverage(scope, coverage); const items = new Set(coverage.items.map((item) => item.source_item_id));
  for (const unit of scope.source_units) for (const sourceRef of unit.source_refs) if (!items.has(sourceRef)) invalid(`source_unit_unknown_source_item:${unit.unit_id}:${sourceRef}`);
  return analysis;
}

function validateSourceCoverage(scope: ScopeFitResultV3 | ScopeFitResultV4, coverage: SourceCoverageV1): SourceCoverageAnalysisV1 {
  if (coverage.source_plan_sha256 !== scope.request_sha256) invalid("source_plan_hash_mismatch");
  const slices = new Map(scope.slices.map((slice) => [slice.slice_id, slice]));
  const constraints = new Map(scope.global_constraints.map((constraint) => [constraint.constraint_id, constraint]));
  const items = new Map(coverage.items.map((item) => [item.source_item_id, item]));
  for (const item of coverage.items) {
    for (const sliceId of item.slice_refs) {
      const slice = slices.get(sliceId); if (!slice) invalid(`source_item_unknown_slice:${item.source_item_id}:${sliceId}`);
      if (!slice.source_refs.includes(item.source_item_id)) invalid(`source_slice_reverse_edge_missing:${item.source_item_id}:${sliceId}`);
    }
    for (const constraintId of item.global_constraint_refs) if (!constraints.has(constraintId)) invalid(`source_item_unknown_global_constraint:${item.source_item_id}:${constraintId}`);
  }
  for (const slice of scope.slices) for (const sourceRef of slice.source_refs) {
    const item = items.get(sourceRef); if (!item) invalid(`slice_unknown_source_item:${slice.slice_id}:${sourceRef}`);
    if (item.disposition !== "slice" || !item.slice_refs.includes(slice.slice_id)) invalid(`slice_source_disposition_mismatch:${slice.slice_id}:${sourceRef}`);
  }
  for (const constraint of scope.global_constraints) {
    const covered = coverage.items.some((item) => item.disposition === "global_constraint" && item.global_constraint_refs.includes(constraint.constraint_id));
    if (!covered) invalid(`global_constraint_source_missing:${constraint.constraint_id}`);
  }
  const decisionItems = coverage.items.filter((item) => item.disposition === "decision_required");
  if (decisionItems.length && scope.decision !== "blocked_for_decision") invalid("decision_item_without_blocked_scope");
  if (scope.decision === "blocked_for_decision" && !decisionItems.length) invalid("blocked_scope_without_decision_item");
  const bindingPairs = new Set<string>();
  for (const binding of coverage.global_constraint_bindings) {
    const constraint = constraints.get(binding.constraint_id); if (!constraint) invalid(`binding_unknown_global_constraint:${binding.constraint_id}`);
    if (!constraint.applies_to.includes(binding.slice_id)) invalid(`binding_slice_not_applicable:${binding.constraint_id}:${binding.slice_id}`);
    const pair = `${binding.constraint_id}:${binding.slice_id}`; if (bindingPairs.has(pair)) invalid(`duplicate_global_binding:${pair}`); bindingPairs.add(pair);
  }
  const requiredPairs = scope.global_constraints.flatMap((constraint) => constraint.applies_to.map((sliceId) => `${constraint.constraint_id}:${sliceId}`)).sort();
  return {
    source_item_count: coverage.items.length,
    covered_slice_ids: [...new Set(coverage.items.flatMap((item) => item.slice_refs))].sort(),
    covered_global_constraint_ids: [...new Set(coverage.items.flatMap((item) => item.global_constraint_refs))].sort(),
    pending_global_constraint_binding_pairs: requiredPairs.filter((pair) => !bindingPairs.has(pair))
  };
}

export function assertGlobalConstraintPacketCoverageV1(scopeValue: unknown, coverageValue: unknown, indexesValue: CampaignPacketEntityIndexV1[]): void {
  const raw = object(scopeValue, "scope");
  const scope: ScopeFitResultV3 | ScopeFitResultV4 = raw.schema_version === "scope-fit-result-v4" ? assertScopeFitResultV4(scopeValue) : assertScopeFitResultV3(scopeValue);
  const coverage = assertSourceCoverageV1(coverageValue);
  const analysis = scope.schema_version === "scope-fit-result-v4" ? validateSourceCoverageAgainstScopeV4(scope, coverage) : validateSourceCoverageAgainstScopeV3(scope, coverage);
  if (analysis.pending_global_constraint_binding_pairs.length) invalid(`global_constraint_bindings_missing:${analysis.pending_global_constraint_binding_pairs.join(",")}`);
  const indexes = new Map<string, CampaignPacketEntityIndexV1>();
  for (const index of indexesValue) {
    packetIndex(index); if (indexes.has(index.slice_id)) invalid(`duplicate_packet_index:${index.slice_id}`); indexes.set(index.slice_id, index);
  }
  for (const binding of coverage.global_constraint_bindings) {
    const index = indexes.get(binding.slice_id); if (!index) invalid(`packet_index_missing:${binding.slice_id}`);
    requireSubset(binding.requirement_ids, index.requirement_ids, `${binding.constraint_id}:${binding.slice_id}:requirement`);
    requireSubset(binding.acceptance_criterion_ids, index.acceptance_criterion_ids, `${binding.constraint_id}:${binding.slice_id}:acceptance`);
    requireSubset(binding.verification_spec_ids, index.verification_spec_ids, `${binding.constraint_id}:${binding.slice_id}:verification`);
    requireSubset(binding.verification_spec_ids, index.global_invariant_spec_ids, `${binding.constraint_id}:${binding.slice_id}:global_invariant`);
  }
}

function coverageItem(value:unknown,index:number):void{const row=object(value,`items[${index}]`);exact(row,["source_item_id","statement","disposition","slice_refs","global_constraint_refs","rationale"]);prefixed(row.source_item_id,"SRC",`items[${index}].source_item_id`);text(row.statement,`items[${index}].statement`);oneOf(row.disposition,["slice","global_constraint","out_of_scope","decision_required"],`items[${index}].disposition`);const slices=ids(row.slice_refs,"SFC",`items[${index}].slice_refs`);const constraints=ids(row.global_constraint_refs,"GC",`items[${index}].global_constraint_refs`);text(row.rationale,`items[${index}].rationale`);if(row.disposition==="slice"&&(!slices.length||constraints.length))invalid(`slice_disposition_refs:${row.source_item_id}`);if(row.disposition==="global_constraint"&&(!constraints.length||slices.length))invalid(`global_disposition_refs:${row.source_item_id}`);if((row.disposition==="out_of_scope"||row.disposition==="decision_required")&&(slices.length||constraints.length))invalid(`terminal_disposition_refs:${row.source_item_id}`);}
function constraintBinding(value:unknown,index:number):void{const row=object(value,`global_constraint_bindings[${index}]`);exact(row,["constraint_id","slice_id","requirement_ids","acceptance_criterion_ids","verification_spec_ids"]);prefixed(row.constraint_id,"GC",`${index}.constraint_id`);prefixed(row.slice_id,"SFC",`${index}.slice_id`);tokens(row.requirement_ids,`${index}.requirement_ids`,true);tokens(row.acceptance_criterion_ids,`${index}.acceptance_criterion_ids`,true);tokens(row.verification_spec_ids,`${index}.verification_spec_ids`,true);}
function packetIndex(value:unknown):void{const row=object(value,"packet index");exact(row,["slice_id","requirement_ids","acceptance_criterion_ids","verification_spec_ids","global_invariant_spec_ids"]);prefixed(row.slice_id,"SFC","packet slice_id");tokens(row.requirement_ids,"packet requirement_ids");tokens(row.acceptance_criterion_ids,"packet acceptance_criterion_ids");tokens(row.verification_spec_ids,"packet verification_spec_ids");tokens(row.global_invariant_spec_ids,"packet global_invariant_spec_ids");requireSubset(row.global_invariant_spec_ids as string[],row.verification_spec_ids as string[],`${row.slice_id}:global_invariant_declaration`,false);}
function requireSubset(actual:string[],allowed:string[],label:string,nonempty=true):void{if(nonempty&&!actual.length)invalid(`${label}_empty`);const values=new Set(allowed);for(const id of actual)if(!values.has(id))invalid(`${label}_unknown:${id}`);}
function object(value:unknown,label:string):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))invalid(`${label}_not_object`);return value as Record<string,unknown>;}
function list(value:unknown,label:string):unknown[]{if(!Array.isArray(value))invalid(`${label}_not_array`);return value;}
function exact(row:Record<string,unknown>,required:string[]):void{for(const key of required)if(!Object.hasOwn(row,key))invalid(`missing_field:${key}`);for(const key of Object.keys(row))if(!required.includes(key))invalid(`unknown_field:${key}`);}
function text(value:unknown,label:string):asserts value is string{if(typeof value!=="string"||!value.trim())invalid(`${label}_empty`);}
function sha(value:unknown,label:string):asserts value is string{if(typeof value!=="string"||!/^[a-f0-9]{64}$/u.test(value))invalid(`${label}_not_sha256`);}
function prefixed(value:unknown,prefix:string,label:string):asserts value is string{if(typeof value!=="string"||!new RegExp(`^${prefix}-[0-9]{3,}$`,`u`).test(value))invalid(`${label}_invalid`);}
function ids(value:unknown,prefix:string,label:string):string[]{const values=list(value,label);for(const item of values)prefixed(item,prefix,label);unique(values as string[],label);return values as string[];}
function tokens(value:unknown,label:string,nonempty=false):string[]{const values=list(value,label);if(nonempty&&!values.length)invalid(`${label}_empty`);for(const item of values){text(item,label);if(/\s/u.test(item as string))invalid(`${label}_invalid`);}unique(values as string[],label);return values as string[];}
function unique(values:string[],label:string):void{if(new Set(values).size!==values.length)invalid(`${label}_duplicate`);}
function oneOf<T extends string>(value:unknown,allowed:readonly T[],label:string):asserts value is T{if(typeof value!=="string"||!allowed.includes(value as T))invalid(`${label}_unsupported`);}
function invalid(reason:string):never{throw new Error(`composite_campaign_source_coverage_invalid:${reason}`);}
