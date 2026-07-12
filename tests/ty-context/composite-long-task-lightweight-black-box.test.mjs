import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const candidateCli = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");
const durations = new Map();

test("happy_path_real_implementation", async (t) => {
  await measured(t, "happy_path_real_implementation", async () => {
    const { root, workdir } = await fixture("happy");
    await installRealProjectHook(root);
    assert.equal((await cli(root, "compile", workdir)).code, 0);
    const final = await cli(root, "final-gate", workdir);
    assert.equal(final.code, 0, final.stderr);
    assert.equal(lastJson(final.stdout).workflow_status, "accepted");
    assert.equal(await readFile(path.join(root, "src", "value.txt"), "utf8"), "good\n");
    assert.deepEqual(lastJson((await hook(root, "Stop", "done")).stdout), {});
  });
});

test("missing_obligation", async (t) => {
  await measured(t, "missing_obligation", async () => {
    const { root, workdir } = await fixture("missing-obligation");
    await rm(path.join(root, "src", "value.txt"));
    assert.equal((await cli(root, "compile", workdir)).code, 0);
    const final = await cli(root, "final-gate", workdir);
    assert.notEqual(final.code, 0);
    assert.ok(final.stdout.trim(), final.stderr);
    const result = lastJson(final.stdout);
    assert.equal(result.workflow_status, "needs_work");
    assert.equal(result.obligation_results["PI-001-OB-001"].status, "failed");
    result.workflow_status = "accepted";
    await writeFile(path.join(workdir, "final-result.json"), JSON.stringify(result), "utf8");
    assert.equal(lastJson((await hook(root, "Stop", "done")).stdout).decision, "block");

    const unsupported = await fixture("unsupported-environment", (data) => {
      data.checklist.environment_probes.push({
        id: "ENV-PROBE-001",
        kind: "network_endpoint",
        adapter: "tcp_endpoint",
        target: "127.0.0.1:1",
        timeout_ms: 1000,
        expected: { exit_codes: [0], error_codes: [] },
        artifact_globs: [],
        environment_refs: [],
      });
      data.checklist.verification_specs[0].environment_requirements.push({
        id: "ER-001",
        reason_code: "external_service_persistently_unavailable",
        probe_spec_id: "ENV-PROBE-001",
        local_alternative_probe_ids: [],
        minimal_user_action: "Start the unavailable service",
      });
    });
    const unsupportedCompile = await cli(unsupported.root, "compile", unsupported.workdir);
    assert.notEqual(unsupportedCompile.code, 0);
    assert.match(unsupportedCompile.stderr, /prestable_unsupported_environment/);

    const unmanaged = await fixture("unmanaged-hook");
    await writeFile(path.join(unmanaged.root, ".codex", "hooks", "long-task-hook.mjs"), "process.stdout.write('{}\\n');\n", "utf8");
    const unmanagedCompile = await cli(unmanaged.root, "compile", unmanaged.workdir);
    assert.notEqual(unmanagedCompile.code, 0);
    assert.match(unmanagedCompile.stderr, /completion_gate_unavailable/);
  });
});

test("source_changed_after_compile", async (t) => {
  await measured(t, "source_changed_after_compile", async () => {
    const { root, workdir } = await fixture("source-drift");
    assert.equal((await cli(root, "compile", workdir)).code, 0);
    const product = path.join(workdir, "product-architecture-source.yaml");
    await writeFile(product, (await readFile(product, "utf8")) + "\n# changed after compile\n", "utf8");
    const final = await cli(root, "final-gate", workdir);
    assert.notEqual(final.code, 0);
    assert.match(final.stdout + "\n" + final.stderr, /source_changed_after_compile/);
  });
});

test("oracle_or_verifier_changed_after_compile", async (t) => {
  await measured(t, "oracle_or_verifier_changed_after_compile", async () => {
    const { root, workdir } = await fixture("oracle-drift");
    assert.equal((await cli(root, "compile", workdir)).code, 0);
    await writeFile(path.join(root, "tests", "acceptance", "oracle.mjs"), "console.log('{}')\n", "utf8");
    const final = await cli(root, "final-gate", workdir);
    assert.notEqual(final.code, 0);
    assert.match(final.stdout + "\n" + final.stderr, /oracle_changed_after_compile/);

    const verifier = await fixture("verifier-drift");
    assert.equal((await cli(verifier.root, "compile", verifier.workdir)).code, 0);
    const configFile = path.join(verifier.root, ".codex", "hooks.json");
    const config = JSON.parse(await readFile(configFile, "utf8"));
    delete config.hooks.Stop;
    await writeFile(configFile, JSON.stringify(config), "utf8");
    const verifierFinal = await cli(verifier.root, "final-gate", verifier.workdir);
    assert.notEqual(verifierFinal.code, 0);
    assert.match(verifierFinal.stderr, /verifier_changed_after_compile/);
  });
});

