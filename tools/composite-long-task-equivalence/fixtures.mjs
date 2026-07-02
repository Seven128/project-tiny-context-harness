import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { slash } from "./normalize.mjs";

export async function prepareFixture(root, fixtureId) {
  const workdir = path.join(root, "tmp", "ty-context", "plan-acceptance", fixtureId);
  await rm(workdir, { recursive: true, force: true });
  await mkdir(workdir, { recursive: true });
  await mkdir(path.join(root, "tmp"), { recursive: true });
  await writeFile(path.join(workdir, "runtime.json"), "{}\n", "utf8");
  await writeFile(path.join(workdir, "browser.png"), "fake\n", "utf8");
  const sources = fixtureSources(fixtureId);
  await writeFile(path.join(workdir, "product-architecture-source.md"), sources.product, "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), sources.plan, "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), sources.checklist, "utf8");
  const deltas = fixtureDeltas(fixtureId).map(async (delta, index) => {
    const deltaPath = path.join(root, "tmp", `${fixtureId}-slice-delta-${index + 1}.json`);
    await writeFile(deltaPath, `${JSON.stringify(delta, null, 2)}\n`, "utf8");
    return deltaPath;
  });
  return {
    fixtureId,
    workdir,
    workdirArg: slash(path.relative(root, workdir)),
    deltas: await Promise.all(deltas),
    strictParse: fixtureId.startsWith("strict-parse")
  };
}

function fixtureSources(fixtureId) {
  if (fixtureId === "strict-parse-list-style") {
    return strictSources({
      plan: `# Technical Realization Plan

- PI-001: Legacy list definition
  - delivery_scope: system_capability_build
  - capability_target: legacy capability
  - full_population_boundary: not required
`
    });
  }
  if (fixtureId === "strict-parse-duplicate-heading") {
    return strictSources({
      plan: `${technicalPlan({ deliveryScope: "system_capability_build" })}

## PI-001: Duplicate definition

delivery_scope: system_capability_build
capability_target: duplicate capability
representative_samples:
full_population_boundary: duplicate boundary
non_required_population:
related_acs: AC-001
`
    });
  }
  if (fixtureId === "strict-parse-table-field") {
    return strictSources({
      product: `# Product / Architecture Source

| field | value |
|---|---|
| delivery_scope | system_capability_build |
full_population_required: false
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
`
    });
  }
  if (fixtureId === "strict-parse-field-heading") {
    return strictSources({
      plan: `# Technical Realization Plan

## PI-001: Field heading plan

### delivery_scope

system_capability_build
capability_target: real capability
representative_samples:
full_population_boundary: not required
non_required_population:
related_acs: AC-001
`
    });
  }
  if (fixtureId === "full-population-sample-only") {
    return sourcePacket({
      deliveryScope: "full_population_operation",
      fullPopulationRequired: true,
      acScope: "full_population_operation",
      acFullPopulationRequired: true
    });
  }
  if (fixtureId === "scope-conflict") {
    return sourcePacket({
      deliveryScope: "system_capability_build",
      fullPopulationRequired: false,
      planDeliveryScope: "full_population_operation",
      acScope: "full_population_operation",
      acFullPopulationRequired: true
    });
  }
  return sourcePacket({
    deliveryScope: "system_capability_build",
    fullPopulationRequired: false,
    acScope: "system_capability_build",
    acFullPopulationRequired: false
  });
}

function strictSources(overrides) {
  return {
    product:
      overrides.product ??
      productSource({
        deliveryScope: "system_capability_build",
        fullPopulationRequired: false
      }),
    plan: overrides.plan ?? technicalPlan({ deliveryScope: "system_capability_build" }),
    checklist:
      overrides.checklist ??
      acceptanceChecklist({
        acceptanceScope: "system_capability_build",
        fullPopulationRequired: false
      })
  };
}

function sourcePacket(options) {
  return {
    product: productSource(options),
    plan: technicalPlan({
      deliveryScope: options.planDeliveryScope ?? options.deliveryScope
    }),
    checklist: acceptanceChecklist({
      acceptanceScope: options.acScope,
      fullPopulationRequired: options.acFullPopulationRequired
    })
  };
}

