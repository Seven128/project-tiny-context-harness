import type {
  AcceptanceCriterionV3,
  CounterfactualControlV3,
  CoverageResult,
  ImplementationBindingV3,
  LongTaskObligationV3,
  LongTaskSourceBundleV3,
  ProofRequirementV3,
  VerificationSpecV3
} from "./long-task-contract-schema.js";
import { assertLongTaskAuthorPath, assertNoCaseCollisions, assertSafeContractPath } from "./long-task-path-policy.js";

export function validateLongTaskCoverage(bundle: LongTaskSourceBundleV3): CoverageResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requirements = map(bundle.product.requirements, "product_requirement", errors);
  const surfaces = map(bundle.product.owner_surfaces, "owner_surface", errors);
  const boundaries = map(bundle.product.boundaries, "product_boundary", errors);
  const outcomes = map(bundle.product.non_completing_outcomes, "non_completing_outcome", errors);
  const exclusions = map(bundle.product.population_exclusion_rules, "population_exclusion_rule", errors);
  const planItems = map(bundle.plan.plan_items, "plan_item", errors);
  const obligations = map(bundle.plan.plan_items.flatMap((item) => item.obligations), "obligation", errors);
  const bindings = map([...obligations.values()].flatMap((item) => item.implementation_bindings), "binding", errors);
  const shortcuts = map([...obligations.values()].flatMap((item) => item.forbidden_shortcuts), "forbidden_shortcut", errors);
  const controls = map(bundle.plan.counterfactual_controls, "counterfactual_control", errors);
  const criteria = map(bundle.checklist.acceptance_criteria, "acceptance_criterion", errors);
  const proofs = map(bundle.checklist.proof_requirements, "proof_requirement", errors);
  const specs = map(bundle.checklist.verification_specs, "verification_spec", errors);
  const fixtures = map(bundle.checklist.counterexample_fixtures, "counterexample_fixture", errors);
  const probes = map(bundle.checklist.environment_probes, "environment_probe", errors);
  const assertions = map([...specs.values()].flatMap((spec) => [...spec.positive_assertions, ...spec.negative_assertions]), "assertion", errors);
  validateGlobalIds([surfaces, requirements, boundaries, outcomes, exclusions, planItems, obligations, bindings, shortcuts, controls, criteria, proofs, specs, fixtures, probes, assertions], errors);

  if (requirements.size === 0) errors.push("empty_product_requirements");
  if (surfaces.size === 0) errors.push("empty_owner_surfaces");
  if (planItems.size === 0) errors.push("empty_plan_items");
  if (criteria.size === 0) errors.push("empty_acceptance_criteria");
  if (proofs.size === 0) errors.push("empty_proof_requirements");
  if (specs.size === 0) errors.push("empty_verification_specs");
  if (probes.size > 0) errors.push("prestable_unsupported_environment_probes");
  const fullPopulation=bundle.product.requirements.some((item)=>item.population_policy==="full_population");
  if(bundle.product.full_population_required!==fullPopulation||bundle.product.delivery_scope==="full_population_operation"&&!fullPopulation)errors.push("population_contract_incomplete:full_population_required");
  if(bundle.product.requirements.some((item)=>item.population_policy==="representative_sample")&&bundle.product.representative_samples_do_not_validate.length===0)errors.push("population_contract_incomplete:representative_sample_limits");
  uniqueSurfaceOwnership(bundle,errors);

  for (const rule of [...boundaries.values(), ...outcomes.values(), ...exclusions.values()]) {
    if (rule.requirement_refs.length === 0) errors.push(`product_rule_without_requirement:${rule.id}`);
    for (const id of rule.requirement_refs) if (!requirements.has(id)) errors.push(`product_rule_unknown_requirement:${rule.id}:${id}`);
  }
  for (const requirement of requirements.values()) validateRequirement(requirement, bundle, surfaces, obligations, criteria, proofs, specs, errors);
  for (const planItem of planItems.values()) if (planItem.obligations.length === 0) errors.push(`plan_item_without_obligation:${planItem.id}`);
  for (const obligation of obligations.values()) validateObligation(obligation, requirements, boundaries, outcomes, criteria, proofs, controls, specs, errors);
  for (const criterion of criteria.values()) validateCriterion(criterion, obligations, proofs, specs, errors);
  for (const proof of proofs.values()) validateProof(proof, obligations, surfaces, specs, bindings, errors);
  for (const spec of specs.values()) validateSpec(spec, requirements, planItems, obligations, bindings, criteria, proofs, boundaries, outcomes, shortcuts, assertions, errors);
  for (const control of controls.values()) validateControl(control, obligations, bindings, fixtures, assertions, specs, errors);
  validateClaimCompleteness(planItems,bindings,criteria,proofs,specs,errors);
  validateNegativeCoverage(bundle, boundaries, outcomes, shortcuts, obligations, specs, errors);
  validatePaths(bundle, bindings, specs, errors);
  return { passed: errors.length === 0, errors: [...new Set(errors)].sort(), warnings };
}

