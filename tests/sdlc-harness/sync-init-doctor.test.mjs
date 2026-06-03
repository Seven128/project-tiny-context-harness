import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/sdlc-harness/dist/commands/init.js";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runContextMigration } from "../../packages/sdlc-harness/dist/lib/context-migration.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-configured-"));
const migrationRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-minimal-migration-"));
const gitkeepMigrationRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-gitkeep-migration-"));
const existingContextMigrationRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-existing-context-migration-"));
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
  assert.ok(initReport.some((line) => line.includes("created project_context/global.md")));
  assert.ok(initReport.some((line) => line.includes("created project_context/modules/main.md")));

  const config = await readFile(path.join(root, ".agent/config.yaml"), "utf8");
  assert.match(config, /schema_version: "3"/);
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /\.agent\/pjsdlc_managed\/context_templates/);
  assert.doesNotMatch(config, /skills/);
  assert.doesNotMatch(config, /\.agent\/pjsdlc_managed\/templates/);
  assert.doesNotMatch(config, /\.agent\/pjsdlc_managed\/policies/);

  const globalContext = await readFile(path.join(root, "project_context/global.md"), "utf8");
  assert.match(globalContext, /## Project Goal/);
  assert.match(globalContext, /## Verification Entry Points/);
  assert.match(globalContext, /## Next Safe Action/);
  const moduleContext = await readFile(path.join(root, "project_context/modules/main.md"), "utf8");
  assert.match(moduleContext, /## Responsibility/);
  assert.match(moduleContext, /## Code Entry Points/);
  assert.match(moduleContext, /## Test Entry Points/);

  await assert.rejects(stat(path.join(root, ".agent/state/lifecycle.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/state/plan.yaml")));
  await assert.rejects(stat(path.join(root, ".agent/skills/pjsdlc_manager/SKILL.md")));
  await assert.rejects(stat(path.join(root, ".work_products/INDEX.md")));

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  assert.match(agents, /project_context\/global\.md/);
  assert.match(agents, /Harness (?:maintains context quality|只维护上下文质量)/i);

  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.agent\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  const managedMake = await readFile(path.join(root, ".agent/pjsdlc_managed/make/sdlc-harness.mk"), "utf8");
  assert.match(managedMake, /validate-context/);
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/global.md"));
  await stat(path.join(root, ".agent/pjsdlc_managed/context_templates/module.md"));

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
  await stat(path.join(configuredRoot, "project_context/global.md"));
  const configuredMakefile = await readFile(path.join(configuredRoot, "Makefile"), "utf8");
  assert.match(configuredMakefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);

  await writeFile(path.join(migrationRoot, "README.md"), "# Legacy App\n\nBuilds a CLI for support ops.\n", "utf8");
  await mkdir(path.join(migrationRoot, ".work_products/01_product"), { recursive: true });
  await mkdir(path.join(migrationRoot, ".work_products/03_tech_plan"), { recursive: true });
  await mkdir(path.join(migrationRoot, ".work_products/05_decisions"), { recursive: true });
  await mkdir(path.join(migrationRoot, ".work_products/04_implementation"), { recursive: true });
  await mkdir(path.join(migrationRoot, "src/support"), { recursive: true });
  await mkdir(path.join(migrationRoot, "tests"), { recursive: true });
  await writeFile(path.join(migrationRoot, ".work_products/01_product/support.md"), "Goal: support desk.\n", "utf8");
  await writeFile(path.join(migrationRoot, ".work_products/03_tech_plan/support.md"), "API module support.\n", "utf8");
  await writeFile(path.join(migrationRoot, ".work_products/05_decisions/ADR_001.md"), "Use local JSON storage.\n", "utf8");
  await writeFile(path.join(migrationRoot, ".work_products/04_implementation/support.md"), "Entrypoint src/support/index.js.\n", "utf8");
  await writeFile(path.join(migrationRoot, "src/support/index.js"), "export const ok = true;\n", "utf8");
  await writeFile(path.join(migrationRoot, "tests/support.test.js"), "import 'node:test';\n", "utf8");

  const dryRun = await runContextMigration(migrationRoot, { write: false });
  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.changed.length, 0);
  assert.match(dryRun.preview.join("\n"), /project_context\/global\.md/);
  await assert.rejects(stat(path.join(migrationRoot, "project_context/global.md")));

  const writeRun = await runContextMigration(migrationRoot, { write: true });
  assert.equal(writeRun.mode, "write");
  assert.ok(writeRun.changed.some((line) => line.includes("project_context/global.md")));
  const migratedGlobal = await readFile(path.join(migrationRoot, "project_context/global.md"), "utf8");
  assert.match(migratedGlobal, /Legacy Source Trace/);
  assert.match(migratedGlobal, /README\.md/);
  await stat(path.join(migrationRoot, ".work_products/01_product/support.md"));

  const migrationSecondRun = await runContextMigration(migrationRoot, { write: true });
  assert.equal(migrationSecondRun.mode, "write");
  await assert.rejects(stat(path.join(migrationRoot, "project_context/_migration/latest/global.md")));

  await mkdir(path.join(gitkeepMigrationRoot, "src"), { recursive: true });
  await writeFile(path.join(gitkeepMigrationRoot, "src/.gitkeep"), "", "utf8");
  const gitkeepDryRun = await runContextMigration(gitkeepMigrationRoot, { write: false });
  assert.ok(gitkeepDryRun.preview.some((line) => line.includes("project_context/modules/main.md")));
  assert.ok(gitkeepDryRun.warnings.some((line) => line.includes("No obvious source module names")));
  assert.ok(!gitkeepDryRun.preview.some((line) => line.includes("gitkeep.md")));

  await mkdir(path.join(existingContextMigrationRoot, "project_context/modules"), { recursive: true });
  await mkdir(path.join(existingContextMigrationRoot, "src/support"), { recursive: true });
  await writeFile(path.join(existingContextMigrationRoot, "project_context/global.md"), "# User Context\n", "utf8");
  await writeFile(path.join(existingContextMigrationRoot, "src/support/index.js"), "export const ok = true;\n", "utf8");
  const existingContextDryRun = await runContextMigration(existingContextMigrationRoot, { write: false });
  assert.ok(
    existingContextDryRun.preview.some((line) =>
      line.includes("project_context/global.md -> project_context/_migration/latest/global.md")
    )
  );
  assert.ok(
    existingContextDryRun.preview.some((line) =>
      line.includes("project_context/modules/support.md -> project_context/_migration/latest/modules/support.md")
    )
  );

  const cliInit = spawnSync(process.execPath, [cliPath, "init"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliInit.status, 0, `${cliInit.stdout}\n${cliInit.stderr}`);
  await stat(path.join(cliRoot, "project_context/global.md"));
  const cliValidate = spawnSync(process.execPath, [cliPath, "validate-context"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidate.status, 0, `${cliValidate.stdout}\n${cliValidate.stderr}`);
  const cliValidateHarnessAlias = spawnSync(process.execPath, [cliPath, "validate-harness"], { cwd: cliRoot, encoding: "utf8" });
  assert.equal(cliValidateHarnessAlias.status, 0, `${cliValidateHarnessAlias.stdout}\n${cliValidateHarnessAlias.stderr}`);
  assert.match(cliValidateHarnessAlias.stdout, /Minimal Context validation passed/);
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
  await rm(migrationRoot, { recursive: true, force: true });
  await rm(gitkeepMigrationRoot, { recursive: true, force: true });
  await rm(existingContextMigrationRoot, { recursive: true, force: true });
  await rm(cliRoot, { recursive: true, force: true });
}
