import type { CoverageResult, LongTaskSourceBundleV2 } from "./long-task-contract-schema.js";
import { assertNoCaseCollisions, assertSafeContractPath } from "./long-task-path-policy.js";

export function validateLongTaskCoverage(bundle: LongTaskSourceBundleV2): CoverageResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requirements = uniqueMap(bundle.product.requirements, "product requirement", errors);
  const boundaries = uniqueMap(bundle.product.boundaries, "product boundary", errors);
  const outcomes = uniqueMap(bundle.product.non_completing_outcomes, "non-completing outcome", errors);
  const obligations = uniqueMap(bundle.plan.plan_items.flatMap((item) => item.obligations), "plan obligation", errors);
  const criteria = uniqueMap(bundle.checklist.acceptance_criteria, "acceptance criterion", errors);
  const specs = uniqueMap(bundle.checklist.acceptance_criteria.flatMap((ac) => ac.verification_specs), "verification spec", errors);
  const shortcuts = uniqueMap(bundle.plan.plan_items.flatMap((pi) => pi.obligations.flatMap((ob) => ob.forbidden_shortcuts)), "forbidden shortcut", errors);

  for (const requirement of requirements.values()) {
    const linked = [...obligations.values()].filter((ob) => ob.source_requirement_ids.includes(requirement.id));
    if (linked.length === 0) errors.push(`product_requirement_without_pi:${requirement.id}`);
    if (requirement.owner_surfaces.length > 0 && !hasUiBrowserSpec(linked, criteria)) errors.push(`owner_surface_without_ui_browser:${requirement.id}`);
    if ((bundle.product.full_population_required || requirement.population_policy === "full_population") && !hasPopulationEnumerator(linked, criteria)) errors.push(`sample_only_for_full_population:${requirement.id}`);
  }
  for (const obligation of obligations.values()) {
    for (const id of obligation.source_requirement_ids) if (!requirements.has(id)) errors.push(`obligation_unknown_requirement:${obligation.id}:${id}`);
    const direct = obligation.related_ac_ids.filter((id) => criteria.get(id)?.obligation_refs.includes(obligation.id));
    if (direct.length === 0) errors.push(`pi_obligation_without_ac:${obligation.id}`);
    for (const shortcut of obligation.forbidden_shortcuts) {
      if (!negativeAssertions(bundle).some((a) => a.source_forbidden_shortcut_ids.includes(shortcut.id))) errors.push(`forbidden_shortcut_without_executable_negative_assertion:${shortcut.id}`);
      for (const id of shortcut.source_boundary_ids) if (!boundaries.has(id)) errors.push(`shortcut_unknown_boundary:${shortcut.id}:${id}`);
    }
  }
  for (const ac of criteria.values()) {
    if (ac.obligation_refs.length === 0 || !ac.obligation_refs.some((id) => obligations.has(id))) errors.push(`ac_without_obligation:${ac.id}`);
    for (const id of ac.obligation_refs) if (!obligations.has(id)) errors.push(`ac_unknown_obligation:${ac.id}:${id}`);
    if (ac.verification_specs.length === 0) errors.push(`ac_without_verifier:${ac.id}`);
    if (ac.verification_specs.length === 0 && /summary|汇总|总结/i.test(`${ac.id} ${ac.title}`)) errors.push(`summary_only_ac:${ac.id}`);
    if (ac.proof_surfaces.includes("ui_browser") && !ac.verification_specs.some((spec) => spec.runner_type === "browser")) errors.push(`owner_surface_without_ui_browser:${ac.id}`);
  }
  for (const boundary of boundaries.values()) if (!negativeAssertions(bundle).some((a) => a.source_boundary_ids.includes(boundary.id))) errors.push(`boundary_without_executable_negative_assertion:${boundary.id}`);
  for (const outcome of outcomes.values()) if (!negativeAssertions(bundle).some((a) => a.source_non_completing_ids.includes(outcome.id))) errors.push(`non_completing_outcome_without_negative_assertion:${outcome.id}`);
  validateSpecs([...specs.values()], boundaries, outcomes, shortcuts, errors);
  const implementationPaths = bundle.plan.plan_items.flatMap((pi) => pi.obligations.flatMap((ob) => ob.implementation_bindings.paths));
  for (const spec of specs.values()) for (const oracle of spec.oracle_paths) if (implementationPaths.some((binding) => pathsOverlap(binding, oracle))) errors.push(`oracle_authored_by_same_product_attempt:${spec.id}:${oracle}`);
  return { passed: errors.length === 0, errors: [...new Set(errors)].sort(), warnings };
}