function validateRequirement(requirement: LongTaskSourceBundleV3["product"]["requirements"][number], bundle: LongTaskSourceBundleV3, surfaces: Map<string, LongTaskSourceBundleV3["product"]["owner_surfaces"][number]>, obligations: Map<string, LongTaskObligationV3>, criteria: Map<string, AcceptanceCriterionV3>, proofs: Map<string, ProofRequirementV3>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  if (requirement.owner_surface_refs.length === 0) errors.push(`requirement_without_owner_surface:${requirement.id}`);
  for (const id of requirement.owner_surface_refs) if (!surfaces.has(id)) errors.push(`requirement_unknown_owner_surface:${requirement.id}:${id}`);
  if (requirement.context_refs?.length === 0) errors.push(`context_ref_invalid:${requirement.id}:empty`);
  const linked = [...obligations.values()].filter((item) => item.source_requirement_ids.includes(requirement.id));
  if (linked.length === 0) errors.push(`product_requirement_without_pi:${requirement.id}`);
  for (const surfaceId of requirement.owner_surface_refs) {
    const surface = surfaces.get(surfaceId);
    if (surface?.kind !== "web") continue;
    const hasExact = linked.some((obligation) => obligation.implementation_bindings.some((binding) => exactWebBinding(binding, obligation.id, surfaceId, surface.location, proofs, specs)));
    if (!hasExact) errors.push(`unrelated_browser_route:${requirement.id}:${surfaceId}`);
  }
  if ((bundle.product.full_population_required || requirement.population_policy === "full_population") && !linked.some((obligation) => obligation.related_ac_ids.some((id) => criteria.get(id)?.verification_spec_ids.some((specId) => specs.get(specId)?.population_enumerator?.required_coverage_percent === 100)))) errors.push(`population_contract_incomplete:${requirement.id}`);
}

