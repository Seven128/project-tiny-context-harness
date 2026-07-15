import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("strict security proof combines negative assertions, counterfactuals and artifacts", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.security_boundary_change = true;
    check.proof_surface = "security_boundary";
    check.artifact_globs = ["artifacts/proof.json"];
    check.positive_assertions.push({
      observation: "artifacts.paths",
      operator: "contains",
      expected: "artifacts/proof.json",
    });
    check.negative_assertions.push({
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    outcome.acceptance.counterfactual_controls = [{
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expect: "check_fails",
    }];
    outcome.technical.forbidden_shortcuts = ["Do not bypass state evaluation."];
    fixture.contract.global.technical.forbidden_shortcuts = [
      "Do not accept a self-reported success string.",
    ];
    outcome.technical.allowed_support_paths.push("artifacts/**");
    await writeArtifactOracle(fixture.root, true);
    await writeContract(fixture.workdir, fixture.contract);

    await runCli(fixture.root, ["enable", "long-task"]);
    const compiled = await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
    ]);
    assert.equal(compiled.effective_risk, "strict");
    const accepted = await runCli(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "accepted");
    assert.deepEqual(
      accepted.check_results[0].observations.artifacts.paths,
      ["artifacts/proof.json"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("full-population proof fails closed when current coverage is incomplete", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.full_population_operation = true;
    check.proof_surface = "population_coverage";
    check.negative_assertions.push({
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    outcome.acceptance.population = {
      check_key: check.key,
      observation: "population",
      required_coverage_percent: 100,
      exclusion_rules: [],
    };
    outcome.acceptance.counterfactual_controls = [{
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expect: "check_fails",
    }];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    assert.equal(
      (await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir])).workflow_status,
      "accepted",
    );

    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      `import { readFile } from "node:fs/promises";
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{result:state.first,population:{eligible:1,observed:0,excluded:0}}}));
`,
    );
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(
      failed.findings.some((item) => item.code === "population_coverage_failed"),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("exit zero, self-reported status files and missing evidence cannot manufacture accepted", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      'console.log(JSON.stringify({status:"accepted",success:true}));\n',
    );
    await writeFile(
      path.join(fixture.workdir, "handwritten-status.json"),
      '{"workflow_status":"accepted"}\n',
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(
      failed.findings.some((item) => item.code === "verification_evidence_invalid"),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeArtifactOracle(root, result) {
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { mkdir, readFile, writeFile } from "node:fs/promises";
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
await mkdir(new URL("../artifacts", import.meta.url), {recursive:true});
await writeFile(new URL("../artifacts/proof.json", import.meta.url), JSON.stringify({verified:state.first}));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{result:${JSON.stringify(result)}}}));
`,
  );
}
