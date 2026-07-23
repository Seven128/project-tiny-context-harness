import assert from "node:assert/strict";
import test from "node:test";
import {
  authorityRevisionUserDecisionReasons,
  classifyAuthorityRevision,
} from "../../packages/ty-context/dist/lib/long-task-authority-revision-summary.js";
import { adoptedAuthorityRevisionReplay } from "./long-task-authority-revision-replay-fixture.mjs";

test("Rev3-Rev36 reduce 33 approval interruptions to two user decisions", () => {
  const decisions = adoptedAuthorityRevisionReplay.filter((event) => {
    const reasons = authorityRevisionUserDecisionReasons(
      revisionDiff(event),
    );
    assert.equal(
      reasons.length > 0,
      event.expectedUserDecision,
      `Rev${event.revision} ${event.eventKey}`,
    );
    return reasons.length > 0;
  });

  assert.deepEqual(
    decisions.map((event) => event.revision),
    [3, 12],
  );
  const priorApprovalInterruptions = adoptedAuthorityRevisionReplay.filter(
    (event) => event.revision !== 35,
  ).length;
  assert.equal(priorApprovalInterruptions, 33);
  assert.equal(priorApprovalInterruptions - decisions.length, 31);
  assert.equal(
    decisions.filter((event) => event.instructionCoverage !== "exact").length,
    1,
    "Rev12's exact task-specific instruction carries its decision; only Rev3 needs a new question",
  );
});

test("uncertain replay repairs fail closed when their preservation condition is absent", () => {
  const guards = [
    {
      name: "Rev13 scope removes an owner Context",
      reason: "owner_context_ref_removed",
    },
    {
      name: "Rev16 loses unmatched Counterfactual interception",
      reason: "counterfactual_removed",
    },
    {
      name: "Rev24 changes a product performance promise",
      reason: "product_semantics_changed",
      productSemanticFields: ["outcomes.native.requirements.startup-budget"],
    },
    {
      name: "Rev30 changes a Binding target instead of adding a carrier",
      reason: "binding_removed_or_expanded",
      bindingChanges: ["quality:admin-web:target_or_kind_changed"],
    },
    {
      name: "Rev32 removes external-provider confirmation",
      reason: "external_confirmation_changed",
    },
    {
      name: "Rev36 removes production input coverage",
      reason: "input_path_coverage_reduced",
    },
    {
      name: "new unknown reason",
      reason: "future_unclassified_revision_reason",
    },
  ];
  for (const guard of guards) {
    const diff = revisionDiff({
      normalizedReasons: [guard.reason],
      productSemanticFields: guard.productSemanticFields ?? [],
      bindingChanges: guard.bindingChanges ?? [],
    });
    assert.ok(
      authorityRevisionUserDecisionReasons(diff).length > 0,
      guard.name,
    );
    assert.equal(
      classifyAuthorityRevision(diff),
      "protected_semantic_or_proof_change",
      guard.name,
    );
  }
});

test("runner implementation repairs auto-adopt, but runner type/effect changes remain decisions", () => {
  for (const field of [
    "target",
    "argv",
    "cwd",
    "timeout_ms",
    "retry_policy",
    "idempotent",
  ]) {
    const diff = revisionDiff({
      normalizedReasons: ["runner_definition_changed"],
      runnerChanges: [`first.check:${field}`],
    });
    assert.deepEqual(authorityRevisionUserDecisionReasons(diff), [], field);
  }
  for (const field of ["type", "effect", "future_field"]) {
    const diff = revisionDiff({
      normalizedReasons: ["runner_definition_changed"],
      runnerChanges: [`first.check:${field}`],
    });
    assert.deepEqual(
      authorityRevisionUserDecisionReasons(diff),
      ["runner_definition_changed"],
      field,
    );
  }
});

function revisionDiff(event) {
  const reasons = event.normalizedReasons ?? [];
  return {
    product_claims_added: [],
    product_claims_removed: [],
    product_claims_changed: [],
    product_semantics_changed: event.productSemanticFields ?? [],
    global_semantics_changed: [],
    checks_added: [],
    checks_removed: [],
    negative_assertions_removed: [],
    acceptance_semantics_reduced: [],
    proof_surfaces_changed: [],
    source_claims_added: [],
    source_claims_removed_or_changed: [],
    source_paths_removed_or_replaced: [],
    source_files_added: [],
    source_files_removed: [],
    source_files_changed: [],
    context_snapshot_mode_changed: false,
    context_topology_changed: false,
    context_files_added: [],
    context_files_removed: [],
    context_files_changed: [],
    owner_paths_expanded: [],
    owner_context_refs_removed: [],
    expected_change_paths_expanded: [],
    allowed_paths_expanded: [],
    forbidden_paths_removed: [],
    runner_definitions_changed: event.runnerChanges ?? [],
    verification_inputs_added: [],
    verification_inputs_removed_or_replaced: reasons.includes(
      "verification_input_removed_or_replaced",
    )
      ? ["first.check:tests/verifier.mjs"]
      : [],
    input_paths_added: [],
    input_paths_removed_or_narrowed: [],
    expected_output_paths_removed_or_weakened: [],
    artifacts_removed: [],
    environment_requirements_removed: reasons.includes(
      "environment_requirement_removed",
    )
      ? ["first.check:legacy-environment"]
      : [],
    bindings_removed_or_expanded: event.bindingChanges ?? [],
    obligations_removed_or_weakened: [],
    rollback_or_recovery_weakened: [],
    counterfactuals_removed: [],
    population_weakened: [],
    external_confirmations_changed: reasons.includes(
      "external_confirmation_changed",
    ),
    external_confirmation_changes: [],
    verifier_content_changed: reasons.includes("verifier_content_changed"),
    verifier_runtime_locator_changed: false,
    verifier_files_changed: [],
    previous_verifier: verifier(),
    next_verifier: verifier(),
    source_claims_changed: false,
    risk_changed: reasons.includes("risk_changed_requires_review"),
    owner_or_path_boundary_changed: reasons.some((reason) =>
      [
        "owner_path_expanded",
        "owner_context_ref_removed",
        "expected_change_path_expanded",
        "allowed_path_expanded",
        "forbidden_path_removed",
        "binding_removed_or_expanded",
      ].includes(reason),
    ),
    runner_or_verification_inputs_changed: reasons.some((reason) =>
      [
        "runner_definition_changed",
        "verification_input_removed_or_replaced",
        "input_path_coverage_reduced",
        "expected_output_requirement_weakened",
      ].includes(reason),
    ),
    technical_obligations_changed: reasons.some((reason) =>
      [
        "obligation_removed_or_weakened",
        "rollback_or_recovery_weakened",
      ].includes(reason),
    ),
    reduction_reasons: reasons,
  };
}

function verifier() {
  return {
    package_name: "project-tiny-context-harness",
    package_version: "fixture",
    package_integrity: "0".repeat(64),
    runtime_locator: "packages/ty-context/dist/cli.js",
    kernel_sha256: "1".repeat(64),
    files: {},
  };
}