function validateObligation(obligation: LongTaskObligationV3, requirements: Map<string, { id: string }>, boundaries: Map<string, { id: string; requirement_refs:string[] }>, outcomes: Map<string, { id: string; requirement_refs:string[] }>, criteria: Map<string, AcceptanceCriterionV3>, proofs: Map<string, ProofRequirementV3>, controls: Map<string, CounterfactualControlV3>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  if (obligation.source_requirement_ids.length === 0) errors.push(`obligation_without_requirement:${obligation.id}`);
  if (obligation.implementation_bindings.length === 0) errors.push(`obligation_without_binding:${obligation.id}`);
  if (obligation.related_ac_ids.length === 0) errors.push(`obligation_without_ac:${obligation.id}`);
  if (obligation.counterfactual_control_ids.length === 0) errors.push(`obligation_without_counterfactual:${obligation.id}`);
  for (const id of obligation.source_requirement_ids) if (!requirements.has(id)) errors.push(`obligation_unknown_requirement:${obligation.id}:${id}`);
  for (const id of obligation.related_ac_ids) if (!criteria.get(id)?.obligation_refs.includes(obligation.id)) errors.push(`relation_mismatch:obligation_ac:${obligation.id}:${id}`);
  for (const id of obligation.counterfactual_control_ids) if (!controls.get(id)?.obligation_ids.includes(obligation.id)) errors.push(`relation_mismatch:obligation_counterfactual:${obligation.id}:${id}`);
  const proofIds = [...proofs.values()].filter((proof) => proof.obligation_refs.includes(obligation.id)).map((proof) => proof.id);
  if (proofIds.length === 0) errors.push(`obligation_without_proof:${obligation.id}`);
  for (const shortcut of obligation.forbidden_shortcuts) {
    if (shortcut.source_boundary_ids.length + shortcut.source_non_completing_ids.length === 0) errors.push(`forbidden_shortcut_without_source:${shortcut.id}`);
    for (const id of shortcut.source_boundary_ids) {const source=boundaries.get(id);if (!source) errors.push(`shortcut_unknown_boundary:${shortcut.id}:${id}`);else if(!source.requirement_refs.some((requirement)=>obligation.source_requirement_ids.includes(requirement)))errors.push(`unrelated_negative_assertion:${shortcut.id}:${id}`);}
    for (const id of shortcut.source_non_completing_ids) {const source=outcomes.get(id);if (!source) errors.push(`shortcut_unknown_non_completing:${shortcut.id}:${id}`);else if(!source.requirement_refs.some((requirement)=>obligation.source_requirement_ids.includes(requirement)))errors.push(`unrelated_negative_assertion:${shortcut.id}:${id}`);}
  }
  for (const binding of obligation.implementation_bindings) if (binding.verification.mode === "oracle_observation") {
    const verification = binding.verification;
    const spec = specs.get(verification.spec_id);
    const expectedKind=binding.kind==="route"?"browser_interaction":binding.kind==="runtime_capability"?"runtime_behavior":"implementation_structure";
    if (["file","path_glob"].includes(binding.kind) || !spec || !spec.claims.obligation_ids.includes(obligation.id) || !spec.claims.binding_ids.includes(binding.id) || ![...spec.positive_assertions, ...spec.negative_assertions].some((assertion) => assertion.observation_id === verification.observation_id&&assertion.observation_kind===expectedKind)) errors.push(`binding_without_observer:${binding.id}`);
  } else if(!["file","path_glob"].includes(binding.kind))errors.push(`binding_without_observer:${binding.id}`);
}

function validateCriterion(criterion: AcceptanceCriterionV3, obligations: Map<string, LongTaskObligationV3>, proofs: Map<string, ProofRequirementV3>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  if (criterion.obligation_refs.length === 0) errors.push(`ac_without_obligation:${criterion.id}`);
  if (criterion.validates.length === 0) errors.push(`empty_validates:${criterion.id}`);
  if (criterion.does_not_validate.length === 0) errors.push(`empty_does_not_validate:${criterion.id}`);
  if (criterion.proof_requirement_refs.length === 0) errors.push(`ac_without_proof:${criterion.id}`);
  if (criterion.verification_spec_ids.length === 0) errors.push(`ac_without_verifier:${criterion.id}`);
  for (const id of criterion.obligation_refs) if (!obligations.get(id)?.related_ac_ids.includes(criterion.id)) errors.push(`relation_mismatch:ac_obligation:${criterion.id}:${id}`);
  for (const id of criterion.proof_requirement_refs) if (!proofs.get(id)?.obligation_refs.some((obligation) => criterion.obligation_refs.includes(obligation))) errors.push(`relation_mismatch:ac_proof:${criterion.id}:${id}`);
  for (const id of criterion.verification_spec_ids) if (!specs.get(id)?.claims.ac_ids.includes(criterion.id)) errors.push(`relation_mismatch:ac_spec:${criterion.id}:${id}`);
}

