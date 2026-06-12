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
  developmentSkill,
  sourceWorkflow,
  packageWorkflow,
  packageJsonRaw,
  contributing,
  launchKit,
  marketMap,
  prTemplate,
  bugTemplate,
  featureTemplate
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
  read("packages/sdlc-harness/assets/skills/context_development_engineer/SKILL.md"),
  read(".github/workflows/harness.yml"),
  read("packages/sdlc-harness/assets/github/harness.yml"),
  read("packages/sdlc-harness/package.json"),
  read("CONTRIBUTING.md"),
  read("docs/launch/README.md"),
  read("docs/launch/market-map.md"),
  read(".github/PULL_REQUEST_TEMPLATE.md"),
  read(".github/ISSUE_TEMPLATE/bug_report.yml"),
  read(".github/ISSUE_TEMPLATE/feature_request.yml")
]);
const packageJson = JSON.parse(packageJsonRaw);

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

for (const content of [sourceAgents, rootReadme, packageReadme, spec, packageAgents, packageGuide]) {
  assert.match(content, /role placement scan/i);
  assert.match(content, /area.*(?:product|产品域).*ownership|area 是产品域归属/s);
  assert.match(content, /contract.*foundation.*verification.*deployment/s);
  assert.match(content, /(?:prompt-level guidance|soft authoring scan|软约束).*not a (?:validator|migration) gate|软约束，不做 gate/s);
}

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.match(content, /context -> implementation -> verification -> context drift check/);
  assert.match(
    content,
    /implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification/
  );
  assert.match(content, /guidance, not a new validator gate|guidance contract, not a new phase gate/);
  assert.match(content, /Before the first code edit.*classify the change/s);
  assert.match(content, /fixed timer/);
  assert.match(content, /enough durable context to guide implementation/);
  assert.match(content, /without a fixed line-count limit/);
  assert.match(content, /Automation.*warn.*should not block|Automation can warn.*must not block/s);
  assert.match(content, /Context: (?:updated|no durable fact change)/);
}

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.match(content, /Context Delta: none\|required/);
  assert.match(content, /Applicable Module Design/);
  assert.match(content, /module design capsule/i);
  assert.match(content, /Contract Conformance/);
  assert.match(content, /plan\.md/);
  assert.match(content, /temporary plan surface|execution scratchpad|execution cache/i);
  assert.match(content, /not (?:Context|a new source of truth|registered in `?context\.toml`?)/i);
  assert.doesNotMatch(content, /machine-enforced edit-order rule/i);
}

assert.match(spec, /workflow contract/i);
assert.match(spec, /prompt-level.*(?:validator|phase gate|required document chain)/s);
assert.match(spec, /plan\.md.*(?:scratchpad|scratch space|execution cache)/is);
assert.match(spec, /plan state, stage artifact or work-product tree/);
assert.match(spec, /## Core Terms/);
assert.match(spec, /Durable fact/);
assert.match(spec, /Context Delta.*durable-fact decision point/s);
assert.match(spec, /Task Contract.*temporary task-local compilation/s);
assert.match(spec, /Module Design Capsule.*stable module principles/s);
assert.match(spec, /Temporary plan surface.*scratchpad/s);
assert.match(spec, /## Harness Mental Model/);
assert.match(spec, /expected agent behavior constraints, not a document workflow/);
assert.match(spec, /Fact-source model/);
assert.match(spec, /Authority model/);
assert.match(spec, /Workflow-contract model/);
assert.match(spec, /Artifact-placement model/);
assert.match(spec, /Soft-constraint model/);
assert.match(spec, /A coding agent does not execute a workflow engine/);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /长期事实/);
  assert.match(content, /轻量变更分类/);
  assert.match(content, /不按固定时长计时/);
  assert.match(content, /必要且足以指导实现的长期结论/);
  assert.match(content, /Context: 本次无长期事实变化/);
  assert.match(content, /Context Delta: none\|required/);
  assert.match(content, /Task Contract/);
  assert.match(content, /模块设计上下文/);
  assert.match(content, /fallback \/ degraded path/);
  assert.match(content, /Contract Conformance/);
  assert.match(content, /自动化最多提示 context-first 风险，不做阻断/);
  assert.match(content, /不检查 context\/code 修改顺序/);
}

for (const content of [sourceAgents, rootReadme, packageReadme, packageAgents, packageGuide]) {
  assert.match(content, /Harness (?:maintains context quality|只维护上下文质量)/i);
  assert.match(
    content,
    /(?:does not replace product tests|project tests.*(?:own|remain responsible for) product quality|不替项目证明产品质量|不替代产品测试)/i
  );
}

