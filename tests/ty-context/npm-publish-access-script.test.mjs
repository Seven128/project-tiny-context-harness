import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/npm_publish_access_check.mjs");
const { summarize } = await import(pathToFileURL(scriptPath));

function report({ whoamiOk, registryPackage }) {
  return {
    whoami: { ok: whoamiOk },
    registryPackage
  };
}

assert.equal(
  summarize(
    report({
      whoamiOk: false,
      registryPackage: {
        ok: true,
        state: "published",
        version: "0.2.40"
      }
    })
  ).status,
  "published"
);

assert.match(
  summarize(
    report({
      whoamiOk: false,
      registryPackage: {
        ok: true,
        state: "published",
        version: "0.2.40"
      }
    })
  ).nextAction,
  /local npm login is not required/
);

assert.equal(
  summarize(
    report({
      whoamiOk: false,
      registryPackage: {
        ok: false,
        state: "missing"
      }
    })
  ).status,
  "auth-needed"
);

assert.equal(
  summarize(
    report({
      whoamiOk: true,
      registryPackage: {
        ok: false,
        state: "missing"
      }
    })
  ).status,
  "first-publish-needed"
);

assert.match(
  summarize(
    report({
      whoamiOk: true,
      registryPackage: {
        ok: false,
        state: "missing"
      }
    })
  ).nextAction,
  /release:prepare .*release:publish -- --local-fallback --yes --registry-smoke/
);

assert.equal(
  summarize(
    report({
      whoamiOk: true,
      registryPackage: {
        ok: false,
        state: "error"
      }
    })
  ).status,
  "registry-check-failed"
);
