import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLongTaskCompletionGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function project() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-gate-"));
  await mkdir(path.join(root, ".codex", "hooks"), { recursive: true });
  await copyFile(path.join(repoRoot, ".codex", "hooks", "long-task-hook.mjs"), path.join(root, ".codex", "hooks", "long-task-hook.mjs"));
  await copyFile(path.join(repoRoot, ".codex", "hooks.json"), path.join(root, ".codex", "hooks.json"));
  return root;
}

test("valid project Hook bundle is available", async () => {
  assert.equal((await checkLongTaskCompletionGate(await project())).status, "available");
});

test("missing Hook script is unavailable", async () => {
  const root = await project();
  await rm(path.join(root, ".codex", "hooks", "long-task-hook.mjs"));
  assert.equal((await checkLongTaskCompletionGate(root)).status, "completion_gate_unavailable");
});

test("similarly named no-op Hook is unavailable", async () => {
  const root = await project();
  await writeFile(path.join(root, ".codex", "hooks", "long-task-hook.mjs"), "process.stdout.write('{}\\n');\n");
  const result = await checkLongTaskCompletionGate(root);
  assert.ok(result.findings.includes("completion_hook_script_unmanaged"));
});

test("missing Stop event is unavailable", async () => {
  const root = await project();
  const file = path.join(root, ".codex", "hooks.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  delete config.hooks.Stop;
  await writeFile(file, JSON.stringify(config));
  const result = await checkLongTaskCompletionGate(root);
  assert.ok(result.findings.includes("completion_hook_event_missing:Stop"));
});

test("conflicting_stop_hook_continue_false is unavailable", async () => {
  const root = await project();
  const file = path.join(root, ".codex", "hooks.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  config.hooks.Stop.unshift({ continue: false });
  await writeFile(file, JSON.stringify(config));
  const result = await checkLongTaskCompletionGate(root);
  assert.ok(result.findings.includes("conflicting_stop_hook_continue_false"));
});
