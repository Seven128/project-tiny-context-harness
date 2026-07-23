import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContractStructureDiagnostics } from "../../packages/ty-context/dist/lib/long-task-delivery-validation.js";
import {
  evaluateEvidenceCapabilities,
  validateEvidenceCapabilityDeclarations,
} from "../../packages/ty-context/dist/lib/long-task-evidence-capability-policy.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

const ZERO = "0".repeat(64);
const ONE = "1".repeat(64);
const TWO = "2".repeat(64);

test("[critical:target-runtime-non-substitution] required target refs prevent a passing Web/process route from substituting for Native", () => {
  const contract = deliveryContract();
  contract.task.execution_targets.push({
    key: "fixture-native",
    description: "The required native application root.",
    role: "product",
    runtime_family: "native",
    root_entrypoint: "fixture-native.exe",
  });
  contract.task.target_profile.required_target_refs.push("fixture-native");
  contract.risk.facts.critical_user_path = ["first"];

  const diagnostics = deliveryContractStructureDiagnostics(contract);
  assert.ok(
    diagnostics.some((item) =>
      item.includes("stage_gate_required_target_proof_missing:first:fixture-native"),
    ),
  );
  assert.ok(
    diagnostics.some((item) =>
      item.includes("critical_path_required_target_proof_missing:first:fixture-native"),
    ),
  );

  const nativeCheck = structuredClone(contract.outcomes[0].acceptance.checks[0]);
  nativeCheck.key = "first-native-check";
  nativeCheck.execution_target.target_ref = "fixture-native";
  nativeCheck.runner.type = "project_binary";
  nativeCheck.runner.target = "tests/oracle.mjs";
  nativeCheck.positive_assertions[0].key = "first-native-result";
  nativeCheck.positive_assertions[0].observation = "result_copy";
  contract.outcomes[0].acceptance.checks.push(nativeCheck);
  assert.doesNotThrow(() => parse(contract));

  const wrongAdapter = structuredClone(contract);
  wrongAdapter.outcomes[0].acceptance.checks[1].runner.type = "node_oracle";
  assert.throws(
    () => parse(wrongAdapter),
    /native_target_runtime_requires_project_binary/u,
  );
});

test("behavior Claims cannot be proved by presence text and success cannot be replaced by degradation", () => {
  const presenceOnly = deliveryContract();
  presenceOnly.outcomes[0].acceptance.checks[0].positive_assertions[0].evidence_capabilities = [
    "presence",
  ];
  assert.ok(
    deliveryContractStructureDiagnostics(presenceOnly).some((item) =>
      item.includes("presence_cannot_prove_behavior"),
    ),
  );

  const mergedJourneys = deliveryContract();
  mergedJourneys.outcomes[0].product.degradation_path_required = true;
  mergedJourneys.outcomes[0].acceptance.checks[0].journey_roles.push("degradation");
  assert.throws(
    () => parse(mergedJourneys),
    /success_degradation_check_must_be_distinct/u,
  );

  const degradationOnly = deliveryContract();
  degradationOnly.outcomes[0].product.degradation_path_required = true;
  degradationOnly.outcomes[0].acceptance.checks[0].journey_roles = [
    "degradation",
    "stage_gate",
  ];
  assert.throws(() => parse(degradationOnly), /success_path_check_required/u);

  const deepLinkGate = deliveryContract();
  deepLinkGate.outcomes[0].acceptance.checks[0].execution_target.entrypoint =
    "internal";
  assert.ok(
    deliveryContractStructureDiagnostics(deepLinkGate).some((item) =>
      item.includes("stage_gate_root_entrypoint_required"),
    ),
  );
});

