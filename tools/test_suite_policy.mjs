import path from "node:path";

export const TEST_ROOT = "tests/ty-context";

export const TEST_TIER_REVIEW_BUDGETS = Object.freeze({
  long_task_trust: Object.freeze({
    max_files: 11,
    reviewed_on: "2026-07-22",
    rationale:
      "One canonical file per currently reviewed high-impact trust-boundary invariant family; raise only when a new independent invariant cannot be covered by an existing sentinel.",
  }),
  long_task_focused: Object.freeze({
    max_files: 16,
    reviewed_on: "2026-07-22",
    rationale:
      "Bound the default Long-Task edit loop while retaining the current authority, Context, design, semantic-drift, and entry-point coverage.",
  }),
  delivery_contract_focused: Object.freeze({
    max_files: 9,
    reviewed_on: "2026-07-22",
    rationale:
      "Bound Contract-authoring feedback while retaining parser, compiler, coverage, risk, semantic-drift, and Source-authority sentinels.",
  }),
  hotspot_fanout: Object.freeze({
    max_tests_per_path: 8,
    reviewed_on: "2026-07-22",
    rationale:
      "A single implementation path selecting more tests requires remapping or an explicit review; complete-suite discovery remains uncapped.",
  }),
});

export const LONG_TASK_TRUST_TEST_FILES = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-final-closure-mutation-smoke.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-semantic-drift-closure.test.mjs",
  "long-task-semantic-drift-lifecycle.test.mjs",
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
    "long-task-semantic-drift-closure.test.mjs",
    "long-task-semantic-drift-lifecycle.test.mjs",
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
    "long-task-semantic-drift-closure.test.mjs",
    "long-task-semantic-drift-lifecycle.test.mjs",
    "long-task-source-authority-closure.test.mjs",
  ].map(testPath),
);

export const STATIC_TESTS = new Set(
  [
    "affected-change-discovery.test.mjs",
    "affected-test-selection.test.mjs",
    "design-system-authoring-skill.test.mjs",
    "design-resource-authoring-provider.test.mjs",
    "design-resource-authoring-skill.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "test-suite-runtime.test.mjs",
    "visual-delivery-guidance.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

export const LONG_TASK_PURE_TEST_FILES = Object.freeze([
  "long-task-assertion-safety.test.mjs",
  "long-task-authority-field-completeness.test.mjs",
  "long-task-claim-coverage.test.mjs",
  "long-task-context-authority-topology.test.mjs",
  "long-task-delivery-parser.test.mjs",
  "long-task-delivery-risk.test.mjs",
  "long-task-design-context.test.mjs",
  "long-task-efficiency-design.test.mjs",
  "long-task-execution-input-policy.test.mjs",
  "long-task-playwright-ac-evidence.test.mjs",
  "long-task-semantic-drift-closure.test.mjs",
]);

export const LONG_TASK_ISOLATED_TEST_FILES = Object.freeze([
  "long-task-authoring-claims.test.mjs",
  "long-task-authoring-preflight.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-authoring-fields.test.mjs",
  "long-task-authority-progress-retry.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-capacity-boundary.test.mjs",
  "long-task-closure-invariants.test.mjs",
  "long-task-compact-authoring.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-corrupt-state-abandon.test.mjs",
  "long-task-counterfactual-integrity.test.mjs",
  "long-task-delivery-compiler.test.mjs",
  "long-task-evidence-kernel.test.mjs",
  "long-task-evidence-sensitivity-policy.test.mjs",
  "long-task-evidence-sensitivity-surfaces.test.mjs",
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
  "long-task-playwright-trust-boundary.test.mjs",
  "long-task-protected-paths.test.mjs",
  "long-task-public-contract-example.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-raw-execution-identity.test.mjs",
  "long-task-runner-freeze-v2.test.mjs",
  "long-task-schema-parser-parity.test.mjs",
  "long-task-semantic-authority-revision.test.mjs",
  "long-task-semantic-drift-lifecycle.test.mjs",
  "long-task-source-authority-closure.test.mjs",
  "long-task-source-risk-binding.test.mjs",
  "long-task-state-resume.test.mjs",
]);

export const LONG_TASK_EXCLUSIVE_TEST_FILES = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-final-authority-race.test.mjs",
  "long-task-platform-boundary.test.mjs",
  "long-task-population-environment.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-release-tarball-contract.test.mjs",
  "long-task-verifier-migration.test.mjs",
  "long-task-workflow-black-box.test.mjs",
]);

export const LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY = 2;

const longTaskPureFiles = new Set(LONG_TASK_PURE_TEST_FILES);
const longTaskIsolatedFiles = new Set(LONG_TASK_ISOLATED_TEST_FILES);
const longTaskExclusiveFiles = new Set(LONG_TASK_EXCLUSIVE_TEST_FILES);

assertIsolationPolicy();

assertReviewedTestList(
  "Long-Task Trust Boundary Gate",
  LONG_TASK_TRUST_TESTS,
  TEST_TIER_REVIEW_BUDGETS.long_task_trust,
);
assertReviewedTestList(
  "Long-Task focused tier",
  LONG_TASK_FOCUSED_TESTS,
  TEST_TIER_REVIEW_BUDGETS.long_task_focused,
);
assertReviewedTestList(
  "Delivery Contract focused tier",
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  TEST_TIER_REVIEW_BUDGETS.delivery_contract_focused,
);

