import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/ty-context/dist/commands/init.js";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { captureContextGraphSnapshot } from "../../packages/ty-context/dist/lib/context-graph-snapshot.js";
import { enableHarnessProfile } from "../../packages/ty-context/dist/lib/profiles.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";

const cliPath = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("agent harness folder aliases remain portable", () => {
  assert.equal(resolveAgentHarnessFolderName(""), ".codex");
  assert.equal(resolveAgentHarnessFolderName("2"), ".claude");
  assert.equal(resolveAgentHarnessFolderName("cursor"), ".cursor");
  assert.equal(resolveAgentHarnessFolderName("other"), ".agent");
  assert.equal(
    resolveAgentHarnessFolderName("other", ".workflow"),
    ".workflow",
  );
});

test("default init installs portable core and workflow without Composite state or hooks", async () => {
  await withTemp("ty-context-default-", async (root) => {
    const report = await runInit(root, { adopt: false, force: false });
    assert.ok(
      report.some((line) => line.includes("created .agent/config.yaml")),
    );

    for (const file of [
      "project_context/context.toml",
      "project_context/global.md",
      "project_context/architecture.md",
      "project_context/areas/main.md",
      "project_context/areas/main/verification.md",
      "DESIGN.md",
      "AGENTS.md",
      "Makefile",
      ".agent/skills/context_product_plan/SKILL.md",
      ".agent/skills/context_uiux_design/SKILL.md",
      ".agent/skills/context_development_engineer/SKILL.md",
      ".agent/skills/context_surface_contract/SKILL.md",
      ".agent/skills/context_full_project_export/SKILL.md",
      ".agent/skills/context_harness_upgrade/SKILL.md",
      ".agent/skills/normal-long-task/SKILL.md",
    ]) {
      await stat(path.join(root, file));
    }

    for (const absent of [
      "plan.md",
      ".agent/state/plan.yaml",
      ".agent/state/lifecycle.yaml",
      ".agent/skills/prepare-composite-long-task/SKILL.md",
      ".agent/skills/composite-long-task-workflow/SKILL.md",
      ".agent/composite-long-task/campaigns",
      ".codex/hooks.json",
      ".codex/hooks/long-task-hook.mjs",
      ".work_products/INDEX.md",
    ]) {
      assert.equal(await exists(path.join(root, absent)), false, absent);
    }

    const config = await readFile(
      path.join(root, ".agent/config.yaml"),
      "utf8",
    );
    assert.match(config, /schema_version: "4"/);
    assert.match(
      config,
      /profiles:[\s\S]*core-portable[\s\S]*workflow-default/,
    );
    assert.doesNotMatch(config, /composite-codex/);
    assert.match(config, /policy: strict_except_generated/);

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    assert.match(agents, /Minimal Context Harness Protocol/);
    assert.match(agents, /agent\/platform's internal plan/);
    assert.match(agents, /never requires `plan\.md`/);
    assert.match(
      agents,
      /Otherwise remain on the default Workflow Contract, even when work is long/,
    );
    assert.match(agents, /Context Delta: none\|required/);
    assert.match(agents, /Contract Conformance/);
    assert.match(agents, /Context drift check/);
    assert.match(agents, /Context: no durable fact change/);

    const manifest = await readFile(
      path.join(root, "project_context/context.toml"),
      "utf8",
    );
    assert.match(manifest, /\[\[areas\]\][\s\S]*id = "main"/);
    assert.match(manifest, /\[\[context\]\][\s\S]*role = "verification"/);

    const snapshot = await captureContextGraphSnapshot(
      root,
      ["project_context/areas/main/verification.md"],
      "referenced",
    );
    assert.match(snapshot.topology_sha256, /^[a-f0-9]{64}$/);
    assert.ok(
      snapshot.files.includes("project_context/areas/main/verification.md"),
    );

    const workflow = await readFile(
      path.join(root, ".github/workflows/harness.yml"),
      "utf8",
    );
    assert.match(workflow, /validate-context/);
    assert.match(workflow, /validate-code-modularity/);
    assert.match(workflow, /validate-harness/);
    assert.doesNotMatch(
      workflow,
      /npm test --workspace project-tiny-context-harness/,
    );

    const doctor = await runDoctor(root);
    assert.deepEqual(doctor.errors, []);
    assert.ok(
      doctor.info.some((line) => line.includes("harness root: .agent")),
    );
  });
});

test("explicit composite-codex enable installs Composite Skills and Codex hooks", async () => {
  await withTemp("ty-context-composite-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const enabled = await enableHarnessProfile(root, "composite-codex");
    assert.equal(enabled.changed, true);
    assert.ok(enabled.config.profiles.enabled.includes("composite-codex"));

    const sync = await runSync(root);
    assert.deepEqual(sync.blocked, []);
    for (const file of [
      ".agent/skills/prepare-composite-long-task/SKILL.md",
      ".agent/skills/composite-long-task-workflow/SKILL.md",
      ".codex/hooks.json",
      ".codex/hooks/long-task-hook.mjs",
    ]) {
      await stat(path.join(root, file));
    }
    const hooks = await readFile(path.join(root, ".codex/hooks.json"), "utf8");
    assert.match(hooks, /Tiny Context composite completion gate/);

    const second = await runSync(root);
    assert.deepEqual(second.blocked, []);
    assert.ok(second.skipped.length > 0);
  });
});

