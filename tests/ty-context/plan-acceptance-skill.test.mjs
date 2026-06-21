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
const staleWorkflowBudget = new RegExp("3980-" + "character|3980 " + "characters");
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
  read(".codex/ty-context-managed/skills/plan_acceptance_checklist_compiler/SKILL.md"),
  read(".codex/skills/plan_acceptance_checklist_compiler/SKILL.md"),
  read("packages/ty-context/assets/skills/plan_acceptance_checklist_compiler/SKILL.md")
]);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /plan_acceptance_checklist_compiler/);
  assert.match(content, /goal-mode prompt/);
  assert.match(content, /target-mode prompt/);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
}

for (const content of [rootReadme, packageReadme, spec, workflowContract]) {
  assert.match(content, /plan acceptance checklist/i);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /local audit/i);
  assert.match(content, /not (?:execute|a task planner|task state|proof|prove)/i);
}

for (const content of [rootReadme, packageReadme]) {
  assert.match(content, /full checklist/i);
  assert.match(content, /acceptance (?:authority|standard)/i);
  assert.match(content, /navigation/i);
  assert.match(content, /priority/i);
  assert.match(content, /explicit concrete (?:checklist|acceptance checklist)/i);
  assert.match(content, /verbatim/i);
}

assert.match(rootZhReadme, /明确、具体的“验收清单”/);
assert.match(rootZhReadme, /直接复用那份清单/);
assert.match(rootZhReadme, /单独写入完整验收清单文件/);

