import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { createPlanProject } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("strict V2 canonical three-input fields compile into task-state and assertion requirements", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      productSource: strictV2ProductSource(),
      technicalPlan: strictV2TechnicalPlan(),
      acceptanceChecklist: strictV2AcceptanceChecklist()
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-V2", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.delivery.product_architecture_scope.scope_fit_decision, "fit_for_three_inputs");
    assert.equal(state.delivery.product_architecture_scope.selected_scope_fit_slice, "none");
    assert.equal(state.delivery.product_architecture_scope.owner_boundary, "Composite workflow state kernel owns V2 source compilation.");
    assert.equal(state.delivery.product_architecture_scope.primary_capability_path, "compile -> state -> assertion gate -> final gate");
    assert.deepEqual(state.delivery.product_architecture_scope.non_completing_outcomes, ["matrix-only proof"]);
    assert.equal(state.delivery.product_architecture_scope.assertion_policy, "machine layers require assertion_result and negative_evidence_scan");

    const pi = state.graph.plan_items["PI-001"];
    assert.equal(pi.owner_boundary, "state kernel and validators");
    assert.equal(pi.primary_capability_path, "compile strict V2 fields into task-state.json");
    assert.equal(pi.trigger_contract, "ty-context composite-long-task compile receives three source files");
    assert.equal(pi.state_transition_contract, "uncompiled source becomes canonical graph state");
    assert.equal(pi.observable_result_contract, "task-state.json preserves V2 field values");
    assert.equal(pi.assertion_support, "AC-001 assertion command must target worker_runtime and test layers");
    assert.deepEqual(pi.required_assertion_commands, ["node --test tests/strict-v2.test.mjs"]);
    assert.deepEqual(pi.invalid_implementation_shortcuts, ["legacy field fallback"]);
    assert.deepEqual(pi.proof_layer_ids, ["AC-001.worker_runtime", "AC-001.test"]);

    const ac = state.graph.acceptance_criteria["AC-001"];
    assert.deepEqual(ac.required_proof_layers, ["worker_runtime", "test"]);
    assert.equal(ac.assertion_command, "node --test tests/strict-v2.test.mjs");
    assert.deepEqual(ac.assertion_artifacts, ["tmp/ty-context/plan-acceptance/demo/strict-v2-report.json"]);
    assert.deepEqual(ac.positive_assertions, ["task-state contains strict V2 fields"]);
    assert.deepEqual(ac.negative_assertions, ["unknown fields are rejected", "full population operation"]);
    assert.equal(ac.machine_blocking, true);
    assert.equal(ac.assertion_result_required, true);
    assert.deepEqual(ac.invalid_completion_signals, ["validator pass only"]);
    assert.deepEqual(
      ac.assertion_requirements.map((item) => ({
        proof_layer: item.proof_layer,
        assertion_command: item.assertion_command,
        assertion_artifacts: item.assertion_artifacts,
        positive_assertions: item.positive_assertions,
        negative_assertions: item.negative_assertions,
        machine_blocking: item.machine_blocking,
        assertion_result_required: item.assertion_result_required
      })),
      [
        {
          proof_layer: "worker_runtime",
          assertion_command: "node --test tests/strict-v2.test.mjs",
          assertion_artifacts: ["tmp/ty-context/plan-acceptance/demo/strict-v2-report.json"],
          positive_assertions: ["task-state contains strict V2 fields"],
          negative_assertions: ["unknown fields are rejected", "full population operation"],
          machine_blocking: true,
          assertion_result_required: true
        },
        {
          proof_layer: "test",
          assertion_command: "node --test tests/strict-v2.test.mjs",
          assertion_artifacts: ["tmp/ty-context/plan-acceptance/demo/strict-v2-report.json"],
          positive_assertions: ["task-state contains strict V2 fields"],
          negative_assertions: ["unknown fields are rejected", "full population operation"],
          machine_blocking: true,
          assertion_result_required: true
        }
      ]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile only treats heading PI and AC sections as definitions", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      technicalPlan: `# Technical Realization Plan

Intro references PI-001 but is not a definition.

## PI-001: Build message routing API

delivery_scope: system_capability_build
capability_target: |
  Build the real routing API.
  Include worker retry behavior.
representative_samples:
  - recovery happy path sample
full_population_boundary: all configured message providers
non_required_population:
  - archived providers
owner_boundary: routing API owns provider routing
primary_capability_path: compile plan into routing proof layers
trigger_contract: compile command reads routing plan
state_transition_contract: plan source becomes task graph
observable_result_contract: task-state preserves routing plan
assertion_support: assertion command covers UI and test layers
required_assertion_commands:
  - node --test tests/message-routing.test.ts
invalid_implementation_shortcuts:
  - matrix-only proof
owner_surfaces:
  - Message Center
forbidden_surfaces:
  - Billing
implementation_paths:
  - packages/api/src/routing.ts
  - packages/worker/src/message-routing.ts
required_tests:
  - tests/message-routing.test.ts
related_acs:
  - AC-001

## AC Mapping Preview

- PI-001: supports AC-001
`,
      acceptanceChecklist: `# Acceptance Checklist

## AC-001: All real providers route correctly

acceptance_scope: full_population_operation
ac_validates:
  - full population routing
ac_does_not_validate:
  - mock provider routing only
sample_boundary: none
full_population_required: true
related_plan_items:
  - PI-001
required_proof_layers:
  - code
  - test
  - ui_browser
assertion_command: node --test tests/message-routing.test.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/message-routing-report.json
positive_assertions:
  - routing works
negative_assertions:
  - mock provider routing only
machine_blocking: true
invalid_completion_signals:
  - matrix-only proof
assertion_result_required: true

## Reference Preview

- AC-001: supported by PI-001
`
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-001", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    const pi = state.graph.plan_items["PI-001"];
    const ac = state.graph.acceptance_criteria["AC-001"];
    assert.equal(pi.requirement, "Build message routing API");
    assert.equal(pi.delivery_scope, "system_capability_build");
    assert.match(pi.capability_target, /real routing API/);
    assert.deepEqual(pi.implementation_paths, ["packages/api/src/routing.ts", "packages/worker/src/message-routing.ts"]);
    assert.equal(pi.source_file, "technical-realization-plan.md");
    assert.equal(pi.source_start_line, 5);
    assert.ok(pi.source_end_line < 45);

    assert.equal(ac.scope, "All real providers route correctly");
    assert.equal(ac.acceptance_scope, "full_population_operation");
    assert.equal(ac.full_population_required, true);
    assert.deepEqual(ac.required_proof_layers, ["code", "test", "ui_browser"]);
    assert.equal(ac.source_file, "acceptance-checklist.md");
    assert.equal(ac.source_start_line, 3);
    assert.ok(ac.source_end_line < 35);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects list-style PI and AC definitions", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      technicalPlan: `# Technical Realization Plan

- PI-001: Legacy list definition
  - delivery_scope: system_capability_build
  - capability_target: legacy capability
  - full_population_boundary: not required
`,
      acceptanceChecklist: strictAcceptanceChecklist()
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-LIST", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /PI-001 list-style definition is not allowed.*technical-realization-plan\.md:3/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects duplicate heading definitions with line numbers", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      technicalPlan: `${strictTechnicalPlan()}

## PI-001: Duplicate definition

delivery_scope: system_capability_build
capability_target: duplicate capability
representative_samples:
full_population_boundary: duplicate boundary
non_required_population:
`,
      acceptanceChecklist: strictAcceptanceChecklist()
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-DUP", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /PI-001 duplicate definition.*technical-realization-plan\.md:3.*technical-realization-plan\.md:\d+/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects missing and invalid strict fields before validator", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      productSource: `# Product / Architecture Source

delivery_scope: full_population_operation
full_population_required: yes
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
`,
      technicalPlan: `# Technical Realization Plan

## PI-001: Missing delivery scope

capability_target: real capability
representative_samples:
full_population_boundary: all providers
non_required_population:
`,
      acceptanceChecklist: `# Acceptance Checklist

## AC-001: Invalid boolean

acceptance_scope: full_population_operation
ac_validates:
ac_does_not_validate:
sample_boundary: none
full_population_required: yes
related_plan_items: PI-001
required_proof_layers: code
`
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-FIELDS", planSlug: "demo" });
    await assert.rejects(
      () => compileSuperpowersTask(workdir),
      /blocking_unparseable_object|blocking_missing_plan|blocking_missing_checklist/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects table fields and field-heading syntax", async () => {
  const tableRoot = await createPlanProject();
  try {
    const workdir = path.join(tableRoot, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      productSource: `# Product / Architecture Source

| field | value |
|---|---|
| delivery_scope | full_population_operation |
full_population_required: true
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
`
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-TABLE", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /table fields are not supported/i);
  } finally {
    await rm(tableRoot, { recursive: true, force: true });
  }

  const headingRoot = await createPlanProject();
  try {
    const workdir = path.join(headingRoot, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      technicalPlan: `# Technical Realization Plan

## PI-001: Field heading plan

### delivery_scope

full_population_operation
capability_target: real capability
representative_samples:
full_population_boundary: all providers
non_required_population:
related_acs: AC-001
`
    });

    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-FIELD-HEADING", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /field headings are not supported.*delivery_scope/i);
  } finally {
    await rm(headingRoot, { recursive: true, force: true });
  }
});

test("composite long-task CLI compile fails for legacy list definitions", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeStrictSources(workdir, {
      technicalPlan: `# Technical Realization Plan

- PI-001: Legacy list definition
  - delivery_scope: system_capability_build
  - capability_target: legacy capability
  - full_population_boundary: not required
`,
      acceptanceChecklist: strictAcceptanceChecklist()
    });

    const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
    const init = spawnSync(process.execPath, [cli, "composite-long-task", "init", "tmp/ty-context/plan-acceptance/demo"], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);

    const compile = spawnSync(process.execPath, [cli, "composite-long-task", "compile", "tmp/ty-context/plan-acceptance/demo"], { cwd: root, encoding: "utf8" });
    assert.notEqual(compile.status, 0);
    assert.match(compile.stderr, /PI-001 list-style definition is not allowed.*use "## PI-001: \.\.\."/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeStrictSources(workdir, overrides = {}) {
  await writeFile(path.join(workdir, "product-architecture-source.md"), overrides.productSource ?? strictProductSource(), "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), overrides.technicalPlan ?? strictTechnicalPlan(), "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), overrides.acceptanceChecklist ?? strictAcceptanceChecklist(), "utf8");
}

function strictProductSource() {
  return `# Product / Architecture Source

delivery_scope: full_population_operation
full_population_required: true
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
scope_fit_decision: fit_for_three_inputs
selected_scope_fit_slice: none
owner_boundary: Product source owns strict compile scope.
primary_capability_path: compile -> state graph
non_completing_outcomes:
  - sample-only proof
assertion_policy: machine layers require assertion result
source_authority: product source
product_goal: strict compile fixture
`;
}

function strictTechnicalPlan() {
  return `# Technical Realization Plan

## PI-001: Build message routing API

delivery_scope: full_population_operation
capability_target: real routing API and worker
representative_samples:
full_population_boundary: all configured message providers
non_required_population:
owner_boundary: routing API owns message provider routing
primary_capability_path: compile plan into graph
trigger_contract: compile reads the technical plan
state_transition_contract: source fields become plan item state
observable_result_contract: task-state contains plan item fields
assertion_support: node test assertion targets AC-001
required_assertion_commands:
  - node --test tests/message-routing.test.ts
invalid_implementation_shortcuts:
  - final-card-only proof
implementation_paths:
  - src/runtime/kernel.ts
related_acs: AC-001
`;
}

function strictAcceptanceChecklist() {
  return `# Acceptance Checklist

## AC-001: All real providers route correctly

acceptance_scope: full_population_operation
ac_validates:
ac_does_not_validate:
sample_boundary: none
full_population_required: true
related_plan_items: PI-001
required_proof_layers:
  - code
  - test
assertion_command: node --test tests/message-routing.test.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/message-routing-report.json
positive_assertions:
  - routing works
negative_assertions:
  - sample-only proof
machine_blocking: true
invalid_completion_signals:
  - final-card-only proof
assertion_result_required: true
`;
}

function strictV2ProductSource() {
  return `# Product / Architecture Source

delivery_scope: system_capability_build
full_population_required: false
representative_samples_validate:
  - strict V2 happy path
representative_samples_do_not_validate:
  - full population operation
out_of_scope_backlog:
  - external Superpowers execution mechanics
scope_fit_decision: fit_for_three_inputs
selected_scope_fit_slice: none
owner_boundary: Composite workflow state kernel owns V2 source compilation.
primary_capability_path: compile -> state -> assertion gate -> final gate
non_completing_outcomes:
  - matrix-only proof
assertion_policy: machine layers require assertion_result and negative_evidence_scan
source_authority: Product source owns scope and boundaries
product_goal: Compile strict V2 canonical fields without fallback
surface_ia_lock: none
decision_lock: strict V2 contract accepted
context_delta: required
source_to_context_coverage: workflow contract updated
acceptance_semantics: assertion-backed final completion
impact: package-managed workflow behavior
`;
}

function strictV2TechnicalPlan() {
  return `# Technical Realization Plan

## PI-001: Compile strict V2 task state fields.

delivery_scope: system_capability_build
capability_target: strict V2 field compilation
representative_samples:
  - strict V2 happy path
full_population_boundary: not required for capability build
non_required_population:
  - full population operation
owner_boundary: state kernel and validators
primary_capability_path: compile strict V2 fields into task-state.json
trigger_contract: ty-context composite-long-task compile receives three source files
state_transition_contract: uncompiled source becomes canonical graph state
observable_result_contract: task-state.json preserves V2 field values
assertion_support: AC-001 assertion command must target worker_runtime and test layers
required_assertion_commands:
  - node --test tests/strict-v2.test.mjs
invalid_implementation_shortcuts:
  - legacy field fallback
implementation_paths:
  - packages/ty-context/src/lib/superpowers-task-source-compile.ts
required_tests:
  - tests/ty-context/superpowers-task-compile-strict.test.mjs
related_acs:
  - AC-001
proof_layer_ids:
  - AC-001.worker_runtime
  - AC-001.test
`;
}

function strictV2AcceptanceChecklist() {
  return `# Acceptance Checklist

## AC-001: Strict V2 fields are canonical state.

acceptance_scope: system_capability_build
ac_validates:
  - strict V2 fields compile into state
ac_does_not_validate:
  - legacy fallback-only compilation
  - full population operation
sample_boundary: strict V2 happy path fixture
full_population_required: false
related_plan_items:
  - PI-001
required_proof_layers:
  - worker_runtime
  - test
assertion_command: node --test tests/strict-v2.test.mjs
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/strict-v2-report.json
positive_assertions:
  - task-state contains strict V2 fields
negative_assertions:
  - unknown fields are rejected
  - full population operation
machine_blocking: true
invalid_completion_signals:
  - validator pass only
assertion_result_required: true
ac_type: machine_verifiable
proof_chain:
  - AC-001.worker_runtime
  - AC-001.test
verification_method: assertion command report
fail_conditions:
  - task-state omits strict V2 fields
invalid_evidence:
  - matrix-only proof
substitution_policy:
  - no sibling substitution
missing_layer_downgrade: partial
auditor_expectation: verify assertion-backed evidence
out_of_scope_na_approval_source: none
required_test_ids:
  - strict-v2-compile
explicit_no_test_scope: false
hard_blockers:
  - missing assertion_result
validates_explanation: validates canonical field compilation
does_not_validate_explanation: does not validate upstream Superpowers execution
final_evidence_expected:
  - assertion report
test_cases:
  - strict-v2-compile
`;
}
