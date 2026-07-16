import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const exec = promisify(execFile);
const missing = (file) => stat(file).then(() => false, () => true);

test("default workflow uses internal planning and creates no second authority", async () => {
  await withInitializedProject(async (root) => {
    for (const file of [
      "plan.md",
      "plan-matrix.json",
      "final-verdict.json",
      "evidence-ledger.json",
      "delivery-contract.yaml",
    ]) {
      assert.equal(await missing(path.join(root, file)), true);
    }
    await writeFile(path.join(root, "plan.md"), "ordinary user file\n");
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  });
});

test("CLI and managed guidance route only explicit or active work to long-task", async () => {
  const { stdout } = await exec(process.execPath, [
    path.join(repo, "packages/ty-context/dist/cli.js"),
    "help",
  ]);
  assert.match(stdout, /long-task <subcommand>/);
  assert.doesNotMatch(stdout, /validate-plan-contract|validate-plan-acceptance/);
  const guidance = await read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  assert.match(guidance, /Do not infer long-task mode from duration, complexity, file count/);
  assert.match(guidance, /Git common-dir active record/);
  assert.match(guidance, /Git-config marker/);
  assert.match(guidance, /current native Goal/);
  assert.match(guidance, /Context Delta: none\|required/);
  assert.match(guidance, /Local fixes preserving durable semantics are `none`/);
});

test("long-task Skill is the only active long-task workflow and normal-long-task is a tombstone", async () => {
  const active = await read(
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
  );
  assert.match(active, /delivery-contract\.yaml/);
  assert.match(active, /current native Goal/i);
  assert.match(active, /Progress.*repair evidence only.*never acceptance authority/is);
  assert.match(active, /one complete Contract/);
  assert.match(active, /preflight/);
  assert.match(active, /delivery-set.*retired and non-executing/is);
  assert.match(active, /Final Gate/i);
  const normal = await read(
    ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
  );
  assert.match(normal, /retired/i);
  assert.match(normal, /long-task-workflow/);
  assert.match(normal, /Do not create.*target-mode prompt.*Local Audit/s);
  assert.doesNotMatch(normal, /^## (Acceptance Checklist|Local Audit)/m);
  assert.equal(
    await missing(
      path.join(
        repo,
        ".codex/ty-context-managed/skills/prepare-composite-long-task/SKILL.md",
      ),
    ),
    true,
  );
  assert.equal(
    await missing(
      path.join(
        repo,
        ".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",
      ),
    ),
    true,
  );
});

test("retired command names are lightweight non-executing tombstones", async () => {
  for (const command of ["composite-campaign", "composite-long-task"]) {
    const { stdout } = await exec(process.execPath, [
      path.join(repo, "packages/ty-context/dist/cli.js"),
      command,
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.status, "retired");
    assert.match(result.next_command, /ty-context long-task/);
  }
  const source = (
    await Promise.all([
      read("packages/ty-context/src/commands/composite-campaign.ts"),
      read("packages/ty-context/src/commands/composite-long-task.ts"),
    ])
  ).join("\n");
  assert.doesNotMatch(source, /^import /mu);
});

async function withInitializedProject(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-routing-"));
  try {
    await runInit(root, { adopt: false, force: false });
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
