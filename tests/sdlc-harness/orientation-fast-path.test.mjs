import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [
  sourceAgents,
  rootReadme,
  packageReadme,
  spec,
  packageAgents,
  packageGuide,
  sourceMappings,
  authoringSkill,
  productSkill,
  uiuxSkill,
  developmentSkill
] = await Promise.all([
  read(".codex/pjsdlc_managed/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("packages/sdlc-harness/README.md"),
  read("PROJECT_SPEC.md"),
  read("packages/sdlc-harness/assets/agents/AGENTS_CORE.md"),
  read("packages/sdlc-harness/assets/README.md"),
  read("packages/sdlc-harness/source-mappings.yaml"),
  read(".codex/skills/authoring/harness_package_design/SKILL.md"),
  read("packages/sdlc-harness/assets/skills/context_product_plan/SKILL.md"),
  read("packages/sdlc-harness/assets/skills/context_uiux_design/SKILL.md"),
  read("packages/sdlc-harness/assets/skills/context_development_engineer/SKILL.md")
]);

for (const content of [sourceAgents, rootReadme, packageReadme, spec, packageAgents, packageGuide]) {
  assert.match(content, /Minimal Context Harness/);
  assert.match(content, /project_context\/global\.md/);
  assert.match(content, /project_context\/architecture\.md/);
}

for (const content of [sourceAgents, rootReadme, packageReadme, spec, packageAgents, packageGuide]) {
  assert.match(content, /project_context\/\*\*.*(?:authoritative|权威事实源)/s);
  assert.match(content, /(?:current implementation state|当前实现状态)/);
  assert.match(content, /(?:implementation drift|实现漂移)/);
  assert.match(content, /context-first/i);
  assert.match(content, /context drift check/i);
}

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.match(content, /context -> implementation -> verification -> context drift check/);
  assert.match(
    content,
    /implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification/
  );
  assert.match(content, /guidance, not a new validator gate|guidance contract, not a new phase gate/);
}

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /长期事实/);
  assert.match(content, /不检查 context\/code 修改顺序/);
}

for (const content of [sourceAgents, rootReadme, packageReadme, packageAgents, packageGuide]) {
  assert.match(content, /Harness (?:maintains context quality|只维护上下文质量)/i);
  assert.match(
    content,
    /(?:does not replace product tests|project tests.*(?:own|remain responsible for) product quality|不替项目证明产品质量|不替代产品测试)/i
  );
}

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.doesNotMatch(content, /migrate-context/);
  assert.match(content, /sync.*(?:refreshes managed|刷新 managed|只刷新)/i);
  assert.match(content, /upgrade.*sync/s);
  assert.match(content, /<project>_<role>\/SKILL\.md/);
  assert.doesNotMatch(content, /sync\s+(?:appends|merges).*override/i);
  assert.doesNotMatch(content, /override.*merged into/i);
  assert.doesNotMatch(content, /init.*override_skills/i);
}

for (const content of [rootReadme, packageReadme, spec]) {
  assert.match(content, /DESIGN\.md/);
  assert.match(content, /@google\/design\.md/);
}

assert.match(spec, /Historical Iteration: Stage-Based SDLC Harness/);
assert.match(spec, /Benchmark Findings And Convergence Reason/);
assert.match(spec, /full document chains and frequent workflow gates add real time and token friction/i);

assert.match(sourceMappings, /context_templates/);
assert.match(sourceMappings, /minimal_tools/);
assert.match(sourceMappings, /\.codex\/pjsdlc_managed\/skills/);
assert.match(sourceMappings, /assets\/skills/);
assert.doesNotMatch(sourceMappings, /\.codex\/skills/);

assert.doesNotMatch(packageReadme, /Project initialization.*workflow skills/s);
assert.doesNotMatch(packageReadme, /fresh lifecycle starts at/);

assert.match(authoringSkill, /Minimal Context Harness/);
assert.doesNotMatch(authoringSkill, /Legacy migration support/);
assert.doesNotMatch(authoringSkill, /migrate-context|context-migration/);
assert.doesNotMatch(
  authoringSkill,
  /REQUIREMENT_GATHERING|UI_UX_DESIGNING|ARCHITECTING|SPRINTING|REVIEWING|TESTING|RELEASING|RFC_RECALIBRATION/
);
assert.doesNotMatch(authoringSkill, /plan\.yaml|lifecycle\.yaml|\.work_products\/|make work-products-overview/);
assert.match(authoringSkill, /<project>_product_plan\/SKILL\.md/);
assert.match(authoringSkill, /不得恢复 `<harnessRoot>\/pjsdlc_managed\/override_skills\/\*\.md` 合并机制/);
assert.doesNotMatch(authoringSkill, /pjsdlc_manager|pjsdlc_dev_sprint|pjsdlc_reviewer|pjsdlc_tester/);

