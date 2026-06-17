import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runExportContext } from "../../packages/ty-context/dist/lib/context-export.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

test("export-context writes default temporary full project context artifact", async () => {
  const root = await createExportProject();
  try {
    const report = await runExportContext(root, {
      full: true,
      now: new Date("2026-06-07T08:09:10.000Z")
    });
    assert.equal(report.mode, "full");
    assert.equal(report.wrote, true);
    assert.equal(report.outputRelativePath, "tmp/ty-context/context-exports/full-project-context-20260607T080910Z.md");
    assert.ok(report.sourceContextCount >= 4);
    const content = await readFile(report.outputPath, "utf8");
    assert.match(content, /^# Full Project Context Export/m);
    assert.match(content, /Export artifact\. Do not reference from project_context\/context\.toml\./);
    assert.match(content, /generated_at: 2026-06-07T08:09:10\.000Z/);
    assert.match(content, /source_context_count:/);
    assert.match(content, /project_context\/global\.md/);
    assert.match(content, /project_context\/areas\/main\.md/);
    assert.match(content, /\.agent\/skills\/context_development_engineer\/SKILL\.md/);
    assert.match(content, /Makefile Verification Entry Summary/);
    assert.match(content, /Context Code Entry Point Index/);
    assert.match(content, /packages\/app\/src\/index\.ts/);
    assert.match(content, /api_key: \[REDACTED\]/);
    assert.match(content, /redacted 1 sensitive assignment line/);
    assert.doesNotMatch(content, /super-secret-value/);
    assert.doesNotMatch(content, /- \.env\r?\n/);
    assert.doesNotMatch(content, /node_modules/);
    assert.doesNotMatch(content, /coverage/);
    assert.doesNotMatch(content, /old export should not appear/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context writes default single-file code implementation artifact", async () => {
  const root = await createExportProject();
  try {
    const report = await runExportContext(root, {
      code: true,
      now: new Date("2026-06-07T08:09:10.000Z")
    });
    assert.equal(report.mode, "code");
    assert.equal(report.wrote, true);
    assert.equal(
      report.outputRelativePath,
      "tmp/ty-context/context-exports/code-level-implementation-20260607T080910Z/code-level-implementation.md"
    );
    assert.equal(report.sourceCodeCount, report.sourceFiles.length);
    await assert.rejects(
      stat(path.join(root, "tmp", "ty-context", "context-exports", "code-level-implementation-20260607T080910Z", "all.md"))
    );

    const content = await readFile(report.outputPath, "utf8");
    assert.match(content, /^# Code-Level Implementation Export/m);
    assert.match(content, /Implementation Guide/);
    assert.match(content, /Source File Index/);
    assert.match(content, /## packages\/app\/src\/index\.ts/);
    assert.match(content, /Summary: .+/);
    assert.match(content, /Metadata:\n- language: typescript\n- lines: \d+\n- characters: \d+\n- sha256: [a-f0-9]{64}/);
    assert.match(content, /```typescript\nexport function start/);
    assert.match(content, /## schemas\/user\.schema\.json/);
    assert.match(content, /## \.env\.example/);
    assert.match(content, /API_TOKEN=\[REDACTED\]/);
    assert.match(content, /redacted 1 sensitive assignment line/);
    assert.doesNotMatch(content, /super-secret-value/);
    assert.doesNotMatch(content, /should not appear from dist/);
    assert.doesNotMatch(content, /should not appear from logs/);
    assert.doesNotMatch(content, /should not appear from raw captures/);
    assert.doesNotMatch(content, /should not appear from secret filename/);
    assert.doesNotMatch(content, /node_modules/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context check reports sources without writing artifact", async () => {
  const root = await createExportProject();
  try {
    const fullReport = await runExportContext(root, {
      full: true,
      check: true,
      output: "tmp/ty-context/context-exports/check-only.md"
    });
    assert.equal(fullReport.wrote, false);
    await assert.rejects(stat(fullReport.outputPath));

    const codeReport = await runExportContext(root, {
      code: true,
      check: true,
      output: "tmp/ty-context/context-exports/code-check.md"
    });
    assert.equal(codeReport.wrote, false);
    assert.equal(codeReport.outputRelativePath, "tmp/ty-context/context-exports/code-check.md");
    assert.ok((codeReport.sourceCodeCount ?? 0) > 0);
    await assert.rejects(stat(codeReport.outputPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context --all check reports both default artifacts without writing", async () => {
  const root = await createExportProject();
  try {
    const result = await execFileAsync(process.execPath, [cliPath, "export-context", "--all", "--check"], {
      cwd: root,
      encoding: "utf8"
    });
    assert.match(result.stdout, /export-context check OK/);
    assert.match(result.stdout, /mode: all/);
    assert.match(result.stdout, /source context count: \d+/);
    assert.match(result.stdout, /source code count: \d+/);

    const fullOutput = /- full: (tmp\/ty-context\/context-exports\/full-project-context-\d{8}T\d{6}Z\.md)/.exec(
      result.stdout
    )?.[1];
    const codeOutput =
      /- code: (tmp\/ty-context\/context-exports\/code-level-implementation-\d{8}T\d{6}Z\/code-level-implementation\.md)/.exec(
        result.stdout
      )?.[1];
    assert.ok(fullOutput);
    assert.ok(codeOutput);
    await assert.rejects(stat(path.join(root, ...fullOutput.split("/"))));
    await assert.rejects(stat(path.join(root, ...codeOutput.split("/"))));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context refuses project_context and non-temporary outputs", async () => {
  const root = await createExportProject();
  try {
    await assert.rejects(
      runExportContext(root, { full: true, output: "project_context/full-project-context.md" }),
      /tmp\/ty-context\/context-exports/
    );
    await assert.rejects(
      runExportContext(root, { code: true, output: "docs/code-level-implementation.md" }),
      /only writes temporary artifacts/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context requires exactly one export mode", async () => {
  const root = await createExportProject();
  try {
    await assert.rejects(runExportContext(root, { full: true, code: true }), /exactly one/);
    await assert.rejects(runExportContext(root, {}), /exactly one/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createExportProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-export-context-"));
  await mkdir(path.join(root, ".agent", "skills", "context_development_engineer"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await mkdir(path.join(root, "packages", "app", "src"), { recursive: true });
  await mkdir(path.join(root, "schemas"), { recursive: true });
  await mkdir(path.join(root, "node_modules", "hidden"), { recursive: true });
  await mkdir(path.join(root, "coverage"), { recursive: true });
  await mkdir(path.join(root, "dist"), { recursive: true });
  await mkdir(path.join(root, "logs"), { recursive: true });
  await mkdir(path.join(root, "raw-captures"), { recursive: true });
  await mkdir(path.join(root, "tmp", "ty-context", "context-exports"), { recursive: true });

  await writeFile(path.join(root, "AGENTS.md"), "# AGENTS\n\nRead project_context first.\n", "utf8");
  await writeFile(path.join(root, "README.md"), "# README\n\napi_key: super-secret-value\n", "utf8");
  await writeFile(path.join(root, "DESIGN.md"), "# Design\n", "utf8");
  await writeFile(path.join(root, "Makefile"), "validate-context:\n\t$(TY_CONTEXT) validate-context\n\ntest:\n\tnpm test\n", "utf8");
  await writeFile(path.join(root, ".env"), "PASSWORD=super-secret-value\n", "utf8");
  await writeFile(path.join(root, ".env.example"), "API_TOKEN=super-secret-value\n", "utf8");
  await writeFile(
    path.join(root, ".agent", "skills", "context_development_engineer", "SKILL.md"),
    "# Skill\n\nUse project_context.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, "packages", "app", "src", "index.ts"),
    'export function start() {\n  app.get("/health", () => "ok");\n}\n',
    "utf8"
  );
  await writeFile(
    path.join(root, "schemas", "user.schema.json"),
    '{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "User"\n}\n',
    "utf8"
  );
  await writeFile(path.join(root, "dist", "generated.ts"), "should not appear from dist\n", "utf8");
  await writeFile(path.join(root, "logs", "app.log"), "should not appear from logs\n", "utf8");
  await writeFile(path.join(root, "raw-captures", "capture.json"), "should not appear from raw captures\n", "utf8");
  await writeFile(path.join(root, "secret-config.ts"), "should not appear from secret filename\n", "utf8");
  await writeFile(path.join(root, "node_modules", "hidden", "README.md"), "hidden dependency\n", "utf8");
  await writeFile(path.join(root, "coverage", "README.md"), "coverage report\n", "utf8");
  await writeFile(path.join(root, "tmp", "ty-context", "context-exports", "full-project-context-20260101T000000Z.md"), "old export should not appear\n", "utf8");
  await writeFile(
    path.join(root, "project_context", "global.md"),
    "# Project / Delivery Context\n\n## Verification Entry Points\n\n- make validate-context\n",
    "utf8"
  );
  await writeFile(path.join(root, "project_context", "architecture.md"), "# Architecture Context\n", "utf8");
  await writeFile(
    path.join(root, "project_context", "context.toml"),
    '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\ndefault = true\n',
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "areas", "main.md"),
    "# Main\n\n## Code Entry Points\n\n- packages/app/src/index.ts\n",
    "utf8"
  );
  await writeFile(path.join(root, "packages", "app", "README.md"), "# App README\n", "utf8");
  return root;
}
