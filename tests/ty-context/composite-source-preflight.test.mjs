import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileCompositeSourceBundle } from "../../packages/ty-context/dist/lib/superpowers-task-compile-core.js";
import { preflightCompositeSourceFiles } from "../../packages/ty-context/dist/lib/composite-source-preflight.js";
import * as preflightModule from "../../packages/ty-context/dist/lib/composite-source-preflight.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import {
  initializeSuperpowersTask,
  loadSuperpowersState,
  saveSuperpowersState
} from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { createPlanProject } from "./plan-validator-fixtures.mjs";

test("pure bundle compilation matches the stateful graph projection and preserves empty-array defaults", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    const sources = validSources();
    await writeSources(workdir, sources);
    const pure = compileCompositeSourceBundle(sourceBundle(sources));

    await initializeSuperpowersTask(workdir, { taskId: "SP-PURE-PARITY", planSlug: "demo" });
    const state = await compileSuperpowersTask(workdir);

    assert.deepEqual(stateProjection(state), pure);
    assert.deepEqual(pure.graph.plan_items["PI-001"].related_acs, ["AC-001"]);
    assert.deepEqual(pure.graph.acceptance_criteria["AC-001"].related_plan_items, ["PI-001"]);
    assert.deepEqual(pure.graph.acceptance_criteria["AC-001"].required_proof_layers, ["code", "test"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("default related_plan_items arrays are isolated per acceptance criterion", () => {
  const sources = validSources();
  sources.acceptanceChecklist += secondAcceptanceCriterion();
  const compiled = compileCompositeSourceBundle(sourceBundle(sources));
  const first = compiled.graph.acceptance_criteria["AC-001"].related_plan_items;
  const second = compiled.graph.acceptance_criteria["AC-002"].related_plan_items;

  assert.notStrictEqual(first, second);
  first.push("PI-MUTATION");
  assert.deepEqual(second, ["PI-001"]);
});

test("file preflight compiles without changing state, attempts, events, file list, bytes, or mtimes", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    await writeFile(path.join(workdir, "task-state.json"), '{"sentinel":true,"attempts":["keep"]}\n', "utf8");
    await writeFile(path.join(workdir, "events.ndjson"), '{"event":"sentinel"}\n', "utf8");
    await writeFile(path.join(workdir, "sentinel.txt"), "keep-byte-for-byte\n", "utf8");
    const before = await snapshotTree(workdir);

    const report = await preflightCompositeSourceFiles(workdir);

    assert.equal(report.ok, true);
    assert.deepEqual(report.diagnostics, []);
    assert.deepEqual(await snapshotTree(workdir), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight rejects traversal and absolute source paths before reading", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const outside = path.join(root, "tmp/ty-context/plan-acceptance/outside-product.md");
    await writeFile(outside, "future_field: must-not-be-read\n", "utf8");

    const traversal = await preflightCompositeSourceFiles(workdir, {
      product_architecture_source: "../outside-product.md"
    });
    const absolute = await preflightCompositeSourceFiles(workdir, {
      product_architecture_source: outside
    });

    assertUnsafePath(traversal, "../outside-product.md");
    assertUnsafePath(absolute, outside);
    assert.equal(await readFile(outside, "utf8"), "future_field: must-not-be-read\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight rejects a contained symlink leaf that escapes the canonical root", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const outside = path.join(root, "outside-product.md");
    const linked = path.join(workdir, "linked-product.md");
    await writeFile(outside, "future_field: must-not-be-read\n", "utf8");
    await symlink(outside, linked, "file");

    const before = await readFile(outside, "utf8");
    const report = await preflightCompositeSourceFiles(workdir, {
      product_architecture_source: "linked-product.md"
    });

    assertUnsafePath(report, "linked-product.md");
    assert.equal(await readFile(outside, "utf8"), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight reports a directory source as unreadable without mutation", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const before = await snapshotTree(workdir);

    const report = await capturePreflight(preflightCompositeSourceFiles(workdir, {
      product_architecture_source: "."
    }));

    assertDiagnostic(report, "blocking_unreadable_source", ".", "product_architecture_source");
    assert.deepEqual(await snapshotTree(workdir), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight reports a file root as unreadable without mutation", async () => {
  const root = await createPlanProject();
  try {
    const rootFile = path.join(root, "preflight-root.txt");
    await writeFile(rootFile, "root-sentinel\n", "utf8");
    const before = await fileSnapshot(rootFile);

    const report = await capturePreflight(preflightCompositeSourceFiles(rootFile));

    assertDiagnostic(report, "blocking_unreadable_source", rootFile, "preflight_root");
    assert.deepEqual(await fileSnapshot(rootFile), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight converts a deterministic read failure to a structured unreadable diagnostic", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const before = await snapshotTree(workdir);
    assert.equal(typeof preflightModule.preflightCompositeSourceFilesInternal, "function");

    const report = await preflightModule.preflightCompositeSourceFilesInternal(
      workdir,
      {},
      async (target) => {
        if (path.basename(target) === "product-architecture-source.md") {
          throw ioError("EACCES", "deterministic denied read");
        }
        return readFile(target, "utf8");
      }
    );

    assertDiagnostic(report, "blocking_unreadable_source", "product-architecture-source.md", "product_architecture_source");
    assert.deepEqual(await snapshotTree(workdir), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("file preflight keeps an ENOENT read race in the existing missing-source category", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const before = await snapshotTree(workdir);
    assert.equal(typeof preflightModule.preflightCompositeSourceFilesInternal, "function");

    const report = await preflightModule.preflightCompositeSourceFilesInternal(
      workdir,
      {},
      async (target) => {
        if (path.basename(target) === "product-architecture-source.md") {
          throw ioError("ENOENT", "deterministic vanished read");
        }
        return readFile(target, "utf8");
      }
    );

    assertDiagnostic(report, "blocking_missing_source", "product-architecture-source.md", "product_architecture_source");
    assert.deepEqual(await snapshotTree(workdir), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing-field diagnostics are structured while legacy Error.message stays compatible", () => {
  const sources = validSources();
  sources.productSource = sources.productSource.replace("product_goal: Compile the source bundle.\n", "");
  const error = captureCompileError(sourceBundle(sources));

  assert.match(error.message, /^Superpowers source compile failed:\n- Product \/ Architecture Source missing product_goal at product-architecture-source\.md:1/);
  assert.match(error.message, /\[category=blocking_missing_source; file=product-architecture-source\.md; line=1; invalid_or_missing_field=product_goal; why_blocking=field is required; required_fix=add non-empty text and rerun compile; rerun_compile_enough=true\]$/);
  assert.deepEqual(structured(error.diagnostics[0]), {
    category: "blocking_missing_source",
    file: "product-architecture-source.md",
    line: 1,
    field: "product_goal",
    why: "field is required",
    fix: "add non-empty text and rerun compile"
  });
});

test("structured diagnostics preserve semicolons in source paths without parsing human text", () => {
  const sources = validSources();
  sources.productSource = sources.productSource.replace("product_goal: Compile the source bundle.\n", "");
  const bundle = sourceBundle(sources);
  bundle.product_architecture_source.path = "nested;source/product;architecture-source.md";
  const error = captureCompileError(bundle);

  assert.deepEqual(structured(error.diagnostics[0]), {
    category: "blocking_missing_source",
    file: "nested;source/product;architecture-source.md",
    line: 1,
    field: "product_goal",
    why: "field is required",
    fix: "add non-empty text and rerun compile"
  });
  assert.match(error.message, /file=nested;source\/product;architecture-source\.md; line=1/);
  assert.equal(error.name, "Error");
});

test("unknown-field diagnostics are structured while legacy Error.message stays compatible", () => {
  const sources = validSources();
  sources.productSource += "future_field: hidden semantics\n";
  const error = captureCompileError(sourceBundle(sources));

  assert.match(error.message, /^Superpowers source compile failed:\n- product-architecture-source\.md:\d+ unknown field future_field/);
  assert.match(error.message, /invalid_or_missing_field=future_field/);
  assert.deepEqual(structured(error.diagnostics[0]), {
    category: "blocking_unparseable_object",
    file: "product-architecture-source.md",
    line: 18,
    field: "future_field",
    why: "unknown fields may hide required source semantics",
    fix: "rename the field to a supported canonical key"
  });
});

test("dangling-reference diagnostics are structured while legacy Error.message stays compatible", () => {
  const sources = validSources();
  sources.technicalPlan = sources.technicalPlan.replace("related_acs:\n", "related_acs: AC-999\n");
  const error = captureCompileError(sourceBundle(sources));

  assert.match(error.message, /^Superpowers source compile failed:\n- PI-001 references unknown related_acs AC-999/);
  assert.match(error.message, /invalid_or_missing_field=related_acs/);
  assert.deepEqual(structured(error.diagnostics[0]), {
    category: "blocking_unparseable_object",
    file: "technical-realization-plan.md",
    line: 3,
    field: "related_acs",
    why: "dangling plan-to-AC references make the graph ambiguous",
    fix: "fix related_acs to existing AC ids"
  });
});

test("stateful compile still hashes, resets run arrays, starts one attempt, saves, and appends graph_compiled", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, validSources());
    const initial = await initializeSuperpowersTask(workdir, { taskId: "SP-STATEFUL", planSlug: "demo" });
    initial.command_runs = [{ sentinel: "command" }];
    initial.negative_evidence_records = [{ sentinel: "negative" }];
    await saveSuperpowersState(workdir, initial);
    const eventsBefore = eventLines(await readFile(path.join(workdir, "events.ndjson"), "utf8"));

    const returned = await compileSuperpowersTask(workdir, { mode: "harness_task" });
    const saved = await loadSuperpowersState(workdir);
    const eventsAfter = eventLines(await readFile(path.join(workdir, "events.ndjson"), "utf8"));

    assert.deepEqual(saved, returned);
    assert.equal(saved.attempts.length, initial.attempts.length + 1);
    assert.equal(saved.current_attempt_id, saved.attempts.at(-1).task_attempt_id);
    assert.equal(saved.attempts.at(-1).mode, "harness_task");
    assert.ok(Object.values(saved.sources).every((source) => /^[a-f0-9]{64}$/.test(source.sha256)));
    assert.deepEqual(saved.command_runs, []);
    assert.deepEqual(saved.negative_evidence_records, []);
    assert.equal(eventsAfter.length, eventsBefore.length + 1);
    assert.equal(eventsAfter.at(-1).event_type, "graph_compiled");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function validSources() {
  return {
    productSource: `# Product / Architecture Source

delivery_scope: system_capability_build
full_population_required: false
representative_samples_validate:
representative_samples_do_not_validate:
  - sample-only proof
out_of_scope_backlog:
scope_fit_decision: fit_for_three_inputs
selected_scope_fit_slice: none
owner_boundary: Product source owns the bundle scope.
primary_capability_path: compile -> graph projection
non_completing_outcomes:
  - validator-only proof
assertion_policy: machine layers require assertions
source_authority: product source
product_goal: Compile the source bundle.
`,
    technicalPlan: `# Technical Realization Plan

## PI-001: Compile one capability

delivery_scope: system_capability_build
capability_target: canonical source compilation
representative_samples:
full_population_boundary: not required
non_required_population:
owner_boundary: compiler owns graph projection
primary_capability_path: parse -> guard -> project
trigger_contract: preflight receives three source files
state_transition_contract: source becomes an in-memory graph
observable_result_contract: projection contains PI and AC nodes
assertion_support: AC assertion requirements are preserved
required_assertion_commands:
invalid_implementation_shortcuts:
implementation_paths:
  - packages/ty-context/src/lib/superpowers-task-compile-core.ts
related_acs:
`,
    acceptanceChecklist: `# Acceptance Checklist

## AC-001: Source compilation is strict

acceptance_scope: system_capability_build
ac_validates:
  - canonical source compilation
ac_does_not_validate:
  - sample-only proof
sample_boundary: one canonical fixture
full_population_required: false
related_plan_items:
required_proof_layers:
assertion_command: node --test tests/compile.test.mjs
assertion_artifacts:
positive_assertions:
  - graph projection exists
negative_assertions:
  - unknown fields pass silently
machine_blocking: true
invalid_completion_signals:
  - validator-only proof
assertion_result_required: true
`
  };
}

function secondAcceptanceCriterion() {
  return `
## AC-002: A second source criterion is strict

acceptance_scope: system_capability_build
ac_validates:
  - second canonical source result
ac_does_not_validate:
  - sample-only proof
sample_boundary: second canonical fixture
full_population_required: false
related_plan_items:
required_proof_layers:
assertion_command: node --test tests/compile.test.mjs
assertion_artifacts:
positive_assertions:
  - second graph projection exists
negative_assertions:
  - unknown fields pass silently
machine_blocking: true
invalid_completion_signals:
  - validator-only proof
assertion_result_required: true
`;
}

function sourceBundle(sources) {
  return {
    product_architecture_source: { path: "product-architecture-source.md", content: sources.productSource },
    technical_realization_plan: { path: "technical-realization-plan.md", content: sources.technicalPlan },
    acceptance_checklist: { path: "acceptance-checklist.md", content: sources.acceptanceChecklist }
  };
}

async function writeSources(workdir, sources) {
  await writeFile(path.join(workdir, "product-architecture-source.md"), sources.productSource, "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), sources.technicalPlan, "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), sources.acceptanceChecklist, "utf8");
}

function stateProjection(state) {
  return {
    delivery: state.delivery,
    graph: state.graph,
    required_command_specs: state.required_command_specs,
    progress: state.progress
  };
}

function captureCompileError(bundle) {
  try {
    compileCompositeSourceBundle(bundle);
    assert.fail("expected source compilation to fail");
  } catch (error) {
    assert.ok(Array.isArray(error.diagnostics));
    return error;
  }
}

function structured(diagnostic) {
  const { category, file, line, field, why, fix } = diagnostic;
  return { category, file, line, field, why, fix };
}

function assertUnsafePath(report, expectedFile) {
  assert.equal(report.ok, false);
  assert.equal(report.diagnostics[0].category, "blocking_unsafe_source_path");
  assert.equal(report.diagnostics[0].file, expectedFile);
  assert.match(report.diagnostics[0].why, /outside the canonical preflight root/i);
  assert.match(report.error_message, /^Superpowers source compile failed:/);
  assert.match(report.error_message, /rerun_compile_enough=true\]$/);
}

function assertDiagnostic(report, category, file, field) {
  assert.equal(report.ok, false);
  assert.equal(report.diagnostics[0].category, category);
  assert.equal(report.diagnostics[0].file, file);
  assert.equal(report.diagnostics[0].field, field);
  assert.match(report.error_message, /^Superpowers source compile failed:/);
  assert.match(report.error_message, /rerun_compile_enough=true\]$/);
}

async function capturePreflight(promise) {
  try {
    return await promise;
  } catch (error) {
    assert.fail(`preflight leaked raw error: ${error?.code ?? error?.message ?? error}`);
  }
}

async function fileSnapshot(target) {
  const [bytes, metadata] = await Promise.all([readFile(target), stat(target)]);
  return [bytes.toString("base64"), metadata.mtimeMs];
}

function ioError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function snapshotTree(root) {
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .sort();
  const snapshots = await Promise.all(files.map(async (file) => {
    const target = path.join(root, file);
    const [bytes, metadata] = await Promise.all([readFile(target), stat(target)]);
    return [file, bytes.toString("base64"), metadata.mtimeMs];
  }));
  return snapshots;
}

function eventLines(content) {
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}
