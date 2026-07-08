import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { renderFinalCard } from "../../packages/ty-context/dist/lib/superpowers-task-final-card.js";
import {
  resolveCompletionOutputStatus,
  scanFalseCompletionPhrases
} from "../../packages/ty-context/dist/lib/superpowers-task-completion-output.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, validTaskState, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const expectedOutcomesPath = path.join(
  import.meta.dirname,
  "fixtures/composite-long-task/completion-output-gate/expected-outcomes.json"
);
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
  cliSnapshotRoot = await mkdtemp(path.join(snapshotParent, "hfc-002-cli-"));
  await cp(path.join(repoRoot, "packages/ty-context/dist"), path.join(cliSnapshotRoot, "dist"), { recursive: true });
  await cp(path.join(repoRoot, "packages/ty-context/package.json"), path.join(cliSnapshotRoot, "package.json"));
  return path.join(cliSnapshotRoot, "dist/cli.js");
}

test("HFC-002 resolver maps all minimum fixtures to accept reject or blocked", async () => {
  const expected = JSON.parse(await readFile(expectedOutcomesPath, "utf8"));
  for (const [fixtureName, outcome] of Object.entries(expected)) {
    const contract = resolveCompletionOutputStatus({
      final_gate_ran: fixtureName !== "final_gate_not_run_summary_completed",
      product_goal_complete: outcome.product_goal_complete,
      acceptance_target_status: outcome.acceptance_target_status,
      audit_task_complete: fixtureName === "audit_task_complete_acceptance_partial",
      validator_errors: [],
      acceptance_validator_errors: [],
      generated_output_mismatch: false
    });
    assert.equal(contract.completion_output_status, outcome.completion_output_status, fixtureName);
    assert.equal(["accept", "reject", "blocked"].includes(contract.completion_output_status), true);
    assert.equal(contract.final_answer_allowed, outcome.completion_output_status === "accept");
  }
});

test("HFC-002 phrase scanner rejects final-answer completion wording under non-accept status", () => {
  const findings = scanFalseCompletionPhrases({
    completion_output_status: "reject",
    surfaces: [
      { surface: "final-summary.md", text: "Final answer: completed\nGoal achieved\nReady to merge\n" },
      { surface: "goal-objective.txt", text: 'update_goal(status="complete")\n' },
      { surface: "final-card.md", text: "验收通过，可以合并\n" }
    ]
  });
  assert.match(findings.map((item) => item.phrase).join("\n"), /completed|Goal achieved|Ready to merge|update_goal|验收通过|可以合并/);

  const allowed = scanFalseCompletionPhrases({
    completion_output_status: "reject",
    surfaces: [
      {
        surface: "workflow-protocol.md",
        text: "Do not say completed unless final-gate accepts. Audit workflow completed; acceptance target not complete."
      },
      { surface: "final-summary.md", text: "Product goal complete: false\nFinal answer: reject\n" }
    ]
  });
  assert.deepEqual(allowed, []);
});

test("HFC-002 derive writes resolver-backed final summary and final card for reject status", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState({
      final: {
        product_goal_complete: false,
        acceptance_target_status: "partial",
        audit_task_complete: true,
        completion_basis: [],
        completion_output_status: "reject",
        final_answer_allowed: false,
        required_user_visible_status: "rejected",
        exit_code: 1,
        blocked_reasons: [],
        rejection_reasons: ["AC-001.ui_browser missing current satisfied proof layer"]
      }
    });
    state.meta.audit_task_complete = true;
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const result = await deriveSuperpowersArtifacts(workdir);
    assert.ok(result.files.some((file) => file.endsWith("derived/final-card.md")));

    const summary = await readFile(path.join(workdir, "derived/final-summary.md"), "utf8");
    const finalCard = await readFile(path.join(workdir, "derived/final-card.md"), "utf8");
    assert.match(summary, /completion_output_status: reject/);
    assert.match(summary, /Final answer: reject/);
    assert.match(summary, /Audit workflow completed; acceptance target not complete\./);
    assert.match(finalCard, /completion_output_status: reject/);
    assert.doesNotMatch(`${summary}\n${finalCard}`, /Goal achieved|Ready to merge|Implementation complete/);
    assert.deepEqual(
      scanFalseCompletionPhrases({
        completion_output_status: "reject",
        surfaces: [
          { surface: "final-summary.md", text: summary },
          { surface: "final-card.md", text: finalCard }
        ]
      }),
      []
    );

    const rendered = renderFinalCard(resolveCompletionOutputStatus({ final_gate_ran: true, product_goal_complete: false, acceptance_target_status: "partial" }), state);
    assert.match(rendered, /Final answer: reject/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-002 validator rejects hand-edited generated completion wording under false final-gate", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.graph.acceptance_criteria["AC-001"].status = "partial";
    state.graph.plan_items["PI-001"].status = "partial";
    state.final.product_goal_complete = false;
    state.final.acceptance_target_status = "partial";
    state.final.audit_task_complete = true;
    state.final.completion_output_status = "reject";
    state.final.final_answer_allowed = false;
    state.final.required_user_visible_status = "rejected";
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);
    await writeFile(path.join(workdir, "derived/final-summary.md"), "# Final Summary\n\nGoal achieved. Implementation complete.\n", "utf8");
    await writeFile(path.join(workdir, "derived/final-card.md"), "# Final Card\n\nFinal answer: completed\n", "utf8");

    const report = await validateSuperpowersState(root, [workdir]);
    assert.match(report.errors.join("\n"), /false completion phrase|final-summary|final-card/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-002 final-gate regenerates stale output and returns reject for current false gate", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await mkdir(path.join(workdir, "derived"), { recursive: true });
    await writeFile(path.join(workdir, "derived/final-summary.md"), "# Final Summary\n\nGoal achieved.\n", "utf8");

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, false);
    assert.equal(result.completion_output_status, "reject");
    assert.equal(result.exit_code, 1);

    const summary = await readFile(path.join(workdir, "derived/final-summary.md"), "utf8");
    assert.match(summary, /completion_output_status: reject/);
    assert.doesNotMatch(summary, /Goal achieved/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-002 final-gate CLI prints machine completion output fields and non-accept exit code", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.graph.proof_layers["AC-001.ui_browser"].status = "missing";
    state.graph.proof_layers["AC-001.ui_browser"].evidence_ids = [];
    state.evidence = state.evidence.filter((item) => item.evidence_id !== "EV-002");
    await writeTaskState(root, state);
    const cli = await cliSnapshotPromise;
    const workdir = "tmp/ty-context/plan-acceptance/demo";

    const result = spawnSync(process.execPath, [cli, "composite-long-task", "final-gate", workdir], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /completion_output_status=reject/);
    assert.match(result.stdout, /final_answer_allowed=false/);
    assert.match(result.stdout, /required_user_visible_status=rejected/);
    assert.match(result.stdout, /exit_code=1/);
    assert.doesNotMatch(result.stdout, /Goal achieved|Implementation complete|Ready to merge/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HFC-002 happy path final-gate true outputs accept", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, assertionBackedTaskState());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, true);
    assert.equal(result.completion_output_status, "accept");
    assert.equal(result.final_answer_allowed, true);
    assert.equal(result.exit_code, 0);

    const summary = await readFile(path.join(workdir, "derived/final-summary.md"), "utf8");
    assert.match(summary, /completion_output_status: accept/);
    assert.match(summary, /Final answer: accept/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
