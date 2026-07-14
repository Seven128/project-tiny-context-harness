import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("GitHub CI runs complete default and Composite suites with immutable release evidence", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const publishWorkflow = read(".github/workflows/npm-publish.yml");
  const consumerWorkflow = read(".github/workflows/harness.yml");
  const publishRunbook = read("docs/launch/npm-trusted-publishing.md");
  const tarballSmoke = read("tools/release_tarball_smoke.mjs");
  const packageJson = JSON.parse(read("packages/ty-context/package.json"));

  assert.match(packageWorkflow, /Typecheck package/);
  assert.match(packageWorkflow, /package check-source/);
  assert.match(packageWorkflow, /make validate-harness/);
  assert.match(packageWorkflow, /Complete package tests[\s\S]*run: npm test --workspace project-tiny-context-harness/);
  assert.match(packageWorkflow, /Complete Composite tests\s+run: npm run test:composite-workflow --workspace project-tiny-context-harness/);
  assert.match(packageWorkflow, /node tools\/quickstart_smoke\.mjs/);
  assert.match(packageWorkflow, /npm run preview:pack/);

  assert.match(publishWorkflow, /Build package/);
  assert.match(publishWorkflow, /npm install -g npm@12\.0\.1/);
  assert.doesNotMatch(publishWorkflow, /npm@latest/);
  assert.match(publishWorkflow, /Complete package tests[\s\S]*run: npm test --workspace project-tiny-context-harness/);
  assert.match(publishWorkflow, /Complete Composite tests\s+run: npm run test:composite-workflow --workspace project-tiny-context-harness/);
  assert.match(publishWorkflow, /release:check-version/);
  assert.match(publishWorkflow, /package check-source/);
  assert.match(publishWorkflow, /make validate-harness/);
  assert.match(publishWorkflow, /verify_prepared_release_artifact/);
  assert.match(publishWorkflow, /release_tarball_smoke\.mjs --tarball/);
  assert.match(publishWorkflow, /npm publish "\.artifacts\/releases\/prepared\/\$FILENAME"/);
  assert.match(read("tools/release_artifact_prepare.mjs"), /ty-context-release-artifact-v2|RELEASE_ARTIFACT_SCHEMA_V2/);
  assert.match(read("tools/release_artifact_identity.mjs"), /lockfile_sha256/);
  assert.match(tarballSmoke, /writeHappyV3Inputs/);
  assert.doesNotMatch(tarballSmoke, /writeHappyV3Contract/);
  assert.match(tarballSmoke, /npm", \["install", "--save-dev", tarball\]/);
  assert.match(tarballSmoke, /"ty-context",\s*"init"/);
  assert.match(tarballSmoke, /"ty-context", "doctor"/);
  assert.match(tarballSmoke, /"ty-context", "validate-context"/);
  assert.match(tarballSmoke, /"composite-long-task",\s*"final-gate"/);
  assert.match(publishRunbook, /complete package test suite/);
  assert.match(publishRunbook, /exact packed tarball/);

  for (const workflow of [packageWorkflow, publishWorkflow, consumerWorkflow, read(".github/workflows/scorecard.yml")]) {
    for (const match of workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)) {
      assert.match(match[1], /^[a-f0-9]{40}$/, `workflow action is not pinned to a commit SHA: ${match[0]}`);
    }
  }

  assert.doesNotMatch(consumerWorkflow, /npm (?:run )?test/);
  assert.doesNotMatch(consumerWorkflow, /test:composite-workflow/);
  assert.doesNotMatch(
    consumerWorkflow,
    /composite-campaign-v5-app-server-black-box/,
  );

  assert.equal(packageJson.scripts["test:built"], "node ../../tests/ty-context/run-package-suite.mjs default");
  assert.equal(packageJson.scripts.test, "npm run build && npm run test:built");
  assert.equal(packageJson.scripts["test:composite-workflow:built"], "node ../../tests/ty-context/run-package-suite.mjs composite");
  assert.equal(packageJson.scripts["test:composite-workflow"], "npm run build && npm run test:composite-workflow:built");

  const suiteRunner = read("tests/ty-context/run-package-suite.mjs");
  assert.match(suiteRunner, /compositeTestName/);
  assert.match(suiteRunner, /\(suite === "composite"\)/);
  assert.match(suiteRunner, /codex-\|composite-\|long-task-/);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
