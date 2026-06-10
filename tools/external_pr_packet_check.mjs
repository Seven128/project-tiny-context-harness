#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  {
    id: "transcenda-awesome-agentic-coding",
    repo: "Transcenda/awesome-agentic-coding",
    patch: "docs/launch/external-prs/transcenda-awesome-agentic-coding.patch"
  },
  {
    id: "jordimas-awesome-agentic-engineering",
    repo: "jordimas/awesome-agentic-engineering",
    patch: "docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch"
  },
  {
    id: "awesome-opencode",
    repo: "awesome-opencode/awesome-opencode",
    patch: "docs/launch/external-prs/awesome-opencode-project-tiny-context-harness.patch"
  },
  {
    id: "jamesmurdza-awesome-ai-devtools",
    repo: "jamesmurdza/awesome-ai-devtools",
    patch: "docs/launch/external-prs/jamesmurdza-awesome-ai-devtools.patch"
  },
  {
    id: "ai-boost-awesome-harness-engineering",
    repo: "ai-boost/awesome-harness-engineering",
    patch: "docs/launch/external-prs/ai-boost-awesome-harness-engineering.patch"
  },
  {
    id: "picrew-awesome-agent-harness",
    repo: "Picrew/awesome-agent-harness",
    patch: "docs/launch/external-prs/picrew-awesome-agent-harness-data.patch"
  }
];

const forbiddenPatterns = [
  { id: "old-display-name", pattern: /AI SDLC Harness/ },
  { id: "old-npm-package", pattern: /agent-project-sdlc/ },
  { id: "old-repository", pattern: /project-agent-sdlc/ },
  { id: "benchmark-overclaim", pattern: /benchmark-proven|proven (?:faster|speedup)|productivity multiplier|10x/i },
  { id: "adoption-overclaim", pattern: /used by teams|trusted by developers|award-winning/i }
];

function parseArgs(argv) {
  const options = { json: false, output: null, live: false, workDir: defaultWorkDir(), clean: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = path.resolve(value);
      index += 1;
    } else if (arg === "--live") {
      options.live = true;
    } else if (arg === "--work-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--work-dir requires a path");
      }
      options.workDir = path.resolve(value);
      index += 1;
    } else if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`external_pr_packet_check.mjs

Checks prepared curated-list PR packets for Project Tiny Context Harness.
Default mode is local and read-only. --live clones upstream repositories into tmp
and verifies that each prepared patch still applies with git apply --check and
git diff --check.

Usage:
  node tools/external_pr_packet_check.mjs
  node tools/external_pr_packet_check.mjs --json
  node tools/external_pr_packet_check.mjs --output tmp/sdlc/external-pr-packets/latest.md
  node tools/external_pr_packet_check.mjs --live --clean
`);
}

function defaultWorkDir() {
  return path.join(repoRoot, "tmp", "sdlc", "external-pr-packets", "repos");
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function hasFile(relativePath) {
  return existsSync(path.join(repoRoot, relativePath));
}

function addCheck(checks, id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    error: result.error ? result.error.message : null
  };
}

function checkForbidden(checks, label, content) {
  for (const forbidden of forbiddenPatterns) {
    addCheck(
      checks,
      `${label}:${forbidden.id}`,
      !forbidden.pattern.test(content),
      `${label} must not contain ${forbidden.id.replace(/-/g, " ")}.`
    );
  }
}

