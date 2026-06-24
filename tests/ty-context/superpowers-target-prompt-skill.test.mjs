import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");
const forbiddenIncidentNames = new RegExp(
  ["Intel" + "Hub", "i" + "Find", "We" + "Chat", "微" + "信", "App" + "Secret", "provider" + "-specific"].join("|")
);
const broadTriggerTerms = /Superpowers target-mode prompt|Superpowers goal-mode prompt|Superpowers 目标模式文本|target prompt that maximizes|目标模式文本/;

const frontMatterDescription = (content) => {
  const match = content.match(/^---\s*\r?\n(?<frontMatter>[\s\S]*?)\r?\n---/);
  assert.ok(match?.groups?.frontMatter, "expected skill front matter");
  const description = match.groups.frontMatter.match(/^description:\s*(?<description>.*)$/m);
  assert.ok(description?.groups?.description, "expected skill description");
  return description.groups.description.trim();
};

const extractTextBlockAfter = (content, heading) => {
  const headingIndex = content.indexOf(heading);
  assert.notEqual(headingIndex, -1, `expected heading ${heading}`);
  const fenceStart = content.indexOf("```text", headingIndex);
  assert.notEqual(fenceStart, -1, `expected text fence after ${heading}`);
  const bodyStart = content.indexOf("\n", fenceStart) + 1;
  const fenceEnd = content.indexOf("```", bodyStart);
  assert.notEqual(fenceEnd, -1, `expected closing fence after ${heading}`);
  return content.slice(bodyStart, fenceEnd);
};

const [
  sourceAgents,
  packageAgents,
  rootReadme,
  rootZhReadme,
  packageReadme,
  spec,
  workflowContract,
  sourceSkill,
  generatedSkill,
  packagedSkill
] = await Promise.all([
  read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("README.zh-CN.md"),
  read("packages/ty-context/README.md"),
  read("PROJECT_SPEC.md"),
  read("project_context/areas/harness-package/contracts/workflow-contract.md"),
  read(".codex/ty-context-managed/skills/superpowers-long-task/SKILL.md"),
  read(".codex/skills/superpowers-long-task/SKILL.md"),
  read("packages/ty-context/assets/skills/superpowers-long-task/SKILL.md")
]);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /\/normal-long-task/);
  assert.match(content, /\/superpowers-long-task/);
  assert.doesNotMatch(content, /plan_acceptance_checklist_compiler/);
  assert.doesNotMatch(content, /superpowers_target_prompt_compiler/);
}

