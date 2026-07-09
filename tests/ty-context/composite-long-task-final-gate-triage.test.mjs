import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { validatePlanAcceptance } from "../../packages/ty-context/dist/lib/plan-acceptance-validator.js";
import {
  scanFalseCompletionPhrasesDetailed,
  triageFinalGateBlockers
} from "../../packages/ty-context/dist/lib/superpowers-task-completion-output.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures/composite-long-task/final-gate-triage");
let cliSnapshotRoot;
const cliSnapshotPromise = snapshotDistCli();

after(async () => {
  if (cliSnapshotRoot) {
    await rm(cliSnapshotRoot, { recursive: true, force: true });
  }
});

async function snapshotDistCli() {
  const snapshotParent = path.join(repoRoot, "tmp/ty-context");
  await mkdir(snapshotParent, { recursive: true });
  cliSnapshotRoot = await mkdtemp(path.join(snapshotParent, "hfc-004-cli-"));
  await cp(path.join(repoRoot, "packages/ty-context/dist"), path.join(cliSnapshotRoot, "dist"), { recursive: true });
  await cp(path.join(repoRoot, "packages/ty-context/package.json"), path.join(cliSnapshotRoot, "package.json"));
  return path.join(cliSnapshotRoot, "dist/cli.js");
}

test("HFC-004 fixture manifest records required final-gate triage scenarios", async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.mode, "harness_task");
  assert.deepEqual(
    manifest.required_fixture_ids,
    [
      "kernel_accept_old_final_meta_generated_output_mismatch",
      "protocol_rule_and_machine_json_allowed",
      "current_false_completion_blocks",
      "missing_current_evidence_not_self_recoverable",
      "environment_contract_harness_blockers",
      "self_recoverable_generated_output_mismatch"
    ]
  );
  assert.equal(manifest.fixtures.length, manifest.required_fixture_ids.length);
  for (const fixture of manifest.fixtures) {
    const expected = JSON.parse(await readFile(path.join(fixtureRoot, fixture.expected_path), "utf8"));
    assert.equal(expected.fixture_id, fixture.id);
    assert.equal(expected.expected_final_status, fixture.expected_final_status);
    assert.equal(expected.expected_triage_category, fixture.expected_triage_category);
    assert.equal(expected.expected_recovery_attempted, fixture.recovery_expected);
  }
});

test("HFC-004 final-gate accepts current kernel candidate despite old transient blocked bookkeeping", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.final.product_goal_complete = false;
    state.final.acceptance_target_status = "blocked";
    state.final.completion_output_status = "blocked";
    state.final.generated_output_mismatch = true;
    state.final.blocked_reasons = ["generated_output_mismatch"];
    state.meta.product_goal_complete = false;
    state.meta.acceptance_target_status = "blocked";
    state.meta.completion_output_status = "blocked";
    state.gates.final_gate = {
      status: "blocked",
      completion_output_status: "blocked",
      generated_output_mismatch: true,
      false_completion_phrase_findings: [{ surface: "derived/final-summary.md", phrase: "completed", line: 5 }]
    };
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await mkdir(path.join(workdir, "derived"), { recursive: true });
    await writeFile(path.join(workdir, "derived/final-summary.md"), "# Final Summary\n\nGoal achieved.\n", "utf8");

    const result = await runFinalGate(workdir);

    assert.equal(result.product_goal_complete, true);
    assert.equal(result.completion_output_status, "accept");
    assert.equal(result.generated_output_mismatch, false);
    assert.equal(result.blocker_triage.category, "transient_state_bookkeeping");
    assert.equal(result.blocker_triage.self_recoverable, true);
    assert.equal(result.blocker_triage.recovery_attempted, true);
    assert.match(result.blocker_triage.next_action, /cleared previous transient bookkeeping/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-004 scanner allows protocol rule text and machine JSON but blocks user-visible final claims", () => {
  const findings = scanFalseCompletionPhrasesDetailed({
    completion_output_status: "reject",
    surfaces: [
      {
        surface: "workflow-protocol.md",
        text: "Do not say completed unless final-gate accepts. Completed is forbidden before accept."
      },
      {
        surface: "derived/final-acceptance-verdict.json",
        text: '{ "diagnostic_scope": "acceptance_evidence_rows_only", "acceptance_items": [{ "status": "complete" }] }'
      },
      {
        surface: "goal-objective.txt",
        text: "Final answer: completed\nGoal achieved.\n"
      }
    ]
  });

  assert.deepEqual(
    findings.map((finding) => [finding.surface, finding.surface_type, finding.classification, finding.phrase]),
    [
      ["goal-objective.txt", "agent_final_answer", "true_false_completion_claim", "completed"],
      ["goal-objective.txt", "agent_final_answer", "true_false_completion_claim", "goal achieved"]
    ]
  );
});

