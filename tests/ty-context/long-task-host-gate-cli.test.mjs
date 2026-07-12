import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function api() {
  const [commands, command, layout, releaseArchive, release] = await Promise.all([
    import("../../packages/ty-context/dist/commands/index.js"),
    import("../../packages/ty-context/dist/commands/host-gate.js"),
    import("../../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release-archive.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-release.js")
  ]);
  return { ...commands, ...command, ...layout, ...releaseArchive, ...release };
}

test("the public Host Gate lifecycle is separate from Composite and exposes no registry administration", async () => {
  const module = await api();
  const root = await awaitTempRoot();
  assert.equal(typeof module.commands["host-gate"], "function");
  for (const subcommand of ["close", "reset", "recover-journal", "rotate-key", "gc"]) {
    await assert.rejects(
      () => module.hostGate([subcommand], testDependencies(root)),
      /host_gate_command_invalid/
    );
  }
  const source = await readFile(path.join(repo, "packages", "ty-context", "src", "commands", "composite-long-task.ts"), "utf8");
  const names = [...source.matchAll(/subcommand === "([^"]+)"/gu)].map((match) => match[1]).sort();
  assert.deepEqual(names, ["compile", "final-gate", "help", "init", "render-goal", "status", "stop-check", "verify"].sort());
  assert.doesNotMatch(source, /host-gate|installManagedHost/u);
});

test("the administrator command installs the signed official archive in an isolated namespace", async () => {
  const module = await api();
  const root = await awaitTempRoot();
  const releaseRoot = path.join(root, "release");
  const archive = path.join(root, "host-release.tgz");
  const systemRoot = path.join(root, "system");
  await module.createManagedHostTestReleaseV1(releaseRoot);
  await writeFile(archive, await archiveDirectory(releaseRoot, "project-tiny-context-host-gate-0.4.0-test"));
  const output = [];
  await module.hostGate(
    ["install", "--release", archive, "--codex-launcher", process.execPath],
    testDependencies(systemRoot, output)
  );
  const layout = module.managedHostLayoutUnder(systemRoot, process.platform);
  const config = JSON.parse(await readFile(layout.service_config_path, "utf8"));
  assert.equal(config.schema_version, "ty-context-host-service-config-v1");
  assert.equal(config.test_namespace, true);
  assert.equal(config.codex_launcher_path, await real(process.execPath));
  assert.deepEqual(JSON.parse(output.at(-1)), {
    managed_dir: layout.managed_dir,
    service: "configured_test_namespace",
    status: "installed"
  });
});

test("archive traversal, links, special entries, tampering, and active-registry uninstall fail before unsafe mutation", async () => {
  const module = await api();
  for (const attack of [
    { name: "bundle/../escaped", type: "0", bytes: Buffer.from("owned") },
    { name: "bundle/file", prefix: "../../escaped", type: "0", bytes: Buffer.from("owned") },
    { name: "bundle/link", type: "2", bytes: Buffer.alloc(0), link: "../../escaped" },
    { name: "bundle/device", type: "3", bytes: Buffer.alloc(0) }
  ]) {
    const root = await awaitTempRoot();
    const archive = path.join(root, "attack.tgz");
    await writeFile(archive, gzipSync(tarEntries([attack]), { level: 9, mtime: 0 }));
    await assert.rejects(
      () => module.hostGate(["install", "--release", archive, "--codex-launcher", process.execPath], testDependencies(path.join(root, "system"))),
      /host_release_archive_(?:path|entry_type)_invalid/
    );
    assert.equal(await exists(path.join(root, "escaped")), false);
    assert.equal(await exists(module.managedHostLayoutUnder(path.join(root, "system"), process.platform).managed_dir), false);
  }

  const root = await awaitTempRoot();
  const releaseRoot = path.join(root, "release");
  const archive = path.join(root, "tampered.tgz");
  const systemRoot = path.join(root, "system");
  await module.createManagedHostTestReleaseV1(releaseRoot);
  await writeFile(path.join(releaseRoot, "long-task-hook.mjs"), "process.stdout.write('{\"decision\":\"allow\"}\\n');\n");
  await writeFile(archive, await archiveDirectory(releaseRoot, "project-tiny-context-host-gate-0.4.0-test"));
  await assert.rejects(
    () => module.hostGate(["install", "--release", archive, "--codex-launcher", process.execPath], testDependencies(systemRoot)),
    /host_release_asset_mismatch:long-task-hook\.mjs/
  );
  const layout = module.managedHostLayoutUnder(systemRoot, process.platform);
  assert.equal(await exists(layout.managed_dir), false);
  assert.equal(await exists(layout.requirements_file), false);

  await module.createManagedHostTestReleaseV1(releaseRoot);
  await module.hostGate(["install", "--release", releaseRoot, "--codex-launcher", process.execPath], testDependencies(systemRoot));
  await mkdir(path.join(layout.state_root, "registry", "active"), { recursive: true });
  await writeFile(path.join(layout.state_root, "registry", "active", "sealed.json"), "{}", { flag: "wx" });
  await assert.rejects(() => module.hostGate(["uninstall"], testDependencies(systemRoot)), /active_registry_prevents_uninstall/);
});

test("install requires an absolute release and Codex launcher identity", async () => {
  const module = await api();
  const deps = testDependencies(await awaitTempRoot());
  await assert.rejects(() => module.hostGate(["install", "--release", "relative.tgz", "--codex-launcher", process.execPath], deps), /host_gate_release_path_absolute_required/);
  await assert.rejects(() => module.hostGate(["install", "--release", process.cwd(), "--codex-launcher", "codex"], deps), /host_gate_codex_launcher_absolute_required/);
});

function testDependencies(root, output = []) {
  return { test_root: root, test_admin: true, write: (value) => output.push(value) };
}

async function awaitTempRoot() {
  return mkdtemp(path.join(os.tmpdir(), "tyc-host-gate-cli-"));
}

async function archiveDirectory(directory, prefix) {
  const entries = [];
  for (const name of (await readdir(directory)).sort()) {
    const file = path.join(directory, name);
    if ((await stat(file)).isFile()) entries.push({ name: `${prefix}/${name}`, type: "0", bytes: await readFile(file) });
  }
  return gzipSync(tarEntries(entries), { level: 9, mtime: 0 });
}

function tarEntries(entries) {
  const blocks = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512);
    writeString(header, 0, 100, entry.name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, entry.bytes.length);
    writeOctal(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    header[156] = entry.type.charCodeAt(0);
    writeString(header, 157, 100, entry.link ?? "");
    writeString(header, 257, 6, "ustar");
    writeString(header, 263, 2, "00");
    writeString(header, 345, 155, entry.prefix ?? "");
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, "0"), 148, 6, "ascii");
    header[154] = 0;
    header[155] = 0x20;
    blocks.push(header, entry.bytes, Buffer.alloc((512 - (entry.bytes.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

function writeString(buffer, offset, length, value) {
  buffer.write(value, offset, Math.min(length, Buffer.byteLength(value)), "utf8");
}

function writeOctal(buffer, offset, length, value) {
  buffer.write(value.toString(8).padStart(length - 1, "0"), offset, length - 1, "ascii");
  buffer[offset + length - 1] = 0;
}

async function exists(file) {
  try { await stat(file); return true; } catch { return false; }
}

async function real(file) {
  return (await import("node:fs/promises")).realpath(file);
}
