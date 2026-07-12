#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsRoot = path.dirname(fileURLToPath(import.meta.url));
const defaultLockPath = path.join(toolsRoot, "external-audit-lock.json");

export async function readExternalAuditLock(file = defaultLockPath) {
  const lock = JSON.parse(await readFile(file, "utf8"));
  assertExactKeys(lock, ["attacks", "consumers", "expected_outcomes_sha256", "host_release_root_key_id", "integrity", "package", "release_commit", "schema_version", "signing_key_id", "signing_public_key_spki_der_base64", "tarball_sha256", "tarball_url", "version"], "lock");
  if (lock.schema_version !== "external-audit-lock-v1" || lock.package !== "project-tiny-context-harness-audit" || !/^0\.1\.0$/u.test(lock.version)) fail("external_audit_lock_identity_invalid");
  if (!/^https:\/\/github\.com\/Seven128\/project-tiny-context-harness-audit\/releases\/download\/v0\.1\.0\//u.test(lock.tarball_url) || !hex(lock.tarball_sha256) || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(lock.integrity) || !/^[a-f0-9]{40}$/u.test(lock.release_commit) || !hex(lock.signing_key_id) || !hex(lock.host_release_root_key_id) || !hex(lock.expected_outcomes_sha256)) fail("external_audit_lock_field_invalid");
  const publicDer = Buffer.from(lock.signing_public_key_spki_der_base64, "base64");
  if (sha256(publicDer) !== lock.signing_key_id) fail("external_audit_lock_key_mismatch");
  assertExpectedRows(lock.attacks, true); assertExpectedRows(lock.consumers, false);
  if (lock.attacks.length !== 8 || lock.consumers.length !== 6 || new Set([...lock.attacks, ...lock.consumers].map((row) => row.id)).size !== 14) fail("external_audit_lock_case_set_invalid");
  return lock;
}

export function inspectNpmTarball(bytes) {
  let tar;
  try { tar = gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }); } catch { fail("external_audit_tarball_gzip_invalid"); }
  let manifest = null;
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = text(header.subarray(0, 100)); const prefix = text(header.subarray(345, 500)); const entry = prefix ? `${prefix}/${name}` : name;
    if (!entry || entry.startsWith("/") || entry.includes("\\") || entry.split("/").includes("..")) fail("external_audit_tarball_path_invalid");
    const sizeText = text(header.subarray(124, 136)).trim(); const size = Number.parseInt(sizeText || "0", 8); const type = header[156];
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) fail("external_audit_tarball_entry_invalid");
    if (entry === "package/package.json") {
      if (manifest || ![0, 48].includes(type) || size > 1024 * 1024) fail("external_audit_tarball_manifest_invalid");
      try { manifest = JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString("utf8")); } catch { fail("external_audit_tarball_manifest_invalid"); }
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!manifest) fail("external_audit_tarball_manifest_missing");
  return manifest;
}

export function verifyExternalAuditResult(envelope, options) {
  const { lock } = options;
  assertExactKeys(envelope, ["payload", "schema_version", "signature"], "envelope");
  if (envelope.schema_version !== "external-audit-result-v1") fail("external_audit_result_schema_invalid");
  assertExactKeys(envelope.signature, ["algorithm", "key_id", "value"], "signature");
  if (envelope.signature.algorithm !== "Ed25519" || envelope.signature.key_id !== lock.signing_key_id || typeof envelope.signature.value !== "string") fail("external_audit_result_signature_identity_invalid");
  const publicKey = createPublicKey({ key: Buffer.from(lock.signing_public_key_spki_der_base64, "base64"), type: "spki", format: "der" });
  if (!verify(null, Buffer.from(canonical(envelope.payload)), publicKey, Buffer.from(envelope.signature.value, "base64url"))) fail("external_audit_result_signature_invalid");
  return verifyExternalAuditPayload(envelope.payload, options);
}

