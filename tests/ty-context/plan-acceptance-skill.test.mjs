import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [
  sourceAgents,
  packageAgents,
  rootReadme,
  packageReadme,
  spec,
  sourceContext,
  sourceSkill,
  generatedSkill,
  packagedSkill
] = await Promise.all([
  read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("packages/ty-context/README.md"),
  read("PROJECT_SPEC.md"),
  read("project_context/areas/harness-package.md"),
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

for (const content of [rootReadme, packageReadme, spec, sourceContext]) {
  assert.match(content, /plan acceptance checklist/i);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /not (?:execute|a task planner|task state|proof|prove)/i);
}

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  assert.match(content, /description:.*acceptance checklist for this plan.*goal-mode prompt.*target-mode prompt/s);
  assert.match(content, /description:.*为这份方案生成验收清单.*长程任务方案验收/s);
  assert.match(content, /Package-Managed Boundary/);
  assert.match(content, /tmp\/ty-context\/plan-acceptance/);
  assert.match(content, /Context confirmation gate/i);
  assert.match(content, /falsifiable acceptance items/);
  assert.match(content, /Do not execute the plan/);
  assert.match(content, /Do not include concrete business-domain logic/);
  assert.match(content, /可多开agent，agent名额不够了就关掉不用的。/);
  assert.match(content, /You may use multiple agents; if agent slots run low, close idle or unnecessary agents\./);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}
