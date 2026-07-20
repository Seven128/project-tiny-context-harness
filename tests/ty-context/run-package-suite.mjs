import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LONG_TASK_TRUST_TEST_FILES,
  resolveTestTimingOutput,
} from "../../tools/test_suite_policy.mjs";

const suite = process.argv[2];
if (
  suite !== "default" &&
  suite !== "long-task" &&
  suite !== "long-task-trust"
) {
  throw new Error(
    "Usage: run-package-suite.mjs <default|long-task|long-task-trust> [node-test options]",
  );
}

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testRoot, "../..");
const longTaskTestName = /^long-task-/u;
const availableNames = (await readdir(testRoot))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();
const names = selectNames(availableNames, suite);
const files = names.map((name) => path.join(testRoot, name));

if (files.length === 0)
  throw new Error(`No ${suite} package tests were selected.`);

const forwardedOptions = process.argv.slice(3);
const reporterOptions =
  process.env.CI &&
  process.env.TY_CONTEXT_VERBOSE_TESTS !== "1" &&
  !forwardedOptions.some(
    (option) =>
      option === "--test-reporter" || option.startsWith("--test-reporter="),
  )
    ? ["--test-reporter=dot"]
    : [];
const startedAt = performance.now();
const completion = await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      ...reporterOptions,
      ...forwardedOptions,
      ...files,
    ],
    { stdio: "inherit" },
  );
  child.once("error", reject);
  child.once("exit", (code, signal) => resolve({ code, signal }));
});
const timing = {
  schema_version: "test-suite-timing-v1",
  suite,
  file_count: files.length,
  wall_time_ms: Math.round(performance.now() - startedAt),
  status: completion.signal
    ? `signal:${completion.signal}`
    : completion.code === 0
      ? "passed"
      : "failed",
};
console.log(`\n${JSON.stringify(timing)}`);

const timingOutput = resolveTestTimingOutput(repositoryRoot, suite);
if (timingOutput) {
  const output = timingOutput;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(timing, null, 2)}\n`, "utf8");
}

if (completion.signal) process.kill(process.pid, completion.signal);
else process.exitCode = completion.code ?? 1;

function selectNames(available, selectedSuite) {
  if (selectedSuite === "long-task-trust") {
    const availableSet = new Set(available);
    const missing = LONG_TASK_TRUST_TEST_FILES.filter(
      (name) => !availableSet.has(name),
    );
    if (missing.length > 0)
      throw new Error(
        `Missing Trust Boundary test files: ${missing.join(", ")}`,
      );
    return [...LONG_TASK_TRUST_TEST_FILES];
  }
  return available.filter(
    (name) => longTaskTestName.test(name) === (selectedSuite === "long-task"),
  );
}
