import { createHash } from "node:crypto";
import path from "node:path";
import { ensureDir, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { normalizeProofLayerId } from "./superpowers-task-fields.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { evaluateProofLayerAssertions, isMachineVerifiableLayer } from "./superpowers-task-assertions.js";
import { readEvidenceRecords } from "./superpowers-task-evidence-records.js";
import {
  SUPERPOWERS_TASK_STATE_JSON_SCHEMA,
  SUPERPOWERS_TASK_STATE_SCHEMA_VERSION,
  type SuperpowersSliceRecord,
  type SuperpowersTaskState,
  asStringArray,
  isRecord
} from "./superpowers-task-state-schema.js";

const SOURCE_FILES = {
  product_architecture_source: {
    path: "product-architecture-source.md",
    authority: "intent_scope_boundaries"
  },
  technical_realization_plan: {
    path: "technical-realization-plan.md",
    authority: "plan_items_execution_blueprint_conformance"
  },
  acceptance_checklist: {
    path: "acceptance-checklist.md",
    authority: "acs_completion_semantics_proof_layers"
  }
} as const;
const SLICE_PROGRESS_TYPES = new Set(["functional_gap_closed", "proof_gap_closed", "blocker_resolved", "invalid_evidence_removed"]);

export interface InitializeSuperpowersTaskOptions {
  taskId?: string;
  planSlug?: string;
  goalType?: string;
}

export async function initializeSuperpowersTask(
  workdir: string,
  options: InitializeSuperpowersTaskOptions = {}
): Promise<SuperpowersTaskState> {
  await ensureDir(path.join(workdir, "derived"));
  await writeTextIfChanged(path.join(workdir, "task-state.schema.json"), `${stableJson(SUPERPOWERS_TASK_STATE_JSON_SCHEMA)}\n`);
  for (const source of Object.values(SOURCE_FILES)) {
    const target = path.join(workdir, source.path);
    if (!(await pathExists(target))) {
      await writeTextIfChanged(target, `# ${source.path.replace(/\.md$/, "").replace(/-/g, " ")}\n`);
    }
  }
  const now = new Date().toISOString();
  const state: SuperpowersTaskState = {
    meta: {
      task_id: options.taskId ?? `SP-${compactDate(now)}-001`,
      plan_slug: options.planSlug ?? path.basename(workdir),
      created_at: now,
      updated_at: now,
      schema_version: SUPERPOWERS_TASK_STATE_SCHEMA_VERSION,
      goal_type: options.goalType ?? "implementation",
      product_goal_complete: false,
      acceptance_target_status: "not_run",
      audit_task_complete: false
    },
    sources: await sourceRecords(workdir),
    context: {
      product_context_delta: "none",
      technical_context_delta: "none",
      source_to_context_coverage: [],
      context_to_implementation_binding: []
    },
    delivery: {
      product_architecture_scope: {
        delivery_scope: "",
        full_population_required: null,
        representative_samples_validate: [],
        representative_samples_do_not_validate: [],
        out_of_scope_backlog: [],
        scope_fit_decision: "",
        selected_scope_fit_slice: "",
        owner_boundary: "",
        primary_capability_path: "",
        non_completing_outcomes: [],
        assertion_policy: "",
        source_authority: "",
        product_goal: ""
      },
      scope_conflicts: []
    },
    graph: {
      plan_items: {},
      acceptance_criteria: {},
      proof_layers: {},
      edges: []
    },
    attempts: [],
    current_attempt_id: "",
    required_command_specs: [],
    command_runs: [],
    negative_evidence_records: [],
    slices: [],
    evidence: [],
    gates: {},
    progress: emptyProgressState(),
    blockers: [],
    final: {
      product_goal_complete: false,
      acceptance_target_status: "not_run",
      audit_task_complete: false,
      completion_basis: [],
      next_required_actions: []
    }
  };
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "task_initialized", { task_id: state.meta.task_id });
  return state;
}

export async function loadSuperpowersState(workdir: string): Promise<SuperpowersTaskState> {
  return JSON.parse(await readText(path.join(workdir, "task-state.json"))) as SuperpowersTaskState;
}

export async function saveSuperpowersState(workdir: string, state: SuperpowersTaskState): Promise<void> {
  state.meta.updated_at = new Date().toISOString();
  await writeTextIfChanged(path.join(workdir, "task-state.json"), `${stableJson(state)}\n`);
}

