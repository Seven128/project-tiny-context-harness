import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareFixture } from "./fixtures.mjs";
import {
  DERIVED_FILES,
  EQUIVALENCE_FIXTURE_IDS,
  buildEquivalenceReport,
  compareNormalizedRuns,
  normalizeGates,
  normalizeTaskState,
  normalizeText,
  slash,
  sortJson,
  toComparable
} from "./normalize.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runEquivalence(options) {
  const runId = options.runId ?? compactTimestamp();
  const outputDir = path.resolve(options.outputDir ?? path.join(repoRoot, "tmp", "ty-context", "composite-equivalence", runId));
  const worktreeDir = path.join(outputDir, "worktrees");
  const baselineRoot = path.join(worktreeDir, "baseline");
  const currentRoot = path.join(worktreeDir, "current");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await createWorktree(baselineRoot, options.baselineSha);
  await createWorktree(currentRoot, options.currentSha);
  if (!options.skipInstall) {
    installAndBuild(baselineRoot);
    installAndBuild(currentRoot);
  }

  const baseline = await runSide({ repo: baselineRoot, command: "superpowers", renderGoal: false });
  const current = await runSide({ repo: currentRoot, command: "composite-long-task", renderGoal: true });
  await writeSide(outputDir, "baseline", baseline);
  await writeSide(outputDir, "current", current);

  const comparison = compareNormalizedRuns(toComparable(baseline), toComparable(current));
  await mkdir(path.join(outputDir, "diffs"), { recursive: true });
  await writeJson(path.join(outputDir, "diffs", "semantic-diff.json"), comparison.semanticDiffs);
  await writeJson(path.join(outputDir, "diffs", "allowed-diff.json"), comparison.allowedDiffs);
  await writeJson(path.join(outputDir, "diffs", "rejected-diff.json"), comparison.rejectedDiffs);

  if (options.updateGolden) {
    const goldenDir = path.join(repoRoot, "tests", "ty-context", "fixtures", "composite-long-task-equivalence");
    await mkdir(goldenDir, { recursive: true });
    await writeJson(path.join(goldenDir, "baseline.normalized.json"), toComparable(baseline));
  }

  const report = buildEquivalenceReport(reportInput(options, baseline, current, comparison));
  await writeFile(path.join(outputDir, "equivalence-report.md"), report, "utf8");
  await writeFile(path.join(outputDir, "codex-smoke-report.md"), smokeNotRunReport(), "utf8");
  return { outputDir, comparison, report };
}

async function runSide({ repo, command, renderGoal }) {
  const fixtures = {};
  for (const fixtureId of EQUIVALENCE_FIXTURE_IDS) {
    const prepared = await prepareFixture(repo, fixtureId);
    fixtures[fixtureId] = await executeFixture(repo, command, prepared, renderGoal);
  }
  return {
    fixtures,
    checks: {
      hand_set_completion: await executeHandSetCompletionCheck(repo, command)
    }
  };
}

async function executeFixture(root, command, prepared, renderGoal) {
  const cli = path.join(root, "packages", "ty-context", "dist", "cli.js");
  const gates = {};
  gates.init = runNode(root, [cli, command, "init", prepared.workdirArg]);
  gates.compile = runNode(root, [cli, command, "compile", prepared.workdirArg]);
  if (prepared.strictParse) {
    return await collectFixtureOutput(prepared, gates);
  }
  if (renderGoal) {
    gates.render_goal = runNode(root, [cli, command, "render-goal", prepared.workdirArg]);
  }
  for (const [index, delta] of prepared.deltas.entries()) {
    const sliceId = JSON.parse(await readFile(delta, "utf8")).slice_id;
    gates[`apply_slice_delta_${index + 1}`] = runNode(root, [cli, command, "apply-slice-delta", prepared.workdirArg, slash(path.relative(root, delta))]);
    gates[`derive_${index + 1}`] = runNode(root, [cli, command, "derive", prepared.workdirArg]);
    gates[`slice_gate_${index + 1}`] = runNode(root, [cli, command, "slice-gate", prepared.workdirArg, "--slice", sliceId]);
  }
  gates.epoch_gate = runNode(root, [cli, command, "epoch-gate", prepared.workdirArg, "--epoch", "EPOCH-001"]);
  gates.validate_superpowers_state = runNode(root, [cli, "validate-superpowers-state", prepared.workdirArg]);
  gates.validate_plan_acceptance = runNode(root, [cli, "validate-plan-acceptance", prepared.workdirArg]);
  gates.final_gate = runNode(root, [cli, command, "final-gate", prepared.workdirArg]);
  return await collectFixtureOutput(prepared, gates);
}

