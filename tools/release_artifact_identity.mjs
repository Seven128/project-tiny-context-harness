import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const RELEASE_ARTIFACT_SCHEMA_V2 = "ty-context-release-artifact-v2";

export async function readReleaseEnvironmentIdentity(root) {
  const lockfile = await readFile(path.join(root, "package-lock.json"));
  return {
    node_version: process.version,
    npm_version: npmVersion(),
    lockfile_sha256: createHash("sha256").update(lockfile).digest("hex")
  };
}

export function assertReleaseArtifactAttestation(attestation, { packageName, version }) {
  if (
    attestation?.schema_version !== RELEASE_ARTIFACT_SCHEMA_V2 ||
    attestation.package_name !== packageName ||
    attestation.version !== version ||
    typeof attestation.filename !== "string" ||
    path.basename(attestation.filename) !== attestation.filename ||
    !/^[a-f0-9]{64}$/.test(attestation.sha256 ?? "") ||
    !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(attestation.node_version ?? "") ||
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(attestation.npm_version ?? "") ||
    !/^[a-f0-9]{64}$/.test(attestation.lockfile_sha256 ?? "")
  ) {
    throw new Error("Invalid immutable release artifact attestation");
  }
}

export async function assertReleaseEnvironmentIdentity(attestation, root) {
  const actual = await readReleaseEnvironmentIdentity(root);
  for (const field of ["node_version", "npm_version", "lockfile_sha256"]) {
    if (attestation[field] !== actual[field]) {
      throw new Error(
        `Prepared release ${field} mismatch: expected ${attestation[field]}, got ${actual[field]}`
      );
    }
  }
  return actual;
}

function npmVersion() {
  const executable =
    process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm --version"]
      : ["--version"];
  return execFileSync(executable, args, {
    encoding: "utf8",
    windowsHide: true
  }).trim();
}
