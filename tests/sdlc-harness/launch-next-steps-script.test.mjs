import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/launch_next_steps.mjs");
const { buildNextSteps, renderMarkdown } = await import(pathToFileURL(scriptPath));

const steps = buildNextSteps({ packageVersion: "0.2.41" });
assert.deepEqual(
  steps.map((step) => step.id),
  ["npm-trusted-publish", "github-release-0.2.40", "show-hn", "feedback-note", "curated-list-prs"]
);

const markdown = renderMarkdown(steps);
assert.match(markdown, /Launch Next Steps/);
assert.match(markdown, /read-only: it does not publish to npm, create releases, post to HN or open PRs/);
assert.match(markdown, /npm run launch:unblock -- --strict/);
assert.match(markdown, /https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/actions\/workflows\/npm-publish\.yml/);
assert.match(markdown, /expected_version: 0\.2\.41/);
assert.match(markdown, /dry_run: true/);
assert.match(markdown, /then dry_run: false/);
assert.match(markdown, /https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/releases\/new\?tag=v0\.2\.40/);
assert.match(markdown, /docs\/launch\/github-release-0\.2\.40\.md/);
assert.match(markdown, /https:\/\/news\.ycombinator\.com\/submit/);
assert.match(markdown, /docs\/launch\/primary-launch\.md/);
assert.match(markdown, /npm run launch:feedback-note -- --channel show-hn --url <show-hn-url>/);
assert.match(markdown, /npm run launch:external-prs -- --live --clean/);
assert.match(markdown, /NPM_TOKEN \/ NODE_AUTH_TOKEN/);
assert.doesNotMatch(markdown, /npm publish --workspace/);

const jsonResult = spawnSync(process.execPath, [scriptPath, "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  timeout: 30_000,
  windowsHide: true
});
assert.equal(jsonResult.status, 0, jsonResult.stderr);
const json = JSON.parse(jsonResult.stdout);
assert.equal(json.steps[0].id, "npm-trusted-publish");
assert.equal(json.steps[0].inputs[0], "expected_version: 0.2.41");
