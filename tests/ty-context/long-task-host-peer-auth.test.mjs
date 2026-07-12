import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;
const admin = helper && (process.env.TY_CONTEXT_HOST_ADMIN_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"));
const installerUi = helper && (process.env.TY_CONTEXT_HOST_INSTALLER_UI_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui"));

test("production Host authenticates the exact managed Hook process and rejects a same-user impostor", { skip: !helper, timeout: 45_000 }, async () => {
  const [{ managedHostLayoutUnder }, { renderManagedRequirementsV1 }, { LongTaskHostRpcClientV1 }, release, runtimeIdentity] = await Promise.all([
    import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
    import("../../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-rpc-client.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-runtime-identity.js")
  ]);
  const repository = await mkdtemp(path.join(os.tmpdir(), "ltw-peer-repo-"));
  await run("git", ["init", "--quiet"], repository);
  const system = await mkdtemp(path.join(os.tmpdir(), "ltw-peer-system-"));
  const layout = managedHostLayoutUnder(system, process.platform);
  await mkdir(layout.managed_dir, { recursive: true });
  await cp(helper, layout.helper_path);
  await cp(admin, layout.admin_path);
  await cp(installerUi, layout.installer_ui_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "long-task-hook.mjs"), layout.hook_path);
  await cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "ty-context-host-worker.mjs"), layout.worker_path);
  const requirements = renderManagedRequirementsV1(layout);
  await writeFile(path.join(layout.managed_dir, "requirements.toml"), requirements);
  const releaseKeys = generateKeyPairSync("ed25519");
  await writeFile(layout.release_root_public_key_path, releaseKeys.publicKey.export({ type: "spki", format: "pem" }));
  const manifest = await release.createUnsignedHostReleaseManifestV1(layout.managed_dir, "0.4.0-rc.1");
  const manifestText = release.canonicalHostReleaseManifestV1(manifest);
  await writeFile(layout.release_manifest_path, manifestText);
  await writeFile(layout.release_signature_path, sign(null, Buffer.from(manifestText), releaseKeys.privateKey).toString("base64url"));
  await mkdir(path.dirname(layout.requirements_file), { recursive: true }); await writeFile(layout.requirements_file, requirements);
  const cliPath = path.join(system, "managed-cli-peer.mjs");
  const codexLauncher = path.join(system, process.platform === "win32" ? "codex-launcher.exe" : "codex-launcher");
  const launcherScript = path.join(system, "codex-launcher.mjs");
  await cp(process.execPath, codexLauncher);
  await writeFile(launcherScript, `import {spawn} from "node:child_process";const child=spawn(process.argv[2],[process.argv[3]],{stdio:"inherit",windowsHide:true});child.once("error",(error)=>{throw error});child.once("exit",(code)=>process.exitCode=code??1);`);
  const rpcModule = path.join(repo, "packages", "ty-context", "dist", "lib", "long-task-host-rpc-client.js");
  await writeFile(cliPath, `import {pathToFileURL} from "node:url";const {LongTaskHostRpcClientV1}=await import(pathToFileURL(process.argv[2]).href);const client=new LongTaskHostRpcClientV1({endpoint:process.argv[3],public_key_path:process.argv[4],timeout_ms:5000});process.stdout.write(JSON.stringify(await client.call("health",process.argv[5],{})));`);
  const runtimePath = path.join(repo, "packages", "ty-context", "dist", "lib", "long-task-host-worker-runtime.js");
  const cliRuntimeManifest = await runtimeIdentity.createManagedHostRuntimeManifestV1(path.join(repo, "packages", "ty-context", "dist", "cli.js"));
  const sandboxLauncher = await runtimeIdentity.resolveManagedSandboxLauncherV1(layout.helper_path);
  const cliPeerBytes = await readFile(cliPath); cliRuntimeManifest.files.push({ path: await realpath(cliPath), sha256: sha(cliPeerBytes), size: cliPeerBytes.length }); cliRuntimeManifest.files.sort((a, b) => a.path.localeCompare(b.path));
  const config = { schema_version: "ty-context-host-service-config-v1", state_root: layout.state_root, endpoint: layout.endpoint, managed_dir: layout.managed_dir, requirements_file: layout.requirements_file, node_path: process.execPath, node_sha256: sha(await readFile(process.execPath)), helper_path: layout.helper_path, sandbox_launcher_path: sandboxLauncher.path, sandbox_launcher_sha256: sandboxLauncher.sha256, admin_path: layout.admin_path, admin_sha256: sha(await readFile(layout.admin_path)), installer_ui_path: layout.installer_ui_path, installer_ui_sha256: sha(await readFile(layout.installer_ui_path)), codex_launcher_path: codexLauncher, codex_launcher_sha256: sha(await readFile(codexLauncher)), cli_path: cliPath, cli_sha256: sha(await readFile(cliPath)), cli_worker_path: runtimePath, cli_worker_sha256: sha(await readFile(runtimePath)), cli_runtime_manifest: cliRuntimeManifest, cli_runtime_manifest_sha256: runtimeIdentity.managedHostRuntimeManifestSha256V1(cliRuntimeManifest), hook_path: layout.hook_path, hook_sha256: sha(await readFile(layout.hook_path)), worker_path: layout.worker_path, worker_sha256: sha(await readFile(layout.worker_path)), attestation_public_key_path: layout.attestation_public_key_path, managed_policy_sha256: sha(requirements), release_manifest_sha256: sha(manifestText), test_namespace: false };
  await writeFile(layout.service_config_path, canonical(config));
  const service = spawn(layout.helper_path, ["serve", "--config", layout.service_config_path], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  if (process.env.TY_CONTEXT_HOST_MAINTAINER_DEBUG === "1") service.stderr.pipe(process.stderr);
  const exited = new Promise((resolve) => service.once("exit", resolve));
  try {
    await waitForFile(layout.attestation_public_key_path);
    const client = new LongTaskHostRpcClientV1({ endpoint: layout.endpoint, public_key_path: layout.attestation_public_key_path, timeout_ms: 5000 });
    await assert.rejects(() => client.call("handle_hook_event", repository, { hook_event_name: "SessionStart", thread_id: "impostor", turn_id: "turn", cwd: repository }), (error) => error?.code === "host_peer_not_authorized");
    const cliHealth = await runJson(process.execPath, [cliPath, rpcModule, layout.endpoint, layout.attestation_public_key_path, repository], repository);
    assert.equal(cliHealth.schema_version, "ty-context-host-health-v1");
    const direct = await runHook(layout.hook_path, { hook_event_name: "SessionStart", session_id: "thread-direct", turn_id: "turn-direct", cwd: repository, source: "startup" });
    assert.deepEqual(direct, {});
    const afterDirectInvocation = await runJson(process.execPath, [cliPath, rpcModule, layout.endpoint, layout.attestation_public_key_path, repository], repository);
    assert.equal(afterDirectInvocation.heartbeat_fresh, false, "directly invoking the managed script must not prove that Codex loaded managed policy");
    const managed = await runHook(layout.hook_path, { hook_event_name: "SessionStart", session_id: "thread-real", turn_id: "turn-real", cwd: repository, source: "startup" }, [codexLauncher, launcherScript, process.execPath]);
    assert.deepEqual(managed, {});
    const afterManagedInvocation = await runJson(process.execPath, [cliPath, rpcModule, layout.endpoint, layout.attestation_public_key_path, repository], repository);
    assert.equal(afterManagedInvocation.heartbeat_fresh, true, "the exact pinned Codex launcher must establish a real managed heartbeat");
  } finally {
    if (service.exitCode === null) { service.kill(); await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]); }
    await rm(layout.endpoint, { force: true });
    await rm(system, { recursive: true, force: true }); await rm(repository, { recursive: true, force: true });
  }
});

