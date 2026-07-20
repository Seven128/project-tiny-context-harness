#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "packages/ty-context/package.json"), "utf8"));

const urls = {
  npmTrustedPublish:
    "https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml",
  showHnSubmit: "https://news.ycombinator.com/submit",
  repository: "https://github.com/Seven128/project-tiny-context-harness"
};

const releaseTargetSha = "dfda8fd2c07143fca137aa609a28a5eb6d8a6697";
const showHnPost = {
  title: "Show HN: Tiny project memory for coding agents",
  url: urls.repository
};

export function showHnPrefillUrl({ title = showHnPost.title, url = showHnPost.url } = {}) {
  return `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`;
}

function parseArgs(argv) {
  const options = { json: false, live: false };
  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--live") {
      options.live = true;
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
In --live mode it also reads tmp/ty-context/launch-feedback notes to detect an existing Show HN URL.

Usage:
  node tools/launch_next_steps.mjs
  node tools/launch_next_steps.mjs --json
  node tools/launch_next_steps.mjs --live
`);
}

function runJson(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 180_000,
    windowsHide: true
  });
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`${args.join(" ")} did not return JSON output:\n${result.stderr}`);
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${args.join(" ")} returned non-JSON output:\n${stdout}\n${error.message}`);
  }
}

function checkById(report, id) {
  return report?.readiness?.externalChecks?.find((check) => check.id === id) ?? null;
}

function slashPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function findShowHnFeedbackNote({ root = repoRoot } = {}) {
  const feedbackDir = path.join(root, "tmp", "ty-context", "launch-feedback");
  if (!existsSync(feedbackDir)) {
    return null;
  }
  const files = readdirSync(feedbackDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}-show-hn\.md$/.test(file))
    .sort()
    .reverse();
  for (const file of files) {
    const fullPath = path.join(feedbackDir, file);
    const content = readFileSync(fullPath, "utf8");
    if (!/Channel:\s*show-hn\b/.test(content)) {
      continue;
    }
    const urlMatch = content.match(/URL:\s*(https:\/\/news\.ycombinator\.com\/item\?id=\d+)/);
    if (!urlMatch) {
      continue;
    }
    const firstCommentMatch = content.match(/HN first comment:\s*(https:\/\/news\.ycombinator\.com\/item\?id=\d+)/);
    return {
      url: urlMatch[1],
      path: slashPath(path.relative(root, fullPath)),
      firstCommentUrl: firstCommentMatch?.[1] ?? null
    };
  }
  return null;
}

export function findOpenedCuratedListPrs({ root = repoRoot } = {}) {
  const packetPath = path.join(root, "docs", "launch", "external-prs", "README.md");
  if (!existsSync(packetPath)) {
    return [];
  }
  const content = readFileSync(packetPath, "utf8");
  const prs = [];
  const aiBoostUrl = "https://github.com/ai-boost/awesome-harness-engineering/pull/58";
  const picrewUrl = "https://github.com/Picrew/awesome-agent-harness/pull/22";
  const transcendaUrl = "https://github.com/Transcenda/awesome-agentic-coding/pull/4";
  const jordimasUrl = "https://github.com/jordimas/awesome-agentic-engineering/pull/4";
  const aiDevtoolsUrl = "https://github.com/jamesmurdza/awesome-ai-devtools/pull/636";
  const cliCodingAgentsUrl = "https://github.com/bradAGI/awesome-cli-coding-agents/pull/125";
  const aiCodingToolsUrl = "https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408";
  if (content.includes(aiBoostUrl)) {
    prs.push({ repo: "ai-boost/awesome-harness-engineering", url: aiBoostUrl });
  }
  if (content.includes(picrewUrl)) {
    prs.push({ repo: "Picrew/awesome-agent-harness", url: picrewUrl });
  }
  if (content.includes(transcendaUrl)) {
    prs.push({ repo: "Transcenda/awesome-agentic-coding", url: transcendaUrl });
  }
  if (content.includes(jordimasUrl)) {
    prs.push({ repo: "jordimas/awesome-agentic-engineering", url: jordimasUrl });
  }
  if (content.includes(aiDevtoolsUrl)) {
    prs.push({ repo: "jamesmurdza/awesome-ai-devtools", url: aiDevtoolsUrl });
  }
  if (content.includes(cliCodingAgentsUrl)) {
    prs.push({ repo: "bradAGI/awesome-cli-coding-agents", url: cliCodingAgentsUrl });
  }
  if (content.includes(aiCodingToolsUrl)) {
    prs.push({ repo: "ai-for-developers/awesome-ai-coding-tools", url: aiCodingToolsUrl });
  }
  return prs;
}

