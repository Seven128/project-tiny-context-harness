import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";
import { runUpgrade } from "../../packages/sdlc-harness/dist/lib/upgrade.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-minimal-"));
const existingManifestRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-existing-manifest-"));
const missingSectionsRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-missing-sections-"));
const futureSchemaRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-future-schema-"));

try {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(root, { adopt: true, force: false });
  await rm(path.join(root, "DESIGN.md"), { force: true });
  await rm(path.join(root, "project_context/context.toml"), { force: true });
  await rm(path.join(root, "project_context/global.md"), { force: true });
  await rm(path.join(root, "project_context/architecture.md"), { force: true });
  await rm(path.join(root, "project_context/modules/main.md"), { force: true });
  await mkdir(path.join(root, "project_context/modules/analytics"), { recursive: true });
  await writeFile(
    path.join(root, "project_context/modules/analytics/reporting.md"),
    `# Module Context: reporting

## Responsibility

- Summarize reporting behavior.

## User / System Contract

- Users can inspect reporting outputs.

## Core Data / API / State

- Reporting reads project data and emits summaries.

## Key Constraints

- Keep reporting facts compact.

## Code Entry Points

- src/reporting

## Test Entry Points

- npm test

## Open Risks

- Reporting context may need later role refinement.
`,
    "utf8"
  );

  await mkdir(path.join(root, ".work_products/01_product"), { recursive: true });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await writeFile(path.join(root, ".work_products/01_product/prd.md"), "# Legacy PRD\n", "utf8");
  await writeFile(path.join(root, ".harness/state/lifecycle.yaml"), 'current_phase: "SPRINTING"\n', "utf8");
  await writeFile(
    path.join(root, ".harness/config.yaml"),
    `core:
  package: "agent-project-sdlc"
  schema_version: "1"
managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: ".harness/skills"
    strategy: "managed"
  - path: ".harness/pjsdlc_managed/templates"
    strategy: "managed"
never_overwrite:
  - ".work_products/**"
  - ".harness/state/**"
`,
    "utf8"
  );

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));
  assert.ok(!report.some((line) => line.includes("migrate-context")));

  await stat(path.join(root, "project_context/global.md"));
  await stat(path.join(root, "project_context/context.toml"));
  await stat(path.join(root, "project_context/architecture.md"));
  await stat(path.join(root, "project_context/areas/main.md"));
  await stat(path.join(root, "project_context/areas/analytics/reporting.md"));
  await assert.rejects(stat(path.join(root, "project_context/modules/analytics/reporting.md")));
  await stat(path.join(root, "DESIGN.md"));
  await stat(path.join(root, ".work_products/01_product/prd.md"));
  await stat(path.join(root, ".harness/state/lifecycle.yaml"));

  const config = await readFile(path.join(root, ".harness/config.yaml"), "utf8");
  assert.match(config, /schema_version: "4"/);
  assert.match(config, /\.harness\/pjsdlc_managed\/context_templates/);
  assert.match(config, /\.harness\/skills/);
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /DESIGN\.md/);
  assert.doesNotMatch(config, /\.harness\/pjsdlc_managed\/templates/);

  const migratedManifest = await readFile(path.join(root, "project_context/context.toml"), "utf8");
  assert.match(migratedManifest, /Auto-created by upgrade/);
  assert.match(migratedManifest, /id = "main"/);
  assert.match(migratedManifest, /context = "project_context\/areas\/main\.md"/);
  assert.match(migratedManifest, /id = "analytics-reporting"/);
  assert.match(migratedManifest, /context = "project_context\/areas\/analytics\/reporting\.md"/);

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  await stat(path.join(root, ".harness/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".harness/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(root, ".harness/skills/context_development_engineer/SKILL.md"));
  await stat(path.join(root, ".harness/pjsdlc_managed/context_templates/global.md"));

  await writeFile(
    path.join(existingManifestRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(existingManifestRoot, { adopt: true, force: false });
  const customManifest = `# Custom manifest

[[areas]]
id = "custom"
root = "."
context = "project_context/modules/main.md"
kind = "app"
default = true
`;
  await writeFile(path.join(existingManifestRoot, "project_context/context.toml"), customManifest, "utf8");
  await runUpgrade(existingManifestRoot);
  const keptManifest = await readFile(path.join(existingManifestRoot, "project_context/context.toml"), "utf8");
  assert.equal(keptManifest, customManifest.replace("project_context/modules/main.md", "project_context/areas/main.md"));

  await writeFile(
    path.join(missingSectionsRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(missingSectionsRoot, { adopt: true, force: false });
  await writeFile(
    path.join(missingSectionsRoot, "project_context/global.md"),
    `# Project / Delivery Context

## Project Goal

- Keep a small context.

## Non-goals / Boundaries

- Do not replace tests.

## Background

- Old context predates architecture context.

## Design Rationale

- Preserve existing content.

## Verification Entry Points

- npm test

## Current State

- Migrating.

## Next Safe Action

- Run upgrade.

## Module Index

- [main](modules/main.md)
`,
    "utf8"
  );
  await runUpgrade(missingSectionsRoot);
  const migratedGlobal = await readFile(path.join(missingSectionsRoot, "project_context/global.md"), "utf8");
  assert.match(migratedGlobal, /## Architecture Context/);
  assert.match(migratedGlobal, /## Context Graph/);
  assert.match(migratedGlobal, /## Context Index/);
  assert.match(migratedGlobal, /\(areas\/main\.md\)/);

  await mkdir(path.join(futureSchemaRoot, ".agent"), { recursive: true });
  await writeFile(
    path.join(futureSchemaRoot, ".agent/config.yaml"),
    `core:
  package: "agent-project-sdlc"
  schema_version: "5"
`,
    "utf8"
  );
  await assert.rejects(() => runSync(futureSchemaRoot), /unsupported Harness schema version 5/);
  await assert.rejects(() => runUpgrade(futureSchemaRoot), /unsupported Harness schema version 5/);
  await assert.rejects(stat(path.join(futureSchemaRoot, "AGENTS.md")));
  await assert.rejects(stat(path.join(futureSchemaRoot, "project_context")));
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(existingManifestRoot, { recursive: true, force: true });
  await rm(missingSectionsRoot, { recursive: true, force: true });
  await rm(futureSchemaRoot, { recursive: true, force: true });
}
