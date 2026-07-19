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

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const exec = promisify(execFile);
const missing = (file) =>
  stat(file).then(
    () => false,
    () => true,
  );

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

test("default Context routing combines manifest candidates with bounded search", async () => {
  const [managed, rootAgents, packaged, development] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("AGENTS.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
  ]);
  assert.equal(packaged, managed, "package AGENTS Core drift");
  assert.match(
    rootAgents,
    /bounded text search over `project_context\/\*\*`/iu,
  );
  for (const content of [managed, development]) {
    assert.match(content, /graph\/trigger candidates|triggers\/read policy/iu);
    assert.match(content, /bounded text search/iu);
    assert.match(content, /project_context\/\*\*/u);
    assert.match(
      content,
      /before deciding `Context Delta`|判断 `Context Delta` 前/iu,
    );
    assert.match(content, /area\/module|area\/module\/API/iu);
    assert.match(
      content,
      /API\/schema\/state\/security\/verification\/deployment|API\/Schema\/state\/security\/verification\/deployment/iu,
    );
    assert.match(
      content,
      /supplements rather than replaces semantic judgment|补充语义判断/iu,
    );
    assert.match(
      content,
      /no index, cache, state or second authority|不创建索引、缓存或第二权威/iu,
    );
  }
});

test("CLI and managed guidance route only explicit or active work to long-task", async () => {
  const { stdout } = await exec(process.execPath, [
    path.join(repo, "packages/ty-context/dist/cli.js"),
    "help",
  ]);
  assert.match(stdout, /long-task <subcommand>/);
  assert.match(stdout, /Install Source Plan\/Long-Task Skills/);
  assert.doesNotMatch(
    stdout,
    /validate-plan-contract|validate-plan-acceptance/,
  );
  const guidance = await read(
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
  );
  assert.match(
    guidance,
    /Do not infer long-task mode from duration, complexity, file count/,
  );
  assert.match(guidance, /Git common-dir active record/);
  assert.match(guidance, /Git-config marker/);
  assert.match(guidance, /current native Goal/);
  assert.match(guidance, /Context Delta: none\|required/);
  assert.match(guidance, /Local fixes preserving durable semantics are `none`/);
  assert.match(
    guidance,
    /After the first Authority Lock, stop once before implementation/iu,
  );
  assert.match(guidance, /continue with the current model or switch models/iu);
  assert.match(guidance, /no model route or checkpoint state/iu);
  assert.match(
    guidance,
    /installs the Source Plan Authoring Skill, Long-Task Workflow Skill and package-owned completion Hook/iu,
  );
});

