import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/launch_readiness_check.mjs");

const result = spawnSync(process.execPath, [scriptPath, "--offline", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  timeout: 60_000
});

assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
const report = JSON.parse(result.stdout);
assert.equal(report.summary.status, "pass");
assert.equal(report.offline, true);
assert.equal(report.externalChecks.length, 0);

const ids = new Set(report.localChecks.map((check) => check.id));
for (const expected of [
  "package-metadata",
  "root-readme-positioning",
  "package-readme-positioning",
  "root-readme-fit-boundary",
  "package-readme-fit-boundary",
  "root-readme-before-after",
  "package-readme-before-after",
  "root-readme-recovery-diagram",
  "package-readme-recovery-diagram",
  "root-readme-success-surface",
  "package-readme-success-surface",
  "root-readme-demo-media",
  "package-readme-demo-media",
  "root-readme-no-install-preview",
  "package-readme-no-install-preview",
  "public-language-posture",
  "localized-readme",
  "scorecard-badge",
  "prepublish-status-badge",
  "root-readme-prepublish-boundary",
  "root-readme-source-preview",
  "package-readme-source-preview",
  "source-preview-pack",
  "source-preview-report-template",
  "codespaces-preview",
  "agent-surface-recipes",
  "technical-article",
  "existing-repo-adoption-guide",
  "minimal-context-sample",
  "browseable-sample-repository",
  "launch-faq",
  "benchmarking-guide",
  "launch-response-templates",
  "private-review-packet",
  "private-review-shortlist",
  "private-review-log-template",
  "adoption-story-template",
  "community-starter-issues",
  "public-roadmap",
  "comparison-guide",
  "launch-profile-sheet",
  "launch-kit",
  "github-homepage-stage-boundary",
  "github-metadata-runbook",
  "github-metadata-script",
  "prelaunch-external-blockers",
  "launch-operating-plan",
  "primary-launch-packet",
  "feedback-triage-runbook",
  "npm-publish-runbook",
  "npm-credential-unblock",
  "npm-trusted-publishing-packet",
  "codex-for-oss-application",
  "openssf-best-practices-packet",
  "release-npm-first-publish-target",
  "awesome-list-submissions",
  "external-pr-packets",
  "launch-demo-storyboard",
  "launch-demo-packet",
  "launch-metrics-snapshot",
  "launch-demo-media",
  "launch-milestones",
  "market-map",
  "outreach-targets",
  "community-health-files",
  "scorecard-workflow",
  "issue-template-routing",
  "context-gap-template",
  "quickstart-smoke",
  "launch-check-script",
  "consumer-workflow-boundary",
  "maintainer-workflow",
  "node-engine-ci-matrix"
]) {
  assert.ok(ids.has(expected), `expected readiness check ${expected}`);
}

const scriptSource = readFileSync(scriptPath, "utf8");
for (const expected of [
  "function nextActionForFailedCheck",
  "docs/launch/npm-publish-runbook.md",
  "docs/launch/npm-credential-unblock.md",
  "docs/launch/github-metadata.md",
  "docs/launch/prelaunch-external-blockers.md",
  "npm run launch:github-metadata -- --apply"
]) {
  assert.match(scriptSource, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
