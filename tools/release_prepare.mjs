#!/usr/bin/env node

import { appendFileSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commandLogEntry, runCommand } from "./release_publish_helpers.mjs";
import { isUpgradeImplementationPath, isUpgradeSensitivePath, isUpgradeTestEvidencePath } from "./release_upgrade_impact.mjs";
import { prepareImmutableTarball } from "./release_artifact_prepare.mjs";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncReleaseVersionScript = path.join(defaultRepoRoot, "tools", "sync_release_version.mjs");
const packageName = "project-tiny-context-harness";
const workspaceName = "project-tiny-context-harness";
const releaseUpdateModes = ["sync-only", "upgrade-required", "manual-required"];
const releaseFocusedTests = [
  "tests/ty-context/release-flow-scripts.test.mjs",
  "tests/ty-context/sync-release-version.test.mjs",
  "tests/ty-context/launch-unblock-script.test.mjs",
  "tests/ty-context/launch-readiness-script.test.mjs",
  "tests/ty-context/npm-publish-access-script.test.mjs"
];

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv) {
  const parsed = {
    root: defaultRepoRoot,
    version: "patch",
    updateMode: "sync-only",
    fast: false,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.root = path.resolve(requireValue(argv, ++index, "--root"));
    } else if (arg === "--version") {
      parsed.version = requireValue(argv, ++index, "--version");
    } else if (arg === "--update-mode") {
      parsed.updateMode = parseReleaseUpdateMode(requireValue(argv, ++index, "--update-mode"));
    } else if (arg === "--fast") {
      parsed.fast = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`release_prepare.mjs

Prepares the next Project Tiny Context Harness release in the working tree,
then stops before commit/push/publish.

Usage:
  node tools/release_prepare.mjs --version patch --update-mode sync-only
  node tools/release_prepare.mjs --fast --version patch --update-mode sync-only
  node tools/release_prepare.mjs --version 1.2.3 --update-mode upgrade-required
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const currentVersion = await readPackageVersion();
  const targetVersion = resolveTargetVersion(args.version, currentVersion);
  const changedFiles = await releaseChangedFiles();
  assertReleaseGateMatchesUpgradeImpact(changedFiles);

  await updatePackageVersion(targetVersion);
  const timings = [];
  await timed(timings, "release version sync", () =>
    run("node", [syncReleaseVersionScript, "--root", args.root, "--update-mode", args.updateMode], {
      cwd: defaultRepoRoot
    })
  );

  await timed(timings, "build", () => run("npm", ["run", "build", "--workspace", workspaceName]));
  await timed(timings, "package sync-source", () =>
    run("node", ["packages/ty-context/dist/cli.js", "package", "sync-source"])
  );
  await timed(timings, "package check-source", () =>
    run("node", ["packages/ty-context/dist/cli.js", "package", "check-source"])
  );
  await timed(timings, "release version check", () => run("npm", ["run", "release:check-version"]));
  await timed(timings, "upgrade check", () =>
    run("node", ["packages/ty-context/dist/cli.js", "upgrade", "--check", "--json"], { capture: true })
  );
  if (args.fast) {
    await timed(timings, "release focused tests", () => run("node", ["--test", ...releaseFocusedTests]));
  } else {
    await timed(timings, "workspace tests", () => run("npm", ["run", "test:built", "--workspace", workspaceName]));
  }
  await timed(timings, "immutable release tarball", () => prepareImmutableTarball({root:args.root,version:targetVersion,packageName,workspaceName,run}));
  await timed(timings, "diff check", () => run("git", ["diff", "--check"]));

  console.log("");
  console.log(`Prepared ${packageName}@${targetVersion}`);
  console.log(`Release preparation gate: ${args.fast ? "fast gate" : "full gate"}`);
  printTimings("Release preparation timings:", timings);
  console.log("Next commands:");
  console.log("  git diff --stat");
  console.log("  git add -A");
  console.log(`  git commit -m "Release ${targetVersion}"`);
  console.log("  git push origin main");
  console.log("  npm run release:publish -- --local-fallback --yes");
  console.log("  # Add --registry-smoke only when you want the slower post-publish install smoke.");
}

async function readPackageVersion() {
  const manifest = JSON.parse(await readFile(packageManifestPath(), "utf8"));
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid package version: ${manifest.version}`);
  }
  return manifest.version;
}

