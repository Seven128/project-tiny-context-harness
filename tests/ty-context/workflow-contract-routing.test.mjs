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
  assert.match(stdout, /Install Source Plan\/Long-Task Skills/);
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
  const [active, generated, packaged] = await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
  ]);
  assert.equal(generated, active, "source-workspace long-task Skill drift");
  assert.equal(packaged, active, "package long-task Skill drift");
  assert.match(active, /delivery-contract\.yaml/);
  assert.match(active, /current native Goal/i);
  assert.match(active, /Progress.*repair evidence only.*never acceptance authority/is);
  assert.match(active, /one complete Contract/);
  assert.match(active, /preflight/);
  assert.match(active, /delivery-set.*retired and non-executing/is);
  assert.match(active, /Final Gate/i);
  assert.match(active, /ordinary prose plan or optional Source Plan/is);
  assert.match(active, /does not need to.*match the recommended Source Plan structure/is);
  assert.match(active, /stable semantic keys and Markdown anchors/is);
  assert.match(
    active,
    /requirements conflict.*critical semantics are missing.*multiple materially different product designs.*user must choose.*no falsifiable acceptance standard/is,
  );
  assert.match(active, /meaning-preserving structural decomposition/is);
  assert.match(active, /repository binding.*real repository and Context evidence/is);
  assert.match(active, /new business rule.*`decision_required`/is);
  assert.match(active, /^## Controlling Objective$/mu);
  assert.match(active, /^## Contract Draft And Outcome Decomposition$/mu);
  assert.match(active, /same non-authoritative `delivery-contract\.yaml`/iu);
  assert.match(active, /need not be completed in one response/iu);
  assert.match(active, /Draft Outcome[\s\S]*not a new schema field or runtime entity/iu);
  assert.match(active, /`depends_on` means acceptance readiness/iu);
  assert.match(active, /not persist a scheduler, Worker queue/iu);
  assert.match(active, /Outcome decomposes execution and diagnosis, not completion authority/iu);
  assert.match(active, /second Contract plan/);
  assert.doesNotMatch(active, /Do not create a second plan, Authoring Skill product/);
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

test("optional Source Plan authoring does not create a second Contract authority", async () => {
  const [sourcePlan, workflowContext] = await Promise.all([
    read(".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
  ]);
  assert.match(sourcePlan, /Do not generate Delivery Contract YAML/);
  assert.match(sourcePlan, /Do not update `project_context\/\*\*`/);
  assert.match(sourcePlan, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(
    sourcePlan,
    /does not replace Contract Draft authoring inside `long-task-workflow`/iu,
  );
  assert.match(sourcePlan, /Do not create:[\s\S]*Source Plan Schema/);
  assert.doesNotMatch(sourcePlan, /ty-context long-task (?:init|preflight|compile)/);
  assert.match(
    workflowContext,
    /ordinary prose plan or optional Source Plan remains ordinary Source input/is,
  );
  assert.match(
    workflowContext,
    /requirements conflict.*critical meaning is missing.*materially different product designs.*requires user choice.*falsifiable acceptance cannot be formed/is,
  );
  assert.match(
    workflowContext,
    /No lifecycle phases, fixed Contract plans, separate Contract-Authoring Skill/is,
  );
  assert.match(workflowContext, /one complete Compact V2 Contract/);
  assert.match(workflowContext, /one current snapshot/);
  assert.match(
    workflowContext,
    /Contract Draft[\s\S]*`long-task-workflow` owns its authoring/iu,
  );
  assert.match(
    workflowContext,
    /Draft Outcome[\s\S]*without creating `draft_outcomes`, a `DraftOutcome` runtime type/iu,
  );
  assert.match(workflowContext, /not a Contract Draft/iu);
  assert.match(workflowContext, /only the source-recompiled Final Gate may accept/iu);
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
