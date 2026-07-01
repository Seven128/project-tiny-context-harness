import path from "node:path";
import { readText } from "./fs.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { loadSuperpowersState, recomputeStatuses, saveSuperpowersState, refreshSourceHashes } from "./superpowers-task-state.js";
import { type SuperpowersTaskState } from "./superpowers-task-state-schema.js";
import { DEFAULT_LAYERS, parseAcceptanceCriteria, parsePlanItems, parseProductArchitectureScope } from "./superpowers-task-source-compile.js";

export async function compileSuperpowersTask(workdir: string) {
  const state = await loadSuperpowersState(workdir);
  await refreshSourceHashes(workdir, state);
  const productSource = await readText(path.join(workdir, state.sources.product_architecture_source.path));
  const technicalPlan = await readText(path.join(workdir, state.sources.technical_realization_plan.path));
  const checklist = await readText(path.join(workdir, state.sources.acceptance_checklist.path));
  state.delivery = {
    product_architecture_scope: parseProductArchitectureScope(productSource, state.sources.product_architecture_source.path),
    scope_conflicts: []
  };
  const planItems = parsePlanItems(technicalPlan, state.sources.technical_realization_plan.path);
  const acceptanceCriteria = parseAcceptanceCriteria(checklist, state.sources.acceptance_checklist.path);
  const acIds = Object.keys(acceptanceCriteria);
  for (const [planId, item] of Object.entries(planItems)) {
    if (item.related_acs.length === 0) {
      item.related_acs = acIds;
    }
    item.required_proof_layers = item.related_acs.flatMap((acId) =>
      (acceptanceCriteria[acId]?.required_proof_layers ?? DEFAULT_LAYERS).map((layer) => `${acId}.${layer}`)
    );
  }
  for (const [acId, ac] of Object.entries(acceptanceCriteria)) {
    if (ac.related_plan_items.length === 0) {
      ac.related_plan_items = Object.keys(planItems);
    }
  }
  state.graph.plan_items = planItems;
  state.graph.acceptance_criteria = acceptanceCriteria;
  state.graph.proof_layers = {};
  for (const [acId, ac] of Object.entries(acceptanceCriteria)) {
    for (const layer of ac.required_proof_layers) {
      state.graph.proof_layers[`${acId}.${layer}`] = { required: true, status: "missing", evidence_ids: [] };
    }
  }
  state.graph.edges = Object.entries(planItems).flatMap(([planId, item]) =>
    item.related_acs.map((acId) => ({ from: planId, to: acId, type: "supports" }))
  );
  state.delivery.scope_conflicts = computeScopeConflicts(state);
  state.progress = compileProgress(state);
  recomputeStatuses(state);
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "graph_compiled", {
    plan_items: Object.keys(planItems).length,
    acceptance_criteria: Object.keys(acceptanceCriteria).length
  });
  return state;
}

export function computeScopeConflicts(state: SuperpowersTaskState): string[] {
  const conflicts: string[] = [];
  const product = state.delivery?.product_architecture_scope;
  const productScope = product?.delivery_scope ?? "";
  const productRequiresFullPopulation = productScope === "full_population_operation" || product?.full_population_required === true;
  const productIsCapabilityOnly =
    productScope === "system_capability_build" ||
    productScope === "representative_sample_validation" ||
    product?.full_population_required === false;

  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    if (productRequiresFullPopulation && item.delivery_scope !== "full_population_operation" && item.delivery_scope !== "out_of_scope_backlog") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source requires full_population_operation but ${planId} delivery_scope=${item.delivery_scope || "missing"}`
      );
    }
    if (productIsCapabilityOnly && item.delivery_scope === "full_population_operation" && productScope !== "mixed_scope_requires_boundary") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source delivery_scope=${productScope || "missing"} but ${planId} delivery_scope=full_population_operation`
      );
    }
  }

  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    if (productRequiresFullPopulation && (ac.acceptance_scope === "full_population_not_required" || ac.full_population_required === false)) {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source requires full_population_operation but ${acId} full_population_required=false`
      );
    }
    if (productIsCapabilityOnly && (ac.acceptance_scope === "full_population_operation" || ac.full_population_required === true) && productScope !== "mixed_scope_requires_boundary") {
      conflicts.push(
        `scope_conflict_requires_decision: Product / Architecture Source delivery_scope=${productScope || "missing"} but ${acId} acceptance_scope=full_population_operation`
      );
    }
  }

  return [...new Set(conflicts)];
}

function compileProgress(state: SuperpowersTaskState): SuperpowersTaskState["progress"] {
  const planEntries = Object.entries(state.graph.plan_items);
  const sampleNames = unique([
    ...state.delivery.product_architecture_scope.representative_samples_validate,
    ...planEntries.flatMap(([, item]) => item.representative_samples)
  ]);
  const systemPlanIds = planEntries.filter(([, item]) => item.delivery_scope === "system_capability_build").map(([planId]) => planId);
  const representativePlanIds = planEntries.filter(([, item]) => item.delivery_scope === "representative_sample_validation").map(([planId]) => planId);
  const fullPopulationRequired =
    state.delivery.product_architecture_scope.delivery_scope === "full_population_operation" ||
    state.delivery.product_architecture_scope.full_population_required === true ||
    Object.values(state.graph.acceptance_criteria).some((ac) => ac.acceptance_scope === "full_population_operation" || ac.full_population_required === true);
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

