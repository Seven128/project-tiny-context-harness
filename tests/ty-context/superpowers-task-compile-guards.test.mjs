import test from "node:test";
import assert from "node:assert/strict";
import { rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { createPlanProject } from "./plan-validator-fixtures.mjs";

test("compile rejects graph guard failures with categorized rows", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, badPlan(), badChecklist());
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-GUARDS", planSlug: "demo" });
    await assert.rejects(
      () => compileSuperpowersTask(workdir),
      /blocking_unparseable_object.*related_acs|blocking_missing_primary_path|blocking_missing_owner_boundary|widget_magic/s
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects missing authority inputs with missing-fields categories", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, goodPlan(), goodChecklist());
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-MISSING-SOURCE", planSlug: "demo" });
    await unlink(path.join(workdir, "technical-realization-plan.md"));
    await assert.rejects(() => compileSuperpowersTask(workdir), /blocking_missing_plan.*technical_realization_plan/s);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compile rejects ACs without observable result fields", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeSources(workdir, goodPlan(), goodChecklist().replace("ac_validates: real capability", "ac_validates:"));
    await initializeSuperpowersTask(workdir, { taskId: "SP-STRICT-OBSERVABLE", planSlug: "demo" });
    await assert.rejects(() => compileSuperpowersTask(workdir), /blocking_missing_observable_result.*ac_validates/s);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeSources(workdir, technicalPlan, acceptanceChecklist) {
  await writeFile(path.join(workdir, "product-architecture-source.md"), productSource(), "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), technicalPlan, "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), acceptanceChecklist, "utf8");
}

function productSource() {
  return "# Product / Architecture Source\n\ndelivery_scope: system_capability_build\nfull_population_required: false\nrepresentative_samples_validate:\nrepresentative_samples_do_not_validate:\nout_of_scope_backlog:\n";
}

function goodPlan() {
  return "# Technical Realization Plan\n\n## PI-001: Build capability\n\ndelivery_scope: system_capability_build\ncapability_target: real capability\nrepresentative_samples:\nfull_population_boundary: not required\nnon_required_population:\nimplementation_paths:\n  - src/runtime/kernel.ts\nrelated_acs: AC-001\n";
}

function goodChecklist() {
  return "# Acceptance Checklist\n\n## AC-001: Capability works\n\nacceptance_scope: system_capability_build\nac_validates: real capability\nac_does_not_validate: prose-only completion\nsample_boundary: none\nfull_population_required: false\nrelated_plan_items: PI-001\nrequired_proof_layers:\n  - runtime\n";
}

function badPlan() {
  return "# Technical Realization Plan\n\n## PI-001: Owner-surface work with bad AC reference\n\ndelivery_scope: system_capability_build\ncapability_target: real owner surface behavior\nrepresentative_samples:\nfull_population_boundary: not required\nnon_required_population:\nowner_surfaces:\n  - Operations\nrelated_acs:\n  - AC-999\n";
}

function badChecklist() {
  return "# Acceptance Checklist\n\n## AC-001: Runtime behavior is observable.\n\nacceptance_scope: system_capability_build\nac_validates:\n  - runtime behavior\nac_does_not_validate:\n  - prose-only completion\nsample_boundary: none\nfull_population_required: false\nrelated_plan_items:\n  - PI-999\nrequired_proof_layers:\n  - widget_magic\n";
}
