import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkLongTaskHostGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

test("non_managed_hook_only cannot satisfy Host Gate preflight", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-project-only-"));
  await writeHappyV3Contract(root);
  const result = await checkLongTaskHostGate(root);
  assert.equal(result.status, "host_completion_gate_unavailable");
  assert.ok(result.findings.some((finding) => /managed_(?:requirements|hook|host)/u.test(finding)));
});
