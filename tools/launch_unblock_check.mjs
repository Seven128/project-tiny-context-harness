#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function renderMarkdown(report) {
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
  if (report.npm.summary.status !== "published") {
    lines.push("```sh");
    lines.push("npm run launch:npm-access");
    lines.push("npm run release:npm -- --version 0.2.39 --publish --yes --full-gate --registry-smoke");
    lines.push("```");
    lines.push("");
  }
  if (!report.github.aligned) {
    lines.push("```sh");
    lines.push("npm run launch:github-metadata");
    lines.push("npm run launch:github-metadata -- --apply");
    lines.push("```");
    lines.push("");
  }

  lines.push("## Launch Gate", "");
  lines.push("```sh");
  lines.push("npm run launch:strict-external");
  lines.push("```");
  lines.push("");
  lines.push("Broad launch remains blocked until the strict external gate has no TODOs.");
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

main().catch((error) => {
  console.error(`launch unblock check failed: ${error.message}`);
  process.exitCode = 1;
});
