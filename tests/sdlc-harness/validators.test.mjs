import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runValidator } from "../../packages/sdlc-harness/dist/lib/validators.js";

test("Minimal Context validators accept complete project_context facts", async () => {
  const root = await createContextProject();
  try {
    const contextReport = await runValidator(root, "validate-context");
    assert.deepEqual(contextReport.errors, []);
    assert.match(contextReport.info.join("\n"), /Minimal Context validation passed/);

    const harnessReport = await runValidator(root, "validate-harness");
    assert.deepEqual(harnessReport.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects missing required recovery facts", async () => {
  const root = await createContextProject({
    global: `# Project / Delivery Context

## Project Goal

- Ship the package.

## Verification Entry Points

- npm test
`
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /Non-goals \/ Boundaries/);
    assert.match(report.errors.join("\n"), /Next Safe Action/);
    assert.match(report.errors.join("\n"), /Module Index/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects verification-result claims inside context", async () => {
  const root = await createContextProject({
    global: completeGlobalContext().replace("- npm test", "- npm test passed")
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /must list verification entry points/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("old stage validators are not supported by Minimal Context Harness", async () => {
  const root = await createContextProject();
  try {
    const report = await runValidator(root, "validate-dev");
    assert.deepEqual(report.info, []);
    assert.match(report.errors.join("\n"), /unknown validator: validate-dev/);
    assert.match(report.errors.join("\n"), /Minimal Context Harness supports validate-context and validate-harness only/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createContextProject(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdlc-harness-context-validator-"));
  await mkdir(path.join(root, ".agent", "pjsdlc_managed"), { recursive: true });
  await mkdir(path.join(root, "project_context", "modules"), { recursive: true });
  await writeFile(
    path.join(root, ".agent", "config.yaml"),
    `core:
  package: agent-project-sdlc
  schema_version: "3"
`,
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "global.md"),
    overrides.global ?? completeGlobalContext(),
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "modules", "main.md"),
    overrides.module ?? completeModuleContext(),
    "utf8"
  );
  return root;
}

function completeGlobalContext() {
  return `# Project / Delivery Context

## Project Goal

- Maintain a Minimal Context Harness package.

## Non-goals / Boundaries

- Do not replace product tests or project-specific quality gates.

## Background

- The package keeps the smallest durable context a fresh agent needs.

## Design Rationale

- Context quality is the Harness responsibility; product quality remains with project tests.

## Verification Entry Points

- npm test
- make validate-context

## Current State

- Minimal Context files are the canonical long-lived fact source.

## Next Safe Action

- Read project_context/global.md, then the affected module context before changing code.

## Module Index

- [main](modules/main.md)
`;
}

function completeModuleContext() {
  return `# Module Context: main

## Responsibility

- Keep package initialization, sync, migration and validation behavior coherent.

## User / System Contract

- Users can initialize, sync, validate and migrate context explicitly.

## Core Data / API / State

- project_context/global.md and project_context/modules/*.md are the durable facts.

## Key Constraints

- The Harness validates context recoverability, not product behavior.

## Code Entry Points

- packages/sdlc-harness/src/

## Test Entry Points

- npm test --workspace agent-project-sdlc

## Open Risks

- Existing users may still need migrate-context to summarize old work products.
`;
}
