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
  assert.ok(initReport.some((line) => line.includes("created project_context/modules/main.md")));
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
  assert.match(globalContext, /## Verification Entry Points/);
  assert.match(globalContext, /## Next Safe Action/);

  const contextManifest = await readFile(path.join(root, "project_context/context.toml"), "utf8");
  assert.match(contextManifest, /\[\[areas\]\]/);
  assert.match(contextManifest, /id = "main"/);
  assert.match(contextManifest, /context = "project_context\/modules\/main\.md"/);

  const designMd = await readFile(path.join(root, "DESIGN.md"), "utf8");
  assert.match(designMd, /name: "Starter Design System"/);
  assert.match(designMd, /primary-action/);
  assert.match(designMd, /User-authored tokens/);
  assert.match(designMd, /# Design System/);
  assert.match(designMd, /## Do's and Don'ts/);

  const architectureContext = await readFile(path.join(root, "project_context/architecture.md"), "utf8");
  assert.match(architectureContext, /# Architecture Context/);
  assert.match(architectureContext, /restrained architecture context/i);
  assert.match(architectureContext, /## System Boundary/);
  assert.match(architectureContext, /## Component Map/);
  assert.match(architectureContext, /## Verification Implications/);

  const moduleContext = await readFile(path.join(root, "project_context/modules/main.md"), "utf8");
  assert.match(moduleContext, /## Responsibility/);
  assert.match(moduleContext, /## Code Entry Points/);
  assert.match(moduleContext, /## Test Entry Points/);

  await assert.rejects(stat(path.join(root, ".agent/state/lifecycle.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/state/plan.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/skills/pjsdlc_manager/SKILL.md")));
  await stat(path.join(root, ".agent/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(root, ".agent/skills/context_development_engineer/SKILL.md"));
  await assert.rejects(stat(path.join(root, ".work_products/INDEX.md")));

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  assert.match(agents, /project_context\/global\.md/);
  assert.match(agents, /project_context\/architecture\.md/);
  assert.match(agents, /Harness (?:maintains context quality|只维护上下文质量)/i);

  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.agent\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  const managedMake = await readFile(path.join(root, ".agent/pjsdlc_managed/make/sdlc-harness.mk"), "utf8");
  assert.match(managedMake, /validate-context/);
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/global.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/context.toml"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/architecture.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/module.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/override_skills"));

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
  assert.match(productSkill, /project_context\/\*\*/);
  const uiuxSkill = await readFile(path.join(root, ".agent/skills/context_uiux_design/SKILL.md"), "utf8");
  assert.match(uiuxSkill, /设计稿/);
  assert.match(uiuxSkill, /UI\/UX/);
  const developmentSkill = await readFile(path.join(root, ".agent/skills/context_development_engineer/SKILL.md"), "utf8");
  assert.match(developmentSkill, /开发工程师/);
  assert.match(developmentSkill, /启动多 agent 能力/);

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
  assert.equal(overrideSyncReport.blocked.length, 0);
  assert.ok(overrideSyncReport.skipped.some((line) => line.includes("legacy stage skill override ignored")));
  const overriddenProductSkill = await readFile(path.join(root, ".agent/skills/context_product_plan/SKILL.md"), "utf8");
  assert.match(overriddenProductSkill, /## Local Override/);
  assert.match(overriddenProductSkill, /项目本地产品方案规则/);
  assert.match(overriddenProductSkill, /\.agent\/pjsdlc_managed\/override_skills\/context_product_plan\.md/);

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
  await stat(path.join(configuredRoot, ".harness/pjsdlc_managed/override_skills"));
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
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
  await rm(cliRoot, { recursive: true, force: true });
}