function validateProof(proof: ProofRequirementV3, obligations: Map<string, LongTaskObligationV3>, surfaces: Map<string, { id: string }>, specs: Map<string, VerificationSpecV3>, bindings: Map<string, ImplementationBindingV3>, errors: string[]): void {
  if (proof.obligation_refs.length === 0 || proof.verification_spec_ids.length === 0) errors.push(`proof_without_spec:${proof.id}`);
  for (const id of proof.obligation_refs) if (!obligations.has(id)) errors.push(`proof_unknown_obligation:${proof.id}:${id}`);
  for (const id of proof.owner_surface_refs) if (!surfaces.has(id)) errors.push(`proof_unknown_owner_surface:${proof.id}:${id}`);
  for (const id of proof.verification_spec_ids) { const spec=specs.get(id); if (!spec || !spec.proof_capabilities.includes(proof.proof_surface) || !spec.claims.proof_requirement_ids.includes(proof.id)) errors.push(`proof_surface_without_capability:${proof.id}:${id}`); }
  const observationKind:Partial<Record<ProofRequirementV3["proof_surface"],string>>={ui_browser:"browser_interaction",runtime_behavior:"runtime_behavior",api_contract:"api_contract",data_state:"data_state",security_boundary:"security_boundary",population_coverage:"population_coverage",implementation_structure:"implementation_structure"};
  if(!proof.verification_spec_ids.some((id)=>{const spec=specs.get(id);if(!spec)return false;const typed=spec.positive_assertions.some((assertion)=>assertion.observation_kind===observationKind[proof.proof_surface]);const staticStructure=proof.proof_surface==="implementation_structure"&&spec.claims.binding_ids.some((bindingId)=>["file","path_glob"].includes(bindings.get(bindingId)?.kind??""));return typed||staticStructure;}))errors.push(`proof_surface_without_capability:${proof.id}:observation`);
  if (proof.proof_surface === "ui_browser" && !proof.verification_spec_ids.some((id) => { const spec=specs.get(id);return spec?.command_steps.some((step)=>step.tool==="playwright_test")&&spec.positive_assertions.some((assertion)=>assertion.observation_kind==="browser_interaction")&&spec.claims.binding_ids.some((bindingId) => bindings.get(bindingId)?.kind === "route"); })) errors.push(`proof_surface_without_capability:${proof.id}:ui_browser`);
}

function validateSpec(spec: VerificationSpecV3, requirements:Map<string,{id:string}>, planItems: Map<string, LongTaskSourceBundleV3["plan"]["plan_items"][number]>, obligations: Map<string, LongTaskObligationV3>, bindings: Map<string, ImplementationBindingV3>, criteria: Map<string, AcceptanceCriterionV3>, proofs: Map<string, ProofRequirementV3>, boundaries: Map<string, { id: string }>, outcomes: Map<string, { id: string }>, shortcuts: Map<string, { id: string }>, assertions: Map<string, { id: string }>, errors: string[]): void {
  validatePrestableExecutionSurface(spec, errors);
  for (const [family, ids, owner] of [["requirement",spec.claims.requirement_ids,requirements],["plan_item",spec.claims.plan_item_ids,planItems],["obligation",spec.claims.obligation_ids,obligations],["binding",spec.claims.binding_ids,bindings],["ac",spec.claims.ac_ids,criteria],["proof",spec.claims.proof_requirement_ids,proofs]] as const) { if (ids.length === 0) errors.push(`spec_claims_empty:${spec.id}:${family}`); for(const id of ids)if(!owner.has(id))errors.push(`spec_claims_unknown:${spec.id}:${family}:${id}`); }
  if (spec.proof_capabilities.length === 0) errors.push(`proof_surface_without_capability:${spec.id}`);
  if (!spec.oracle.entrypoint) errors.push(`ac_without_verifier:${spec.id}:oracle`);
  if (spec.positive_assertions.length + spec.negative_assertions.length === 0) errors.push(`manual_only_ac:${spec.id}`);
  const checks=[...spec.positive_assertions,...spec.negative_assertions].map((item)=>({id:item.observation_id})); map(checks,`observation_${spec.id}`,errors);
  for (const assertion of spec.negative_assertions) {
    for (const id of assertion.source_boundary_ids) if (!boundaries.has(id)) errors.push(`negative_unknown_boundary:${assertion.id}:${id}`);
    for (const id of assertion.source_non_completing_ids) if (!outcomes.has(id)) errors.push(`negative_unknown_non_completing:${assertion.id}:${id}`);
    for (const id of assertion.source_forbidden_shortcut_ids) if (!shortcuts.has(id)) errors.push(`negative_unknown_shortcut:${assertion.id}:${id}`);
  }
  for (const obligationId of spec.claims.obligation_ids) { const obligation=obligations.get(obligationId); if(!obligation)continue; if(!spec.claims.plan_item_ids.some((id)=>planItems.get(id)?.obligations.some((item)=>item.id===obligationId)))errors.push(`relation_mismatch:spec_plan_item:${spec.id}:${obligationId}`); if(!obligation.source_requirement_ids.some((id)=>spec.claims.requirement_ids.includes(id)))errors.push(`relation_mismatch:spec_requirement:${spec.id}:${obligationId}`); }
  for (const id of spec.claims.binding_ids) if (![...obligations.values()].some((obligation) => spec.claims.obligation_ids.includes(obligation.id) && obligation.implementation_bindings.some((binding) => binding.id === id))) errors.push(`relation_mismatch:spec_binding:${spec.id}:${id}`);
  for (const id of spec.claims.ac_ids) if (!criteria.get(id)?.verification_spec_ids.includes(spec.id)) errors.push(`relation_mismatch:spec_ac:${spec.id}:${id}`);
  for (const id of spec.claims.proof_requirement_ids) if (!proofs.get(id)?.verification_spec_ids.includes(spec.id)) errors.push(`relation_mismatch:spec_proof:${spec.id}:${id}`);
  for(const step of spec.command_steps)for(const ref of step.environment_refs)if(!spec.environment_refs.includes(ref))errors.push(`undeclared_environment_ref:${spec.id}:${step.id}:${ref}`);
  if (spec.population_enumerator && !spec.positive_assertions.some((assertion) => assertion.observation_id === spec.population_enumerator!.observation_id && assertion.observation_kind === "population_coverage")) errors.push(`population_contract_incomplete:${spec.id}:enumerator_assertion`);
  for (const assertion of [...spec.positive_assertions,...spec.negative_assertions]) if(!assertions.has(assertion.id))errors.push(`assertion_missing:${assertion.id}`);
}

