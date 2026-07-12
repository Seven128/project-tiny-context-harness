import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;
const admin = helper && (process.env.TY_CONTEXT_HOST_ADMIN_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"));
const installerUi = helper && (process.env.TY_CONTEXT_HOST_INSTALLER_UI_BIN ?? path.join(path.dirname(helper), process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui"));

test("separate Host administrator and installer UI reject noninteractive mutation or token issuance", { skip: !admin || !installerUi }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-admin-"));
  const managed = path.join(root, "managed"); await mkdir(managed, { recursive: true });
  const installedAdmin = path.join(managed, process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin");
  const installedInstallerUi = path.join(managed, process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui");
  await cp(admin, installedAdmin);
  await cp(installerUi, installedInstallerUi);
  const sandboxLauncherPath = await realpath(process.platform === "win32" ? helper : process.platform === "darwin" ? "/usr/bin/sandbox-exec" : "/usr/bin/bwrap");
  const config = {
    schema_version: "ty-context-host-service-config-v1", state_root: path.join(root, "state"), endpoint: path.join(root, "host.sock"), managed_dir: managed,
    requirements_file: path.join(root, "requirements.toml"), node_path: process.execPath, node_sha256: sha(await readFile(process.execPath)), helper_path: helper, sandbox_launcher_path: sandboxLauncherPath, sandbox_launcher_sha256: sha(await readFile(sandboxLauncherPath)),
    admin_path: installedAdmin, admin_sha256: sha(await readFile(installedAdmin)), installer_ui_path: installedInstallerUi, installer_ui_sha256: sha(await readFile(installedInstallerUi)), codex_launcher_path: process.execPath, codex_launcher_sha256: sha(await readFile(process.execPath)),
    cli_path: import.meta.filename, cli_sha256: sha(await readFile(import.meta.filename)), cli_worker_path: import.meta.filename, cli_worker_sha256: sha(await readFile(import.meta.filename)),
    cli_runtime_manifest: { schema_version: "ty-context-host-cli-runtime-manifest-v1", files: [] }, cli_runtime_manifest_sha256: "0".repeat(64), hook_path: import.meta.filename,
    hook_sha256: sha(await readFile(import.meta.filename)), worker_path: import.meta.filename, worker_sha256: sha(await readFile(import.meta.filename)),
    attestation_public_key_path: path.join(managed, "host-service-public.pem"), managed_policy_sha256: "1".repeat(64), release_manifest_sha256: "2".repeat(64), test_namespace: true
  };
  const configFile = path.join(managed, "host-service-config.json"); await writeFile(configFile, canonical(config));
  try {
    const status = await execute(installedAdmin, ["status", "--config", configFile]);
    assert.equal(status.code, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).schema_version, "ty-context-host-admin-status-v1");
    const denied = await execute(installedAdmin, ["close", "--config", configFile, "--registry-id", "registry-a"]);
    assert.equal(denied.code, 1);
    assert.match(denied.stderr, /host_peer_not_authorized/u);
    const tokenDenied = await execute(installedInstallerUi, ["presence", "--config", configFile, "--registry-id", "registry-a"]);
    assert.equal(tokenDenied.code, 1);
    assert.match(tokenDenied.stderr, /host_peer_not_authorized/u);
    assert.equal((await execute(installedAdmin, ["status", "--config", configFile])).code, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

function execute(file, args) { return new Promise((resolve, reject) => { const child=spawn(file,args,{stdio:["ignore","pipe","pipe"],windowsHide:true});const stdout=[];const stderr=[];child.stdout.on("data",chunk=>stdout.push(chunk));child.stderr.on("data",chunk=>stderr.push(chunk));child.once("error",reject);child.once("exit",code=>resolve({code,stdout:Buffer.concat(stdout).toString("utf8"),stderr:Buffer.concat(stderr).toString("utf8")})); }); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])); return value; }
