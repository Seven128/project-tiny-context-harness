import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  verifyPackageBuildFingerprint,
  writePackageBuildFingerprint,
} from "../../tools/package_build_fingerprint.mjs";
import { selectAffectedTests } from "../../tools/affected_test_selection.mjs";
import {
  LONG_TASK_EXCLUSIVE_TEST_FILES,
  LONG_TASK_ISOLATED_TEST_FILES,
  LONG_TASK_PURE_TEST_FILES,
  classifyLongTaskTestFile,
  planLongTaskIsolationLanes,
} from "../../tools/test_suite_policy.mjs";
import {
  createDeliveryFixture,
  prepareDeliveryFixtureSeed,
} from "./long-task-delivery-fixtures.mjs";
import { buildFileTimingReport } from "./test-suite-file-reporter.mjs";
import { createWorkspaceSnapshot } from "../../packages/ty-context/dist/lib/long-task-workspace.js";

const exec = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

test("build fingerprint accepts the matching snapshot and rejects stale dist", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-build-stamp-"));
  try {
    await mkdir(path.join(root, "packages", "ty-context", "src"), {
      recursive: true,
    });
    await mkdir(path.join(root, "packages", "ty-context", "dist"), {
      recursive: true,
    });
    await mkdir(path.join(root, "tools"), { recursive: true });
    await writeFile(
      path.join(root, "packages", "ty-context", "src", "index.ts"),
      "export const value = 1;\n",
    );
    await writeFile(
      path.join(root, "packages", "ty-context", "dist", "cli.js"),
      "export {};\n",
    );
    await writeFile(
      path.join(root, "packages", "ty-context", "package.json"),
      '{"name":"fixture","version":"1.0.0"}\n',
    );
    await writeFile(
      path.join(root, "packages", "ty-context", "tsconfig.json"),
      '{"compilerOptions":{"outDir":"dist"}}\n',
    );
    await writeFile(path.join(root, "package-lock.json"), "{}\n");
    await cp(
      path.join(repositoryRoot, "tools", "package_build_fingerprint.mjs"),
      path.join(root, "tools", "package_build_fingerprint.mjs"),
    );

    await writePackageBuildFingerprint({ repositoryRoot: root });
    await assert.doesNotReject(
      verifyPackageBuildFingerprint({ repositoryRoot: root }),
    );

    await writeFile(
      path.join(root, "packages", "ty-context", "src", "index.ts"),
      "export const value = 2;\n",
    );
    await assert.rejects(
      verifyPackageBuildFingerprint({ repositoryRoot: root }),
      /build_fingerprint_stale/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("workspace snapshots materialize current Context while fingerprinting it separately", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-snapshot-context-"));
  const workdir = path.join(root, ".work_products", "task");
  let snapshot = null;
  try {
    await mkdir(path.join(root, "project_context"), { recursive: true });
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(workdir, { recursive: true });
    await writeFile(path.join(root, "project_context", "global.md"), "# Initial\n");
    await writeFile(path.join(root, "src", "index.mjs"), "export {};\n");
    await git(root, ["init"]);
    await git(root, ["config", "user.email", "fixture@example.test"]);
    await git(root, ["config", "user.name", "Fixture"]);
    await git(root, ["add", "."]);
    await git(root, ["commit", "-m", "fixture"]);

    await writeFile(path.join(root, "project_context", "global.md"), "# Current\n");
    snapshot = await createWorkspaceSnapshot(root, workdir, "context-fixture");

    assert.equal(
      await readFile(path.join(snapshot.root, "project_context", "global.md"), "utf8"),
      "# Current\n",
    );
    assert.equal(
      snapshot.manifest.files.some((file) =>
        file.path.startsWith("project_context/"),
      ),
      false,
    );
  } finally {
    if (snapshot) await snapshot.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test("suite-scoped fixture seeds preserve independent repository semantics", async () => {
  const seed = await prepareDeliveryFixtureSeed();
  const first = await createDeliveryFixture({ fixtureSeedRoot: seed.root });
  const second = await createDeliveryFixture({ fixtureSeedRoot: seed.root });
  const external = await createDeliveryFixture({
    externalConfirmation: true,
    fixtureSeedRoot: seed.root,
  });
  try {
    const firstCommon = await git(first.root, ["rev-parse", "--git-common-dir"]);
    const secondCommon = await git(second.root, ["rev-parse", "--git-common-dir"]);
    assert.notEqual(
      path.resolve(first.root, firstCommon),
      path.resolve(second.root, secondCommon),
    );
    assert.equal(await git(first.root, ["remote"]), "");
    assert.equal(await git(second.root, ["remote"]), "");

    const secondSource = await readFile(
      path.join(second.root, "source.md"),
      "utf8",
    );
    await writeFile(path.join(first.root, "source.md"), "mutated\n");
    await git(first.root, ["config", "user.email", "changed@example.test"]);
    assert.equal(
      await readFile(path.join(second.root, "source.md"), "utf8"),
      secondSource,
    );
    assert.equal(
      await git(second.root, ["config", "user.email"]),
      "fixture@example.test",
    );
    assert.match(
      await readFile(path.join(external.root, "source.md"), "utf8"),
      /fixture-external/u,
    );
  } finally {
    await Promise.all([
      rm(first.root, { recursive: true, force: true }),
      rm(second.root, { recursive: true, force: true }),
      rm(external.root, { recursive: true, force: true }),
      seed.cleanup(),
    ]);
  }
});

test("Long-Task isolation lanes are explicit, exhaustive, and fail unknown files closed", async () => {
  const available = (await readdir(path.join(repositoryRoot, "tests", "ty-context")))
    .filter((name) => /^long-task-.*\.test\.mjs$/u.test(name))
    .sort();
  const classified = [
    ...LONG_TASK_PURE_TEST_FILES,
    ...LONG_TASK_ISOLATED_TEST_FILES,
    ...LONG_TASK_EXCLUSIVE_TEST_FILES,
  ];
  assert.equal(new Set(classified).size, classified.length);
  assert.deepEqual([...classified].sort(), available);
  assert.equal(LONG_TASK_PURE_TEST_FILES.length, 11);
  assert.equal(LONG_TASK_ISOLATED_TEST_FILES.length, 39);
  assert.equal(LONG_TASK_EXCLUSIVE_TEST_FILES.length, 10);
  assert.equal(
    classifyLongTaskTestFile("long-task-delivery-compiler.test.mjs"),
    "exclusive",
  );
  assert.equal(
    classifyLongTaskTestFile("long-task-playwright-trust-boundary.test.mjs"),
    "exclusive",
  );
  assert.equal(classifyLongTaskTestFile("long-task-new.test.mjs"), "exclusive");

  const lanes = planLongTaskIsolationLanes(available, 2);
  assert.equal(lanes.safe.concurrency, 2);
  assert.equal(lanes.exclusive.concurrency, 1);
  assert.equal(
    new Set([...lanes.safe.files, ...lanes.exclusive.files]).size,
    available.length,
  );
  assert.deepEqual(
    [...lanes.safe.files, ...lanes.exclusive.files].sort(),
    available,
  );
});

test("file timing diagnostics retain one terminal record for every selected file", () => {
  const selectedFiles = [
    path.join(repositoryRoot, "tests", "ty-context", "alpha.test.mjs"),
    path.join(repositoryRoot, "tests", "ty-context", "beta.test.mjs"),
  ];
  const report = buildFileTimingReport({
    suite: "probe",
    selectedFiles,
    wallTimeMs: 25,
    execution: { mode: "serial", isolated_concurrency: 1 },
    executionError: "fixture runner startup failed",
    events: [
      event("test:pass", selectedFiles[0], "alpha one", 8),
      event("test:pass", selectedFiles[0], "alpha two", 4),
      event("test:fail", selectedFiles[1], "beta one", 5),
    ],
  });
  assert.equal(report.schema_version, "test-suite-timing-v2");
  assert.equal(report.file_count, 2);
  assert.equal(report.test_count, 3);
  assert.equal(report.files.length, 2);
  assert.deepEqual(
    report.files.map(({ file, status, test_count }) => ({
      file,
      status,
      test_count,
    })),
    [
      { file: "alpha.test.mjs", status: "passed", test_count: 2 },
      { file: "beta.test.mjs", status: "failed", test_count: 1 },
    ],
  );
  assert.equal(report.files[1].tests[0].failure_message, "fixture failed");
  assert.equal(report.execution_error, "fixture runner startup failed");
});

test("complete affected routing explicitly supersedes a separate Trust aggregate", () => {
  const selection = selectAffectedTests(["packages/ty-context/package.json"]);
  assert.equal(selection.mode, "full-suite");
  assert.deepEqual(selection.supersedes, [
    "developer-feedback",
    "trust-boundary",
  ]);
});

function event(type, file, name, durationMs) {
  return {
    type,
    data: {
      file,
      name,
      details: {
        duration_ms: durationMs,
        failure_message: type === "test:fail" ? "fixture failed" : null,
      },
    },
  };
}

async function git(cwd, args) {
  const result = await exec("git", args, { cwd, windowsHide: true });
  return result.stdout.trim();
}
