import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  classifyMissingTools,
  parseArgs,
  resolveInvocation,
  renderMarkdownReport,
  summarizeChecks
} from "../../tools/consumer_lab_full_test.mjs";

test("consumer lab consumes one explicit candidate and signed external result without repacking or V2", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../../tools/consumer_lab_full_test.mjs", import.meta.url), "utf8"));
  assert.match(source, /--candidate-tarball/);
  assert.match(source, /--external-result/);
  assert.doesNotMatch(source, /npm", \["pack"/);
  assert.doesNotMatch(source, /Composite V2|ty-context-observation-v1|product-source-v2/u);
});

test("consumer lab resolves Node package shims on Windows", () => {
  assert.deepEqual(resolveInvocation("npm", ["pack"], "win32", "C:\\node\\node.exe"), {
    command: "C:\\node\\node.exe",
    args: ["C:\\node\\node_modules\\npm\\bin\\npm-cli.js", "pack"]
  });
  assert.deepEqual(resolveInvocation("npx", ["tool"], "win32", "C:\\node\\node.exe"), {
    command: "C:\\node\\node.exe",
    args: ["C:\\node\\node_modules\\npm\\bin\\npx-cli.js", "tool"]
  });
  assert.deepEqual(resolveInvocation("npm", ["test"], "linux", "/bin/node"), { command: "npm", args: ["test"] });
});

test("consumer lab script parses safety and report options", () => {
  const options = parseArgs([
    "--lab-dir",
    "/tmp/lab",
    "--source-root",
    "/tmp/source",
    "--reset-lab",
    "--keep-lab",
    "--report-only",
    "--candidate-tarball",
    "/tmp/candidate.tgz",
    "--candidate-sha256",
    "a".repeat(64),
    "--host-release-sha256",
    "b".repeat(64),
    "--external-result",
    "/tmp/audit.json",
    "--json-report",
    "/tmp/report.json",
    "--markdown-report",
    "/tmp/report.md"
  ]);

  assert.equal(options.labDir, path.resolve("/tmp/lab"));
  assert.equal(options.sourceRoot, path.resolve("/tmp/source"));
  assert.equal(options.resetLab, true);
  assert.equal(options.keepLab, true);
  assert.equal(options.reportOnly, true);
  assert.equal(options.candidateTarball, path.resolve("/tmp/candidate.tgz"));
  assert.equal(options.candidateSha256, "a".repeat(64));
  assert.equal(options.externalResult, path.resolve("/tmp/audit.json"));
  assert.equal(options.jsonReport, path.resolve("/tmp/report.json"));
  assert.equal(options.markdownReport, path.resolve("/tmp/report.md"));
});

test("consumer lab rejects unknown options and malformed candidate hashes", () => {
  assert.throws(() => parseArgs(["--commit-lab"]), /Unknown or incomplete option/);
  assert.throws(() => parseArgs(["--candidate-sha256", "wrong"]), /64 lowercase hex/);
});

test("consumer lab script classifies missing managed tools as failure", () => {
  assert.deepEqual(
    classifyMissingTools({
      status: 2,
      stdout: "",
      stderr: "python3: can't open file '/lab/tools/validate_context.py': [Errno 2] No such file or directory"
    }),
    {
      status: "FAIL",
      details: "consumer repo is missing package-managed tools/**"
    }
  );
});

test("consumer lab script summarizes and renders reports", () => {
  const checks = [
    { area: "Package", evidence: "install", status: "PASS", details: "ok" },
    { area: "Makefile", evidence: "validate-harness", status: "BLOCKED", details: "missing tools" },
    { area: "Other", evidence: "unexpected", status: "FAIL", details: "bad" }
  ];
  const summary = summarizeChecks(checks);
  assert.deepEqual(summary, { PASS: 1, BLOCKED: 1, FAIL: 1, worst: "FAIL" });

  const markdown = renderMarkdownReport({
    packageName: "project-tiny-context-harness",
    packageVersion: "0.0.0",
    sourceRoot: "/source",
    labDir: "/lab",
    labCleanup: "deleted",
    labCommit: "abc123",
    labTag: "tag",
    startedAt: "start",
    finishedAt: "finish",
    summary,
    checks,
    candidateSha256: "a".repeat(64)
  });
  assert.match(markdown, /Decision: FAIL/);
  assert.match(markdown, /validate-harness/);
  assert.match(markdown, /Candidate SHA-256/);
});
