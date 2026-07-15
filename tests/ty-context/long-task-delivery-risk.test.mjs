import assert from "node:assert/strict";
import test from "node:test";
import { classifyLongTaskRisk, validateRiskProof } from "../../packages/ty-context/dist/lib/long-task-risk.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

test("ordinary multi-Outcome Contract is standard and explicit strict raises it", () => {
  const standard = deliveryContract({ twoOutcomes: true });
  assert.equal(classifyLongTaskRisk(standard).effective_level, "standard");
  standard.risk.requested_level = "strict";
  assert.equal(classifyLongTaskRisk(standard).effective_level, "strict");
});

for (const fact of [
  "security_boundary_change",
  "permission_boundary_change",
  "data_migration",
  "persistent_data_change",
  "public_api_or_schema_change",
  "full_population_operation",
  "irreversible_external_effect",
  "multi_repository_change",
]) {
  test(`${fact} deterministically triggers strict`, () => {
    const contract = deliveryContract();
    contract.risk.facts[fact] = true;
    const decision = classifyLongTaskRisk(contract);
    assert.equal(decision.effective_level, "strict");
    assert.ok(decision.reasons.includes(fact));
  });
}

test("critical user path triggers strict only with weak observability", () => {
  const contract = deliveryContract();
  contract.risk.facts.critical_user_path = true;
  assert.equal(classifyLongTaskRisk(contract).effective_level, "standard");
  contract.risk.facts.weak_observability = true;
  const decision = classifyLongTaskRisk(contract);
  assert.equal(decision.effective_level, "strict");
  assert.ok(decision.reasons.includes("critical_user_path_with_weak_observability"));
});

test("requested standard below the deterministic floor fails", () => {
  const contract = deliveryContract();
  contract.risk.requested_level = "standard";
  contract.risk.facts.security_boundary_change = true;
  assert.throws(() => classifyLongTaskRisk(contract), /risk_level_below_required/);
});

test("strict trigger-specific proof is compiler-enforced", () => {
  const contract = deliveryContract();
  contract.risk.facts.security_boundary_change = true;
  const decision = classifyLongTaskRisk(contract);
  assert.throws(() => validateRiskProof(contract, decision), (error) => {
    assert.match(error.message, /strict_security_boundary_proof_required/);
    assert.match(error.message, /strict_negative_assertion_required/);
    assert.match(error.message, /strict_counterfactual_control_required/);
    return true;
  });
});

test("user-requested strict also requires falsifiable negative and counterfactual proof", () => {
  const contract = deliveryContract();
  contract.risk.requested_level = "strict";
  assert.throws(
    () => validateRiskProof(contract, classifyLongTaskRisk(contract)),
    /strict_negative_assertion_required[\s\S]*strict_counterfactual_control_required/,
  );
});