export function applyStatusHints(steps, report, { showHnFeedback = null, curatedListPrs = [] } = {}) {
  if (!report) {
    return steps;
  }

  const githubReleaseTitle = checkById(report, "github-release-title");
  const latestReleaseDetail = githubReleaseTitle?.detail ?? "";
  const currentReleaseVisible = latestReleaseDetail.includes(`Project Tiny Context Harness ${packageJson.version}`);
  const requiredGateClear = report.status === "ready" || report.status === "ready-with-cleanup";
  const showHnUrl = showHnFeedback?.url ?? null;

  return steps.map((step) => {
    if (step.id === "npm-trusted-publish") {
      if (report.npm?.summary?.status !== "published") {
        return { ...step, status: "blocked", statusDetail: report.npm?.summary?.nextAction ?? "npm package is not published." };
      }
      if (report.releaseDelta) {
        return {
          ...step,
          status: "pending-cleanup",
          statusDetail: `local ${report.releaseDelta.localVersion}; npm latest ${report.releaseDelta.publishedVersion}`
        };
      }
      return { ...step, status: "done", statusDetail: "npm latest matches the local package version." };
    }
    if (step.id === `github-release-${packageJson.version}`) {
      if (currentReleaseVisible) {
        return { ...step, status: "done", statusDetail: "latest GitHub Release is the renamed-package release." };
      }
      return { ...step, status: "pending-cleanup", statusDetail: latestReleaseDetail || "latest GitHub Release still needs maintainer review." };
    }
    if (step.id === "show-hn") {
      if (showHnUrl) {
        return { ...step, status: "done", statusDetail: `live at ${showHnUrl}`, url: showHnUrl };
      }
      return {
        ...step,
        status: requiredGateClear ? "ready" : "blocked",
        statusDetail: requiredGateClear ? "required broad-launch gate is clear." : "required broad-launch gate is blocked."
      };
    }
    if (step.id === "show-hn-first-comment") {
      if (!showHnUrl) {
        return { ...step, status: "waiting-for-url", statusDetail: "run after the Show HN URL exists." };
      }
      if (showHnFeedback?.firstCommentUrl) {
        return {
          ...step,
          status: "done",
          statusDetail: `first comment posted at ${showHnFeedback.firstCommentUrl}`,
          url: showHnUrl,
          commentUrl: showHnFeedback.firstCommentUrl
        };
      }
      return { ...step, status: "ready", statusDetail: "post the maintainer context as the first regular HN comment.", url: showHnUrl };
    }
    if (step.id === "feedback-note") {
      if (showHnFeedback) {
        const { command, ...doneStep } = step;
        return { ...doneStep, status: "done", statusDetail: `feedback note exists at ${showHnFeedback.path}` };
      }
      return { ...step, status: "waiting-for-url", statusDetail: "run after the Show HN URL exists." };
    }
    if (step.id === "curated-list-prs") {
      if (curatedListPrs.length >= 4) {
        return {
          ...step,
          title: "Monitor the open high-score curated-list PRs",
          status: "open",
          statusDetail: "curated-list PRs are open; monitor maintainer feedback and prioritize future targets by fit x activity x audience.",
          prs: curatedListPrs
        };
      }
      return { ...step, status: "wait-for-first-feedback", statusDetail: "run after first-channel feedback does not expose a positioning flaw." };
    }
    if (step.id === "monitor-feedback") {
      if (!showHnUrl) {
        return { ...step, status: "waiting-for-url", statusDetail: "run after the Show HN URL exists." };
      }
      if (!showHnFeedback?.firstCommentUrl) {
        return { ...step, status: "waiting-for-comment", statusDetail: "run after the first regular HN comment is posted." };
      }
      return { ...step, status: "ready", statusDetail: "monitor HN replies, curated-list PR feedback and 6h/24h telemetry." };
    }
    return step;
  });
}

export function recommendedNext(steps) {
  return (
    steps.find((step) => step.status === "blocked") ??
    steps.find((step) => step.status === "pending-cleanup") ??
    steps.find((step) => step.status === "ready") ??
    steps.find((step) => !step.status) ??
    null
  );
}

