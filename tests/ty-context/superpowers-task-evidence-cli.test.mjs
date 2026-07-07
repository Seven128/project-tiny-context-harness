import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("composite long-task CLI records current-attempt assertion evidence", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
    const workdir = "tmp/ty-context/plan-acceptance/demo";

    assert.equal(spawnSync(process.execPath, [cli, "composite-long-task", "init", workdir], { cwd: root, encoding: "utf8" }).status, 0);
    assert.equal(spawnSync(process.execPath, [cli, "composite-long-task", "compile", workdir], { cwd: root, encoding: "utf8" }).status, 0);

    const started = spawnSync(process.execPath, [cli, "composite-long-task", "start-attempt", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(started.status, 0, started.stderr);
    assert.match(started.stdout, /started attempt ATT-/);

    const run = spawnSync(
      process.execPath,
      [cli, "composite-long-task", "run-assertion", workdir, "--ac", "AC-001", "--proof-layer", "test", "--", process.execPath, "-e", "process.exit(0)"],
      { cwd: root, encoding: "utf8" }
    );
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /recorded assertion command_run_id=CR-/);

    let state = JSON.parse(await readFile(path.join(root, workdir, "task-state.json"), "utf8"));
    const commandRun = state.command_runs.at(-1);
    assert.equal(commandRun.ac_id, "AC-001");
    assert.equal(commandRun.proof_layer, "test");
    assert.equal(commandRun.exit_code, 0);

    const artifactPath = path.join(root, workdir, "test-assertion-result.json");
    await writeFile(
      artifactPath,
      JSON.stringify(
        {
          assertion_result: {
            schema_version: "assertion-result-v2",
            status: "passed",
            runner: "node:test",
            exit_code: 0,
            target_ac_ids: ["AC-001"],
            target_proof_layers: ["AC-001.test"],
            positive_assertions: [{ id: "required_test_passed", status: "passed", expected: "0 failures", actual: "0 failures" }],
            negative_assertions: [{ id: "no-forbidden-final-state", status: "passed" }],
            invalid_completion_signals: [],
            artifacts: ["tmp/ty-context/plan-acceptance/demo/test-assertion-result.json"]
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const record = spawnSync(
      process.execPath,
      [cli, "composite-long-task", "record-evidence", workdir, "--from", artifactPath, "--command-run-id", commandRun.command_run_id],
      { cwd: root, encoding: "utf8" }
    );
    assert.equal(record.status, 0, record.stderr);
    assert.match(record.stdout, /registered evidence EV2-/);

    state = JSON.parse(await readFile(path.join(root, workdir, "task-state.json"), "utf8"));
    const evidence = state.evidence.at(-1);
    assert.equal(evidence.schema_version, "evidence-record-v2");
    assert.equal(evidence.task_attempt_id, state.current_attempt_id);
    assert.equal(evidence.command_run_id, commandRun.command_run_id);
    assert.equal(evidence.command_spec_id, commandRun.command_spec_id);
    assert.equal(evidence.assertion_result.schema_version, "assertion-result-v2");
    assert.deepEqual(evidence.proves, ["AC-001.test"]);
    assert.deepEqual(state.graph.proof_layers["AC-001.test"].evidence_ids.slice(-1), [evidence.evidence_id]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
