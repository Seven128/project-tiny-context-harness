import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import {
  compileDiagnostic,
  throwCompileErrors,
  type CompileDiagnosticRecord
} from "./superpowers-task-compile-diagnostics.js";
import { compileCompositeSourceBundle } from "./superpowers-task-compile-core.js";
import { startSuperpowersAttempt } from "./superpowers-task-attempt.js";
import { loadSuperpowersState, recomputeStatuses, saveSuperpowersState, refreshSourceHashes } from "./superpowers-task-state.js";
import type { SuperpowersAttemptMode, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export { computeScopeConflicts } from "./superpowers-task-compile-core.js";

export async function compileSuperpowersTask(workdir: string, options: { mode?: SuperpowersAttemptMode } = {}) {
  const state = await loadSuperpowersState(workdir);
  await refreshSourceHashes(workdir, state);
  await assertRequiredSourcesExist(workdir, state);
  const compiled = compileCompositeSourceBundle({
    product_architecture_source: {
      path: state.sources.product_architecture_source.path,
      content: await readText(path.join(workdir, state.sources.product_architecture_source.path))
    },
    technical_realization_plan: {
      path: state.sources.technical_realization_plan.path,
      content: await readText(path.join(workdir, state.sources.technical_realization_plan.path))
    },
    acceptance_checklist: {
      path: state.sources.acceptance_checklist.path,
      content: await readText(path.join(workdir, state.sources.acceptance_checklist.path))
    }
  });

  state.delivery = compiled.delivery;
  state.graph = compiled.graph;
  state.required_command_specs = compiled.required_command_specs;
  state.command_runs = [];
  state.negative_evidence_records = [];
  state.progress = compiled.progress;
  recomputeStatuses(state);
  await startSuperpowersAttempt(workdir, state, options.mode ?? "product_task");
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "graph_compiled", {
    plan_items: Object.keys(state.graph.plan_items).length,
    acceptance_criteria: Object.keys(state.graph.acceptance_criteria).length
  });
  return state;
}

async function assertRequiredSourcesExist(workdir: string, state: SuperpowersTaskState): Promise<void> {
  const errors: CompileDiagnosticRecord[] = [];
  const checks = [
    ["product_architecture_source", "blocking_missing_source", "Product / Architecture Source"],
    ["technical_realization_plan", "blocking_missing_plan", "Technical Realization Plan"],
    ["acceptance_checklist", "blocking_missing_checklist", "Acceptance Checklist"]
  ] as const;
  for (const [key, category, label] of checks) {
    const source = state.sources[key];
    const file = source?.path ?? `${key}.md`;
    if (!source || !(await pathExists(path.join(workdir, file)))) {
      errors.push(compileDiagnostic(`${label} input is missing: ${file}`, category, file, 1, key, "all three authority inputs are required", "restore the missing source file and rerun compile"));
    }
  }
  throwCompileErrors(errors);
}
