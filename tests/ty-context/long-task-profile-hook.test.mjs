import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createUpgradePlan,
  runMigrations,
} from "../../packages/ty-context/dist/lib/migrations.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";
import { assertLongTaskStaticConsistency } from "./long-task-static-consistency.mjs";

const packageHook = fileURLToPath(
  new URL("../../packages/ty-context/dist/long-task-hook.js", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("source workspace version, Hook and manual-only documentation stay consistent", async () => {
  await assertLongTaskStaticConsistency(repoRoot);
});

test("enable/disable owns one package-owned Hook per event and preserves user Hooks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mkdir(path.join(fixture.root, ".codex/hooks"), { recursive: true });
    await writeFile(
      path.join(fixture.root, ".codex/hooks/long-task-hook.mjs"),
      "// retired repo-local hook\n",
    );
    await writeFile(
      path.join(fixture.root, ".codex/hooks.json"),
      `${JSON.stringify(
        {
          hooks: Object.fromEntries(
            ["SessionStart", "PostCompact", "Stop"].map((event) => [
              event,
              [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "node .codex/hooks/long-task-hook.mjs",
                    },
                    {
                      type: "command",
                      commandWindows:
                        "node .codex\\hooks\\long-task-hook.mjs",
                    },
                    { type: "command", command: "node composite-hook.mjs" },
                  ],
                },
                {
                  hooks: [
                    { type: "command", command: "node user-hook.mjs", user: true },
                  ],
                },
              ],
            ]),
          ),
        },
        null,
        2,
      )}\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/long-task-workflow/SKILL.md",
        ),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/hooks/long-task-hook.mjs"),
      ),
      false,
    );
    const config = YAML.parse(
      await readFile(path.join(fixture.root, ".codex/config.yaml"), "utf8"),
    );
    assert.ok(config.profiles.enabled.includes("long-task"));

    const hooksFile = path.join(fixture.root, ".codex/hooks.json");
    const hooks = JSON.parse(await readFile(hooksFile, "utf8"));
    for (const event of ["SessionStart", "PostCompact", "Stop"]) {
      const all = hooks.hooks[event].flatMap((group) => group.hooks);
      const managed = all.filter((hook) =>
        String(hook.command ?? hook.commandWindows).includes(
          "dist\\long-task-hook.js",
        ) ||
        String(hook.command ?? hook.commandWindows).includes(
          "dist/long-task-hook.js",
        ),
      );
      assert.equal(managed.length, 1);
      assert.match(managed[0].command, /dist[\\/]long-task-hook\.js/u);
      assert.equal(managed[0].commandWindows, managed[0].command);
      assert.doesNotMatch(managed[0].command, /\.codex[\\/]hooks/u);
      assert.equal(managed[0].timeout, event === "Stop" ? 3600 : 10);
      assert.equal(all.filter((hook) => hook.user).length, 1);
    }
    await writeFile(hooksFile, `${JSON.stringify(hooks, null, 2)}\n`);
    await mkdir(path.join(fixture.root, ".codex/skills/user-local"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture.root, ".codex/skills/user-local/SKILL.md"),
      "# User local\n",
    );

    await runCli(fixture.root, ["disable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/long-task-workflow"),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/user-local/SKILL.md"),
      ),
      true,
    );
    const retained = JSON.parse(await readFile(hooksFile, "utf8"));
    assert.equal(
      retained.hooks.Stop
        .flatMap((group) => group.hooks)
        .some((hook) => hook.user),
      true,
    );
    assert.equal(
      retained.hooks.Stop.flatMap((group) => group.hooks).some((hook) =>
        String(hook.command).includes("long-task-hook"),
      ),
      false,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package-owned Hook resumes from common-dir and Stop runs the Live Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.deepEqual(await invokeHook(fixture.root, "Stop"), {});

    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const record = await activeRecordPath(fixture.root);
    assert.equal(await pathExists(record), true);
    assert.match(record.replace(/\\/gu, "/"), /\.git\/ty-context\/long-task\/worktrees\//u);
    const session = await invokeHook(fixture.root, "SessionStart");
    assert.match(
      session.hookSpecificOutput.additionalContext,
      /Active Single-Goal Long-Task Workflow V2/,
    );
    assert.match(session.hookSpecificOutput.additionalContext, /long-task resume/);
    const blocked = await invokeHook(fixture.root, "Stop");
    assert.equal(blocked.decision, "block");

    await commitCandidate(fixture.root);
    assert.deepEqual(await invokeHook(fixture.root, "Stop"), {});
    assert.equal(await pathExists(record), false);
    assert.deepEqual(await invokeHook(fixture.root, "Stop"), {});
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("active record cannot redirect or weaken the current package verifier", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const recordFile = await activeRecordPath(fixture.root);
    const active = JSON.parse(await readFile(recordFile, "utf8"));
    active.verifier_identity.package_root = fixture.root;
    active.verifier_identity.bundle_sha256 = "0".repeat(64);
    await writeFile(recordFile, `${JSON.stringify(active)}\n`);
    const tampered = await invokeHook(fixture.root, "Stop");
    assert.equal(tampered.decision, "block");
    assert.match(tampered.reason, /identity|verifier|authority/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("upgrade still preserves historical Campaign files", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const configFile = path.join(fixture.root, ".codex/config.yaml");
    const raw = await readFile(configFile, "utf8");
    await writeFile(configFile, raw.replace(/- long-task/u, "- composite-codex"));
    const historical = path.join(fixture.root, "history/campaign-v6.json");
    await mkdir(path.dirname(historical), { recursive: true });
    await writeFile(historical, '{"user":"history"}\n');
    await runCli(fixture.root, ["upgrade", "--json"]);
    const migrated = YAML.parse(await readFile(configFile, "utf8"));
    assert.ok(migrated.profiles.enabled.includes("long-task"));
    assert.equal(await pathExists(historical), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("V1 retirement migration removes the repo-local Hook and reports active V1 state", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const hook = path.join(fixture.root, ".codex/hooks/long-task-hook.mjs");
    const projection = path.join(
      fixture.root,
      ".codex/ty-context-active-long-task.json",
    );
    await mkdir(path.dirname(hook), { recursive: true });
    await writeFile(hook, "// V1 hook\n");
    await writeFile(projection, '{"schema_version":"active-long-task-v1"}\n');
    const plan = await createUpgradePlan(fixture.root);
    assert.ok(
      plan.safe_pending.some((item) => item.id === "long-task-v1-retirement"),
    );
    assert.ok(
      plan.manual_required.some(
        (item) => item.id === "long-task-v1-retirement",
      ),
    );
    const report = await runMigrations(fixture.root, plan);
    assert.equal(await pathExists(hook), false);
    assert.equal(await pathExists(projection), true);
    assert.ok(
      report.manualRequired.some(
        (item) => item.id === "long-task-v1-retirement",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function invokeHook(cwd, hookEventName) {
  const input = JSON.stringify({
    cwd,
    hook_event_name: hookEventName,
    last_assistant_message: "attempt completion",
  });
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [packageHook], {
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
