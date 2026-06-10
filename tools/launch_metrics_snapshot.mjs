#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";

const REPO = "Seven128/project-tiny-context-harness";
const RENAMED_PACKAGE = "project-tiny-context-harness";
const LEGACY_PACKAGE = "agent-project-sdlc";

function parseArgs(argv) {
  const options = { json: false, output: null, offline: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--offline") {
      options.offline = true;
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
  console.log(`launch_metrics_snapshot.mjs

Captures public launch telemetry for Project Tiny Context Harness.
The snapshot is informational; missing npm download data does not fail the launch.

Usage:
  node tools/launch_metrics_snapshot.mjs
  node tools/launch_metrics_snapshot.mjs --json
  node tools/launch_metrics_snapshot.mjs --output tmp/sdlc/launch-metrics/baseline.md
  node tools/launch_metrics_snapshot.mjs --offline --json
`);
}

function requestJson(url) {
  return new Promise((resolve) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "project-tiny-context-harness-launch-metrics",
          Accept: "application/vnd.github+json, application/json"
        },
        timeout: 20_000
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            resolve({
              ok: false,
              statusCode: response.statusCode,
              error: `${url} returned HTTP ${response.statusCode}: ${body.slice(0, 300)}`
            });
            return;
          }
          try {
            resolve({ ok: true, statusCode: response.statusCode, data: JSON.parse(body) });
          } catch (error) {
            resolve({
              ok: false,
              statusCode: response.statusCode,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", (error) => {
      resolve({ ok: false, statusCode: null, error: error instanceof Error ? error.message : String(error) });
    });
  });
}

function emptyPackageSnapshot(name, note) {
  return {
    name,
    registryUrl: `https://www.npmjs.com/package/${name}`,
    latestVersion: null,
    downloadsLastWeek: null,
    status: "skipped",
    note
  };
}

async function packageSnapshot(name, options) {
  if (options.offline) {
    return emptyPackageSnapshot(name, "offline mode");
  }

  const latest = await requestJson(`https://registry.npmjs.org/${name}/latest`);
  const downloads = await requestJson(`https://api.npmjs.org/downloads/point/last-week/${name}`);
  const latestVersion = latest.ok ? latest.data.version ?? null : null;
  const downloadsLastWeek = downloads.ok && typeof downloads.data.downloads === "number" ? downloads.data.downloads : null;
  const errors = [latest, downloads].filter((result) => !result.ok).map((result) => result.error);

  return {
    name,
    registryUrl: `https://www.npmjs.com/package/${name}`,
    latestVersion,
    downloadsLastWeek,
    downloadsWindow: downloads.ok ? `${downloads.data.start} to ${downloads.data.end}` : null,
    status: errors.length > 0 ? "action-needed" : "ok",
    note: errors.length > 0 ? errors.join(" | ") : "ok"
  };
}

async function githubSnapshot(options) {
  const base = {
    fullName: REPO,
    url: `https://github.com/${REPO}`,
    stars: null,
    forks: null,
    openIssues: null,
    watchers: null,
    defaultBranch: null,
    pushedAt: null,
    status: options.offline ? "skipped" : "action-needed",
    note: options.offline ? "offline mode" : null
  };

  if (options.offline) {
    return base;
  }

  const result = await requestJson(`https://api.github.com/repos/${REPO}`);
  if (!result.ok) {
    return { ...base, note: result.error };
  }

  return {
    ...base,
    stars: result.data.stargazers_count,
    forks: result.data.forks_count,
    openIssues: result.data.open_issues_count,
    watchers: result.data.subscribers_count,
    defaultBranch: result.data.default_branch,
    pushedAt: result.data.pushed_at,
    status: "ok",
    note: "ok"
  };
}

async function buildSnapshot(options) {
  const [github, renamedPackage, legacyPackage] = await Promise.all([
    githubSnapshot(options),
    packageSnapshot(RENAMED_PACKAGE, options),
    packageSnapshot(LEGACY_PACKAGE, options)
  ]);
  return {
    generatedAt: new Date().toISOString(),
    mode: options.offline ? "offline" : "online",
    github,
    npm: {
      renamedPackage,
      legacyPackage
    },
    boundary:
      "Metrics are distribution telemetry only. Do not treat stars, forks or downloads as product-quality proof."
  };
}

function valueOrTodo(value) {
  if (value === null || value === undefined || value === "") {
    return "TODO";
  }
  return String(value);
}

function tableCell(value) {
  return valueOrTodo(value).replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function renderMarkdown(snapshot) {
  const packages = [snapshot.npm.renamedPackage, snapshot.npm.legacyPackage];
  const lines = [
    "# Launch Metrics Snapshot",
    "",
    `Generated: ${snapshot.generatedAt}`,
    `Mode: ${snapshot.mode}`,
    "",
    "Metrics are distribution telemetry only. They are not product-quality proof.",
    "",
    "## GitHub",
    "",
    `- Repository: [${snapshot.github.fullName}](${snapshot.github.url})`,
    `- Stars: ${valueOrTodo(snapshot.github.stars)}`,
    `- Forks: ${valueOrTodo(snapshot.github.forks)}`,
    `- Open issues and pull requests: ${valueOrTodo(snapshot.github.openIssues)}`,
    `- Watchers/subscribers: ${valueOrTodo(snapshot.github.watchers)}`,
    `- Default branch: ${valueOrTodo(snapshot.github.defaultBranch)}`,
    `- Last pushed at: ${valueOrTodo(snapshot.github.pushedAt)}`,
    `- Status: ${snapshot.github.status}`,
    `- Note: ${snapshot.github.note}`,
    "",
    "## npm",
    "",
    "| Package | Latest | Last-week downloads | Status | Note |",
    "|---|---:|---:|---|---|"
  ];

  for (const item of packages) {
    lines.push(
      `| [${item.name}](${item.registryUrl}) | ${tableCell(item.latestVersion)} | ${tableCell(item.downloadsLastWeek)} | ${tableCell(item.status)} | ${tableCell(item.note)} |`
    );
  }

  lines.push(
    "",
    "## Copy Into Launch Log",
    "",
    "```text",
    `GitHub stars: ${valueOrTodo(snapshot.github.stars)}`,
    `GitHub forks: ${valueOrTodo(snapshot.github.forks)}`,
    `GitHub open issues/PRs: ${valueOrTodo(snapshot.github.openIssues)}`,
    `Renamed npm latest: ${valueOrTodo(snapshot.npm.renamedPackage.latestVersion)}`,
    `Renamed npm downloads last week: ${valueOrTodo(snapshot.npm.renamedPackage.downloadsLastWeek)}`,
    `Legacy npm latest: ${valueOrTodo(snapshot.npm.legacyPackage.latestVersion)}`,
    `Legacy npm downloads last week: ${valueOrTodo(snapshot.npm.legacyPackage.downloadsLastWeek)}`,
    "```",
    "",
    "## Boundary",
    "",
    snapshot.boundary,
    ""
  );

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const snapshot = await buildSnapshot(options);
const output = options.json ? `${JSON.stringify(snapshot, null, 2)}\n` : renderMarkdown(snapshot);

if (options.output) {
  mkdirSync(path.dirname(options.output), { recursive: true });
  writeFileSync(options.output, output, "utf8");
}

process.stdout.write(output);
