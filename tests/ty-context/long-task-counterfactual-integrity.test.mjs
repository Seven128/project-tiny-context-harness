import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { evaluateOutcomeCounterfactuals } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Counterfactual accepts only the exact designated Assertion failure", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.runner.timeout_ms = 120;
    check.positive_assertions.push({
      key: "other-stays-true",
      claims: ["result"],
      observation: "other",
      operator: "equals",
      expected: true,
    });
    outcome.acceptance.counterfactual_controls = [
      {
        key: "remove-state",
        claims: ["obligation.implement-first"],
        check_key: check.key,
        mutation: { type: "remove_paths", paths: ["src/state.json"] },
        expected_assertion_failures: ["first-result"],
      },
    ];
    await writeOracle(fixture.root, "valid");
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context/compiled-contract.json"),
        "utf8",
      ),
    );

    assert.deepEqual(
      await evaluateOutcomeCounterfactuals(compiled.outcomes[0], fixture.root),
      [],
    );
    const artifactFailure = structuredClone(compiled.outcomes[0]);
    artifactFailure.acceptance.checks[0].artifact_globs = [
      "artifacts/missing-proof.json",
    ];
    let findings = await evaluateOutcomeCounterfactuals(
      artifactFailure,
      fixture.root,
    );
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].actual.finding_codes.sort(), [
      "artifact_missing",
      "assertion_value_mismatch",
    ]);

    const populationFailure = structuredClone(compiled.outcomes[0]);
    populationFailure.acceptance.population = {
      check_key: check.key,
      claims: ["result"],
      observations: {
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    findings = await evaluateOutcomeCounterfactuals(
      populationFailure,
      fixture.root,
    );
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].actual.finding_codes.sort(), [
      "assertion_value_mismatch",
      "population_coverage_failed",
    ]);

    for (const mode of ["timeout", "blocked", "invalid", "extra-failure"]) {
      await writeOracle(fixture.root, mode);
      findings = await evaluateOutcomeCounterfactuals(
        compiled.outcomes[0],
        fixture.root,
      );
      assert.equal(findings.length, 1, mode);
      assert.equal(findings[0].code, "counterfactual_integrity_failed", mode);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Counterfactual cannot delete the runner or a declared helper", async () => {
  for (const target of ["tests/oracle.mjs", "tests/helper.mjs"]) {
    const fixture = await createDeliveryFixture();
    try {
      await writeFile(path.join(fixture.root, "tests/helper.mjs"), "export {};\n");
      const outcome = fixture.contract.outcomes[0];
      const check = outcome.acceptance.checks[0];
      check.verification_inputs.push("tests/helper.mjs");
      outcome.product.owner.path_globs.push("tests/**");
      outcome.technical.allowed_support_paths.push("tests/**");
      outcome.technical.bindings[0].carrier_paths.push(target);
      outcome.acceptance.counterfactual_controls = [
        {
          key: "delete-verifier-input",
          claims: ["obligation.implement-first"],
          check_key: check.key,
          mutation: { type: "remove_paths", paths: [target] },
          expected_assertion_failures: ["first-result"],
        },
      ];
      await writeContract(fixture.workdir, fixture.contract);
      await runCli(fixture.root, ["enable", "long-task"]);
      await assert.rejects(
        runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
        (error) =>
          /verification_input_overlaps_implementation|counterfactual_mutates_verification_input/u.test(
            error.stderr ?? "",
          ),
        target,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function writeOracle(root, mode) {
  const missing =
    mode === "timeout"
      ? "await new Promise(() => {});"
      : mode === "blocked"
        ? 'console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"blocked_external",reason:"fixture"})); process.exit(0);'
        : mode === "invalid"
          ? 'console.log("not-json"); process.exit(0);'
          : "";
  const other = mode === "extra-failure" ? "false" : "true";
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let result = false;
try { result = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")).first; }
catch { ${missing} }
console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{result,other:${other},population:{eligible_ids:["first"],observed_ids:result?["first"]:[],excluded_items:[]}}}));
`,
  );
}
