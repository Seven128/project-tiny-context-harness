import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { stableTextSha256 } from "../../tools/release_artifact_identity.mjs";
import {
  artifactIntegrity,
  assertRegistryArtifact,
  registryArtifactFromView
} from "../../tools/publish_prepared_artifact.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prepareScript = path.join(repoRoot, "tools", "workflow_release_artifact.mjs");
const verifyScript = path.join(repoRoot, "tools", "verify_workflow_release_artifact.mjs");
const sourceCommit = "a".repeat(40);

test("workflow preparation binds one tarball to the dispatch commit", () => {
  const fixture = createFixture();
  try {
    const result = runPrepare(fixture.root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const attestation = readAttestation(fixture);
    assert.equal(attestation.schema_version, "ty-context-release-artifact-v2");
    assert.equal(attestation.filename, fixture.filename);
    assert.equal(attestation.sha256, fixture.sha256);
    assert.equal(attestation.source_commit, sourceCommit);
    assert.equal(attestation.lockfile_sha256, stableTextSha256(fixture.lockfile));
    assert.match(result.stdout, /mode=dry-run/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("publish handoff ignores build-tool drift and CRLF while binding source and lockfile meaning", () => {
  const fixture = createFixture();
  try {
    assert.equal(runPrepare(fixture.root).status, 0);
    const attestation = readAttestation(fixture);
    attestation.node_version = "v99.1.0";
    attestation.npm_version = "99.2.0";
    writeFileSync(fixture.resultFile, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
    writeFileSync(fixture.lockfilePath, fixture.lockfile.replace(/\n/g, "\r\n"), "utf8");

    const accepted = runVerify(fixture.root, sourceCommit);
    assert.equal(accepted.status, 0, `${accepted.stdout}\n${accepted.stderr}`);
    assert.match(accepted.stdout, /workflow release artifact verified/u);

    const wrongCommit = runVerify(fixture.root, "b".repeat(40));
    assert.notEqual(wrongCommit.status, 0);
    assert.match(wrongCommit.stderr, /source commit mismatch/u);

    writeFileSync(fixture.lockfilePath, '{"lockfileVersion":4}\n', "utf8");
    const changedLockfile = runVerify(fixture.root, sourceCommit);
    assert.notEqual(changedLockfile.status, 0);
    assert.match(changedLockfile.stderr, /lockfile_sha256 mismatch/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("publish handoff rejects changed tarball bytes", () => {
  const fixture = createFixture();
  try {
    assert.equal(runPrepare(fixture.root).status, 0);
    writeFileSync(fixture.tarball, "changed bytes", "utf8");
    const mismatch = runVerify(fixture.root, sourceCommit);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /tarball SHA-256 mismatch/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("publish retry accepts only an already-published byte-identical artifact", () => {
  const content = Buffer.from("one immutable tarball");
  const integrity = artifactIntegrity(content);
  assert.match(integrity, /^sha512-/u);
  assert.doesNotThrow(() =>
    assertRegistryArtifact(
      { version: "1.2.3", integrity },
      { version: "1.2.3", integrity }
    )
  );
  assert.throws(
    () =>
      assertRegistryArtifact(
        { version: "1.2.3", integrity: artifactIntegrity(Buffer.from("other")) },
        { version: "1.2.3", integrity }
      ),
    /Registry artifact mismatch/u
  );
});

test("registry verification accepts npm 11 objects and npm 12 singleton arrays", () => {
  const expected = {
    version: "1.2.3",
    integrity: "sha512-exact"
  };
  const npmView = {
    version: expected.version,
    "dist.integrity": expected.integrity
  };
  assert.deepEqual(registryArtifactFromView(npmView), expected);
  assert.deepEqual(registryArtifactFromView([npmView]), expected);
  assert.deepEqual(registryArtifactFromView([]), {});
  assert.deepEqual(registryArtifactFromView([npmView, npmView]), {});
});

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "workflow-release-artifact-"));
  const version = "1.2.3";
  const filename = `project-tiny-context-harness-${version}.tgz`;
  const prepared = path.join(root, ".artifacts", "releases", "prepared");
  const tarball = path.join(prepared, filename);
  const packJson = path.join(prepared, "pack-result.json");
  const resultFile = path.join(prepared, "workflow-release-artifact.json");
  const lockfilePath = path.join(root, "package-lock.json");
  const lockfile = '{"lockfileVersion":3}\n';
  mkdirSync(prepared, { recursive: true });
  writeFileSync(lockfilePath, lockfile, "utf8");
  writeFileSync(tarball, "one immutable tarball", "utf8");
  writeFileSync(
    packJson,
    `${JSON.stringify({ "project-tiny-context-harness": { filename } })}\n`,
    "utf8"
  );
  return {
    root,
    version,
    filename,
    tarball,
    resultFile,
    lockfile,
    lockfilePath,
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex")
  };
}

function readAttestation(fixture) {
  return JSON.parse(readFileSync(fixture.resultFile, "utf8"));
}

function runPrepare(root) {
  return spawnSync(
    process.execPath,
    [
      prepareScript,
      "--root",
      root,
      "--version",
      "1.2.3",
      "--dry-run",
      "true",
      "--source-commit",
      sourceCommit,
      "--pack-json",
      ".artifacts/releases/prepared/pack-result.json",
      "--tarball-dir",
      ".artifacts/releases/prepared",
      "--result",
      ".artifacts/releases/prepared/workflow-release-artifact.json"
    ],
    { cwd: repoRoot, encoding: "utf8", windowsHide: true }
  );
}

function runVerify(root, commit) {
  return spawnSync(
    process.execPath,
    [
      verifyScript,
      "--root",
      root,
      "--version",
      "1.2.3",
      "--source-commit",
      commit,
      "--attestation",
      ".artifacts/releases/prepared/workflow-release-artifact.json",
      "--tarball",
      ".artifacts/releases/prepared/project-tiny-context-harness-1.2.3.tgz"
    ],
    { cwd: repoRoot, encoding: "utf8", windowsHide: true }
  );
}
