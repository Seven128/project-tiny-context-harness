import path from "node:path";
import { readText } from "./fs.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { loadSuperpowersState, recomputeStatuses, saveSuperpowersState, refreshSourceHashes } from "./superpowers-task-state.js";
import { asStringArray, type SuperpowersAcceptanceCriterion, type SuperpowersPlanItem } from "./superpowers-task-state-schema.js";

const DEFAULT_LAYERS = ["code", "test"];

export async function compileSuperpowersTask(workdir: string) {
  const state = await loadSuperpowersState(workdir);
  await refreshSourceHashes(workdir, state);
  const technicalPlan = await readText(path.join(workdir, state.sources.technical_realization_plan.path));
  const checklist = await readText(path.join(workdir, state.sources.acceptance_checklist.path));
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
  recomputeStatuses(state);
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "graph_compiled", {
    plan_items: Object.keys(planItems).length,
    acceptance_criteria: Object.keys(acceptanceCriteria).length
  });
  return state;
}

function parsePlanItems(content: string): Record<string, SuperpowersPlanItem> {
  const items: Record<string, SuperpowersPlanItem> = {};
  const matches = [...content.matchAll(/\b(PI-\d{3,})\b\s*[:.-]?\s*([^\n]*)/gi)];
  for (const [index, match] of matches.entries()) {
    const id = match[1].toUpperCase();
    const block = blockAfter(content, match.index ?? 0, matches[index + 1]?.index);
    items[id] = {
      requirement: cleanText(match[2]) || firstLine(block) || id,
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
      related_plan_items: field(block, "related_plan_items").map((item) => item.toUpperCase()),
      required_proof_layers: layers.length > 0 ? layers : DEFAULT_LAYERS,
      status: "not_run"
    };
  }
  if (Object.keys(items).length === 0) {
    items["AC-001"] = {
      scope: firstLine(content) || "Acceptance checklist item",
      related_plan_items: [],
      required_proof_layers: DEFAULT_LAYERS,
      status: "not_run"
    };
  }
  return items;
}

function blockAfter(content: string, start: number, end: number | undefined): string {
  return content.slice(start, end ?? content.length);
}

function field(block: string, name: string): string[] {
  const pattern = new RegExp(`${name}\\s*:\\s*([^\\n]+)`, "i");
  const match = pattern.exec(block);
  return match ? asStringArray(match[1]) : [];
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

