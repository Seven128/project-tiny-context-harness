#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hnItemUrlPrefix = "https://news.ycombinator.com/item?id=";

export function parseArgs(argv) {
  const options = { json: false, output: null, itemId: null, url: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--url") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--url requires a value");
      }
      options.url = value;
      index += 1;
    } else if (arg === "--item-id") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--item-id requires a value");
      }
      options.itemId = value;
      index += 1;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = value;
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
  console.log(`launch_hn_snapshot.mjs

Captures Hacker News story telemetry for Project Tiny Context Harness.
The snapshot is informational; score and comments are distribution telemetry only.

Usage:
  node tools/launch_hn_snapshot.mjs --url https://news.ycombinator.com/item?id=48479619
  node tools/launch_hn_snapshot.mjs --item-id 48479619 --output tmp/sdlc/launch-metrics/show-hn-hn-6h.md
  node tools/launch_hn_snapshot.mjs --item-id 48479619 --json
`);
}

export function parseHnItemId({ url = null, itemId = null } = {}) {
  if (itemId) {
    if (!/^\d+$/.test(String(itemId))) {
      throw new Error(`Could not parse HN item id from: ${itemId}`);
    }
    return String(itemId);
  }

  if (!url) {
    throw new Error("Pass --url or --item-id.");
  }

  const match = String(url).match(/[?&]id=(\d+)/);
  if (!match) {
    throw new Error(`Could not parse HN item id from: ${url}`);
  }
  return match[1];
}

function requestJson(url) {
  return new Promise((resolve) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "project-tiny-context-harness-launch-hn-snapshot",
          Accept: "application/json"
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
              error: `${url} returned HTTP ${response.statusCode}: ${body.slice(0, 300)}`
            });
            return;
          }
          try {
            resolve({ ok: true, data: JSON.parse(body) });
          } catch (error) {
            resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", (error) => {
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
  });
}

export function buildSnapshot(item, { generatedAt = new Date().toISOString() } = {}) {
  if (!item || item.deleted || item.dead) {
    throw new Error("HN item is missing, deleted or dead.");
  }
  if (item.type !== "story") {
    throw new Error(`HN item ${item.id} is type ${item.type}; expected story.`);
  }
  return {
    generatedAt,
    id: item.id,
    itemUrl: `${hnItemUrlPrefix}${item.id}`,
    title: item.title ?? "",
    by: item.by ?? "",
    score: item.score ?? 0,
    comments: item.descendants ?? 0,
    directChildComments: Array.isArray(item.kids) ? item.kids.length : 0,
    submittedAt: item.time ? new Date(item.time * 1000).toISOString() : null,
    sourceUrl: item.url ?? null,
    boundary: "HN score and comments are distribution telemetry only. They are not product-quality proof."
  };
}

function valueOrTodo(value) {
  if (value === null || value === undefined || value === "") {
    return "TODO";
  }
  return String(value);
}

export function renderMarkdown(snapshot) {
  return `# HN Launch Snapshot

Generated: ${snapshot.generatedAt}

HN score and comments are distribution telemetry only. They are not product-quality proof.

## Story

- HN item: [${snapshot.id}](${snapshot.itemUrl})
- Title: ${valueOrTodo(snapshot.title)}
- By: ${valueOrTodo(snapshot.by)}
- Submitted at: ${valueOrTodo(snapshot.submittedAt)}
- Source URL: ${valueOrTodo(snapshot.sourceUrl)}

## Metrics

- Score: ${valueOrTodo(snapshot.score)}
- Comments: ${valueOrTodo(snapshot.comments)}
- Direct child comments: ${valueOrTodo(snapshot.directChildComments)}
`;
}

async function fetchHnItem(itemId) {
  const result = await requestJson(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const itemId = parseHnItemId(options);
  const item = await fetchHnItem(itemId);
  const snapshot = buildSnapshot(item);

  if (options.json) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    const markdown = renderMarkdown(snapshot);
    console.log(markdown);
    if (options.output) {
      const outputPath = path.resolve(repoRoot, options.output);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, markdown, "utf8");
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`launch HN snapshot failed: ${error.message}`);
    process.exitCode = 1;
  });
}
