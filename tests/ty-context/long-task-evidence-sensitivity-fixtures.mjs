import assert from "node:assert/strict";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { writeContract } from "./long-task-delivery-fixtures.mjs";

export async function assertActivationRejects(fixture, missingClaims) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  const diagnostic = preflight.diagnostics.find(
    (item) => item.code === "structured_evidence_sensitivity_required",
  );
  assert.ok(diagnostic, "missing structured evidence sensitivity diagnostic");
  for (const claim of missingClaims)
    assert.match(JSON.stringify(diagnostic), new RegExp(escapeRegExp(claim)));
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    /structured_evidence_sensitivity_required/u,
  );
}

export async function assertActivationReady(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(
    preflight.status,
    "ready",
    JSON.stringify(preflight.diagnostics),
  );
  await assert.doesNotReject(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
  );
}

export function counterfactual({ key, checkKey, claims, assertionKeys }) {
  return {
    key,
    binding_key: "state-first",
    claims,
    check_key: checkKey,
    mutation: { type: "remove_paths", paths: ["src/state.json"] },
    expected_assertion_failures: assertionKeys,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
