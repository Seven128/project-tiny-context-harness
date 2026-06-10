#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "packages/sdlc-harness/package.json"), "utf8"));
const PACKAGE_NAME = packageJson.name;
const PACKAGE_VERSION = packageJson.version;
const DEFAULT_REGISTRY = "https://registry.npmjs.org/";
const LATEST_URL = `${DEFAULT_REGISTRY}${PACKAGE_NAME}/latest`;

function parseArgs(argv) {
  const options = { json: false, strict: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`npm_publish_access_check.mjs

Checks npm login and registry state for the first Project Tiny Context Harness publish.
This script is read-only: it does not run npm publish and does not print tokens.

Usage:
  node tools/npm_publish_access_check.mjs
  node tools/npm_publish_access_check.mjs --json
  node tools/npm_publish_access_check.mjs --strict
`);
}

function redact(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .replace(/\/\/[^:\s]+:[^\s]+/g, "//<redacted>")
    .replace(/(_authToken=)[^\s]+/gi, "$1<redacted>")
    .trim();
}

function runNpm(args) {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm ${args.join(" ")}`]
      : args;
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true
  });
  return {
    ok: result.status === 0,
    status: result.status,
    error: result.error?.message ?? null,
    stdout: redact(result.stdout),
    stderr: redact(result.stderr)
  };
}

async function fetchPackage() {
  const response = await fetch(LATEST_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "project-tiny-context-harness-npm-access"
    }
  });
  if (response.status === 404) {
    return {
      ok: false,
      state: "missing",
      detail: `${PACKAGE_NAME} is not published on npm yet.`
    };
  }
  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      state: "error",
      detail: `${LATEST_URL} returned HTTP ${response.status}: ${text.slice(0, 300)}`
    };
  }
  const body = JSON.parse(text);
  return {
    ok: true,
    state: "published",
    detail: `${PACKAGE_NAME}@${body.version} is published on npm.`,
    version: body.version
  };
}

export function summarize(report) {
  if (report.registryPackage.ok) {
    return {
      status: "published",
      nextAction: "Run npm run launch:strict-external. Use GitHub Actions Trusted Publishing for future new versions; local npm login is not required for broad launch once the package is published."
    };
  }
  if (report.registryPackage.state === "missing") {
    if (!report.whoami.ok) {
      return {
        status: "auth-needed",
        nextAction: "Run npm login or configure a publish-capable npm token, then rerun npm run launch:npm-access."
      };
    }
    return {
      status: "first-publish-needed",
      nextAction: `Run npm run release:npm -- --version ${PACKAGE_VERSION} --publish --yes --full-gate --registry-smoke. If npm returns E403, use docs/launch/npm-credential-unblock.md.`
    };
  }
  if (!report.registryPackage.ok) {
    return {
      status: "registry-check-failed",
      nextAction: "Retry the registry check or inspect npm registry availability before publishing."
    };
  }
  return {
    status: "registry-check-failed",
    nextAction: "Retry the registry check or inspect npm registry availability before publishing."
  };
}

function printReport(report) {
  if (report.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log("# npm Publish Access Report");
  console.log("");
  console.log(`Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}`);
  console.log(`Registry: ${report.registry.value || DEFAULT_REGISTRY}`);
  console.log(`Status: ${report.summary.status}`);
  console.log("");
  console.log(`- ${report.ping.ok ? "PASS" : "WARN"} npm-ping: ${report.ping.detail}`);
  console.log(`- ${report.whoami.ok ? "PASS" : "TODO"} npm-whoami: ${report.whoami.detail}`);
  console.log(`- ${report.registryPackage.ok ? "PASS" : "TODO"} npm-package: ${report.registryPackage.detail}`);
  console.log(`- ${report.profile.ok ? "PASS" : "WARN"} npm-profile-probe: ${report.profile.detail}`);
  console.log("");
  console.log(`Next action: ${report.summary.nextAction}`);
  console.log("");
  console.log("No token, OTP, .npmrc content or credential value is printed by this report.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const registryResult = runNpm(["config", "get", "registry"]);
  const registry = {
    ok: registryResult.ok,
    value: registryResult.ok ? registryResult.stdout : DEFAULT_REGISTRY,
    detail: registryResult.ok ? registryResult.stdout : registryResult.stderr || registryResult.stdout || registryResult.error || "npm registry config check failed."
  };

  const pingResult = runNpm(["ping", "--registry", registry.value || DEFAULT_REGISTRY]);
  const ping = {
    ok: pingResult.ok,
    detail: pingResult.ok ? "npm registry ping succeeded." : pingResult.stderr || pingResult.stdout || pingResult.error || "npm ping failed."
  };

  const whoamiResult = runNpm(["whoami", "--registry", registry.value || DEFAULT_REGISTRY]);
  const whoami = {
    ok: whoamiResult.ok,
    username: whoamiResult.ok ? whoamiResult.stdout : null,
    detail: whoamiResult.ok ? `authenticated as ${whoamiResult.stdout}.` : whoamiResult.stderr || whoamiResult.stdout || whoamiResult.error || "npm whoami failed."
  };

  const profileResult = runNpm(["profile", "get", "name", "--json", "--registry", registry.value || DEFAULT_REGISTRY]);
  const profile = {
    ok: profileResult.ok,
    detail: profileResult.ok
      ? "npm profile read succeeded."
      : `${profileResult.stderr || profileResult.stdout || profileResult.error || "npm profile read failed."} Publish may still work with a publish-scoped token, but a 403 here matches the current credential blocker.`
  };

  const registryPackage = await fetchPackage();
  const report = {
    package: { name: PACKAGE_NAME, version: PACKAGE_VERSION },
    registry,
    ping,
    whoami,
    profile,
    registryPackage,
    json: options.json
  };
  report.summary = summarize(report);
  printReport(report);

  if (options.strict && report.summary.status !== "published") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`npm publish access check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
