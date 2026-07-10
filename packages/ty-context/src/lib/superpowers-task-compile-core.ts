import { compileReportSuffix } from "./superpowers-task-compile-diagnostics.js";
import { validateCompiledSources } from "./superpowers-task-compile-guards.js";
import { deriveRequiredCommandSpecsFromAcceptanceCriteria } from "./superpowers-task-command-specs.js";
import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";
import {
  DEFAULT_LAYERS,
  parseAcceptanceCriteria,
  parsePlanItems,
  parseProductArchitectureScope
} from "./superpowers-task-source-compile.js";

export interface CompositeSourceDocument {
  path: string;
  content: string;
}

export interface CompositeSourceBundle {
  product_architecture_source: CompositeSourceDocument;
  technical_realization_plan: CompositeSourceDocument;
  acceptance_checklist: CompositeSourceDocument;
}

export interface CompositeCompiledSourceBundle {
  delivery: SuperpowersTaskState["delivery"];
  graph: SuperpowersTaskState["graph"];
  required_command_specs: SuperpowersTaskState["required_command_specs"];
  progress: SuperpowersTaskState["progress"];
}

export function compileCompositeSourceBundle(bundle: CompositeSourceBundle): CompositeCompiledSourceBundle {
  const product = parseProductArchitectureScope(
    bundle.product_architecture_source.content,
    bundle.product_architecture_source.path
  );
  const planItems = parsePlanItems(
    bundle.technical_realization_plan.content,
    bundle.technical_realization_plan.path
  );
  const acceptanceCriteria = parseAcceptanceCriteria(
    bundle.acceptance_checklist.content,
    bundle.acceptance_checklist.path
  );
  validateCompiledSources(product, planItems, acceptanceCriteria);

  const acIds = Object.keys(acceptanceCriteria);
  for (const item of Object.values(planItems)) {
    if (item.related_acs.length === 0) {
      item.related_acs = acIds;
    }
    item.required_proof_layers = item.related_acs.flatMap((acId) =>
      (acceptanceCriteria[acId]?.required_proof_layers ?? DEFAULT_LAYERS).map((layer) => `${acId}.${layer}`)
    );
  }
  const planIds = Object.keys(planItems);
  for (const ac of Object.values(acceptanceCriteria)) {
    if (ac.related_plan_items.length === 0) {
      ac.related_plan_items = [...planIds];
    }
  }

  const graph: SuperpowersTaskState["graph"] = {
    plan_items: planItems,
    acceptance_criteria: acceptanceCriteria,
    proof_layers: {},
    edges: Object.entries(planItems).flatMap(([planId, item]) =>
      item.related_acs.map((acId) => ({ from: planId, to: acId, type: "supports" }))
    )
  };
  for (const [acId, ac] of Object.entries(acceptanceCriteria)) {
    for (const layer of ac.required_proof_layers) {
      graph.proof_layers[`${acId}.${layer}`] = { required: true, status: "missing", evidence_ids: [] };
    }
  }

  const projection: CompositeCompiledSourceBundle = {
    delivery: { product_architecture_scope: product, scope_conflicts: [] },
    graph,
    required_command_specs: deriveRequiredCommandSpecsFromAcceptanceCriteria(acceptanceCriteria),
    progress: compileProgress(product, planItems, acceptanceCriteria)
  };
  projection.delivery.scope_conflicts = computeScopeConflicts(projection);
  return projection;
}

export function computeScopeConflicts(
  state: Pick<SuperpowersTaskState, "delivery" | "graph">
): string[] {
  const conflicts: string[] = [];
  const product = state.delivery?.product_architecture_scope;
  const productScope = product?.delivery_scope ?? "";
  const productRequiresFullPopulation = productScope === "full_population_operation";
  const productIsCapabilityOnly =
    productScope === "system_capability_build" ||
    productScope === "representative_sample_validation" ||
    product?.full_population_required === false;

  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    if (productRequiresFullPopulation && item.delivery_scope !== "full_population_operation" && item.delivery_scope !== "out_of_scope_backlog") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source requires full_population_operation but ${planId} delivery_scope=${item.delivery_scope || "missing"}${compileReportSuffix("blocking_scope_conflict", item.source_file, item.source_start_line, "delivery_scope", "Product source and plan delivery scopes disagree", "align the source, plan and checklist delivery scope")}`
      );
    }
    if (productIsCapabilityOnly && item.delivery_scope === "full_population_operation" && productScope !== "mixed_scope_requires_boundary") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source delivery_scope=${productScope || "missing"} but ${planId} delivery_scope=full_population_operation${compileReportSuffix("blocking_scope_conflict", item.source_file, item.source_start_line, "delivery_scope", "Product source and plan delivery scopes disagree", "align the source, plan and checklist delivery scope")}`
      );
    }
  }

  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    if (productRequiresFullPopulation && (ac.acceptance_scope === "full_population_not_required" || ac.full_population_required === false)) {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source requires full_population_operation but ${acId} full_population_required=false${compileReportSuffix("blocking_scope_conflict", ac.source_file, ac.source_start_line, "full_population_required", "Product source and checklist full-population requirements disagree", "align the source, plan and checklist delivery scope")}`
      );
    }
    if (productIsCapabilityOnly && (ac.acceptance_scope === "full_population_operation" || ac.full_population_required === true) && productScope !== "mixed_scope_requires_boundary") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source delivery_scope=${productScope || "missing"} but ${acId} acceptance_scope=full_population_operation${compileReportSuffix("blocking_scope_conflict", ac.source_file, ac.source_start_line, "acceptance_scope", "Product source and checklist delivery scopes disagree", "align the source, plan and checklist delivery scope")}`
      );
    }
  }

  return unique(conflicts);
}

function compileProgress(
  product: SuperpowersTaskState["delivery"]["product_architecture_scope"],
  planItems: SuperpowersTaskState["graph"]["plan_items"],
  acceptanceCriteria: SuperpowersTaskState["graph"]["acceptance_criteria"]
): SuperpowersTaskState["progress"] {
  const planEntries = Object.entries(planItems);
  const sampleNames = unique([
    ...product.representative_samples_validate,
    ...planEntries.flatMap(([, item]) => item.representative_samples)
  ]);
  const systemPlanIds = planEntries.filter(([, item]) => item.delivery_scope === "system_capability_build").map(([planId]) => planId);
  const representativePlanIds = planEntries.filter(([, item]) => item.delivery_scope === "representative_sample_validation").map(([planId]) => planId);
  const fullPopulationRequired =
    product.delivery_scope === "full_population_operation" ||
    product.full_population_required === true ||
    Object.values(acceptanceCriteria).some((ac) => ac.acceptance_scope === "full_population_operation" || ac.full_population_required === true);
  return {
    system_capability_progress: {
      status: systemPlanIds.length > 0 ? "not_started" : "not_in_scope",
      plan_items: systemPlanIds
    },
    representative_sample_progress: {
      status: sampleNames.length > 0 || representativePlanIds.length > 0 ? "not_started" : "not_in_scope",
      plan_items: representativePlanIds,
      samples: sampleNames
    },
    real_object_coverage: {
      status: sampleNames.length > 0 ? "sampled_only" : "unknown",
      covered_objects: sampleNames
    },
    full_population_operation_progress: {
      status: fullPopulationRequired ? "not_started" : "not_in_scope"
    }
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