function staticChecks() {
  const checks = [];
  const packetReadme = read("docs/launch/external-prs/README.md");
  const awesomeListSubmissions = read("docs/launch/awesome-list-submissions.md");

  addCheck(checks, "packet-readme-exists", hasFile("docs/launch/external-prs/README.md"), "External PR packet README exists.");
  addCheck(checks, "submission-packet-exists", hasFile("docs/launch/awesome-list-submissions.md"), "Awesome-list submission packet exists.");
  addCheck(
    checks,
    "no-automation-side-effect",
    /Remaining packets have not been opened/.test(packetReadme) &&
      /does not fork repositories, push branches or open PRs/.test(packetReadme),
    "Packet documents opened P0 PRs while keeping remaining PR creation out of automation."
  );
  addCheck(checks, "maintainer-session-boundary", /maintainer's GitHub-authenticated session/.test(packetReadme), "Packet routes PR creation through the maintainer's GitHub session.");
  addCheck(checks, "claim-boundary", /Do not include benchmark, adoption, award or star claims/.test(packetReadme), "Packet keeps external PR claims narrow.");
  addCheck(checks, "github-url-primary", /Use the GitHub repository URL, not npm/.test(packetReadme), "Packet uses GitHub repository URL as listing target.");
  addCheck(
    checks,
    "recommended-order-narrow-first",
    /Recommended Order[\s\S]*1\. `ai-boost\/awesome-harness-engineering`[\s\S]*2\. `Picrew\/awesome-agent-harness`/.test(awesomeListSubmissions),
    "Awesome-list packet starts with narrow harness/context targets before broader AI dev-tool directories."
  );
  addCheck(
    checks,
    "external-pr-readme-order-narrow-first",
    /Recommended Opening Order[\s\S]*1\. `ai-boost\/awesome-harness-engineering`[\s\S]*2\. `Picrew\/awesome-agent-harness`/.test(packetReadme),
    "External PR execution packet starts with narrow harness/context targets before broader AI dev-tool directories."
  );

  checkForbidden(checks, "external-pr-readme", packetReadme);
  checkForbidden(checks, "awesome-list-submissions", awesomeListSubmissions);

  for (const target of targets) {
    const patchExists = hasFile(target.patch);
    addCheck(checks, `${target.id}:patch-exists`, patchExists, `${target.patch} exists.`);
    addCheck(checks, `${target.id}:readme-target`, packetReadme.includes(target.repo), `Packet README mentions ${target.repo}.`);
    addCheck(checks, `${target.id}:submission-target`, awesomeListSubmissions.includes(target.repo), `Submission packet mentions ${target.repo}.`);
    addCheck(checks, `${target.id}:manual-command`, packetReadme.includes(`gh repo fork ${target.repo} --clone`), `Packet README has manual fork command for ${target.repo}.`);
    addCheck(checks, `${target.id}:patch-command`, packetReadme.includes(path.basename(target.patch)), `Packet README references ${path.basename(target.patch)}.`);

    if (patchExists) {
      const patch = read(target.patch);
      addCheck(checks, `${target.id}:project-name`, /Project Tiny Context Harness/.test(patch), `${target.patch} uses the public project name.`);
      addCheck(
        checks,
        `${target.id}:repo-url`,
        /https:\/\/github\.com\/Seven128\/project-tiny-context-harness/.test(patch),
        `${target.patch} links the renamed GitHub repository.`
      );
      checkForbidden(checks, target.id, patch);
    }
  }

  return checks;
}

function liveChecks(workDir, clean) {
  const checks = [];
  if (clean && existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true });
  }
  mkdirSync(workDir, { recursive: true });

  for (const target of targets) {
    const targetDir = path.join(workDir, target.id);
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    const clone = run("git", ["clone", "--depth", "1", `https://github.com/${target.repo}.git`, targetDir], workDir);
    addCheck(checks, `${target.id}:clone`, clone.ok, clone.ok ? `Cloned ${target.repo}.` : clone.stderr || clone.error || clone.stdout);
    if (!clone.ok) {
      continue;
    }

    const patchPath = path.join(repoRoot, target.patch);
    const applyCheck = run("git", ["apply", "--check", patchPath], targetDir);
    addCheck(checks, `${target.id}:apply-check`, applyCheck.ok, applyCheck.ok ? "Patch applies cleanly." : applyCheck.stderr || applyCheck.stdout);
    if (!applyCheck.ok) {
      continue;
    }

    const apply = run("git", ["apply", patchPath], targetDir);
    addCheck(checks, `${target.id}:apply`, apply.ok, apply.ok ? "Patch applied for whitespace check." : apply.stderr || apply.stdout);
    if (!apply.ok) {
      continue;
    }

    const diffCheck = run("git", ["diff", "--check"], targetDir);
    addCheck(checks, `${target.id}:diff-check`, diffCheck.ok, diffCheck.ok ? "git diff --check passed after patch." : diffCheck.stderr || diffCheck.stdout);
  }
  return checks;
}

function summarize(checks) {
  const failed = checks.filter((check) => !check.ok);
  return {
    status: failed.length === 0 ? "pass" : "fail",
    total: checks.length,
    failed: failed.length
  };
}

function renderMarkdown(report) {
  const lines = [
    "# External PR Packet Check",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.live ? "live" : "offline"}`,
    `Status: ${report.summary.status}`,
    "",
    "## Checks",
    ""
  ];

  for (const check of report.checks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.detail}`);
  }

  lines.push("");
  if (!report.live) {
    lines.push("Run `npm run launch:external-prs -- --live --clean` before opening curated-list PRs to verify patches against current upstream repositories.");
  } else {
    lines.push(`Live work directory: ${report.workDir}`);
  }
  return `${lines.join("\n")}\n`;
}

function writeReport(report, options) {
  const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
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

  const checks = staticChecks();
  if (options.live) {
    checks.push(...liveChecks(options.workDir, options.clean));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    live: options.live,
    workDir: options.live ? options.workDir : null,
    targets: targets.map(({ id, repo, patch }) => ({ id, repo, patch })),
    summary: summarize(checks),
    checks
  };
  writeReport(report, options);
  if (report.summary.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`external PR packet check failed: ${error.message}`);
  process.exitCode = 1;
});
