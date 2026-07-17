import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { evaluateOutcomeCounterfactuals } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("standard Playwright trusts frozen verifier input without Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlaywright(fixture, { weak: false });
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("weak_observability Playwright requires same-Check AC and Claim sensitivity", async () => {
  const missing = await createDeliveryFixture();
  try {
    await configurePlaywright(missing, { weak: true });
    missing.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await assertPreflightAndCompileReject(
      missing,
      "playwright_weak_observability_sensitivity_required",
    );
  } finally {
    await rm(missing.root, { recursive: true, force: true });
  }

  const partial = await createDeliveryFixture();
  try {
    await configurePlaywright(partial, { weak: true, twoAssertions: true });
    await assertPreflightAndCompileReject(
      partial,
      "playwright_weak_observability_sensitivity_required",
    );
  } finally {
    await rm(partial.root, { recursive: true, force: true });
  }

  const complete = await createDeliveryFixture();
  try {
    await configurePlaywright(complete, { weak: true, twoAssertions: true });
    complete.contract.outcomes[0].acceptance.counterfactual_controls[0]
      .expected_assertion_failures.push("first-obligation-ac");
    await writeContract(complete.workdir, complete.contract);
    const preflight = await preflightDeliveryContract(
      complete.workdir,
      complete.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await assert.doesNotReject(
      compileDeliveryContract(complete.workdir, complete.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(complete.root, { recursive: true, force: true });
  }
});

test("a Counterfactual on another Playwright Check cannot satisfy weak UI AC", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlaywright(fixture, { weak: true });
    const outcome = fixture.contract.outcomes[0];
    const other = structuredClone(outcome.acceptance.checks[0]);
    other.key = "other-ui-check";
    other.runner.target = "tests/ui-other.spec.ts";
    other.verification_inputs = ["tests/ui-other.spec.ts"];
    other.positive_assertions[0].key = "other-ui-ac";
    other.positive_assertions[0].observation =
      "playwright.case.other-ui-ac.passed";
    await writeFile(
      path.join(fixture.root, "tests", "ui-other.spec.ts"),
      "// [ac:other-ui-ac]\n",
    );
    outcome.acceptance.checks.push(other);
    const control = outcome.acceptance.counterfactual_controls[0];
    control.check_key = "other-ui-check";
    control.expected_assertion_failures = ["other-ui-ac"];
    await assertPreflightAndCompileReject(
      fixture,
      "playwright_weak_observability_sensitivity_required",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("weak-observability Playwright rejects a constant AC and accepts a sensitive AC", async () => {
  for (const constant of [true, false]) {
    const fixture = await createDeliveryFixture();
    try {
      await configurePlaywright(fixture, { weak: true });
      const runner = path.join(fixture.root, "tests", "fake-playwright.mjs");
      await writeFile(
        runner,
        `import { access } from "node:fs/promises";\nlet ready = ${constant ? "true" : "false"};\nif (!ready) { try { await access(new URL("../src/state.json", import.meta.url)); ready = true; } catch {} }\nconst status = ready ? "expected" : "unexpected";\nconst resultStatus = ready ? "passed" : "failed";\nconsole.log(JSON.stringify({stats:{expected:ready?1:0,unexpected:ready?0:1,skipped:0,flaky:0},suites:[{specs:[{title:"[ac:first-result] first-result",tests:[{projectId:"default",status,results:[{status:resultStatus}]}]}]}]}));\n`,
      );
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      const check = compiled.outcomes[0].acceptance.checks[0];
      check.runner.executable = process.execPath;
      check.runner.executable_argv_prefix = ["tests/fake-playwright.mjs"];
      check.runner.argv = [];
      check.runner.resolved_cwd = ".";
      const findings = await evaluateOutcomeCounterfactuals(
        compiled.outcomes[0],
        fixture.root,
      );
      assert.equal(findings.length, constant ? 1 : 0, JSON.stringify(findings));
      if (constant)
        assert.equal(findings[0].code, "counterfactual_integrity_failed");
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function configurePlaywright(
  fixture,
  { weak, twoAssertions = false },
) {
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.ts"),
    "// [ac:first-result]\n",
  );
  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  check.proof_surface = "ui_browser";
  check.runner = {
    type: "playwright_test",
    target: "tests/ui.spec.ts",
    argv: [],
    cwd: ".",
    timeout_ms: 30000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
  check.verification_inputs = ["tests/ui.spec.ts"];
  check.artifact_globs = [];
  check.positive_assertions[0].observation =
    "playwright.case.first-result.passed";
  outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
  outcome.technical.obligations[0].required_proof_surfaces = ["ui_browser"];
  if (weak) fixture.contract.risk.facts.weak_observability = ["first"];
  if (twoAssertions)
    check.positive_assertions.push({
      key: "first-obligation-ac",
      criterion: "The UI also proves the implementation obligation.",
      claims: ["obligation.implement-first"],
      observation: "playwright.case.first-obligation-ac.passed",
      operator: "equals",
      expected: true,
    });
  await writeContract(fixture.workdir, fixture.contract);
}

async function assertPreflightAndCompileReject(fixture, code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `missing ${code}: ${JSON.stringify(preflight)}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
  );
}
