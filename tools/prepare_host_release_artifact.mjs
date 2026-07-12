#!/usr/bin/env node

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parse(process.argv.slice(2));
const target = targetDescriptor(required("--target"));
const version = required("--version");
if (version !== "0.4.0") throw new Error("host_release_artifact_requires_0.4.0");
const outputRoot = path.resolve(options.get("--output-root") ?? path.join(root, ".artifacts", "releases", "host", version));
const releaseName = `project-tiny-context-host-gate-${version}-${target.id}`;
const releaseRoot = path.join(outputRoot, releaseName);
const archivePath = path.join(outputRoot, `${releaseName}.tgz`);
const metadataPath = path.join(outputRoot, `${releaseName}.json`);

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
const suffix = target.platform === "windows" ? ".exe" : "";
const components = [
  [required("--helper"), `ty-context-host-helper${suffix}`],
  [required("--admin"), `ty-context-host-admin${suffix}`],
  [required("--installer-ui"), `ty-context-host-installer-ui${suffix}`]
];
for (const [source, name] of components) {
  const absolute = path.resolve(source);
  if (!(await stat(absolute)).isFile()) throw new Error(`host_release_binary_invalid:${name}`);
  await copyFile(absolute, path.join(releaseRoot, name));
  if (target.platform !== "windows") await chmod(path.join(releaseRoot, name), 0o755);
}
for (const name of ["long-task-hook.mjs", "ty-context-host-worker.mjs"]) await copyFile(path.join(root, ".codex", "ty-context-managed", "managed-host-gate", name), path.join(releaseRoot, name));

const [{ managedHostLayout }, { renderHostReleaseRequirementsV1 }, release, { LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM }, { canonicalJson, sha256Hex }] = await Promise.all([
  import("../packages/ty-context/dist/lib/long-task-managed-host-layout.js"),
  import("../packages/ty-context/dist/lib/long-task-managed-requirements.js"),
  import("../packages/ty-context/dist/lib/long-task-host-release.js"),
  import("../packages/ty-context/dist/lib/long-task-host-release-root.js"),
  import("../packages/ty-context/dist/lib/composite-campaign-codec.js")
]);
const layout = managedHostLayout(target.nodePlatform);
if (options.has("--node-path")) throw new Error("host_release_node_path_is_target_canonical");
await writeFile(path.join(releaseRoot, "requirements.toml"), renderHostReleaseRequirementsV1(layout, target));

const privateKey = createPrivateKey(await readFile(path.resolve(required("--private-key"))));
const publicKey = createPublicKey(privateKey);
const embeddedDer = createPublicKey(LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM).export({ type: "spki", format: "der" });
const publicDer = publicKey.export({ type: "spki", format: "der" });
if (!Buffer.from(publicDer).equals(Buffer.from(embeddedDer))) throw new Error("host_release_root_private_key_mismatch");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
await writeFile(path.join(releaseRoot, "host-release-root-public.pem"), publicPem);
const manifest = await release.createUnsignedHostReleaseManifestV1(releaseRoot, version, { platform: target.platform, arch: target.arch });
const manifestText = release.canonicalHostReleaseManifestV1(manifest);
const signature = sign(null, Buffer.from(manifestText), privateKey).toString("base64url");
await writeFile(path.join(releaseRoot, "host-release-manifest.json"), manifestText);
await writeFile(path.join(releaseRoot, "host-release-manifest.sig"), `${signature}\n`);
await release.verifyHostReleaseDirectoryV1(releaseRoot, LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM, { platform: target.platform, arch: target.arch });

const archive = gzipSync(await tarDirectory(releaseRoot, releaseName), { level: 9, mtime: 0 });
await writeFile(archivePath, archive);
const metadata = {
  schema_version: "ty-context-host-release-artifact-v1",
  release_version: version,
  target: target.id,
  platform: target.platform,
  arch: target.arch,
  filename: path.basename(archivePath),
  size: archive.length,
  sha256: sha256Hex(archive),
  manifest_sha256: sha256Hex(manifestText),
  manifest_signature_sha256: sha256Hex(`${signature}\n`),
  root_key_id: createHash("sha256").update(publicDer).digest("hex"),
  files: manifest.files
};
await writeFile(metadataPath, canonicalJson(metadata));
process.stdout.write(canonicalJson({ ...metadata, directory: releaseRoot, archive: archivePath, metadata: metadataPath }));

async function tarDirectory(directory, prefix) {
  const names = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const blocks = [];
  for (const name of names) {
    const bytes = await readFile(path.join(directory, name));
    const executable = /^ty-context-host-(?:helper|admin|installer-ui)(?:\.exe)?$/u.test(name);
    blocks.push(tarHeader(`${prefix}/${name}`, bytes.length, executable ? 0o755 : 0o644), bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

function tarHeader(name, size, mode) {
  if (Buffer.byteLength(name) > 100) throw new Error(`host_release_archive_path_too_long:${name}`);
  const header = Buffer.alloc(512);
  writeString(header, 0, 100, name);
  writeOctal(header, 100, 8, mode);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  writeString(header, 257, 6, "ustar");
  writeString(header, 263, 2, "00");
  writeString(header, 265, 32, "root");
  writeString(header, 297, 32, "root");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const encoded = checksum.toString(8).padStart(6, "0");
  header.write(encoded, 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function writeString(buffer, offset, length, value) { buffer.write(value, offset, Math.min(length, Buffer.byteLength(value)), "utf8"); }
function writeOctal(buffer, offset, length, value) { const text = value.toString(8).padStart(length - 1, "0"); buffer.write(text, offset, length - 1, "ascii"); buffer[offset + length - 1] = 0; }
function parse(argv) { const result = new Map(); for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || !value || value.startsWith("--") || result.has(key)) throw new Error(`invalid_host_release_argument:${key ?? "missing"}`); result.set(key, value); } return result; }
function required(name) { const value = options.get(name); if (!value) throw new Error(`missing_${name.slice(2).replaceAll("-", "_")}`); return value; }
function targetDescriptor(id) { const targets = { "windows-x64": { id, platform: "windows", nodePlatform: "win32", arch: "x64", nodePath: "C:\\Program Files\\nodejs\\node.exe" }, "linux-x64": { id, platform: "linux", nodePlatform: "linux", arch: "x64", nodePath: "/usr/bin/node" }, "macos-x64": { id, platform: "macos", nodePlatform: "darwin", arch: "x64", nodePath: "/usr/local/bin/node" }, "macos-arm64": { id, platform: "macos", nodePlatform: "darwin", arch: "arm64", nodePath: "/opt/homebrew/bin/node" } }; const target = targets[id]; if (!target) throw new Error(`unsupported_host_release_target:${id}`); return target; }