for (const content of [rootReadme, packageReadme, packageGuide]) {
  assert.match(content, /Why It Exists/);
  assert.match(content, /Positioning/);
  assert.match(content, /Spec-first kits/);
  assert.match(content, /BMAD-style workflows/);
  assert.match(content, /Task Master-style planners/);
  assert.match(content, /Context7\/Serena-style/);
  assert.match(content, /Portable fallback/);
  assert.match(content, /Try It In 60 Seconds/);
  assert.match(content, /project-tiny-context-harness-demo/);
}

assert.match(contributing, /Minimal Context Harness/);
assert.match(contributing, /Do not reintroduce lifecycle phases/);
assert.match(contributing, /Do not claim benchmark wins/);
assert.match(contributing, /npm test --workspace project-tiny-context-harness/);
assert.match(contributing, /Context: updated/);

assert.match(launchKit, /Launch Kit/);
assert.match(launchKit, /Minimal project memory for AI coding agents/);
assert.match(launchKit, /Do not claim benchmark wins/);
assert.match(launchKit, /Suggested topics/);
assert.match(launchKit, /Show HN/);
assert.match(launchKit, /Product Hunt Draft/);
assert.match(launchKit, /Reddit Draft/);
assert.match(launchKit, /Social Thread Draft/);
assert.match(launchKit, /npm run smoke:quickstart/);
assert.match(launchKit, /npm run launch:check/);
assert.match(launchKit, /Award \/ Recognition Targets/);
assert.match(launchKit, /Product Hunt Golden Kitty Awards/);
assert.match(launchKit, /The Commits/);
assert.match(launchKit, /JavaScript Open Source Awards/);
assert.match(launchKit, /Verify current eligibility/);
assert.match(launchKit, /Launch Operating Plan/);
assert.match(launchKit, /Channel Matrix/);
assert.match(launchKit, /Community Handoff Surface/);
assert.match(launchKit, /Demo Storyboard/);
assert.match(launchKit, /Star \/ Adoption Milestones/);
assert.match(launchKit, /market-map\.md/);

assert.match(marketMap, /Market Map/);
assert.match(marketMap, /Snapshot date: 2026-06-10/);
assert.match(marketMap, /Current Public State/);
assert.match(marketMap, /Competitive Snapshot/);
assert.match(marketMap, /github\/spec-kit/);
assert.match(marketMap, /bmad-code-org\/BMAD-METHOD/);
assert.match(marketMap, /upstash\/context7/);
assert.match(marketMap, /Repo-native project memory for fresh-agent recovery/);
assert.match(marketMap, /Do not say/);
assert.match(marketMap, /Faster delivery proven by benchmark/);
assert.match(marketMap, /10-100 stars/);

assert.match(prTemplate, /Package behavior \/ CLI/);
assert.match(prTemplate, /Managed assets \/ source sync/);
assert.match(prTemplate, /make validate-context/);
assert.match(prTemplate, /Context:/);
assert.match(bugTemplate, /Reproduction steps/);
assert.match(featureTemplate, /Minimal Context boundary check/);

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.doesNotMatch(content, /migrate-context/);
  assert.match(content, /sync.*(?:refreshes managed|刷新 managed|只刷新)/i);
  assert.match(content, /upgrade.*sync/s);
  assert.match(content, /upgrade --check/);
  assert.match(content, /sync-only/);
  assert.match(content, /upgrade-required/);
  assert.match(content, /manual-required/);
  assert.match(content, /safe_pending/);
  assert.match(content, /manual_required/);
  assert.match(content, /blocked/);
  assert.match(content, /sync.*does not run migrations|does not run migrations/s);
  assert.match(content, /(?:product_plan|uiux_design|development_engineer)\/SKILL\.md/);
  assert.match(content, /(?:front matter|frontmatter).*description.*trigger/i);
  assert.match(content, /AGENTS\.md.*role-trigger|角色触发规则/);
  assert.doesNotMatch(content, /sync\s+(?:appends|merges).*override/i);
  assert.doesNotMatch(content, /override.*merged into/i);
  assert.doesNotMatch(content, /init.*override_skills/i);
}

for (const content of [rootReadme, packageReadme, packageGuide]) {
  assert.match(content, /After updating the package, run `sdlc-harness upgrade`/);
}

assert.match(spec, /Release update mode is part of the release contract/);

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

for (const workflow of [sourceWorkflow, packageWorkflow]) {
  assert.match(workflow, /Run harness gate/);
  assert.match(workflow, /validate-context/);
  assert.match(workflow, /Prepare source workspace CLI/);
  assert.match(workflow, /hashFiles\('packages\/sdlc-harness\/package\.json'\) != ''/);
  assert.match(workflow, /npm run build --workspace project-tiny-context-harness/);
  assert.doesNotMatch(workflow, /npm test --workspace project-tiny-context-harness/);
  assert.doesNotMatch(workflow, /package check-source/);
  assert.doesNotMatch(workflow, /npm publish/);
}