function validatePrestableExecutionSurface(spec: VerificationSpecV3, errors: string[]): void {
  if (spec.network_policy.mode !== "none" || spec.network_policy.allowed_hosts.length > 0) {
    errors.push(`prestable_unsupported_network_policy:${spec.id}`);
  }
  if (spec.environment_refs.length > 0 || spec.environment_requirements.length > 0) {
    errors.push(`prestable_unsupported_environment:${spec.id}`);
  }
  if (spec.command_steps.length !== 1) {
    errors.push(`prestable_unsupported_command_steps:${spec.id}:count`);
    return;
  }
  const step = spec.command_steps[0];
  if (
    step.tool !== "node_script"
    || step.target !== spec.oracle.entrypoint
    || step.argv.length > 0
    || step.cwd !== spec.cwd
    || step.timeout_ms !== spec.timeout_ms
    || step.environment_refs.length > 0
    || step.output_artifact_ids.length > 0
  ) {
    errors.push(`prestable_unsupported_command_steps:${spec.id}:${step.id}`);
  }
}

function validateControl(control: CounterfactualControlV3, obligations: Map<string, LongTaskObligationV3>, bindings: Map<string, ImplementationBindingV3>, fixtures: Map<string, { id: string }>, assertions: Map<string, { id: string }>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  if (control.expected_failed_assertion_ids.length === 0) errors.push(`counterfactual_without_assertion:${control.id}`);
  for (const id of control.obligation_ids) if (!obligations.get(id)?.counterfactual_control_ids.includes(control.id)) errors.push(`relation_mismatch:counterfactual_obligation:${control.id}:${id}`);
  for (const id of control.expected_failed_assertion_ids) if (!assertions.has(id) || ![...specs.values()].some((spec) => spec.claims.obligation_ids.some((obligation) => control.obligation_ids.includes(obligation)) && [...spec.positive_assertions,...spec.negative_assertions].some((assertion) => assertion.id === id))) errors.push(`counterfactual_unknown_assertion:${control.id}:${id}`);
  const mutation=control.mutation; const bindingIds="binding_ids" in mutation?mutation.binding_ids:[mutation.binding_id];const owner=obligations.get(control.obligation_ids[0]);for(const id of bindingIds)if(!bindings.has(id)||!owner?.implementation_bindings.some((binding)=>binding.id===id))errors.push(`counterfactual_wrong_binding_target:${control.id}:${id}`); if(mutation.type==="remove_binding_targets"&&bindingIds.some((id)=>!["file","path_glob"].includes(bindings.get(id)?.kind??"")))errors.push(`counterfactual_wrong_binding_target:${control.id}:non-static`);if("fixture_id" in mutation&&!fixtures.has(mutation.fixture_id))errors.push(`counterfactual_unknown_fixture:${control.id}:${mutation.fixture_id}`);
}