function productSource({ deliveryScope, fullPopulationRequired }) {
  return `# Product / Architecture Source

Operations owns runtime recovery on the real owner surface.

delivery_scope: ${deliveryScope}
full_population_required: ${fullPopulationRequired}
representative_samples_validate:
  - recovery happy path sample
representative_samples_do_not_validate:
  - full population operation
out_of_scope_backlog:
  - historical record migration
`;
}

function technicalPlan({ deliveryScope }) {
  return `# Technical Realization Plan

## PI-001: Implement runtime recovery on Operations.

delivery_scope: ${deliveryScope}
capability_target: reusable runtime recovery capability
representative_samples:
  - recovery happy path sample
full_population_boundary: ${deliveryScope === "full_population_operation" ? "all configured providers" : "not required for capability build"}
non_required_population:
  - historical record migration
owner_surfaces:
  - Operations
forbidden_surfaces:
  - Provider Admission
implementation_paths:
  - src/pages/OperationsPage.tsx
  - src/runtime/kernel.ts
required_tests:
  - tests/runtime.spec.ts
related_acs:
  - AC-001
`;
}

function acceptanceChecklist({ acceptanceScope, fullPopulationRequired }) {
  return `# Acceptance Checklist

## AC-001: Operations runtime recovery works on the owner surface.

acceptance_scope: ${acceptanceScope}
ac_validates:
  - reusable runtime recovery capability
ac_does_not_validate:
  - ${fullPopulationRequired ? "sample-only recovery path" : "full population operation"}
sample_boundary: recovery happy path sample
full_population_required: ${fullPopulationRequired}
related_plan_items:
  - PI-001
required_proof_layers:
  - code
  - runtime
  - ui_browser
  - test
`;
}

function fixtureDeltas(fixtureId) {
  if (fixtureId.startsWith("strict-parse")) {
    return [];
  }
  const sampleOnly = fixtureId === "full-population-sample-only";
  if (fixtureId === "multi-slice") {
    return [
      sliceDelta({
        sliceId: "SLICE-001",
        evidenceId: "EV-001",
        layers: ["AC-001.runtime"],
        type: "runtime",
        doesNotProve: ["AC-001.ui_browser"]
      }),
      sliceDelta({
        sliceId: "SLICE-002",
        evidenceId: "EV-002",
        layers: ["AC-001.code", "AC-001.ui_browser", "AC-001.test"],
        type: "browser",
        doesNotProve: ["full population operation"]
      })
    ];
  }
  return [
    sliceDelta({
      sliceId: "SLICE-001",
      evidenceId: "EV-001",
      layers: ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"],
      type: "browser",
      doesNotProve: sampleOnly ? ["full population operation", "all-provider coverage"] : ["security audit"]
    })
  ];
}

function sliceDelta({ sliceId, evidenceId, layers, type, doesNotProve }) {
  return {
    slice_id: sliceId,
    slice_goal: `Close ${layers.join(", ")}`,
    touched_plan_items: ["PI-001"],
    touched_acs: ["AC-001"],
    code_changes: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
    evidence_records: [
      {
        evidence_id: evidenceId,
        slice_id: sliceId,
        type,
        freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
        command: type === "browser" ? "browser screenshot route /operations" : "node --test tests/runtime.spec.ts",
        artifact_paths: type === "browser" ? ["tmp/ty-context/plan-acceptance/demo/browser.png"] : ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
        proves: layers,
        does_not_prove: doesNotProve,
        redaction: { checked: true, contains_secret: false },
        reviewability: {
          external_reviewer_can_reproduce: true,
          reproduction_steps: type === "browser" ? "Open route /operations and inspect browser screenshot." : "Run node --test tests/runtime.spec.ts."
        }
      }
    ],
    closed_layers: layers,
    remaining_layers: ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"].filter((layer) => !layers.includes(layer)),
    blockers: [],
    cleanup_assertions: ["fixture cleaned"],
    progress_value: {
      type: "closed_required_proof_layer",
      closed_items: layers,
      why_it_reduces_rework: "Required proof layers now map to fresh evidence."
    }
  };
}
