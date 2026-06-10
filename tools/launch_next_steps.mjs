#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "packages/sdlc-harness/package.json"), "utf8"));

const urls = {
  npmTrustedPublish:
    "https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml",
  githubRelease: "https://github.com/Seven128/project-tiny-context-harness/releases/new?tag=v0.2.40",
  showHnSubmit: "https://news.ycombinator.com/submit",
  repository: "https://github.com/Seven128/project-tiny-context-harness"
};

function parseArgs(argv) {
  const options = { json: false };
  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`launch_next_steps.mjs

Prints the ordered maintainer actions for the public launch.
This script is read-only: it does not publish to npm, create releases, post to HN or open PRs.

Usage:
  node tools/launch_next_steps.mjs
  node tools/launch_next_steps.mjs --json
`);
}

export function buildNextSteps({ packageVersion = packageJson.version } = {}) {
  return [
    {
      id: "npm-trusted-publish",
      title: `Refresh npm package page with ${packageVersion}`,
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "Live npm still shows the immutable 0.2.40 README until the prepared patch version is published.",
      url: urls.npmTrustedPublish,
      commands: ["npm run launch:unblock -- --strict"],
      inputs: [`expected_version: ${packageVersion}`, "dry_run: true", "then dry_run: false"],
      stopIf: "dry run fails or npm Trusted Publishing asks for NPM_TOKEN / NODE_AUTH_TOKEN"
    },
    {
      id: "github-release-0.2.40",
      title: "Publish the renamed-package GitHub Release",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "The tag exists, but the latest visible release is still the legacy rename-boundary release.",
      url: urls.githubRelease,
      source: "docs/launch/github-release-0.2.40.md",
      stopIf: "the release form targets anything other than v0.2.40 / d125dfd172defa195ed79050151216505bbaf9f4"
    },
    {
      id: "show-hn",
      title: "Post the first broad technical launch",
      owner: "maintainer",
      requiredBeforeBroadLaunch: true,
      why: "Hacker News is the primary first channel for testing whether technical users recognize the agent handoff problem.",
      url: urls.showHnSubmit,
      source: "docs/launch/primary-launch.md",
      preflight: [
        "npm run launch:strict-external",
        "npm run launch:metrics -- --output tmp/sdlc/launch-metrics/show-hn-before.md"
      ],
      stopIf: "final copy claims benchmark wins, adoption, awards, replacement of tests/CI/review, or asks for stars"
    },
    {
      id: "feedback-note",
      title: "Create the first-channel feedback note",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "Feedback and telemetry should stay in tmp/sdlc, not in project Context.",
      command: "npm run launch:feedback-note -- --channel show-hn --url <show-hn-url>",
      source: "docs/launch/feedback-triage.md",
      stopIf: "there is no public channel URL yet"
    },
    {
      id: "curated-list-prs",
      title: "Open the narrow-first curated-list PRs after first feedback",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "Curated-list PRs are second-wave distribution, starting with the two narrow harness/context targets.",
      command: "npm run launch:external-prs -- --live --clean",
      source: "docs/launch/external-prs/README.md",
      stopIf: "Show HN feedback exposes positioning confusion that should be patched first"
    }
  ];
}

export function renderMarkdown(steps = buildNextSteps()) {
  const lines = [
    "# Launch Next Steps",
    "",
    "This is the ordered owner action board for the current public launch. It is read-only: it does not publish to npm, create releases, post to HN or open PRs.",
    "",
    "Run the stop/go gate first:",
    "",
    "```sh",
    "npm run launch:unblock -- --strict",
    "```",
    ""
  ];

  for (const [index, step] of steps.entries()) {
    lines.push(`## ${index + 1}. ${step.title}`, "");
    lines.push(`- id: ${step.id}`);
    lines.push(`- owner: ${step.owner}`);
    lines.push(`- why: ${step.why}`);
    if (step.url) {
      lines.push(`- URL: ${step.url}`);
    }
    if (step.source) {
      lines.push(`- source: ${step.source}`);
    }
    if (step.command) {
      lines.push(`- command: \`${step.command}\``);
    }
    if (step.commands) {
      lines.push(`- commands: ${step.commands.map((command) => `\`${command}\``).join(", ")}`);
    }
    if (step.inputs) {
      lines.push(`- inputs: ${step.inputs.map((input) => `\`${input}\``).join(", ")}`);
    }
    if (step.preflight) {
      lines.push(`- preflight: ${step.preflight.map((command) => `\`${command}\``).join(", ")}`);
    }
    lines.push(`- stop if: ${step.stopIf}`, "");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const steps = buildNextSteps();
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ steps }, null, 2)}\n`);
    return;
  }
  process.stdout.write(renderMarkdown(steps));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`launch next steps failed: ${error.message}`);
    process.exitCode = 1;
  }
}
