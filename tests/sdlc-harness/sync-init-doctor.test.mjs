import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/sdlc-harness/dist/commands/init.js";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-configured-"));
const cliRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-cli-"));
const cliPath = fileURLToPath(new URL("../../packages/sdlc-harness/dist/cli.js", import.meta.url));

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
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /\.agent\/skills/);
  assert.match(config, /\.agent\/pjsdlc_managed\/context_templates/);
  assert.match(config, /DESIGN\.md/);
  assert.doesNotMatch(config, /\.agent\/pjsdlc_managed\/templates/);
  assert.doesNotMatch(config, /\.agent\/pjsdlc_managed\/policies/);

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
  assert.match(areaContext, /## Code Entry Points/);
  assert.match(areaContext, /## Related Role Context/);
  assert.match(areaContext, /verification` role Context/);
  assert.match(areaContext, /deployment` role Context/);

  const verificationContext = await readFile(path.join(root, "project_context/areas/main/verification.md"), "utf8");
  assert.match(verificationContext, /# Verification Context: main/);
  assert.match(verificationContext, /critical repeat-execution paths/);
  assert.match(verificationContext, /## Verification Paths/);
  assert.match(verificationContext, /## Forbidden Content/);

  await assert.rejects(stat(path.join(root, ".agent/state/lifecycle.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/state/plan.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/skills/pjsdlc_manager/SKILL.md")));
  await stat(path.join(root, ".agent/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_development_engineer/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_full_project_export/SKILL.md"));
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
  assert.match(agents, /tmp\/sdlc\/context-exports/);
  assert.match(agents, /独立项目本地 Skill/);
  assert.match(agents, /uiux_design\/SKILL\.md/);
  assert.doesNotMatch(agents, /override_skills/);
  assert.doesNotMatch(agents, /multi_agent_v1/);

  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.agent\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  const workflow = await readFile(path.join(root, ".github/workflows/harness.yml"), "utf8");
  assert.match(workflow, /Run harness gate/);
  assert.match(workflow, /validate-context/);
  assert.doesNotMatch(workflow, /npm test --workspace project-tiny-context-harness/);
  assert.doesNotMatch(workflow, /package check-source/);
  assert.doesNotMatch(workflow, /npm install/);
  const managedMake = await readFile(path.join(root, ".agent/pjsdlc_managed/make/sdlc-harness.mk"), "utf8");
  assert.match(managedMake, /validate-context/);
  assert.match(managedMake, /npx --yes --package project-tiny-context-harness@latest sdlc-harness/);
  assert.match(managedMake, /^sdlc-doctor:/m);
  assert.match(managedMake, /^sdlc-sync:/m);
  assert.match(managedMake, /^sdlc-upgrade:/m);
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/global.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/context.toml"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/architecture.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/area.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/verification.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/deployment.md"));
  const managedGlobalTemplate = await readFile(path.join(root, ".agent/pjsdlc_managed/context_templates/global.md"), "utf8");
  assert.match(managedGlobalTemplate, /default verification context/);
  assert.match(managedGlobalTemplate, /verification` role Context/);
  assert.match(managedGlobalTemplate, /role placement scan/);
  const managedAreaTemplate = await readFile(path.join(root, ".agent/pjsdlc_managed/context_templates/area.md"), "utf8");
  assert.match(managedAreaTemplate, /Related Role Context/);
  assert.match(managedAreaTemplate, /deployment` role Context/);
  await assert.rejects(stat(path.join(root, ".agent/pjsdlc_managed/context_templates/module.md")));
  await assert.rejects(stat(path.join(root, ".agent/pjsdlc_managed/override_skills")));

  await writeFile(
    path.join(root, "project_context/global.md"),
    `${globalContext}\n## User Notes\n\n- Keep this user-authored note.\n`,
    "utf8"
  );
  const syncReport = await runSync(root);
  assert.equal(syncReport.blocked.length, 0);
  const syncedGlobal = await readFile(path.join(root, "project_context/global.md"), "utf8");
  assert.match(syncedGlobal, /Keep this user-authored note/);
  await assert.rejects(stat(path.join(root, ".agent/skills/pjsdlc_manager/SKILL.md")));

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
  assert.match(developmentSkill, /Contract Conformance/);
  assert.match(developmentSkill, /plan\.md/);
  assert.match(developmentSkill, /临时执行缓存/);
  assert.match(developmentSkill, /Verification \/ Deployment Role Context/);
  assert.match(developmentSkill, /重复执行路径/);
  assert.doesNotMatch(developmentSkill, /multi_agent_v1/);
  const exportSkill = await readFile(path.join(root, ".agent/skills/context_full_project_export/SKILL.md"), "utf8");
  assert.match(exportSkill, /导出尽可能详细的项目全量上下文/);
  assert.match(exportSkill, /export-context --all/);
  assert.match(exportSkill, /export-context --full/);
  assert.match(exportSkill, /export-context --code/);
  assert.match(exportSkill, /当前项目代码实现/);
  assert.match(exportSkill, /tmp\/sdlc\/context-exports/);
  assert.match(exportSkill, /禁止修改 `project_context\/context\.toml`/);

  const managedProductSkillPath = path.join(root, ".agent/skills/context_product_plan/SKILL.md");
  const packagedProductSkill = await readFile(
    fileURLToPath(new URL("../../packages/sdlc-harness/assets/skills/context_product_plan/SKILL.md", import.meta.url)),
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
  await mkdir(path.join(root, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(path.join(root, ".agent/pjsdlc_managed/override_skills/.gitkeep"), "", "utf8");
  const localSkillSyncReport = await runSync(root);
  assert.equal(localSkillSyncReport.blocked.length, 0);
  assert.equal(await readFile(managedProductSkillPath, "utf8"), packagedProductSkill);
  assert.equal(await readFile(localSkillPath, "utf8"), localSkillContent);

  await mkdir(path.join(root, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(root, ".agent/pjsdlc_managed/override_skills/context_product_plan.md"),
    "项目本地产品方案规则：优先记录本项目的付费版本边界。\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".agent/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md"),
    "Legacy stage override should be ignored by Minimal Context sync.\n",
    "utf8"
  );
  const overrideSyncReport = await runSync(root);
  assert.equal(overrideSyncReport.changed.length, 0);
  assert.equal(overrideSyncReport.skipped.length, 0);
  assert.equal(overrideSyncReport.blocked.length, 1);
  assert.match(overrideSyncReport.blocked[0], /\.agent\/pjsdlc_managed\/override_skills/);
  assert.match(overrideSyncReport.blocked[0], /Skill overrides are no longer supported/);
  assert.match(overrideSyncReport.blocked[0], /\.agent\/skills\/product_plan\/SKILL\.md/);
  assert.match(overrideSyncReport.blocked[0], /\.agent\/skills\/uiux_design\/SKILL\.md/);
  assert.match(overrideSyncReport.blocked[0], /\.agent\/skills\/development_engineer\/SKILL\.md/);
  assert.match(overrideSyncReport.blocked[0], /context_product_plan\.md/);
  assert.match(overrideSyncReport.blocked[0], /pjsdlc_dev_sprint\.md/);
  const blockedProductSkill = await readFile(path.join(root, ".agent/skills/context_product_plan/SKILL.md"), "utf8");
  assert.doesNotMatch(blockedProductSkill, /## Local Override/);
  assert.doesNotMatch(blockedProductSkill, /项目本地产品方案规则/);

  const doctor = await runDoctor(root);
  assert.deepEqual(doctor.errors, []);
  assert.ok(doctor.info.some((line) => line.includes("harness root: .agent")));
  assert.ok(doctor.info.some((line) => line.includes("doctor complete")));

  await writeFile(
    path.join(configuredRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(configuredRoot, { adopt: true, force: false });
  await stat(path.join(configuredRoot, ".harness/config.yaml"));
  await stat(path.join(configuredRoot, ".harness/skills/context_product_plan/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_development_engineer/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/skills/context_full_project_export/SKILL.md"));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/pjsdlc_managed/override_skills")));
  await stat(path.join(configuredRoot, "project_context/global.md"));
  await stat(path.join(configuredRoot, "project_context/context.toml"));
  await stat(path.join(configuredRoot, "project_context/architecture.md"));
  await stat(path.join(configuredRoot, "DESIGN.md"));
  const configuredMakefile = await readFile(path.join(configuredRoot, "Makefile"), "utf8");
  assert.match(configuredMakefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);

  const cliInit = spawnSync(process.execPath, [cliPath, "init"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliInit.status, 0, `${cliInit.stdout}\n${cliInit.stderr}`);
  await stat(path.join(cliRoot, "project_context/global.md"));
  await stat(path.join(cliRoot, "project_context/context.toml"));
  await stat(path.join(cliRoot, "project_context/architecture.md"));
  await stat(path.join(cliRoot, "DESIGN.md"));
  const cliValidate = spawnSync(process.execPath, [cliPath, "validate-context"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidate.status, 0, `${cliValidate.stdout}\n${cliValidate.stderr}`);
  const cliValidateHarnessAlias = spawnSync(process.execPath, [cliPath, "validate-harness"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidateHarnessAlias.status, 0, `${cliValidateHarnessAlias.stdout}\n${cliValidateHarnessAlias.stderr}`);
  assert.match(cliValidateHarnessAlias.stdout, /Minimal Context validation passed/);
  await mkdir(path.join(cliRoot, ".codex/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(path.join(cliRoot, ".codex/pjsdlc_managed/override_skills/context_uiux_design.md"), "old local UI rule\n", "utf8");
  const cliSyncWithDeprecatedOverride = spawnSync(process.execPath, [cliPath, "sync"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliSyncWithDeprecatedOverride.status, 1, `${cliSyncWithDeprecatedOverride.stdout}\n${cliSyncWithDeprecatedOverride.stderr}`);
  const cliSyncOutput = `${cliSyncWithDeprecatedOverride.stdout}\n${cliSyncWithDeprecatedOverride.stderr}`;
  assert.match(cliSyncOutput, /sync changed=0 skipped=0 blocked=1/);
  assert.match(cliSyncOutput, /\.codex\/pjsdlc_managed\/override_skills/);
  assert.match(cliSyncOutput, /Skill overrides are no longer supported/);
  assert.match(cliSyncOutput, /\.codex\/skills\/product_plan\/SKILL\.md/);
  assert.match(cliSyncOutput, /\.codex\/skills\/uiux_design\/SKILL\.md/);
  assert.match(cliSyncOutput, /\.codex\/skills\/development_engineer\/SKILL\.md/);
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
  await rm(cliRoot, { recursive: true, force: true });
}
