import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  addSecondRequirementBranch,
  observationV2OracleScript,
  writeHappyV3Contract,
} from "./long-task-v3-fixtures.mjs";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import {
  verificationSpecExecutionIdentity,
  verifyLongTask,
} from "../../packages/ty-context/dist/lib/long-task-verifier.js";
import { runLongTaskFinalGate } from "../../packages/ty-context/dist/lib/long-task-final-gate.js";
import { createLongTaskSnapshot } from "../../packages/ty-context/dist/lib/long-task-snapshot.js";

test("active verifier executes only frozen argv and happy final uses one snapshot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-verify-"));
  const workdir = await writeHappyV3Contract(root);
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir);
  assert.equal(run.findings.length, 0);
  assert.deepEqual(run.spec_results[0].assertion_results, {
    "PA-001": true,
    "NA-001": true,
  });
  const final = await runLongTaskFinalGate(workdir);
  assert.equal(final.workflow_status, "accepted");
  assert.equal(final.workspace_hash_before, final.final_snapshot_sha256);
});
test("oracle drift invalidates the compiled contract", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-drift-"));
  const workdir = await writeHappyV3Contract(root);
  await compileLongTaskContract(workdir, root);
  await writeFile(
    path.join(root, "tests", "acceptance", "oracle.mjs"),
    "console.log('changed')\n",
  );
  await assert.rejects(verifyLongTask(workdir), /oracle_changed_after_compile/);
});
test("command_exit_zero_but_assertion_failed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-fail-"));
  const workdir = await writeHappyV3Contract(root);
  await writeFile(
    path.join(root, "tests", "acceptance", "oracle.mjs"),
    observationV2OracleScript("wrong"),
  );
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir);
  assert.equal(run.spec_results[0].status, "failed");
  const final = await runLongTaskFinalGate(workdir);
  assert.equal(final.workflow_status, "needs_work");
});
test("negative_evidence_hit is attributed through the frozen negative assertion", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-negative-"));
  const workdir = await writeHappyV3Contract(root);
  await writeFile(
    path.join(root, "tests/acceptance/oracle.mjs"),
    observationV2OracleScript("forbidden"),
  );
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir);
  assert.ok(
    run.findings.some(
      (f) =>
        f.category === "assertion_failed" && f.forbidden_shortcut === "FS-001",
    ),
  );
});
test("handwritten_assertion_result is not read", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-handwritten-"));
  const workdir = await writeHappyV3Contract(root);
  await writeFile(
    path.join(workdir, "assertion-result.json"),
    JSON.stringify({ passed: true }),
  );
  await writeFile(
    path.join(root, "tests/acceptance/oracle.mjs"),
    observationV2OracleScript("wrong"),
  );
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir);
  assert.equal(run.spec_results[0].status, "failed");
});
test("one concrete finding is emitted for every obligation binding", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-findings-"));
  const workdir = await writeHappyV3Contract(root, addSecondRequirementBranch);
  await writeFile(
    path.join(root, "tests/acceptance/oracle.mjs"),
    observationV2OracleScript("wrong"),
  );
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir);
  assert.deepEqual(
    [
      ...new Set(
        run.findings
          .filter((f) => f.category === "assertion_failed")
          .map((f) => f.obligation_id),
      ),
    ].sort(),
    ["PI-001-OB-001", "PI-002-OB-001"],
  );
});

test("verify_is_optional_before_first_final_gate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-no-prefinal-verify-"));
  const workdir = await writeHappyV3Contract(root);
  await compileLongTaskContract(workdir, root);
  const result = await runLongTaskFinalGate(workdir);
  assert.equal(result.workflow_status, "accepted");
});

test("targeted_verify_does_not_accept", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-targeted-"));
  const workdir = await writeHappyV3Contract(root);
  await compileLongTaskContract(workdir, root);
  const run = await verifyLongTask(workdir, ["VS-AC-001"]);
  assert.equal(run.verification_scope, "targeted_repair");
  assert.equal(run.acceptance_authorized, false);
});

test("final_gate_always_runs_all_slice_specs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-full-scope-"));
  const workdir = await writeHappyV3Contract(root);
  const contract = await compileLongTaskContract(workdir, root);
  const result = await runLongTaskFinalGate(workdir);
  const run = JSON.parse(
    await readFile(
      path.join(workdir, "runs", result.run_id, "verification-result.json"),
      "utf8",
    ),
  );
  assert.equal(run.verification_scope, "full_acceptance");
  assert.equal(run.acceptance_authorized, true);
  assert.equal(run.spec_results.length, contract.verification_specs.length);
});

test("Campaign Final shared-snapshot execution identity", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-campaign-cache-"));
  const workdir = await writeHappyV3Contract(root);
  const counter = path.join(
    os.tmpdir(),
    `ltw-spec-count-${process.pid}-${Date.now()}.txt`,
  );
  await writeFile(
    path.join(root, "tests", "acceptance", "oracle.mjs"),
    `import {appendFile} from "node:fs/promises";await appendFile(${JSON.stringify(counter)},"x");${observationV2OracleScript("good")}`,
  );
  const contract = await compileLongTaskContract(workdir, root);
  const snapshot = await createLongTaskSnapshot(
    root,
    contract,
    "campaign-shared",
  );
  const specResultCache = new Map();
  try {
    const first = await verifyLongTask(workdir, ["VS-AC-001"], {
      contract,
      snapshot,
      run_id: "campaign-cache-1",
      acceptanceGate: true,
      specResultCache,
    });
    const second = await verifyLongTask(workdir, ["VS-AC-001"], {
      contract,
      snapshot,
      run_id: "campaign-cache-2",
      acceptanceGate: true,
      specResultCache,
    });
    assert.equal(first.spec_results[0].status, "passed");
    assert.equal(second.spec_results[0].status, "passed");
    await t.test("campaign_final_uses_one_shared_snapshot", () => {
      assert.equal(
        first.snapshot.snapshot_sha256,
        second.snapshot.snapshot_sha256,
      );
      assert.equal(first.snapshot.snapshot_sha256, snapshot.manifest.snapshot_sha256);
    });
    await t.test("identical_specs_execute_once_on_shared_snapshot", async () => {
      assert.equal(specResultCache.size, 1);
      assert.equal(await readFile(counter, "utf8"), "x");
    });
    await t.test("different_oracle_or_input_identity_does_not_dedupe", () => {
      const original = contract.verification_specs[0];
      const originalIdentity = verificationSpecExecutionIdentity(
        original,
        snapshot.manifest.snapshot_sha256,
        first.environment,
      );
      const differentOracle = structuredClone(original);
      differentOracle.oracle_sha256 = {
        ...differentOracle.oracle_sha256,
        "tests/acceptance/oracle.mjs": "f".repeat(64),
      };
      const differentInput = structuredClone(original);
      differentInput.input_paths = [...differentInput.input_paths, "src/other/**"];
      assert.notEqual(
        verificationSpecExecutionIdentity(
          differentOracle,
          snapshot.manifest.snapshot_sha256,
          first.environment,
        ),
        originalIdentity,
      );
      assert.notEqual(
        verificationSpecExecutionIdentity(
          differentInput,
          snapshot.manifest.snapshot_sha256,
          first.environment,
        ),
        originalIdentity,
      );
    });
  } finally {
    await snapshot.dispose();
  }
});
