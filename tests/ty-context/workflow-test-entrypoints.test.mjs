import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Composite workflow self-tests have explicit local entrypoints only", () => {
  const packageWorkflow = read(".github/workflows/package.yml");
  const publishWorkflow = read(".github/workflows/npm-publish.yml");
  const consumerWorkflow = read(".github/workflows/harness.yml");
  const publishRunbook = read("docs/launch/npm-trusted-publishing.md");
  const packageJson = JSON.parse(read("packages/ty-context/package.json"));

  for (const workflow of [packageWorkflow, publishWorkflow, consumerWorkflow]) {
    assert.doesNotMatch(workflow, /npm (?:run )?test/);
    assert.doesNotMatch(workflow, /test:composite-workflow/);
    assert.doesNotMatch(workflow, /composite-campaign-v5-app-server-black-box/);
  }

  assert.match(packageWorkflow, /Build package/);
  assert.match(packageWorkflow, /package check-source/);
  assert.match(packageWorkflow, /make validate-context/);
  assert.match(publishWorkflow, /Build package/);
  assert.match(publishWorkflow, /release:check-version/);
  assert.match(publishWorkflow, /package check-source/);
  assert.match(publishWorkflow, /make validate-context/);
  assert.match(publishWorkflow, /verify_prepared_release_artifact/);
  assert.match(publishRunbook, /does not run the Composite Campaign E2E\/mechanism profile or the complete workspace suite/);
  assert.match(publishRunbook, /remain explicit maintainer commands/);

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
