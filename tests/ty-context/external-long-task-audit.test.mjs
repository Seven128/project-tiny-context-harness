import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  inspectNpmTarball,
  readExternalAuditLock,
  verifyAuditArtifact,
  verifyExternalAuditResult,
} from "../../tools/external_long_task_audit.mjs";

test("external audit lock pins the immutable release, expected population, and signing key", async () => {
  const lock = await readExternalAuditLock();
  assert.equal(lock.package, "project-tiny-context-harness-audit");
  assert.equal(lock.version, "0.1.0");
  assert.equal(lock.attacks.length, 8);
  assert.equal(lock.consumers.length, 6);
  assert.equal(lock.host_release_root_key_id, "59d4e01a5ca1c015556772b06a370f93ca2e2369e42b65c8d5e6bfa5f5bfc8e9");
  assert.match(lock.release_commit, /^[a-f0-9]{40}$/u);
});

test("the local adapter gives candidate execution only a disposable result key", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../../tools/external_long_task_audit.mjs", import.meta.url), "utf8"));
  assert.match(source, /generateKeyPairSync\("ed25519"\)/u);
  assert.match(source, /TY_CONTEXT_AUDIT_NPM_CLI: npmCli/u);
  assert.match(source, /trustedNpmCli\(\)/u);
  assert.doesNotMatch(source, /TY_CONTEXT_EXTERNAL_AUDIT_SIGNING_KEY|external_audit_signing_key_required/u);
});

test("audit artifact identity is read from the tgz before filesystem extraction", async () => {
  const base = await readExternalAuditLock();
  const bytes = packageTarball({ name: base.package, version: base.version, bin: { "ty-context-external-audit": "src/cli.mjs" } });
  const lock = { ...base, tarball_sha256: digest("sha256", bytes), integrity: `sha512-${digest("sha512", bytes, "base64")}` };
  assert.equal(inspectNpmTarball(bytes).name, base.package);
  assert.doesNotThrow(() => verifyAuditArtifact(bytes, lock));
  assert.throws(() => verifyAuditArtifact(Buffer.concat([bytes, Buffer.from("changed")]), lock), /external_audit_artifact_integrity_invalid/);
});

test("only a signed full exact 8+6 passing result is accepted", async () => {
  const base = await readExternalAuditLock();
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  const lock = { ...base, signing_key_id: digest("sha256", publicDer), signing_public_key_spki_der_base64: publicDer.toString("base64") };
  const candidateSha256 = "a".repeat(64); const candidateVersion = "0.4.0";
  const hostReleaseSha256 = "f".repeat(64);
  const payload = {
    schema_version: "external-audit-result-payload-v1",
    audit_package: { name: lock.package, version: lock.version, integrity: lock.integrity },
    expected_outcomes_sha256: lock.expected_outcomes_sha256,
    candidate: { name: "project-tiny-context-harness", version: candidateVersion, sha256: candidateSha256 },
    platform: { platform: process.platform, arch: process.arch, node: process.version },
    host_release: { sha256: hostReleaseSha256, manifest_sha256: "1".repeat(64), root_key_id: lock.host_release_root_key_id, platform: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux", arch: process.arch },
    execution_scope: "full",
    attacks: lock.attacks.map((row) => ({ id: row.id, expected_status: row.expected_status, expected_code: row.expected_code, actual_status: row.expected_status, actual_code: row.expected_code, passed: true, duration_ms: 1, evidence_sha256: "b".repeat(64) })),
    consumers: lock.consumers.map((row) => ({ id: row.id, expected_status: row.expected_status, actual_status: row.expected_status, actual_code: "ok", finding_codes: [], passed: true, duration_ms: 1, manager: "npm", dependency_key: "c".repeat(64), browser_key: row.id === "playwright" ? "d".repeat(64) : null, evidence_sha256: "e".repeat(64) })),
    overall_status: "passed",
    completed_at: new Date().toISOString(),
  };
  const envelope = signed(payload, lock.signing_key_id, privateKey);
  assert.equal(verifyExternalAuditResult(envelope, { lock, candidateSha256, candidateVersion, hostReleaseSha256 }).overall_status, "passed");
  const diagnostic = structuredClone(envelope); diagnostic.payload.execution_scope = "diagnostic:happy_path"; resign(diagnostic, privateKey);
  assert.throws(() => verifyExternalAuditResult(diagnostic, { lock, candidateSha256, candidateVersion, hostReleaseSha256 }), /external_audit_result_scope_invalid/);
  const missing = structuredClone(envelope); missing.payload.consumers.pop(); resign(missing, privateKey);
  assert.throws(() => verifyExternalAuditResult(missing, { lock, candidateSha256, candidateVersion, hostReleaseSha256 }), /external_audit_result_consumer_set_invalid/);
  const wrongHost = structuredClone(envelope); wrongHost.payload.host_release.sha256 = "2".repeat(64); resign(wrongHost, privateKey);
  assert.throws(() => verifyExternalAuditResult(wrongHost, { lock, candidateSha256, candidateVersion, hostReleaseSha256 }), /external_audit_result_host_release_invalid/);
  const forged = structuredClone(envelope); forged.payload.candidate.sha256 = "f".repeat(64);
  assert.throws(() => verifyExternalAuditResult(forged, { lock, candidateSha256, candidateVersion, hostReleaseSha256 }), /external_audit_result_signature_invalid/);
});

function signed(payload, keyId, privateKey) {
  const envelope = { schema_version: "external-audit-result-v1", payload, signature: { algorithm: "Ed25519", key_id: keyId, value: "" } };
  resign(envelope, privateKey); return envelope;
}
function resign(envelope, privateKey) { envelope.signature.value = sign(null, Buffer.from(canonical(envelope.payload)), privateKey).toString("base64url"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
function digest(algorithm, bytes, encoding = "hex") { return createHash(algorithm).update(bytes).digest(encoding); }
function packageTarball(manifest) {
  const body = Buffer.from(JSON.stringify(manifest)); const header = Buffer.alloc(512); header.write("package/package.json"); header.write("0000644\0", 100); header.write("0000000\0", 108); header.write("0000000\0", 116); header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124); header.write("00000000000\0", 136); header.fill(32, 148, 156); header[156] = "0".charCodeAt(0); header.write("ustar\0", 257); header.write("00", 263); const sum = [...header].reduce((total, byte) => total + byte, 0); header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148); const padding = Buffer.alloc(Math.ceil(body.length / 512) * 512 - body.length); return gzipSync(Buffer.concat([header, body, padding, Buffer.alloc(1024)]));
}
