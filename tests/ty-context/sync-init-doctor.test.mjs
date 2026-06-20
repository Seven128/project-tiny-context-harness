import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/ty-context/dist/commands/init.js";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";

const root = await mkdtemp(path.join(tmpdir(), "ty-context-minimal-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "ty-context-minimal-configured-"));
const cliRoot = await mkdtemp(path.join(tmpdir(), "ty-context-minimal-cli-"));
const syncBlockRoot = await mkdtemp(path.join(tmpdir(), "ty-context-minimal-sync-block-"));
const cliPath = fileURLToPath(new URL("../../packages/ty-context/dist/cli.js", import.meta.url));

try {
  assert.equal(resolveAgentHarnessFolderName(""), ".codex");
  assert.equal(resolveAgentHarnessFolderName("2"), ".claude");
  assert.equal(resolveAgentHarnessFolderName("cursor"), ".cursor");
  assert.equal(resolveAgentHarnessFolderName("other"), ".agent");
  assert.equal(resolveAgentHarnessFolderName("other", ".workflow"), ".workflow");

  const initReport = await runInit(root, { adopt: false, force: false });
  assert.ok(initReport.some((line) => line.includes("created .agent/config.yaml")));
  assert.ok(initReport.some((line) => line.includes("created project_context/context.toml")));
  assert.ok(initReport.some((line) => line.includes("created project_context/global.md")));
  assert.ok(initReport.some((line) => line.includes("created project_context/architecture.md")));
  assert.ok(initReport.some((line) => line.includes("created project_context/areas/main.md")));
  assert.ok(initReport.some((line) => line.includes("created project_context/areas/main/verification.md")));
  assert.ok(initReport.some((line) => line.includes("created DESIGN.md")));

  const config = await readFile(path.join(root, ".agent/config.yaml"), "utf8");
  assert.match(config, /schema_version: "4"/);
  assert.match(config, /modularity:/);
  assert.match(config, /limit: 300/);
  assert.match(config, /policy: strict_except_generated/);
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /\.agent\/skills/);
  assert.match(config, /\.agent\/ty-context-managed\/context_templates/);
  assert.match(config, /DESIGN\.md/);
  assert.doesNotMatch(config, /\.agent\/ty-context-managed\/templates/);
  assert.doesNotMatch(config, /\.agent\/ty-context-managed\/policies/);

  const globalContext = await readFile(path.join(root, "project_context/global.md"), "utf8");
  assert.match(globalContext, /## Project Goal/);
  assert.match(globalContext, /## Architecture Context/);
  assert.match(globalContext, /project_context\/architecture\.md/);
  assert.match(globalContext, /## Product \/ Delivery Brief/);
  assert.match(globalContext, /## UX \/ Screen Brief/);
  assert.match(globalContext, /DESIGN\.md/);
  assert.match(globalContext, /Classify changes before implementation/);
  assert.match(globalContext, /update Context before code with enough durable context to guide implementation/);
  assert.match(globalContext, /role placement scan/);
  assert.match(globalContext, /registering every Markdown file as an area/);
  assert.match(globalContext, /## Verification Entry Points/);
  assert.match(globalContext, /default verification context/);
  assert.match(globalContext, /verification` role Context/);
  assert.match(globalContext, /## Next Safe Action/);
  assert.match(globalContext, /whether the next change should update Context before code/);

  const contextManifest = await readFile(path.join(root, "project_context/context.toml"), "utf8");
  assert.match(contextManifest, /\[\[areas\]\]/);
  assert.match(contextManifest, /id = "main"/);
  assert.match(contextManifest, /context = "project_context\/areas\/main\.md"/);
  assert.match(contextManifest, /\[\[context\]\]/);
  assert.match(contextManifest, /path = "project_context\/areas\/main\/verification\.md"/);
  assert.match(contextManifest, /role = "verification"/);
  assert.match(contextManifest, /refine obvious/);
  assert.match(contextManifest, /instead of keeping/);

  const designMd = await readFile(path.join(root, "DESIGN.md"), "utf8");
  assert.match(designMd, /name: "Starter Design System"/);
  assert.match(designMd, /primary-action/);
  assert.match(designMd, /User-authored tokens/);
  assert.match(designMd, /# Design System/);
  assert.match(designMd, /## Do's and Don'ts/);
  assert.match(designMd, /## Design Change Workflow/);
  assert.match(designMd, /Impeccable/);
  assert.match(designMd, /npx impeccable detect <target>/);

  const architectureContext = await readFile(path.join(root, "project_context/architecture.md"), "utf8");
  assert.match(architectureContext, /# Architecture Context/);
  assert.match(architectureContext, /restrained architecture context/i);
  assert.match(architectureContext, /## System Boundary/);
  assert.match(architectureContext, /## Component Map/);
  assert.match(architectureContext, /architecture boundary changes should be captured here/);
  assert.match(architectureContext, /## Verification Implications/);

  const areaContext = await readFile(path.join(root, "project_context/areas/main.md"), "utf8");
  assert.match(areaContext, /## Responsibility/);
  assert.match(areaContext, /Contract changes should be captured here/);
  assert.match(areaContext, /Module Design Capsule/);
  assert.match(areaContext, /Principles: stable execution constraints/);
  assert.match(areaContext, /## Code Entry Points/);
  assert.match(areaContext, /## Related Role Context/);
  assert.match(areaContext, /verification` role Context/);
  assert.match(areaContext, /deployment` role Context/);

  const verificationContext = await readFile(path.join(root, "project_context/areas/main/verification.md"), "utf8");
  assert.match(verificationContext, /# Verification Context: main/);
  assert.match(verificationContext, /critical repeat-execution paths/);
  assert.match(verificationContext, /## Verification Paths/);
  assert.match(verificationContext, /Verification paths are reusable execution instances/);
  assert.match(verificationContext, /## Forbidden Content/);

  await assert.rejects(stat(path.join(root, ".agent/state/lifecycle.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/state/plan.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/skills/ty-context_manager/SKILL.md")));
  await stat(path.join(root, ".agent/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_development_engineer/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_surface_contract/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_full_project_export/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_harness_upgrade/SKILL.md"));
  await stat(path.join(root, ".agent/skills/plan_acceptance_checklist_compiler/SKILL.md"));
  await assert.rejects(stat(path.join(root, "project_context/areas/product-surface-contracts.md")));
  await assert.rejects(stat(path.join(root, ".work_products/INDEX.md")));

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  assert.match(agents, /project_context\/global\.md/);
  assert.match(agents, /project_context\/architecture\.md/);
  assert.match(agents, /权威事实源/);
  assert.match(agents, /当前实现状态/);
  assert.match(agents, /实现漂移/);
  assert.match(agents, /context-first/);
  assert.match(agents, /轻量变更分类/);
  assert.match(agents, /必要且足以指导实现的长期结论/);
  assert.match(agents, /Context: 本次无长期事实变化/);
  assert.match(agents, /Context drift check/);
  assert.match(agents, /模块设计上下文/);
  assert.match(agents, /fallback \/ degraded path/);
  assert.match(agents, /不检查 context\/code 修改顺序/);
  assert.match(agents, /Harness (?:maintains context quality|只维护上下文质量)/i);
  assert.match(agents, /Verification \/ Deployment Role Context/);
  assert.match(agents, /raw payload/);
  assert.match(agents, /Impeccable/);
  assert.match(agents, /npx impeccable detect <target>/);
  assert.match(agents, /全量上下文导出/);
  assert.match(agents, /export-context --all/);
  assert.match(agents, /export-context --full/);
  assert.match(agents, /export-context --code/);
  assert.match(agents, /tmp\/ty-context\/context-exports/);
  assert.match(agents, /product plan/);
  assert.match(agents, /UX designer/);
  assert.match(agents, /software engineer/);
  assert.match(agents, /Product Surface work/);
  assert.match(agents, /context_surface_contract/);
  assert.match(agents, /contract` role/);
  assert.match(agents, /full project context export/);
  assert.match(agents, /upgrade Tiny Context/);
  assert.match(agents, /context_harness_upgrade/);
  assert.match(agents, /goal-mode prompt/);
  assert.match(agents, /plan_acceptance_checklist_compiler/);
  assert.match(agents, /tmp\/ty-context\/plan-acceptance/);
  assert.match(agents, /独立项目本地 Skill/);
  assert.match(agents, /uiux_design\/SKILL\.md/);
  assert.doesNotMatch(agents, /override_skills/);
  assert.doesNotMatch(agents, /multi_agent_v1/);

  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.agent\/ty-context-managed\/make\/ty-context\.mk/);
  const workflow = await readFile(path.join(root, ".github/workflows/harness.yml"), "utf8");
  assert.match(workflow, /Run harness gate/);
  assert.match(workflow, /validate-context/);
  assert.match(workflow, /validate-code-modularity/);
  assert.match(workflow, /validate-harness/);
  assert.match(workflow, /TY_CONTEXT_MODULARITY_BASE/);
  assert.match(workflow, /Prepare source workspace CLI/);
  assert.match(workflow, /hashFiles\('packages\/ty-context\/package\.json'\) != ''/);
  assert.match(workflow, /npm run build --workspace project-tiny-context-harness/);
  assert.doesNotMatch(workflow, /npm test --workspace project-tiny-context-harness/);
  assert.doesNotMatch(workflow, /package check-source/);
  assert.doesNotMatch(workflow, /npm publish/);
  const managedMake = await readFile(path.join(root, ".agent/ty-context-managed/make/ty-context.mk"), "utf8");
  assert.match(managedMake, /validate-context/);
  assert.match(managedMake, /validate-code-modularity/);
  assert.match(managedMake, /TY_CONTEXT_MODULARITY_BASE/);
  assert.match(managedMake, /npx --yes --package project-tiny-context-harness@latest ty-context/);
  assert.match(managedMake, /^ty-context-doctor:/m);
  assert.match(managedMake, /^ty-context-sync:/m);
  assert.match(managedMake, /^ty-context-upgrade:/m);
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/global.md"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/context.toml"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/architecture.md"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/area.md"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/product-surface-contract.md"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/verification.md"));
  await stat(path.join(root, ".agent/ty-context-managed/context_templates/deployment.md"));
  const managedGlobalTemplate = await readFile(path.join(root, ".agent/ty-context-managed/context_templates/global.md"), "utf8");
  assert.match(managedGlobalTemplate, /default verification context/);
  assert.match(managedGlobalTemplate, /verification` role Context/);
  assert.match(managedGlobalTemplate, /role placement scan/);
  const managedAreaTemplate = await readFile(path.join(root, ".agent/ty-context-managed/context_templates/area.md"), "utf8");
  assert.match(managedAreaTemplate, /Related Role Context/);
  assert.match(managedAreaTemplate, /deployment` role Context/);
  assert.match(managedAreaTemplate, /Module Design Capsule/);
  const managedVerificationTemplate = await readFile(
    path.join(root, ".agent/ty-context-managed/context_templates/verification.md"),
    "utf8"
  );
  assert.match(managedVerificationTemplate, /Verification paths are reusable execution instances/);
  await assert.rejects(stat(path.join(root, ".agent/ty-context-managed/context_templates/module.md")));
  await assert.rejects(stat(path.join(root, ".agent/ty-context-managed/override_skills")));

  await writeFile(
    path.join(root, "project_context/global.md"),
    `${globalContext}\n## User Notes\n\n- Keep this user-authored note.\n`,
    "utf8"
  );
  const syncReport = await runSync(root);
  assert.equal(syncReport.blocked.length, 0);
  const syncedGlobal = await readFile(path.join(root, "project_context/global.md"), "utf8");
  assert.match(syncedGlobal, /Keep this user-authored note/);
  await assert.rejects(stat(path.join(root, ".agent/skills/ty-context_manager/SKILL.md")));

  const productSkill = await readFile(path.join(root, ".agent/skills/context_product_plan/SKILL.md"), "utf8");
  assert.match(productSkill, /产品方案/);
  assert.match(productSkill, /front matter `description` trigger keywords aligned/);
  assert.match(productSkill, /project_context\/\*\*/);
  assert.match(productSkill, /实现漂移/);
  assert.match(productSkill, /代码不能静默重定义 Context/);
  assert.match(productSkill, /不要把 Context 机械补成代码改动摘要/);
  assert.match(productSkill, /Context Delta/);
  assert.match(productSkill, /Task Contract/);
  assert.match(productSkill, /Contract Conformance/);
  assert.match(productSkill, /plan\.md/);
  assert.match(productSkill, /临时执行缓存/);
  assert.match(productSkill, /Verification \/ Deployment Role Context/);
  assert.match(productSkill, /raw payload/);
  assert.match(productSkill, /产品边界复核信号/);
  assert.match(productSkill, /手工清单长期维护各消费面的重复映射/);
  const uiuxSkill = await readFile(path.join(root, ".agent/skills/context_uiux_design/SKILL.md"), "utf8");
  assert.match(uiuxSkill, /设计稿/);
  assert.match(uiuxSkill, /UI\/UX/);
  assert.match(uiuxSkill, /front matter `description` trigger keywords aligned/);
  assert.match(uiuxSkill, /实现漂移/);
  assert.match(uiuxSkill, /代码不能静默重定义 Context/);
  assert.match(uiuxSkill, /不要把 Context 机械补成代码改动摘要/);
  assert.match(uiuxSkill, /Context Delta/);
  assert.match(uiuxSkill, /Task Contract/);
  assert.match(uiuxSkill, /Contract Conformance/);
  assert.match(uiuxSkill, /plan\.md/);
  assert.match(uiuxSkill, /临时执行缓存/);
  assert.match(uiuxSkill, /Impeccable review/);
  assert.match(uiuxSkill, /npx impeccable detect <target>/);
  assert.match(uiuxSkill, /Verification \/ Deployment Role Context/);
  assert.match(uiuxSkill, /完整截图报告/);
  const developmentSkill = await readFile(path.join(root, ".agent/skills/context_development_engineer/SKILL.md"), "utf8");
  assert.match(developmentSkill, /开发工程师/);
  assert.match(developmentSkill, /front matter `description` trigger keywords aligned/);
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
  assert.match(developmentSkill, /Contract Conformance/);
  assert.match(developmentSkill, /plan\.md/);
  assert.match(developmentSkill, /临时执行缓存/);
  assert.match(developmentSkill, /Verification \/ Deployment Role Context/);
  assert.match(developmentSkill, /重复执行路径/);
  assert.match(developmentSkill, /模块边界复核信号/);
  assert.match(developmentSkill, /手工 manifest 长期复制实现暴露面/);
  assert.doesNotMatch(developmentSkill, /multi_agent_v1/);
  const surfaceSkill = await readFile(path.join(root, ".agent/skills/context_surface_contract/SKILL.md"), "utf8");
  assert.match(surfaceSkill, /Product Surface Contract/);
  assert.match(surfaceSkill, /Audit Mode/);
  assert.match(surfaceSkill, /Compile Mode/);
  assert.match(surfaceSkill, /Apply Mode/);
  assert.match(surfaceSkill, /Conformance Mode/);
  assert.match(surfaceSkill, /Allowed writes/);
  assert.match(surfaceSkill, /Forbidden writes/);
  assert.match(surfaceSkill, /Do not add a new `context_role`/);
  const surfaceTemplate = await readFile(
    path.join(root, ".agent/ty-context-managed/context_templates/product-surface-contract.md"),
    "utf8"
  );
  assert.match(surfaceTemplate, /Primary User Question/);
  assert.match(surfaceTemplate, /Main Surface Allows/);
  assert.match(surfaceTemplate, /Main Surface Forbids/);
  assert.match(surfaceTemplate, /Drilldown Ownership/);
  assert.match(surfaceTemplate, /Long Task State Requirement/);
  assert.match(surfaceTemplate, /read_policy = "on-demand"/);
  const exportSkill = await readFile(path.join(root, ".agent/skills/context_full_project_export/SKILL.md"), "utf8");
  assert.match(exportSkill, /导出尽可能详细的项目全量上下文/);
  assert.match(exportSkill, /full project context export/);
  assert.match(exportSkill, /code-level implementation export/);
  assert.match(exportSkill, /export-context --all/);
  assert.match(exportSkill, /export-context --full/);
  assert.match(exportSkill, /export-context --code/);
  assert.match(exportSkill, /当前项目代码实现/);
  assert.match(exportSkill, /full-project-context-<timestamp>\.md/);
  assert.match(exportSkill, /code-level-implementation-<timestamp>\/code-level-implementation\.md/);
  assert.match(exportSkill, /tmp\/ty-context\/context-exports/);
  assert.match(exportSkill, /Do not modify `project_context\/context\.toml`/);
  const upgradeSkill = await readFile(path.join(root, ".agent/skills/context_harness_upgrade/SKILL.md"), "utf8");
  assert.match(upgradeSkill, /用 Tiny Context upgrade skill 升级这个项目/);
  assert.match(upgradeSkill, /升级 tiny context/);
  assert.match(upgradeSkill, /upgrade Tiny Context/);
  assert.match(upgradeSkill, /use the Tiny Context upgrade skill to upgrade this project/);
  assert.match(upgradeSkill, /ty-context upgrade --check/);
  assert.match(upgradeSkill, /Do not run standalone `sync` before `upgrade`/);
  assert.match(upgradeSkill, /manual_required/);
  assert.match(upgradeSkill, /blocked/);
  assert.match(upgradeSkill, /role placement scan/);
  assert.match(upgradeSkill, /project_context\/context\.toml/);
  assert.match(upgradeSkill, /make validate-context/);
  assert.match(upgradeSkill, /Context: no durable project facts changed/);
  const planAcceptanceSkill = await readFile(
    path.join(root, ".agent/skills/plan_acceptance_checklist_compiler/SKILL.md"),
    "utf8"
  );
  assert.match(planAcceptanceSkill, /acceptance checklist for this plan/);
  assert.match(planAcceptanceSkill, /goal-mode prompt/);
  assert.match(planAcceptanceSkill, /target-mode prompt/);
  assert.match(planAcceptanceSkill, /为这份方案生成验收清单/);
  assert.match(planAcceptanceSkill, /tmp\/ty-context\/plan-acceptance/);
  assert.match(planAcceptanceSkill, /<plan-slug>-local-audit\.md/);
  assert.match(planAcceptanceSkill, /Minimal User Blocker Protocol/);
  assert.match(planAcceptanceSkill, /Evidence Layer Separation/);
  assert.match(planAcceptanceSkill, /artifact accepted by validator/);
  assert.match(planAcceptanceSkill, /not a global task manager/);
  assert.match(planAcceptanceSkill, /workflow-contract `plan\.md`/);
  assert.match(planAcceptanceSkill, /Do not execute the plan/);
  assert.match(planAcceptanceSkill, /Do not include concrete business-domain logic/);

  const managedProductSkillPath = path.join(root, ".agent/skills/context_product_plan/SKILL.md");
  const packagedProductSkill = await readFile(
    fileURLToPath(new URL("../../packages/ty-context/assets/skills/context_product_plan/SKILL.md", import.meta.url)),
    "utf8"
  );
  const localSkillPath = path.join(root, ".agent/skills/product_plan/SKILL.md");
  const localSkillContent = [
    "---",
    "name: product_plan",
    "description: Use when Acme asks for product plan decisions; keep these triggers aligned with AGENTS.md.",
    "---",
    "",
    "# Product Plan",
    "",
    "Acme-specific product rule."
  ].join("\n");
  await writeFile(managedProductSkillPath, "This user edit should be overwritten by sync.\n", "utf8");
  await mkdir(path.dirname(localSkillPath), { recursive: true });
  await writeFile(localSkillPath, localSkillContent, "utf8");
  await mkdir(path.join(root, ".agent/ty-context-managed/override_skills"), { recursive: true });
  await writeFile(path.join(root, ".agent/ty-context-managed/override_skills/.gitkeep"), "", "utf8");
  const localSkillSyncReport = await runSync(root);
  assert.equal(localSkillSyncReport.blocked.length, 0);
  assert.equal(await readFile(managedProductSkillPath, "utf8"), packagedProductSkill);
  assert.equal(await readFile(localSkillPath, "utf8"), localSkillContent);

  await mkdir(path.join(root, ".agent/ty-context-managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(root, ".agent/ty-context-managed/override_skills/context_product_plan.md"),
    "项目本地产品方案规则：优先记录本项目的付费版本边界。\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".agent/ty-context-managed/override_skills/ty-context_dev_sprint.md"),
    "Legacy stage override should be ignored by Minimal Context sync.\n",
    "utf8"
  );
  const overrideSyncReport = await runSync(root);
  assert.equal(overrideSyncReport.changed.length, 0);
  assert.equal(overrideSyncReport.skipped.length, 0);
  assert.equal(overrideSyncReport.blocked.length, 1);
  assert.match(overrideSyncReport.blocked[0], /deprecated Skill overrides block sync/);
  assert.match(overrideSyncReport.blocked[0], /\.agent\/ty-context-managed\/override_skills/);
  assert.match(overrideSyncReport.blocked[0], /context_product_plan\.md/);
  assert.match(overrideSyncReport.blocked[0], /ty-context_dev_sprint\.md/);
  const blockedProductSkill = await readFile(path.join(root, ".agent/skills/context_product_plan/SKILL.md"), "utf8");
  assert.doesNotMatch(blockedProductSkill, /## Local Override/);
  assert.doesNotMatch(blockedProductSkill, /项目本地产品方案规则/);

  const doctor = await runDoctor(root);
  assert.deepEqual(doctor.errors, []);
  assert.ok(doctor.info.some((line) => line.includes("harness root: .agent")));
  assert.ok(doctor.info.some((line) => line.includes("doctor complete")));

  await writeFile(
    path.join(configuredRoot, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(configuredRoot, { adopt: true, force: false });
  await stat(path.join(configuredRoot, ".harness/config.yaml"));
  await stat(path.join(configuredRoot, ".harness/skills/context_product_plan/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_development_engineer/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_surface_contract/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_full_project_export/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_harness_upgrade/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/plan_acceptance_checklist_compiler/SKILL.md"));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/ty-context-managed/override_skills")));
  await stat(path.join(configuredRoot, "project_context/global.md"));
  await stat(path.join(configuredRoot, "project_context/context.toml"));
  await stat(path.join(configuredRoot, "project_context/architecture.md"));
  await stat(path.join(configuredRoot, "DESIGN.md"));
  const configuredMakefile = await readFile(path.join(configuredRoot, "Makefile"), "utf8");
  assert.match(configuredMakefile, /-include \.harness\/ty-context-managed\/make\/ty-context\.mk/);

  await runInit(syncBlockRoot, { adopt: true, force: false });
  await mkdir(path.join(syncBlockRoot, "project_context/modules"), { recursive: true });
  await writeFile(path.join(syncBlockRoot, "project_context/modules/legacy.md"), "# Legacy Module\n", "utf8");
  const migrationNeededSync = await runSync(syncBlockRoot);
  assert.equal(migrationNeededSync.blocked.length, 0);
  assert.equal(migrationNeededSync.changed.length, 0);
  assert.ok(migrationNeededSync.skipped.length > 0);
  await stat(path.join(syncBlockRoot, "project_context/modules/legacy.md"));
  await assert.rejects(stat(path.join(syncBlockRoot, "project_context/areas/legacy.md")));

  const cliInit = spawnSync(process.execPath, [cliPath, "init"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliInit.status, 0, `${cliInit.stdout}\n${cliInit.stderr}`);
  await stat(path.join(cliRoot, "project_context/global.md"));
  await stat(path.join(cliRoot, "project_context/context.toml"));
  await stat(path.join(cliRoot, "project_context/architecture.md"));
  await stat(path.join(cliRoot, "DESIGN.md"));
  const cliValidate = spawnSync(process.execPath, [cliPath, "validate-context"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidate.status, 0, `${cliValidate.stdout}\n${cliValidate.stderr}`);
  const cliValidateHarness = spawnSync(process.execPath, [cliPath, "validate-harness"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidateHarness.status, 0, `${cliValidateHarness.stdout}\n${cliValidateHarness.stderr}`);
  assert.match(cliValidateHarness.stdout, /Minimal Context validation passed/);
  assert.match(cliValidateHarness.stdout, /Code modularity validation passed/);
  await mkdir(path.join(cliRoot, ".codex/ty-context-managed/override_skills"), { recursive: true });
  await writeFile(path.join(cliRoot, ".codex/ty-context-managed/override_skills/context_uiux_design.md"), "old local UI rule\n", "utf8");
  const cliSyncWithDeprecatedOverride = spawnSync(process.execPath, [cliPath, "sync"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliSyncWithDeprecatedOverride.status, 1, `${cliSyncWithDeprecatedOverride.stdout}\n${cliSyncWithDeprecatedOverride.stderr}`);
  const cliSyncOutput = `${cliSyncWithDeprecatedOverride.stdout}\n${cliSyncWithDeprecatedOverride.stderr}`;
  assert.match(cliSyncOutput, /sync changed=0 skipped=0 blocked=1/);
  assert.match(cliSyncOutput, /deprecated Skill overrides block sync/);
  assert.match(cliSyncOutput, /\.codex\/ty-context-managed\/override_skills/);
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
  await rm(cliRoot, { recursive: true, force: true });
  await rm(syncBlockRoot, { recursive: true, force: true });
}
