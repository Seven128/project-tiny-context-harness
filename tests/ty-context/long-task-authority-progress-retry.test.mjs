import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Authority Lock blocks Acceptance reduction and recompilation preserves the initial base", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.checks[0].negative_assertions.push({
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const initial = await readCompiledDeliveryContract(fixture.workdir);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    fixture.contract.outcomes[0].acceptance.checks[0].negative_assertions = [];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_change_requires_user_decision/,
    );
    const pending = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "authority-revision-pending.json"),
        "utf8",
      ),
    );
    assert.ok(pending.changed_authority_sections.includes("acceptance"));
    await runCli(fixture.root, [
      "long-task", "approve-authority-revision", fixture.workdir,
      "--revision", pending.revision_identity,
    ]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const revised = await readCompiledDeliveryContract(fixture.workdir);
    assert.deepEqual(revised.initial_task_base, initial.initial_task_base);
    const stale = await runCli(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(stale.outcomes.first, "progress_stale");

    fixture.contract.outcomes[0].technical.allowed_support_paths.push("support/**");
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /technical_amendment_reason_required/,
    );
    await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
      "--amendment-reason", "Allow a discovered support path without changing Product or Acceptance.",
    ]);
    const amended = await readCompiledDeliveryContract(fixture.workdir);
    assert.deepEqual(amended.initial_task_base, initial.initial_task_base);

    fixture.contract.outcomes[0].acceptance.checks[0].negative_assertions.push({
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /technical_amendment_reason_required/,
    );
    await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
      "--amendment-reason", "Strengthen Acceptance without removing its existing floor.",
    ]);
    const strengthened = await readCompiledDeliveryContract(fixture.workdir);
    assert.equal(
      strengthened.authority_hashes.acceptance_authority_hash,
      amended.authority_hashes.acceptance_authority_hash,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("per-Check progress accumulates and stales only on scoped inputs", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await writeFile(path.join(fixture.root, "src", "first.json"), "true\n");
    await writeFile(path.join(fixture.root, "src", "second.json"), "false\n");
    await writeFile(
      path.join(fixture.root, "tests", "scoped-oracle.mjs"),
      `import { readFile } from "node:fs/promises";
const key = process.argv[2];
const value = JSON.parse(await readFile(new URL(\`../src/\${key}.json\`, import.meta.url), "utf8"));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{result:value}}));
`,
    );
    for (const outcome of fixture.contract.outcomes) {
      const check = outcome.acceptance.checks[0];
      check.runner.target = "tests/scoped-oracle.mjs";
      check.verification_sources = ["tests/scoped-oracle.mjs"];
      check.input_paths = [`src/${outcome.key}.json`];
      outcome.technical.bindings[0].carrier_paths = [`src/${outcome.key}.json`];
    }
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "first",
    ]);
    await runCliFailure(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "second",
    ]);
    let status = await runCli(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_failing");

    await writeFile(path.join(fixture.root, "src", "second.json"), "true\n");
    status = await runCli(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_stale");
    assert.doesNotMatch(status.final_result, /accepted/);

    await writeFile(path.join(fixture.root, "src", "first.json"), "false\n");
    status = await runCli(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(status.outcomes.first, "progress_stale");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("top-level Final Gate rejects dirty state and accepts a clean candidate commit", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    await assert.rejects(
      () => runCli(fixture.root, [
        "long-task", "final-gate", fixture.workdir,
      ], { skipCandidateCommit: true }),
      /final_gate_requires_clean_candidate_commit/,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ], { skipCandidateCommit: true });
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.ok(accepted.git_head);
    assert.ok(accepted.git_tree);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("runner retries only an explicitly safe transient failure", async () => {
  const root = path.resolve(".");
  const base = {
    internal_id: "CHECK.fixture.retry",
    outcome_key: "fixture",
    key: "retry",
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/timeout.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 100,
      network_policy: { mode: "none", allowed_hosts: [] },
      effect: "read_only",
      retry_policy: "transient_once",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: ["-e", "setInterval(() => {}, 1000)"],
      definition_sha256: "x",
      execution_identity: "x",
      frozen_files: {},
    },
    verification_source_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  };
  const safe = await executeCheckRunner(base, root);
  assert.equal(safe.attempts, 2);
  const unsafe = await executeCheckRunner(
    { ...base, runner: { ...base.runner, idempotent: false } },
    root,
  );
  assert.equal(unsafe.attempts, 1);
});
