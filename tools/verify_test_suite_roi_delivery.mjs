import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const artifactRoot = path.join(
  repositoryRoot,
  ".artifacts",
  "test-suite-roi-final",
);
const timingRoot = path.join(artifactRoot, "timing");
const logPath = path.join(artifactRoot, "complete-suite.log");
const maximumLongTaskWallTimeMs = 1_598_030;
const originalLongTaskFiles = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-assertion-safety.test.mjs",
  "long-task-authoring-claims.test.mjs",
  "long-task-authoring-preflight.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-authoring-fields.test.mjs",
  "long-task-authority-field-completeness.test.mjs",
  "long-task-authority-progress-retry.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-capacity-boundary.test.mjs",
  "long-task-claim-coverage.test.mjs",
  "long-task-closure-invariants.test.mjs",
  "long-task-compact-authoring.test.mjs",
  "long-task-context-authority-topology.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-corrupt-state-abandon.test.mjs",
  "long-task-counterfactual-integrity.test.mjs",
  "long-task-delivery-compiler.test.mjs",
  "long-task-delivery-parser.test.mjs",
  "long-task-delivery-risk.test.mjs",
  "long-task-design-context.test.mjs",
  "long-task-efficiency-design.test.mjs",
  "long-task-evidence-kernel.test.mjs",
  "long-task-evidence-sensitivity-policy.test.mjs",
  "long-task-evidence-sensitivity-surfaces.test.mjs",
  "long-task-execution-input-policy.test.mjs",
  "long-task-final-authority-race.test.mjs",
  "long-task-final-closure-mutation-smoke.test.mjs",
  "long-task-finding-context.test.mjs",
  "long-task-first-compile-authority-lock.test.mjs",
  "long-task-global-blocked-status.test.mjs",
  "long-task-global-claim-coverage.test.mjs",
  "long-task-global-evidence-sensitivity.test.mjs",
  "long-task-model-choice-checkpoint.test.mjs",
  "long-task-non-completing-source.test.mjs",
  "long-task-path-canonicalization.test.mjs",
  "long-task-pattern-containment.test.mjs",
  "long-task-pattern-overlap.test.mjs",
  "long-task-planned-counterfactual.test.mjs",
  "long-task-platform-boundary.test.mjs",
  "long-task-playwright-ac-evidence.test.mjs",
  "long-task-playwright-trust-boundary.test.mjs",
  "long-task-population-environment.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-protected-paths.test.mjs",
  "long-task-public-contract-example.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-raw-execution-identity.test.mjs",
  "long-task-release-tarball-contract.test.mjs",
  "long-task-runner-freeze-v2.test.mjs",
  "long-task-schema-parser-parity.test.mjs",
  "long-task-semantic-authority-revision.test.mjs",
  "long-task-semantic-drift-closure.test.mjs",
  "long-task-semantic-drift-lifecycle.test.mjs",
  "long-task-source-authority-closure.test.mjs",
  "long-task-source-risk-binding.test.mjs",
  "long-task-state-resume.test.mjs",
  "long-task-verifier-migration.test.mjs",
  "long-task-workflow-black-box.test.mjs",
]);
const requiredCarriers = Object.freeze([
  "tools/package_build_fingerprint.mjs",
  "tools/run_affected_tests.mjs",
  "tools/affected_test_selection.mjs",
  "tools/test_suite_policy.mjs",
  "tests/ty-context/run-package-suite.mjs",
  "tests/ty-context/test-suite-file-reporter.mjs",
  "tests/ty-context/long-task-delivery-fixtures.mjs",
  "packages/ty-context/package.json",
]);
const assertionKeys = Object.freeze([
  "routing-and-build",
  "fixture-isolation",
  "timing-and-lanes",
  "coverage-and-roi",
  "no-shortcut",
]);

