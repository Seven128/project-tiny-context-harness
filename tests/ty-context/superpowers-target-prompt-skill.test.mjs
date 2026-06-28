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
  assert.match(content, /adapter layer|适配层/i);
  assert.match(content, /official Superpowers skills|官方 Superpowers skills/i);
  assert.match(content, /upstream-owned schema|上游维护的 schema/i);
  assert.match(content, /Superpowers-ready Markdown implementation plan|直接绑定 Superpowers 执行/i);
  assert.match(content, /Superpowers alone can still drift|单靠 Superpowers[\s\S]*漂移/i);
  assert.match(content, /source authority|上游 source authority|上游权威/i);
  assert.match(content, /Product \/ Architecture Source|产品\/架构原始意图源|产品\/架构方案/i);
  assert.match(content, /Technical Realization Plan|具体技术实现方案|技术实现方案/i);
  assert.match(content, /Acceptance Checklist|验收清单/i);
  assert.match(content, /task-state\.json|canonical state|canonical task state|canonical state kernel|状态源/i);
  assert.match(content, /events\.ndjson|append-only|追加/i);
  assert.match(content, /derived\/|derived views|generated views|派生/i);
  assert.match(content, /plan-conformance-matrix|plan-conformance matrix|final-acceptance-verdict|final acceptance verdict/i);
  assert.match(content, /task-state\.evidence|evidence records|canonical evidence|证据记录/i);
  assert.match(content, /delivery_scope|delivery scope|capability-first delivery|capability-first/i);
  assert.match(content, /full_population_required|full population|full-population|full population operation/i);
  assert.match(content, /representative samples|representative sample|代表性样本|sample evidence/i);
  assert.match(content, /scope_conflict_requires_decision/i);
  assert.match(content, /must not redefine[\s\S]*fork[\s\S]*Superpowers execution mechanics|不能重新定义[\s\S]*Superpowers 执行机制|不能[\s\S]*分叉 Superpowers 执行机制/i);
  assert.match(content, /conflict[\s\S]*duplicate[\s\S]*override[\s\S]*Superpowers|冲突[\s\S]*重复[\s\S]*覆盖/i);
  assert.match(content, /Passing Superpowers review|通过 Superpowers review/i);
  assert.match(content, /Product Context Delta/i);
  assert.match(content, /Technical Context Delta/i);
  assert.match(content, /audit_task_complete/);
  assert.match(content, /acceptance_target_status/);
  assert.match(content, /product_goal_complete/);
  assert.match(content, /product_goal_complete=true/);
  assert.match(content, /implementation \/ execution goals?|实现\/执行目标|实现 \/ 执行 Goal mode/i);
  assert.match(content, /read-only audit goals?|只读审计目标|read-only audit \/ reporting/i);
  assert.match(content, /Audit workflow completed; acceptance target not complete\./);
  assert.match(content, /Goal achieved/);
  assert.match(content, /update_goal\(status="complete"\)/);
  assert.match(workflowContract, /maximum safe autonomous progress/i);
  assert.match(workflowContract, /same inherited permission policy applies to the Superpowers target prompt/i);
  assert.match(workflowContract, /authorized `sudo` \/ `gsudo` \/ administrator elevation is self-service work/i);
  assert.match(workflowContract, /existing local app\/browser sessions and CLI\/system auth/i);
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
  assert.match(content, /aligned to the official Superpowers skills|对齐官方 Superpowers skills/i);
  assert.match(content, /upstream-owned schema|上游维护的 schema/i);
  assert.match(content, /Superpowers alone can still drift/i);
  assert.match(content, /does not by itself preserve source authority/i);
  assert.match(content, /must not redefine, duplicate or fork official Superpowers execution mechanics/i);
  assert.match(content, /boundary conflict/i);
  assert.match(content, /Superpowers-ready Markdown implementation plan/i);
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
  assert.match(content, /does not perform task-complexity routing/i);
  assert.match(content, /already selected Superpowers long-task execution/i);
  assert.doesNotMatch(content, /normally comes from `\/normal-long-task`/i);
  assert.match(content, /missing required fields/i);
  assert.match(content, /Missing Fields Report/);
  assert.match(content, /missing_section/);
  assert.match(content, /missing_required_fields/);
  assert.match(content, /why_blocking/);
  assert.match(content, /cannot_infer_policy/);
  assert.match(content, /required_next_input/);
  assert.match(content, /suggested_upstream_action/);
  assert.match(content, /stop/i);
  assert.match(content, /Do not generate the Superpowers target-mode prompt/i);
  assert.match(content, /missing Technical Realization Plan/i);
  assert.match(content, /Product Context Delta/i);
  assert.match(content, /Technical Context Delta/i);
  assert.match(content, /Context Delta: required/i);
  assert.match(content, /Context Delta: none/i);
  assert.match(content, /any required sub-delta makes overall Context Delta required/i);
  assert.match(content, /not a validator gate|not.*machine-enforced gate/i);
  assert.match(content, /Parent Context Delta/);
  assert.match(content, /Slice Context Delta/);
  assert.match(content, /new durable fact/i);
  assert.match(content, /Slice-level `none` cannot override a parent-level `required` decision/i);
  assert.match(content, /Autonomous Progress Protocol/);
  assert.match(content, /current platform, repository, tool and user-authorized permission boundaries/);
  assert.match(content, /Do not ask the user for work the executor can safely discover, run, inspect or verify itself/);
  assert.match(content, /open the relevant app, browser page, CLI tool or system setting/i);
  assert.match(content, /existing app sessions, browser cookies, CLI auth, OS credential helpers/i);
  assert.match(content, /If the existing session is absent, expired, permission-denied or requires login\/MFA\/approval/i);
  assert.match(content, /inherit current repository\/global `AGENTS\.md` or agent-instruction permission policy/);
  assert.match(content, /Authorized `sudo` \/ `gsudo` \/ administrator elevation is not a user blocker/);
  assert.match(content, /try it before pausing/);
  assert.match(content, /Pause only for locally unsatisfiable hard blockers/i);
  assert.match(content, /minimum user action list/);
  assert.match(content, /exact page, system, command or owner/i);
  assert.match(content, /how to redact or avoid sending sensitive values/i);
  assert.match(content, /what the executor will do immediately after receiving the input/i);

  assert.match(content, /Product \/ Architecture Source prevents scope shrinkage/i);
  assert.match(content, /Authority Model/);
  assert.match(content, /Product \/ Architecture Source owns intent, scope/i);
  assert.match(content, /Technical Realization Plan owns plan items/i);
  assert.match(content, /Acceptance Checklist owns ACs/i);
  assert.match(content, /delivery_scope/i);
  assert.match(content, /acceptance_scope/i);
  assert.match(content, /full_population_required/i);
  assert.match(content, /representative_samples/i);
  assert.match(content, /scope_conflict_requires_decision/i);
  assert.match(content, /sample provider\/interface\/page evidence cannot substitute|sample provider\/interface\/page as all-provider|sample.*all-provider/i);
  assert.match(content, /cannot narrow, rewrite or replace the upstream sources/i);
  assert.match(content, /Technical Realization Plan is the execution blueprint/i);
  assert.match(content, /Acceptance Checklist is the completion authority/i);
  assert.match(content, /traceable plan items/i);
  assert.match(content, /expected implementation surfaces/i);
  assert.match(content, /full acceptance checklist/i);
  assert.match(content, /local audit/i);
  assert.match(content, /relevant Context/i);
  assert.match(content, /required tests \/ core paths/i);
  assert.match(content, /task-state\.json/);
  assert.match(content, /events\.ndjson/);
  assert.match(content, /derived\/plan-conformance-matrix/);
  assert.match(content, /derived\/final-acceptance-verdict/);
  assert.match(content, /plan-conformance-matrix/i);
  assert.match(content, /final-acceptance-verdict/i);
  for (const pattern of [
    /slice-delta\.json/, /progress_value/, /evidence_id/, /slice_id/, /slice_goal/, /missing_layer_classes/,
    /touched_plan_items/, /touched_acs/, /does_not_prove/, /closed_layers/,
    /remaining_layers/, /cleanup_assertions/, /redaction/i,
    /Do not manually edit derived|derived\/\*\* is generated only/i,
    /must not contain secrets, raw credentials, tokens, cookies or long raw payloads/i,
    /2-4 strongly related missing layers/i,
    /same AC[\s\S]*runtime scenario[\s\S]*proof environment[\s\S]*verification path/i,
    /Single-gap slices[\s\S]*(?:blockers|contradictions|metadata cleanup)/i, /functional gap/i,
    /proof gap/i, /stale wording\/artifact sync/i, /upstream blocker/i, /live DB\/runtime proof/i,
    /Browser\/UI proof/i, /security\/redaction proof/i, /all-provider\/all-runner coverage/i,
    /apply-slice-delta/i, /derive/i,
    /do not mark ACs complete/i, /stale\/overclaim scan/i,
    /accepted[\s\S]*complete[\s\S]*final passed[\s\S]*product_goal_complete=true[\s\S]*scope narrowed[\s\S]*sibling substitution/i,
    /reuse DB\/API\/Browser environments/i, /unique proof prefixes/i, /cleanup count\/assertion/i,
    /fixed auditor checklist/i, /source\/plan\/checklist consistency/i, /closed gaps have fresh evidence/i,
    /UI proof uses real owner surface/i
  ]) assert.match(content, pattern);
  assert.match(content, /validate-plan-acceptance/i);
  assert.match(content, /failure prevents final complete|missing validate-plan-acceptance pass/i);
  assert.match(content, /Plan Conformance Gate/);
  assert.match(content, /Acceptance Evidence Gate/);
  assert.match(content, /External Reviewer Evidence Gate/);
  assert.match(content, /Evidence Ledger \/ proof index is a generated execution index/i);
  assert.match(content, /evidence-traceable/i);
  assert.match(content, /task-state\.evidence\[\]|evidence_id/i);
  assert.match(content, /Independent Reviewer Gate/);
  assert.match(content, /Final gate order is fixed/);
  assert.match(content, /executor self-evidence/);
  assert.match(content, /validate-superpowers-state/);
  assert.match(content, /rerun derive plus both validators|rerun `ty-context validate-plan-acceptance`/);
  assert.match(content, /Goal And Acceptance Wording/);
  assert.match(content, /audit_task_complete/);
  assert.match(content, /acceptance_target_status/);
  assert.match(content, /product_goal_complete/);
  assert.match(content, /product_goal_complete=true/);
  assert.match(content, /implementation (?:or|\/) execution Goal mode objective|implementation\/execution goal complete/i);
  assert.match(content, /read-only audit \/ reporting Goal mode objective|read-only audit goal may end/i);
  assert.match(content, /final-gate.*computes|computed/i);
  assert.match(content, /Audit workflow completed; acceptance target not complete\./);
  assert.match(content, /Goal achieved/);
  assert.match(content, /update_goal\(status="complete"\)/);
  for (const pattern of [
    /No Sibling Substitution/, /required proof chain/i, /required_proof_chain/, /missing_required_layers/,
    /drift_severity/, /sibling_substitution_used/, /auditor_status/, /read-only auditor/i,
    /gap detector|finds gaps|gap review/i, /reconstructs each AC proof chain/i, /sampled_only/,
    /not_implemented/, /scope_changed_requires_user_approval/, /contradicted_by_current_state/,
    /Passing tests does not imply plan conformance/, /sampled implementation path does not imply full plan implementation/,
    /local audit cannot narrow plan scope or mark completion/i, /process recovery only/i, /completion judgment/i,
    /same execution path, negative case, screenshot or artifact class/i, /Final completion requires an AC-by-AC final acceptance verdict/i,
    /Evidence Layer Separation/, /API\/schema reflected/, /worker\/runtime path reflected/, /UI\/page reflected/,
    /runtime configured/, /runtime exercised/, /artifact generated/, /artifact accepted by validator/,
    /API\/UI reflects accepted evidence/i, /Invalid Evidence Rules/, /viewmodel-only/i, /unit test/i,
    /artifact exists/i, /old result/i, /Completion State Machine/, /unknown \/ not_run/, /fresh required evidence/i,
    /fresh browser \/ API \/ runtime \/ data \/ test contradiction/i,
    /downgrade the affected plan item, AC and overall status/i, /invalidating evidence/i, /UI-Facing Gate/,
    /real page path/i, /component \/ viewmodel \/ mock \/ unit test/i
  ]) assert.match(content, pattern);

  assert.match(content, /Superpowers 输入包/);
  assert.match(content, /Superpowers input packet/);
  assert.match(content, /Superpowers 执行绑定/);
  assert.match(content, /Superpowers execution binding/);
  assert.match(content, /Tiny Context gates[\s\S]*do not redefine[\s\S]*fork Superpowers execution mechanics/i);
  assert.match(content, /official Superpowers installation path/i);
  assert.match(content, /installation is blocked/i);
  assert.match(content, /satisfies the required input fields|required executable-plan input checks|输入校验阶段已确认可执行/i);
  assert.doesNotMatch(content, /superpowers:writing-plans/);
  assert.match(content, /superpowers:subagent-driven-development/);
  assert.match(content, /superpowers:executing-plans/);
  assert.match(content, /superpowers:test-driven-development/);
  assert.match(content, /superpowers:verification-before-completion/);
  assert.match(content, /Plan or AC behavior gap -> TDD/);
  assert.match(content, /write a failing test/i);
  assert.match(content, /observe failure/i);
  assert.match(content, /completion claim/i);
  assert.match(content, /review \/ finish cannot override the plan-conformance matrix or full checklist|review[\s\S]*cannot override Tiny Context gates/i);
  assert.match(content, /Superpowers review and verification remain useful execution checks/i);
  assert.match(content, /passing Superpowers review does not by itself prove plan conformance or checklist acceptance/i);
  assert.match(content, /technical realization plan controls plan conformance/i);
  assert.match(content, /product\/architecture source prevents scope shrinkage/i);
  assert.match(content, /full checklist controls acceptance/i);
  assert.match(content, /local audit is not Context|generated local audit/i);
  assert.match(content, /not proof/i);
  assert.match(content, /not a global task manager/i);
  assert.match(content, /not a replacement for project tests, CI, review, human acceptance, Task Contract or workflow-contract `plan\.md`/i);
  assert.match(content, /must not contain `overall_status: done`, `status: done` or `final_gate: passed`/);
  assert.match(content, /可多开agent，agent名额不够了就关掉不用的。/);
  assert.match(content, /You may use multiple agents; if agent slots run low, close idle or unnecessary agents\./);
  assert.match(content, /权限\/卡点：在当前平台\/仓库\/工具\/用户已授权权限内最大自主推进/);
  assert.match(content, /先打开相关 app\/浏览器页面\/CLI\/系统设置，复用已有登录态\/授权会话\/凭据链/);
  assert.match(content, /已授权 sudo\/gsudo\/admin elevation 先尝试/);
  assert.match(content, /只有实际未登录\/会话失效\/权限不足\/需要 MFA 或人工审批/);
  assert.match(content, /Autonomy\/blockers: self-serve under current permissions/i);
  assert.match(content, /Open app\/browser\/CLI\/settings and reuse sessions\/auth\/helpers/i);
  assert.match(content, /Try authorized sudo\/gsudo\/admin/i);
  assert.match(content, /Pause only after missing login(?:, expired session, denied permission, MFA\/approval|\/session expiry\/denied permission\/MFA\/approval)/i);

  for (const heading of ["Recommended compact Chinese prompt shape:", "Recommended compact English prompt shape:"]) {
    assert.ok(extractTextBlockAfter(content, heading).length <= 3850, `expected ${heading} to fit 3850-character target-mode budget`);
  }

  assert.doesNotMatch(content, forbiddenIncidentNames);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}
