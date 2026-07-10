import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  COMPOSITE_INPUT_CONTRACT,
  compositeInputDocument
} from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import {
  ACCEPTANCE_FIELDS,
  ACCEPTANCE_FIELD_TYPES,
  ACCEPTANCE_REQUIRED_FIELDS,
  ACCEPTANCE_SCOPES,
  PLAN_DELIVERY_SCOPES,
  PLAN_FIELDS,
  PLAN_FIELD_TYPES,
  PLAN_REQUIRED_FIELDS,
  PRODUCT_DELIVERY_SCOPES,
  PRODUCT_FIELDS,
  PRODUCT_FIELD_TYPES,
  PRODUCT_REQUIRED_FIELDS,
  SCOPE_FIT_DECISIONS
} from "../../packages/ty-context/dist/lib/superpowers-task-fields.js";
import * as stateModule from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import * as rendererModule from "../../packages/ty-context/dist/lib/composite-long-task-renderer.js";

const EXPECTED_FIELDS = {
  product_architecture_source: [
    "delivery_scope",
    "full_population_required",
    "representative_samples_validate",
    "representative_samples_do_not_validate",
    "out_of_scope_backlog",
    "scope_fit_decision",
    "selected_scope_fit_slice",
    "owner_boundary",
    "primary_capability_path",
    "non_completing_outcomes",
    "assertion_policy",
    "source_authority",
    "product_goal",
    "surface_ia_lock",
    "decision_lock",
    "context_delta",
    "source_to_context_coverage",
    "acceptance_semantics",
    "impact"
  ],
  technical_realization_plan: [
    "delivery_scope",
    "capability_target",
    "representative_samples",
    "full_population_boundary",
    "non_required_population",
    "owner_surfaces",
    "forbidden_surfaces",
    "owner_boundary",
    "primary_capability_path",
    "trigger_contract",
    "state_transition_contract",
    "observable_result_contract",
    "assertion_support",
    "required_assertion_commands",
    "invalid_implementation_shortcuts",
    "implementation_paths",
    "required_tests",
    "related_acs",
    "requirement_ref",
    "decision_id",
    "proof_layer_ids",
    "api_schema_changes",
    "state_machine",
    "data_flow",
    "worker_runtime_behavior",
    "ui_ia_changes",
    "migration_plan",
    "evidence_artifacts",
    "explicit_no_test_scope",
    "non_completing_shortcuts",
    "substitution_policy",
    "drift_severity",
    "partial_conditions",
    "blockers",
    "context_fact_refs"
  ],
  acceptance_checklist: [
    "acceptance_scope",
    "ac_validates",
    "ac_does_not_validate",
    "sample_boundary",
    "full_population_required",
    "related_plan_items",
    "required_proof_layers",
    "assertion_command",
    "assertion_artifacts",
    "positive_assertions",
    "negative_assertions",
    "machine_blocking",
    "invalid_completion_signals",
    "assertion_result_required",
    "ac_type",
    "proof_chain",
    "verification_method",
    "fail_conditions",
    "invalid_evidence",
    "substitution_policy",
    "missing_layer_downgrade",
    "auditor_expectation",
    "out_of_scope_na_approval_source",
    "required_test_ids",
    "explicit_no_test_scope",
    "hard_blockers",
    "validates_explanation",
    "does_not_validate_explanation",
    "final_evidence_expected",
    "test_cases"
  ]
};

const EXPECTED_REQUIRED = {
  product_architecture_source: EXPECTED_FIELDS.product_architecture_source.slice(0, 13),
  technical_realization_plan: [
    "delivery_scope",
    "capability_target",
    "representative_samples",
    "full_population_boundary",
    "non_required_population",
    "owner_boundary",
    "primary_capability_path",
    "trigger_contract",
    "state_transition_contract",
    "observable_result_contract",
    "assertion_support",
    "required_assertion_commands",
    "invalid_implementation_shortcuts",
    "implementation_paths"
  ],
  acceptance_checklist: EXPECTED_FIELDS.acceptance_checklist.slice(0, 14)
};

const COMPATIBILITY = {
  product_architecture_source: {
    fields: PRODUCT_FIELDS,
    required: PRODUCT_REQUIRED_FIELDS,
    types: PRODUCT_FIELD_TYPES,
    enums: {
      delivery_scope: [...PRODUCT_DELIVERY_SCOPES],
      scope_fit_decision: [...SCOPE_FIT_DECISIONS]
    }
  },
  technical_realization_plan: {
    fields: PLAN_FIELDS,
    required: PLAN_REQUIRED_FIELDS,
    types: PLAN_FIELD_TYPES,
    enums: { delivery_scope: [...PLAN_DELIVERY_SCOPES] }
  },
  acceptance_checklist: {
    fields: ACCEPTANCE_FIELDS,
    required: ACCEPTANCE_REQUIRED_FIELDS,
    types: ACCEPTANCE_FIELD_TYPES,
    enums: { acceptance_scope: [...ACCEPTANCE_SCOPES] }
  }
};

