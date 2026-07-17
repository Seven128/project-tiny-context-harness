import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Compact and expanded V2 authoring normalize to the same Contract", () => {
  const expanded = expandedContract();
  const compact = compactContract(expanded);
  const expandedParsed = parseDeliveryContractText(YAML.stringify(expanded));
  const compactParsed = parseDeliveryContractText(YAML.stringify(compact));

  assert.deepEqual(compactParsed, expandedParsed);
  assert.equal(compactParsed.task.context_snapshot_mode, "referenced");
  assert.equal(compactParsed.risk.requested_level, "auto");
  assert.deepEqual(compactParsed.outcomes[0].product.requirements, []);
  assert.deepEqual(compactParsed.global.acceptance.external_confirmations, []);

  const expandedLines = lineCount(YAML.stringify(expanded));
  const compactLines = lineCount(YAML.stringify(compact));
  assert.ok(
    compactLines <= Math.floor(expandedLines * 0.65),
    `expected at least 35% fewer lines, expanded=${expandedLines}, compact=${compactLines}`,
  );
});

test("Compact and expanded V2 authoring compile to identical authority", async () => {
  const fixture = await createDeliveryFixture();
  const expanded = expandedContract();
  await writeFile(
    path.join(fixture.root, "source.md"),
    `# Fixture source

<!-- ty-source-item:start key=first-observable kind=technical_obligation -->
Implement first
<!-- ty-source-item:end -->
`,
  );
  await writeContract(fixture.workdir, expanded);
  const expandedCompiled = await compileDeliveryContract(
    fixture.workdir,
    fixture.root,
    { require_completion_gate: false },
  );

  await writeContract(fixture.workdir, compactContract(expanded));
  const compactCompiled = await compileDeliveryContract(
    fixture.workdir,
    fixture.root,
    { require_completion_gate: false },
  );

  assert.equal(
    compactCompiled.contract_sha256,
    expandedCompiled.contract_sha256,
  );
  assert.deepEqual(
    compactCompiled.authority_hashes,
    expandedCompiled.authority_hashes,
  );
  assert.deepEqual(
    compactCompiled.authority_materials,
    expandedCompiled.authority_materials,
  );
  assert.equal(
    compactCompiled.effective_risk,
    expandedCompiled.effective_risk,
  );
  assert.deepEqual(
    compactCompiled.claim_coverage,
    expandedCompiled.claim_coverage,
  );
  assert.equal(
    compactCompiled.compiled_identity,
    expandedCompiled.compiled_identity,
  );
});

function expandedContract() {
  const contract = deliveryContract();
  contract.outcomes[0].product.requirements = [];
  const check = contract.outcomes[0].acceptance.checks[0];
  check.positive_assertions[0].claims =
    check.positive_assertions[0].claims.filter(
      (claim) => !claim.startsWith("requirement."),
    );
  contract.source_claims[0].disposition.refs = [
    "first.obligation.implement-first",
  ];
  contract.source_claims[0].statement = "Implement first";
  check.proof_surface = "ui_browser";
  check.runner.type = "playwright_test";
  check.runner.target = "tests/oracle.mjs";
  check.positive_assertions[0].observation =
    "playwright.case.first-result.passed";
  contract.outcomes[0].technical.obligations[0].required_proof_surfaces = [
    "ui_browser",
  ];
  check.artifact_globs = [];
  check.runner.argv = [];
  check.runner.idempotent = false;
  check.input_paths = [];
  return contract;
}

function compactContract(expanded) {
  const contract = structuredClone(expanded);
  delete contract.task.context_snapshot_mode;
  delete contract.risk.requested_level;
  contract.risk.facts = {};
  delete contract.global.product;
  delete contract.global.acceptance;
  delete contract.global.technical.constraints;
  delete contract.global.technical.forbidden_shortcuts;

  const outcome = contract.outcomes[0];
  delete outcome.depends_on;
  delete outcome.product.requirements;
  delete outcome.product.owner_surfaces;
  delete outcome.product.controls;
  delete outcome.product.non_completing_outcomes;
  delete outcome.technical.allowed_support_paths;
  delete outcome.technical.forbidden_shortcuts;
  delete outcome.technical.rollback_and_recovery;
  delete outcome.acceptance.population;
  delete outcome.acceptance.counterfactual_controls;

  const check = outcome.acceptance.checks[0];
  delete check.runner.argv;
  delete check.runner.cwd;
  delete check.runner.timeout_ms;
  delete check.runner.retry_policy;
  delete check.runner.idempotent;
  delete check.input_paths;
  delete check.expected_output_paths;
  delete check.artifact_globs;
  delete check.negative_assertions;
  delete check.environment_requirements;
  return contract;
}

function lineCount(value) {
  return value.trimEnd().split(/\r?\n/u).length;
}
