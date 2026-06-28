import path from "node:path";
import { readText } from "./fs.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { loadSuperpowersState, recomputeStatuses, saveSuperpowersState, refreshSourceHashes } from "./superpowers-task-state.js";
import {
  asStringArray,
  type SuperpowersAcceptanceCriterion,
  type SuperpowersPlanItem,
  type SuperpowersProductArchitectureScope,
  type SuperpowersTaskState
} from "./superpowers-task-state-schema.js";

const DEFAULT_LAYERS = ["code", "test"];

export async function compileSuperpowersTask(workdir: string) {
  const state = await loadSuperpowersState(workdir);
  await refreshSourceHashes(workdir, state);
  const productSource = await readText(path.join(workdir, state.sources.product_architecture_source.path));
  const technicalPlan = await readText(path.join(workdir, state.sources.technical_realization_plan.path));
  const checklist = await readText(path.join(workdir, state.sources.acceptance_checklist.path));
  state.delivery = {
    product_architecture_scope: parseProductArchitectureScope(productSource),
    scope_conflicts: []
  };
  const planItems = parsePlanItems(technicalPlan);
  const acceptanceCriteria = parseAcceptanceCriteria(checklist);
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

function parseProductArchitectureScope(content: string): SuperpowersProductArchitectureScope {
  return {
    delivery_scope: fieldText(content, "delivery_scope") as SuperpowersProductArchitectureScope["delivery_scope"],
    full_population_required: fieldBoolean(content, "full_population_required"),
    representative_samples_validate: field(content, "representative_samples_validate"),
    representative_samples_do_not_validate: field(content, "representative_samples_do_not_validate"),
    out_of_scope_backlog: field(content, "out_of_scope_backlog")
  };
}

function parsePlanItems(content: string): Record<string, SuperpowersPlanItem> {
  const items: Record<string, SuperpowersPlanItem> = {};
  const matches = [...content.matchAll(/\b(PI-\d{3,})\b\s*[:.-]?\s*([^\n]*)/gi)];
  for (const [index, match] of matches.entries()) {
    const id = match[1].toUpperCase();
    const block = blockAfter(content, match.index ?? 0, matches[index + 1]?.index);
    items[id] = {
      requirement: cleanText(match[2]) || firstLine(block) || id,
      delivery_scope: fieldText(block, "delivery_scope") as SuperpowersPlanItem["delivery_scope"],
      capability_target: fieldText(block, "capability_target"),
      representative_samples: field(block, "representative_samples"),
      full_population_boundary: fieldText(block, "full_population_boundary"),
      non_required_population: field(block, "non_required_population"),
      owner_surfaces: field(block, "owner_surfaces"),
      forbidden_surfaces: field(block, "forbidden_surfaces"),
      implementation_paths: field(block, "implementation_paths"),
      required_tests: field(block, "required_tests"),
      status: "not_started",
      related_acs: field(block, "related_acs").map((item) => item.toUpperCase()),
      required_proof_layers: []
    };
  }
  if (Object.keys(items).length === 0) {
    items["PI-001"] = {
      requirement: firstLine(content) || "Implement technical realization plan",
      delivery_scope: "",
      capability_target: "",
      representative_samples: [],
      full_population_boundary: "",
      non_required_population: [],
      owner_surfaces: [],
      forbidden_surfaces: [],
      implementation_paths: [],
      required_tests: [],
      status: "not_started",
      related_acs: [],
      required_proof_layers: []
    };
  }
  return items;
}

function parseAcceptanceCriteria(content: string): Record<string, SuperpowersAcceptanceCriterion> {
  const items: Record<string, SuperpowersAcceptanceCriterion> = {};
  const matches = [...content.matchAll(/\b(AC-\d{3,})\b\s*[:.-]?\s*([^\n]*)/gi)];
  for (const [index, match] of matches.entries()) {
    const id = match[1].toUpperCase();
    const block = blockAfter(content, match.index ?? 0, matches[index + 1]?.index);
    const layers = field(block, "required_proof_layers").map(normalizeLayer).filter(Boolean);
    items[id] = {
      scope: cleanText(match[2]) || firstLine(block) || id,
      acceptance_scope: fieldText(block, "acceptance_scope") as SuperpowersAcceptanceCriterion["acceptance_scope"],
      ac_validates: field(block, "ac_validates"),
      ac_does_not_validate: field(block, "ac_does_not_validate"),
      sample_boundary: fieldText(block, "sample_boundary"),
      full_population_required: fieldBoolean(block, "full_population_required"),
      related_plan_items: field(block, "related_plan_items").map((item) => item.toUpperCase()),
      required_proof_layers: layers.length > 0 ? layers : DEFAULT_LAYERS,
      status: "not_run"
    };
  }
  if (Object.keys(items).length === 0) {
    items["AC-001"] = {
      scope: firstLine(content) || "Acceptance checklist item",
      acceptance_scope: "",
      ac_validates: [],
      ac_does_not_validate: [],
      sample_boundary: "",
      full_population_required: null,
      related_plan_items: [],
      required_proof_layers: DEFAULT_LAYERS,
      status: "not_run"
    };
  }
  return items;
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

function blockAfter(content: string, start: number, end: number | undefined): string {
  return content.slice(start, end ?? content.length);
}

function field(block: string, name: string): string[] {
  const text = fieldText(block, name);
  return text ? asStringArray(text) : [];
}

function fieldText(block: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*:\\s*([^\\n]+)`, "i");
  const match = pattern.exec(block);
  return match ? cleanText(match[1]) : "";
}

function fieldBoolean(block: string, name: string): boolean | null {
  const value = fieldText(block, name).toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function normalizeLayer(value: string): string {
  return value.trim().toLowerCase().replace(/[- ]+/g, "_");
}

function firstLine(content: string): string {
  return cleanText(content.split(/\r?\n/).find((line) => cleanText(line)) ?? "");
}

function cleanText(value: string): string {
  return value.replace(/^[-#*\s]+/, "").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

