import type { ScopeSliceV3 } from "./composite-campaign-schema-v4.js";
import type { CompiledContractV3, ImplementationBindingV3, LongTaskSourceBundleV3 } from "./long-task-contract-schema.js";
import type { ScopeSliceV4, SourceUnitV4 } from "./scope-fit-v4.js";

export type ConflictReasonCodeV4 =
  | "explicit_dependency"
  | "contract_dependency"
  | "write_write_overlap"
  | "write_read_overlap"
  | "contract_key_overlap"
  | "resource_lock_overlap"
  | "context_owner_overlap"
  | "conflict_domain_overlap"
  | "source_unit_cohesion_overlap"
  | "migration_sequence_overlap"
  | "generated_artifact_overlap"
  | "package_manager_manifest_overlap"
  | "environment_profile_overlap"
  | "unknown_parallel_evidence";

export interface ConflictReasonV4 { code: ConflictReasonCodeV4; evidence: string }
export interface ConflictDecisionV4 { left_slice_id: string; right_slice_id: string; can_parallel: boolean; reasons: ConflictReasonV4[] }

export interface ConflictProfileV4 {
  slice_id: string;
  stable_key: string;
  priority: number;
  depends_on: string[];
  produces_contracts: string[];
  consumes_contracts: string[];
  write_paths: string[];
  read_paths: string[];
  contract_keys: string[];
  resource_locks: string[];
  context_refs: string[];
  conflict_domains: string[];
  source_unit_cohesion_keys: string[];
  migration_sequences: string[];
  generated_artifacts: string[];
  package_manager_manifests: string[];
  environment_profiles: string[];
  positive_evidence_complete: boolean;
  unknown_reasons: string[];
}

interface ConflictMaterialV4 {
  bindings: ImplementationBindingV3[];
  context_refs: string[];
  input_paths: string[];
  oracle_paths: string[];
  command_paths: string[];
  fixture_paths: string[];
  obligation_binding_counts: number[];
}

export function deriveConflictProfileV4(slice: ScopeSliceV3 | ScopeSliceV4, bundle: LongTaskSourceBundleV3, sourceUnits: SourceUnitV4[] = []): ConflictProfileV4 {
  const obligations = bundle.plan.plan_items.flatMap((item) => item.obligations);
  return profile(slice, {
    bindings: obligations.flatMap((obligation) => obligation.implementation_bindings),
    context_refs: bundle.product.requirements.flatMap((requirement) => requirement.context_refs ?? []),
    input_paths: bundle.checklist.verification_specs.flatMap((spec) => spec.input_paths),
    oracle_paths: bundle.checklist.verification_specs.map((spec) => spec.oracle.entrypoint),
    command_paths: bundle.checklist.verification_specs.flatMap((spec) => spec.command_steps.filter((step) => step.tool === "node_script" || step.tool === "playwright_test").map((step) => step.target)),
    fixture_paths: bundle.checklist.counterexample_fixtures.map((fixture) => fixture.path),
    obligation_binding_counts: obligations.map((obligation) => obligation.implementation_bindings.length)
  }, sourceUnits);
}

export function deriveCompiledConflictProfileV4(slice: ScopeSliceV3, contract: CompiledContractV3): ConflictProfileV4 {
  return profile(slice, {
    bindings: contract.bindings,
    context_refs: contract.requirements.flatMap((requirement) => requirement.context_refs ?? []),
    input_paths: contract.verification_specs.flatMap((spec) => spec.input_paths),
    oracle_paths: contract.verification_specs.flatMap((spec) => spec.oracle_paths),
    command_paths: contract.verification_specs.flatMap((spec) => spec.command_steps.filter((step) => step.tool === "node_script" || step.tool === "playwright_test").map((step) => step.target)),
    fixture_paths: contract.counterexample_fixtures.map((fixture) => fixture.path),
    obligation_binding_counts: contract.obligations.map((obligation) => obligation.implementation_bindings.length)
  }, []);
}

