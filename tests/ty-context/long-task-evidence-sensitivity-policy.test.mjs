import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  assertActivationReady,
  assertActivationRejects,
  counterfactual,
} from "./long-task-evidence-sensitivity-fixtures.mjs";

test("structured Claim proof needs same-Check sensitivity even with an unrelated Artifact", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
    assert.ok(
      fixture.contract.outcomes[0].acceptance.checks[0].artifact_globs.length,
    );
    await assertActivationRejects(fixture, [
      "result",
      "requirement.observe-first",
      "obligation.implement-first",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("structured Requirement proof without result still needs sensitivity", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const requirementCheck = outcome.acceptance.checks[0];
    requirementCheck.positive_assertions[0].claims = [
      "requirement.observe-first",
    ];

    const resultCheck = structuredClone(requirementCheck);
    resultCheck.key = "result-check";
    resultCheck.runner.argv = ["first", "result-check"];
    resultCheck.positive_assertions = [
      {
        key: "result-and-obligation",
        criterion: "The result and implementation obligation hold.",
        claims: ["result", "obligation.implement-first"],
        observation: "result",
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.checks.push(resultCheck);
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "result-sensitive",
        checkKey: resultCheck.key,
        claims: ["result", "obligation.implement-first"],
        assertionKeys: ["result-and-obligation"],
      }),
    ];
    await assertActivationRejects(fixture, ["requirement.observe-first"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a Counterfactual on another Check cannot satisfy the current Check", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const first = outcome.acceptance.checks[0];
    const second = structuredClone(first);
    second.key = "second-check";
    second.runner.argv = ["first", "second-check"];
    second.positive_assertions[0].key = "second-result";
    outcome.acceptance.checks.push(second);
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "second-sensitive",
        checkKey: second.key,
        claims: [
          "result",
          "requirement.observe-first",
          "obligation.implement-first",
        ],
        assertionKeys: ["second-result"],
      }),
    ];
    await assertActivationRejects(fixture, [
      "result",
      "requirement.observe-first",
      "obligation.implement-first",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("same-Check Counterfactual coverage must include every related Claim", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.positive_assertions = [
      {
        key: "result-and-obligation",
        criterion: "The result and implementation obligation hold.",
        claims: ["result", "obligation.implement-first"],
        observation: "result",
        operator: "equals",
        expected: true,
      },
      {
        key: "requirement-only",
        criterion: "The atomic Requirement holds.",
        claims: ["requirement.observe-first"],
        observation: "result_copy",
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "partial-sensitivity",
        checkKey: check.key,
        claims: ["result", "obligation.implement-first"],
        assertionKeys: ["result-and-obligation"],
      }),
    ];
    await assertActivationRejects(fixture, ["requirement.observe-first"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("structured result proof cannot have a result-only Counterfactual root", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const resultCheck = outcome.acceptance.checks[0];
    resultCheck.positive_assertions[0].claims = ["result"];

    const atomicCheck = structuredClone(resultCheck);
    atomicCheck.key = "atomic-check";
    atomicCheck.runner.argv = ["first", "atomic-check"];
    atomicCheck.positive_assertions = [
      {
        key: "atomic-claims",
        criterion: "The Requirement and Obligation hold.",
        claims: [
          "requirement.observe-first",
          "obligation.implement-first",
        ],
        observation: "result",
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.checks.push(atomicCheck);
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "result-only-sensitive",
        checkKey: resultCheck.key,
        claims: ["result"],
        assertionKeys: ["first-result"],
      }),
      counterfactual({
        key: "atomic-sensitive",
        checkKey: atomicCheck.key,
        claims: [
          "requirement.observe-first",
          "obligation.implement-first",
        ],
        assertionKeys: ["atomic-claims"],
      }),
    ];
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "not_ready");
    assert.ok(
      preflight.diagnostics.some(
        (item) =>
          item.code ===
          "structured_result_counterfactual_non_result_required",
      ),
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /structured_result_counterfactual_non_result_required/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("multiple Counterfactuals may merge coverage for one structured Check", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.positive_assertions = [
      {
        key: "result-and-requirement",
        criterion: "The result and Requirement hold.",
        claims: ["result", "requirement.observe-first"],
        observation: "result",
        operator: "equals",
        expected: true,
      },
      {
        key: "obligation",
        criterion: "The implementation obligation holds.",
        claims: ["obligation.implement-first"],
        observation: "result_copy",
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "result-requirement-sensitive",
        checkKey: check.key,
        claims: ["result", "requirement.observe-first"],
        assertionKeys: ["result-and-requirement"],
      }),
      counterfactual({
        key: "obligation-sensitive",
        checkKey: check.key,
        claims: ["obligation.implement-first"],
        assertionKeys: ["obligation"],
      }),
    ];
    await assertActivationReady(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("one Counterfactual may cover multiple related Claims", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await assertActivationReady(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
