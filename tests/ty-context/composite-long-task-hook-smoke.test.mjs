import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkLongTaskHostGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";

test("project and plugin-like Stop handlers cannot create a non-managed fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-non-managed-conflict-"));
  await mkdir(path.join(root, ".codex"), { recursive: true });
  await writeFile(path.join(root, ".codex", "hooks.json"), JSON.stringify({ hooks: { Stop: [{ continue: false }, { decision: "allow" }] } }));
  const result = await checkLongTaskHostGate(root);
  assert.equal(result.status, "host_completion_gate_unavailable");
  assert.ok(result.findings.some((finding) => finding.startsWith("managed_requirements_invalid:")));
  assert.equal(result.findings.some((finding) => finding === "conflicting_stop_hook_continue_false"), false, "repo configuration is not an authority inspected by V3");
});