function validateSpecs(specs: Array<LongTaskSourceBundleV2["checklist"]["acceptance_criteria"][number]["verification_specs"][number]>, boundaries: Map<string, { id: string }>, outcomes: Map<string, { id: string }>, shortcuts: Map<string, { id: string }>, errors: string[]): void {
  for (const spec of specs) {
    try { assertNoCaseCollisions([...spec.oracle_paths, ...spec.implementation_test_paths, ...spec.input_paths], `${spec.id} paths`); spec.oracle_paths.forEach((p) => assertSafeContractPath(p, `${spec.id}.oracle_paths`)); if (spec.cwd !== "repo_root") assertSafeContractPath(spec.cwd, `${spec.id}.cwd`); } catch (error) { errors.push(`unsafe_verification_path:${spec.id}:${message(error)}`); }
    if (spec.oracle_paths.length === 0) errors.push(`ac_without_verifier:${spec.id}:oracle_paths`);
    if (spec.positive_assertions.length + spec.negative_assertions.length === 0) errors.push(`manual_only_ac:${spec.id}`);
    uniqueIds([...spec.positive_assertions, ...spec.negative_assertions], `assertion:${spec.id}`, errors);
    const oracleChecks = [...spec.positive_assertions, ...spec.negative_assertions].map((assertion) => ({ id: assertion.oracle_check_id }));
    uniqueIds(oracleChecks, `oracle_check:${spec.id}`, errors);
    if(spec.population_enumerator && !spec.positive_assertions.some((assertion)=>assertion.oracle_check_id===spec.population_enumerator!.oracle_check_id)) errors.push(`sample_only_for_full_population:${spec.id}:enumerator_assertion`);
    for (const negative of spec.negative_assertions) {
      for (const id of negative.source_boundary_ids) if (!boundaries.has(id)) errors.push(`negative_unknown_boundary:${negative.id}:${id}`);
      for (const id of negative.source_non_completing_ids) if (!outcomes.has(id)) errors.push(`negative_unknown_non_completing:${negative.id}:${id}`);
      for (const id of negative.source_forbidden_shortcut_ids) if (!shortcuts.has(id)) errors.push(`negative_unknown_shortcut:${negative.id}:${id}`);
    }
  }
}

function negativeAssertions(bundle: LongTaskSourceBundleV2) { return bundle.checklist.acceptance_criteria.flatMap((ac) => ac.verification_specs.flatMap((spec) => spec.negative_assertions)); }
function hasUiBrowserSpec(obligations: Array<{ related_ac_ids: string[] }>, criteria: Map<string, LongTaskSourceBundleV2["checklist"]["acceptance_criteria"][number]>): boolean { return obligations.some((ob) => ob.related_ac_ids.some((id) => criteria.get(id)?.verification_specs.some((spec) => spec.runner_type === "browser"))); }
function hasPopulationEnumerator(obligations: Array<{ related_ac_ids: string[] }>, criteria: Map<string, LongTaskSourceBundleV2["checklist"]["acceptance_criteria"][number]>): boolean { return obligations.some((ob) => ob.related_ac_ids.some((id) => {const ac=criteria.get(id);return ac?.proof_surfaces.includes("population_coverage")&&ac.verification_specs.some((spec) => spec.population_enumerator?.required_coverage_percent === 100 && spec.positive_assertions.some((assertion)=>assertion.oracle_check_id===spec.population_enumerator!.oracle_check_id));})); }
function uniqueMap<T extends { id: string }>(items: T[], label: string, errors: string[]): Map<string, T> { const result = new Map<string, T>(); for (const item of items) { if (result.has(item.id)) errors.push(`duplicate_${label.replaceAll(" ", "_")}:${item.id}`); else result.set(item.id, item); } return result; }
function uniqueIds(items: Array<{ id: string }>, label: string, errors: string[]): void { const seen = new Set<string>(); for (const item of items) { if (seen.has(item.id)) errors.push(`duplicate_${label}:${item.id}`); seen.add(item.id); } }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function pathsOverlap(binding: string, oracle: string): boolean { const prefix = binding.replace(/\\/g,"/").replace(/\*.*$/,"").replace(/\/$/,""); const candidate = oracle.replace(/\\/g,"/"); return prefix.length > 0 && (candidate === prefix || candidate.startsWith(`${prefix}/`)); }
