import { createHash } from "node:crypto";
import path from "node:path";
import { CANONICAL_CORE_PACKAGE } from "./constants.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { packageAssetPath, packageRoot } from "./paths.js";

const SOURCE_ASSET =
  "packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md";

const REQUIRED_SOURCE_FILES = [
  "product-architecture-source.md",
  "technical-realization-plan.md",
  "acceptance-checklist.md"
] as const;

export interface CompositeLongTaskGoalRenderResult {
  workdir: string;
  protocolPath: string;
  protocolSha256: string;
  executionBindingPath: string;
  goalObjectivePath: string;
  goalObjectiveLength: number;
}

export async function renderCompositeLongTaskGoal(workdir: string): Promise<CompositeLongTaskGoalRenderResult> {
  const resolvedWorkdir = path.resolve(workdir);
  await assertReadyWorkdir(resolvedWorkdir);

  const protocolBody = ensureTrailingNewline(
    normalizeNewlines(await readText(packageAssetPath("skills", "composite-long-task-workflow", "references", "composite-long-task-workflow-protocol.md")))
  );
  const protocolSha256 = sha256(protocolBody);
  const protocolVersion = await packageVersion();
  const protocolSnapshot = [
    "protocol_name: composite-long-task-workflow",
    `protocol_version: ${protocolVersion}`,
    `protocol_sha256: ${protocolSha256}`,
    `generated_at: ${new Date().toISOString()}`,
    `source_asset: ${SOURCE_ASSET}`,
    "---",
    protocolBody.trimEnd()
  ].join("\n") + "\n";

  const protocolPath = path.join(resolvedWorkdir, "workflow-protocol.md");
  await writeTextIfChanged(protocolPath, protocolSnapshot);

  const executionBinding = renderExecutionBinding(resolvedWorkdir, protocolSha256);
  const executionBindingPath = path.join(resolvedWorkdir, "execution-binding.md");
  await writeTextIfChanged(executionBindingPath, executionBinding);

  const goalObjective = renderGoalObjective(workdirForPrompt(resolvedWorkdir));
  if (goalObjective.length > 3850) {
    throw new Error(`goal-objective.txt exceeds 3850 characters (${goalObjective.length})`);
  }
  if (/^\/goal\s+read\s+\S+\s*\.?$/i.test(goalObjective.trim())) {
    throw new Error("goal-objective.txt must not be a single read-file pointer");
  }
  const goalObjectivePath = path.join(resolvedWorkdir, "goal-objective.txt");
  await writeTextIfChanged(goalObjectivePath, goalObjective);

  return {
    workdir: resolvedWorkdir,
    protocolPath,
    protocolSha256,
    executionBindingPath,
    goalObjectivePath,
    goalObjectiveLength: goalObjective.length
  };
}

async function assertReadyWorkdir(workdir: string): Promise<void> {
  for (const sourceFile of REQUIRED_SOURCE_FILES) {
    const sourcePath = path.join(workdir, sourceFile);
    if (!(await pathExists(sourcePath))) {
      throw new Error(`render-goal requires ${sourceFile}; provide the three input files first`);
    }
  }
  const statePath = path.join(workdir, "task-state.json");
  if (!(await pathExists(statePath))) {
    throw new Error("render-goal requires task-state.json; run ty-context composite-long-task init/compile before render-goal");
  }
  const state = JSON.parse(await readText(statePath)) as {
    graph?: { plan_items?: Record<string, unknown>; acceptance_criteria?: Record<string, unknown> };
  };
  const planItemCount = Object.keys(state.graph?.plan_items ?? {}).length;
  const acceptanceCriteriaCount = Object.keys(state.graph?.acceptance_criteria ?? {}).length;
  if (planItemCount === 0 || acceptanceCriteriaCount === 0) {
    throw new Error("render-goal requires compiled task-state.json; run ty-context composite-long-task compile before render-goal");
  }
}

