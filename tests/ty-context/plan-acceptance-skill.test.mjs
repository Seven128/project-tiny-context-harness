import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");
const forbiddenIncidentNames = new RegExp(
  ["Intel" + "Hub", "i" + "Find", "We" + "Chat", "微" + "信", "App" + "Secret", "provider" + "-specific"].join("|")
);
const stalePromptBudget = new RegExp("3980 " + "characters");
const superpowersTerms = /Superpowers input packet|Superpowers 输入包|Superpowers execution binding|Superpowers 执行绑定|superpowers:writing-plans|superpowers:subagent-driven-development|superpowers:executing-plans|superpowers:test-driven-development|superpowers:verification-before-completion/i;
const broadTriggerTerms = /acceptance checklist for this plan|target-mode prompt for this plan|completion definition|为这份方案生成验收清单|整理方案输出普通目标模式文本|目标模式文本/;

const frontMatterDescription = (content) => {
  const match = content.match(/^---\s*\r?\n(?<frontMatter>[\s\S]*?)\r?\n---/);
  assert.ok(match?.groups?.frontMatter, "expected skill front matter");
  const description = match.groups.frontMatter.match(/^description:\s*(?<description>.*)$/m);
  assert.ok(description?.groups?.description, "expected skill description");
  return description.groups.description.trim();
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
  read(".codex/ty-context-managed/skills/normal-long-task/SKILL.md"),
  read(".codex/skills/normal-long-task/SKILL.md"),
  read("packages/ty-context/assets/skills/normal-long-task/SKILL.md")
]);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /\/normal-long-task/);
  assert.match(content, /\/superpowers-long-task/);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.doesNotMatch(content, /plan_acceptance_checklist_compiler/);
  assert.doesNotMatch(content, /superpowers_target_prompt_compiler/);
}

for (const content of [rootReadme, rootZhReadme, packageReadme, spec, workflowContract]) {
  assert.match(content, /ordinary long-task Skill|普通长程任务 Skill|normal-long-task/i);
  assert.match(content, /Superpowers long-task Skill|Superpowers 长程任务 Skill|superpowers-long-task/i);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /local audit/i);
  assert.match(content, /not (?:execute|a task planner|task state|proof|prove)|不执行计划|不证明完成/i);
  assert.doesNotMatch(content, /superpowers_target_prompt_compiler/);
}

assert.match(workflowContract, /Ordinary Long-Task Skill Boundary/);
assert.match(workflowContract, /Superpowers Long-Task Skill Boundary/);
assert.match(workflowContract, /generic target-mode prompt/i);
assert.match(workflowContract, /Superpowers-specific target-mode prompt/i);
assert.match(workflowContract, /3850-character effective maximum/);
assert.match(workflowContract, /maximum safe autonomous progress/i);
assert.match(workflowContract, /Generated target prompts inherit the current repository\/global agent-instruction permission policy/);
assert.match(workflowContract, /Authorized `sudo` \/ `gsudo` \/ administrator elevation is not a user blocker/);
assert.match(workflowContract, /Existing local app sessions, browser cookies, CLI auth, OS credential helpers/i);
assert.match(workflowContract, /minimal user action list/i);
assert.doesNotMatch(workflowContract, /visible Superpowers input packet/i);
assert.doesNotMatch(workflowContract, /Superpowers input boundary/i);
assert.doesNotMatch(workflowContract, /Target-mode prompts may recommend the specific Superpowers/i);

assert.match(spec, /ordinary long-task Skill/i);
assert.match(spec, /Superpowers long-task Skill/i);
assert.match(spec, /two-document upstream input packet/i);
assert.match(spec, /acceptance execution contract/i);
assert.match(spec, /test requirements belong to acceptance evidence/i);
assert.match(spec, /not a fourth artifact/i);

