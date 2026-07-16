import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("long-task workflow tests run only in GitHub CI or through their explicit command", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const publishWorkflow = read(".github/workflows/npm-publish.yml");
  const consumerWorkflow = read(".github/workflows/harness.yml");
  const publishRunbook = read("docs/launch/npm-trusted-publishing.md");
  const tarballSmoke = read("tools/release_tarball_smoke.mjs");
  const releasePrepare = read("tools/release_prepare.mjs");
  const releasePublish = read("tools/release_publish.mjs");
  const packageJson = JSON.parse(read("packages/ty-context/package.json"));

  assert.match(packageWorkflow, /Typecheck package/);
  assert.match(
    packageWorkflow,
    /main:[\s\S]*Build package\s+run: npm run build --workspace project-tiny-context-harness[\s\S]*Validate modularity waiver lifecycle/,
  );
  assert.match(packageWorkflow, /package check-source/);
  assert.match(packageWorkflow, /make validate-harness/);
  assert.match(packageWorkflow, /Complete package tests[\s\S]*run: npm test --workspace project-tiny-context-harness/);
  assert.doesNotMatch(packageWorkflow, /npm run test:long-task-workflow/);
  assert.match(packageWorkflow, /node tools\/quickstart_smoke\.mjs/);
  assert.match(packageWorkflow, /npm run preview:pack/);

  assert.match(publishWorkflow, /Build package/);
  assert.match(publishWorkflow, /npm install -g npm@12\.0\.1/);
  assert.doesNotMatch(publishWorkflow, /npm@latest/);
  assert.match(publishWorkflow, /Complete package tests[\s\S]*run: npm test --workspace project-tiny-context-harness/);
  assert.doesNotMatch(publishWorkflow, /npm run test:long-task-workflow/);
  assert.match(publishWorkflow, /release:check-version/);
  assert.match(publishWorkflow, /package check-source/);
  assert.match(publishWorkflow, /make validate-harness/);
  assert.match(publishWorkflow, /workflow_release_artifact\.mjs[\s\S]*--dry-run/);
  assert.match(publishWorkflow, /workflow-release-artifact\.json/);
  assert.match(publishWorkflow, /release_tarball_smoke\.mjs --tarball/);
  assert.match(publishWorkflow, /npm publish "\.artifacts\/releases\/prepared\/\$FILENAME"/);
  assert.match(read("tools/release_artifact_prepare.mjs"), /ty-context-release-artifact-v2|RELEASE_ARTIFACT_SCHEMA_V2/);
  assert.match(read("tools/workflow_release_artifact.mjs"), /dryRun[\s\S]*release-artifact-\$\{version\}\.json/);
  assert.match(read("tools/release_artifact_identity.mjs"), /lockfile_sha256/);
  assert.match(tarballSmoke, /writeDeliveryInputs/);
  assert.match(tarballSmoke, /long-task-delivery-v2/);
  assert.match(tarballSmoke, /long-task-v1-retirement/);
  assert.match(tarballSmoke, /npm", \["install", "--save-dev", tarball\]/);
  assert.match(tarballSmoke, /"ty-context",\s*"init"/);
  assert.match(tarballSmoke, /"ty-context", "doctor"/);
  assert.match(tarballSmoke, /"ty-context", "validate-context"/);
  assert.match(tarballSmoke, /"long-task", "final-gate"/);
  assert.match(tarballSmoke, /tarball contains retired runtime asset/);
  assert.match(publishRunbook, /complete default and Long-Task Workflow test suites/);
  assert.match(publishRunbook, /exact packed tarball/);

  for (const workflow of [packageWorkflow, publishWorkflow, consumerWorkflow, read(".github/workflows/scorecard.yml")]) {
    for (const match of workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)) {
      assert.match(match[1], /^[a-f0-9]{40}$/, `workflow action is not pinned to a commit SHA: ${match[0]}`);
    }
  }

  assert.doesNotMatch(consumerWorkflow, /npm (?:run )?test/);
  assert.doesNotMatch(consumerWorkflow, /test:(?:composite|long-task)-workflow/);
  assert.doesNotMatch(
    consumerWorkflow,
    /composite-campaign-v5-app-server-black-box/,
  );

  assert.equal(packageJson.scripts["test:default:built"], "node ../../tests/ty-context/run-package-suite.mjs default");
  assert.equal(packageJson.scripts["test:default"], "npm run build && npm run test:default:built");
  assert.equal(packageJson.scripts["test:built"], "npm run test:default:built && npm run test:long-task-workflow:built");
  assert.equal(packageJson.scripts.test, "npm run build && npm run test:built");
  assert.equal(packageJson.scripts["test:long-task-workflow:built"], "node ../../tests/ty-context/run-package-suite.mjs long-task");
  assert.equal(packageJson.scripts["test:long-task-workflow"], "npm run build && npm run test:long-task-workflow:built");
  assert.equal(packageJson.scripts["test:long-task-performance"], "npm run build && node ../../tests/ty-context/long-task-performance.mjs");
  assert.equal(packageJson.scripts["test:composite-workflow"], undefined);

  const suiteRunner = read("tests/ty-context/run-package-suite.mjs");
  assert.match(suiteRunner, /longTaskTestName/);
  assert.match(suiteRunner, /\(suite === "long-task"\)/);
  assert.match(suiteRunner, /\^long-task-/);
  assert.doesNotMatch(releasePrepare, /test:(?:composite|long-task)-workflow/);
  assert.doesNotMatch(releasePublish, /test:(?:composite|long-task)-workflow/);
  assert.match(releasePublish, /release_tarball_smoke\.mjs[\s\S]*--portable-only/);
  assert.match(tarballSmoke, /if \(!portableOnly\)/);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
