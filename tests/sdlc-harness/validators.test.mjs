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

test("validate-context accepts role-based context graph entries", async () => {
  const root = await createContextProject({
    manifest: completeContextManifest(),
    extraFiles: {
      "project_context/modules/main/foundation/trading.md": completeFoundationContext(),
      "project_context/modules/main/contracts/order.md": completeContractContext()
    }
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /loaded project_context\/context\.toml with 1 area\(s\) and 2 context node\(s\)/);
    assert.match(report.info.join("\n"), /context graph file\(s\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context applies role-specific schemas", async () => {
  const root = await createContextProject({
    manifest: completeContextManifest(),
    extraFiles: {
      "project_context/modules/main/foundation/trading.md": `---
context_role: foundation
read_policy: optional
---
# Trading Foundation

## Role

- Define trading vocabulary.

## Use When

- Extending trading concepts.

## Do Not Use For

- Routine UI edits.

## Source Body

- Source assertions live here.
`,
      "project_context/modules/main/contracts/order.md": completeContractContext()
    }
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /Derived Contracts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects missing Schema v4 context graph manifest", async () => {
  const root = await createContextProject({ manifest: null });
  try {
    const report = await runValidator(root, "validate-context");
    assert.match(report.errors.join("\n"), /project_context\/context\.toml is missing/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-context rejects invalid context graph metadata", async () => {
  const root = await createContextProject({
    manifest: `[[areas]]
id = "main"
root = "."
context = "project_context/modules/main.md"
kind = "app"
default = true
forbidden_runtime_dependencies = "domains/intelhub"

[[context]]
path = "project_context/modules/main/foundation/trading.md"
role = "glossary"
read_policy = "sometimes"
triggers = ["trading"]
`,
    extraFiles: {
      "project_context/modules/main/foundation/trading.md": completeFoundationContext()
    }
  });
  try {
    const report = await runValidator(root, "validate-context");
    const errors = report.errors.join("\n");
    assert.match(errors, /forbidden_runtime_dependencies/);
    assert.match(errors, /unsupported context role: glossary/);
    assert.match(errors, /unsupported read_policy: sometimes/);
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

test("validate-context rejects verification-result claims inside architecture context", async () => {
  const root = await createContextProject({
    architecture: completeArchitectureContext().replace("- npm test --workspace agent-project-sdlc", "- npm test passed")
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
  schema_version: "${overrides.schemaVersion ?? "4"}"
`,
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "global.md"),
    overrides.global ?? completeGlobalContext(),
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "architecture.md"),
    overrides.architecture ?? completeArchitectureContext(),
    "utf8"
  );
  await writeFile(
    path.join(root, "project_context", "modules", "main.md"),
    overrides.module ?? completeModuleContext(),
    "utf8"
  );
  const manifest = overrides.manifest === undefined ? completeDefaultContextManifest() : overrides.manifest;
  if (manifest !== null) {
    await writeFile(path.join(root, "project_context", "context.toml"), manifest, "utf8");
  }
  for (const [relative, content] of Object.entries(overrides.extraFiles ?? {})) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
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

## Architecture Context

- See project_context/architecture.md for the restrained architecture context.

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

function completeArchitectureContext() {
  return `# Architecture Context

## System Boundary

- The package owns CLI commands, managed assets, sync behavior and Context validation.

## Component Map

- CLI commands call library modules for init, sync, upgrade, doctor and validation.

## Data / Control Flow

- Users run the CLI; the package reads configuration, writes managed assets and validates project_context files.

## Design Rationale

- Architecture context stays minimal and records only durable boundaries that are hard to infer from code.

## Constraints And Tradeoffs

- The Harness keeps context quality small and does not own project product quality.

## Verification Implications

- npm test --workspace agent-project-sdlc

## Open Risks

- Package assets can drift if source sync is skipped.
`;
}

function completeModuleContext() {
  return `# Module Context: main

## Responsibility

- Keep package initialization, sync, migration and validation behavior coherent.

## User / System Contract

- Users can initialize, sync, validate and migrate context explicitly.

## Core Data / API / State

- project_context/global.md, project_context/context.toml and project_context/modules/**/*.md are the durable facts.

## Key Constraints

- The Harness validates context recoverability, not product behavior.

## Code Entry Points

- packages/sdlc-harness/src/

## Test Entry Points

- npm test --workspace agent-project-sdlc

## Open Risks

- Context could become too verbose if architecture notes duplicate implementation details.
`;
}

function completeContextManifest() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/modules/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/modules/main/foundation/trading.md"
role = "foundation"
read_policy = "optional"
triggers = ["trading", "foundation"]

[[context]]
path = "project_context/modules/main/contracts/order.md"
role = "contract"
triggers = ["order", "contract", "compatibility"]
`;
}

function completeDefaultContextManifest() {
  return `[[areas]]
id = "main"
root = "."
context = "project_context/modules/main.md"
kind = "app"
default = true
`;
}

function completeFoundationContext() {
  return `---
context_role: foundation
read_policy: optional
---
# Trading Foundation

## Role

- Define durable trading vocabulary and conceptual assertions.

## Use When

- Extending or calibrating trading concepts.

## Do Not Use For

- Routine implementation work that only needs code entry points.

## Derived Contracts

- Area contexts must not treat these concepts as product test evidence.

## Source Body

- Foundational assertions live here as source material for future contracts.
`;
}

function completeContractContext() {
  return `---
context_role: contract
---
# Order Contract

## Producer

- The order service produces normalized order payloads.

## Consumer

- UI and reporting modules consume order payloads.

## Schema/Shape

- The payload contains id, status and timestamps.

## Compatibility

- Additive fields are allowed; renaming existing fields requires migration.

## Tests

- npm test --workspace agent-project-sdlc
`;
}
