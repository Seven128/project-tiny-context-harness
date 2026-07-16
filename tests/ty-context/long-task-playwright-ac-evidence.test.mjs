import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { decodeCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-check-evidence-decoder.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";

test("Playwright exposes independent AC observations and localizes a failed case", async () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-two", "unexpected", "failed"),
    ]),
    1,
  );
  assert.equal(decoded.observations["playwright.case.ac-one.passed"], true);
  assert.equal(decoded.observations["playwright.case.ac-two.passed"], false);

  const result = await evaluateCheckEvidence(
    check,
    raw(check, decoded),
    path.resolve("."),
  );
  assert.deepEqual(
    result.claim_proofs.map((proof) => proof.assertion_key),
    ["ac-one"],
  );
  const finding = result.findings.find(
    (item) => item.assertion_key === "ac-two",
  );
  assert.equal(finding?.code, "assertion_value_mismatch");
  assert.deepEqual(finding?.claim_keys, ["requirement.two"]);
});

test("missing and skipped Playwright AC cases have distinct findings", async () => {
  const check = compiledPlaywrightCheck();
  const missingDecoded = decode(
    check,
    report([ac("ac-one", "expected", "passed")]),
    0,
  );
  const missing = await evaluateCheckEvidence(
    check,
    raw(check, missingDecoded),
    path.resolve("."),
  );
  assert.equal(
    missing.findings.find((item) => item.assertion_key === "ac-two")?.code,
    "acceptance_case_not_executed",
  );

  const skippedDecoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-two", "skipped", "skipped"),
    ]),
    0,
  );
  const skipped = await evaluateCheckEvidence(
    check,
    raw(check, skippedDecoded),
    path.resolve("."),
  );
  assert.equal(
    skipped.findings.find((item) => item.assertion_key === "ac-two")?.code,
    "acceptance_case_skipped",
  );
});

test("duplicate Playwright AC ids are invalid evidence", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-one", "expected", "passed"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "invalid_evidence");
  assert.equal(decoded.error, "playwright_ac_id_duplicate:ac-one");
});

function compiledPlaywrightCheck() {
  return {
    internal_id: "CHECK.first.ui",
    outcome_key: "first",
    key: "ui",
    proof_surface: "ui_browser",
    runner: {
      type: "playwright_test",
      target: "tests/ui.spec.ts",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "test_sandbox",
      retry_policy: "none",
      idempotent: false,
      executable: process.execPath,
      executable_argv_prefix: [],
      resolved_cwd: "",
      resolved_target: "tests/ui.spec.ts",
      definition_sha256: "playwright",
      frozen_files: {},
      package_script: null,
      execution_identity: "playwright",
    },
    verification_inputs: ["tests/ui.spec.ts"],
    verification_input_hashes: {},
    raw_execution_identity: "playwright",
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "ac-one",
        criterion: "The first acceptance case passes.",
        claims: ["requirement.one"],
        observation: "playwright.case.ac-one.passed",
        operator: "equals",
        expected: true,
      },
      {
        key: "ac-two",
        criterion: "The second acceptance case passes.",
        claims: ["requirement.two"],
        observation: "playwright.case.ac-two.passed",
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [],
  };
}

function report(cases) {
  const counts = {
    expected: cases.filter((item) => item.test.status === "expected").length,
    unexpected: cases.filter((item) => item.test.status === "unexpected")
      .length,
    skipped: cases.filter((item) => item.test.status === "skipped").length,
    flaky: cases.filter((item) => item.test.status === "flaky").length,
  };
  return {
    stats: counts,
    suites: [
      {
        specs: cases.map((item) => ({
          title: `[${item.id}] ${item.id}`,
          tests: [item.test],
        })),
      },
    ],
  };
}

function ac(id, status, resultStatus) {
  return { id, test: { status, results: [{ status: resultStatus }] } };
}

function decode(check, value, exitCode) {
  return decodeCheckEvidence(
    check,
    exitCode,
    Buffer.from(JSON.stringify(value)),
    Buffer.alloc(0),
  );
}

function raw(check, decoded) {
  return {
    raw_execution_identity: check.raw_execution_identity,
    execution_identity: check.raw_execution_identity,
    ...decoded,
    stdout_sha256: "stdout",
    stderr_sha256: "stderr",
    attempts: 1,
    duration_ms: 1,
  };
}
