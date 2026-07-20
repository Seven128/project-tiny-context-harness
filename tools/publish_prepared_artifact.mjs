#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { delay, parseJsonFromOutput, runCommand } from "./release_publish_helpers.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "project-tiny-context-harness";

export function artifactIntegrity(content) {
  return `sha512-${createHash("sha512").update(content).digest("base64")}`;
}

export function assertRegistryArtifact(state, { version, integrity }) {
  if (state.version !== version || state.integrity !== integrity) {
    throw new Error(
      `Registry artifact mismatch for ${packageName}@${version}: expected ${integrity}, got ${JSON.stringify(state)}`
    );
  }
}

export function registryArtifactFromView(value) {
  const record = Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {};
  }
  return {
    version: record.version,
    integrity: record["dist.integrity"] ?? record.integrity ?? record.dist?.integrity
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const root = path.resolve(optionalValue(argv, "--root") ?? defaultRoot);
  const version = requiredValue(argv, "--version");
  const tarball = insideRoot(root, requiredValue(argv, "--tarball"));
  const expectedFilename = `${packageName}-${version}.tgz`;
  if (path.basename(tarball) !== expectedFilename) {
    throw new Error(`Prepared tarball filename mismatch: expected ${expectedFilename}`);
  }
  const integrity = artifactIntegrity(await readFile(tarball));

  const existing = await registryState(version, root);
  if (existing) {
    assertRegistryArtifact(existing, { version, integrity });
    console.log(`registry already contains the exact ${packageName}@${version} artifact; publish skipped`);
    return;
  }

  await runCommand("npm", ["publish", relativePath(root, tarball), "--access", "public"], {
    cwd: root
  });
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const published = await registryState(version, root);
    if (published) {
      assertRegistryArtifact(published, { version, integrity });
      console.log(`published and verified ${packageName}@${version} integrity=${integrity}`);
      return;
    }
    await delay(3000);
  }
  throw new Error(`Registry did not expose ${packageName}@${version} after publish.`);
}

async function registryState(version, root) {
  const result = await runCommand(
    "npm",
    ["view", `${packageName}@${version}`, "version", "dist.integrity", "--json"],
    { cwd: root, capture: true, allowFailure: true }
  );
  if (result.code !== 0) {
    if (/\bE404\b|\b404\b|No match found for version/iu.test(result.output)) {
      return null;
    }
    throw new Error(`Registry lookup failed for ${packageName}@${version}: ${result.output.trim()}`);
  }
  const parsed = parseJsonFromOutput(result.output);
  return registryArtifactFromView(parsed);
}

function requiredValue(argv, flag) {
  const value = optionalValue(argv, flag);
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function optionalValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index < 0 ? null : argv[index + 1];
}

function insideRoot(root, value) {
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("publish_prepared_tarball_path_escape");
  }
  return absolute;
}

function relativePath(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join("/");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