assert.match(rootZhReadme, /两份产物/);
assert.match(rootZhReadme, /《开发方案》/);
assert.match(rootZhReadme, /《验收清单和测试用例》/);
assert.match(rootZhReadme, /\/normal-long-task/);
assert.match(rootZhReadme, /\/superpowers-long-task/);
assert.match(rootZhReadme, /普通目标模式文本/);
assert.match(rootZhReadme, /Superpowers 专用目标模式文本/);

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  const description = frontMatterDescription(content);
  assert.equal(content.match(/^name:\s*(.*)$/m)?.[1], "normal-long-task");
  assert.equal(description, "Use when directly invoked for ordinary long-running task acceptance planning.");
  assert.ok(description.length <= 120, `expected short direct-invocation description, got ${description.length}`);
  assert.doesNotMatch(description, broadTriggerTerms);
  assert.doesNotMatch(description, /Superpowers/i);

  assert.match(content, /Package-Managed Boundary/);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /<plan-slug>-local-audit\.md/);
  assert.match(content, /3850 characters/);
  assert.doesNotMatch(content, stalePromptBudget);
  assert.match(content, /implementation\/source plan, not acceptance proof/);
  assert.match(content, /source\/implementation plan，非验收证明/);
  assert.match(content, /complete acceptance standard/);
  assert.match(content, /acceptance is judged against it/);
  assert.match(content, /该文件是完整验收标准，验收以这个为准。完成前必须逐项检查，不满足则继续实现。/);
  assert.match(content, /plan-provided checklist/);
  assert.match(content, /reuse that plan-provided checklist verbatim/);
  assert.match(content, /Do not derive, strengthen, reorder, translate, normalize, merge, split, or add acceptance items/);
  assert.match(content, /Keep the copied plan file and full checklist file separate/);
  assert.match(content, /Required automated tests/);
  assert.match(content, /必须新增或补强的自动化测试/);
  assert.match(content, /covered acceptance item/i);
  assert.match(content, /verification command/i);
  assert.match(content, /failure condition/i);
  assert.match(content, /test requirements are acceptance evidence/i);
  assert.match(content, /No fourth artifact/i);
  assert.match(content, /Do not create `tmp\/ty-context\/plan-acceptance\/<plan-slug>-test-requirements\.md`/);
  assert.match(content, /Upstream Input Packet/);
  assert.match(content, /two-document upstream input packet/i);
  assert.match(content, /Development Plan \/ 开发方案/);
  assert.match(content, /Acceptance and Tests \/ 验收清单和测试用例/);
  assert.match(content, /strict mode/i);
  assert.match(content, /must stop/i);
  assert.match(content, /missing required fields/i);
  assert.match(content, /Do not generate a checklist or goal\/target-mode prompt/i);
  assert.match(content, /Evidence Layer Separation/);
  assert.match(content, /runtime configured/);
  assert.match(content, /runtime exercised/);
  assert.match(content, /artifact generated/);
  assert.match(content, /artifact accepted by validator/);
  assert.match(content, /API\/UI reflects accepted evidence/);
  assert.match(content, /Current-state claims/);
  assert.match(content, /Evidence Ledger/);
  assert.match(content, /Invalid completion evidence/);
  assert.match(content, /Missing ledger evidence means incomplete, not complete/);
  assert.match(content, /Hard Blocker Handling/);
  assert.match(content, /Autonomous Progress Protocol/);
  assert.match(content, /current platform, repository, tool and user-authorized permission boundaries/);
  assert.match(content, /Do not ask the user for work the executor can safely discover, run, inspect or verify itself/);
  assert.match(content, /open the relevant app, browser page, CLI tool or system setting/i);
  assert.match(content, /existing app sessions, browser cookies, CLI auth, OS credential helpers/i);
  assert.match(content, /If the existing session is absent, expired, permission-denied or requires login\/MFA\/approval/i);
  assert.match(content, /inherit current repository\/global `AGENTS\.md` or agent-instruction permission policy/);
  assert.match(content, /Authorized `sudo` \/ `gsudo` \/ administrator elevation is not a user blocker/);
  assert.match(content, /try it before pausing/);
  assert.match(content, /Minimal User Blocker Protocol/);
  assert.match(content, /minimum user action list/);
  assert.match(content, /exact page, system, command or owner/i);
  assert.match(content, /how to redact or avoid sending sensitive values/i);
  assert.match(content, /what the executor will do immediately after receiving the input/i);
  assert.match(content, /safe self-service discovery/);
  assert.match(content, /local audit is not Context/);
  assert.match(content, /not proof by itself/);
  assert.match(content, /not a global task manager/);
  assert.match(content, /not a replacement for project tests, CI, review, human acceptance, Task Contract or workflow-contract `plan\.md`/);
  assert.match(content, /unknown \/ not_run/);
  assert.match(content, /invalidating evidence/);
  assert.match(content, /fresh browser \/ API \/ runtime \/ data \/ test contradiction/i);
  assert.match(content, /downgrade the affected AC and overall status/i);
  assert.match(content, /UI-facing acceptance/i);
  assert.match(content, /real page path/i);
  assert.match(content, /component \/ viewmodel \/ mock \/ unit test/i);
  assert.match(content, /Generic Target-Mode Prompt Generation/);
  assert.match(content, /existing local sessions, browser state, CLI auth and OS credential helpers/i);
  assert.doesNotMatch(content, superpowersTerms);
  assert.doesNotMatch(content, forbiddenIncidentNames);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}
