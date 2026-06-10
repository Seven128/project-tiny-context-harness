#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "packages/sdlc-harness/package.json"), "utf8"));

function parseArgs(argv) {
  const options = { json: false, output: null, strict: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`launch_unblock_check.mjs

Combines the safe launch-unblock diagnostics into one owner-facing report.
This script is read-only: it does not publish to npm and does not update GitHub.

Usage:
  node tools/launch_unblock_check.mjs
  node tools/launch_unblock_check.mjs --json
  node tools/launch_unblock_check.mjs --output tmp/sdlc/launch-unblock.md
  node tools/launch_unblock_check.mjs --strict
`);
}

function runJson(args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`${args.join(" ")} did not return JSON output`);
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${args.join(" ")} returned non-JSON output:\n${stdout}\n${error.message}`);
  }
}

function externalTodos(readiness) {
  return readiness.externalChecks
    .filter((check) => !check.ok && check.severity !== "external-info")
    .map((check) => ({ id: check.id, detail: check.detail }));
}

function reportStatus({ npmAccess, githubMetadata, readiness }) {
  const todos = externalTodos(readiness);
  if (todos.length === 0 && npmAccess.summary.status === "published" && githubMetadata.aligned) {
    return "ready";
  }
  return "blocked";
}

function appendNpmOwnerCommands(lines, report) {
  if (report.npm.summary.status === "published") {
    return;
  }
  const packageVersion = report.npm.package?.version ?? packageJson.version;

  lines.push("### npm", "");
  lines.push(`Status: ${report.npm.summary.status}`);
  lines.push(`Next action: ${report.npm.summary.nextAction}`);
  lines.push("");

  if (report.npm.summary.status === "auth-needed") {
    lines.push("```sh");
    lines.push("npm run launch:npm-access");
    lines.push("npm login");
    lines.push("npm run launch:npm-access");
    lines.push("# After npm auth or token permissions are fixed:");
    lines.push(`npm run release:npm -- --version ${packageVersion} --publish --yes --full-gate --registry-smoke`);
    lines.push("```");
    lines.push("");
    lines.push("If token-based publishing is required, create a publish-capable granular token on npmjs.com and follow `docs/launch/npm-credential-unblock.md`. Do not store tokens, OTP values or `.npmrc` content in this repository.");
    lines.push("");
    return;
  }

  if (report.npm.summary.status === "first-publish-needed") {
    lines.push("```sh");
    lines.push("npm run launch:npm-access");
    lines.push(`npm run release:npm -- --version ${packageVersion} --publish --yes --full-gate --registry-smoke`);
    lines.push("```");
    lines.push("");
    lines.push("If npm returns E403, stop and use `docs/launch/npm-credential-unblock.md` before retrying.");
    lines.push("");
    return;
  }

  lines.push("```sh");
  lines.push("npm run launch:npm-access");
  lines.push("```");
  lines.push("");
}

function appendGitHubOwnerCommands(lines, report) {
  if (report.github.aligned) {
    return;
  }

  lines.push("### GitHub metadata", "");
  lines.push("```sh");
  lines.push("npm run launch:github-metadata");
  lines.push("npm run launch:github-metadata -- --apply");
  lines.push("```");
  lines.push("");
}

export function renderMarkdown(report) {
  const lines = [
    "# Launch Unblock Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    "",
    "## Current Signals",
    "",
    `- npm access: ${report.npm.summary.status}`,
    `- GitHub metadata: ${report.github.aligned ? "aligned" : "drift"}`,
    `- strict external gate: ${report.readiness.summary.status}`,
    ""
  ];

  if (report.externalTodos.length > 0) {
    lines.push("## Remaining External TODOs", "");
    for (const todo of report.externalTodos) {
      lines.push(`- ${todo.id}: ${todo.detail}`);
    }
    lines.push("");
  }

  lines.push("## Owner Commands", "");
  appendNpmOwnerCommands(lines, report);
  appendGitHubOwnerCommands(lines, report);

  lines.push("## Launch Gate", "");
  lines.push("```sh");
  lines.push("npm run launch:strict-external");
  lines.push("```");
  lines.push("");
  if (report.status === "ready") {
    lines.push("Broad launch gate is clear; keep final channel-specific review and claims-boundary checks before posting.");
  } else {
    lines.push("Broad launch remains blocked until the strict external gate has no TODOs.");
  }
  return `${lines.join("\n")}\n`;
}

function writeReport(report, options) {
  if (options.json) {
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (options.output) {
      mkdirSync(path.dirname(options.output), { recursive: true });
      writeFileSync(options.output, output);
    } else {
      process.stdout.write(output);
    }
    return;
  }

  const output = renderMarkdown(report);
  if (options.output) {
    mkdirSync(path.dirname(options.output), { recursive: true });
    writeFileSync(options.output, output);
  } else {
    process.stdout.write(output);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const npmAccess = runJson(["tools/npm_publish_access_check.mjs", "--json"]);
  const githubMetadata = runJson(["tools/github_metadata_update.mjs", "--json"]);
  const readiness = runJson(["tools/launch_readiness_check.mjs", "--strict-external", "--json"], {
    allowFailure: true
  });

  const report = {
    generatedAt: new Date().toISOString(),
    status: reportStatus({ npmAccess, githubMetadata, readiness }),
    npm: npmAccess,
    github: githubMetadata,
    readiness,
    externalTodos: externalTodos(readiness)
  };

  writeReport(report, options);

  if (options.strict && report.status !== "ready") {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`launch unblock check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
