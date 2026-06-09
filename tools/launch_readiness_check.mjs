#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { offline: false, json: false, output: null, strictExternal: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--offline") {
      options.offline = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict-external") {
      options.strictExternal = true;
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
  console.log(`launch_readiness_check.mjs

Checks local launch-readiness surfaces and optionally compares public GitHub/npm
metadata against local package metadata.

Usage:
  node tools/launch_readiness_check.mjs [--offline] [--json] [--output tmp/sdlc/launch-readiness.md]
  node tools/launch_readiness_check.mjs --strict-external
`);
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function hasFile(relativePath) {
  return existsSync(path.join(repoRoot, relativePath));
}

function fileSize(relativePath) {
  return statSync(path.join(repoRoot, relativePath)).size;
}

function readBytes(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath));
}

function isGif(relativePath) {
  if (!hasFile(relativePath)) {
    return false;
  }
  const bytes = readBytes(relativePath);
  const header = bytes.subarray(0, 6).toString("ascii");
  return (header === "GIF89a" || header === "GIF87a") && bytes.includes(Buffer.from("NETSCAPE2.0", "ascii"));
}

function pngDimensions(relativePath) {
  if (!hasFile(relativePath)) {
    return null;
  }
  const bytes = readBytes(relativePath);
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !pngHeader.every((value, index) => bytes[index] === value)) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function pngIs(relativePath, width, height) {
  const dimensions = pngDimensions(relativePath);
  return dimensions?.width === width && dimensions?.height === height;
}

function addCheck(checks, id, ok, detail, severity = "required") {
  checks.push({ id, ok: Boolean(ok), detail, severity });
}

