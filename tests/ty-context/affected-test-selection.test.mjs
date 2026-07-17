import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  LONG_TASK_FOCUSED_TESTS,
  selectAffectedTests,
} from "../../tools/affected_test_selection.mjs";

test("hotspot source changes select focused regression tests", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-progress.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-authority-progress-retry.test.mjs",
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-state-resume.test.mjs",
  ]);
});

test("shared long-task runtime types use focused authority and recovery coverage", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-runtime-types.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-delivery-compiler.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-state-resume.test.mjs",
  ]);
});

test("unmapped long-task runtime changes fail safe to the complete long-task suite", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-unmapped-runtime.ts",
  ]);
  assert.equal(selection.mode, "long-task-suite");
  assert.deepEqual(selection.tests, []);
  assert.equal(selection.requires_build, true);
});

test("shared package runtime and dependency changes fail safe to the full suite", () => {
  for (const file of [
    "packages/ty-context/src/lib/shared-runtime.ts",
    "package-lock.json",
    "unknown.bin",
  ]) {
    const selection = selectAffectedTests([file]);
    assert.equal(selection.mode, "full-suite", file);
    assert.deepEqual(selection.tests, [], file);
  }
});

test("guidance-only changes select static consistency checks", () => {
  const selection = selectAffectedTests([
    ".codex/skills/long-task-workflow/SKILL.md",
    "PROJECT_SPEC.md",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-design-context.test.mjs",
    "tests/ty-context/long-task-efficiency-design.test.mjs",
    "tests/ty-context/package-source.test.mjs",
    "tests/ty-context/workflow-contract-routing.test.mjs",
  ]);
});

test("explicit scopes are deterministic and no-change auto mode stays useful", () => {
  assert.deepEqual(
    selectAffectedTests([], { scope: "long-task" }).tests,
    LONG_TASK_FOCUSED_TESTS,
  );
  assert.deepEqual(
    selectAffectedTests([], { scope: "delivery-contract" }).tests,
    DELIVERY_CONTRACT_FOCUSED_TESTS,
  );
  assert.deepEqual(selectAffectedTests([]).tests, LONG_TASK_FOCUSED_TESTS);
  assert.equal(selectAffectedTests([], { scope: "all" }).mode, "full-suite");
});

test("direct test edits run that test while shared fixture edits widen safely", () => {
  const direct = selectAffectedTests([
    "tests/ty-context/long-task-context-evolution.test.mjs",
  ]);
  assert.equal(direct.mode, "selected");
  assert.deepEqual(direct.tests, [
    "tests/ty-context/long-task-context-evolution.test.mjs",
  ]);

  const fixture = selectAffectedTests([
    "tests/ty-context/long-task-delivery-fixtures.mjs",
  ]);
  assert.equal(fixture.mode, "long-task-suite");
});

test("package scripts expose affected and focused developer loops", async () => {
  const repository = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const packageJson = JSON.parse(
    await readFile(path.join(repository, "package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:affected"],
    "node tools/run_affected_tests.mjs",
  );
  assert.equal(
    packageJson.scripts["test:affected:list"],
    "node tools/run_affected_tests.mjs --list",
  );
  assert.equal(
    packageJson.scripts["test:long-task:focused"],
    "node tools/run_affected_tests.mjs --scope long-task",
  );
  assert.equal(
    packageJson.scripts["test:delivery-contract:focused"],
    "node tools/run_affected_tests.mjs --scope delivery-contract",
  );
});
