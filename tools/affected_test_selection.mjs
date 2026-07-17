import path from "node:path";

const TEST_ROOT = "tests/ty-context";

export const LONG_TASK_FOCUSED_TESTS = [
  "affected-test-selection.test.mjs",
  "long-task-authority-progress-retry.test.mjs",
  "long-task-closure-invariants.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-design-context.test.mjs",
  "long-task-efficiency-design.test.mjs",
  "long-task-semantic-authority-revision.test.mjs",
  "workflow-test-entrypoints.test.mjs",
].map(testPath);

export const DELIVERY_CONTRACT_FOCUSED_TESTS = [
  "long-task-authoring-claims.test.mjs",
  "long-task-authoring-preflight.test.mjs",
  "long-task-claim-coverage.test.mjs",
  "long-task-delivery-compiler.test.mjs",
  "long-task-delivery-parser.test.mjs",
  "long-task-delivery-risk.test.mjs",
  "long-task-source-authority-closure.test.mjs",
].map(testPath);

const STATIC_TESTS = new Set(
  [
    "affected-test-selection.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

const HOTSPOT_TESTS = new Map([
  [
    "packages/ty-context/src/lib/long-task-authority-types.ts",
    [
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-runtime-types.ts",
    [
      "long-task-context-evolution.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-state-resume.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/commands/long-task.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-workflow-black-box.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/context-graph-snapshot.ts",
    [
      "context-manifest-hardening.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-context-authority.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-materials.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-material-diff.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-delivery-compiler.ts",
    [
      "long-task-closure-invariants.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-progress.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-state-resume.test.mjs",
    ],
  ],
]);

export function selectAffectedTests(changedPaths, options = {}) {
  const scope = options.scope ?? "auto";
  if (scope === "all") return plan("full-suite", [], true, ["scope:all"]);
  if (scope === "long-task")
    return plan("selected", LONG_TASK_FOCUSED_TESTS, true, ["scope:long-task"]);
  if (scope === "delivery-contract")
    return plan("selected", DELIVERY_CONTRACT_FOCUSED_TESTS, true, [
      "scope:delivery-contract",
    ]);
  if (scope !== "auto")
    throw new Error(`unknown affected-test scope: ${scope}`);

  const normalized = [...new Set(changedPaths.map(normalizePath))].filter(
    Boolean,
  );
  if (!normalized.length)
    return plan("selected", LONG_TASK_FOCUSED_TESTS, true, [
      "no_changes:focused_default",
    ]);

  const tests = new Set();
  const reasons = [];
  let mode = "selected";

  for (const file of normalized) {
    if (file.startsWith(`${TEST_ROOT}/`)) {
      if (file.endsWith(".test.mjs")) {
        tests.add(file);
        reasons.push(`${file}:direct_test`);
      } else {
        const suite = path.basename(file).startsWith("long-task-")
          ? "long-task-suite"
          : "full-suite";
        mode = widen(mode, suite);
        reasons.push(`${file}:shared_test_support`);
      }
      continue;
    }

    const hotspot = HOTSPOT_TESTS.get(file);
    if (hotspot) {
      hotspot.map(testPath).forEach((test) => tests.add(test));
      reasons.push(`${file}:mapped_hotspot`);
      continue;
    }

    if (
      file === "tools/affected_test_selection.mjs" ||
      file === "tools/run_affected_tests.mjs"
    ) {
      tests.add(testPath("affected-test-selection.test.mjs"));
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:affected_test_tooling`);
      continue;
    }

    if (file === "package.json") {
      tests.add(testPath("affected-test-selection.test.mjs"));
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:root_entrypoints`);
      continue;
    }

    if (
      file === "package-lock.json" ||
      file === "packages/ty-context/package.json" ||
      file.startsWith("packages/ty-context/tsconfig")
    ) {
      mode = "full-suite";
      reasons.push(`${file}:package_or_dependency_boundary`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/schemas/")) {
      mode = widen(mode, "long-task-suite");
      reasons.push(`${file}:contract_schema`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/lib/long-task-")) {
      mode = widen(mode, "long-task-suite");
      reasons.push(`${file}:unmapped_long_task_runtime`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/")) {
      mode = "full-suite";
      reasons.push(`${file}:shared_package_runtime`);
      continue;
    }

    if (
      file.startsWith(".codex/") ||
      file.startsWith("packages/ty-context/assets/")
    ) {
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("package-source.test.mjs"));
      tests.add(testPath("workflow-contract-routing.test.mjs"));
      reasons.push(`${file}:managed_guidance`);
      continue;
    }

    if (file.startsWith("project_context/")) {
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("validators.test.mjs"));
      reasons.push(`${file}:project_context`);
      continue;
    }

    if (
      file === "PROJECT_SPEC.md" ||
      file === "packages/ty-context/README.md" ||
      /^README(?:\.zh-CN)?\.md$/u.test(file)
    ) {
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("package-source.test.mjs"));
      reasons.push(`${file}:public_design_surface`);
      continue;
    }

    if (
      file.startsWith(".github/workflows/") ||
      file.startsWith("tools/release_")
    ) {
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:workflow_entrypoint`);
      continue;
    }

    if (file.endsWith(".md") || file.startsWith("docs/")) {
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      reasons.push(`${file}:documentation`);
      continue;
    }

    mode = "full-suite";
    reasons.push(`${file}:unclassified_fail_safe`);
  }

  if (mode !== "selected") tests.clear();
  const selected = [...tests].sort();
  const requiresBuild =
    mode !== "selected" || selected.some((test) => !STATIC_TESTS.has(test));
  return plan(mode, selected, requiresBuild, reasons);
}

function plan(mode, tests, requiresBuild, reasons) {
  return {
    mode,
    tests: [...new Set(tests)].sort(),
    requires_build: requiresBuild,
    reasons: [...new Set(reasons)].sort(),
  };
}

function widen(current, next) {
  const rank = { selected: 0, "long-task-suite": 1, "full-suite": 2 };
  return rank[next] > rank[current] ? next : current;
}

function testPath(name) {
  return `${TEST_ROOT}/${name}`;
}

function normalizePath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .trim();
}