test("stale_or_missing_final_result", async (t) => {
  await measured(t, "stale_or_missing_final_result", async () => {
    const { root, workdir } = await fixture("stale-final");
    await installRealProjectHook(root);
    assert.deepEqual(lastJson((await hook(root, "Stop", "")).stdout), {});
    assert.equal((await cli(root, "compile", workdir)).code, 0);

    const missing = await hook(root, "Stop", "done");
    assert.equal(lastJson(missing.stdout).decision, "block");

    const final = await cli(root, "final-gate", workdir);
    assert.equal(final.code, 0, final.stderr);
    await writeFile(path.join(root, "src", "post-final-drift.txt"), "changed\n", "utf8");
    const stale = await hook(root, "Stop", "done");
    const decision = lastJson(stale.stdout);
    assert.equal(decision.decision, "block");
    assert.match(decision.reason, /Workspace changed after final verification|stale/i);

    const replay = await fixture("replayed-final");
    assert.equal((await cli(replay.root, "compile", replay.workdir)).code, 0);
    assert.equal((await cli(replay.root, "final-gate", replay.workdir)).code, 0);
    assert.deepEqual(lastJson((await hook(replay.root, "Stop", "done")).stdout), {});
    assert.equal((await cli(replay.root, "compile", replay.workdir)).code, 0);
    assert.equal(lastJson((await hook(replay.root, "Stop", "done")).stdout).decision, "block");
  });
});

test("drift_repair_end_to_end", async (t) => {
  await measured(t, "drift_repair_end_to_end", async () => {
    const { root, workdir } = await fixture("repair");
    assert.equal((await cli(root, "compile", workdir)).code, 0);

    await writeFile(path.join(root, "src", "value.txt"), "drifted\n", "utf8");
    const verifyDrift = await cli(root, "verify", workdir);
    assert.notEqual(verifyDrift.code, 0);
    assert.equal(lastJson(verifyDrift.stdout).workflow_status, "needs_work");
    const finalDrift = await cli(root, "final-gate", workdir);
    assert.notEqual(finalDrift.code, 0);
    assert.equal(lastJson(finalDrift.stdout).workflow_status, "needs_work");

    await writeFile(path.join(root, "src", "value.txt"), "good\n", "utf8");
    const verifyRepair = await cli(root, "verify", workdir);
    assert.equal(verifyRepair.code, 0, verifyRepair.stderr);
    const finalRepair = await cli(root, "final-gate", workdir);
    assert.equal(finalRepair.code, 0, finalRepair.stderr);
    assert.equal(lastJson(finalRepair.stdout).workflow_status, "accepted");
  });
});

test("lightweight black-box budget summary", (t) => {
  const rows = Object.fromEntries(durations);
  const totalMs = Object.values(rows).reduce((total, value) => total + value, 0);
  t.diagnostic(JSON.stringify({ lightweight_black_box_duration_ms: rows, total_ms: totalMs }));
  assert.equal(durations.size, 6);
  for (const [name, duration] of durations) {
    assert.ok(duration < 120_000, name + " exceeded the two-minute per-test budget: " + duration + "ms");
  }
  assert.ok(totalMs < 300_000, "focused Composite tests exceeded five minutes: " + totalMs + "ms");
});

async function fixture(label, mutate = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-lightweight-" + label + "-"));
  return { root, workdir: await writeHappyV3Contract(root, mutate) };
}

async function installRealProjectHook(root) {
  await copyFile(
    path.join(repoRoot, ".codex", "hooks", "long-task-hook.mjs"),
    path.join(root, ".codex", "hooks", "long-task-hook.mjs"),
  );
  await copyFile(path.join(repoRoot, ".codex", "hooks.json"), path.join(root, ".codex", "hooks.json"));
}

function cli(root, subcommand, workdir) {
  return processResult(process.execPath, [
    candidateCli,
    "composite-long-task",
    subcommand,
    workdir,
  ], { cwd: root });
}

function hook(root, event, message) {
  return processResult(
    process.execPath,
    [path.join(root, ".codex", "hooks", "long-task-hook.mjs")],
    {
      cwd: root,
      input: JSON.stringify({
        cwd: root,
        hook_event_name: event,
        last_assistant_message: message,
      }),
    },
  );
}

function processResult(command, args, { cwd, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("process exceeded 120000ms: " + args.join(" ")));
    }, 120_000);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
    child.stdin.end(input ?? "");
  });
}

function lastJson(stdout) {
  const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  assert.ok(line, "expected JSON output, got: " + stdout);
  return JSON.parse(line);
}

async function measured(t, name, action) {
  const started = performance.now();
  await action();
  const duration = Math.round(performance.now() - started);
  durations.set(name, duration);
  t.diagnostic(name + " duration_ms=" + duration);
}
