import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  createPlanProject,
  validMatrix,
  validTaskState,
  validVerdict,
  writeAcceptance,
  writeDerivedMatrix,
  writeSuperpowersSources,
  writeTaskState
} from "./plan-validator-fixtures.mjs";

test("validate-superpowers-state accepts complete fresh evidence and final-gate computes product goal completion", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, validTaskState());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);

    let report = await validateSuperpowersState(root, [workdir]);
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /Superpowers task state validation passed/);

    await runFinalGate(workdir);
    const stateReport = await validateSuperpowersState(root, [workdir]);
    assert.deepEqual(stateReport.errors, []);
    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.final.product_goal_complete, true);
    assert.equal(state.final.acceptance_target_status, "complete");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("final-gate does not complete an initialized but uncompiled state", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-EMPTY", planSlug: "demo" });

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, false);
    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.final.product_goal_complete, false);
    assert.equal(state.final.acceptance_target_status, "partial");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-superpowers-state rejects source hash mismatch missing evidence stale evidence substitution and auditor blockers", async () => {
  const cases = [
    {
      name: "source hash mismatch",
      mutate(state) {
        state.sources.acceptance_checklist.sha256 = "0".repeat(64);
      },
      expected: /source hash mismatch/
    },
    {
      name: "missing evidence",
      mutate(state) {
        state.graph.proof_layers["AC-001.runtime"].evidence_ids = [];
      },
      expected: /satisfied but has no evidence_ids/
    },
    {
      name: "stale evidence",
      mutate(state) {
        state.evidence[0].freshness.stale_after = "2020-01-01T00:00:00.000Z";
      },
      expected: /stale evidence/
    },
    {
      name: "raw secret",
      mutate(state) {
        state.evidence[0].command = "Authorization: Bearer sk_live_1234567890abcdef";
      },
      expected: /secret|token|credential|cookie/i
    },
    {
      name: "runtime mock substitution",
      mutate(state) {
        state.evidence[0].type = "unit";
      },
      expected: /runtime proof.*mock|unit|viewmodel/i
    },
    {
      name: "wrong ui proof",
      mutate(state) {
        state.evidence[1].type = "unit";
      },
      expected: /UI proof.*owner surface|browser/i
    },
    {
      name: "sibling substitution",
      mutate(state) {
        state.evidence[1].sibling_substitution_used = true;
      },
      expected: /sibling substitution/i
    },
    {
      name: "auditor blocker",
      mutate(state) {
        state.gates.auditor = {
          auditor_status: "blocking_gap",
          findings: [{ id: "AUD-001", severity: "blocking", affected_ac: "AC-001", finding: "missing browser proof" }]
        };
      },
      expected: /auditor blocker|AUD-001/i
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = validTaskState();
      item.mutate(state);
      await writeTaskState(root, state);
      const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), item.expected, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("validate-plan-acceptance prefers state-backed validation and rejects derived drift", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, validTaskState());
    await writeAcceptance(root, validMatrix(), validVerdict());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);

    let report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /state-backed/);

    await writeDerivedMatrix(root, { overall_status: "complete", items: [{ plan_item_id: "PI-001", status: "partial" }] });
    report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /derived.*plan-conformance-matrix.*does not match task-state/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance does not fall back to legacy artifacts when state exists", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.graph.proof_layers["AC-001.runtime"].evidence_ids = [];
    await writeTaskState(root, state);
    await writeAcceptance(root, validMatrix(), validVerdict());

    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /satisfied but has no evidence_ids/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-superpowers-state rejects hand-edited derived artifacts", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, validTaskState());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);
    await writeFile(path.join(workdir, "derived/final-acceptance-verdict.json"), JSON.stringify({ overall_status: "complete", acceptance_items: [] }), "utf8");

    const report = await validateSuperpowersState(root, [workdir]);
    assert.match(report.errors.join("\n"), /derived.*final-acceptance-verdict.*does not match task-state/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