test("HFC-004 current user-visible false completion remains blocked with triage", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeFile(path.join(workdir, "goal-objective.txt"), "Final answer: completed\nGoal achieved.\n", "utf8");

    const result = await runFinalGate(workdir);

    assert.equal(result.product_goal_complete, false);
    assert.equal(result.completion_output_status, "blocked");
    assert.equal(result.blocker_triage.category, "generated_output_mismatch");
    assert.equal(result.blocker_triage.self_recoverable, false);
    assert.match(result.blocker_triage.next_action, /remove or regenerate/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-004 missing current evidence is not self-recoverable", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const result = await runFinalGate(workdir);

    assert.equal(result.product_goal_complete, false);
    assert.equal(result.completion_output_status, "reject");
    assert.equal(result.blocker_triage.category, "missing_current_evidence");
    assert.equal(result.blocker_triage.self_recoverable, false);
    assert.match(result.blocker_triage.next_action, /fresh current-attempt evidence/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-004 triage classifies environment contract and harness blockers", () => {
  const rows = [
    ["required command not_run: Playwright unavailable", "environment_blocked"],
    ["source file is missing for product_architecture_source: product.md", "contract_blocked"],
    ["scope_conflict_requires_decision: source disagreement", "contract_blocked"],
    ["harness_drift_detected: product task modified final-gate", "harness_drift_blocked"]
  ];
  for (const [error, category] of rows) {
    const triage = triageFinalGateBlockers({ errors: [error], output_findings: [], previous_transient_findings: [] });
    assert.equal(triage.category, category, error);
    assert.equal(triage.self_recoverable, false, error);
    assert.ok(triage.next_action.length > 0, error);
  }
});

test("HFC-004 triage classifies regenerable generated-output mismatch as self-recoverable", () => {
  const findings = scanFalseCompletionPhrasesDetailed({
    completion_output_status: "reject",
    surfaces: [{ surface: "derived/final-summary.md", text: "# Final Summary\n\nGoal achieved.\n" }]
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].self_recoverable, true);

  const triage = triageFinalGateBlockers({ errors: [], output_findings: findings, previous_transient_findings: [] });
  assert.equal(triage.category, "self_recoverable_generated_output_mismatch");
  assert.equal(triage.self_recoverable, true);
  assert.equal(triage.recovery_attempted, false);
  assert.match(triage.next_action, /regenerate derived generated-output surfaces/i);
});

test("HFC-004 final-gate CLI smokes current candidate and blocker triage scenarios", async () => {
  const scenarios = [
    {
      id: "kernel_accept_old_final_meta_generated_output_mismatch",
      expectedExit: 0,
      setup: async (root) => {
        const state = assertionBackedTaskState();
        state.final.product_goal_complete = false;
        state.final.acceptance_target_status = "blocked";
        state.final.completion_output_status = "blocked";
        state.final.generated_output_mismatch = true;
        state.final.blocked_reasons = ["generated_output_mismatch"];
        state.meta.product_goal_complete = false;
        state.meta.acceptance_target_status = "blocked";
        state.meta.completion_output_status = "blocked";
        state.gates.final_gate = {
          status: "blocked",
          completion_output_status: "blocked",
          generated_output_mismatch: true,
          false_completion_phrase_findings: [{ surface: "derived/final-summary.md", phrase: "completed", line: 5 }]
        };
        await writeTaskState(root, state);
        const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
        await mkdir(path.join(workdir, "derived"), { recursive: true });
        await writeFile(path.join(workdir, "derived/final-summary.md"), "# Final Summary\n\nGoal achieved.\n", "utf8");
      },
      stdout: [/completion_output_status=accept/, /blocker_triage_category=transient_state_bookkeeping/, /blocker_triage_recovery_attempted=true/]
    },
    {
      id: "current_false_completion_blocks",
      expectedExit: 2,
      setup: async (root) => {
        const state = assertionBackedTaskState();
        state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
        state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
        state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
        await writeTaskState(root, state);
        await writeFile(path.join(root, "tmp/ty-context/plan-acceptance/demo/goal-objective.txt"), "Final answer: completed\nGoal achieved.\n", "utf8");
      },
      stdout: [/completion_output_status=blocked/, /blocker_triage_category=generated_output_mismatch/, /blocker_triage_self_recoverable=false/]
    },
    {
      id: "missing_current_evidence_not_self_recoverable",
      expectedExit: 1,
      setup: async (root) => {
        const state = assertionBackedTaskState();
        state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
        state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
        state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
        await writeTaskState(root, state);
      },
      stdout: [/completion_output_status=reject/, /blocker_triage_category=missing_current_evidence/, /blocker_triage_self_recoverable=false/]
    },
    {
      id: "protocol_rule_and_machine_json_allowed",
      expectedExit: 1,
      setup: async (root) => {
        const state = assertionBackedTaskState();
        state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
        state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
        state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
        await writeTaskState(root, state);
        await writeFile(
          path.join(root, "tmp/ty-context/plan-acceptance/demo/workflow-protocol.md"),
          "Do not say completed unless final-gate accepts. Completed is forbidden before accept.\n",
          "utf8"
        );
      },
      stdout: [/completion_output_status=reject/, /blocker_triage_category=missing_current_evidence/]
    }
  ];
  const cli = await cliSnapshotPromise;
  for (const scenario of scenarios) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      await scenario.setup(root);
      const result = spawnSync(process.execPath, [cli, "composite-long-task", "final-gate", "tmp/ty-context/plan-acceptance/demo"], {
        cwd: root,
        encoding: "utf8"
      });
      assert.equal(result.status, scenario.expectedExit, `${scenario.id}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
      for (const pattern of scenario.stdout) {
        assert.match(result.stdout, pattern, scenario.id);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("HFC-004 validators surface state-backed blocker triage category and next action", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await runFinalGate(workdir);

    const stateReport = await validateSuperpowersState(root, [workdir]);
    const acceptanceReport = await validatePlanAcceptance(root, [workdir]);

    assert.match(stateReport.info.join("\n"), /blocker_triage category=missing_current_evidence/);
    assert.match(stateReport.info.join("\n"), /next_action=.*fresh current-attempt evidence/i);
    assert.match(acceptanceReport.info.join("\n"), /blocker_triage category=missing_current_evidence/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
