#!/usr/bin/env node

import { spawn } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncReleaseVersionScript = path.join(defaultRepoRoot, "tools", "sync_release_version.mjs");
const packageName = "project-tiny-context-harness";
const workspaceName = "project-tiny-context-harness";
const releaseUpdateModes = ["sync-only", "upgrade-required", "manual-required"];

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

  await updatePackageVersion(targetVersion);
  await run("node", [syncReleaseVersionScript, "--root", args.root, "--update-mode", args.updateMode], {
    cwd: defaultRepoRoot
  });

  await run("npm", ["run", "build", "--workspace", workspaceName]);
  await run("node", ["packages/ty-context/dist/cli.js", "package", "sync-source"]);
  await run("node", ["packages/ty-context/dist/cli.js", "package", "check-source"]);
  await run("npm", ["run", "release:check-version"]);
  await run("node", ["packages/ty-context/dist/cli.js", "upgrade", "--check", "--json"], { capture: true });
  await run("npm", ["test", "--workspace", workspaceName]);
  await run("git", ["diff", "--check"]);

  console.log("");
  console.log(`Prepared ${packageName}@${targetVersion}`);
  console.log("Next commands:");
  console.log("  git diff --stat");
  console.log("  git add -A");
  console.log(`  git commit -m "Release ${targetVersion}"`);
  console.log("  git push origin main");
  console.log("  npm run release:publish -- --local-fallback --yes --registry-smoke");
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
      `${JSON.stringify({ argv: [command, ...commandArgs] })}\n`
    );
    return { code: 0, stdout: "", stderr: "", output: "" };
  }

  return runReal(command, commandArgs, options);
}

async function runReal(command, commandArgs, options = {}) {
  const capture = options.capture ?? false;
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? args.root,
      shell: process.platform === "win32",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, stdout, stderr, output: `${stdout}${stderr}` };
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}