export async function applySliceDelta(workdir: string, deltaFile: string): Promise<SuperpowersTaskState> {
  const state = await loadSuperpowersState(workdir);
  const delta = JSON.parse(await readText(deltaFile)) as Record<string, unknown>;
  const sliceId = String(delta.slice_id ?? "");
  const progressValue = isRecord(delta.progress_value) ? delta.progress_value : undefined;
  if (!sliceId) {
    throw new Error("slice_delta must include slice_id");
  }
  if (!progressValue || !String(progressValue.type ?? "").trim() || asStringArray(progressValue.closed_items).length === 0) {
    throw new Error("slice_delta must include progress_value with type and closed_items");
  }
  const progressType = String(progressValue.type);
  if (!SLICE_PROGRESS_TYPES.has(progressType)) {
    throw new Error(
      `slice_delta progress_value.type must be one of ${[...SLICE_PROGRESS_TYPES].join(", ")}; got ${progressType || "(missing)"}`
    );
  }
  const evidenceRecords = readEvidenceRecords(delta.evidence_records);
  for (const evidence of evidenceRecords) {
    const existingIndex = state.evidence.findIndex((item) => item.evidence_id === evidence.evidence_id);
    if (existingIndex >= 0) {
      state.evidence[existingIndex] = evidence;
    } else {
      state.evidence.push(evidence);
    }
  }
  const slice: SuperpowersSliceRecord = {
    slice_id: sliceId,
    slice_goal: String(delta.slice_goal ?? ""),
    touched_plan_items: asStringArray(delta.touched_plan_items),
    touched_acs: asStringArray(delta.touched_acs),
    missing_layer_classes: asStringArray(delta.missing_layer_classes),
    code_changes: asStringArray(delta.code_changes),
    evidence_records: evidenceRecords.map((item) => item.evidence_id),
    closed_layers: asStringArray(delta.closed_layers).map(normalizeProofLayerId),
    remaining_layers: asStringArray(delta.remaining_layers).map(normalizeProofLayerId),
    blockers: Array.isArray(delta.blockers) ? delta.blockers : [],
    cleanup_assertions: asStringArray(delta.cleanup_assertions),
    progress_value: {
      type: progressType,
      closed_items: asStringArray(progressValue.closed_items),
      why_it_reduces_rework: String(progressValue.why_it_reduces_rework ?? "")
    }
  };
  state.slices.push(slice);
  for (const layerId of slice.closed_layers) {
    const layer = state.graph.proof_layers[layerId];
    if (!layer) {
      continue;
    }
    layer.status = "satisfied";
    layer.evidence_ids = unique([...layer.evidence_ids, ...evidenceRecords.filter((item) => item.proves.includes(layerId)).map((item) => item.evidence_id)]);
  }
  recomputeStatuses(state);
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "slice_delta_applied", { slice_id: sliceId });
  return state;
}

export async function refreshSourceHashes(workdir: string, state: SuperpowersTaskState): Promise<void> {
  state.sources = await sourceRecords(workdir);
}

export function recomputeStatuses(state: SuperpowersTaskState): void {
  for (const [acId, ac] of Object.entries(state.graph.acceptance_criteria)) {
    const layerIds = ac.required_proof_layers.map((layer) => `${acId}.${layer}`);
    if (layerIds.length === 0) {
      ac.status = "not_run";
    } else if (layerIds.every((layerId) => layerSatisfiedForCompletion(state, layerId))) {
      ac.status = "complete";
    } else if (layerIds.some((layerId) => state.graph.proof_layers[layerId]?.status === "satisfied")) {
      ac.status = "partial";
    } else {
      ac.status = "not_run";
    }
  }
  for (const item of Object.values(state.graph.plan_items)) {
    if (item.related_acs.length > 0 && item.related_acs.every((acId) => state.graph.acceptance_criteria[acId]?.status === "complete")) {
      item.status = "complete";
    } else if (item.related_acs.some((acId) => state.graph.acceptance_criteria[acId]?.status === "partial")) {
      item.status = "partial";
    } else if (item.status === "complete") {
      item.status = "not_started";
    }
  }
}

function layerSatisfiedForCompletion(state: SuperpowersTaskState, layerId: string): boolean {
  if (state.graph.proof_layers[layerId]?.status !== "satisfied") {
    return false;
  }
  return !isMachineVerifiableLayer(layerId) || evaluateProofLayerAssertions(state, layerId).assertion_status === "passed";
}

export function emptyProgressState(): SuperpowersTaskState["progress"] {
  return {
    system_capability_progress: { status: "not_started" },
    representative_sample_progress: { status: "not_started" },
    real_object_coverage: { status: "unknown" },
    full_population_operation_progress: { status: "not_in_scope" }
  };
}

export async function sourceRecords(workdir: string): Promise<SuperpowersTaskState["sources"]> {
  const sources: SuperpowersTaskState["sources"] = {};
  for (const [key, source] of Object.entries(SOURCE_FILES)) {
    const file = path.join(workdir, source.path);
    const content = (await pathExists(file)) ? await readText(file) : "";
    sources[key] = { path: source.path, sha256: sha256(content), authority: source.authority };
  }
  return sources;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDate(value: string): string {
  return value.slice(0, 10).replace(/-/g, "");
}
