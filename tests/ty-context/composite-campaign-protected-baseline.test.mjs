import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

test("descriptive protected baseline is covered by the runtime registry", async () => {
  const baseline = JSON.parse(await readFile(path.join(root, ".codex/ty-context-managed/protected-harness-baseline.json"), "utf8"));
  const runtime = await import("../../packages/ty-context/dist/lib/superpowers-task-protected-baseline.js");
  const paths = Object.values(baseline.protected_categories).flat();
  assert.ok(paths.length > 0);
  for (const protectedPath of paths) {
    assert.equal(runtime.isProtectedBaselinePath(protectedPath), true, `runtime must protect ${protectedPath}`);
  }
});

test("campaign authoring and preparation authorities are Harness Drift Lock surfaces", async () => {
  const { detectHarnessDrift, isHarnessPath } = await import("../../packages/ty-context/dist/lib/superpowers-task-harness-drift.js");
  const protectedPaths = [
    ".codex/ty-context-managed/skills/prepare-composite-long-task/SKILL.md",
    ".codex/ty-context-managed/skills/prepare-composite-long-task/references/packet-authoring.md",
    "packages/ty-context/assets/skills/prepare-composite-long-task/SKILL.md",
    ".codex/skills/prepare-composite-long-task/SKILL.md",
    "packages/ty-context/src/commands/composite-campaign.ts",
    "packages/ty-context/src/lib/composite-input-contract.ts",
    "packages/ty-context/src/lib/composite-source-preflight.ts",
    "packages/ty-context/src/lib/superpowers-task-compile-core.ts",
    "packages/ty-context/src/lib/superpowers-task-fields.ts",
    "packages/ty-context/src/lib/composite-campaign-renderer.ts",
    "packages/ty-context/src/lib/composite-campaign-handoff.ts",
    "packages/ty-context/src/lib/composite-campaign-result.ts"
  ];
  for (const protectedPath of protectedPaths) assert.equal(isHarnessPath(protectedPath), true, `expected harness path: ${protectedPath}`);
  const result = detectHarnessDrift({
    current_attempt_id: "attempt-1",
    attempts: [{ task_attempt_id: "attempt-1", mode: "product_task", changed_files: protectedPaths }]
  });
  assert.equal(result.harness_drift_detected, true);
  assert.equal(result.product_goal_complete, false);
  assert.deepEqual(result.changed_files, protectedPaths);
});
