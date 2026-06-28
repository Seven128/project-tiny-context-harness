import { computeScopeConflicts } from "./superpowers-task-compile.js";
import { isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

const PRODUCT_DELIVERY_SCOPES = new Set([
  "system_capability_build",
  "representative_sample_validation",
  "full_population_operation",
  "mixed_scope_requires_boundary"
]);
const PLAN_DELIVERY_SCOPES = new Set([
  "system_capability_build",
  "representative_sample_validation",
  "full_population_operation",
  "out_of_scope_backlog"
]);
const ACCEPTANCE_SCOPES = new Set([
  "system_capability_build",
  "representative_sample_validation",
  "full_population_operation",
  "full_population_not_required"
]);

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
  }

  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    requireEnum(errors, `${planId} delivery_scope`, item.delivery_scope, PLAN_DELIVERY_SCOPES);
    requireText(errors, `${planId} capability_target`, item.capability_target);
    requireArray(errors, `${planId} representative_samples`, item.representative_samples);
    requireText(errors, `${planId} full_population_boundary`, item.full_population_boundary);
    requireArray(errors, `${planId} non_required_population`, item.non_required_population);
  }

  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    requireEnum(errors, `${acId} acceptance_scope`, ac.acceptance_scope, ACCEPTANCE_SCOPES);
    requireArray(errors, `${acId} ac_validates`, ac.ac_validates);
    requireArray(errors, `${acId} ac_does_not_validate`, ac.ac_does_not_validate);
    requireText(errors, `${acId} sample_boundary`, ac.sample_boundary);
    requireBoolean(errors, `${acId} full_population_required`, ac.full_population_required);
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
