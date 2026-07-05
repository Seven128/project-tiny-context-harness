import test from "node:test";
import assert from "node:assert/strict";
import { rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { createPlanProject } from "./plan-validator-fixtures.mjs";

test("compile rejects graph guard failures with categorized rows", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, badPlan(), badChecklist());
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-GUARDS", planSlug: "demo" });
    await assert.rejects(
      () => compileSuperpowersTask(workdir),
      /blocking_unparseable_object.*related_acs|blocking_missing_primary_path|blocking_missing_owner_boundary|widget_magic/s
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects missing authority inputs with missing-fields categories", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, goodPlan(), goodChecklist());
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-MISSING-SOURCE", planSlug: "demo" });
    await unlink(path.join(workdir, "technical-realization-plan.md"));
    await assert.rejects(() => compileSuperpowersTask(workdir), /blocking_missing_plan.*technical_realization_plan/s);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects ACs without observable result fields", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, goodPlan(), goodChecklist().replace("ac_validates: real capability", "ac_validates:"));
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-OBSERVABLE", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /blocking_missing_observable_result.*ac_validates/s);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeSources(workdir, technicalPlan, acceptanceChecklist) {
  await writeFile(path.join(workdir, "product-architecture-source.md"), productSource(), "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), technicalPlan, "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), acceptanceChecklist, "utf8");
}

function productSource() {
  return `# Product / Architecture Source

delivery_scope: system_capability_build
full_population_required: false
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
scope_fit_decision: fit_for_three_inputs
selected_scope_fit_slice: none
owner_boundary: Product source owns guard fixture scope.
primary_capability_path: compile guard fixture
non_completing_outcomes:
  - prose-only completion
assertion_policy: machine layers require assertion result
source_authority: product source
product_goal: guard fixture
`;
}

function goodPlan() {
  return `# Technical Realization Plan

## PI-001: Build capability

delivery_scope: system_capability_build
capability_target: real capability
representative_samples:
full_population_boundary: not required
non_required_population:
owner_boundary: runtime kernel owns guard fixture
primary_capability_path: compile source into graph
trigger_contract: compile reads source files
state_transition_contract: source fields become state graph
observable_result_contract: graph includes AC-001
assertion_support: runtime assertion targets AC-001
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - prose-only completion
implementation_paths:
  - src/runtime/kernel.ts
related_acs: AC-001
`;
}

function goodChecklist() {
  return `# Acceptance Checklist

## AC-001: Capability works

acceptance_scope: system_capability_build
ac_validates: real capability
ac_does_not_validate: prose-only completion
sample_boundary: none
full_population_required: false
related_plan_items: PI-001
required_proof_layers:
  - worker_runtime
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
positive_assertions:
  - real capability
negative_assertions:
  - prose-only completion
machine_blocking: true
invalid_completion_signals:
  - prose-only completion
assertion_result_required: true
`;
}

function badPlan() {
  return `# Technical Realization Plan

## PI-001: Owner-surface work with bad AC reference

delivery_scope: system_capability_build
capability_target: real owner surface behavior
representative_samples:
full_population_boundary: not required
non_required_population:
owner_boundary: Operations owns bad-reference fixture
primary_capability_path: compile source into graph
trigger_contract: compile reads source files
state_transition_contract: source fields become state graph
observable_result_contract: graph references AC-999
assertion_support: UI assertion would target AC-999
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - prose-only completion
owner_surfaces:
  - Operations
implementation_paths:
related_acs:
  - AC-999
`;
}

function badChecklist() {
  return `# Acceptance Checklist

## AC-001: Runtime behavior is observable.

acceptance_scope: system_capability_build
ac_validates:
  - runtime behavior
ac_does_not_validate:
  - prose-only completion
sample_boundary: none
full_population_required: false
related_plan_items:
  - PI-999
required_proof_layers:
  - widget_magic
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
positive_assertions:
  - runtime behavior
negative_assertions:
  - prose-only completion
machine_blocking: true
invalid_completion_signals:
  - prose-only completion
assertion_result_required: true
`;
}