function renderExecutionBinding(workdir: string, protocolSha256: string): string {
  return `# Composite Long-Task Execution Binding

workdir: ${path.normalize(workdir)}
protocol: workflow-protocol.md
protocol_sha256: ${protocolSha256}
goal_objective: goal-objective.txt

authorities:
  product_architecture_source: product-architecture-source.md
  technical_realization_plan: technical-realization-plan.md
  acceptance_checklist: acceptance-checklist.md

canonical_state:
  task_state: task-state.json
  events: events.ndjson
  derived_dir: derived/

required_commands:
  init: ty-context composite-long-task init <workdir>
  compile: ty-context composite-long-task compile <workdir>
  derive: ty-context composite-long-task derive <workdir>
  apply_slice_delta: ty-context composite-long-task apply-slice-delta <workdir> <slice-delta.json>
  slice_gate: ty-context composite-long-task slice-gate <workdir> --slice <id>
  epoch_gate: ty-context composite-long-task epoch-gate <workdir> --epoch <id>
  state_validator: ty-context validate-superpowers-state <workdir>
  acceptance_validator: ty-context validate-plan-acceptance <workdir>
  final_gate: ty-context composite-long-task final-gate <workdir>

completion_gate:
  product_goal_complete_source: final_gate
  cannot_hand_set_product_goal_complete: true
`;
}

function renderGoalObjective(workdir: string): string {
  return `/goal Execute the composite long-task workflow in ${workdir}.

First read and obey:
- workflow-protocol.md
- execution-binding.md
- product-architecture-source.md
- technical-realization-plan.md
- acceptance-checklist.md
- task-state.json and generated derived/** views

Persistent contract:
Product / Architecture Source owns intent, scope and boundaries. Technical Realization Plan owns PI implementation and plan conformance. Acceptance Checklist owns AC completion semantics and proof layers. task-state.json is the only execution state source; events.ndjson is append-only; derived/** is generated and must not be hand-edited as authority.

Use workflow-protocol.md to combine Tiny Context gates with official Superpowers execution. It is not business Context and must not be registered in project_context/context.toml. Do not redefine, duplicate or fork Superpowers mechanics. Prefer superpowers:subagent-driven-development when subagents are available, otherwise use superpowers:executing-plans. Use TDD for behavior gaps and superpowers:verification-before-completion before completion claims.

Work in slices. Each slice must update state through slice-delta.json, canonical evidence records, derive, and slice-gate. Run epoch-gate for shared provider/browser/runtime/security proof environments. Preserve Context Delta, plan conformance, acceptance proof layers, redaction, reviewability and sample/full-population boundaries.

Forbidden shortcuts:
Tests alone do not prove plan conformance. Superpowers review does not override Tiny Context gates. Sample evidence does not prove full population unless AC allows. Manual edits under derived/** are not authority. Local audit cannot mark final completion. Do not claim full implementation while Context Delta is required but Context is not updated, or while Source-to-Context Coverage / Context-to-Implementation Binding has unresolved required gaps.

Completion:
Do not hand-set product_goal_complete. Only complete after derive, verification-before-completion, validate-superpowers-state, validate-plan-acceptance, auditor/stale-overclaim checks when applicable, and final-gate compute product_goal_complete=true. If audit_task_complete is true but acceptance_target_status is not complete, report "Audit workflow completed; acceptance target not complete." and continue or stop with blockers; do not say Goal achieved.

Blocked:
Maximize safe autonomous progress using repo tools, local app/browser sessions, CLI auth and authorized elevation. Stop only for locally unsatisfiable blockers such as MFA, missing permission, external approval or unavailable credentials, and return the minimal user action list plus next agent step.
`;
}

async function packageVersion(): Promise<string> {
  const packageJson = JSON.parse(await readText(path.join(packageRoot(), "package.json"))) as { version?: string };
  return packageJson.version ?? "unknown";
}

function workdirForPrompt(workdir: string): string {
  const cwd = process.cwd();
  const relative = path.relative(cwd, workdir);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return workdir.replace(/\\/g, "/");
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function ensureTrailingNewline(value: string): string {
  return `${value.trimEnd()}\n`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const COMPOSITE_LONG_TASK_WORKFLOW_SKILL_NAME = "composite-long-task-workflow";
export const COMPOSITE_LONG_TASK_PUBLIC_COMMAND = "composite-long-task";
export const COMPOSITE_LONG_TASK_PACKAGE = CANONICAL_CORE_PACKAGE;