assert.match(productSkill, /description:.*产品方案.*产品经理.*产品专家/s);
assert.match(productSkill, /Package-Managed Boundary/);
assert.match(productSkill, /myhub_product_plan\/SKILL\.md/);
assert.match(productSkill, /generic mentions of 产品, product, or requirements/);
assert.match(productSkill, /project_context\/\*\*/);
assert.match(productSkill, /实现漂移/);
assert.match(productSkill, /代码不能静默重定义 Context/);
assert.match(productSkill, /不要把 Context 机械补成代码改动摘要/);
assert.match(productSkill, /不默认创建 `\.work_products\/\*\*`/);
assert.doesNotMatch(productSkill, /恢复\s*旧/);
assert.doesNotMatch(productSkill, /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|pjsdlc_/);

assert.match(uiuxSkill, /description:.*设计稿.*UI\/UX 设计方案.*视觉专家/s);
assert.match(uiuxSkill, /Package-Managed Boundary/);
assert.match(uiuxSkill, /myhub_uiux_design\/SKILL\.md/);
assert.match(uiuxSkill, /generic mentions of 设计, design, or user experience/);
assert.match(uiuxSkill, /project_context\/\*\*/);
assert.match(uiuxSkill, /实现漂移/);
assert.match(uiuxSkill, /代码不能静默重定义 Context/);
assert.match(uiuxSkill, /不要把 Context 机械补成代码改动摘要/);
assert.match(uiuxSkill, /@google\/design\.md/);
assert.match(uiuxSkill, /DESIGN\.md/);
assert.match(uiuxSkill, /npx @google\/design\.md lint DESIGN\.md/);
assert.match(uiuxSkill, /export --format (?:css-tailwind|json-tailwind)/);
assert.match(uiuxSkill, /Impeccable review/);
assert.match(uiuxSkill, /重做设计/);
assert.match(uiuxSkill, /frontend redesign/);
assert.match(uiuxSkill, /npx impeccable detect <target>/);
assert.match(uiuxSkill, /默认尝试运行/);
assert.match(uiuxSkill, /不默认创建 `\.work_products\/\*\*`/);
assert.doesNotMatch(uiuxSkill, /恢复\s*旧/);
assert.doesNotMatch(uiuxSkill, /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|pjsdlc_/);

assert.match(developmentSkill, /description:.*开发工程师.*开发方案.*实施计划.*技术专家/s);
assert.match(developmentSkill, /Package-Managed Boundary/);
assert.match(developmentSkill, /myhub_development_engineer\/SKILL\.md/);
assert.match(developmentSkill, /generic mentions of code, development, or engineering/);
assert.doesNotMatch(developmentSkill, /multi_agent_v1/);
assert.match(developmentSkill, /project_context\/architecture\.md/);
assert.match(developmentSkill, /project_context\/\*\*/);
assert.match(developmentSkill, /Context expectation/);
assert.match(developmentSkill, /Current code evidence/);
assert.match(developmentSkill, /实现漂移/);
assert.match(developmentSkill, /代码不能静默重定义 Context/);
assert.match(developmentSkill, /Context drift check/);
assert.match(developmentSkill, /不默认创建 `\.work_products\/\*\*`/);
assert.doesNotMatch(developmentSkill, /恢复\s*旧/);
assert.doesNotMatch(developmentSkill, /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|pjsdlc_/);

assert.match(sourceAgents, /Impeccable/);
assert.match(sourceAgents, /重做设计/);
assert.match(sourceAgents, /frontend redesign/);
assert.match(sourceAgents, /npx impeccable detect <target>/);
assert.match(packageAgents, /Impeccable/);
assert.doesNotMatch(sourceAgents, /multi_agent_v1/);
assert.doesNotMatch(packageAgents, /multi_agent_v1/);
assert.doesNotMatch(packageReadme, /multi_agent_v1/);