function contains(content, pattern) {
  return pattern.test(content);
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "project-agent-sdlc-launch-readiness",
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
            reject(new Error(`${url} returned HTTP ${response.statusCode}: ${body.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", reject);
  });
}

function localChecks() {
  const checks = [];
  const rootPackage = readJson("package.json");
  const packageJson = readJson("packages/sdlc-harness/package.json");
  const rootReadme = read("README.md");
  const packageReadme = read("packages/sdlc-harness/README.md");
  const launchKit = read("docs/launch/README.md");
  const primaryLaunch = read("docs/launch/primary-launch.md");
  const awesomeListSubmissions = read("docs/launch/awesome-list-submissions.md");
  const externalPrPacket = read("docs/launch/external-prs/README.md");
  const transcendaPatch = read("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch");
  const jordimasPatch = read("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch");
  const demoPacket = read("docs/launch/demo.md");
  const marketMap = read("docs/launch/market-map.md");
  const outreachTargets = read("docs/launch/outreach-targets.md");
  const sourceWorkflow = read(".github/workflows/harness.yml");
  const maintainerWorkflow = read(".github/workflows/package.yml");

  addCheck(checks, "root-package-name", rootPackage.name === "project-agent-sdlc", "Root package name is project-agent-sdlc.");
  addCheck(checks, "root-license", rootPackage.license === "MIT" && hasFile("LICENSE"), "Root package has MIT license metadata and LICENSE file.");
  addCheck(
    checks,
    "package-metadata",
    packageJson.license === "MIT" &&
      packageJson.homepage === "https://github.com/Seven128/project-agent-sdlc#readme" &&
      packageJson.repository?.url === "git+https://github.com/Seven128/project-agent-sdlc.git" &&
      packageJson.bugs?.url === "https://github.com/Seven128/project-agent-sdlc/issues",
    "npm package has license, homepage, repository and bugs metadata."
  );
  for (const keyword of ["ai-agents", "coding-agent", "context-engineering", "developer-productivity", "claude-code"]) {
    addCheck(checks, `package-keyword-${keyword}`, packageJson.keywords?.includes(keyword), `npm package keyword includes ${keyword}.`);
  }
  addCheck(checks, "package-license-file", hasFile("packages/sdlc-harness/LICENSE"), "Packaged npm workspace includes LICENSE.");

  for (const [id, content] of [
    ["root-readme", rootReadme],
    ["package-readme", packageReadme]
  ]) {
    addCheck(checks, `${id}-positioning`, contains(content, /minimal project-memory harness for AI coding agents/i), `${id} states minimal project-memory positioning.`);
    addCheck(checks, `${id}-why`, contains(content, /Why It Exists/), `${id} includes Why It Exists.`);
    addCheck(checks, `${id}-positioning-table`, contains(content, /Positioning/) && contains(content, /Spec-first kits/) && contains(content, /Task Master-style/), `${id} includes competitor positioning table.`);
    addCheck(checks, `${id}-quickstart`, contains(content, /Try It In 60 Seconds/) && contains(content, /make validate-context/), `${id} includes quickstart.`);
    addCheck(checks, `${id}-success-surface`, contains(content, /Expected result/) && contains(content, /Fresh-agent test prompt/), `${id} shows expected generated files and a fresh-agent test prompt.`);
    addCheck(checks, `${id}-demo-media`, contains(content, /demo-terminal\.gif/) && contains(content, /The demo shows the core loop/), `${id} embeds the launch demo GIF and explains the recovery loop.`);
  }

  addCheck(
    checks,
    "launch-kit",
    contains(launchKit, /Launch Kit/) &&
      contains(launchKit, /Do not claim benchmark wins/) &&
      contains(launchKit, /Hacker News Draft/) &&
      contains(launchKit, /awesome-list-submissions\.md/) &&
      contains(launchKit, /Readiness boundary/) &&
      contains(launchKit, /repo-hosted media/) &&
      contains(launchKit, /does not mean Product Hunt, curated-list submissions or awards are ready/),
    "Launch kit has copy-ready channel drafts, media pointers, readiness boundary and no-benchmark boundary."
  );
  addCheck(checks, "launch-operating-plan", contains(launchKit, /Launch Operating Plan/) && contains(launchKit, /Channel Matrix/) && contains(launchKit, /Community Handoff Surface/), "Launch kit has an operating plan, channel matrix and community handoff surface.");
  addCheck(
    checks,
    "primary-launch-packet",
    contains(launchKit, /primary-launch\.md/) &&
      hasFile("docs/launch/primary-launch.md") &&
      contains(primaryLaunch, /Primary Launch Packet/) &&
      contains(primaryLaunch, /Hacker News Show HN/) &&
      contains(primaryLaunch, /Product Hunt/) &&
      contains(primaryLaunch, /difference from using only AGENTS\.md/) &&
      contains(primaryLaunch, /Adoption reports \/ missing facts/) &&
      contains(primaryLaunch, /24-Hour Response Playbook/) &&
      contains(primaryLaunch, /Do not ask for stars|Asking for stars/),
    "Primary launch packet has copy-ready first-channel copy, Product Hunt follow-up, response playbook and claims boundary."
  );
  addCheck(
    checks,
    "awesome-list-submissions",
    hasFile("docs/launch/awesome-list-submissions.md") &&
      contains(awesomeListSubmissions, /Awesome List Submission Packet/) &&
      contains(awesomeListSubmissions, /Transcenda\/awesome-agentic-coding/) &&
      contains(awesomeListSubmissions, /jordimas\/awesome-agentic-engineering/) &&
      contains(awesomeListSubmissions, /awesome-ai-devtools/) &&
      contains(awesomeListSubmissions, /external-prs\/README\.md/) &&
      contains(awesomeListSubmissions, /Do not claim adoption, benchmark wins, awards/),
    "Awesome-list submission packet has P0 PR copy and deferred-list gates."
  );
  addCheck(
    checks,
    "external-pr-packets",
    hasFile("docs/launch/external-prs/README.md") &&
      hasFile("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch") &&
      hasFile("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch") &&
      contains(externalPrPacket, /Transcenda\/awesome-agentic-coding/) &&
      contains(externalPrPacket, /jordimas\/awesome-agentic-engineering/) &&
      contains(externalPrPacket, /No direct pull request was opened by automation/) &&
      contains(externalPrPacket, /gh repo fork Transcenda\/awesome-agentic-coding --clone/) &&
      contains(externalPrPacket, /gh repo fork jordimas\/awesome-agentic-engineering --clone/) &&
      contains(externalPrPacket, /gh pr create/) &&
      contains(externalPrPacket, /Add AI SDLC Harness to agent instructions and skills/) &&
      contains(externalPrPacket, /Add AI SDLC Harness to team adoption resources/) &&
      contains(transcendaPatch, /Agent instructions and Skills/) &&
      contains(transcendaPatch, /minimal project-memory harness for AI coding agents/) &&
      contains(jordimasPatch, /Team Adoption/) &&
      contains(jordimasPatch, /Minimal project-memory and validation harness for teams adopting AI coding agents/),
    "External PR packet has exact patches, PR copy, manual gh commands and automation-boundary notes."
  );
  addCheck(checks, "launch-demo-storyboard", contains(launchKit, /Demo Storyboard/) && contains(launchKit, /fresh-agent test prompt/i) && contains(launchKit, /make validate-context/), "Launch kit has a demo storyboard tied to the README recovery test.");
  addCheck(
    checks,
    "launch-demo-packet",
    rootPackage.scripts?.["launch:demo"] === "node tools/launch_demo_capture.mjs" &&
      hasFile("tools/launch_demo_capture.mjs") &&
      hasFile("docs/launch/demo.md") &&
      hasFile("docs/launch/assets/demo-terminal.svg") &&
      contains(demoPacket, /Launch Demo Packet/) &&
      contains(demoPacket, /npm run launch:demo/) &&
      contains(demoPacket, /Repo-hosted demo media exists/) &&
      contains(demoPacket, /demo-terminal\.gif/) &&
      contains(demoPacket, /product-hunt-gallery-1\.png/) &&
      contains(demoPacket, /Fresh-Agent Prompt/) &&
      contains(demoPacket, /Fresh-Agent Recovery Check/),
    "Launch demo packet has a reproducible capture command, transcript guide and repo-hosted media."
  );
  addCheck(
    checks,
    "launch-demo-media",
    isGif("docs/launch/assets/demo-terminal.gif") &&
      fileSize("docs/launch/assets/demo-terminal.gif") > 100_000 &&
      pngIs("docs/launch/assets/product-hunt-gallery-1.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-gallery-2.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-thumbnail.png", 240, 240),
    "Launch media includes an animated GIF, two 1270x760 Product Hunt gallery images and a 240x240 thumbnail."
  );
  addCheck(checks, "launch-milestones", contains(launchKit, /Star \/ Adoption Milestones/) && contains(launchKit, /10 stars/) && contains(launchKit, /500 stars/), "Launch kit has star/adoption milestone triggers without treating stars as proof.");
  addCheck(checks, "market-map", contains(marketMap, /Market Map/) && contains(marketMap, /Competitive Snapshot/) && contains(marketMap, /10-100 stars/), "Market map has competitor snapshot and feasibility bands.");
  addCheck(
    checks,
    "outreach-targets",
    contains(outreachTargets, /Outreach Targets/) &&
      contains(outreachTargets, /Priority Sequence/) &&
      contains(outreachTargets, /Curated Lists/) &&
      contains(outreachTargets, /awesome-list-submissions\.md/) &&
      contains(outreachTargets, /Awards/) &&
      contains(outreachTargets, /Do not submit to award programs before the demo and first public feedback exist/),
    "Outreach targets map current launch, curated-list and award gates."
  );
  addCheck(checks, "contributing", hasFile("CONTRIBUTING.md") && contains(read("CONTRIBUTING.md"), /Do not claim benchmark wins/), "CONTRIBUTING.md exists and preserves benchmark-claim boundary.");
  addCheck(checks, "issue-templates", hasFile(".github/ISSUE_TEMPLATE/bug_report.yml") && hasFile(".github/ISSUE_TEMPLATE/feature_request.yml"), "Bug and feature issue templates exist.");
  addCheck(checks, "pr-template", hasFile(".github/PULL_REQUEST_TEMPLATE.md"), "Pull request template exists.");
  addCheck(checks, "quickstart-smoke", hasFile("tools/quickstart_smoke.mjs") && rootPackage.scripts?.["smoke:quickstart"], "Quickstart smoke script and npm script exist.");
  addCheck(checks, "launch-check-script", rootPackage.scripts?.["launch:check"] === "node tools/launch_readiness_check.mjs --offline", "launch:check script runs offline readiness check.");

  addCheck(checks, "consumer-workflow-boundary", contains(sourceWorkflow, /Run harness gate/) && !contains(sourceWorkflow, /npm test --workspace agent-project-sdlc|package check-source|npm install/), "Consumer workflow only runs Harness gate.");
  addCheck(
    checks,
    "maintainer-workflow",
    contains(maintainerWorkflow, /Test package/) &&
      contains(maintainerWorkflow, /Check package canonical source drift/) &&
      contains(maintainerWorkflow, /node packages\/sdlc-harness\/dist\/cli\.js package check-source/) &&
      contains(maintainerWorkflow, /Validate source Context/),
    "Maintainer package CI runs package tests, source drift from the source root, and Context validation."
  );
  addCheck(
    checks,
    "node-engine-ci-matrix",
    packageJson.engines?.node === ">=20" &&
      contains(maintainerWorkflow, /node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/) &&
      contains(maintainerWorkflow, /node-version:\s*\["20",\s*"24"\]/),
    "Package CI covers the declared Node >=20 floor and current Node 24."
  );

  return checks;
}

async function externalChecks(localPackageJson) {
  const checks = [];
  const github = await requestJson("https://api.github.com/repos/Seven128/project-agent-sdlc");
  const requiredTopics = ["ai-agents", "coding-agent", "codex", "claude-code", "cursor", "agent-context", "context-engineering", "agents-md", "developer-tools", "developer-productivity", "cli", "sdlc", "workflow"];
  const githubTopics = Array.isArray(github.topics) ? github.topics : [];
  addCheck(checks, "github-description", github.description === "Minimal project memory and validation harness for AI coding agents.", `GitHub description: ${github.description ?? "(empty)"}`, "external");
  addCheck(checks, "github-license", github.license?.spdx_id === "MIT", `GitHub detected license: ${github.license?.spdx_id ?? "(none)"}`, "external");
  addCheck(checks, "github-topics", requiredTopics.every((topic) => githubTopics.includes(topic)), `GitHub topics: ${githubTopics.length > 0 ? githubTopics.join(", ") : "(none)"}`, "external");
  addCheck(checks, "github-stars", typeof github.stargazers_count === "number", `GitHub stars: ${github.stargazers_count}`, "external-info");
  addCheck(checks, "github-forks", typeof github.forks_count === "number", `GitHub forks: ${github.forks_count}`, "external-info");

  const npmLatest = await requestJson("https://registry.npmjs.org/agent-project-sdlc/latest");
  addCheck(checks, "npm-description", npmLatest.description === localPackageJson.description, `npm latest description: ${npmLatest.description ?? "(empty)"}`, "external");
  addCheck(checks, "npm-license", npmLatest.license === localPackageJson.license, `npm latest license: ${npmLatest.license ?? "(none)"}`, "external");
  addCheck(checks, "npm-homepage", npmLatest.homepage === localPackageJson.homepage, `npm latest homepage: ${npmLatest.homepage ?? "(none)"}`, "external");
  addCheck(checks, "npm-keywords", localPackageJson.keywords.every((keyword) => npmLatest.keywords?.includes(keyword)), `npm latest keywords: ${npmLatest.keywords?.join(", ") ?? "(none)"}`, "external");
  addCheck(checks, "npm-repository", npmLatest.repository?.url === localPackageJson.repository?.url, `npm latest repository: ${npmLatest.repository?.url ?? "(none)"}`, "external");
  addCheck(checks, "npm-bugs", npmLatest.bugs?.url === localPackageJson.bugs?.url, `npm latest bugs URL: ${npmLatest.bugs?.url ?? "(none)"}`, "external");
  addCheck(checks, "npm-version", npmLatest.version === localPackageJson.version, `npm latest version: ${npmLatest.version}`, "external-info");

  const downloads = await requestJson("https://api.npmjs.org/downloads/point/last-week/agent-project-sdlc");
  addCheck(checks, "npm-downloads", typeof downloads.downloads === "number", `npm downloads last week: ${downloads.downloads} (${downloads.start} to ${downloads.end})`, "external-info");
  return { checks, github, npmLatest, downloads };
}

function summarize(checks, options) {
  const requiredFailures = checks.filter((check) => !check.ok && check.severity === "required");
  const externalFailures = checks.filter((check) => !check.ok && check.severity === "external");
  const exitOk = requiredFailures.length === 0 && (!options.strictExternal || externalFailures.length === 0);
  let status = "pass";
  if (requiredFailures.length > 0 || (options.strictExternal && externalFailures.length > 0)) {
    status = "fail";
  } else if (externalFailures.length > 0) {
    status = "local-pass-external-action-needed";
  }
  return { status, exitOk, requiredFailures, externalFailures };
}

function renderMarkdown(report) {
  const lines = [
    "# Launch Readiness Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.offline ? "offline" : "online"}`,
    `Status: ${report.summary.status}`,
    "",
    "## Local Checks",
    ""
  ];

  for (const check of report.localChecks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.detail}`);
  }

  if (report.externalChecks.length > 0) {
    lines.push("", "## External Checks", "");
    for (const check of report.externalChecks) {
      const label = check.severity === "external-info" ? "INFO" : check.ok ? "PASS" : "TODO";
      lines.push(`- ${label} ${check.id}: ${check.detail}`);
    }
  } else {
    lines.push("", "## External Checks", "", "- Skipped because --offline was set.");
  }

  lines.push("", "## Next Actions", "");
  if (report.summary.requiredFailures.length > 0) {
    for (const check of report.summary.requiredFailures) {
      lines.push(`- Fix local readiness check: ${check.id}.`);
    }
  } else {
    lines.push("- Local launch surface is ready for review.");
  }
  if (report.summary.externalFailures.length > 0) {
    for (const check of report.summary.externalFailures) {
      lines.push(`- Update external metadata or publish a new package: ${check.id}.`);
    }
  }
  if (report.offline) {
    lines.push("- Run without --offline before launch to compare public GitHub/npm metadata.");
  }

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const localPackageJson = readJson("packages/sdlc-harness/package.json");
const local = localChecks();
let external = { checks: [] };
if (!options.offline) {
  try {
    external = await externalChecks(localPackageJson);
  } catch (error) {
    addCheck(external.checks, "external-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }
}

const allChecks = [...local, ...external.checks];
const summary = summarize(allChecks, options);
const report = {
  generatedAt: new Date().toISOString(),
  offline: options.offline,
  strictExternal: options.strictExternal,
  summary,
  localChecks: local,
  externalChecks: external.checks
};

const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
if (options.output) {
  writeFileSync(options.output, output, "utf8");
}
process.stdout.write(output);
process.exitCode = summary.exitOk ? 0 : 1;
