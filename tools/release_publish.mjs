#!/usr/bin/env node

import { appendFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commandLogEntry, delay, parseJsonFromOutput, requireValue, runCommand, singleLine } from "./release_publish_helpers.mjs";
import { stubbedReleasePublishResult } from "./release_publish_test_stubs.mjs";
import { assertReleaseUpgradeImpactEvidence } from "./release_upgrade_impact.mjs";
import { assertReleaseArtifactAttestation, assertReleaseEnvironmentIdentity } from "./release_artifact_identity.mjs";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "project-tiny-context-harness";

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv) {
  const parsed = {
    root: defaultRepoRoot,
    localFallback: false,
    yes: false,
    registrySmoke: false,
    otp: null,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.root = path.resolve(requireValue(argv, ++index, "--root"));
    } else if (arg === "--local-fallback") {
      parsed.localFallback = true;
    } else if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
    } else if (arg === "--registry-smoke" || arg === "--smoke") {
      parsed.registrySmoke = true;
    } else if (arg === "--otp") {
      parsed.otp = requireValue(argv, ++index, "--otp");
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`release_publish.mjs

Publishes only the already prepared, committed and pushed package version.

Usage:
  node tools/release_publish.mjs
  node tools/release_publish.mjs --local-fallback --yes [--registry-smoke] [--otp 123456]

Without --local-fallback, this validates release prerequisites and prints the
Trusted Publishing workflow instructions. Local npm publication is an explicit
fallback and requires --local-fallback --yes.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }
  if (args.localFallback && !args.yes) {
    throw new Error("Local fallback publishing requires --yes.");
  }

  const version = await readPackageVersion();
  await assertPublishPrerequisites(version);

  if (!args.localFallback) {
    console.log("Trusted Publishing is preferred.");
    console.log("Run GitHub Actions workflow .github/workflows/npm-publish.yml with:");
    console.log(`  expected_version: ${version}`);
    console.log("  dry_run: true");
    console.log("Then rerun with dry_run: false if the dry run passes.");
    console.log("Use --local-fallback --yes only when workflow dispatch is unavailable.");
    return;
  }

  await run("npm", ["whoami"], { capture: true });
  const timings = [];
  const pack = await timed(timings, "prepared artifact verification", () => readPreparedArtifact(version));
  await timed(timings, "complete package tests", () =>
    run("npm", ["test", "--workspace", packageName])
  );
  await timed(timings, "exact prepared tarball smoke", () =>
    run("node", ["tools/release_tarball_smoke.mjs", "--tarball", pack.tarballRelativePath])
  );
  await timed(timings, "publish", () => publishTarball(pack.tarballRelativePath));
  await timed(timings, "registry latest verification", () => waitForLatest(version));
  if (args.registrySmoke) {
    await timed(timings, "registry smoke", () => installedConsumerSmoke(version));
  }
  await timed(timings, "tag push", () => ensureTag(version));
  const releaseResult = await timed(timings, "GitHub Release", () => publishGitHubRelease(version));

  console.log("");
  console.log(`Published ${packageName}@${version}`);
  console.log(`Registry latest verified as ${version}.`);
  console.log(releaseResult);
  printTimings("Release publication timings:", timings);
}

async function assertPublishPrerequisites(version) {
  const status = await run("git", ["status", "--porcelain"], { capture: true });
  if (status.stdout.trim()) {
    throw new Error("Refusing to publish with a dirty working tree.");
  }
  const branch = (await run("git", ["branch", "--show-current"], { capture: true })).stdout.trim();
  if (branch !== "main") {
    throw new Error(`Refusing to publish from ${branch || "detached HEAD"}; switch to main first.`);
  }
  const head = (await run("git", ["rev-parse", "HEAD"], { capture: true })).stdout.trim();
  const originMain = (await run("git", ["rev-parse", "refs/remotes/origin/main"], { capture: true })).stdout.trim();
  if (head !== originMain) {
    throw new Error("Refusing to publish because HEAD is not pushed to origin/main.");
  }
  if (await registryHasVersion(version)) {
    throw new Error(`${packageName}@${version} already exists on npm.`);
  }
  await readReleaseUpdateMode(version);
}

async function readPackageVersion() {
  const manifest = JSON.parse(await readFile(path.join(args.root, "packages", "ty-context", "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid package version: ${manifest.version}`);
  }
  return manifest.version;
}

async function readReleaseUpdateMode(version) {
  const packetPath = path.join(args.root, "docs", "launch", `github-release-${version}.md`);
  if (!existsSync(packetPath)) {
    throw new Error(`Missing release packet: ${path.relative(args.root, packetPath)}`);
  }
  const packet = await readFile(packetPath, "utf8");
  const match = packet.match(/Update Mode:\s*`(sync-only|upgrade-required|manual-required)`/);
  if (!match) {
    throw new Error(`Release update mode missing from ${path.relative(args.root, packetPath)}`);
  }
  const releaseUpdateMode = match[1];
  assertReleaseUpgradeImpactEvidence(packet, releaseUpdateMode, path.relative(args.root, packetPath));
  return releaseUpdateMode;
}