const missingCarriers = [];
for (const relativePath of requiredCarriers) {
  try {
    const info = await stat(path.join(repositoryRoot, relativePath));
    if (!info.isFile()) missingCarriers.push(relativePath);
  } catch {
    missingCarriers.push(relativePath);
  }
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(timingRoot, { recursive: true });

let defaultTiming = null;
let longTaskTiming = null;
let command = { code: null, signal: null, failure_tail: null };
let diagnostic = null;

if (missingCarriers.length === 0) {
  try {
    const spec = npmCommandSpec([
      "test",
      "--workspace",
      "project-tiny-context-harness",
    ]);
    command = await run(spec.command, spec.args, {
      ...process.env,
      TY_CONTEXT_TEST_TIMING_DIR: timingRoot,
      TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON: "",
    });
    defaultTiming = await readJson(path.join(timingRoot, "default.json"));
    longTaskTiming = await readJson(path.join(timingRoot, "long-task.json"));
  } catch (error) {
    diagnostic = error instanceof Error ? error.message : String(error);
  }
} else {
  diagnostic = `required_carriers_missing:${missingCarriers.join(",")}`;
  await writeFile(logPath, `${diagnostic}\n`, "utf8");
}

const runtimeTestPassed = filePassed(
  defaultTiming,
  "test-suite-runtime.test.mjs",
);
const routingAndBuild =
  missingCarriers.length === 0 && command.code === 0 && runtimeTestPassed;
const fixtureIsolation = routingAndBuild;
const timingAndLanes =
  timingReportComplete(defaultTiming) && timingReportComplete(longTaskTiming);
const observedLongTaskFiles = new Set(
  longTaskTiming?.files?.map((entry) => entry.file) ?? [],
);
const observedOriginalFiles = originalLongTaskFiles.filter((name) =>
  observedLongTaskFiles.has(name),
);
const coveragePreserved =
  command.code === 0 &&
  timingAndLanes &&
  observedOriginalFiles.length === originalLongTaskFiles.length &&
  longTaskTiming.test_count >= 281 &&
  longTaskTiming.failed_count === 0 &&
  longTaskTiming.skipped_count === 0 &&
  longTaskTiming.cancelled_count === 0 &&
  longTaskTiming.missing_file_count === 0;
const roiTargetMet =
  coveragePreserved &&
  Number.isFinite(longTaskTiming.wall_time_ms) &&
  longTaskTiming.wall_time_ms <= maximumLongTaskWallTimeMs;
const coverageAndRoi = coveragePreserved && roiTargetMet;
const noShortcuts =
  routingAndBuild &&
  fixtureIsolation &&
  timingAndLanes &&
  coveragePreserved &&
  longTaskTiming.result_cache_used === false &&
  longTaskTiming.unknown_files_parallelized === false;

const observations = {
  result:
    routingAndBuild &&
    fixtureIsolation &&
    timingAndLanes &&
    coverageAndRoi &&
    noShortcuts,
  routing_and_build: routingAndBuild,
  fixture_isolation: fixtureIsolation,
  timing_and_lanes: timingAndLanes,
  coverage_and_roi: coverageAndRoi,
  shortcut_detected: !noShortcuts,
  measured_long_task_wall_time_ms: longTaskTiming?.wall_time_ms ?? null,
  maximum_long_task_wall_time_ms: maximumLongTaskWallTimeMs,
  complete_suite_exit_code: command.code,
  complete_suite_signal: command.signal,
  complete_suite_diagnostic: diagnostic,
  complete_suite_failure_tail: command.failure_tail,
  default_timing_present: defaultTiming !== null,
  long_task_timing_present: longTaskTiming !== null,
  missing_carriers: missingCarriers,
  original_long_task_file_sha256: sha256(
    `${originalLongTaskFiles.join("\n")}\n`,
  ),
  population: {
    eligible_ids: originalLongTaskFiles,
    observed_ids: observedOriginalFiles,
    excluded_items: [],
  },
};
const evidenceRecords = assertionKeys.map((assertionKey) => ({
  assertion_key: assertionKey,
  capability: "target_runtime",
  target_ref: "test-suite-runtime",
  root_entrypoint: "tools/verify_test_suite_roi_delivery.mjs",
  session_id: `test-suite-roi-${sha256(JSON.stringify(observations)).slice(0, 16)}`,
  cold_start: true,
}));

console.log(
  JSON.stringify({
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records: evidenceRecords,
    diagnostics: {
      missing_carriers: missingCarriers,
      command,
      diagnostic,
      log_path: path.relative(repositoryRoot, logPath).replaceAll("\\", "/"),
    },
  }),
);

function filePassed(timing, file) {
  return timing?.files?.some(
    (entry) => entry.file === file && entry.status === "passed",
  );
}

function timingReportComplete(timing) {
  return (
    timing?.schema_version === "test-suite-timing-v2" &&
    Number.isInteger(timing.file_count) &&
    timing.file_count > 0 &&
    timing.files?.length === timing.file_count &&
    timing.files.every(
      (entry) =>
        typeof entry.file === "string" &&
        Number.isFinite(entry.duration_ms) &&
        ["passed", "failed", "skipped", "cancelled", "missing"].includes(
          entry.status,
        ),
    )
  );
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function run(commandName, args, env) {
  await mkdir(path.dirname(logPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, {
      cwd: repositoryRoot,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      const output = Buffer.concat(chunks);
      void writeFile(logPath, output).then(
        () =>
          resolve({
            code,
            signal,
            failure_tail:
              code === 0 && !signal ? null : boundedOutputTail(output),
          }),
        reject,
      );
    });
  });
}

function boundedOutputTail(output) {
  const text = output.toString("utf8");
  return text.slice(Math.max(0, text.length - 6000));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
