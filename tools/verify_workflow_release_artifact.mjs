#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertReleaseArtifactAttestation,
  assertReleaseSourceIdentity
} from "./release_artifact_identity.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const root = path.resolve(optionalValue("--root") ?? defaultRoot);
const version = requiredValue("--version");
const sourceCommit = requiredValue("--source-commit").toLowerCase();
const attestationFile = insideRoot(requiredValue("--attestation"), "attestation");
const tarball = insideRoot(requiredValue("--tarball"), "tarball");
const packageName = "project-tiny-context-harness";

if (!/^[a-f0-9]{40}$/.test(sourceCommit)) {
  throw new Error("workflow_release_source_commit_invalid");
}

const attestation = JSON.parse(await readFile(attestationFile, "utf8"));
assertReleaseArtifactAttestation(attestation, { packageName, version });
if (attestation.source_commit !== sourceCommit) {
  throw new Error(
    `Workflow release source commit mismatch: expected ${sourceCommit}, got ${attestation.source_commit ?? "missing"}`
  );
}
await assertReleaseSourceIdentity(attestation, root);
if (path.basename(tarball) !== attestation.filename) {
  throw new Error(`Workflow release filename mismatch: expected ${attestation.filename}`);
}
const actual = createHash("sha256").update(await readFile(tarball)).digest("hex");
if (actual !== attestation.sha256) {
  throw new Error(`Workflow release tarball SHA-256 mismatch: expected ${attestation.sha256}, got ${actual}`);
}

console.log(
  `workflow release artifact verified source_commit=${sourceCommit} filename=${attestation.filename} sha256=${actual}`
);

function requiredValue(flag) {
  const value = optionalValue(flag);
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function optionalValue(flag) {
  const index = argv.indexOf(flag);
  return index < 0 ? null : argv[index + 1];
}

function insideRoot(value, label) {
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`workflow_release_${label}_path_escape`);
  }
  return absolute;
}
