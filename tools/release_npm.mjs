#!/usr/bin/env node

import { spawn } from "node:child_process";

const rawArgs = process.argv.slice(2);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(rawArgs);
  if (options.help) {
    printHelp();
    return;
  }
  if (rawArgs.length === 0) {
    printCompatibilityNotice();
    return;
  }
  await runReleasePublish(options.publishArgs);
}

function parseArgs(argv) {
  const options = { help: false, publishArgs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--version" || arg === "--publish" || arg === "--full-gate") {
      throw new Error("release:npm no longer accepts --version, --publish or --full-gate. Run release:prepare first, then release:publish.");
    }
    if (arg === "--local-fallback" || arg === "--registry-smoke" || arg === "--yes" || arg === "-y") {
      options.publishArgs.push(arg === "-y" ? "--yes" : arg);
      continue;
    }
    if (arg === "--smoke") {
      options.publishArgs.push("--registry-smoke");
      continue;
    }
    if (arg === "--otp" || arg === "--root") {
      const value = argv[++index];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      options.publishArgs.push(arg, value);
      continue;
    }
    throw new Error(`Unknown argument for release:npm compatibility wrapper: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node tools/release_npm.mjs
  node tools/release_npm.mjs --local-fallback --yes [--registry-smoke] [--otp 123456]

release:npm is a compatibility entrypoint. Prepare releases with release:prepare,
then publish with release:publish. Legacy --version, --publish and --full-gate
arguments are rejected because publish no longer bumps versions or rewrites assets.`);
}

function printCompatibilityNotice() {
  console.log(`release:npm is now a compatibility entrypoint.

Preferred release flow:
  npm run release:prepare -- --version patch --update-mode sync-only
  git diff --stat
  git add -A
  git commit -m "Release <version>"
  git push origin main
  npm run release:publish

Use local npm fallback only when workflow dispatch is unavailable:
  npm run release:publish -- --local-fallback --yes --registry-smoke
`);
}

function runReleasePublish(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tools/release_publish.mjs", ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`release:publish failed with exit code ${code}`));
      }
    });
  });
}
