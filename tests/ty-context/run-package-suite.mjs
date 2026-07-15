import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const suite = process.argv[2];
if (suite !== "default" && suite !== "long-task") {
  throw new Error("Usage: run-package-suite.mjs <default|long-task> [node-test options]");
}

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const longTaskTestName = /^(?:codex-|composite-|long-task-|managed-campaign-|model-routing-|prepare-composite-|scope-fit-)/u;
const retiredRuntimeTests = new Set([
  "codex-app-server-client-v5.test.mjs",
  "composite-campaign-host-recovery-v5.test.mjs",
  "composite-campaign-v5-app-server-black-box.test.mjs",
]);
const files = (await readdir(testRoot))
  .filter((name) => name.endsWith(".test.mjs"))
  .filter((name) => !retiredRuntimeTests.has(name))
  .filter((name) => longTaskTestName.test(name) === (suite === "long-task"))
  .sort()
  .map((name) => path.join(testRoot, name));

if (files.length === 0) throw new Error(`No ${suite} package tests were selected.`);

const child = spawn(
  process.execPath,
  ["--test", "--test-concurrency=1", ...process.argv.slice(3), ...files],
  { stdio: "inherit" },
);

child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