test("Workflow Contract names the complete Draft-to-qualified-result lifecycle", async () => {
  const workflow = await read(
    "project_context/areas/harness-package/contracts/workflow-contract.md",
  );
  const summary = workflow.match(/The workflow is:\r?\n\r?\n`([^`]+)`/u)?.[1];
  assert.ok(summary);
  for (const concept of [
    "optional Source Plan",
    "Contract Draft",
    "Draft Outcome decomposition",
    "Preflight repair loop",
    "Authority Lock",
    "execution-model choice",
    "Rolling Frontier",
    "one-snapshot Final Gate",
    "qualified machine result",
    "qualification-preserving output",
  ]) {
    assert.match(summary, new RegExp(concept, "iu"));
  }
  assert.doesNotMatch(
    summary,
    /one complete Compact V2 Contract.*Authoring Preflight/iu,
  );
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
  assert.match(
    active,
    /Progress.*repair evidence only.*never acceptance authority/is,
  );
  assert.match(active, /one complete Contract/);
  assert.match(active, /preflight/);
  assert.match(active, /delivery-set.*retired and non-executing/is);
  assert.match(active, /Final Gate/i);
  assert.match(active, /ordinary prose plan or optional Source Plan/is);
  assert.match(
    active,
    /does not need to.*match the recommended Source Plan structure/is,
  );
  assert.match(active, /stable semantic keys and Markdown anchors/is);
  assert.match(
    active,
    /one recommendation is then defensible.*record it in real Source.*instead of pausing for approval/is,
  );
  assert.match(
    active,
    /Before comparative research or a material product, technical, architecture or provider selection.*quality versus cost.*stop before that research or selection and ask one concise targeted clarification/is,
  );
  assert.match(
    active,
    /Do not impose a questionnaire, re-ask known preferences or interrupt minor reversible choices/is,
  );
  assert.match(
    active,
    /Once the material preference envelope is clear, decide what research is needed.*current authoritative or primary evidence/is,
  );
  assert.match(
    active,
    /Return only when authoritative requirements conflict.*user explicitly reserves.*no defensible recommendation.*no falsifiable acceptance standard/is,
  );
  assert.match(active, /meaning-preserving structural decomposition/is);
  assert.match(active, /evidence-backed repository binding/is);
  assert.match(
    active,
    /Never place a new product rule.*only in Contract YAML/is,
  );
  assert.match(
    active,
    /payment.*contracting.*production deployment.*destructive production mutation.*external confirmations/is,
  );
  assert.match(
    active,
    /conflicting, user-reserved, missing-preference or unsupported semantic remains `decision_required`/is,
  );
  assert.match(active, /^## Controlling Objective$/mu);
  assert.match(active, /^## Contract Draft And Outcome Decomposition$/mu);
  assert.match(active, /same non-authoritative `delivery-contract\.yaml`/iu);
  assert.match(active, /need not be completed in one response/iu);
  assert.match(
    active,
    /Draft Outcome[\s\S]*not a new schema field or runtime entity/iu,
  );
  assert.match(active, /`depends_on` means acceptance readiness/iu);
  assert.match(active, /not persist a scheduler, Worker queue/iu);
  assert.match(
    active,
    /Outcome decomposes execution and diagnosis, not completion authority/iu,
  );
  assert.match(active, /execution_model_checkpoint\.required: true/iu);
  assert.match(active, /continue_current_model/iu);
  assert.match(active, /Later revisions return `required: false`/iu);
  assert.match(
    active,
    /no checkpoint file.*model route.*automatic model switch/is,
  );
  assert.match(active, /second Contract plan/);
  assert.doesNotMatch(
    active,
    /Do not create a second plan, Authoring Skill product/,
  );
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
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
  ]);
  assert.match(sourcePlan, /Do not generate Delivery Contract YAML/);
  assert.match(sourcePlan, /Do not update `project_context\/\*\*`/);
  assert.match(sourcePlan, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(
    sourcePlan,
    /does not replace Contract Draft authoring inside `long-task-workflow`/iu,
  );
  assert.match(sourcePlan, /Do not create:[\s\S]*Source Plan Schema/);
  assert.doesNotMatch(
    sourcePlan,
    /ty-context long-task (?:init|preflight|compile)/,
  );
  assert.match(
    workflowContext,
    /ordinary prose plan or optional Source Plan remains ordinary Source input/is,
  );
  assert.match(
    workflowContext,
    /material (?:preference|priority).*unknown or ambiguous.*stop before that research or selection and ask a concise targeted question/is,
  );
  assert.match(
    workflowContext,
    /Once the material preference envelope is known.*record one supported recommendation explicitly as delegated Source instead of pausing for approval/is,
  );
  assert.match(
    workflowContext,
    /returns for a decision only when requirements conflict.*user reserves the choice.*no defensible recommendation.*falsifiable acceptance cannot be formed/is,
  );
  assert.match(
    workflowContext,
    /No lifecycle phases, fixed Contract plans, separate Contract-Authoring Skill/is,
  );
  assert.match(workflowContext, /one continuously revised Contract Draft/);
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
  assert.match(
    workflowContext,
    /Only the source-recompiled Final Gate may accept/iu,
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
