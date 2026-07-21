import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runCli } from "./long-task-delivery-fixtures.mjs";

export function prepareSemanticAuthority(contract) {
  const outcome = contract.outcomes[0];
  contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser support surface.",
    role: "support",
    runtime_family: "browser",
    root_entrypoint: "/",
  });
  outcome.product.controls.push({
    key: "submit",
    location: "footer",
    trigger: "",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "done",
    failure_state: "error",
    feedback: "",
  });
  outcome.product.non_completing_outcomes.push({
    key: "exit-zero-only",
    statement: "Exit zero alone is not completion.",
  });
  outcome.acceptance.counterfactual_controls[0].claims.push(
    "non_completing.exit-zero-only",
  );
  outcome.acceptance.checks[0].negative_assertions.push({
    key: "exit-zero-is-insufficient",
    criterion: "Exit zero alone remains insufficient.",
    claims: ["non_completing.exit-zero-only"],
    observation: "result_copy",
    evidence_capabilities: ["state_delta"],
    operator: "equals",
    expected: true,
  });
  outcome.acceptance.counterfactual_controls[0]
    .expected_assertion_failures.push("exit-zero-is-insufficient");
  outcome.acceptance.checks.push({
    ...structuredClone(outcome.acceptance.checks[0]),
    key: "submit-ui",
    journey_roles: ["success"],
    execution_target: {
      target_ref: "fixture-browser",
      entrypoint: "root",
    },
    proof_surface: "ui_browser",
    runner: {
      ...structuredClone(outcome.acceptance.checks[0].runner),
      type: "playwright_test",
      target: "tests/oracle.mjs",
    },
    positive_assertions: [
      {
        key: "submit-states",
        criterion: "The submit control is placed correctly and reports terminal states.",
        claims: [
          "control.submit.location",
          "control.submit.success",
          "control.submit.failure",
        ],
        observation: "playwright.case.submit-states.passed",
        evidence_capabilities: ["interaction_trace"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
  });
  contract.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "The runtime remains stable.",
  });
  contract.global.acceptance.checks.push({
    ...structuredClone(outcome.acceptance.checks[0]),
    key: "stable-runtime-check",
    runner: {
      ...structuredClone(outcome.acceptance.checks[0].runner),
      argv: ["first", "global"],
    },
    positive_assertions: [
      {
        key: "stable-runtime-proof",
        criterion: "The declared runtime remains stable.",
        claims: ["constraint.stable-runtime"],
        observation: "result_copy",
        evidence_capabilities: ["state_delta"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
  });
  contract.global.acceptance.counterfactual_controls.push({
    key: "remove-stable-runtime",
    binding_ref: "first.state-first",
    claims: ["constraint.stable-runtime"],
    check_key: "stable-runtime-check",
    mutation: { type: "remove_paths", paths: ["src/state.json"] },
    expected_assertion_failures: ["stable-runtime-proof"],
  });
}

export async function expectDecision(fixture, expectation) {
  await assert.rejects(
    () =>
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
    /authority_change_requires_user_decision/u,
  );
  const pending = JSON.parse(
    await readFile(
      path.join(
        fixture.workdir,
        ".ty-context",
        "authority-revision-pending.json",
      ),
      "utf8",
    ),
  );
  if ("includes" in expectation)
    assert.ok(
      pending.revision_diff[expectation.field].includes(
        expectation.includes,
      ),
      `${expectation.field} must include ${expectation.includes}`,
    );
  if ("equals" in expectation)
    assert.equal(
      pending.revision_diff[expectation.field],
      expectation.equals,
    );
  assert.ok(
    pending.revision_diff.reduction_reasons.includes(expectation.reason),
    `reduction reasons must include ${expectation.reason}`,
  );
  return pending;
}
