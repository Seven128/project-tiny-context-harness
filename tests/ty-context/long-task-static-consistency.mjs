import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export async function assertLongTaskStaticConsistency(repoRoot) {
  const packageJson = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages/ty-context/package.json"),
      "utf8",
    ),
  );
  const projectSpec = await readFile(
    path.join(repoRoot, "PROJECT_SPEC.md"),
    "utf8",
  );
  const workflowContext = await readFile(
    path.join(
      repoRoot,
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    "utf8",
  );
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  assert.equal(packageJson.version, "0.6.0");
  assert.doesNotMatch(
    projectSpec,
    /package version for this architecture is `0\.5\.0`|Version 0\.5 keeps/u,
  );
  assert.doesNotMatch(
    `${projectSpec}\n${workflowContext}`,
    /manual-only Outcome|external\/manual acceptance required/u,
  );
  assert.match(
    `${projectSpec}\n${workflowContext}`,
    /machine_accepted_external_pending/u,
  );
  await assert.rejects(() => access(path.join(repoRoot, ".codex/hooks.json")));
  assert.match(gitignore, /^\.codex\/hooks\.json$/mu);
  const tracked = await gitOutput(repoRoot, [
    "ls-files",
    "--",
    ".codex/hooks.json",
  ]);
  const deleted = await gitOutput(repoRoot, [
    "ls-files",
    "--deleted",
    "--",
    ".codex/hooks.json",
  ]);
  assert.ok(!tracked || deleted === ".codex/hooks.json");
}

async function gitOutput(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, windowsHide: true });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout).toString("utf8").trim());
      else reject(new Error(Buffer.concat(stderr).toString("utf8")));
    });
  });
}