function validateNegativeCoverage(bundle: LongTaskSourceBundleV3, boundaries: Map<string, LongTaskSourceBundleV3["product"]["boundaries"][number]>, outcomes: Map<string, LongTaskSourceBundleV3["product"]["non_completing_outcomes"][number]>, shortcuts: Map<string, LongTaskSourceBundleV3["plan"]["plan_items"][number]["obligations"][number]["forbidden_shortcuts"][number]>, obligations: Map<string, LongTaskObligationV3>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  const negatives=bundle.checklist.verification_specs.flatMap((spec)=>spec.negative_assertions.map((assertion)=>({spec,assertion})));
  for(const item of boundaries.values())if(!negatives.some(({spec,assertion})=>assertion.source_boundary_ids.includes(item.id)&&item.requirement_refs.some((id)=>spec.claims.requirement_ids.includes(id))))errors.push(`boundary_without_executable_negative_assertion:${item.id}`);
  for(const item of outcomes.values())if(!negatives.some(({spec,assertion})=>assertion.source_non_completing_ids.includes(item.id)&&item.requirement_refs.some((id)=>spec.claims.requirement_ids.includes(id))))errors.push(`non_completing_without_executable_negative_assertion:${item.id}`);
  for(const item of shortcuts.values())if(!negatives.some(({spec,assertion})=>assertion.source_forbidden_shortcut_ids.includes(item.id)&&[...obligations.values()].some((obligation)=>obligation.forbidden_shortcuts.some((shortcut)=>shortcut.id===item.id)&&spec.claims.obligation_ids.includes(obligation.id))))errors.push(`forbidden_shortcut_without_executable_negative_assertion:${item.id}`);
  for(const {spec,assertion} of negatives){const related=[...assertion.source_boundary_ids.flatMap((id)=>boundaries.get(id)?.requirement_refs??[]),...assertion.source_non_completing_ids.flatMap((id)=>outcomes.get(id)?.requirement_refs??[])];const shortcutRelated=assertion.source_forbidden_shortcut_ids.some((id)=>[...obligations.values()].some((obligation)=>obligation.forbidden_shortcuts.some((shortcut)=>shortcut.id===id)&&spec.claims.obligation_ids.includes(obligation.id)));if((related.length>0&&!related.some((id)=>spec.claims.requirement_ids.includes(id)))||(assertion.source_forbidden_shortcut_ids.length>0&&!shortcutRelated))errors.push(`unrelated_negative_assertion:${assertion.id}:${spec.id}`);}
}

function validatePaths(bundle: LongTaskSourceBundleV3, bindings: Map<string, ImplementationBindingV3>, specs: Map<string, VerificationSpecV3>, errors: string[]): void {
  for(const requirement of bundle.product.requirements)for(const ref of requirement.context_refs??[])try{assertSafeContractPath(ref,"context_ref");if(!ref.startsWith("project_context/"))throw new Error("outside project_context");}catch(error){errors.push(`context_ref_invalid:${requirement.id}:${message(error)}`);}
  for(const binding of bindings.values())if(binding.kind==="file"||binding.kind==="path_glob")try{assertLongTaskAuthorPath(binding.target,`binding ${binding.id}`);}catch(error){errors.push(`${message(error).startsWith("protected_path_declared")?"protected_path_declared":"unsafe_path"}:${binding.id}:${message(error)}`);}
  for(const spec of specs.values())try{const paths=[spec.oracle.entrypoint,...spec.input_paths,...spec.command_steps.filter((step)=>step.tool==="node_script"||step.tool==="playwright_test").map((step)=>step.target)];assertNoCaseCollisions(paths,`${spec.id} paths`);assertLongTaskAuthorPath(spec.oracle.entrypoint,`${spec.id}.oracle`);for(const input of spec.input_paths)assertLongTaskAuthorPath(input,`${spec.id}.input`);if(spec.cwd!==".")assertLongTaskAuthorPath(spec.cwd,`${spec.id}.cwd`);for(const step of spec.command_steps){if(step.cwd!==".")assertLongTaskAuthorPath(step.cwd,`${step.id}.cwd`);if(step.tool==="node_script"||step.tool==="playwright_test")assertLongTaskAuthorPath(step.target,`${step.id}.target`);}}catch(error){errors.push(`${message(error).startsWith("protected_path_declared")?"protected_path_declared":"unsafe_path"}:${spec.id}:${message(error)}`);}
  const productPaths=[...bindings.values()].filter((binding)=>binding.kind==="file"||binding.kind==="path_glob").map((binding)=>binding.target);for(const spec of specs.values()){const oracle=spec.oracle.entrypoint;if(productPaths.some((binding)=>pathsOverlap(binding,oracle)))errors.push(`oracle_authored_by_same_product_attempt:${spec.id}:${oracle}`);}
}

