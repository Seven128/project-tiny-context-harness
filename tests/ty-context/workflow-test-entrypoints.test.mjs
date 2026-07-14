import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("package and publish workflows run real tests while the consumer gate stays bounded", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const publishWorkflow = read(".github/workflows/npm-publish.yml");
  const consumerWorkflow = read(".github/workflows/harness.yml");
  const publishRunbook = read("docs/launch/npm-trusted-publishing.md");
  const tarballSmoke = read("tools/release_tarball_smoke.mjs");
  const packageJson = JSON.parse(read("packages/ty-context/package.json"));

  assert.match(packageWorkflow, /Build package/);
  assert.match(packageWorkflow, /Typecheck package/);
  assert.match(packageWorkflow, /package check-source/);
  assert.match(packageWorkflow, /make validate-context/);
  assert.match(packageWorkflow, /test:workflow-default:built/);
  assert.match(packageWorkflow, /test:contract-v3:built/);
  assert.match(packageWorkflow, /test:campaign-blackbox:built/);
  assert.match(packageWorkflow, /Complete package tests[\s\S]*run: npm test/);
  assert.match(packageWorkflow, /test:composite-workflow:built/);
  assert.match(packageWorkflow, /npm run smoke:quickstart/);
  assert.match(packageWorkflow, /npm run preview:pack/);

  assert.match(publishWorkflow, /Build package/);
  assert.match(publishWorkflow, /Complete package tests[\s\S]*run: npm test/);
  assert.match(publishWorkflow, /release:check-version/);
  assert.match(publishWorkflow, /package check-source/);
  assert.match(publishWorkflow, /make validate-context/);
  assert.match(publishWorkflow, /verify_prepared_release_artifact/);
  assert.match(publishWorkflow, /release_tarball_smoke\.mjs --tarball/);
  assert.match(tarballSmoke, /writeHappyV3Inputs/);
  assert.doesNotMatch(tarballSmoke, /writeHappyV3Contract/);
  assert.match(tarballSmoke, /npm", \["install", "--save-dev", tarball\]/);
  assert.match(tarballSmoke, /"ty-context",\s*"init"/);
  assert.match(tarballSmoke, /"ty-context", "doctor"/);
  assert.match(tarballSmoke, /"ty-context", "validate-context"/);
  assert.match(tarballSmoke, /"composite-long-task",\s*"final-gate"/);
  assert.match(publishRunbook, /complete package test suite/);
  assert.match(publishRunbook, /exact packed tarball/);

  assert.doesNotMatch(consumerWorkflow, /npm (?:run )?test/);
  assert.doesNotMatch(consumerWorkflow, /test:composite-workflow/);
  assert.doesNotMatch(
    consumerWorkflow,
    /composite-campaign-v5-app-server-black-box/,
  );

  assert.match(packageJson.scripts.test, /tests\/ty-context\/\*\.test\.mjs/);
  assert.match(packageJson.scripts["test:built"], /tests\/ty-context\/\*\.test\.mjs/);
  assert.match(packageJson.scripts["test:composite-workflow:built"], /composite-campaign-v5-app-server-black-box\.test\.mjs/);
  assert.match(packageJson.scripts["test:composite-workflow:built"], /codex-app-server-client-v5\.test\.mjs/);
  assert.match(packageJson.scripts["test:composite-workflow:built"], /workflow-test-entrypoints\.test\.mjs/);
  assert.equal(packageJson.scripts["test:composite-workflow"], "npm run build && npm run test:composite-workflow:built");
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
