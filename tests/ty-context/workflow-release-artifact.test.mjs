import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "tools", "workflow_release_artifact.mjs");

test("workflow dry run binds one packed tarball without committed release authority", () => {
  const fixture = createFixture();
  try {
    const result = run(fixture.root, true);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const attestation = JSON.parse(readFileSync(fixture.resultFile, "utf8"));
    assert.equal(attestation.schema_version, "ty-context-release-artifact-v2");
    assert.equal(attestation.filename, fixture.filename);
    assert.equal(attestation.sha256, fixture.sha256);
    assert.match(result.stdout, /mode=dry-run/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("workflow real publish still requires matching committed release authority", () => {
  const fixture = createFixture();
  try {
    const missing = run(fixture.root, false);
    assert.notEqual(missing.status, 0);

    assert.equal(run(fixture.root, true).status, 0);
    const authority = path.join(
      fixture.root,
      "docs",
      "launch",
      `release-artifact-${fixture.version}.json`
    );
    mkdirSync(path.dirname(authority), { recursive: true });
    writeFileSync(authority, readFileSync(fixture.resultFile));
    const accepted = run(fixture.root, false);
    assert.equal(accepted.status, 0, `${accepted.stdout}\n${accepted.stderr}`);
    assert.match(accepted.stdout, /mode=release/u);

    writeFileSync(fixture.tarball, "changed bytes", "utf8");
    const mismatch = run(fixture.root, false);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /workflow_release_artifact_identity_mismatch/u);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "workflow-release-artifact-"));
  const version = "1.2.3";
  const filename = `project-tiny-context-harness-${version}.tgz`;
  const prepared = path.join(root, ".artifacts", "releases", "prepared");
  const tarball = path.join(prepared, filename);
  const packJson = path.join(prepared, "pack-result.json");
  const resultFile = path.join(prepared, "workflow-release-artifact.json");
  mkdirSync(prepared, { recursive: true });
  writeFileSync(path.join(root, "package-lock.json"), '{"lockfileVersion":3}\n', "utf8");
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
    packJson,
    resultFile,
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex")
  };
}

function run(root, dryRun) {
  return spawnSync(
    process.execPath,
    [
      script,
      "--root",
      root,
      "--version",
      "1.2.3",
      "--dry-run",
      String(dryRun),
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