export function assertReviewedTestList(label, tests, budget) {
  const unique = new Set(tests);
  if (unique.size !== tests.length)
    throw new Error(
      `${label} contains duplicate test paths; deduplicate the policy without removing independent coverage.`,
    );
  if (tests.length > budget.max_files)
    throw new Error(
      `${label} has ${tests.length} files, above its reviewed maximum ${budget.max_files}. Update TEST_TIER_REVIEW_BUDGETS with an explicit rationale for the new independent coverage; do not delete coverage merely to fit the budget.`,
    );
}

export function assertHotspotTestFanoutBudget(entries) {
  const budget = TEST_TIER_REVIEW_BUDGETS.hotspot_fanout;
  for (const [sourcePath, tests] of entries) {
    const unique = new Set(tests);
    if (unique.size !== tests.length)
      throw new Error(
        `Affected-test hotspot ${sourcePath} contains duplicate test names.`,
      );
    if (tests.length > budget.max_tests_per_path)
      throw new Error(
        `Affected-test hotspot ${sourcePath} maps to ${tests.length} tests, above its reviewed maximum ${budget.max_tests_per_path}. Remap the owner or update TEST_TIER_REVIEW_BUDGETS with an explicit rationale; do not remove coverage merely to fit the budget.`,
      );
  }
}

export function normalizeRepositoryPath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .trim();
}

export function classifyLongTaskTestFile(value) {
  const name = path.basename(normalizeRepositoryPath(value));
  if (longTaskPureFiles.has(name)) return "pure";
  if (longTaskIsolatedFiles.has(name)) return "isolated";
  return "exclusive";
}

export function planLongTaskIsolationLanes(
  availableFiles,
  safeConcurrency = LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
) {
  if (!Number.isSafeInteger(safeConcurrency) || safeConcurrency < 1 || safeConcurrency > 2)
    throw new Error(
      "Long-Task isolated concurrency must be 1 or 2; use 1 as the serial rollback.",
    );
  const normalized = availableFiles.map((file) => path.basename(file));
  if (new Set(normalized).size !== normalized.length)
    throw new Error("Long-Task isolation planning received duplicate test files.");
  const safe = [];
  const exclusive = [];
  const unknown = [];
  for (const file of normalized) {
    const classification = classifyLongTaskTestFile(file);
    if (classification === "pure" || classification === "isolated") safe.push(file);
    else {
      exclusive.push(file);
      if (!longTaskExclusiveFiles.has(file)) unknown.push(file);
    }
  }
  return {
    safe: { files: safe, concurrency: safeConcurrency },
    exclusive: { files: exclusive, concurrency: 1 },
    unknown_files: unknown,
    unknown_files_parallelized: false,
  };
}

export function resolveLongTaskIsolatedConcurrency(environment = process.env) {
  const raw =
    environment.TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY ??
    String(LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY);
  if (!/^[12]$/u.test(raw))
    throw new Error(
      "TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY must be 1 or 2; use 1 as the serial rollback.",
    );
  return Number(raw);
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

export function resolveSuiteWallTimeBudgetMs(
  suite,
  environment = process.env,
) {
  const raw = environment.TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON;
  if (!raw) return null;
  let budgets;
  try {
    budgets = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!budgets || typeof budgets !== "object" || Array.isArray(budgets))
    throw new Error(
      "TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON must be a JSON object keyed by suite.",
    );
  const value = budgets[suite];
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(
      `TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON must provide a positive integer budget for ${suite}.`,
    );
  return value;
}

export function suiteWallTimeBudgetStatus(wallTimeMs, budgetMs) {
  if (budgetMs === null) return "not_configured";
  return wallTimeMs <= budgetMs ? "within_budget" : "exceeded";
}

export function testPath(name) {
  return `${TEST_ROOT}/${name}`;
}

function resolveFromRepository(repositoryRoot, value) {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

function assertIsolationPolicy() {
  if (LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY !== 2)
    throw new Error(
      "Long-Task safe-lane concurrency changed from the reviewed default of 2; retain TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1 as the mechanical serial rollback and repeat behavioral A/B proof before changing the default.",
    );
  const classified = [
    ...LONG_TASK_PURE_TEST_FILES,
    ...LONG_TASK_ISOLATED_TEST_FILES,
    ...LONG_TASK_EXCLUSIVE_TEST_FILES,
  ];
  if (new Set(classified).size !== classified.length)
    throw new Error("Long-Task isolation classes must be disjoint.");
  if (
    LONG_TASK_PURE_TEST_FILES.length !== 11 ||
    LONG_TASK_ISOLATED_TEST_FILES.length !== 41 ||
    LONG_TASK_EXCLUSIVE_TEST_FILES.length !== 8
  )
    throw new Error(
      "Long-Task isolation policy changed from the reviewed 11/41/8 population; review the new file explicitly instead of parallelizing it by default.",
    );
}
