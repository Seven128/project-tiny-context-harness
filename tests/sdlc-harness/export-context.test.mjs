import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runExportContext } from "../../packages/sdlc-harness/dist/lib/context-export.js";

test("export-context writes default temporary full project context artifact", async () => {
  const root = await createExportProject();
  try {
    const report = await runExportContext(root, {
      full: true,
      now: new Date("2026-06-07T08:09:10.000Z")
    });
    assert.equal(report.wrote, true);
    assert.equal(report.outputRelativePath, "tmp/sdlc/context-exports/full-project-context-20260607T080910Z.md");
    assert.ok(report.sourceContextCount >= 4);
    const content = await readFile(report.outputPath, "utf8");
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
    assert.doesNotMatch(content, /\.env/);
    assert.doesNotMatch(content, /node_modules/);
    assert.doesNotMatch(content, /coverage/);
    assert.doesNotMatch(content, /old export should not appear/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context check reports sources without writing artifact", async () => {
  const root = await createExportProject();
  try {
    const report = await runExportContext(root, {
      full: true,
      check: true,
      output: "tmp/sdlc/context-exports/check-only.md"
    });
    assert.equal(report.wrote, false);
    await assert.rejects(stat(report.outputPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("export-context refuses project_context and non-temporary outputs", async () => {
  const root = await createExportProject();
  try {
    await assert.rejects(
      runExportContext(root, { full: true, output: "project_context/full-project-context.md" }),
      /tmp\/sdlc\/context-exports/
    );
    await assert.rejects(
      runExportContext(root, { full: true, output: "docs/full-project-context.md" }),
      /only writes temporary artifacts/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createExportProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdlc-harness-export-context-"));
  await mkdir(path.join(root, ".agent", "skills", "context_development_engineer"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await mkdir(path.join(root, "packages", "app"), { recursive: true });
  await mkdir(path.join(root, "node_modules", "hidden"), { recursive: true });
  await mkdir(path.join(root, "coverage"), { recursive: true });
  await mkdir(path.join(root, "tmp", "sdlc", "context-exports"), { recursive: true });

  await writeFile(path.join(root, "AGENTS.md"), "# AGENTS\n\nRead project_context first.\n", "utf8");
  await writeFile(path.join(root, "README.md"), "# README\n\napi_key: super-secret-value\n", "utf8");
  await writeFile(path.join(root, "DESIGN.md"), "# Design\n", "utf8");
  await writeFile(path.join(root, "Makefile"), "validate-context:\n\t$(SDLC_HARNESS) validate-context\n\ntest:\n\tnpm test\n", "utf8");
  await writeFile(
    path.join(root, ".agent", "skills", "context_development_engineer", "SKILL.md"),
    "# Skill\n\nUse project_context.\n",
    "utf8"
  );
  await writeFile(path.join(root, ".env"), "PASSWORD=super-secret-value\n", "utf8");
  await writeFile(path.join(root, "node_modules", "hidden", "README.md"), "hidden dependency\n", "utf8");
  await writeFile(path.join(root, "coverage", "README.md"), "coverage report\n", "utf8");
  await writeFile(path.join(root, "tmp", "sdlc", "context-exports", "full-project-context-20260101T000000Z.md"), "old export should not appear\n", "utf8");
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
