import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const broadAutomaticTrigger = /automatically trigger|broad automatic|when.*long[- ]running task/i;

function frontMatterValue(content, key) {
  const match = content.match(/^---\s*\r?\n(?<frontMatter>[\s\S]*?)\r?\n---/);
  assert.ok(match?.groups?.frontMatter, "expected skill front matter");
  const value = match.groups.frontMatter.match(new RegExp(`^${key}:\\s*(?<value>.*)$`, "m"));
  assert.ok(value?.groups?.value, `expected ${key} in front matter`);
  return value.groups.value.trim();
}

test("composite long-task workflow Skill is the public managed Skill surface", async () => {
  const [sourceSkill, generatedSkill, packagedSkill, protocol, goalTemplate, bindingTemplate] = await Promise.all([
    read(".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md"),
    read(".codex/skills/composite-long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/composite-long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md"),
    read("packages/ty-context/assets/skills/composite-long-task-workflow/assets/goal-objective.template.md"),
    read("packages/ty-context/assets/skills/composite-long-task-workflow/assets/execution-binding.template.md")
  ]);

  for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
    assert.equal(frontMatterValue(content, "name"), "composite-long-task-workflow");
    const description = frontMatterValue(content, "description");
    assert.equal(description, "Use when directly invoked for Superpowers-backed composite long-task workflow execution.");
    assert.ok(description.length <= 120, `expected short direct-invocation description, got ${description.length}`);
    assert.doesNotMatch(description, broadAutomaticTrigger);

    assert.match(content, /# Composite Long-Task Workflow Skill/);
    assert.match(content, /多组合长程任务工作流 Skill/);
    assert.match(content, /\/composite-long-task-workflow/);
    assert.match(content, /Product \/ Architecture Source/);
    assert.match(content, /Technical Realization Plan/);
    assert.match(content, /Acceptance Checklist/);
    assert.match(content, /workflow-protocol\.md/);
    assert.match(content, /execution-binding\.md/);
    assert.match(content, /goal-objective\.txt/);
    assert.match(content, /task-state\.json/);
    assert.match(content, /events\.ndjson/);
    assert.match(content, /derived\/\*\*/);
    assert.match(content, /Expected Runtime Effect \/ 预期实现效果/);
    assert.match(content, /Tiny Context Workflow Contract\s*-> three-input source authority\s*-> task-state\.json compilation\s*-> Superpowers implementation slices/s);
    assert.match(content, /not the Tiny Context Workflow Contract itself/i);
    assert.match(content, /not a business fact source/i);
    assert.match(content, /not a normal target-mode prompt generator/i);
    assert.match(content, /assertion-backed acceptance evidence/i);
    assert.match(content, /Tiny Context-owned composite workflow adapter for Superpowers-backed long-task execution/i);
    assert.match(content, /official Superpowers skills/i);
    assert.match(content, /must not redefine, duplicate or fork official Superpowers execution mechanics/i);
    assert.match(content, /superpowers:subagent-driven-development/);
    assert.match(content, /superpowers:executing-plans/);
    assert.match(content, /superpowers:test-driven-development/);
    assert.match(content, /superpowers:verification-before-completion/);
    assert.match(content, /product_goal_complete/);
    assert.match(content, /final-gate/);
    assert.match(content, /Do not generate, derive, or infer the Technical Realization Plan/i);
    assert.match(content, /Do not generate, derive, rewrite, strengthen, or repair the full checklist/i);
    assert.match(content, /Do not register `workflow-protocol\.md` in `project_context\/context\.toml`/);
    assert.match(content, /Do not let `derived\/\*\*`, local audit, matrix, verdict, validator output or auditor report rewrite Product \/ Architecture Source/);
    assert.match(content, /Do not treat Superpowers review as plan conformance or AC acceptance/);
    assert.match(content, /Do not treat sample evidence as full-population proof/);
    assert.match(content, /Machine-verifiable proof layers require passed assertion reports/i);
    assert.match(content, /Do not treat screenshots, final cards, validator passes, matrix\/verdict rows or prose as proof/i);
    assert.match(content, /Source-to-Context Coverage or Context-to-Implementation Binding has unresolved gaps/);
    assert.doesNotMatch(content, /name:\s*superpowers-long-task/);
    assert.doesNotMatch(content, /\/superpowers-long-task/);
  }

  assert.match(protocol, /# Composite Long-Task Workflow Protocol/);
  assert.match(protocol, /Workflow Identity/);
  assert.match(protocol, /Authority Model/);
  assert.match(protocol, /Required Bootstrap/);
  assert.match(protocol, /Tiny Context Contract Layer/);
  assert.match(protocol, /Superpowers Execution Binding/);
  assert.match(protocol, /Final Gate Protocol/);
  assert.match(protocol, /Completion State Machine/);
  assert.match(protocol, /Forbidden Shortcuts/);
  assert.match(protocol, /Blocker Protocol/);
  assert.match(protocol, /assertion_result\.status=passed/);
  assert.match(protocol, /Matrix, verdict and evidence-index views may summarize `assertion_status`/);
  assert.match(protocol, /Negative Evidence Scan Gate/);
  assert.match(protocol, /Invalid evidence for UI\/browser AC completion includes screenshot-only proof/);
  assert.match(protocol, /## 17\. Forbidden Wrong Fusion \/ 不允许的错误融合/);
  assert.doesNotMatch(protocol, /## 18\. Authoring Placement \/ 建议写入位置/);
  assert.doesNotMatch(protocol, /Authoring Placement/);
  assert.doesNotMatch(protocol, /建议写入位置/);
  assert.doesNotMatch(protocol, /README\.md/);
  assert.doesNotMatch(protocol, /project_context\/areas\/harness-package\/implementation-index\.md/);
  assert.doesNotMatch(protocol, /tests\/ty-context/);

  assert.match(goalTemplate, /workflow-protocol\.md/);
  assert.match(goalTemplate, /execution-binding\.md/);
  assert.match(goalTemplate, /product_goal_complete/);
  assert.match(goalTemplate, /assertion_result\.status=passed/);
  assert.match(goalTemplate, /Negative Evidence Scan Gate/);
  assert.match(bindingTemplate, /# Composite Long-Task Execution Binding/);
  assert.match(bindingTemplate, /required_commands:/);
  assert.match(bindingTemplate, /includes_ac_evidence_assertion_gate: true/);
  assert.match(bindingTemplate, /includes_negative_evidence_scan_gate: true/);
});
