import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;
const admin = helper && (process.env.TY_CONTEXT_HOST_ADMIN_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"));
const installerUi = helper && (process.env.TY_CONTEXT_HOST_INSTALLER_UI_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui"));
// Regression identities: ordinary_question_hook_noop and active_pointer_deleted_or_retargeted are exercised below.

test("real managed adapter no-ops without authority and blocks an active needs-work task", { skip: !helper, timeout: 180_000 }, async () => {
  const [{ managedHostLayoutUnder }, { renderHostReleaseRequirementsV1, renderManagedRequirementsV1 }, { LongTaskHostRpcClientV1 }, release, { checkLongTaskHostGate }, runtimeIdentity] = await Promise.all([
    import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
    import("../../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-rpc-client.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release.js"),
    import("../../packages/ty-context/dist/lib/long-task-hook-preflight.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-runtime-identity.js")
  ]);
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-runtime-repo-"));
  const workdir = await writeHappyV3Contract(root);
  const system = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-runtime-system-"));
  const layout = managedHostLayoutUnder(system, process.platform);
  await mkdir(layout.managed_dir, { recursive: true });
  await cp(helper, layout.helper_path);
  await cp(admin, layout.admin_path);
  await cp(installerUi, layout.installer_ui_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "long-task-hook.mjs"), layout.hook_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "ty-context-host-worker.mjs"), layout.worker_path);
  const releaseTarget = {
    platform: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux",
    arch: process.arch === "arm64" ? "arm64" : "x64"
  };
  const releaseRequirements = renderHostReleaseRequirementsV1(layout, releaseTarget);
  await writeFile(path.join(layout.managed_dir, "requirements.toml"), releaseRequirements);
  const releaseKeys = generateKeyPairSync("ed25519");
  const rootPublicKey = releaseKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
  await writeFile(layout.release_root_public_key_path, rootPublicKey);
  const releaseManifest = await release.createUnsignedHostReleaseManifestV1(layout.managed_dir, "0.4.0-rc.1");
  const releaseManifestText = release.canonicalHostReleaseManifestV1(releaseManifest);
  await writeFile(layout.release_manifest_path, releaseManifestText);
  await writeFile(layout.release_signature_path, sign(null, Buffer.from(releaseManifestText), releaseKeys.privateKey).toString("base64url"));
  await mkdir(path.dirname(layout.requirements_file), { recursive: true });
  const requirements = renderManagedRequirementsV1(layout);
  await writeFile(layout.requirements_file, requirements);
  const publicKey = path.join(layout.managed_dir, "host-service-public.pem");
  const cliPath = path.join(repo, "packages", "ty-context", "dist", "cli.js");
  const cliWorkerPath = path.join(repo, "packages", "ty-context", "dist", "lib", "long-task-host-worker-runtime.js");
  const cliRuntimeManifest = await runtimeIdentity.createManagedHostRuntimeManifestV1(cliPath);
  const sandboxLauncher = await runtimeIdentity.resolveManagedSandboxLauncherV1(layout.helper_path);
  const config = {
    schema_version: "ty-context-host-service-config-v1",
    state_root: layout.state_root,
    endpoint: layout.endpoint,
    managed_dir: layout.managed_dir,
    requirements_file: layout.requirements_file,
    node_path: process.execPath,
    node_sha256: sha(await readFile(process.execPath)),
    helper_path: layout.helper_path,
    sandbox_launcher_path: sandboxLauncher.path,
    sandbox_launcher_sha256: sandboxLauncher.sha256,
    admin_path: layout.admin_path,
    admin_sha256: sha(await readFile(layout.admin_path)),
    installer_ui_path: layout.installer_ui_path,
    installer_ui_sha256: sha(await readFile(layout.installer_ui_path)),
    codex_launcher_path: process.execPath,
    codex_launcher_sha256: sha(await readFile(process.execPath)),
    cli_path: cliPath,
    cli_sha256: sha(await readFile(cliPath)),
    cli_worker_path: cliWorkerPath,
    cli_worker_sha256: sha(await readFile(cliWorkerPath)),
    cli_runtime_manifest: cliRuntimeManifest,
    cli_runtime_manifest_sha256: runtimeIdentity.managedHostRuntimeManifestSha256V1(cliRuntimeManifest),
    hook_path: layout.hook_path,
    hook_sha256: sha(await readFile(layout.hook_path)),
    worker_path: layout.worker_path,
    worker_sha256: sha(await readFile(layout.worker_path)),
    attestation_public_key_path: publicKey,
    managed_policy_sha256: sha(requirements),
    release_manifest_sha256: sha(releaseManifestText),
    test_namespace: true
  };
  const configFile = path.join(layout.managed_dir, "host-service-config.json");
  await writeFile(configFile, canonical(config));
  const child = spawn(layout.helper_path, ["serve", "--config", configFile], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  try {
    try {
      await waitForFile(publicKey);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; exit=${child.exitCode ?? "running"}; stderr=${stderr.trim()}`);
    }
    assert.equal(child.exitCode, null, `managed Host exited before accepting RPC: ${stderr.trim()}`);
    const client = new LongTaskHostRpcClientV1({ endpoint: layout.endpoint, public_key_path: publicKey, timeout_ms: 120_000 });
    await waitForRpc(client, root);
    const started = performance.now();
    const result = await client.call("handle_hook_event", root, { hook_event_name: "SessionStart", thread_id: "thread-001", turn_id: "turn-001", cwd: root, source: "startup", stop_hook_active: false, last_assistant_message: null });
    assert.deepEqual(result, {});
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 100, `no-active RPC path must not perform verification (${elapsed.toFixed(1)}ms)`);
    const health = await client.call("health", root, { thread_id: "thread-001" });
    assert.equal(health.heartbeat_fresh, true);
    assert.equal(health.registry_available, true);
    const originalHook = await readFile(layout.hook_path);
    await writeFile(layout.hook_path, "process.stdout.write('{}\\n');\n");
    const tamperedSmoke = await client.call("health", root, { thread_id: "thread-001" });
    assert.equal(tamperedSmoke.stop_smoke.synthetic_active_block, false, "health must execute the installed managed adapter instead of returning a constant smoke result");
    await writeFile(layout.hook_path, originalHook);
    const preflight = await checkLongTaskHostGate(root, { layout, pinned_root_public_key: rootPublicKey, client, expected_thread_id: "thread-001", allow_test_namespace: true });
    assert.equal(preflight.status, "available", preflight.findings.join("\n"));
    assert.deepEqual(await runManagedHook(layout.hook_path, { hook_event_name: "SessionStart", session_id: "thread-001", turn_id: "turn-002", cwd: root, source: "startup" }), {});
    assert.deepEqual(await runManagedHook(layout.hook_path, { hook_event_name: "Stop", session_id: "thread-001", turn_id: "turn-003", cwd: root, stop_hook_active: false, last_assistant_message: "ordinary answer" }), {});

    const rpcReservation = await client.call("reserve_authority", root, { workdir });
    assert.equal(rpcReservation.kind, "reservation");

    await writeFile(path.join(root, "src", "value.txt"), "wrong\n");
    const compiled = await client.call("compile_and_seal", root, { workdir, reservation: rpcReservation });
    assert.equal(compiled.schema_version, "ty-context-host-compile-result-v1");
    const active = await client.call("get_active", root, {});
    assert.equal(active.contract_sha256, compiled.contract_sha256);
    const verification = await client.call("verify", root, { workdir, spec_ids: [] });
    assert.equal(verification.schema_version, "ty-context-host-verify-result-v1");
    assert.ok(verification.findings_count > 0);
    const restored = await runManagedHook(layout.hook_path, { hook_event_name: "SessionStart", session_id: "thread-001", turn_id: "turn-004", cwd: root, source: "resume" });
    assert.equal(restored.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(restored.hookSpecificOutput.additionalContext, new RegExp(active.registry_id));
    const stopped = await runManagedHook(layout.hook_path, { hook_event_name: "Stop", session_id: "thread-001", turn_id: "turn-005", cwd: root, stop_hook_active: false, last_assistant_message: "done" });
    assert.equal(stopped.decision, "block");
    assert.doesNotMatch(JSON.stringify(stopped), /continue\s*[:=]\s*false/u);
    const shard = sha(process.platform === "win32" ? root.toLocaleLowerCase("en-US") : root);
    const activeIndex = path.join(layout.state_root, "repositories", shard, "registry", "active", "by-repository", `${active.repository_identity_hash}.json`);
    await rm(activeIndex);
    const corrupted = await runManagedHook(layout.hook_path, { hook_event_name: "Stop", session_id: "thread-001", turn_id: "turn-corrupt", cwd: root, stop_hook_active: true, last_assistant_message: "done" });
    assert.equal(corrupted.decision, "block");
    assert.match(corrupted.reason, /host_completion_gate_unavailable/u);
    await cp(path.join(layout.state_root, "repositories", shard, "registry", "active", "records", `${active.registry_id}.json`), activeIndex);
    await writeFile(path.join(root, "src", "value.txt"), "good\n");
    const final = await client.call("final_gate", root, { workdir });
    assert.equal(final.workflow_status, "accepted");
    const accepted = await runManagedHook(layout.hook_path, { hook_event_name: "Stop", session_id: "thread-001", turn_id: "turn-006", cwd: root, stop_hook_active: true, last_assistant_message: "done" });
    const finalDiagnostic = accepted.decision === "block" ? await readFile(path.join(workdir, "final-result.json"), "utf8").catch(() => "final-result unavailable") : "";
    assert.deepEqual(accepted, {}, `Stop must allow only after a fresh Host-worker recomputation accepts the repaired workspace\n${finalDiagnostic}`);
    assert.equal(await client.call("get_active", root, {}), null);
    assert.ok((await readFile(path.join(layout.state_root, "repositories", shard, "registry", "tombstones", `${active.registry_id}.json`), "utf8")).includes("ty-context-host-terminal-tombstone-v1"));
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
    }
    await rm(layout.endpoint, { force: true });
    await rm(system, { recursive: true, force: true });
  }
});

async function waitForFile(file) {
  for (let attempt = 0; attempt < 2400; attempt += 1) {
    try { await readFile(file); return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`managed Host did not create ${file}`);
}
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }

async function waitForRpc(client, root) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { await client.call("health", root, {}); return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("managed Host RPC did not become ready");
}

function runManagedHook(script, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    const stdout = []; const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== 0) { reject(new Error(`managed hook exited ${code}: ${Buffer.concat(stderr).toString("utf8")}`)); return; }
      try { resolve(JSON.parse(Buffer.concat(stdout).toString("utf8"))); } catch (error) { reject(error); }
    });
    child.stdin.end(JSON.stringify(input));
  });
}