function map<T extends {id:string}>(items: T[], label: string, errors: string[]): Map<string,T> { const result=new Map<string,T>();for(const item of items){if(result.has(item.id))errors.push(`duplicate_${label}:${item.id}`);else result.set(item.id,item);}return result; }
function exactWebBinding(binding:ImplementationBindingV3,obligationId:string,surfaceId:string,location:string,proofs:Map<string,ProofRequirementV3>,specs:Map<string,VerificationSpecV3>):boolean{if(binding.kind!=="route"||binding.target!==location||binding.verification.mode!=="oracle_observation")return false;const {spec_id:specId,observation_id:observationId}=binding.verification;const spec=specs.get(specId);return !!spec&&spec.proof_capabilities.includes("ui_browser")&&spec.command_steps.some((step)=>step.tool==="playwright_test")&&spec.positive_assertions.some((assertion)=>assertion.observation_id===observationId&&assertion.observation_kind==="browser_interaction")&&spec.claims.obligation_ids.includes(obligationId)&&spec.claims.binding_ids.includes(binding.id)&&[...proofs.values()].some((proof)=>proof.proof_surface==="ui_browser"&&proof.owner_surface_refs.includes(surfaceId)&&proof.obligation_refs.includes(obligationId)&&proof.verification_spec_ids.includes(specId));}
function validateGlobalIds(maps: Array<Map<string,unknown>>,errors:string[]):void{const seen=new Set<string>();for(const values of maps)for(const id of values.keys()){if(seen.has(id))errors.push(`duplicate_entity_id:${id}`);seen.add(id);}}
function message(error:unknown):string{return error instanceof Error?error.message:String(error);}
function pathsOverlap(binding:string,oracle:string):boolean{const prefix=binding.replace(/\\/g,"/").replace(/\*.*$/," ").trim().replace(/\/$/,"");const candidate=oracle.replace(/\\/g,"/");return prefix.length>0&&(candidate===prefix||candidate.startsWith(`${prefix}/`));}
function uniqueSurfaceOwnership(bundle:LongTaskSourceBundleV3,errors:string[]):void{const tuples=new Set<string>();const routes=new Set<string>();for(const surface of bundle.product.owner_surfaces){const tuple=`${surface.kind}\0${surface.location}\0${surface.primary_action}`;if(tuples.has(tuple))errors.push(`duplicate_owner_surface_tuple:${surface.id}`);tuples.add(tuple);if(surface.kind==="web"){if(routes.has(surface.location))errors.push(`duplicate_owner_surface_route:${surface.location}`);routes.add(surface.location);}}}
function validateClaimCompleteness(planItems:Map<string,{id:string}>,bindings:Map<string,{id:string}>,criteria:Map<string,{id:string}>,proofs:Map<string,{id:string}>,specs:Map<string,VerificationSpecV3>,errors:string[]):void{const values=[...specs.values()];for(const [family,entities,key] of [["plan_item",planItems,"plan_item_ids"],["binding",bindings,"binding_ids"],["acceptance_criterion",criteria,"ac_ids"],["proof_requirement",proofs,"proof_requirement_ids"]] as const)for(const id of entities.keys())if(!values.some((spec)=>spec.claims[key].includes(id)))errors.push(`unclaimed_graph_node:${family}:${id}`);}