for (const content of [rootReadme, rootZhReadme, packageReadme, spec, workflowContract]) {
  assert.match(content, /superpowers-long-task/);
  assert.match(content, /Superpowers long-task Skill|Superpowers 长程任务 Skill/i);
  assert.match(content, /not a Superpowers official schema|不是 Superpowers 官方 schema/i);
  assert.match(content, /Product \/ Architecture Source|产品\/架构原始意图源|产品\/架构方案/i);
  assert.match(content, /Technical Realization Plan|具体技术实现方案|技术实现方案/i);
  assert.match(content, /Acceptance Checklist|验收清单/i);
  assert.match(content, /plan-conformance-matrix|plan-conformance matrix|final-acceptance-verdict|final acceptance verdict/i);
  assert.match(content, /Product Context Delta/i);
  assert.match(content, /Technical Context Delta/i);
  assert.match(workflowContract, /maximum safe autonomous progress/i);
  assert.match(workflowContract, /same inherited permission policy applies to the Superpowers target prompt/i);
  assert.match(workflowContract, /authorized `sudo` \/ `gsudo` \/ administrator elevation is self-service work/i);
  assert.match(workflowContract, /minimal user action list/i);
  assert.doesNotMatch(content, /superpowers_target_prompt_compiler/);
}

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  const description = frontMatterDescription(content);
  assert.equal(content.match(/^name:\s*(.*)$/m)?.[1], "superpowers-long-task");
  assert.equal(description, "Use when directly invoked for Superpowers long-running task target prompt preparation.");
  assert.ok(description.length <= 120, `expected short direct-invocation description, got ${description.length}`);
  assert.doesNotMatch(description, broadTriggerTerms);

  assert.match(content, /Package-Managed Boundary/);
  assert.match(content, /not a Superpowers official schema|不是 Superpowers 官方 schema/i);
  assert.match(content, /three-input|three upstream inputs|three-document/i);
  assert.match(content, /Product \/ Architecture Source/i);
  assert.match(content, /Technical Realization Plan/i);
  assert.match(content, /Acceptance Checklist/i);
  assert.match(content, /two-document compatibility/i);
  assert.match(content, /first document (?:must explicitly contain|explicitly contains) both Product \/ Architecture Source and Technical Realization Plan/i);
  assert.match(content, /Do not generate, derive, rewrite, strengthen, or repair the full checklist/i);
  assert.match(content, /Do not generate, derive, or infer the Technical Realization Plan/i);
  assert.match(content, /normal-long-task/);
  assert.match(content, /does not require it when the product\/architecture source, technical realization plan and acceptance checklist are already supplied/i);
  assert.doesNotMatch(content, /normally comes from `\/normal-long-task`/i);
  assert.match(content, /missing required fields/i);
  assert.match(content, /stop/i);
  assert.match(content, /Do not generate the Superpowers target-mode prompt/i);
  assert.match(content, /missing Technical Realization Plan/i);
  assert.match(content, /Product Context Delta/i);
  assert.match(content, /Technical Context Delta/i);
  assert.match(content, /Context Delta: required/i);
  assert.match(content, /Context Delta: none/i);
  assert.match(content, /any required sub-delta makes overall Context Delta required/i);
  assert.match(content, /not a validator gate|not.*machine-enforced gate/i);
  assert.match(content, /Autonomous Progress Protocol/);
  assert.match(content, /current platform, repository, tool and user-authorized permission boundaries/);
  assert.match(content, /Do not ask the user for work the executor can safely discover, run, inspect or verify itself/);
  assert.match(content, /inherit current repository\/global `AGENTS\.md` or agent-instruction permission policy/);
  assert.match(content, /Authorized `sudo` \/ `gsudo` \/ administrator elevation is not a user blocker/);
  assert.match(content, /try it before pausing/);
  assert.match(content, /Pause only for locally unsatisfiable hard blockers/i);
  assert.match(content, /minimum user action list/);
  assert.match(content, /exact page, system, command or owner/i);
  assert.match(content, /how to redact or avoid sending sensitive values/i);
  assert.match(content, /what the executor will do immediately after receiving the input/i);

  assert.match(content, /Product \/ Architecture Source prevents scope shrinkage/i);
  assert.match(content, /Technical Realization Plan is the execution blueprint/i);
  assert.match(content, /Acceptance Checklist is the completion authority/i);
  assert.match(content, /traceable plan items/i);
  assert.match(content, /expected implementation surfaces/i);
  assert.match(content, /full acceptance checklist/i);
  assert.match(content, /local audit/i);
  assert.match(content, /relevant Context/i);
  assert.match(content, /required tests \/ core paths/i);
  assert.match(content, /plan-conformance-matrix/i);
  assert.match(content, /final-acceptance-verdict/i);
  assert.match(content, /validate-plan-acceptance/i);
  assert.match(content, /failure prevents final complete|missing validate-plan-acceptance pass/i);
  assert.match(content, /Plan Conformance Gate/);
  assert.match(content, /Acceptance Evidence Gate/);
  assert.match(content, /sampled_only/);
  assert.match(content, /not_implemented/);
  assert.match(content, /scope_changed_requires_user_approval/);
  assert.match(content, /contradicted_by_current_state/);
  assert.match(content, /Passing tests does not imply plan conformance/);
  assert.match(content, /sampled implementation path does not imply full plan implementation/);
  assert.match(content, /local audit cannot narrow plan scope or mark completion/i);
  assert.match(content, /Final completion requires an AC-by-AC final acceptance verdict/i);
  assert.match(content, /Evidence Layer Separation/);
  assert.match(content, /API\/schema reflected/);
  assert.match(content, /worker\/runtime path reflected/);
  assert.match(content, /UI\/page reflected/);
  assert.match(content, /runtime configured/);
  assert.match(content, /runtime exercised/);
  assert.match(content, /artifact generated/);
  assert.match(content, /artifact accepted by validator/);
  assert.match(content, /API\/UI reflects accepted evidence/i);
  assert.match(content, /Invalid Evidence Rules/);
  assert.match(content, /viewmodel-only/i);
  assert.match(content, /unit test/i);
  assert.match(content, /artifact exists/i);
  assert.match(content, /old result/i);
  assert.match(content, /Completion State Machine/);
  assert.match(content, /unknown \/ not_run/);
  assert.match(content, /fresh required evidence/i);
  assert.match(content, /fresh browser \/ API \/ runtime \/ data \/ test contradiction/i);
  assert.match(content, /downgrade the affected plan item, AC and overall status/i);
  assert.match(content, /invalidating evidence/i);
  assert.match(content, /UI-Facing Gate/);
  assert.match(content, /real page path/i);
  assert.match(content, /component \/ viewmodel \/ mock \/ unit test/i);

  assert.match(content, /Superpowers 输入包/);
  assert.match(content, /Superpowers input packet/);
  assert.match(content, /Superpowers 执行绑定/);
  assert.match(content, /Superpowers execution binding/);
  assert.match(content, /official Superpowers installation path/i);
  assert.match(content, /installation is blocked/i);
  assert.match(content, /superpowers:writing-plans/);
  assert.match(content, /superpowers:subagent-driven-development/);
  assert.match(content, /superpowers:executing-plans/);
  assert.match(content, /superpowers:test-driven-development/);
  assert.match(content, /superpowers:verification-before-completion/);
  assert.match(content, /Plan or AC behavior gap -> TDD/);
  assert.match(content, /write a failing test/i);
  assert.match(content, /observe failure/i);
  assert.match(content, /completion claim/i);
  assert.match(content, /review \/ finish cannot override the plan-conformance matrix or full checklist/i);
  assert.match(content, /technical realization plan controls plan conformance/i);
  assert.match(content, /product\/architecture source prevents scope shrinkage/i);
  assert.match(content, /full checklist controls acceptance/i);
  assert.match(content, /local audit is not Context/i);
  assert.match(content, /not proof/i);
  assert.match(content, /not a global task manager/i);
  assert.match(content, /not a replacement for project tests, CI, review, human acceptance, Task Contract or workflow-contract `plan\.md`/i);
  assert.match(content, /must not contain `overall_status: done`, `status: done` or `final_gate: passed`/);
  assert.match(content, /可多开agent，agent名额不够了就关掉不用的。/);
  assert.match(content, /You may use multiple agents; if agent slots run low, close idle or unnecessary agents\./);
  assert.match(content, /权限\/卡点：在当前平台\/仓库\/工具\/用户已授权权限内最大自主推进/);
  assert.match(content, /已授权 sudo\/gsudo\/admin elevation 先尝试/);
  assert.match(content, /只有本地无法解决的账号\/凭证\/真实环境\/人工审批\/敏感字段等才暂停/);
  assert.match(content, /Autonomy\/blockers: within current platform\/repo\/tool\/user-authorized permissions/i);
  assert.match(content, /Authorized sudo\/gsudo\/admin elevation is not a user blocker/i);
  assert.match(content, /Pause only for locally unsatisfiable account\/credential\/real-env\/human-approval\/sensitive-field needs/i);

  for (const heading of ["Recommended compact Chinese prompt shape:", "Recommended compact English prompt shape:"]) {
    assert.ok(extractTextBlockAfter(content, heading).length <= 3850, `expected ${heading} to fit 3850-character target-mode budget`);
  }

  assert.doesNotMatch(content, forbiddenIncidentNames);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}
