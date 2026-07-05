import { computeScopeConflicts } from "./superpowers-task-compile.js";
import { ACCEPTANCE_SCOPES, isSelectedScopeFitSlice, PLAN_DELIVERY_SCOPES, PRODUCT_DELIVERY_SCOPES, SCOPE_FIT_DECISIONS } from "./superpowers-task-fields.js";
import { isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function validateDeliveryContract(state: SuperpowersTaskState, errors: string[]): void {
  const product = state.delivery?.product_architecture_scope;
  if (!isRecord(product)) {
    errors.push("Product / Architecture Source delivery scope is missing");
  } else {
    requireEnum(errors, "Product / Architecture Source delivery_scope", product.delivery_scope, PRODUCT_DELIVERY_SCOPES);
    requireBoolean(errors, "Product / Architecture Source full_population_required", product.full_population_required);
    requireArray(errors, "Product / Architecture Source representative_samples_validate", product.representative_samples_validate);
    requireArray(errors, "Product / Architecture Source representative_samples_do_not_validate", product.representative_samples_do_not_validate);
    requireArray(errors, "Product / Architecture Source out_of_scope_backlog", product.out_of_scope_backlog);
    requireEnum(errors, "Product / Architecture Source scope_fit_decision", product.scope_fit_decision, SCOPE_FIT_DECISIONS);
    requireText(errors, "Product / Architecture Source selected_scope_fit_slice", product.selected_scope_fit_slice);
    if (typeof product.selected_scope_fit_slice === "string" && product.selected_scope_fit_slice && !isSelectedScopeFitSlice(product.selected_scope_fit_slice)) {
      errors.push(`Product / Architecture Source selected_scope_fit_slice must be none or SFC-###: ${product.selected_scope_fit_slice}`);
    }
    requireText(errors, "Product / Architecture Source owner_boundary", product.owner_boundary);
    requireText(errors, "Product / Architecture Source primary_capability_path", product.primary_capability_path);
    requireArray(errors, "Product / Architecture Source non_completing_outcomes", product.non_completing_outcomes);
    requireText(errors, "Product / Architecture Source assertion_policy", product.assertion_policy);
    requireText(errors, "Product / Architecture Source source_authority", product.source_authority);
    requireText(errors, "Product / Architecture Source product_goal", product.product_goal);
  }

  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    requireEnum(errors, `${planId} delivery_scope`, item.delivery_scope, PLAN_DELIVERY_SCOPES);
    requireText(errors, `${planId} capability_target`, item.capability_target);
    requireArray(errors, `${planId} representative_samples`, item.representative_samples);
    requireText(errors, `${planId} full_population_boundary`, item.full_population_boundary);
    requireArray(errors, `${planId} non_required_population`, item.non_required_population);
    requireText(errors, `${planId} owner_boundary`, item.owner_boundary);
    requireText(errors, `${planId} primary_capability_path`, item.primary_capability_path);
    requireText(errors, `${planId} trigger_contract`, item.trigger_contract);
    requireText(errors, `${planId} state_transition_contract`, item.state_transition_contract);
    requireText(errors, `${planId} observable_result_contract`, item.observable_result_contract);
    requireText(errors, `${planId} assertion_support`, item.assertion_support);
    requireArray(errors, `${planId} required_assertion_commands`, item.required_assertion_commands);
    requireArray(errors, `${planId} invalid_implementation_shortcuts`, item.invalid_implementation_shortcuts);
    requireArray(errors, `${planId} implementation_paths`, item.implementation_paths);
  }

  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    requireEnum(errors, `${acId} acceptance_scope`, ac.acceptance_scope, ACCEPTANCE_SCOPES);
    requireArray(errors, `${acId} ac_validates`, ac.ac_validates);
    requireArray(errors, `${acId} ac_does_not_validate`, ac.ac_does_not_validate);
    requireText(errors, `${acId} sample_boundary`, ac.sample_boundary);
    requireBoolean(errors, `${acId} full_population_required`, ac.full_population_required);
    requireArray(errors, `${acId} related_plan_items`, ac.related_plan_items);
    requireArray(errors, `${acId} required_proof_layers`, ac.required_proof_layers);
    requireText(errors, `${acId} assertion_command`, ac.assertion_command);
    requireArray(errors, `${acId} assertion_artifacts`, ac.assertion_artifacts);
    requireArray(errors, `${acId} positive_assertions`, ac.positive_assertions);
    requireArray(errors, `${acId} negative_assertions`, ac.negative_assertions);
    requireBoolean(errors, `${acId} machine_blocking`, ac.machine_blocking);
    requireArray(errors, `${acId} invalid_completion_signals`, ac.invalid_completion_signals);
    requireBoolean(errors, `${acId} assertion_result_required`, ac.assertion_result_required);
  }
}

export function validateScopeConflicts(state: SuperpowersTaskState, errors: string[]): void {
  const conflicts = [...new Set([...(state.delivery?.scope_conflicts ?? []), ...computeScopeConflicts(state)])].filter(Boolean);
  for (const conflict of conflicts) {
    if (/scope_conflict_requires_decision/i.test(conflict)) {
      errors.push(conflict);
    }
  }
}

export function fullPopulationRequired(state: SuperpowersTaskState): boolean {
  return (
    state.delivery?.product_architecture_scope?.delivery_scope === "full_population_operation" ||
    state.delivery?.product_architecture_scope?.full_population_required === true ||
    Object.values(state.graph?.acceptance_criteria ?? {}).some((ac) => ac.acceptance_scope === "full_population_operation" || ac.full_population_required === true)
  );
}

function requireEnum(errors: string[], label: string, value: unknown, allowed: Set<string>): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} is missing`);
    return;
  }
  if (!allowed.has(value)) {
    errors.push(`${label} has unknown value: ${value}`);
  }
}

function requireText(errors: string[], label: string, value: unknown): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} is missing`);
  }
}

function requireBoolean(errors: string[], label: string, value: unknown): void {
  if (typeof value !== "boolean") {
    errors.push(`${label} must be true or false`);
  }
}

function requireArray(errors: string[], label: string, value: unknown): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} is missing`);
  }
}
