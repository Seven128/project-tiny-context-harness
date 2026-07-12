import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLongTaskHostGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("a complete repo-local Hook bundle cannot satisfy the managed Host preflight", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-project-hook-"));
  await mkdir(path.join(root, ".codex", "hooks"), { recursive: true });
  await writeFile(path.join(root, ".codex", "hooks", "long-task-hook.mjs"), "process.stdout.write('{}\\n')\n");
  await writeFile(path.join(root, ".codex", "hooks.json"), JSON.stringify({ hooks: { SessionStart: [], PostCompact: [], Stop: [] } }));
  const result = await checkLongTaskHostGate(root);
  assert.equal(result.status, "host_completion_gate_unavailable");
  assert.ok(result.findings.some((finding) => /managed_(?:requirements|host)/u.test(finding)));
});

test("the canonical managed adapter is a strict stdin-to-RPC adapter with no repo or environment authority", async () => {
  const source = await readFile(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "long-task-hook.mjs"), "utf8");
  assert.doesNotMatch(source, /child_process|execFile|spawn|git rev-parse|\.codex[\\/]hooks/u);
  assert.match(source, /process\.env\.TY_CONTEXT_HOST_SMOKE_TOKEN/u);
  assert.doesNotMatch(source.replaceAll("process.env.TY_CONTEXT_HOST_SMOKE_TOKEN", ""), /process\.env/u);
  assert.match(source, /MAX = 1024 \* 1024/u);
  assert.match(source, /host_completion_gate_unavailable/u);
});
