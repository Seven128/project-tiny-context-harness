import { MACHINE_VERIFIABLE_PROOF_LAYERS } from "./superpowers-task-proof-layers.js";
import {
  compileDiagnostic,
  throwCompileErrors,
  type CompileDiagnosticRecord
} from "./superpowers-task-compile-diagnostics.js";
import {
  type SuperpowersAcceptanceCriterion,
  type SuperpowersPlanItem,
  type SuperpowersProductArchitectureScope
} from "./superpowers-task-state-schema.js";

const ALLOWED_PROOF_LAYERS = new Set(["code", ...MACHINE_VERIFIABLE_PROOF_LAYERS]);

export function validateCompiledSources(
  product: SuperpowersProductArchitectureScope,
  planItems: Record<string, SuperpowersPlanItem>,
  acceptanceCriteria: Record<string, SuperpowersAcceptanceCriterion>
): void {
  const errors: CompileDiagnosticRecord[] = [];
  const planIds = new Set(Object.keys(planItems));
  const acIds = new Set(Object.keys(acceptanceCriteria));
  for (const [planId, item] of Object.entries(planItems)) {
    validatePlanItem(planId, item, acIds, acceptanceCriteria, errors);
  }
  for (const [acId, ac] of Object.entries(acceptanceCriteria)) {
    validateAcceptanceCriterion(product, acId, ac, planIds, planItems, errors);
  }
  throwCompileErrors(errors);
}

function validatePlanItem(
  planId: string,
  item: SuperpowersPlanItem,
  acIds: Set<string>,
  acceptanceCriteria: Record<string, SuperpowersAcceptanceCriterion>,
  errors: CompileDiagnosticRecord[]
): void {
  for (const acId of item.related_acs) {
    if (!acIds.has(acId)) {
      errors.push(compileDiagnostic(`${planId} references unknown related_acs ${acId}`, "blocking_unparseable_object", item.source_file, item.source_start_line, "related_acs", "dangling plan-to-AC references make the graph ambiguous", "fix related_acs to existing AC ids"));
    }
  }
  if (item.delivery_scope !== "out_of_scope_backlog" && item.implementation_paths.length === 0) {
    errors.push(compileDiagnostic(`${planId} missing implementation_paths`, "blocking_missing_primary_path", item.source_file, item.source_start_line, "implementation_paths", "plan conformance needs an implementation owner path", "add implementation_paths or mark the item out_of_scope_backlog"));
  }
  if (item.owner_surfaces.length > 0) {
    const related = item.related_acs.length > 0 ? item.related_acs : Object.keys(acceptanceCriteria);
    const hasUiLayer = related.some((acId) => acceptanceCriteria[acId]?.required_proof_layers.includes("ui_browser"));
    if (!hasUiLayer) {
      errors.push(compileDiagnostic(`${planId} owner_surfaces requires a ui_browser proof layer`, "blocking_missing_owner_boundary", item.source_file, item.source_start_line, "owner_surfaces", "owner-surface work must have browser proof on the owner route", "add ui_browser to a related AC required_proof_layers"));
    }
  }
}

function validateAcceptanceCriterion(
  product: SuperpowersProductArchitectureScope,
  acId: string,
  ac: SuperpowersAcceptanceCriterion,
  planIds: Set<string>,
  planItems: Record<string, SuperpowersPlanItem>,
  errors: CompileDiagnosticRecord[]
): void {
  for (const planId of ac.related_plan_items) {
    if (!planIds.has(planId)) {
      errors.push(compileDiagnostic(`${acId} references unknown related_plan_items ${planId}`, "blocking_unparseable_object", ac.source_file, ac.source_start_line, "related_plan_items", "dangling AC-to-plan references make the graph ambiguous", "fix related_plan_items to existing PI ids"));
    }
  }
  for (const layer of ac.required_proof_layers) {
    if (!ALLOWED_PROOF_LAYERS.has(layer)) {
      errors.push(compileDiagnostic(`${acId} has invalid required_proof_layers ${layer}`, "blocking_unparseable_object", ac.source_file, ac.source_start_line, "required_proof_layers", "unknown proof layers cannot be evaluated", "use code or a supported machine-verifiable proof layer"));
    }
  }
  if (ac.ac_validates.length === 0) {
    errors.push(compileDiagnostic(`${acId} missing observable acceptance result`, "blocking_missing_observable_result", ac.source_file, ac.source_start_line, "ac_validates", "ACs need an observable result before evidence can prove completion", "add concrete ac_validates outcomes"));
  }
  const machineRequirements = (ac.assertion_requirements ?? []).filter((item) => item.machine_blocking);
  if (machineRequirements.some((item) => item.positive_assertions.length === 0)) {
    errors.push(compileDiagnostic(`${acId} machine-verifiable proof layer lacks positive assertion requirements`, "blocking_missing_assertion_spec", ac.source_file, ac.source_start_line, "assertion_requirements", "machine-verifiable ACs need observable positive assertions", "add ac_validates, required_test_ids, test_cases or final_evidence_expected"));
  }
  if (machineRequirements.some((item) => item.negative_assertions.length === 0)) {
    errors.push(compileDiagnostic(`${acId} machine-verifiable proof layer lacks negative assertion requirements`, "blocking_missing_invalid_evidence", ac.source_file, ac.source_start_line, "invalid_evidence", "negative assertions prevent forbidden completion shortcuts", "add ac_does_not_validate, fail_conditions or invalid_evidence"));
  }
  const relatedPlans = ac.related_plan_items.map((planId) => planItems[planId]).filter(Boolean);
  if (ac.full_population_required === true && relatedPlans.length > 0 && relatedPlans.every((item) => item.delivery_scope === "representative_sample_validation")) {
    errors.push(compileDiagnostic(`${acId} full-population AC is backed only by representative sample plan items`, "blocking_scope_conflict", ac.source_file, ac.source_start_line, "full_population_required", "sample-only plan items cannot prove full-population acceptance", "add a full_population_operation plan item or change the AC boundary"));
  }
  const productNonCompleting = product.representative_samples_do_not_validate.join("\n");
  if (productNonCompleting && !containsAny(ac.ac_does_not_validate, product.representative_samples_do_not_validate)) {
    errors.push(compileDiagnostic(`${acId} does not represent Product non-completing outcomes`, "blocking_missing_invalid_evidence", ac.source_file, ac.source_start_line, "ac_does_not_validate", "Product non-completing outcomes must remain visible in AC invalid evidence", "add matching ac_does_not_validate or invalid_evidence entries"));
  }
}

function containsAny(values: string[], needles: string[]): boolean {
  const text = values.join("\n").toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}