export function verifyExternalAuditPayload(payload, options) {
  const { lock, candidateSha256, candidateVersion, hostReleaseSha256, expectedPlatform = process.platform, expectedArch = process.arch } = options;
  assertExactKeys(payload, ["attacks", "audit_package", "candidate", "completed_at", "consumers", "execution_scope", "expected_outcomes_sha256", "host_release", "overall_status", "platform", "schema_version"], "payload");
  assertExactKeys(payload.audit_package, ["integrity", "name", "version"], "payload_audit_package"); assertExactKeys(payload.candidate, ["name", "sha256", "version"], "payload_candidate"); assertExactKeys(payload.platform, ["arch", "node", "platform"], "payload_platform");
  if (payload.schema_version !== "external-audit-result-payload-v1" || payload.execution_scope !== "full" || payload.overall_status !== "passed") fail("external_audit_result_scope_invalid");
  if (payload.audit_package?.name !== lock.package || payload.audit_package?.version !== lock.version || payload.audit_package?.integrity !== lock.integrity || payload.expected_outcomes_sha256 !== lock.expected_outcomes_sha256) fail("external_audit_result_audit_identity_invalid");
  if (payload.candidate?.name !== "project-tiny-context-harness" || payload.candidate?.version !== candidateVersion || payload.candidate?.sha256 !== candidateSha256) fail("external_audit_result_candidate_identity_invalid");
  if (payload.platform?.platform !== expectedPlatform || payload.platform?.arch !== expectedArch || typeof payload.platform?.node !== "string") fail("external_audit_result_platform_invalid");
  assertExactKeys(payload.host_release, ["arch", "manifest_sha256", "platform", "root_key_id", "sha256"], "payload_host_release");
  const hostPlatform = expectedPlatform === "win32" ? "windows" : expectedPlatform === "darwin" ? "macos" : expectedPlatform;
  if (!hex(hostReleaseSha256) || payload.host_release.sha256 !== hostReleaseSha256 || !hex(payload.host_release.manifest_sha256) || payload.host_release.root_key_id !== lock.host_release_root_key_id || payload.host_release.platform !== hostPlatform || payload.host_release.arch !== expectedArch) fail("external_audit_result_host_release_invalid");
  if (!Number.isFinite(Date.parse(payload.completed_at))) fail("external_audit_result_time_invalid");
  verifyAttacks(payload.attacks, lock.attacks); verifyConsumers(payload.consumers, lock.consumers);
  return payload;
}