function runHook(script, input, launcher) { return new Promise((resolve, reject) => { const file = launcher?.[0] ?? process.execPath; const args = launcher ? [...launcher.slice(1), script] : [script]; const child = spawn(file, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true }); const stdout = []; const stderr = []; child.stdout.on("data", (chunk) => stdout.push(chunk)); child.stderr.on("data", (chunk) => stderr.push(chunk)); child.once("error", reject); child.once("exit", (code) => { if (code !== 0) return reject(new Error(Buffer.concat(stderr).toString("utf8"))); try { resolve(JSON.parse(Buffer.concat(stdout).toString("utf8"))); } catch (error) { reject(error); } }); child.stdin.end(JSON.stringify(input)); }); }
function run(file, args, cwd) { return new Promise((resolve, reject) => { const child = spawn(file, args, { cwd, stdio: "ignore", windowsHide: true }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`))); }); }
function runJson(file, args, cwd) { return new Promise((resolve, reject) => { const child = spawn(file, args, { cwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true }); const stdout=[];const stderr=[];child.stdout.on("data",(chunk)=>stdout.push(chunk));child.stderr.on("data",(chunk)=>stderr.push(chunk));child.once("error",reject);child.once("exit",(code)=>{if(code!==0)return reject(new Error(Buffer.concat(stderr).toString("utf8")));try{resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));}catch(error){reject(error);}}); }); }
async function waitForFile(file) { const deadline=Date.now()+30_000; while(Date.now()<deadline){try { await readFile(file); return; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error("Host did not become ready"); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
