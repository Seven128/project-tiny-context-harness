import { spawn } from "node:child_process";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { chmod, cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (process.platform !== "linux" || process.getuid?.() !== 0 || !await container()) throw new Error("managed_host_linux_service_requires_root_container");
const helper = required("TY_CONTEXT_HOST_HELPER_BIN");
const admin = required("TY_CONTEXT_HOST_ADMIN_BIN");
const installerUi = required("TY_CONTEXT_HOST_INSTALLER_UI_BIN");
const privateKeyPath = required("TY_CONTEXT_HOST_RELEASE_ROOT_PRIVATE_KEY");
const readyPath = required("TY_CONTEXT_MANAGED_HOST_READY");
const [{ managedHostLayout }, { renderManagedRequirementsV1 }, release, runtimeIdentity, { canonicalValueJson, sha256Hex }] = await Promise.all([
  import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
  import("../../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
  import("../../packages/ty-context/dist/lib/long-task-host-release.js"),
  import("../../packages/ty-context/dist/lib/long-task-host-runtime-identity.js"),
  import("../../packages/ty-context/dist/lib/composite-campaign-codec.js")
]);

const layout = managedHostLayout("linux");
const codexDirectory = "/usr/local/libexec";
const codexLauncher = path.join(codexDirectory, "ty-context-codex-test-launcher");
const codexScript = path.join(codexDirectory, "ty-context-codex-test-launcher.mjs");
await Promise.all([
  rm(layout.managed_dir, { recursive: true, force: true }),
  rm(layout.state_root, { recursive: true, force: true }),
  rm(layout.requirements_file, { force: true }),
  rm(layout.endpoint, { force: true }),
  rm(readyPath, { force: true })
]);
await Promise.all([
  mkdir(layout.managed_dir, { recursive: true }),
  mkdir(layout.state_root, { recursive: true }),
  mkdir(path.dirname(layout.requirements_file), { recursive: true }),
  mkdir(path.dirname(layout.endpoint), { recursive: true }),
  mkdir(codexDirectory, { recursive: true })
]);
await Promise.all([
  cp(helper, layout.helper_path),
  cp(admin, layout.admin_path),
  cp(installerUi, layout.installer_ui_path),
  cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "long-task-hook.mjs"), layout.hook_path),
  cp(path.join(repo, ".codex", "ty-context-managed", "managed-host-gate", "ty-context-host-worker.mjs"), layout.worker_path),
  cp(process.execPath, codexLauncher)
]);
await writeFile(codexScript, `import {spawnSync} from "node:child_process";const result=spawnSync(process.argv[2],process.argv.slice(3),{stdio:"inherit",windowsHide:true});process.exit(result.status??1);\n`);
await Promise.all([layout.helper_path, layout.admin_path, layout.installer_ui_path, codexLauncher].map((file) => chmod(file, 0o755)));
const requirements = renderManagedRequirementsV1(layout);
await Promise.all([
  writeFile(path.join(layout.managed_dir, "requirements.toml"), requirements),
  writeFile(layout.requirements_file, requirements)
]);
const privateKey = createPrivateKey(await readFile(privateKeyPath));
const publicPem = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
await writeFile(layout.release_root_public_key_path, publicPem);
const manifest = await release.createUnsignedHostReleaseManifestV1(layout.managed_dir, "0.4.0-rc.1");
const manifestText = release.canonicalHostReleaseManifestV1(manifest);
await Promise.all([
  writeFile(layout.release_manifest_path, manifestText),
  writeFile(layout.release_signature_path, sign(null, Buffer.from(manifestText), privateKey).toString("base64url"))
]);
const cliPath = await realpath(path.join(repo, "packages", "ty-context", "dist", "cli.js"));
const cliWorkerPath = await realpath(path.join(repo, "packages", "ty-context", "dist", "lib", "long-task-host-worker-runtime.js"));
const cliRuntimeManifest = await runtimeIdentity.createManagedHostRuntimeManifestV1(cliPath);
const sandboxLauncher = await runtimeIdentity.resolveManagedSandboxLauncherV1(layout.helper_path, "linux");
const config = {
  schema_version: "ty-context-host-service-config-v1", state_root: layout.state_root, endpoint: layout.endpoint, managed_dir: layout.managed_dir,
  requirements_file: layout.requirements_file, node_path: await realpath(process.execPath), node_sha256: sha256Hex(await readFile(process.execPath)),
  helper_path: layout.helper_path, sandbox_launcher_path: sandboxLauncher.path, sandbox_launcher_sha256: sandboxLauncher.sha256,
  admin_path: layout.admin_path, admin_sha256: sha256Hex(await readFile(layout.admin_path)), installer_ui_path: layout.installer_ui_path,
  installer_ui_sha256: sha256Hex(await readFile(layout.installer_ui_path)), codex_launcher_path: codexLauncher,
  codex_launcher_sha256: sha256Hex(await readFile(codexLauncher)), cli_path: cliPath, cli_sha256: sha256Hex(await readFile(cliPath)),
  cli_worker_path: cliWorkerPath, cli_worker_sha256: sha256Hex(await readFile(cliWorkerPath)), cli_runtime_manifest: cliRuntimeManifest,
  cli_runtime_manifest_sha256: runtimeIdentity.managedHostRuntimeManifestSha256V1(cliRuntimeManifest), hook_path: layout.hook_path,
  hook_sha256: sha256Hex(await readFile(layout.hook_path)), worker_path: layout.worker_path, worker_sha256: sha256Hex(await readFile(layout.worker_path)),
  attestation_public_key_path: layout.attestation_public_key_path, managed_policy_sha256: sha256Hex(requirements),
  release_manifest_sha256: sha256Hex(manifestText), test_namespace: false
};
await writeFile(layout.service_config_path, canonicalValueJson(config));
await Promise.all([
  chmod(layout.managed_dir, 0o755), chmod(layout.state_root, 0o700), chmod(layout.requirements_file, 0o644), chmod(path.dirname(layout.endpoint), 0o755),
  ...[layout.hook_path, layout.worker_path, path.join(layout.managed_dir, "requirements.toml"), layout.release_root_public_key_path, layout.release_manifest_path, layout.release_signature_path, layout.service_config_path].map((file) => chmod(file, 0o644))
]);
const service = spawn(layout.helper_path, ["serve", "--config", layout.service_config_path], { stdio: ["ignore", "ignore", "inherit"] });
await waitFor(layout.attestation_public_key_path);
await writeFile(readyPath, canonicalValueJson({ schema_version: "ty-context-managed-host-test-ready-v1", codex_launcher: codexLauncher, codex_script: codexScript, hook_path: layout.hook_path }));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { service.kill(); });
const code = await new Promise((resolve, reject) => { service.once("error", reject); service.once("exit", (value) => resolve(value ?? 1)); });
await rm(readyPath, { force: true });
process.exitCode = code;

function required(name) { const value = process.env[name]; if (!value) throw new Error(`missing_${name}`); return value; }
async function waitFor(file) { for (let attempt = 0; attempt < 400; attempt += 1) { try { await readFile(file); return; } catch {} await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error(`managed_host_not_ready:${file}`); }
async function container() { try { await readFile("/.dockerenv"); return true; } catch { return false; } }
