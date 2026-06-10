#!/usr/bin/env node

const REPO_OWNER = "Seven128";
const REPO_NAME = "project-tiny-context-harness";
const REPO_FULL_NAME = `${REPO_OWNER}/${REPO_NAME}`;
const GITHUB_REPO_URL = `https://github.com/${REPO_FULL_NAME}`;
const NPM_PACKAGE_URL = "https://www.npmjs.com/package/project-tiny-context-harness";
const NPM_LATEST_URL = "https://registry.npmjs.org/project-tiny-context-harness/latest";
const GITHUB_API_ROOT = "https://api.github.com";

const DESCRIPTION = "Minimal project memory and validation harness for AI coding agents.";
const TOPICS = [
  "ai-agents",
  "coding-agent",
  "codex",
  "claude-code",
  "cursor",
  "gemini-cli",
  "opencode",
  "agent-context",
  "context-engineering",
  "context-management",
  "agents-md",
  "project-memory",
  "agent-memory",
  "ai-coding",
  "developer-tools",
  "developer-productivity",
  "cli",
  "sdlc",
  "workflow"
];

function parseArgs(argv) {
  const options = { apply: false, json: false, stage: "auto" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--stage") {
      const value = argv[index + 1];
      if (!["auto", "prepublish", "postpublish"].includes(value)) {
        throw new Error("--stage must be one of: auto, prepublish, postpublish");
      }
      options.stage = value;
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
  console.log(`github_metadata_update.mjs

Dry-runs or applies the Project Tiny Context Harness GitHub repository metadata.

Usage:
  node tools/github_metadata_update.mjs
  node tools/github_metadata_update.mjs --stage prepublish
  node tools/github_metadata_update.mjs --apply

Options:
  --apply          Update GitHub. Requires GITHUB_TOKEN or GH_TOKEN.
  --stage <name>   auto, prepublish or postpublish. Default: auto.
  --json           Print a JSON report.
`);
}

async function requestJson(url, { method = "GET", token, body } = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "project-tiny-context-harness-github-metadata",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function isNpmPublished() {
  const response = await fetch(NPM_LATEST_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "project-tiny-context-harness-github-metadata"
    }
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${NPM_LATEST_URL} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return true;
}

async function resolveStage(stage) {
  if (stage !== "auto") {
    return stage;
  }
  return (await isNpmPublished()) ? "postpublish" : "prepublish";
}

function desiredForStage(stage) {
  return {
    description: DESCRIPTION,
    homepage: stage === "postpublish" ? NPM_PACKAGE_URL : GITHUB_REPO_URL,
    topics: TOPICS
  };
}

function normalizeTopics(topics) {
  return [...new Set(topics)].sort((a, b) => a.localeCompare(b));
}

function compare(current, desired) {
  const currentTopics = normalizeTopics(current.topics ?? []);
  const desiredTopics = normalizeTopics(desired.topics);
  return {
    description: {
      current: current.description ?? "",
      desired: desired.description,
      ok: (current.description ?? "") === desired.description
    },
    homepage: {
      current: current.homepage ?? "",
      desired: desired.homepage,
      ok: (current.homepage ?? "") === desired.homepage
    },
    topics: {
      current: currentTopics,
      desired: desiredTopics,
      ok: JSON.stringify(currentTopics) === JSON.stringify(desiredTopics)
    }
  };
}

function isAligned(diff) {
  return diff.description.ok && diff.homepage.ok && diff.topics.ok;
}

function printReport(report) {
  if (report.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log("# GitHub Metadata Report");
  console.log("");
  console.log(`Repository: ${REPO_FULL_NAME}`);
  console.log(`Stage: ${report.stage}`);
  console.log(`Mode: ${report.applied ? "applied" : "dry-run"}`);
  console.log(`Status: ${report.aligned ? "aligned" : "drift"}`);
  console.log("");
  for (const [key, value] of Object.entries(report.diff)) {
    console.log(`- ${value.ok ? "PASS" : "TODO"} ${key}:`);
    console.log(`  current: ${Array.isArray(value.current) ? value.current.join(", ") : value.current}`);
    console.log(`  desired: ${Array.isArray(value.desired) ? value.desired.join(", ") : value.desired}`);
  }
  if (!report.applied && !report.aligned) {
    console.log("");
    console.log("To apply from a trusted shell with a GitHub token:");
    console.log("  npm run launch:github-metadata -- --apply");
    console.log("The token must be provided through GITHUB_TOKEN or GH_TOKEN.");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const stage = await resolveStage(options.stage);
  const desired = desiredForStage(stage);
  const repoUrl = `${GITHUB_API_ROOT}/repos/${REPO_FULL_NAME}`;
  const topicsUrl = `${repoUrl}/topics`;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (options.apply && !token) {
    throw new Error("--apply requires GITHUB_TOKEN or GH_TOKEN");
  }

  if (options.apply) {
    await requestJson(repoUrl, {
      method: "PATCH",
      token,
      body: {
        description: desired.description,
        homepage: desired.homepage
      }
    });
    await requestJson(topicsUrl, {
      method: "PUT",
      token,
      body: { names: desired.topics }
    });
  }

  const current = await requestJson(repoUrl, { token });
  const diff = compare(current, desired);
  printReport({
    repo: REPO_FULL_NAME,
    stage,
    applied: options.apply,
    aligned: isAligned(diff),
    diff,
    json: options.json
  });
}

main().catch((error) => {
  console.error(`github metadata update failed: ${error.message}`);
  process.exitCode = 1;
});