async function updatePackageVersion(version) {
  const manifestPath = packageManifestPath();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = version;
  await writeJson(manifestPath, manifest);

  const lockPath = path.join(args.root, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    if (lock.packages?.["packages/ty-context"]) {
      lock.packages["packages/ty-context"].version = version;
    }
    await writeJson(lockPath, lock);
  }
}

function packageManifestPath() {
  return path.join(args.root, "packages", "ty-context", "package.json");
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveTargetVersion(specifier, currentVersion) {
  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(specifier)) {
    return specifier;
  }
  const parsed = parseVersion(currentVersion);
  if (specifier === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  if (specifier === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (specifier === "major") {
    return `${parsed.major + 1}.0.0`;
  }
  throw new Error(`Unsupported --version value: ${specifier}`);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function parseReleaseUpdateMode(value) {
  if (!releaseUpdateModes.includes(value)) {
    throw new Error(`--update-mode must be one of ${releaseUpdateModes.join(", ")}`);
  }
  return value;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function run(command, commandArgs, options = {}) {
  if (process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    if (command === "node" && path.resolve(commandArgs[0]) === syncReleaseVersionScript) {
      return runReal(command, commandArgs, options);
    }
    appendFileSync(
      process.env.TY_CONTEXT_RELEASE_COMMAND_LOG,
      `${JSON.stringify(commandLogEntry(command, commandArgs))}\n`
    );
    return { code: 0, stdout: "", stderr: "", output: "" };
  }

  return runReal(command, commandArgs, options);
}

async function runReal(command, commandArgs, options = {}) {
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

function assertReleaseGateMatchesUpgradeImpact(changedFiles) {
  if (args.fast && args.updateMode !== "sync-only") {
    throw new Error(
      "Fast release preparation is only allowed with --update-mode sync-only; use the full gate for upgrade-required or manual-required releases."
    );
  }

  assertReleaseUpdateModeMatchesChanges(changedFiles);
}

function assertReleaseUpdateModeMatchesChanges(changedFiles) {
  const upgradeSensitiveFiles = changedFiles.filter(isUpgradeSensitivePath);
  if (args.updateMode !== "sync-only") {
    if (args.updateMode === "upgrade-required") {
      assertUpgradeRequiredEvidence(changedFiles);
    }
    return;
  }

  if (upgradeSensitiveFiles.length > 0) {
    throw new Error(
      `upgrade-sensitive changes require --update-mode upgrade-required or manual-required, not sync-only:\n${upgradeSensitiveFiles
        .map((file) => `- ${file}`)
        .join("\n")}`
    );
  }
}

function assertUpgradeRequiredEvidence(changedFiles) {
  const implementationFiles = changedFiles.filter(isUpgradeImplementationPath);
  const testFiles = changedFiles.filter(isUpgradeTestEvidencePath);
  if (implementationFiles.length > 0 && testFiles.length > 0) {
    return;
  }

  const missing = [];
  if (implementationFiles.length === 0) {
    missing.push("- upgrade/migration implementation evidence");
  }
  if (testFiles.length === 0) {
    missing.push("- upgrade test evidence");
  }
  throw new Error(
    `--update-mode upgrade-required requires upgrade impact evidence before release preparation can continue:\n${missing.join(
      "\n"
    )}\nExpected implementation evidence in upgrade/migration code and test evidence in tests/ty-context/upgrade*.test.mjs or tests/ty-context/legacy-upgrade*.test.mjs.`
  );
}

async function releaseChangedFiles() {
  if (process.env.TY_CONTEXT_RELEASE_CHANGED_FILES) {
    return process.env.TY_CONTEXT_RELEASE_CHANGED_FILES.split(/\r?\n/).map(normalizeSlash).filter(Boolean);
  }
  const result = await runReal("git", ["diff", "--name-only", "HEAD", "--"], {
    capture: true,
    allowFailure: true
  });
  if (result.code !== 0) {
    return [];
  }
  return result.stdout.split(/\r?\n/).map(normalizeSlash).filter(Boolean);
}

function normalizeSlash(value) {
  return String(value).replace(/\\/g, "/").trim();
}
