#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RELEASE_ARTIFACT_SCHEMA_V2,
  assertReleaseArtifactAttestation,
  assertReleaseEnvironmentIdentity,
  readReleaseEnvironmentIdentity
} from "./release_artifact_identity.mjs";
import { parsePackJson } from "./release_publish_helpers.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const root = path.resolve(optionalValue("--root") ?? defaultRoot);
const version = requiredValue("--version");
const dryRun = booleanValue("--dry-run");
const packJsonFile = insideRoot(requiredValue("--pack-json"), "pack_json");
const tarballDir = insideRoot(requiredValue("--tarball-dir"), "tarball_dir");
const resultFile = insideRoot(requiredValue("--result"), "result");
const packageName = "project-tiny-context-harness";

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("workflow_release_version_invalid");
}

const packed = parsePackJson(await readFile(packJsonFile, "utf8"));
const expectedFilename = `${packageName}-${version}.tgz`;
if (packed.filename !== expectedFilename || path.basename(packed.filename) !== packed.filename) {
  throw new Error("workflow_release_pack_filename_mismatch");
}
const tarball = path.resolve(tarballDir, packed.filename);
if (!isInside(tarballDir, tarball)) {
  throw new Error("workflow_release_tarball_path_escape");
}
const sha256 = createHash("sha256").update(await readFile(tarball)).digest("hex");

const attestation = dryRun
  ? {
      schema_version: RELEASE_ARTIFACT_SCHEMA_V2,
      package_name: packageName,
      version,
      filename: packed.filename,
      sha256,
      ...(await readReleaseEnvironmentIdentity(root))
    }
  : JSON.parse(
      await readFile(path.join(root, "docs", "launch", `release-artifact-${version}.json`), "utf8")
    );

assertReleaseArtifactAttestation(attestation, { packageName, version });
await assertReleaseEnvironmentIdentity(attestation, root);
if (attestation.filename !== packed.filename || attestation.sha256 !== sha256) {
  throw new Error("workflow_release_artifact_identity_mismatch");
}

await mkdir(path.dirname(resultFile), { recursive: true });
await writeFile(resultFile, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
console.log(
  `workflow release artifact verified mode=${dryRun ? "dry-run" : "release"} filename=${attestation.filename} sha256=${sha256}`
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

function booleanValue(flag) {
  const value = requiredValue(flag);
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${flag} must be true or false`);
}

function insideRoot(value, label) {
  const absolute = path.resolve(root, value);
  if (!isInside(root, absolute)) throw new Error(`workflow_release_${label}_path_escape`);
  return absolute;
}

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
