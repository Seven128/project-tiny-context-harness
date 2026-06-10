#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    channel: null,
    url: null,
    postedAt: null,
    output: null,
    force: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--channel") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--channel requires a value");
      }
      options.channel = value;
      index += 1;
    } else if (arg === "--url") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--url requires a value");
      }
      options.url = value;
      index += 1;
    } else if (arg === "--posted-at") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--posted-at requires a value");
      }
      options.postedAt = value;
      index += 1;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = path.resolve(value);
      index += 1;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`launch_feedback_note.mjs

Creates a temporary post-launch feedback note for Project Tiny Context Harness.
The note is for launch operations only and belongs under tmp/sdlc/launch-feedback.

Usage:
  node tools/launch_feedback_note.mjs --channel show-hn --url https://news.ycombinator.com/item?id=...
  node tools/launch_feedback_note.mjs --channel product-hunt --posted-at 2026-06-10T12:00:00Z
  node tools/launch_feedback_note.mjs --channel reddit --output tmp/sdlc/launch-feedback/reddit.md

Options:
  --channel <name>    Launch channel name. Defaults to "channel".
  --url <url>         Public channel URL, if available.
  --posted-at <time>  Channel post timestamp, if available.
  --output <path>     Override output path.
  --force             Overwrite an existing note.
`);
}

function slugify(value) {
  const slug = String(value || "channel")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "channel";
}

function isoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function renderNote({ channel, slug, url, postedAt, generatedAt }) {
  const metricsPrefix = `tmp/sdlc/launch-metrics/${slug}`;
  return `# Launch Feedback Note

Channel: ${channel}
URL: ${url || "TODO"}
Posted at: ${postedAt || "TODO"}
Generated at: ${generatedAt}

Do not store raw private logs, secrets, customer details, private repository names, raw chat logs or private code here.

## Metrics

Before posting:

\`\`\`sh
npm run launch:metrics -- --output ${metricsPrefix}-before.md
\`\`\`

After 6 hours:

\`\`\`sh
npm run launch:metrics -- --output ${metricsPrefix}-6h.md
\`\`\`

After 24 hours:

\`\`\`sh
npm run launch:metrics -- --output ${metricsPrefix}-24h.md
\`\`\`

## Repeated Themes

| Theme | Count | Evidence link or summary | Action |
|---|---:|---|---|
| Positioning confusion | 0 | TODO | TODO |
| Install or source-preview friction | 0 | TODO | TODO |
| AGENTS.md overlap question | 0 | TODO | TODO |
| Benchmark or proof request | 0 | TODO | TODO |
| Real recovery problem | 0 | TODO | TODO |
| Integration request | 0 | TODO | TODO |

## Comments To Answer

- [ ] TODO

## Docs Or Package Changes

- [ ] README patch needed:
- [ ] FAQ patch needed:
- [ ] Profile or external PR wording patch needed:
- [ ] Install/package fix needed:
- [ ] Response template update needed:

## Adoption Evidence

- Adoption report links:
- Public quote/story consent:
- Private-only notes path:
- Candidate adoption story template:

Use adoption reports only for concrete recovery evidence. Do not turn stars, upvotes, downloads or vague praise into product-proof claims.

## Next Channel Decision

Decision:
Reason:
Owner:

Choose the next channel only after checking whether the first channel exposed install failure, repeated positioning confusion, examples demand, adoption evidence or curated-list category feedback.

## Claims Boundary

- Do not ask for stars, upvotes, awards or nominations.
- Do not claim benchmark wins, production adoption, awards, productivity multipliers or test replacement.
- Link the smallest relevant README, FAQ, demo, comparison or issue template instead of pasting long explanations.
- Convert repeated good-faith confusion into docs, issues or consented adoption stories within 24 hours.
`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const channel = options.channel || "channel";
const slug = slugify(channel);
const outputPath =
  options.output || path.resolve("tmp", "sdlc", "launch-feedback", `${isoDateOnly(new Date())}-${slug}.md`);

if (existsSync(outputPath) && !options.force) {
  console.error(`Refusing to overwrite existing note: ${path.relative(process.cwd(), outputPath)}`);
  console.error("Pass --force to replace it.");
  process.exit(1);
}

const note = renderNote({
  channel,
  slug,
  url: options.url,
  postedAt: options.postedAt,
  generatedAt: new Date().toISOString()
});

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, note, "utf8");
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