test("CompositeInputContract is the ordered canonical source for compatibility field exports", () => {
  assert.equal(COMPOSITE_INPUT_CONTRACT.schema_version, "composite-input-contract-v1");
  assert.deepEqual(
    COMPOSITE_INPUT_CONTRACT.documents.map(({ id, file, definition_kind }) => ({ id, file, definition_kind })),
    [
      { id: "product_architecture_source", file: "product-architecture-source.md", definition_kind: "document" },
      { id: "technical_realization_plan", file: "technical-realization-plan.md", definition_kind: "PI" },
      { id: "acceptance_checklist", file: "acceptance-checklist.md", definition_kind: "AC" }
    ]
  );

  for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
    const compatibility = COMPATIBILITY[document.id];
    const fieldNames = document.fields.map((field) => field.name);
    const required = document.fields.filter((field) => field.required).map((field) => field.name);
    const types = Object.fromEntries(document.fields.map((field) => [field.name, field.type]));
    const enums = Object.fromEntries(
      document.fields.filter((field) => field.enum_values.length > 0).map((field) => [field.name, [...field.enum_values]])
    );

    assert.deepEqual(fieldNames, EXPECTED_FIELDS[document.id]);
    assert.deepEqual(required, EXPECTED_REQUIRED[document.id]);
    assert.deepEqual([...compatibility.fields], fieldNames);
    assert.deepEqual([...compatibility.required], required);
    assert.deepEqual(compatibility.types, types);
    assert.deepEqual(compatibility.enums, enums);
  }
});

test("CompositeInputContract exposes a stable canonical SHA-256", () => {
  const { canonical_sha256: actual, ...canonicalBody } = COMPOSITE_INPUT_CONTRACT;
  const expected = createHash("sha256").update(JSON.stringify(canonicalBody)).digest("hex");

  assert.match(actual, /^[a-f0-9]{64}$/);
  assert.equal(actual, "094faafe9275e696c75479f73d659c78989593083805ca0e316032185ed8cd1f");
  assert.equal(actual, expected);
});

test("CompositeInputContract and document views are deeply immutable at runtime", () => {
  const serializedBefore = JSON.stringify(COMPOSITE_INPUT_CONTRACT);
  const hashBefore = COMPOSITE_INPUT_CONTRACT.canonical_sha256;
  const product = compositeInputDocument("product_architecture_source");

  assert.equal(Object.isFrozen(COMPOSITE_INPUT_CONTRACT), true);
  assert.equal(Object.isFrozen(COMPOSITE_INPUT_CONTRACT.documents), true);
  for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
    assert.equal(Object.isFrozen(document), true);
    assert.equal(Object.isFrozen(document.fields), true);
    for (const field of document.fields) {
      assert.equal(Object.isFrozen(field), true);
      assert.equal(Object.isFrozen(field.enum_values), true);
    }
  }
  assert.equal(Object.isFrozen(product), true);
  assert.throws(() => product.fields[0].enum_values.push("mutated"), TypeError);
  assert.throws(() => { product.fields[0].name = "mutated"; }, TypeError);
  assert.throws(() => COMPOSITE_INPUT_CONTRACT.documents.push(product), TypeError);
  assert.equal(JSON.stringify(COMPOSITE_INPUT_CONTRACT), serializedBefore);
  assert.equal(COMPOSITE_INPUT_CONTRACT.canonical_sha256, hashBefore);
});

test("state and renderer source filename order are projections of CompositeInputContract", () => {
  const expected = COMPOSITE_INPUT_CONTRACT.documents.map(({ id, file }) => ({ id, file }));
  const stateFiles = Object.entries(stateModule.SOURCE_FILES ?? {}).map(([id, value]) => ({ id, file: value.path }));

  assert.deepEqual(stateFiles, expected);
  assert.deepEqual(rendererModule.REQUIRED_SOURCE_FILES, expected.map(({ file }) => file));
  assert.equal(Object.isFrozen(stateModule.SOURCE_FILES), true);
  assert.ok(Object.values(stateModule.SOURCE_FILES).every((value) => Object.isFrozen(value)));
  assert.equal(Object.isFrozen(rendererModule.REQUIRED_SOURCE_FILES), true);
});