test("multi-Outcome Stage Gates require typed cross-surface consistency evidence", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.stages = [
    { key: "first", title: "First", depends_on: [], gate_outcome: "second" },
  ];
  contract.outcomes[1].stage = "first";
  contract.outcomes[0].acceptance.checks[0].journey_roles = ["success"];

  assert.throws(
    () => parse(contract),
    /stage_gate_cross_surface_consistency_required/u,
  );
  const gateCheck = contract.outcomes[1].acceptance.checks[0];
  gateCheck.positive_assertions[0].evidence_capabilities.push(
    "cross_surface_consistency",
  );
  assert.doesNotThrow(() => parse(contract));

  const check = compiledCheck(contract, gateCheck, "second", [
    "cross_surface_consistency",
  ]);
  const invalid = evaluateEvidenceCapabilities(
    check,
    [
      {
        assertion_key: check.positive_assertions[0].key,
        capability: "cross_surface_consistency",
        surfaces: [
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
        ],
      },
    ],
    {},
  );
  assert.equal(invalid.complete[check.positive_assertions[0].key], false);
  assert.equal(invalid.findings[0].actual, "two_surfaces_required");

  const valid = evaluateEvidenceCapabilities(
    check,
    [
      {
        assertion_key: check.positive_assertions[0].key,
        capability: "cross_surface_consistency",
        surfaces: [
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
          { surface_ref: "trip", target_ref: "fixture-app", state_sha256: ONE },
        ],
      },
    ],
    {},
  );
  assert.equal(valid.complete[check.positive_assertions[0].key], true);
  assert.deepEqual(valid.findings, []);
});

test("variable inputs and external effects require independent typed runtime evidence", () => {
  const contract = deliveryContract();
  const baseCheck = contract.outcomes[0].acceptance.checks[0];
  const variation = compiledCheck(contract, baseCheck, "first", [
    "input_variation",
  ]);
  const assertionKey = variation.positive_assertions[0].key;
  const fixed = evaluateEvidenceCapabilities(
    variation,
    [
      {
        assertion_key: assertionKey,
        capability: "input_variation",
        cases: [
          { input_sha256: ZERO, output_sha256: ONE },
          { input_sha256: TWO, output_sha256: ONE },
        ],
        failure_case_observed: false,
      },
    ],
    {},
  );
  assert.equal(fixed.complete[assertionKey], false);
  assert.equal(fixed.findings[0].actual, "input_must_reach_output");

  const varied = evaluateEvidenceCapabilities(
    variation,
    [
      {
        assertion_key: assertionKey,
        capability: "input_variation",
        cases: [
          { input_sha256: ZERO, output_sha256: ONE },
          { input_sha256: TWO, output_sha256: TWO },
        ],
        failure_case_observed: true,
      },
    ],
    {},
  );
  assert.equal(varied.complete[assertionKey], true);

  baseCheck.positive_assertions[0].evidence_capabilities.push(
    "external_side_effect",
  );
  assert.throws(
    () => validateEvidenceCapabilityDeclarations(contract),
    /observer_check_target_required/u,
  );

  contract.task.execution_targets.push({
    key: "fixture-observer",
    description: "An independent external observer.",
    role: "observer",
    runtime_family: "external",
    root_entrypoint: "observer://fixture",
  });
  baseCheck.execution_target.target_ref = "fixture-observer";
  baseCheck.journey_roles = ["success"];
  assert.doesNotThrow(() => validateEvidenceCapabilityDeclarations(contract));

  const observed = compiledCheck(contract, baseCheck, "first", [
    "external_side_effect",
  ]);
  const observedKey = observed.positive_assertions[0].key;
  const evidence = evaluateEvidenceCapabilities(
    observed,
    [
      {
        assertion_key: observedKey,
        capability: "external_side_effect",
        boundary: "fixture-queue",
        effect_id: "effect-1",
        effect_sha256: ONE,
        observer_target_ref: "fixture-observer",
      },
    ],
    {},
  );
  assert.equal(evidence.complete[observedKey], true);
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}

function compiledCheck(
  contract,
  declared,
  outcomeKey,
  capabilities = null,
) {
  const check = structuredClone(declared);
  if (capabilities)
    check.positive_assertions[0].evidence_capabilities = capabilities;
  const target = contract.task.execution_targets.find(
    (candidate) => candidate.key === check.execution_target.target_ref,
  );
  return {
    ...check,
    internal_id: `CHECK.${outcomeKey ?? "GLOBAL"}.${check.key}`,
    outcome_key: outcomeKey,
    execution_target_definition: target,
    known_execution_targets: contract.task.execution_targets,
    raw_execution_identity: `raw-${check.key}`,
  };
}
