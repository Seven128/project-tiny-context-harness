import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateTrustedEvidenceKernel } from "../../packages/ty-context/dist/lib/superpowers-task-evidence-kernel.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import {
  resolveCompletionOutputStatus,
  scanFalseCompletionPhrases,
  scanGeneratedCompletionOutputSurfaces
} from "../../packages/ty-context/dist/lib/superpowers-task-completion-output.js";

const fixtureRoot = path.join(
  import.meta.dirname,
  "fixtures/composite-long-task/false-completion-regression"
);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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
  cliSnapshotRoot = await mkdtemp(path.join(snapshotParent, "hfc-003-cli-"));
  await cp(path.join(repoRoot, "packages/ty-context/dist"), path.join(cliSnapshotRoot, "dist"), { recursive: true });
  await cp(path.join(repoRoot, "packages/ty-context/package.json"), path.join(cliSnapshotRoot, "package.json"));
  return path.join(cliSnapshotRoot, "dist/cli.js");
}

const requiredFixtureIds = [
  "historical_complete_current_false",
  "stale_assertion_passed_current_command_failed",
  "unregistered_assertion_json_passed",
  "current_command_failed_older_passed",
  "current_attempt_missing",
  "source_hash_mismatch",
  "dirty_worktree_mismatch",
  "target_ac_mismatch",
  "target_proof_layer_mismatch",
  "missing_assertion_result",
  "assertion_result_failed",
  "positive_assertion_missing_or_failed",
  "negative_assertion_hit",
  "invalid_completion_signal_hit",
  "negative_evidence_scan_hit",
  "under_specified_machine_blocking_ac",
  "ac010_summary_only_without_required_ac",
  "final_gate_false_final_summary_completed",
  "final_gate_false_final_card_completed",
  "final_gate_false_matrix_verdict_passed",
  "validator_pass_final_gate_false",
  "audit_task_complete_acceptance_partial",
  "final_gate_not_run_summary_completed",
  "product_task_modified_harness_helper",
  "makefile_target_weakened",
  "compile_pass_not_complete",
  "derive_pass_not_complete",
  "api_only_summary_for_ui_path",
  "screenshot_only_for_owner_page",
  "test_name_only",
  "artifact_exists_only",
  "scope_leakage_sfc003_complete_inside_sfc002",
  "owner_surfaces_missing_ui_browser",
  "missing_negative_semantic_proof_terminal_cancel",
  "missing_boundary_semantic_proof_refresh_catalog",
  "missing_boundary_semantic_proof_import_evidence",
  "happy_path_current_evidence_complete"
].sort();

test("HFC-003 false-completion regression fixture manifest is complete", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.mode, "harness_task");
  assert.deepEqual([...(manifest.required_fixture_ids ?? [])].sort(), requiredFixtureIds);
  assert.equal(manifest.fixtures.length, requiredFixtureIds.length);
  const ids = manifest.fixtures.map((fixture) => fixture.id).sort();
  assert.deepEqual(ids, requiredFixtureIds);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(new Set(manifest.fixtures.map((fixture) => fixture.category)).size >= 12);
});

