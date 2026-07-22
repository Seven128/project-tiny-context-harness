import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  const publishWorkflow = await readFile(
    path.join(repoRoot, ".github/workflows/npm-publish.yml"),
    "utf8",
  );
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  const expectedVersion = publishWorkflow.match(
    /expected_version:[\s\S]*?default:\s*"([^"\r\n]+)"/u,
  )?.[1];
  assert.ok(expectedVersion, "npm publish workflow must declare expected_version");
  assert.equal(packageJson.version, expectedVersion);
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
  assert.match(gitignore, /^\.codex\/hooks\.json$/mu);
  if (await pathExists(path.join(repoRoot, ".git"))) {
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
    assert.ok(
      !tracked || deleted === ".codex/hooks.json",
      "the package-owned runtime Hook may exist locally but must not be source",
    );
  } else {
    assert.equal(
      await pathExists(path.join(repoRoot, ".codex/hooks.json")),
      false,
      "an immutable source snapshot must not materialize the ignored runtime Hook",
    );
  }
}

async function pathExists(target) {
  return Boolean(await stat(target).catch(() => null));
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
