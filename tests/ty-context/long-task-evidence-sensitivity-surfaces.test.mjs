import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createDeliveryFixture } from "./long-task-delivery-fixtures.mjs";
import {
  assertActivationReady,
  assertActivationRejects,
  counterfactual,
} from "./long-task-evidence-sensitivity-fixtures.mjs";

test("same-Check Population exempts only its own Claims from Counterfactual coverage", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.positive_assertions[0].claims = [
      "result",
      "requirement.observe-first",
    ];
    outcome.acceptance.population = {
      check_key: check.key,
      claims: ["obligation.implement-first"],
      observations: {
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    outcome.acceptance.counterfactual_controls = [
      counterfactual({
        key: "non-population-sensitive",
        checkKey: check.key,
        claims: ["result", "requirement.observe-first"],
        assertionKeys: ["first-result"],
      }),
    ];
    await assertActivationReady(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("weak_observability removes the Population sensitivity exemption", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.weak_observability = ["first"];
    check.positive_assertions[0].claims = [];
    outcome.acceptance.population = {
      check_key: check.key,
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
      ],
      observations: {
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    outcome.acceptance.counterfactual_controls = [];
    await assertActivationRejects(fixture, [
      "result",
      "requirement.observe-first",
      "obligation.implement-first",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Playwright Claims do not require an additional Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    await writeFile(path.join(fixture.root, "tests", "ui.spec.ts"), "export {};\n");
    outcome.technical.obligations = [];
    outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
    check.proof_surface = "ui_browser";
    check.runner.type = "playwright_test";
    check.runner.target = "tests/ui.spec.ts";
    check.runner.argv = [];
    check.runner.effect = "test_sandbox";
    check.runner.idempotent = false;
    check.verification_inputs = ["tests/ui.spec.ts"];
    check.artifact_globs = [];
    check.positive_assertions = [
      {
        key: "first-ui",
        criterion: "The first browser acceptance case passes.",
        claims: ["result", "requirement.observe-first"],
        observation: "playwright.case.first-ui.passed",
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.counterfactual_controls = [];
    await assertActivationReady(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