export function buildNextSteps({ packageVersion = packageJson.version } = {}) {
  return [
    {
      id: "npm-trusted-publish",
      title: `Refresh npm package page with ${packageVersion}`,
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "The live npm README follows immutable package versions; this step is done once npm latest matches the prepared patch version.",
      url: urls.npmTrustedPublish,
      commands: ["npm run launch:unblock -- --strict"],
      inputs: [`expected_version: ${packageVersion}`, "dry_run: false"],
      stopIf: "the prepare or protected publish job fails, or npm Trusted Publishing asks for NPM_TOKEN / NODE_AUTH_TOKEN"
    },
    {
      id: `github-release-${packageVersion}`,
      title: "Publish the renamed-package GitHub Release",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "The npm package is current, but the latest visible GitHub Release is still the legacy rename-boundary release.",
      url: `https://github.com/Seven128/project-tiny-context-harness/releases/new?tag=v${packageVersion}`,
      source: `docs/launch/github-release-${packageVersion}.md`,
      stopIf: `the release form targets anything other than v${packageVersion} / ${releaseTargetSha}`
    },
    {
      id: "show-hn",
      title: "Post the first broad technical launch",
      owner: "maintainer",
      requiredBeforeBroadLaunch: true,
      why: "Hacker News is the primary first channel for testing whether technical users recognize the agent handoff problem.",
      url: urls.showHnSubmit,
      prefillUrl: showHnPrefillUrl(),
      source: "docs/launch/primary-launch.md",
      preflight: [
        "npm run launch:strict-external",
        "npm run launch:metrics -- --output tmp/ty-context/launch-metrics/show-hn-before.md"
      ],
      stopIf: "final copy claims benchmark wins, adoption, awards, replacement of tests/CI/review, or asks for stars"
    },
    {
      id: "feedback-note",
      title: "Create the first-channel feedback note",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "Feedback and telemetry should stay in tmp/ty-context, not in project Context.",
      command: "npm run launch:feedback-note -- --channel show-hn --url <show-hn-url>",
      source: "docs/launch/feedback-triage.md",
      stopIf: "there is no public channel URL yet"
    },
    {
      id: "show-hn-first-comment",
      title: "Post the first regular HN comment",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "The link post needs concise maintainer context in a normal HN comment, not in the submit form.",
      url: "<show-hn-url>",
      source: "docs/launch/primary-launch.md",
      stopIf: "there is no public HN URL yet, or the comment copy claims benchmark wins, adoption, awards, replacement of tests/CI/review, or asks for stars"
    },
    {
      id: "curated-list-prs",
      title: "Open or monitor high-score curated-list PRs after first feedback",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "Curated-list PRs are durable discovery; target scoring should combine category fit, maintainer activity and audience scale.",
      command: "npm run launch:external-prs -- --live --clean",
      source: "docs/launch/external-prs/README.md",
      stopIf: "Show HN feedback exposes positioning confusion that should be patched first, or the target is stale despite having many stars"
    },
    {
      id: "monitor-feedback",
      title: "Monitor launch feedback and first-day metrics",
      owner: "maintainer",
      requiredBeforeBroadLaunch: false,
      why: "The useful next signal is whether HN readers or list maintainers report positioning, install, examples or category-fit problems.",
      commands: [
        "npm run launch:hn-snapshot -- --url https://news.ycombinator.com/item?id=48479619 --output tmp/ty-context/launch-metrics/show-hn-hn-6h.md",
        "npm run launch:metrics -- --output tmp/ty-context/launch-metrics/show-hn-6h.md"
      ],
      source: "tmp/ty-context/launch-feedback/2026-06-10-show-hn.md",
      stopIf: "feedback shows repeated positioning confusion; patch README/FAQ before any broader channel"
    }
  ];
}

export function renderMarkdown(steps = buildNextSteps(), { recommended = recommendedNext(steps) } = {}) {
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

  if (recommended) {
    lines.push("## Recommended Next", "");
    lines.push(`- ${recommended.id}: ${recommended.title}`);
    if (recommended.status) {
      lines.push(`- status: ${recommended.status}${recommended.statusDetail ? ` (${recommended.statusDetail})` : ""}`);
    }
    if (recommended.url) {
      lines.push(`- URL: ${recommended.url}`);
    }
    if (recommended.prefillUrl) {
      lines.push(`- prefill URL: ${recommended.prefillUrl}`);
    }
    if (recommended.command) {
      lines.push(`- command: \`${recommended.command}\``);
    }
    if (recommended.commands) {
      lines.push(`- commands: ${recommended.commands.map((command) => `\`${command}\``).join(", ")}`);
    }
    if (recommended.inputs) {
      lines.push(`- inputs: ${recommended.inputs.map((input) => `\`${input}\``).join(", ")}`);
    }
    lines.push("");
  }

  for (const [index, step] of steps.entries()) {
    lines.push(`## ${index + 1}. ${step.title}`, "");
    lines.push(`- id: ${step.id}`);
    if (step.status) {
      lines.push(`- status: ${step.status}${step.statusDetail ? ` (${step.statusDetail})` : ""}`);
    }
    lines.push(`- owner: ${step.owner}`);
    lines.push(`- why: ${step.why}`);
    if (step.url) {
      lines.push(`- URL: ${step.url}`);
    }
    if (step.prefillUrl) {
      lines.push(`- prefill URL: ${step.prefillUrl}`);
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
  const statusReport = options.live ? runJson(["tools/launch_unblock_check.mjs", "--json"]) : null;
  const showHnFeedback = options.live ? findShowHnFeedbackNote() : null;
  const curatedListPrs = options.live ? findOpenedCuratedListPrs() : [];
  const steps = applyStatusHints(buildNextSteps(), statusReport, { showHnFeedback, curatedListPrs });
  const recommended = recommendedNext(steps);
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          live: options.live,
          recommendedNext: recommended?.id ?? null,
          showHnUrl: showHnFeedback?.url ?? null,
          curatedListPrs,
          steps
        },
        null,
        2
      )}\n`
    );
    return;
  }
  process.stdout.write(renderMarkdown(steps, { recommended }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`launch next steps failed: ${error.message}`);
    process.exitCode = 1;
  }
}
