import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { evaluateTrustedEvidenceKernel } from "../../packages/ty-context/dist/lib/superpowers-task-evidence-kernel.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

const expectedOutcomesPath = path.join(
  import.meta.dirname,
  "fixtures/composite-long-task/trusted-evidence-kernel/expected-outcomes.json"
);

test("HFC-001 Trusted Evidence Kernel fixtures recompute final completion from current evidence only", async () => {
  const expectedOutcomes = JSON.parse(await readFile(expectedOutcomesPath, "utf8"));
  const cases = [
    {
      name: "historical_complete_current_false",
      mutate(state) {
        removeCurrentProof(state);
      },
      async writeExtra(workdir) {
        await writeFile(
          path.join(workdir, "events.ndjson"),
          `${JSON.stringify({ event_type: "final_gate", product_goal_complete: true, created_at: "2026-06-28T00:00:00.000Z" })}\n`,
          "utf8"
        );
      },
      expectedError: /missing current satisfied proof layer|missing assertion result/i
    },
    {
      name: "stale_assertion_passed_current_command_failed",
      mutate(state) {
        const run = state.command_runs.find((item) => item.proof_layer === "ui_browser");
        run.command_run_id = "CR-current-failed-ui";
        run.exit_code = 1;
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        evidence.command_run_id = "CR-current-failed-ui";
      },
      expectedError: /newer failed command|command_run_failed|exit_code=1|command_exit_code=1/i
    },
    {
      name: "unregistered_assertion_json_passed",
      mutate(state) {
        removeCurrentProof(state);
      },
      async writeExtra(workdir) {
        await writeUnregisteredPassedAssertion(workdir);
      },
      expectedError: /ignored_unregistered_evidence|unregistered assertion JSON/i,
      assertKernel(kernel) {
        assert.ok(Array.isArray(kernel.ignored_unregistered_evidence));
        assert.equal(kernel.ignored_unregistered_evidence.length, 1);
      }
    },
    {
      name: "ac010_summary_only_without_required_ac",
      mutate(state) {
        const ac001 = state.graph.acceptance_criteria["AC-001"];
        state.graph.acceptance_criteria["AC-004"] = {
          ...structuredClone(ac001),
          scope: "A required runtime AC still lacks current proof.",
          related_plan_items: ["PI-001"],
          required_proof_layers: ["test"],
          status: "partial"
        };
        state.graph.proof_layers["AC-004.test"] = { required: true, status: "missing", evidence_ids: [] };
        state.graph.acceptance_criteria["AC-010"] = {
          ...structuredClone(ac001),
          scope: "Final gate summary says all ACs passed.",
          related_plan_items: ["PI-001"],
          required_proof_layers: ["test"],
          assertion_command: "node tools/final-gate-summary.mjs",
          final_evidence_expected: ["derived/final-acceptance-verdict.json"],
          status: "complete"
        };
        state.graph.proof_layers["AC-010.test"] = { required: true, status: "satisfied", evidence_ids: ["EV-003"] };
        state.graph.plan_items["PI-001"].related_acs = ["AC-001", "AC-004", "AC-010"];
      },
      expectedError: /final_gate_cannot_bootstrap_from_summary_only|AC-004/i
    },
    {
      name: "target_ac_mismatch",
      mutate(state) {
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        evidence.target_ac_ids = ["AC-999"];
        evidence.assertion_result.target_ac_ids = ["AC-999"];
      },
      expectedError: /target ACs|target_ac_ids|AC-001/i
    },
    {
      name: "target_proof_layer_mismatch",
      mutate(state) {
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        evidence.target_proof_layers = ["AC-001.worker_runtime"];
        evidence.assertion_result.target_proof_layers = ["AC-001.worker_runtime"];
        evidence.negative_evidence_scan.target_proof_layers = ["AC-001.worker_runtime"];
        if (evidence.assertion_result.negative_evidence_scan) {
          evidence.assertion_result.negative_evidence_scan.target_proof_layers = ["AC-001.worker_runtime"];
        }
      },
      expectedError: /target_proof_layers|AC-001\.ui_browser/i
    },
    {
      name: "source_hash_mismatch",
      mutate(state) {
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        evidence.source_bundle_hash = "0".repeat(64);
        evidence.product_source_hash = "1".repeat(64);
      },
      expectedError: /source_bundle_hash mismatch|product_source_hash mismatch/i
    },
    {
      name: "dirty_worktree_mismatch",
      mutate(state) {
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        evidence.worktree_fingerprint = "2".repeat(64);
      },
      expectedError: /worktree_fingerprint mismatch/i
    },
    {
      name: "missing_assertion_result",
      mutate(state) {
        const evidence = state.evidence.find((item) => item.evidence_id === "EV-002");
        delete evidence.assertion_result;
      },
      expectedError: /missing assertion result|not machine-backed/i
    },
    {
      name: "invalid_current_attempt_id",
      mutate(state) {
        state.current_attempt_id = "ATT-MISSING";
      },
      expectedError: /missing current attempt|current_attempt_id/i
    },
    {
      name: "happy_path_current_evidence_complete",
      mutate() {},
      expectedError: /^$/
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = assertionBackedTaskState();
      item.mutate(state);
      await writeTaskState(root, state);
      const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
      await item.writeExtra?.(workdir);
      await deriveSuperpowersArtifacts(workdir);

      const expected = expectedOutcomes[item.name];
      assert.ok(expected, `${item.name} must be listed in expected outcomes fixture`);

      const kernel = await evaluateTrustedEvidenceKernel(workdir);
      assert.equal(kernel.product_goal_complete, expected.product_goal_complete, `${item.name} kernel product_goal_complete`);
      item.assertKernel?.(kernel);

      const finalGate = await runFinalGate(workdir);
      assert.equal(finalGate.product_goal_complete, expected.product_goal_complete, `${item.name} final-gate product_goal_complete`);
      const errors = [...kernel.errors, ...finalGate.errors].join("\n");
      if (expected.product_goal_complete) {
        assert.equal(errors, "", `${item.name} expected no kernel/final-gate errors`);
      } else {
        assert.match(errors, item.expectedError, `${item.name} expected blocker`);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

function removeCurrentProof(state) {
  state.evidence = [];
  state.graph.acceptance_criteria["AC-001"].status = "partial";
  state.graph.plan_items["PI-001"].status = "partial";
  for (const layer of Object.values(state.graph.proof_layers)) {
    layer.status = "missing";
    layer.evidence_ids = [];
  }
}

async function writeUnregisteredPassedAssertion(workdir) {
  const dir = path.join(workdir, "tmp/unregistered-assertions");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "assertion-result-passed.json"),
    JSON.stringify(
      {
        schema_version: "assertion-result-v2",
        status: "passed",
        target_ac_ids: ["AC-001"],
        target_proof_layers: ["AC-001.ui_browser"],
        artifacts: ["tmp/unregistered-assertions/assertion-result-passed.json"]
      },
      null,
      2
    ),
    "utf8"
  );
}