test("HFC-003 runner reads each committed mini workdir and enforces expected outcomes", async () => {
  const manifest = await readManifest();
  const rows = [];
  for (const fixture of manifest.fixtures) {
    const fixtureDir = path.join(fixtureRoot, fixture.id);
    const expected = await readExpected(fixtureDir);
    assert.equal(expected.fixture_id, fixture.id);
    await assertCommittedWorkdirShape(fixtureDir);

    const { tempRoot, workdir } = await copyFixtureToTempWorkdir(fixtureDir, fixture.id);
    try {
      const preScan = await scanGeneratedCompletionOutputSurfaces(workdir, {
        completion_output_status: expected.expected_completion_output_status
      });
      if (expected.preexisting_forbidden_phrase === true) {
        assert.ok(preScan.length > 0, `${fixture.id} should contain a stale forbidden completion phrase before final-gate`);
      }

      const actual =
        expected.runner_mode === "resolver_only"
          ? await runResolverOnlyFixture(workdir, expected)
          : await runFinalGateFixture(workdir, expected);
      const postScan = await scanGeneratedCompletionOutputSurfaces(workdir, {
        completion_output_status: actual.actual_completion_output_status
      });
      if (expected.runner_mode === "resolver_only" && expected.preexisting_forbidden_phrase === true) {
        assert.ok(postScan.length > 0, `${fixture.id} resolver-only scan should catch forbidden completion wording`);
      } else {
        assert.deepEqual(postScan, [], `${fixture.id} post-gate generated outputs must not contain forbidden completion wording`);
      }

      const errorText = [actual.error_text, ...preScan.map((finding) => `${finding.surface}:${finding.phrase}`)].join("\n");
      for (const expectedError of expected.expected_error_codes) {
        assert.match(errorText, new RegExp(escapeRegExp(expectedError), "i"), `${fixture.id} expected blocker ${expectedError}`);
      }

      if (expected.cli_smoke === true) {
        await assertCliSmoke(fixtureDir, expected);
      }

      rows.push({
        fixture_id: fixture.id,
        category: fixture.category,
        expected_final_gate: expected.expected_final_gate_product_goal_complete,
        actual_final_gate: actual.actual_final_gate_product_goal_complete,
        expected_output_status: expected.expected_completion_output_status,
        actual_output_status: actual.actual_completion_output_status,
        expected_errors: expected.expected_error_codes.join("; ") || "(none)",
        actual_errors: summarizeErrors(actual.error_text),
        forbidden_scan: postScan.length === 0 ? "pass" : "caught",
        result: "pass"
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
  console.log(formatFixtureTable(rows));
});

async function readManifest() {
  return JSON.parse(await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"));
}

async function readExpected(fixtureDir) {
  return JSON.parse(await readFile(path.join(fixtureDir, "expected.json"), "utf8"));
}

async function assertCommittedWorkdirShape(fixtureDir) {
  for (const file of [
    "product-architecture-source.md",
    "technical-realization-plan.md",
    "acceptance-checklist.md",
    "task-state.json",
    "events.ndjson",
    "expected.json"
  ]) {
    await readFile(path.join(fixtureDir, file), "utf8");
  }
  for (const dir of ["derived", "artifacts", "command-runs", "evidence"]) {
    assert.ok((await readdir(path.join(fixtureDir, dir))).length >= 1, `${path.basename(fixtureDir)} missing ${dir}/ contents`);
  }
}

async function copyFixtureToTempWorkdir(fixtureDir, fixtureId) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), `hfc-003-${fixtureId}-`));
  const workdir = path.join(tempRoot, "tmp/ty-context/plan-acceptance/demo");
  await cp(fixtureDir, workdir, { recursive: true });
  return { tempRoot, workdir };
}

async function runResolverOnlyFixture(workdir, expected) {
  const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
  const contract = resolveCompletionOutputStatus({
    final_gate_ran: false,
    product_goal_complete: state.final.product_goal_complete,
    acceptance_target_status: state.final.acceptance_target_status,
    audit_task_complete: state.final.audit_task_complete
  });
  assert.equal(false, expected.expected_final_gate_product_goal_complete, `${expected.fixture_id} resolver-only final-gate value`);
  assert.equal(contract.acceptance_target_status, expected.expected_acceptance_target_status, `${expected.fixture_id} acceptance status`);
  assert.equal(contract.completion_output_status, expected.expected_completion_output_status, `${expected.fixture_id} completion output`);
  assert.equal(contract.exit_code, expected.expected_exit_code, `${expected.fixture_id} exit code`);
  return {
    actual_final_gate_product_goal_complete: false,
    actual_completion_output_status: contract.completion_output_status,
    error_text: [...contract.blocked_reasons, ...contract.rejection_reasons].join("\n")
  };
}

async function runFinalGateFixture(workdir, expected) {
  const kernel = await evaluateTrustedEvidenceKernel(workdir);
  const finalGate = await runFinalGate(workdir);
  assert.equal(kernel.product_goal_complete, expected.expected_final_gate_product_goal_complete, `${expected.fixture_id} kernel product_goal_complete`);
  assert.equal(finalGate.product_goal_complete, expected.expected_final_gate_product_goal_complete, `${expected.fixture_id} final-gate product_goal_complete`);
  assert.equal(finalGate.acceptance_target_status, expected.expected_acceptance_target_status, `${expected.fixture_id} acceptance status`);
  assert.equal(finalGate.completion_output_status, expected.expected_completion_output_status, `${expected.fixture_id} completion output`);
  assert.equal(finalGate.exit_code, expected.expected_exit_code, `${expected.fixture_id} exit code`);
  return {
    actual_final_gate_product_goal_complete: finalGate.product_goal_complete,
    actual_completion_output_status: finalGate.completion_output_status,
    error_text: [
      ...kernel.errors,
      ...finalGate.errors,
      ...finalGate.blocked_reasons,
      ...finalGate.rejection_reasons
    ].join("\n")
  };
}

async function assertCliSmoke(fixtureDir, expected) {
  const { tempRoot } = await copyFixtureToTempWorkdir(fixtureDir, `${expected.fixture_id}-cli`);
  try {
    const cli = await cliSnapshotPromise;
    const result = spawnSync(process.execPath, [cli, "composite-long-task", "final-gate", "tmp/ty-context/plan-acceptance/demo"], {
      cwd: tempRoot,
      encoding: "utf8"
    });
    assert.equal(result.status, expected.expected_exit_code, `${expected.fixture_id} CLI exit\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    assert.match(result.stdout, new RegExp(`completion_output_status=${expected.expected_completion_output_status}\\b`), `${expected.fixture_id} CLI status`);
    assert.doesNotMatch(result.stdout, /Goal achieved|Implementation complete|Ready to merge|update_goal\s*\(\s*status\s*=\s*["']complete/i);
    if (expected.expected_completion_output_status !== "accept") {
      const findings = scanFalseCompletionPhrases({
        completion_output_status: expected.expected_completion_output_status,
        surfaces: [{ surface: "cli stdout", text: result.stdout }]
      });
      assert.deepEqual(findings, [], `${expected.fixture_id} CLI stdout false completion scan`);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function summarizeErrors(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(0, 3).join("; ") || "(none)";
}

function formatFixtureTable(rows) {
  const header = [
    "fixture_id",
    "category",
    "expected_final_gate",
    "actual_final_gate",
    "expected_output_status",
    "actual_output_status",
    "expected_errors",
    "actual_errors",
    "forbidden_scan",
    "result"
  ];
  return [
    "HFC-003 fixture results",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${header.map((key) => String(row[key]).replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
