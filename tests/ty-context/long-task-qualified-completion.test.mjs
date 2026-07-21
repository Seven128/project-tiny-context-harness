import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const externalConfirmations = [
  {
    key: "fixture-external",
    description: "Confirm the fixture in external delivery.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.result"],
    blocks_target: false,
  },
];

test("fresh external pending qualification reaches status and resume", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const final = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(final.workflow_status, "machine_accepted_external_pending");
    assert.equal(final.target_state, "target_profile_usable");
    assert.deepEqual(final.stage_results, { first: "passed" });
    assert.deepEqual(final.external_confirmations, externalConfirmations);
    assert.equal(final.acceptance_scope, "declared_machine_authority");
    assert.equal(final.native_goal_effect, "none");

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_result, "last_gate_passed");
    assert.equal(
      status.final_workflow_status,
      "machine_accepted_external_pending",
    );
    assert.deepEqual(status.external_confirmations, externalConfirmations);
    assert.equal(status.acceptance_scope, "declared_machine_authority");
    assert.equal(status.native_goal_effect, "none");
    assert.equal(status.target_state, "target_profile_usable");
    assert.deepEqual(status.stages, { first: "ready" });

    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resume.last_gate, "last_gate_passed");
    assert.equal(
      resume.final_workflow_status,
      "machine_accepted_external_pending",
    );
    assert.deepEqual(resume.external_confirmations, externalConfirmations);
    assert.equal(resume.acceptance_scope, "declared_machine_authority");
    assert.equal(resume.native_goal_effect, "none");
    assert.equal(resume.target_state, "target_profile_usable");
    assert.deepEqual(resume.stages, { first: "ready" });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("stale Final Receipt loses accepted projection but retains declarations", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify({ first: true, second: false, drift: true })}\n`,
    );

    for (const command of ["status", "resume"]) {
      const result = await runCli(fixture.root, [
        "long-task",
        command,
        fixture.workdir,
      ]);
      assert.equal(
        command === "status" ? result.final_result : result.last_gate,
        "last_gate_inputs_stale",
      );
      assert.equal(result.final_workflow_status, null);
      assert.equal(result.target_state, "not_accepted");
      assert.deepEqual(result.external_confirmations, externalConfirmations);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("stop-check returns structured external pending qualification and clears CAS binding", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const record = await activeRecordPath(fixture.root);
    const result = await runCli(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(result.continue, true);
    assert.equal(result.reason, "machine_accepted_external_pending");
    assert.equal(result.workflow_status, "machine_accepted_external_pending");
    assert.deepEqual(result.external_confirmations, externalConfirmations);
    assert.equal(result.acceptance_scope, "declared_machine_authority");
    assert.equal(result.native_goal_effect, "none");
    assert.equal(result.target_state, "target_profile_usable");
    assert.deepEqual(result.stage_results, { first: "passed" });
    assert.match(result.message, /complete external delivery remains pending/iu);
    assert.match(result.message, /platform-native Goal/iu);
    assert.match(result.message, /fixture-external \(release-owner\)/u);
    assert.equal(await pathExists(record), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("close preserves external pending qualification after clearing machine Authority", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const record = await activeRecordPath(fixture.root);
    const result = await runCli(fixture.root, [
      "long-task",
      "close",
      fixture.workdir,
    ]);
    assert.equal(result.status, "closed");
    assert.equal(result.workflow_status, "machine_accepted_external_pending");
    assert.deepEqual(result.external_confirmations, externalConfirmations);
    assert.equal(result.acceptance_scope, "declared_machine_authority");
    assert.equal(result.closed_scope, "machine_authority");
    assert.equal(result.native_goal_effect, "none");
    assert.equal(result.target_state, "target_profile_usable");
    assert.deepEqual(result.stage_results, { first: "passed" });
    assert.equal(result.workdir, fixture.workdir);
    assert.equal(await pathExists(record), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("ordinary machine acceptance emits no external warning and close stays qualified", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const final = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(final.workflow_status, "machine_accepted");
    assert.deepEqual(final.external_confirmations, []);
    assert.equal(final.acceptance_scope, "declared_machine_authority");
    assert.equal(final.native_goal_effect, "none");
    assert.equal(final.target_state, "target_profile_usable");
    assert.deepEqual(final.stage_results, { first: "passed" });
    const stop = await runCli(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.workflow_status, "machine_accepted");
    assert.deepEqual(stop.external_confirmations, []);
    assert.equal(stop.acceptance_scope, "declared_machine_authority");
    assert.equal(stop.native_goal_effect, "none");
    assert.match(stop.message, /platform-native Goal/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }

  const closeFixture = await createDeliveryFixture();
  try {
    await runCli(closeFixture.root, ["enable", "long-task"]);
    await runCli(closeFixture.root, [
      "long-task",
      "compile",
      closeFixture.workdir,
    ]);
    await commitCandidate(closeFixture.root);
    const close = await runCli(closeFixture.root, [
      "long-task",
      "close",
      closeFixture.workdir,
    ]);
    assert.equal(close.workflow_status, "machine_accepted");
    assert.deepEqual(close.external_confirmations, []);
    assert.equal(close.acceptance_scope, "declared_machine_authority");
    assert.equal(close.closed_scope, "machine_authority");
    assert.equal(close.native_goal_effect, "none");
  } finally {
    await rm(closeFixture.root, { recursive: true, force: true });
  }
});

test("failed Live Gates do not report success or clear Active Authority", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const record = await activeRecordPath(fixture.root);
    const stop = await runCli(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]).catch((error) => JSON.parse(error.stdout.trim()));
    assert.equal(stop.continue, false);
    assert.equal(stop.workflow_status, "needs_work");
    assert.notEqual(stop.reason, "machine_accepted");
    assert.equal(await pathExists(record), true);

    await assert.rejects(
      runCli(fixture.root, ["long-task", "close", fixture.workdir]),
      /close_live_final_gate_failed:needs_work/u,
    );
    assert.equal(await pathExists(record), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