assert.match(workflowContract, /3850-character effective maximum/);
assert.doesNotMatch(workflowContract, staleWorkflowBudget);
assert.match(workflowContract, /full acceptance checklist is the authoritative acceptance standard/);
assert.match(workflowContract, /Compact prompt summaries provide direction, priority and recovery navigation only/);
assert.match(workflowContract, /If they conflict, the full checklist wins/);
assert.match(workflowContract, /explicit concrete acceptance checklist/);
assert.match(workflowContract, /reuses that plan-provided checklist verbatim/);
assert.match(workflowContract, /materialized plan and full checklist remain separate files/);
assert.match(workflowContract, /Current-State Conformance/);
assert.match(workflowContract, /prompt-level completion discipline/);
assert.match(workflowContract, /not a CLI validator/);
assert.match(workflowContract, /not a `validate-context` product-state check/);

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  const description = frontMatterDescription(content);
  assert.ok(description.length <= 900, `expected description <= 900 chars, got ${description.length}`);
  assert.match(description, /acceptance checklist for this plan/);
  assert.match(description, /goal-mode prompt for this implementation plan/);
  assert.match(description, /target-mode prompt for this plan/);
  assert.match(description, /为这份方案生成验收清单/);
  assert.match(description, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /long-task plan acceptance/);
  assert.match(content, /audit this plan for acceptance criteria/);
  assert.match(content, /长程任务方案验收/);
  assert.match(content, /为这份 md 生成目标模式验收文本/);
  assert.match(content, /Package-Managed Boundary/);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /<plan-slug>-local-audit\.md/);
  assert.match(content, /3850 characters/);
  assert.doesNotMatch(content, stalePromptBudget);
  assert.match(content, /preserve information density/);
  assert.match(content, /do not drop required paths, core acceptance categories, blocker rules, evidence rules or false-completion traps merely to be short/);
  assert.match(content, /compress by tightening wording and referring to the full checklist path while preserving required paths/);
  assert.match(content, /4000-character practical paste boundary/);
  assert.doesNotMatch(content, /4000 characters/);
  assert.doesNotMatch(content, /do not aim for 4000 exactly/);
  assert.match(content, /implementation\/source plan, not acceptance proof/);
  assert.match(content, /source\/implementation plan，非验收证明/);
  assert.match(content, /complete acceptance standard/);
  assert.match(content, /acceptance is judged against it/);
  assert.match(content, /every item must be checked before completion/);
  assert.match(content, /该文件是完整验收标准，验收以这个为准。完成前必须逐项检查，不满足则继续实现。/);
  assert.match(content, /plan-provided checklist/);
  assert.match(content, /Acceptance Checklist/);
  assert.match(content, /验收清单/);
  assert.match(content, /reuse that plan-provided checklist verbatim/);
  assert.match(content, /Do not derive, strengthen, reorder, translate, normalize, merge, split, or add acceptance items/);
  assert.match(content, /Do not prepend the generated `Acceptance Contract`/);
  assert.match(content, /Skip Steps 5 and 6 for the full checklist file/);
  assert.match(content, /If multiple explicit checklist sections exist, copy all of them/);
  assert.match(content, /Keep the copied plan file and full checklist file separate/);
  assert.match(content, /When no explicit concrete plan-provided checklist exists, continue with the generated-checklist flow below/);
  assert.match(content, /too large for the 3850-character prompt budget/);
  assert.match(content, /not by rewriting or adding criteria/);
  assert.match(content, /compact checklist summary for direction, priority and recovery navigation/);
  assert.match(content, /summary is direction\/priority\/recovery navigation, not the acceptance authority/);
  assert.match(content, /overlap with the full checklist is allowed/);
  assert.match(content, /full checklist wins conflicts/);
  assert.match(content, /冲突时以完整 checklist 为准/);
  assert.match(content, /Context confirmation gate/i);
  assert.match(content, /falsifiable acceptance items/);
  assert.match(content, /Current-state claims/);
  assert.match(content, /Evidence ledger required/);
  assert.match(content, /Invalid completion evidence/);
  assert.match(content, /Evidence Ledger/);
  assert.match(content, /Expected state/);
  assert.match(content, /Current observed state/);
  assert.match(content, /Current evidence/);
  assert.match(content, /Evidence location \/ API \/ UI \/ command/);
  assert.match(content, /proven/);
  assert.match(content, /unproven/);
  assert.match(content, /stale-evidence/);
  assert.match(content, /runtime-disconnected/);
  assert.match(content, /implementation-drift/);
  assert.match(content, /blocked/);
  assert.match(content, /deferred-by-explicit-scope/);
  assert.match(content, /Missing ledger evidence means incomplete, not complete/);
  assert.match(content, /Hard Blocker Handling/);
  assert.match(content, /Treat any unresolved required blocker as non-completion/);
  assert.match(content, /if only locally unsatisfiable hard blockers remain, pause for the user or external owner instead of marking the goal complete/);
  assert.match(content, /Minimal User Blocker Protocol/);
  assert.match(content, /safe self-service discovery/);
  assert.match(content, /cookies, full pages, HAR files/);
  assert.match(content, /minimum value or action/);
  assert.match(content, /Evidence Layer Separation/);
  assert.match(content, /runtime configured/);
  assert.match(content, /runtime exercised/);
  assert.match(content, /artifact generated/);
  assert.match(content, /artifact accepted by validator/);
  assert.match(content, /API\/UI reflects accepted evidence/);
  assert.match(content, /final gate\/check command passed/);
  assert.match(content, /fallback was not configured or exercised/);
  assert.match(content, /Code-only changes/);
  assert.match(content, /UI\/API shell behavior/);
  assert.match(content, /Stale artifacts or stale runtime evidence/);
  assert.match(content, /mismatched read path/);
  assert.match(content, /Unexercised runtime/);
  assert.match(content, /Partial tests/);
  assert.match(content, /API\/UI\/data\/test contradictions/);
  assert.match(content, /local audit is not Context/);
  assert.match(content, /not proof by itself/);
  assert.match(content, /not a global task manager/);
  assert.match(content, /not a replacement for project tests, CI, review, human acceptance, Task Contract or workflow-contract `plan\.md`/);
  assert.match(content, /each acceptance item execution still follows it and the repository's Tiny Context workflow contract/);
  assert.match(content, /强卡点未解除/);
  assert.match(content, /runtime 未配置\/未演练/);
  assert.match(content, /artifact 未被 validator 接受/);
  assert.match(content, /Do not execute the plan/);
  assert.match(content, /Do not include concrete business-domain logic/);
  assert.doesNotMatch(content, forbiddenIncidentNames);
  assert.match(content, /可多开agent，agent名额不够了就关掉不用的。/);
  assert.match(content, /You may use multiple agents; if agent slots run low, close idle or unnecessary agents\./);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}