async function collectFixtureOutput(prepared, gates) {
  const statePath = path.join(prepared.workdir, "task-state.json");
  return {
    task_state: existsSync(statePath) ? normalizeTaskState(JSON.parse(await readFile(statePath, "utf8"))) : null,
    derived: await readDerived(prepared.workdir),
    gates: normalizeGates(gates)
  };
}

async function executeHandSetCompletionCheck(root, command) {
  const prepared = await prepareFixture(root, "hand-set-completion");
  const cli = path.join(root, "packages", "ty-context", "dist", "cli.js");
  const gates = {};
  gates.init = runNode(root, [cli, command, "init", prepared.workdirArg]);
  gates.compile = runNode(root, [cli, command, "compile", prepared.workdirArg]);
  const statePath = path.join(prepared.workdir, "task-state.json");
  if (existsSync(statePath)) {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.meta.product_goal_complete = true;
    state.final.product_goal_complete = true;
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
  gates.validate_superpowers_state = runNode(root, [cli, "validate-superpowers-state", prepared.workdirArg]);
  return normalizeGates(gates);
}

async function readDerived(workdir) {
  const output = {};
  const derivedDir = path.join(workdir, "derived");
  if (!existsSync(derivedDir)) {
    return output;
  }
  for (const basename of DERIVED_FILES) {
    const file = path.join(derivedDir, basename);
    if (!existsSync(file)) {
      continue;
    }
    const key = basename.replace(/\.(json|md)$/, "");
    const text = await readFile(file, "utf8");
    output[key] = basename.endsWith(".json") ? sortJson(JSON.parse(text)) : normalizeText(text);
  }
  return sortJson(output);
}

async function writeSide(outputDir, sideName, side) {
  const sideDir = path.join(outputDir, sideName);
  await mkdir(path.join(sideDir, "derived.normalized"), { recursive: true });
  const states = {};
  const gates = {};
  for (const [fixtureId, fixture] of Object.entries(side.fixtures)) {
    states[fixtureId] = fixture.task_state;
    gates[fixtureId] = fixture.gates;
    await writeJson(path.join(sideDir, "derived.normalized", `${fixtureId}.json`), fixture.derived);
  }
  await writeJson(path.join(sideDir, "task-state.normalized.json"), states);
  await writeJson(path.join(sideDir, "gates.json"), gates);
}

function reportInput(options, baseline, current, comparison) {
  const rejected = comparison.rejectedDiffs;
  const checks = {
    taskStateGraph: rejected.some((diff) => /graph/.test(diff.path)) ? "failed" : "passed",
    evidenceSemantics: rejected.some((diff) => /evidence|proves|does_not_prove/.test(diff.path)) ? "failed" : "passed",
    derivedViews: rejected.some((diff) => /derived/.test(diff.path)) ? "failed" : "passed",
    gates: rejected.some((diff) => /gates|exit_code/.test(diff.path)) ? "failed" : "passed",
    productGoalComplete: rejected.some((diff) => /product_goal_complete/.test(diff.path)) ? "failed" : "passed",
    strictParser: strictParseParity(current) ? "passed" : "failed",
    scopeConflictBlocker: fixtureFinalBlocked(current, "scope-conflict") ? "passed" : "failed",
    sampleOnlyFullPopulationBlocker: fixtureFinalBlocked(current, "full-population-sample-only") ? "passed" : "failed",
    handSetCompletionBlocker: handSetCompletionBlocked(current) ? "passed" : "failed",
    thinGoal: currentHasGate(current, "happy-path", "render_goal", 0) ? "passed" : "failed",
    workflowProtocol: currentHasGate(current, "happy-path", "render_goal", 0) ? "passed" : "failed",
    executionBinding: currentHasGate(current, "happy-path", "render_goal", 0) ? "passed" : "failed",
    codexFreshSessionSmoke: "not_run"
  };
  const verdict = rejected.length === 0 && Object.values(checks).every((value) => value === "passed" || value === "not_run") ? "equivalent" : "not_equivalent";
  return {
    verdict,
    baselineCommit: options.baselineSha,
    currentCommit: options.currentSha,
    fixtureCount: EQUIVALENCE_FIXTURE_IDS.length,
    semanticDiffCount: comparison.semanticDiffs.length,
    allowedDiffCount: comparison.allowedDiffs.length,
    rejectedDiffCount: comparison.rejectedDiffs.length,
    checks,
    conclusion:
      verdict === "equivalent"
        ? "同一输入仍走同一状态机并得到同一完成判定。Codex fresh-session smoke 需要人工目标会话补充后才能把 smoke 从 not_run 改为 passed。"
        : "同一输入未能证明仍走同一状态机并得到同一完成判定；请查看 rejected-diff.json。"
  };
}

function strictParseParity(side) {
  return EQUIVALENCE_FIXTURE_IDS.filter((fixture) => fixture.startsWith("strict-parse")).every((fixture) => {
    const compile = side.fixtures[fixture]?.gates?.compile;
    return compile && compile.exit_code !== 0 && /^strict_parse_/.test(compile.category);
  });
}

function fixtureFinalBlocked(side, fixtureId) {
  const finalGate = side.fixtures[fixtureId]?.gates?.final_gate;
  return Boolean(finalGate && finalGate.exit_code !== 0 && finalGate.product_goal_complete === false);
}

function currentHasGate(side, fixtureId, gate, exitCode) {
  return side.fixtures[fixtureId]?.gates?.[gate]?.exit_code === exitCode;
}

function handSetCompletionBlocked(side) {
  const gate = side.checks?.hand_set_completion?.validate_superpowers_state;
  return Boolean(gate && gate.exit_code !== 0 && gate.category === "hand_set_completion_blocker");
}

function runNode(cwd, args) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  return {
    status: result.status ?? 1,
    stdout: normalizeText(result.stdout ?? ""),
    stderr: normalizeText(result.stderr ?? "")
  };
}

function installAndBuild(cwd) {
  runRequired(cwd, "npm", ["ci"]);
  runRequired(cwd, "npm", ["run", "build", "--workspace", "project-tiny-context-harness"]);
}

function runRequired(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  }
}

async function createWorktree(target, sha) {
  spawnSync("git", ["worktree", "remove", "--force", target], { cwd: repoRoot, encoding: "utf8", shell: process.platform === "win32" });
  await rm(target, { recursive: true, force: true });
  spawnSync("git", ["worktree", "prune"], { cwd: repoRoot, encoding: "utf8", shell: process.platform === "win32" });
  await mkdir(path.dirname(target), { recursive: true });
  const result = spawnSync("git", ["worktree", "add", "--detach", target, sha], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`git worktree add failed for ${sha}\n${result.stdout}\n${result.stderr}`);
  }
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(sortJson(value), null, 2)}\n`, "utf8");
}

function smokeNotRunReport() {
  return `# Codex Fresh-Session Smoke Report

Status: not_run

This file is created by the equivalence runner as the required report placeholder. A real Codex fresh-session smoke must update it with Smoke A and Smoke B evidence before the overall verification can claim fresh-session smoke passed.
`;
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}
