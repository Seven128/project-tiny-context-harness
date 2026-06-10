import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { renderMarkdown } = await import(pathToFileURL(path.join(repoRoot, "tools/launch_unblock_check.mjs")));

function baseReport(npmStatus) {
  return {
    generatedAt: "2026-06-10T00:00:00.000Z",
    status: "blocked",
    npm: {
      summary: {
        status: npmStatus,
        nextAction:
          npmStatus === "auth-needed"
            ? "Run npm login or configure a publish-capable npm token, then rerun npm run launch:npm-access."
            : "Run npm run release:npm -- --version 0.2.39 --publish --yes --full-gate --registry-smoke."
      }
    },
    github: { aligned: false },
    readiness: { summary: { status: "fail" } },
    externalTodos: [
      {
        id: "npm-fetch",
        detail: "https://registry.npmjs.org/project-tiny-context-harness/latest returned HTTP 404"
      },
      {
        id: "github-homepage",
        detail: "GitHub homepage should point to the repository while npm returns 404"
      }
    ]
  };
}

const authNeeded = renderMarkdown(baseReport("auth-needed"));
assert.match(authNeeded, /Status: auth-needed/);
assert.match(authNeeded, /npm login/);
assert.match(authNeeded, /After npm auth or token permissions are fixed/);
assert.match(authNeeded, /docs\/launch\/npm-credential-unblock\.md/);
assert.match(authNeeded, /Do not store tokens, OTP values or `\.npmrc` content/);

const firstPublish = renderMarkdown(baseReport("first-publish-needed"));
assert.match(firstPublish, /Status: first-publish-needed/);
assert.match(firstPublish, /npm run release:npm -- --version 0\.2\.39 --publish --yes --full-gate --registry-smoke/);
assert.match(firstPublish, /If npm returns E403/);

const ready = renderMarkdown({
  generatedAt: "2026-06-10T00:00:00.000Z",
  status: "ready",
  npm: { summary: { status: "published", nextAction: "ok" } },
  github: { aligned: true },
  readiness: { summary: { status: "pass" } },
  externalTodos: []
});
assert.doesNotMatch(ready, /npm login/);
assert.doesNotMatch(ready, /npm run launch:github-metadata -- --apply/);
