import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const execFileAsync = promisify(execFile);
const missing = (file) =>
  stat(file).then(
    () => false,
    () => true,
  );

test("default_workflow_does_not_require_plan_md", async () => {
  await withInitializedProject(async (root) => {
    assert.equal(await missing(path.join(root, "plan.md")), true);
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  });
});

test("default_workflow_does_not_create_plan_artifacts", async () => {
  await withInitializedProject(async (root) => {
    for (const file of [
      "plan.md",
      "plan-matrix.json",
      "final-verdict.json",
      "evidence-ledger.json",
    ]) {
      assert.equal(await missing(path.join(root, file)), true);
    }
  });
});

test("cli_help_has_no_plan_validator_commands", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(repo, "packages/ty-context/dist/cli.js"),
    "help",
  ]);
  assert.doesNotMatch(stdout, /validate-plan-contract/);
  assert.doesNotMatch(stdout, /validate-plan-acceptance/);
});

test("existing_plan_md_is_ignored_as_authority", async () => {
  await withInitializedProject(async (root) => {
    await writeFile(
      path.join(root, "plan.md"),
      "This is deliberately not a Harness contract.\n",
    );
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  });
});

test("explicit_normal_long_task_uses_only_normal_long_task_artifacts", async () => {
  const skill = await read(
    ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
  );
  assert.match(skill, /source copy/i);
  assert.match(skill, /acceptance checklist/i);
  assert.match(skill, /optional.*prompt/i);
  assert.match(
    skill,
    /Do not create a Plan Conformance Matrix, Final Acceptance Verdict.*evidence ledger.*second execution plan/is,
  );
});

test("explicit_prepare_composite_activates_campaign", async () => {
  const skill = await read(
    ".codex/ty-context-managed/skills/prepare-composite-long-task/SKILL.md",
  );
  assert.match(skill, /explicit/i);
  assert.match(skill, /Campaign V5/);
  assert.match(skill, /Scope Fit V4/);
});

test("explicit_single_slice_activates_contract_v3", async () => {
  const skill = await read(
    ".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",
  );
  assert.match(skill, /explicit/i);
  assert.match(skill, /Contract V3/);
  assert.match(skill, /three.*input/i);
});

test("active_contract_ignores_matrix_and_verdict", async () => {
  const sources = await Promise.all([
    read("packages/ty-context/src/lib/long-task-active-task.ts"),
    read("packages/ty-context/src/lib/long-task-stop-check.ts"),
    read("packages/ty-context/src/lib/long-task-final-gate.ts"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /plan[-_ ]matrix|final[-_ ]verdict/i);
});

test("small_task_uses_internal_planning_only", async () => {
  const agents = await read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  assert.match(agents, /agent\/platform's internal plan/i);
  assert.match(agents, /never requires `plan\.md`/i);
});

test("long_direct_task_can_finish_without_plan_file", async () => {
  const agents = await read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  assert.match(
    agents,
    /Otherwise remain on the default Workflow Contract, even when work is long/i,
  );
});

test("context_delta_required_updates_context_before_code", async () => {
  const agents = await read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  assert.match(agents, /`required` and update owning Context before code/i);
});

test("context_delta_none_does_not_create_context_noise", async () => {
  const agents = await read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  assert.match(agents, /Local fixes preserving durable semantics are `none`/i);
  assert.match(agents, /Long-term facts only go in `project_context\/\*\*`/i);
});

test("composite_does_not_generate_workflow_plan", async () => {
  const guidance = await read(
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
  );
  assert.match(guidance, /must not create or consume a second plan/i);
  assert.doesNotMatch(
    await read("packages/ty-context/src/commands/composite-campaign.ts"),
    /writeFile\([^)]*plan\.md/i,
  );
});

test("composite_does_not_consume_plan_matrix_or_verdict", async () => {
  const files = [
    "packages/ty-context/src/lib/composite-campaign-orchestrator.ts",
    "packages/ty-context/src/lib/composite-campaign-v5.ts",
    "packages/ty-context/src/lib/composite-campaign-final-gate.ts",
  ];
  assert.doesNotMatch(
    (await Promise.all(files.map(read))).join("\n"),
    /plan[-_ ]matrix|final[-_ ]verdict/i,
  );
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
