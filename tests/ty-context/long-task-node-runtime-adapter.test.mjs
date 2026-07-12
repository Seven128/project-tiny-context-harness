import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startHostSandboxCommandV1 } from "../../packages/ty-context/dist/lib/long-task-oracle-runner.js";
import { LongTaskRedactorV3 } from "../../packages/ty-context/dist/lib/long-task-redaction.js";

test("Host command rejects a tampered dependency runtime adapter before launch", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-runtime-adapter-tamper-"));
  const readable = path.join(root, "read");
  const writable = path.join(root, "write");
  await Promise.all([mkdir(readable), mkdir(writable)]);
  const adapter = path.join(readable, "node-runtime-adapter.cjs");
  await writeFile(adapter, "module.exports = true;\n");
  await assert.rejects(
    () => startHostSandboxCommandV1(process.execPath, ["-e", "process.exit(0)"], readable, 5000, {}, { read_paths: [readable], write_paths: [writable] }, new LongTaskRedactorV3({}), { control_root: writable, node_preload: adapter }),
    /node_runtime_adapter_identity/
  );
});
