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
    assert.ok(pi.source_end_line < 30);

    assert.equal(ac.scope, "All real providers route correctly");
    assert.equal(ac.acceptance_scope, "full_population_operation");
    assert.equal(ac.full_population_required, true);
    assert.deepEqual(ac.required_proof_layers, ["code", "test", "ui_browser"]);
    assert.equal(ac.source_file, "acceptance-checklist.md");
    assert.equal(ac.source_start_line, 3);
    assert.ok(ac.source_end_line < 20);
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
  return "# Product / Architecture Source\n\ndelivery_scope: full_population_operation\nfull_population_required: true\nrepresentative_samples_validate:\nrepresentative_samples_do_not_validate:\nout_of_scope_backlog:\n";
}

function strictTechnicalPlan() {
  return "# Technical Realization Plan\n\n## PI-001: Build message routing API\n\ndelivery_scope: full_population_operation\ncapability_target: real routing API and worker\nrepresentative_samples:\nfull_population_boundary: all configured message providers\nnon_required_population:\nimplementation_paths:\n  - src/runtime/kernel.ts\nrelated_acs: AC-001\n";
}

function strictAcceptanceChecklist() {
  return "# Acceptance Checklist\n\n## AC-001: All real providers route correctly\n\nacceptance_scope: full_population_operation\nac_validates:\nac_does_not_validate:\nsample_boundary: none\nfull_population_required: true\nrelated_plan_items: PI-001\nrequired_proof_layers:\n  - code\n  - test\n";
}