async function main() {
  const candidatePath = await realpath(requiredOption("--candidate-tarball"));
  const hostReleasePath = await realpath(requiredOption("--host-release"));
  const lock = await readExternalAuditLock(option("--lock") ? path.resolve(option("--lock")) : defaultLockPath);
  const candidateBytes = await readFile(candidatePath); const candidateSha256 = sha256(candidateBytes); const candidateManifest = inspectNpmTarball(candidateBytes);
  const hostReleaseSha256 = sha256(await readFile(hostReleasePath));
  if (option("--host-release-sha256") && option("--host-release-sha256") !== hostReleaseSha256) fail("host_release_sha256_mismatch");
  if (candidateManifest.name !== "project-tiny-context-harness" || candidateManifest.bin?.["ty-context"] !== "dist/cli.js" || typeof candidateManifest.version !== "string") fail("external_audit_candidate_package_invalid");
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-external-audit-adapter-"));
  try {
    const auditPath = path.join(root, `${lock.package}-${lock.version}.tgz`);
    if (option("--audit-tarball")) await writeFile(auditPath, await readFile(await realpath(option("--audit-tarball"))));
    else await download(lock.tarball_url, auditPath);
    const auditBytes = await readFile(auditPath); verifyAuditArtifact(auditBytes, lock);
    const npmCli = await trustedNpmCli();
    const installRoot = path.join(root, "install"); await mkdir(installRoot, { recursive: true }); await writeFile(path.join(installRoot, "package.json"), '{"private":true}\n');
    await run(process.execPath, [npmCli, "install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", auditPath], installRoot, 5 * 60_000);
    const cli = path.join(installRoot, "node_modules", lock.package, "src", "cli.mjs"); const resultPath = option("--result") ? path.resolve(option("--result")) : path.join(root, "external-audit-result.json");
    const { privateKey, publicKey } = generateKeyPairSync("ed25519"); const provisionalKeyPath = path.join(root, "provisional-result-private.pem"); const provisionalDer = publicKey.export({ type: "spki", format: "der" }); const provisionalKeyId = sha256(provisionalDer);
    if (provisionalKeyId === lock.signing_key_id) fail("external_audit_provisional_key_conflict");
    await writeFile(provisionalKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    await run(process.execPath, [cli, "--candidate", candidatePath, "--candidate-sha256", candidateSha256, "--host-release", hostReleasePath, "--host-release-sha256", hostReleaseSha256, "--audit-integrity", lock.integrity, "--signing-key", provisionalKeyPath, "--signing-key-id", provisionalKeyId, "--result", resultPath], installRoot, 30 * 60_000, { ...process.env, TY_CONTEXT_AUDIT_NPM_CLI: npmCli });
    const resultText = await readFile(resultPath, "utf8"); const envelope = JSON.parse(resultText); if (resultText.trim() !== canonical(envelope)) fail("external_audit_result_noncanonical");
    assertExactKeys(envelope, ["payload", "schema_version", "signature"], "provisional_envelope"); assertExactKeys(envelope.signature, ["algorithm", "key_id", "value"], "provisional_signature");
    if (envelope.schema_version !== "external-audit-result-v1" || envelope.signature.algorithm !== "Ed25519" || envelope.signature.key_id !== provisionalKeyId || !verify(null, Buffer.from(canonical(envelope.payload)), publicKey, Buffer.from(envelope.signature.value, "base64url"))) fail("external_audit_provisional_signature_invalid");
    const payload = verifyExternalAuditPayload(envelope.payload, { lock, candidateSha256, candidateVersion: candidateManifest.version, hostReleaseSha256 });
    process.stdout.write(`external_audit_provisional=passed candidate_sha256=${candidateSha256} host_release_sha256=${hostReleaseSha256} attacks=${payload.attacks.length} consumers=${payload.consumers.length}\n`);
  } finally { await rm(root, { recursive: true, force: true }); }
}

export function verifyAuditArtifact(bytes, lock) {
  const expectedSha512 = Buffer.from(lock.integrity.slice("sha512-".length), "base64");
  if (!createHash("sha512").update(bytes).digest().equals(expectedSha512) || sha256(bytes) !== lock.tarball_sha256) fail("external_audit_artifact_integrity_invalid");
  const manifest = inspectNpmTarball(bytes);
  if (manifest.name !== lock.package || manifest.version !== lock.version || manifest.bin?.["ty-context-external-audit"] !== "src/cli.mjs") fail("external_audit_artifact_package_invalid");
}
function verifyAttacks(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) fail("external_audit_result_attack_set_invalid");
  for (let index = 0; index < expected.length; index += 1) { const row = actual[index], wanted = expected[index]; assertExactKeys(row, ["actual_code", "actual_status", "duration_ms", "evidence_sha256", "expected_code", "expected_status", "id", "passed"], `attack:${wanted.id}`); if (row.id !== wanted.id || row.expected_status !== wanted.expected_status || row.expected_code !== wanted.expected_code || row.actual_status !== wanted.expected_status || row.actual_code !== wanted.expected_code || row.passed !== true || !hex(row.evidence_sha256) || !nonnegative(row.duration_ms)) fail(`external_audit_result_attack_failed:${wanted.id}`); }
}
function verifyConsumers(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) fail("external_audit_result_consumer_set_invalid");
  for (let index = 0; index < expected.length; index += 1) { const row = actual[index], wanted = expected[index]; assertExactKeys(row, ["actual_code", "actual_status", "browser_key", "dependency_key", "duration_ms", "evidence_sha256", "expected_status", "finding_codes", "id", "manager", "passed"], `consumer:${wanted.id}`); const browserExpected = wanted.id === "playwright"; if (row.id !== wanted.id || row.expected_status !== wanted.expected_status || row.actual_status !== wanted.expected_status || row.actual_code !== "ok" || row.passed !== true || row.manager !== "npm" || !hex(row.dependency_key) || (browserExpected ? !hex(row.browser_key) : row.browser_key !== null) || !Array.isArray(row.finding_codes) || row.finding_codes.length !== 0 || !hex(row.evidence_sha256) || !nonnegative(row.duration_ms)) fail(`external_audit_result_consumer_failed:${wanted.id}`); }
}
function assertExpectedRows(rows, attacks) { if (!Array.isArray(rows)) fail("external_audit_lock_case_set_invalid"); for (const row of rows) { const keys = attacks ? ["expected_code", "expected_status", "id"] : ["expected_status", "id"]; assertExactKeys(row, keys, "lock_case"); if (typeof row.id !== "string" || typeof row.expected_status !== "string" || (attacks && typeof row.expected_code !== "string")) fail("external_audit_lock_case_invalid"); } }
function assertExactKeys(value, keys, label) { if (!value || typeof value !== "object" || Array.isArray(value) || canonical(Object.keys(value).sort()) !== canonical([...keys].sort())) fail(`external_audit_${label}_keys_invalid`); }
async function download(url, file) { const response = await fetch(url, { redirect: "follow" }); if (!response.ok) fail(`external_audit_download_failed:${response.status}`); const bytes = Buffer.from(await response.arrayBuffer()); await writeFile(file, bytes, { flag: "wx" }); }
function run(file, argv, cwd, timeout, env = process.env) { return new Promise((resolve, reject) => { const child = spawn(file, argv, { cwd, env, shell: false, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] }); const timer = setTimeout(() => { child.kill(); reject(new Error(`external_audit_command_timeout:${path.basename(file)}`)); }, timeout); timer.unref(); child.once("error", (error) => { clearTimeout(timer); reject(error); }); child.once("exit", (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`external_audit_command_failed:${path.basename(file)}:${code}`)); }); }); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
function text(bytes) { const zero = bytes.indexOf(0); return bytes.subarray(0, zero < 0 ? bytes.length : zero).toString("utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function hex(value) { return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value); }
function nonnegative(value) { return Number.isInteger(value) && value >= 0; }
async function trustedNpmCli() { const base = path.dirname(process.execPath); for (const candidate of [path.join(base, "node_modules", "npm", "bin", "npm-cli.js"), path.join(path.dirname(base), "lib", "node_modules", "npm", "bin", "npm-cli.js")]) { try { return await realpath(candidate); } catch {} } fail("external_audit_trusted_npm_cli_unavailable"); }
function option(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
function requiredOption(name) { const value = option(name); if (!value) fail(`missing_${name.slice(2).replace(/-/gu, "_")}`); return value; }
function fail(code) { throw new Error(code); }

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) await main();
