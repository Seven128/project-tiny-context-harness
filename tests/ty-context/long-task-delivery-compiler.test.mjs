import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { createDeliveryFixture, writeContract } from "./long-task-delivery-fixtures.mjs";

test("compiles generated Outcome/Check ids and freezes identity under two seconds", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const started = performance.now();
    const compiled = await compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    });
    assert.ok(performance.now() - started < 2000);
    assert.equal(compiled.effective_risk, "standard");
    assert.deepEqual(compiled.outcomes.map((outcome) => outcome.internal_id), ["OUT.first", "OUT.second"]);
    assert.deepEqual(
      compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks.map((check) => check.internal_id)),
      ["CHECK.first.first-check", "CHECK.second.second-check"],
    );
    assert.match(compiled.compiled_identity, /^[a-f0-9]{64}$/);
    assert.equal(compiled.context_snapshot.files.includes("project_context/areas/main.md"), true);
    assert.equal(compiled.outcomes[0].acceptance.checks[0].runner.frozen_files["tests/oracle.mjs"].length, 64);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("preflight rejects invalid Context, missing runner path and Outcome without Check", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.task.context_refs = ["project_context/areas/missing.md"];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, { require_completion_gate: false }),
      /context_ref_invalid/,
    );
    fixture.contract.task.context_refs = ["project_context/areas/main.md"];
    fixture.contract.outcomes[0].acceptance.checks[0].runner.target = "tests/missing.mjs";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, { require_completion_gate: false }),
      /node_oracle_path_not_found/,
    );
    fixture.contract.outcomes[0].acceptance.checks = [];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, { require_completion_gate: false }),
      /outcome_without_executable_check/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("preflight rejects missing package scripts and UI outcomes without browser proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    check.runner.type = "package_script";
    check.runner.target = "missing";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, { require_completion_gate: false }),
      /package_script_not_found/,
    );
    check.runner.type = "node_oracle";
    check.runner.target = "tests/oracle.mjs";
    fixture.contract.outcomes[0].product.owner_surfaces = ["web/settings"];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, { require_completion_gate: false }),
      /ui_outcome_requires_ui_browser_proof/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("preflight validates strict counterfactual paths before implementation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.requested_level = "strict";
    check.negative_assertions.push({
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    outcome.acceptance.counterfactual_controls.push({
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/missing.json"] },
      expect: "check_fails",
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /counterfactual_path_not_found:first:src\/missing\.json/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