assert.equal(packageJson.license, "MIT");
assert.equal(packageJson.homepage, "https://github.com/Seven128/project-tiny-context-harness#readme");
assert.equal(packageJson.repository.url, "git+https://github.com/Seven128/project-tiny-context-harness.git");
assert.equal(packageJson.repository.directory, "packages/sdlc-harness");
assert.equal(packageJson.bugs.url, "https://github.com/Seven128/project-tiny-context-harness/issues");
assert.ok(packageJson.keywords.includes("ai-agents"));
assert.ok(packageJson.keywords.includes("context-engineering"));
assert.ok(packageJson.keywords.includes("developer-tools"));
assert.ok(packageJson.keywords.includes("multi-agent"));
assert.ok(packageJson.keywords.includes("claude-code"));
assert.ok(packageJson.keywords.includes("developer-productivity"));

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
assert.match(authoringSkill, /product_plan\/SKILL\.md/);
assert.match(authoringSkill, /不得恢复 `<harnessRoot>\/pjsdlc_managed\/override_skills\/\*\.md` 合并机制/);
assert.match(authoringSkill, /description.*触发关键词.*AGENTS\.md/s);
assert.doesNotMatch(authoringSkill, /pjsdlc_manager|pjsdlc_dev_sprint|pjsdlc_reviewer|pjsdlc_tester/);

assert.match(productSkill, /description:.*产品方案.*产品经理.*产品专家/s);
assert.match(productSkill, /Package-Managed Boundary/);
assert.match(productSkill, /skills\/product_plan\/SKILL\.md/);
assert.match(productSkill, /front matter `description` trigger keywords aligned/);
assert.match(productSkill, /generic mentions of 产品, product, or requirements/);
assert.match(productSkill, /project_context\/\*\*/);
assert.match(productSkill, /实现漂移/);
assert.match(productSkill, /代码不能静默重定义 Context/);
assert.match(productSkill, /不要把 Context 机械补成代码改动摘要/);
assert.match(productSkill, /Context Delta/);
assert.match(productSkill, /Task Contract/);
assert.match(productSkill, /Contract Conformance/);
assert.match(productSkill, /plan\.md/);
assert.match(productSkill, /临时执行缓存/);
assert.match(productSkill, /不默认创建 `\.work_products\/\*\*`/);
assert.doesNotMatch(productSkill, /恢复\s*旧/);
assert.doesNotMatch(productSkill, /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|pjsdlc_/);

assert.match(uiuxSkill, /description:.*设计稿.*UI\/UX 设计方案.*视觉专家/s);
assert.match(uiuxSkill, /Package-Managed Boundary/);
assert.match(uiuxSkill, /skills\/uiux_design\/SKILL\.md/);
assert.match(uiuxSkill, /front matter `description` trigger keywords aligned/);
assert.match(uiuxSkill, /generic mentions of 设计, design, or user experience/);
assert.match(uiuxSkill, /project_context\/\*\*/);
assert.match(uiuxSkill, /实现漂移/);
assert.match(uiuxSkill, /代码不能静默重定义 Context/);
assert.match(uiuxSkill, /不要把 Context 机械补成代码改动摘要/);
assert.match(uiuxSkill, /Context Delta/);
assert.match(uiuxSkill, /Task Contract/);
assert.match(uiuxSkill, /Contract Conformance/);
assert.match(uiuxSkill, /plan\.md/);
assert.match(uiuxSkill, /临时执行缓存/);
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
assert.match(developmentSkill, /skills\/development_engineer\/SKILL\.md/);
assert.match(developmentSkill, /front matter `description` trigger keywords aligned/);
assert.match(developmentSkill, /generic mentions of code, development, or engineering/);
assert.doesNotMatch(developmentSkill, /multi_agent_v1/);
assert.match(developmentSkill, /project_context\/architecture\.md/);
assert.match(developmentSkill, /project_context\/\*\*/);
assert.match(developmentSkill, /Context expectation/);
assert.match(developmentSkill, /Current code evidence/);
assert.match(developmentSkill, /实现漂移/);
assert.match(developmentSkill, /代码不能静默重定义 Context/);
assert.match(developmentSkill, /Context drift check/);
assert.match(developmentSkill, /Context Delta/);
assert.match(developmentSkill, /Task Contract/);
assert.match(developmentSkill, /Applicable Module Design/);
assert.match(developmentSkill, /Principle Decision Gate/);
assert.match(developmentSkill, /Module Principle \/ Design Gate/);
assert.match(developmentSkill, /模块设计上下文写法/);
assert.match(developmentSkill, /Contract Conformance/);
assert.match(developmentSkill, /plan\.md/);
assert.match(developmentSkill, /临时执行缓存/);
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