export function analyzeConflictV4(left: ConflictProfileV4, right: ConflictProfileV4): ConflictDecisionV4 {
  if (left.slice_id === right.slice_id) invalid(`duplicate_slice:${left.slice_id}`);
  const reasons: ConflictReasonV4[] = [];
  if (left.depends_on.includes(right.slice_id) || right.depends_on.includes(left.slice_id)) add(reasons, "explicit_dependency", `${left.slice_id}<->${right.slice_id}`);
  for (const contract of intersections(left.produces_contracts, right.consumes_contracts)) add(reasons, "contract_dependency", `${left.slice_id}->${right.slice_id}:${contract}`);
  for (const contract of intersections(right.produces_contracts, left.consumes_contracts)) add(reasons, "contract_dependency", `${right.slice_id}->${left.slice_id}:${contract}`);
  for (const evidence of pathOverlaps(left.write_paths, right.write_paths)) add(reasons, "write_write_overlap", evidence);
  for (const evidence of pathOverlaps(left.write_paths, right.read_paths)) add(reasons, "write_read_overlap", `${left.slice_id}->${right.slice_id}:${evidence}`);
  for (const evidence of pathOverlaps(right.write_paths, left.read_paths)) add(reasons, "write_read_overlap", `${right.slice_id}->${left.slice_id}:${evidence}`);
  for (const key of intersections(left.contract_keys, right.contract_keys)) add(reasons, "contract_key_overlap", key);
  for (const lock of intersections(left.resource_locks, right.resource_locks)) add(reasons, "resource_lock_overlap", lock);
  for (const ref of intersections(left.context_refs, right.context_refs)) add(reasons, "context_owner_overlap", ref);
  for (const domain of intersections(left.conflict_domains, right.conflict_domains)) add(reasons, "conflict_domain_overlap", domain);
  for (const key of intersections(left.source_unit_cohesion_keys ?? [], right.source_unit_cohesion_keys ?? [])) add(reasons, "source_unit_cohesion_overlap", key);
  for (const key of intersections(left.migration_sequences ?? [], right.migration_sequences ?? [])) add(reasons, "migration_sequence_overlap", key);
  for (const key of pathOverlaps(left.generated_artifacts ?? [], right.generated_artifacts ?? [])) add(reasons, "generated_artifact_overlap", key);
  for (const key of pathOverlaps(left.package_manager_manifests ?? [], right.package_manager_manifests ?? [])) add(reasons, "package_manager_manifest_overlap", key);
  for (const key of intersections(left.environment_profiles ?? [], right.environment_profiles ?? [])) add(reasons, "environment_profile_overlap", key);
  if (!left.positive_evidence_complete) add(reasons, "unknown_parallel_evidence", `${left.slice_id}:${left.unknown_reasons.join("+")}`);
  if (!right.positive_evidence_complete) add(reasons, "unknown_parallel_evidence", `${right.slice_id}:${right.unknown_reasons.join("+")}`);
  reasons.sort(compareReason);
  return { left_slice_id: left.slice_id, right_slice_id: right.slice_id, can_parallel: reasons.length === 0, reasons };
}

export function pathPatternsMayOverlapV4(leftValue: string, rightValue: string): boolean {
  const left = normalizePath(leftValue).toLocaleLowerCase("en-US"); const right = normalizePath(rightValue).toLocaleLowerCase("en-US");
  if (!left || !right || left === "**" || right === "**") return true;
  const leftParts = left.split("/"); const rightParts = right.split("/");
  const limit = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < limit; index += 1) {
    const a = leftParts[index]; const b = rightParts[index];
    if (glob(a) || glob(b)) return true;
    if (a !== b) return false;
  }
  if (leftParts.length === rightParts.length) return true;
  const remainder = leftParts.length > limit ? leftParts.slice(limit) : rightParts.slice(limit);
  return remainder.length > 0;
}

