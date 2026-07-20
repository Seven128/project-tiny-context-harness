import path from "node:path";

export const TEST_ROOT = "tests/ty-context";

export const LONG_TASK_TRUST_TEST_FILES = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-final-closure-mutation-smoke.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-workflow-black-box.test.mjs",
]);

export const LONG_TASK_TRUST_TESTS = Object.freeze(
  LONG_TASK_TRUST_TEST_FILES.map(testPath),
);

export const LONG_TASK_FOCUSED_TESTS = Object.freeze(
  [
    "affected-change-discovery.test.mjs",
    "affected-test-selection.test.mjs",
    "long-task-authority-progress-retry.test.mjs",
    "long-task-authority-revision-classification.test.mjs",
    "long-task-authority-revision-diagnosis.test.mjs",
    "long-task-closure-invariants.test.mjs",
    "long-task-context-authority-topology.test.mjs",
    "long-task-context-evolution.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "long-task-model-choice-checkpoint.test.mjs",
    "long-task-semantic-authority-revision.test.mjs",
    "visual-delivery-guidance.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

export const DELIVERY_CONTRACT_FOCUSED_TESTS = Object.freeze(
  [
    "long-task-authoring-claims.test.mjs",
    "long-task-authoring-preflight.test.mjs",
    "long-task-claim-coverage.test.mjs",
    "long-task-delivery-compiler.test.mjs",
    "long-task-delivery-parser.test.mjs",
    "long-task-delivery-risk.test.mjs",
    "long-task-source-authority-closure.test.mjs",
  ].map(testPath),
);

export const STATIC_TESTS = new Set(
  [
    "affected-change-discovery.test.mjs",
    "affected-test-selection.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "visual-delivery-guidance.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

export function normalizeRepositoryPath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .trim();
}

export function resolveTestTimingOutput(
  repositoryRoot,
  suite,
  environment = process.env,
) {
  if (environment.TY_CONTEXT_TEST_TIMING_FILE)
    return resolveFromRepository(
      repositoryRoot,
      environment.TY_CONTEXT_TEST_TIMING_FILE,
    );
  if (environment.TY_CONTEXT_TEST_TIMING_DIR)
    return resolveFromRepository(
      repositoryRoot,
      path.join(environment.TY_CONTEXT_TEST_TIMING_DIR, `${suite}.json`),
    );
  return null;
}

export function testPath(name) {
  return `${TEST_ROOT}/${name}`;
}

function resolveFromRepository(repositoryRoot, value) {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}
