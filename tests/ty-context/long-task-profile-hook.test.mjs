import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

test("enable/disable long-task owns only its Skill and Hook surfaces", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/long-task-workflow/SKILL.md")),
      true,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/hooks/long-task-hook.mjs")),
      true,
    );
    const config = YAML.parse(
      await readFile(path.join(fixture.root, ".codex/config.yaml"), "utf8"),
    );
    assert.ok(config.profiles.enabled.includes("long-task"));
    assert.ok(!config.profiles.enabled.includes("composite-codex"));

    const hooksFile = path.join(fixture.root, ".codex/hooks.json");
    const hooks = JSON.parse(await readFile(hooksFile, "utf8"));
    hooks.hooks.Stop.unshift({
      hooks: [{ type: "command", command: "node user-hook.mjs", user: true }],
    });
    await writeFile(hooksFile, `${JSON.stringify(hooks, null, 2)}\n`);
    await mkdir(path.join(fixture.root, ".codex/skills/user-local"), { recursive: true });
    await writeFile(
      path.join(fixture.root, ".codex/skills/user-local/SKILL.md"),
      "# User local\n",
    );

    await runCli(fixture.root, ["disable", "long-task"]);
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/long-task-workflow")),
      false,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/hooks/long-task-hook.mjs")),
      false,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/user-local/SKILL.md")),
      true,
    );
    const retained = JSON.parse(await readFile(hooksFile, "utf8"));
    assert.equal(retained.hooks.Stop[0].hooks[0].user, true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Hook is a no-op without an active task, restores context, and blocks Stop until fresh accepted", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const hook = path.join(fixture.root, ".codex/hooks/long-task-hook.mjs");
    assert.deepEqual(await invokeHook(hook, fixture.root, "Stop"), {});

    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const session = await invokeHook(hook, fixture.root, "SessionStart");
    assert.match(session.hookSpecificOutput.additionalContext, /Active Single-Goal Long-Task Workflow/);
    assert.match(session.hookSpecificOutput.additionalContext, /long-task resume/);
    const blocked = await invokeHook(hook, fixture.root, "Stop");
    assert.equal(blocked.decision, "block");

    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    assert.deepEqual(await invokeHook(hook, fixture.root, "Stop"), {});

    const activeFile = path.join(
      fixture.root,
      ".codex/ty-context-active-long-task.json",
    );
    const active = JSON.parse(await readFile(activeFile, "utf8"));
    active.verifier_identity.bundle_sha256 = "0".repeat(64);
    await writeFile(activeFile, `${JSON.stringify(active)}\n`);
    const tampered = await invokeHook(hook, fixture.root, "Stop");
    assert.equal(tampered.decision, "block");
    assert.match(tampered.reason, /verifier bundle identity changed/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("upgrade migrates composite-codex safely without importing or deleting historical Campaign files", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const configFile = path.join(fixture.root, ".codex/config.yaml");
    const raw = await readFile(configFile, "utf8");
    await writeFile(configFile, raw.replace(/- long-task/u, "- composite-codex"));
    for (const relative of [
      ".codex/skills/prepare-composite-long-task",
      ".codex/skills/composite-long-task-workflow",
      ".codex/ty-context-managed/composite",
    ]) {
      await mkdir(path.join(fixture.root, relative), { recursive: true });
      await writeFile(path.join(fixture.root, relative, "package-owned.txt"), "old\n");
    }
    const historical = path.join(fixture.root, "history/campaign-v6.json");
    await mkdir(path.dirname(historical), { recursive: true });
    await writeFile(historical, '{"user":"history"}\n');

    const check = await runCli(fixture.root, ["upgrade", "--check", "--json"])
      .catch((error) => JSON.parse(error.stdout));
    assert.ok(
      check.safe_pending.some((item) => item.id === "composite-codex-to-long-task"),
    );
    await runCli(fixture.root, ["upgrade", "--json"]);
    const migrated = YAML.parse(await readFile(configFile, "utf8"));
    assert.ok(migrated.profiles.enabled.includes("long-task"));
    assert.ok(!migrated.profiles.enabled.includes("composite-codex"));
    assert.equal(await pathExists(historical), true);
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/prepare-composite-long-task")),
      false,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/composite-long-task-workflow")),
      false,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex/skills/long-task-workflow/SKILL.md")),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function invokeHook(hook, cwd, hookEventName) {
  const input = JSON.stringify({
      cwd,
      hook_event_name: hookEventName,
      last_assistant_message: "attempt completion",
  });
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hook], {
      cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out = [];
    const error = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => error.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString("utf8"));
      else reject(new Error(Buffer.concat(error).toString("utf8")));
    });
    child.stdin.end(input);
  });
  return JSON.parse(stdout.trim());
}
