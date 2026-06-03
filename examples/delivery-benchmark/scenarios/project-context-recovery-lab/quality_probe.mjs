#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const runDir = path.resolve(process.argv[2] ?? process.cwd());
const checks = [];

function addCheck(id, label, passed, detail = "") {
  checks.push({ id, label, passed: Boolean(passed), detail });
}

async function readText(relativePath) {
  return readFile(path.join(runDir, relativePath), "utf8").catch(() => "");
}

const packageText = await readText("package.json");
let packageJson = null;
try {
  packageJson = JSON.parse(packageText);
} catch {
  packageJson = null;
}

addCheck(
  "QP-CTX-001",
  "Project exposes a test entrypoint",
  Boolean(packageJson?.scripts?.test),
  packageJson?.scripts?.test ? `test=${packageJson.scripts.test}` : "missing package.json scripts.test"
);

const testResult = spawnSync("npm", ["test"], {
  cwd: runDir,
  encoding: "utf8",
  timeout: 30000
});
addCheck(
  "QP-CTX-002",
  "Project-local test suite passes",
  testResult.status === 0,
  testResult.status === 0 ? "npm test passed" : (testResult.stderr || testResult.stdout || `npm test exited ${testResult.status}`).slice(0, 500)
);

const readmeText = await readText("README.md");
addCheck(
  "QP-CTX-003",
  "Recovery handoff names next safe action",
  /next safe action/i.test(readmeText) && /npm test/i.test(readmeText),
  "README should make the next safe action and test command recoverable"
);

console.log(
  JSON.stringify({
    confidence: "high",
    checks
  })
);