async function registryHasVersion(version) {
  const result = await run("npm", ["view", `${packageName}@${version}`, "version", "--json"], {
    capture: true,
    allowFailure: true
  });
  return result.code === 0;
}

async function readPreparedArtifact(version) {
  const attestationPath = path.join(args.root, "docs", "launch", `release-artifact-${version}.json`);
  const attestation = JSON.parse(await readFile(attestationPath, "utf8"));
  assertReleaseArtifactAttestation(attestation, { packageName, version });
  await assertReleaseEnvironmentIdentity(attestation, args.root);
  const relative = path
    .join(".artifacts", "releases", "prepared", attestation.filename)
    .replace(/\\/g, "/");
  if (process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    return { tarballRelativePath: relative, sha256: attestation.sha256 };
  }
  const content = await readFile(path.join(args.root, relative)).catch(() => {
    throw new Error(
      `Prepared tarball is missing; rerun release:prepare and publish the byte-identical ${attestation.filename}`
    );
  });
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== attestation.sha256) {
    throw new Error(`Prepared tarball hash mismatch: expected ${attestation.sha256}, got ${actual}`);
  }
  return { tarballRelativePath: relative, sha256: actual };
}

async function publishTarball(tarballRelativePath) {
  const commandArgs = ["publish", tarballRelativePath, "--access", "public"];
  if (args.otp) {
    commandArgs.push("--otp", args.otp);
  }
  await run("npm", commandArgs);
}

async function waitForLatest(version) {
  let last;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    last = await npmView(["version", "dist-tags.latest", "dist.integrity", "--json"]);
    if (last.version === version && last["dist-tags.latest"] === version) {
      return last;
    }
    await delay(3000);
  }
  throw new Error(`Registry latest did not resolve to ${version}; last response: ${JSON.stringify(last)}`);
}

async function npmView(fields) {
  const result = await run("npm", ["view", packageName, ...fields], { capture: true });
  return parseJsonFromOutput(result.output);
}

async function installedConsumerSmoke(version) {
  const tmp = await mkdirTemp();
  await run("npm", ["init", "-y"], { cwd: tmp });
  await run("npm", ["install", "-D", `${packageName}@${version}`], { cwd: tmp });
  const installedVersion = (
    await run("node", ["-p", "require('./node_modules/project-tiny-context-harness/package.json').version"], {
      cwd: tmp,
      capture: true
    })
  ).stdout.trim();
  if (installedVersion !== version) {
    throw new Error(`Installed package version ${installedVersion} did not match ${version}`);
  }
  await run("npx", ["--no-install", "ty-context", "init", "--harness-folder", ".codex"], { cwd: tmp });
  const doctor = await run("npx", ["--no-install", "ty-context", "doctor"], { cwd: tmp, capture: true });
  if (!doctor.output.includes(`core package: ${packageName}@${version}`)) {
    throw new Error("Doctor output did not include the expected package version.");
  }
}

async function mkdirTemp() {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(path.join(os.tmpdir(), "ty-context-release-smoke-"));
}

async function ensureTag(version) {
  const tag = `v${version}`;
  const existing = (await run("git", ["tag", "-l", tag], { capture: true })).stdout.trim();
  if (!existing) {
    await run("git", ["tag", "-a", tag, "-m", `Project Tiny Context Harness ${version}`]);
  } else {
    const head = (await run("git", ["rev-parse", "HEAD"], { capture: true })).stdout.trim();
    const tagHead = (await run("git", ["rev-list", "-n", "1", tag], { capture: true })).stdout.trim();
    if (head !== tagHead) {
      throw new Error(`${tag} exists but does not point at HEAD.`);
    }
  }
  await run("git", ["push", "origin", tag]);
}

async function publishGitHubRelease(version) {
  try {
    const result = await run("node", ["tools/github_release_publish.mjs", "--version", version], {
      capture: true
    });
    return singleLine(result.output.trim() || `GitHub Release v${version} updated.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/gh|auth|not logged|not authenticated|could not find/i.test(message)) {
      return "GitHub Release skipped: gh not authenticated";
    }
    throw error;
  }
}

async function run(command, commandArgs, options = {}) {
  if (process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    appendFileSync(
      process.env.TY_CONTEXT_RELEASE_COMMAND_LOG,
      `${JSON.stringify(commandLogEntry(command, commandArgs))}\n`
    );
    return stubbedReleasePublishResult({ command, commandArgs, options, root: args.root, packageName });
  }

  return runCommand(command, commandArgs, { ...options, cwd: options.cwd ?? args.root });
}

async function timed(timings, label, action) {
  const started = Date.now();
  try {
    return await action();
  } finally {
    timings.push({ label, ms: Date.now() - started });
  }
}

function printTimings(title, timings) {
  console.log(title);
  for (const timing of timings) {
    console.log(`  - ${timing.label}: ${timing.ms}ms`);
  }
}
