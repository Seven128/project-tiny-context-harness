import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;
const admin = helper && (process.env.TY_CONTEXT_HOST_ADMIN_BIN ?? path.join(path.dirname(helper), "ty-context-host-admin.exe"));
const installerUi = helper && (process.env.TY_CONTEXT_HOST_INSTALLER_UI_BIN ?? path.join(path.dirname(helper), "ty-context-host-installer-ui.exe"));

test("Windows SCM starts the real Host Gate service and serves health", { skip: !helper || process.platform !== "win32", timeout: 90_000 }, async () => {
  const [{ managedHostLayoutUnder }, { renderManagedRequirementsV1 }, release, runtimeIdentity, { LongTaskHostRpcClientV1 }] = await Promise.all([
    import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
    import("../../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-runtime-identity.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-rpc-client.js")
  ]);
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-windows-service-"));
  const repository = path.join(root, "repository");
  await mkdir(repository);
  await run("git", ["init", "--quiet"], repository);
  const layout = managedHostLayoutUnder(path.join(root, "system"), "win32");
  await mkdir(layout.managed_dir, { recursive: true });
  await cp(helper, layout.helper_path);
  await cp(admin, layout.admin_path);
  await cp(installerUi, layout.installer_ui_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "long-task-hook.mjs"), layout.hook_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "ty-context-host-worker.mjs"), layout.worker_path);
  const requirements = renderManagedRequirementsV1(layout);
  await writeFile(path.join(layout.managed_dir, "requirements.toml"), requirements);
  await mkdir(path.dirname(layout.requirements_file), { recursive: true });
  await writeFile(layout.requirements_file, requirements);
  const releaseKeys = generateKeyPairSync("ed25519");
  const rootPublicKey = releaseKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
  await writeFile(layout.release_root_public_key_path, rootPublicKey);
  const manifest = await release.createUnsignedHostReleaseManifestV1(layout.managed_dir, "0.4.0-rc.1");
  const manifestText = release.canonicalHostReleaseManifestV1(manifest);
  await writeFile(layout.release_manifest_path, manifestText);
  await writeFile(layout.release_signature_path, sign(null, Buffer.from(manifestText), releaseKeys.privateKey).toString("base64url"));
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
    attestation_public_key_path: layout.attestation_public_key_path,
    managed_policy_sha256: sha(requirements),
    release_manifest_sha256: sha(manifestText),
    test_namespace: true
  };
  await writeFile(layout.service_config_path, canonical(config));
  const serviceName = `TyContextHostGateTest${process.pid}${Date.now()}`;
  const binPath = `"${layout.helper_path}" service --config "${layout.service_config_path}" --service-name "${serviceName}"`;
  await run("sc.exe", ["create", serviceName, "binPath=", binPath, "start=", "demand", "obj=", "LocalSystem"]);
  try {
    const started = await runResult("sc.exe", ["start", serviceName]);
    assert.equal(started.code, 0, started.stderr || started.stdout);
    await waitForState(serviceName, "RUNNING");
    const client = new LongTaskHostRpcClientV1({ endpoint: layout.endpoint, public_key_path: layout.attestation_public_key_path, timeout_ms: 5000 });
    await waitForFile(layout.attestation_public_key_path);
    const health = await client.call("health", repository, {});
    assert.equal(health.schema_version, "ty-context-host-health-v1");
  } finally {
    await runResult("sc.exe", ["stop", serviceName]);
    await waitForState(serviceName, "STOPPED").catch(() => undefined);
    await runResult("sc.exe", ["delete", serviceName]);
    await rm(root, { recursive: true, force: true });
  }
});

async function waitForState(name, expected) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await runResult("sc.exe", ["query", name]);
    if (new RegExp(`STATE\\s+:\\s+\\d+\\s+${expected}`, "u").test(result.stdout)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`service_state_timeout:${expected}`);
}
async function waitForFile(file) { for (let attempt = 0; attempt < 120; attempt += 1) { try { await readFile(file); return; } catch {} await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error("service_public_key_timeout"); }
function run(file, args, cwd) { return runResult(file, args, cwd).then((result) => { if (result.code !== 0) throw new Error(result.stderr || result.stdout || `${file} exit ${result.code}`); }); }
function runResult(file, args, cwd) { return new Promise((resolve, reject) => { const child = spawn(file, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); const stdout = []; const stderr = []; child.stdout.on("data", (chunk) => stdout.push(chunk)); child.stderr.on("data", (chunk) => stderr.push(chunk)); child.once("error", reject); child.once("exit", (code) => resolve({ code: code ?? -1, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") })); }); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
