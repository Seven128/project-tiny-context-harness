import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function api() {
  return Promise.all([
    import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
    import("../../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-installer.js")
  ]).then(([layout, requirements, release, installer]) => ({ ...layout, ...requirements, ...release, ...installer }));
}
// Regression identity: repo_stop_hook_deleted_or_modified is enforced by the signed release mutation test below.

test("managed requirements pin managed-only hooks and every exact lifecycle command", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-requirements-"));
  const module = await api();
  const layout = module.managedHostLayoutUnder(root, "win32");
  const text = module.renderManagedRequirementsV1(layout);
  const checked = module.inspectManagedRequirementsV1(text, layout);
  assert.equal(checked.passed, true, checked.findings.join("\n"));
  assert.match(text, /allow_managed_hooks_only = true/);
  assert.match(text, /\[features\]\s+hooks = true/s);
  assert.match(text, /\[\[hooks\.SessionStart\]\]/);
  assert.match(text, /\[\[hooks\.PostCompact\]\]/);
  assert.match(text, /\[\[hooks\.Stop\]\]/);
  assert.match(text, /timeout = 21600/);
  assert.doesNotMatch(text, /\.codex[\\/]hooks|git rev-parse/);
});

test("Linux service socket group can connect and child sandboxes retain loopback families", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-linux-unit-"));
  const module = await api();
  assert.equal(typeof module.renderLinuxServiceUnitV1, "function");
  const unit = module.renderLinuxServiceUnitV1(module.managedHostLayoutUnder(root, "linux"));
  assert.match(unit, /^Group=ty-context$/mu);
  assert.match(unit, /^RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6$/mu);
});

test("macOS LaunchDaemon is root-owned, direct-exec, restartable, and uses fixed managed paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-macos-daemon-"));
  const module = await api();
  const layout = module.managedHostLayoutUnder(root, "darwin");
  const plist = module.renderMacLaunchDaemonV1(layout);
  assert.match(plist, /<key>Label<\/key><string>com\.openai\.codex\.ty-context-host-gate<\/string>/u);
  assert.match(plist, /<key>UserName<\/key><string>root<\/string>/u);
  assert.match(plist, /<key>GroupName<\/key><string>wheel<\/string>/u);
  assert.match(plist, new RegExp(regex(layout.helper_path)));
  assert.match(plist, new RegExp(regex(layout.service_config_path)));
  assert.match(plist, /<key>RunAtLoad<\/key><true\/><key>KeepAlive<\/key><true\/>/u);
  assert.doesNotMatch(plist, /<key>Program<\/key>|\/bin\/(?:ba)?sh/u);
});

test("disabled or non-exclusive managed policy is rejected with no fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-disabled-"));
  const module = await api();
  const layout = module.managedHostLayoutUnder(root, process.platform);
  const valid = module.renderManagedRequirementsV1(layout);
  for (const [name, text, finding] of [
    ["hooks-disabled", valid.replace("hooks = true", "hooks = false"), "managed_hooks_not_forced"],
    ["managed-only-missing", valid.replace("allow_managed_hooks_only = true", "allow_managed_hooks_only = false"), "managed_hooks_not_exclusive"],
    ["managed-dir-retargeted", valid.replaceAll(layout.managed_dir, path.join(root, "forged")), "managed_hook_directory_mismatch"]
  ]) {
    const checked = module.inspectManagedRequirementsV1(text, layout);
    assert.equal(checked.passed, false, name);
    assert.ok(checked.findings.includes(finding), `${name}: ${checked.findings.join(",")}`);
  }
});

test("signed Host release requires separate administrator and local-presence UI components", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-admin-component-"));
  const module = await api();
  await writeFile(path.join(root, "requirements.toml"), "allow_managed_hooks_only = true\n[features]\nhooks = true\n");
  await writeFile(path.join(root, "long-task-hook.mjs"), "process.stdout.write('{}\\n');\n");
  await writeFile(path.join(root, "ty-context-host-worker.mjs"), "export {};\n");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-helper.exe" : "ty-context-host-helper"), "fixture-helper");
  await assert.rejects(() => module.createUnsignedHostReleaseManifestV1(root, "0.4.0-rc.1"), /host_release_asset_missing:ty-context-host-admin/u);
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"), "fixture-admin");
  await assert.rejects(() => module.createUnsignedHostReleaseManifestV1(root, "0.4.0-rc.1"), /host_release_asset_missing:ty-context-host-installer-ui/u);
});

test("release manifest is integrity-pinned and any managed asset mutation is rejected", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-release-"));
  const module = await api();
  await writeFile(path.join(root, "requirements.toml"), "allow_managed_hooks_only = true\n[features]\nhooks = true\n");
  await writeFile(path.join(root, "long-task-hook.mjs"), "process.stdout.write('{}\\n');\n");
  await writeFile(path.join(root, "ty-context-host-worker.mjs"), "export {};\n");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-helper.exe" : "ty-context-host-helper"), "fixture-helper");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"), "fixture-admin");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui"), "fixture-installer-ui");
  const manifest = await module.createUnsignedHostReleaseManifestV1(root, "0.4.0-rc.1");
  const pair = generateKeyPairSync("ed25519");
  const manifestText = module.canonicalHostReleaseManifestV1(manifest);
  await writeFile(path.join(root, "host-release-manifest.json"), manifestText);
  await writeFile(path.join(root, "host-release-manifest.sig"), sign(null, Buffer.from(manifestText), pair.privateKey).toString("base64url"));
  const publicKey = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  await writeFile(path.join(root, "host-release-root-public.pem"), publicKey);
  assert.equal((await module.verifyHostReleaseDirectoryV1(root, publicKey)).release_version, "0.4.0-rc.1");
  const wrong = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
  await assert.rejects(() => module.verifyHostReleaseDirectoryV1(root, wrong), /host_release_root_key_mismatch/);
  await writeFile(path.join(root, "long-task-hook.mjs"), "// mutated\n");
  await assert.rejects(() => module.verifyHostReleaseDirectoryV1(root, publicKey), /host_release_asset_mismatch/);
});

test("installer is atomic, never writes project hooks, and refuses uninstall with active authority", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-managed-installer-"));
  const module = await api();
  const layout = module.managedHostLayoutUnder(path.join(root, "system"), process.platform);
  const source = path.join(root, "release");
  await module.createManagedHostTestReleaseV1(source);
  const installed = await module.installManagedHostReleaseV1({ source, layout, test_admin: true });
  assert.equal(installed.status, "installed");
  assert.equal(await readFile(layout.requirements_file, "utf8"), module.renderManagedRequirementsV1(layout));
  const config = JSON.parse(await readFile(layout.service_config_path, "utf8"));
  assert.equal(config.schema_version, "ty-context-host-service-config-v1");
  assert.equal(config.helper_path, layout.helper_path);
  assert.equal(config.installer_ui_path, layout.installer_ui_path);
  assert.match(config.installer_ui_sha256, /^[a-f0-9]{64}$/u);
  assert.match(config.cli_worker_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(config.test_namespace, true);
  await mkdir(path.join(layout.state_root, "registry", "active"), { recursive: true });
  await writeFile(path.join(layout.state_root, "registry", "active", "test.json"), "{}", { flag: "wx" });
  await assert.rejects(() => module.uninstallManagedHostReleaseV1({ layout, test_admin: true }), /active_registry_prevents_uninstall/);
});

function regex(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
