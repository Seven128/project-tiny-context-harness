import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  authorityReductionScenarios,
  prepareAuthorityRevisionFixture,
} from "./long-task-authority-revision-fixture.mjs";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Authority Revision reports concrete reductions, requires approval, and auto-accepts additions or scope tightening", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await prepareAuthorityRevisionFixture(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const initial = await readCompiledDeliveryContract(fixture.workdir);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    const baseline = structuredClone(fixture.contract);
    const withoutFlag = structuredClone(baseline);
    withoutFlag.outcomes[0].acceptance.checks[0].negative_assertions = [];
    await writeContract(fixture.workdir, withoutFlag);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    for (const scenario of authorityReductionScenarios) {
      const candidate = structuredClone(baseline);
      scenario.mutate(candidate);
      await writeContract(fixture.workdir, candidate);
      await assert.rejects(
        () =>
          runCli(fixture.root, [
            "long-task",
            "compile",
            fixture.workdir,
            "--revise",
          ]),
        /authority_change_requires_user_decision/u,
        scenario.name,
      );
      const pending = JSON.parse(
        await readFile(
          path.join(
            fixture.workdir,
            ".ty-context/authority-revision-pending.json",
          ),
          "utf8",
        ),
      );
      assert.ok(
        pending.revision_diff[scenario.field].length > 0,
        scenario.name,
      );
      assert.ok(
        pending.revision_diff.reduction_reasons.includes(scenario.reason),
        scenario.name,
      );
    }

    const addedInput = structuredClone(baseline);
    addedInput.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, addedInput);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const added = await readCompiledDeliveryContract(fixture.workdir);
    assert.equal(added.authority_revision, 2);

    const tightened = structuredClone(addedInput);
    tightened.outcomes[0].technical.allowed_support_paths = [
      "src/support/core/**",
    ];
    await writeContract(fixture.workdir, tightened);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const revised = await readCompiledDeliveryContract(fixture.workdir);
    assert.deepEqual(revised.initial_task_base, initial.initial_task_base);
    assert.equal(revised.authority_revision, 3);
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "unverified");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authority Revision rejects a risk downgrade instead of approving it", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.risk.requested_level = "strict";
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.negative_assertions.push({
      key: "negative-floor",
      claims: ["result"],
      observation: "result",
      operator: "not_equals",
      expected: false,
    });
    outcome.acceptance.counterfactual_controls.push({
      key: "remove-state",
      claims: ["obligation.implement-first"],
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expected_assertion_failures: ["first-result"],
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.risk.requested_level = "auto";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
      /authority_risk_downgrade_rejected/,
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
console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{result:value}}));
`,
    );
    for (const outcome of fixture.contract.outcomes) {
      const check = outcome.acceptance.checks[0];
      check.runner.target = "tests/scoped-oracle.mjs";
      check.verification_inputs = ["tests/scoped-oracle.mjs"];
      check.input_paths = [`src/${outcome.key}.json`];
      outcome.technical.bindings[0].target = `src/${outcome.key}.json`;
      outcome.technical.bindings[0].carrier_paths = [
        `src/${outcome.key}.json`,
      ];
    }
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_failing");

    await writeFile(path.join(fixture.root, "src", "second.json"), "true\n");
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_stale");
    assert.equal(status.acceptance_authority, "live_final_gate_required");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Live Final Gate rejects dirty state and accepts one clean Git-tree snapshot", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    await assert.rejects(
      () =>
        runCli(
          fixture.root,
          ["long-task", "final-gate", fixture.workdir],
          { skipCandidateCommit: true },
        ),
      /final_gate_requires_clean_candidate_commit/,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.authority_scope, "audit_only");
    assert.equal(accepted.reusable_for_acceptance, false);
    assert.ok(accepted.snapshot_preparation_ms < 5000);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("runner retries only an explicitly safe infrastructure failure", async () => {
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
      effect: "read_only",
      retry_policy: "transient_once",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: ["-e", "setInterval(() => {}, 1000)"],
      resolved_cwd: "",
      resolved_target: "tests/timeout.mjs",
      definition_sha256: "x",
      execution_identity: "x",
      frozen_files: {},
      package_script: null,
    },
    verification_input_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  };
  const safe = await executeCheckRunner(base, root);
  assert.equal(safe.attempts, 2);
  assert.equal(safe.execution_status, "infrastructure_error");
  const unsafe = await executeCheckRunner(
    { ...base, runner: { ...base.runner, idempotent: false } },
    root,
  );
  assert.equal(unsafe.attempts, 1);
});