function profile(slice: ScopeSliceV3 | ScopeSliceV4, material: ConflictMaterialV4, sourceUnits: SourceUnitV4[]): ConflictProfileV4 {
  const writePaths = material.bindings.filter((binding) => binding.kind === "file" || binding.kind === "path_glob").map((binding) => binding.target);
  const contractKeys = material.bindings.filter((binding) => binding.kind !== "file" && binding.kind !== "path_glob").map((binding) => `${binding.kind}:${binding.target}`);
  const unknown: string[] = [];
  if (!writePaths.length && !contractKeys.length) unknown.push("implementation_targets_missing");
  if (material.obligation_binding_counts.some((count) => count === 0)) unknown.push("obligation_binding_missing");
  if (!material.input_paths.length) unknown.push("verification_input_paths_missing");
  if (!slice.conflict_domains.length) unknown.push("conflict_domains_missing");
  return {
    slice_id: slice.slice_id, stable_key: slice.stable_key, priority: slice.priority,
    depends_on: sorted(slice.depends_on), produces_contracts: sorted(slice.produces_contracts), consumes_contracts: sorted(slice.consumes_contracts),
    write_paths: sorted(writePaths.map(normalizePath)),
    read_paths: sorted([...material.input_paths, ...material.oracle_paths, ...material.command_paths, ...material.fixture_paths, ...material.context_refs].map(normalizePath)),
    contract_keys: sorted(contractKeys), resource_locks: sorted(slice.resource_locks), context_refs: sorted(material.context_refs.map(normalizePath)),
    conflict_domains: sorted(slice.conflict_domains), source_unit_cohesion_keys: sorted(sourceUnits.map((unit) => unit.cohesion_key)),
    migration_sequences: sorted("migration_sequences" in slice ? slice.migration_sequences ?? [] : []),
    generated_artifacts: sorted(("generated_artifacts" in slice ? slice.generated_artifacts ?? [] : []).map(normalizePath)),
    package_manager_manifests: sorted(("package_manager_manifests" in slice ? slice.package_manager_manifests ?? [] : []).map(normalizePath)),
    environment_profiles: sorted("environment_profiles" in slice ? slice.environment_profiles ?? [] : []),
    positive_evidence_complete: unknown.length === 0, unknown_reasons: unknown.sort()
  };
}

function pathOverlaps(left: string[], right: string[]): string[] { const values:string[]=[];for(const a of left)for(const b of right)if(pathPatternsMayOverlapV4(a,b))values.push(`${a}<->${b}`);return sorted(values); }
function intersections(left:string[],right:string[]):string[]{const values=new Set(right);return sorted([...new Set(left.filter((item)=>values.has(item)))]);}
function add(reasons:ConflictReasonV4[],code:ConflictReasonCodeV4,evidence:string):void{if(!reasons.some((item)=>item.code===code&&item.evidence===evidence))reasons.push({code,evidence});}
function compareReason(left:ConflictReasonV4,right:ConflictReasonV4):number{return REASON_ORDER.indexOf(left.code)-REASON_ORDER.indexOf(right.code)||asciiCompare(left.evidence,right.evidence);}
function normalizePath(value:string):string{return value.replace(/\\/gu,"/").replace(/^\.\//u,"").replace(/\/+/gu,"/").replace(/\/$/u,"");}
function glob(segment:string):boolean{return /[*?{[]/u.test(segment);}
function sorted(values:string[]):string[]{return [...new Set(values)].sort(asciiCompare);}
function asciiCompare(left:string,right:string):number{return left<right?-1:left>right?1:0;}
function invalid(reason:string):never{throw new Error(`composite_campaign_conflict_invalid:${reason}`);}
const REASON_ORDER:ConflictReasonCodeV4[]=["explicit_dependency","contract_dependency","write_write_overlap","write_read_overlap","contract_key_overlap","resource_lock_overlap","context_owner_overlap","conflict_domain_overlap","source_unit_cohesion_overlap","migration_sequence_overlap","generated_artifact_overlap","package_manager_manifest_overlap","environment_profile_overlap","unknown_parallel_evidence"];
