import { createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";

export interface HostReleaseManifestV1 {
  schema_version: "ty-context-host-release-v1";
  release_version: string;
  platform: "windows" | "linux" | "macos";
  arch: "x64" | "arm64";
  protocol: "ty-context-host-rpc-v1";
  files: Array<{ path: string; sha256: string; size: number }>;
}

interface HostReleaseTargetV1 { platform?: "windows" | "linux" | "macos"; arch?: "x64" | "arm64" }

export async function createUnsignedHostReleaseManifestV1(root: string, releaseVersion: string, target: HostReleaseTargetV1 = {}): Promise<HostReleaseManifestV1> {
  if (!/^0\.4\.0(?:-[0-9A-Za-z.-]+)?$/u.test(releaseVersion)) throw new Error("host_release_version_invalid");
  const { platform, arch } = releaseTarget(target);
  const names = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isFile() && !entry.name.startsWith("host-release-")).map((entry) => entry.name).sort();
  const required = ["requirements.toml", "long-task-hook.mjs", "ty-context-host-worker.mjs", ...componentNames(platform)];
  for (const name of required) if (!names.includes(name)) throw new Error(`host_release_asset_missing:${name}`);
  const files = await Promise.all(names.map(async (name) => { const bytes = await readFile(path.join(root, name)); return { path: name, sha256: sha256Hex(bytes), size: bytes.length }; }));
  const componentHashes = componentNames(platform).map((name) => files.find((item) => item.path === name)?.sha256);
  if (new Set(componentHashes).size !== componentHashes.length) throw new Error("host_release_component_identity_conflict");
  return { schema_version: "ty-context-host-release-v1", release_version: releaseVersion, platform, arch, protocol: "ty-context-host-rpc-v1", files };
}

export function canonicalHostReleaseManifestV1(manifest: HostReleaseManifestV1): string { return canonicalJson(manifest); }

export async function verifyHostReleaseDirectoryV1(root: string, pinnedRootPublicKeyPem: string, options: { allow_runtime_files?: boolean; platform?: "windows" | "linux" | "macos"; arch?: "x64" | "arm64" } = {}): Promise<HostReleaseManifestV1> {
  const installedRoot = await readFile(path.join(root, "host-release-root-public.pem"), "utf8");
  const installedDer = createPublicKey(installedRoot).export({ type: "spki", format: "der" });
  const pinnedDer = createPublicKey(pinnedRootPublicKeyPem).export({ type: "spki", format: "der" });
  if (!Buffer.from(installedDer).equals(Buffer.from(pinnedDer))) throw new Error("host_release_root_key_mismatch");
  const manifestText = await readFile(path.join(root, "host-release-manifest.json"), "utf8");
  const manifest = parseStrictJson(manifestText) as HostReleaseManifestV1;
  const expected = releaseTarget(options);
  if (manifest.schema_version !== "ty-context-host-release-v1" || manifest.protocol !== "ty-context-host-rpc-v1" || manifest.platform !== expected.platform || manifest.arch !== expected.arch || canonicalHostReleaseManifestV1(manifest) !== manifestText) throw new Error("host_release_manifest_invalid");
  const signature = Buffer.from((await readFile(path.join(root, "host-release-manifest.sig"), "utf8")).trim(), "base64url");
  if (!verify(null, Buffer.from(manifestText), createPublicKey(pinnedRootPublicKeyPem), signature)) throw new Error("host_release_signature_invalid");
  const manifestPaths = manifest.files.map((item) => item.path);
  if (new Set(manifestPaths).size !== manifestPaths.length || manifestPaths.join("\0") !== [...manifestPaths].sort().join("\0")) throw new Error("host_release_manifest_paths_invalid");
  for (const required of ["requirements.toml", "long-task-hook.mjs", "ty-context-host-worker.mjs", ...componentNames(manifest.platform)]) if (!manifestPaths.includes(required)) throw new Error(`host_release_asset_missing:${required}`);
  const componentHashes = componentNames(manifest.platform).map((name) => manifest.files.find((item) => item.path === name)?.sha256);
  if (new Set(componentHashes).size !== componentHashes.length) throw new Error("host_release_component_identity_conflict");
  const canonicalRoot = await realpath(root);
  for (const item of manifest.files) {
    if (!portable(item.path)) throw new Error(`host_release_path_invalid:${item.path}`);
    const file = path.join(root, item.path); const linkInfo = await lstat(file); const info = await stat(file); const canonicalFile = await realpath(file); const bytes = await readFile(file);
    if (linkInfo.isSymbolicLink() || !info.isFile() || !inside(canonicalRoot, canonicalFile) || bytes.length !== item.size || sha256Hex(bytes) !== item.sha256) throw new Error(`host_release_asset_mismatch:${item.path}`);
  }
  const metadata = new Set(["host-release-manifest.json", "host-release-manifest.sig", "host-release-root-public.pem"]);
  if (options.allow_runtime_files) { metadata.add("host-service-config.json"); metadata.add("host-service-public.pem"); }
  const actual = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => !metadata.has(name)).sort();
  if (actual.join("\0") !== manifestPaths.join("\0")) throw new Error("host_release_unmanifested_asset");
  return manifest;
}

export async function createManagedHostTestReleaseV1(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "requirements.toml"), "allow_managed_hooks_only = true\n[features]\nhooks = true\n");
  await writeFile(path.join(root, "long-task-hook.mjs"), "process.stdout.write('{}\\n');\n");
  await writeFile(path.join(root, "ty-context-host-worker.mjs"), "export {};\n");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-helper.exe" : "ty-context-host-helper"), "fixture-helper");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin"), "fixture-admin");
  await writeFile(path.join(root, process.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui"), "fixture-installer-ui");
  const pair = generateKeyPairSync("ed25519");
  const publicPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  await writeFile(path.join(root, "host-release-root-public.pem"), publicPem);
  const manifest = await createUnsignedHostReleaseManifestV1(root, "0.4.0-test.1");
  const text = canonicalHostReleaseManifestV1(manifest);
  await writeFile(path.join(root, "host-release-manifest.json"), text);
  await writeFile(path.join(root, "host-release-manifest.sig"), sign(null, Buffer.from(text), pair.privateKey).toString("base64url"));
}

function portable(value: string): boolean { return !!value && !path.isAbsolute(value) && !value.split(/[\\/]/u).includes("..") && /^[A-Za-z0-9._/-]+$/u.test(value); }
function inside(root: string, candidate: string): boolean { const left = process.platform === "win32" ? root.toLocaleLowerCase("en-US") : root; const right = process.platform === "win32" ? candidate.toLocaleLowerCase("en-US") : candidate; return right.startsWith(`${left}${path.sep}`); }
function componentNames(platform: HostReleaseManifestV1["platform"]): string[] { const suffix = platform === "windows" ? ".exe" : ""; return [`ty-context-host-helper${suffix}`, `ty-context-host-admin${suffix}`, `ty-context-host-installer-ui${suffix}`]; }
function releaseTarget(target: HostReleaseTargetV1): { platform: HostReleaseManifestV1["platform"]; arch: HostReleaseManifestV1["arch"] } { const platform = target.platform ?? (process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : process.platform === "linux" ? "linux" : undefined); const arch = target.arch ?? (process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : undefined); if (!platform || !arch) throw new Error("host_release_target_unsupported"); return { platform, arch }; }