test("sync preserves durable Context and project-local Skills while refreshing managed Skills", async () => {
  await withTemp("ty-context-sync-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const globalPath = path.join(root, "project_context/global.md");
    await writeFile(
      globalPath,
      `${await readFile(globalPath, "utf8")}\n## User Notes\n\n- Keep this user-authored note.\n`,
      "utf8",
    );

    const managed = path.join(
      root,
      ".agent/skills/context_product_plan/SKILL.md",
    );
    const local = path.join(root, ".agent/skills/product_plan/SKILL.md");
    await writeFile(managed, "managed edit must be replaced\n", "utf8");
    await mkdir(path.dirname(local), { recursive: true });
    await writeFile(local, "# Project-local Product Plan\n", "utf8");

    const report = await runSync(root);
    assert.deepEqual(report.blocked, []);
    assert.match(
      await readFile(globalPath, "utf8"),
      /Keep this user-authored note/,
    );
    assert.match(await readFile(managed, "utf8"), /name: context_product_plan/);
    assert.equal(
      await readFile(local, "utf8"),
      "# Project-local Product Plan\n",
    );
  });
});

test("deprecated override directories fail closed before managed refresh", async () => {
  await withTemp("ty-context-override-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const directory = path.join(
      root,
      ".agent/ty-context-managed/override_skills",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "context_product_plan.md"),
      "legacy override\n",
      "utf8",
    );
    const report = await runSync(root);
    assert.equal(report.blocked.length, 1);
    assert.match(report.blocked[0], /deprecated Skill overrides block sync/);
  });
});

test("configured non-Codex harness root remains portable by default", async () => {
  await withTemp("ty-context-configured-", async (root) => {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
      "utf8",
    );
    await runInit(root, { adopt: true, force: false });
    await stat(path.join(root, ".harness/skills/normal-long-task/SKILL.md"));
    assert.equal(
      await exists(
        path.join(
          root,
          ".harness/skills/composite-long-task-workflow/SKILL.md",
        ),
      ),
      false,
    );
    assert.equal(await exists(path.join(root, ".codex/hooks.json")), false);
    assert.match(
      await readFile(path.join(root, "Makefile"), "utf8"),
      /\.harness\/ty-context-managed\/make\/ty-context\.mk/,
    );
  });
});

test("CLI init validates portable defaults and explicit enable activates Composite", async () => {
  await withTemp("ty-context-cli-", async (root) => {
    const init = spawnSync(process.execPath, [cliPath, "init"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
    assert.equal(await exists(path.join(root, ".codex/hooks.json")), false);

    const compositeBeforeEnable = spawnSync(
      process.execPath,
      [cliPath, "composite-long-task", "compile", "task"],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(compositeBeforeEnable.status, 0);
    assert.match(
      compositeBeforeEnable.stderr,
      /profile composite-codex is not enabled/,
    );

    for (const command of [
      ["doctor"],
      ["validate-context"],
      ["validate-harness"],
    ]) {
      const result = spawnSync(process.execPath, [cliPath, ...command], {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    }

    const enable = spawnSync(
      process.execPath,
      [cliPath, "enable", "composite-codex"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(enable.status, 0, `${enable.stdout}\n${enable.stderr}`);
    assert.match(enable.stdout, /enabled profile composite-codex/);
    await stat(path.join(root, ".codex/hooks.json"));
    await stat(
      path.join(root, ".codex/skills/composite-long-task-workflow/SKILL.md"),
    );

    const compositeAfterEnable = spawnSync(
      process.execPath,
      [cliPath, "composite-long-task", "status", "missing-task"],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(compositeAfterEnable.status, 0);
    assert.doesNotMatch(
      compositeAfterEnable.stderr,
      /profile composite-codex is not enabled/,
    );
  });
});

async function withTemp(prefix, action) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
