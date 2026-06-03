import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  listScenarios,
  buildEvidenceCheck,
  cancelTimer,
  getObserverStatus,
  getTimerStatus,
  prepareRunDirectory,
  recordPrompt,
  recordEvent,
  recordGateFinding,
  recordIntervention,
  renderMarkdownReport,
  renderStagePrompt,
  runQualityProbe,
  scoreRun,
  scoreRecoveryAnswer,
  startObserver,
  startTimer,
  stopObserver,
  stopTimer
} from "../../examples/delivery-benchmark/runner/delivery_benchmark.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerPath = path.join(repoRoot, "examples", "delivery-benchmark", "runner", "delivery_benchmark.mjs");
const root = await mkdtemp(path.join(tmpdir(), "delivery-benchmark-"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathExists = async (filePath) => access(filePath).then(() => true).catch(() => false);
const lifecycleScenarios = ["project-context-recovery-lab", "support-triage-board", "webhook-provider-bridge"];
const pendingLifecycleScenarios = ["webhook-provider-bridge"];
async function readObservationEvents(runDir) {
  const text = await readFile(path.join(runDir, ".benchmark", "observations.ndjson"), "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function waitForObservation(runDir, predicate) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const observations = await readObservationEvents(runDir);
    if (observations.some(predicate)) {
      return observations;
    }
    await wait(50);
  }
  assert.fail("timed out waiting for observer event");
}

try {
  const scenarios = await listScenarios();
  assert.deepEqual(scenarios, [
    "expense-policy-engine",
    "project-context-recovery-lab",
    "support-triage-board",
    "webhook-provider-bridge"
  ]);

  const runDir = path.join(root, "expense-run");
  const prepared = await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "harness",
    outDir: runDir,
    force: true
  });
  assert.equal(prepared.scenario, "expense-policy-engine");
  assert.equal(prepared.mode, "harness");
  assert.equal(prepared.git.initialized, true);
  assert.equal(prepared.git.branch, "main");
  assert.equal(prepared.git.remote, ".benchmark/remote.git");
  const gitHead = await readFile(path.join(runDir, ".git", "HEAD"), "utf8");
  assert.match(gitHead, /refs\/heads\/main/);
  const gitConfig = await readFile(path.join(runDir, ".git", "config"), "utf8");
  assert.match(gitConfig, /remote "origin"/);
  assert.match(gitConfig, /\.benchmark\/remote\.git/);
  const gitIgnore = await readFile(path.join(runDir, ".gitignore"), "utf8");
  assert.match(gitIgnore, /\.benchmark\//);
  const prompt = await readFile(path.join(runDir, ".benchmark", "prompt.md"), "utf8");
  assert.match(prompt, /Harness Prompt/);
  assert.match(prompt, /Expense Policy Engine Requirements/);
  assert.match(prompt, /prepared fresh git repo/);
  assert.match(prompt, /Harness is already initialized and committed before the observer starts/);
  assert.match(prompt, /do not run `npx sdlc-harness init` inside the measured delivery window/);
  assert.match(prompt, /operator owns observer, timer, intervention and gate-value recording/i);
  assert.match(prompt, /Minimal Context Harness/);
  assert.match(prompt, /project_context\/global\.md/);
  assert.match(prompt, /Maintain context quality in `project_context\/\*\*`/);
  assert.match(prompt, /initial prompt intentionally includes only the base delivery contract/i);
  assert.match(prompt, /Do not create lifecycle phase state, `plan\.yaml`, PRD, UX, architecture, implementation docs/i);
  const initialPromptLedger = (await readFile(path.join(runDir, ".benchmark", "prompts.ndjson"), "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(initialPromptLedger.length, 1);
  assert.equal(initialPromptLedger[0].prompt_kind, "protocol_initial");
  assert.equal(initialPromptLedger[0].counts_as_protocol, true);
  assert.equal(initialPromptLedger[0].counts_as_intervention, false);
  assert.match(initialPromptLedger[0].prompt_sha256, /^[a-f0-9]{64}$/);
  const baselineRunDir = path.join(root, "baseline-prompt-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "baseline",
    outDir: baselineRunDir,
    force: true
  });
  const baselinePrompt = await readFile(path.join(baselineRunDir, ".benchmark", "prompt.md"), "utf8");
  assert.doesNotMatch(baselinePrompt, /\.benchmark\/transcript\.md/);
  assert.doesNotMatch(baselinePrompt, /operation log|self[- ]?log|操作日志/i);
  assert.match(baselinePrompt, /product delivery commit/);
  assert.match(baselinePrompt, /push `main` to the existing local `origin`/);
  assert.match(baselinePrompt, /Do not commit `.benchmark\/\*\*`/);
  assert.match(baselinePrompt, /do not continue to recovery\/RFC\/debug with an uncommitted product worktree/i);
  const harnessPromptShell = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "prompts", "harness.md"), "utf8");
  assert.match(harnessPromptShell, /stop and report `BLOCKED`/);
  assert.match(harnessPromptShell, /missing `project_context\/global\.md`/);
  assert.match(harnessPromptShell, /Harness does not replace product tests/);
  assert.doesNotMatch(harnessPromptShell, /--harness-folder codex/);
  assert.equal(await pathExists(path.join(runDir, ".codex")), true);
  assert.equal(await pathExists(path.join(runDir, "project_context", "global.md")), true);
  assert.equal(await pathExists(path.join(runDir, "AGENTS.md")), true);
  assert.equal(await pathExists(path.join(runDir, "Makefile")), true);

  const runbook = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "RUNBOOK.md"), "utf8");
  assert.match(runbook, /project-context-recovery-lab/);
  assert.match(runbook, /observer/i);
  assert.match(runbook, /Fresh-Agent Recovery/i);
  assert.match(runbook, /RFC/);
  assert.match(runbook, /Debug Fix/i);
  assert.match(runbook, /wrong-path/i);
  assert.match(runbook, /raw artifacts/i);
  assert.match(runbook, /do not\s+commit/i);
  assert.match(runbook, /\.benchmark\/prompt\.md/);
  assert.match(runbook, /INITIAL_DELIVERY/);
  assert.match(runbook, /hard stage boundary/i);
  assert.match(runbook, /must not run `npx sdlc-harness init`/);
  assert.match(runbook, /must not continue into\s+`REVIEWING`, `TESTING`, `RELEASING`/s);
  assert.match(runbook, /mark that path as calibration/i);
  assert.match(runbook, /RECOVERY/);
  assert.match(runbook, /DEBUG/);
  assert.match(runbook, /Gate Timing Protocol/);
  assert.match(runbook, /phase GATE/);
  assert.match(runbook, /gate:validate-dev/);
  assert.match(runbook, /package regression/i);
  assert.match(runbook, /high-signal/i);
  assert.match(runbook, /Formal Result Invalidation Rules/);
  assert.match(runbook, /protocol calibration only/);
  assert.match(runbook, /fresh independent agent\/thread/);
  assert.match(runbook, /independent local git repository/);
  assert.match(runbook, /\.benchmark\/remote\.git/);
  assert.match(runbook, /commit\/push protocol/);
  assert.match(runbook, /clean committed product state/i);
  assert.match(runbook, /product delivery commit and push/i);
  assert.match(runbook, /dirty worktree/i);
  assert.match(runbook, /uncommitted product\s+source\/docs\/test changes/s);
  assert.match(runbook, /operator records those\s+outside the measured prompt/);
  assert.match(runbook, /Staged Injection/i);
  assert.match(runbook, /stage-prompt/);
  assert.match(runbook, /future probe leakage|future materials|later materials/i);
  assert.match(runbook, /Metric Confidence/);
  assert.match(runbook, /hidden quality probe/i);
  assert.match(runbook, /recovery-score/);
  assert.match(runbook, /hidden answer key/i);
  assert.match(runbook, /intervention-record/);
  assert.match(runbook, /prompts\.ndjson/);
  assert.match(runbook, /prompt-record/);
  assert.match(runbook, /high-confidence hashes and character counts/i);
  assert.match(runbook, /gate-record/);
  assert.match(runbook, /Support Gate-Value Pilot Protocol/);
  assert.match(runbook, /first-pass score/i);
  assert.match(runbook, /repair loop/i);
  assert.match(runbook, /Pilot Calibration Ledger/);
  assert.match(runbook, /Stage boundary failures are protocol failures/);
  assert.match(runbook, /operator evidence must stay off the product git surface/i);
  assert.match(runbook, /Hidden quality probes are the primary quality evidence/i);
  assert.match(runbook, /Only high-confidence metrics are conclusion-grade/i);
  assert.match(runbook, /Artifact Inventory/);
  assert.match(runbook, /--run-type warm/);
  assert.match(runbook, /evidence-check/);
  assert.match(runbook, /--protocol-status formal/);
  assert.match(runbook, /cold bootstrap\/adoption/i);
  assert.match(runbook, /26\.9158 min.*48\.4984 min/s);
  assert.match(runbook, /GATE_THINNING_ANALYSIS\.md/);
  assert.match(runbook, /Standard Thin/);
  assert.match(runbook, /Measured Agent Environment Preflight/);
  assert.match(runbook, /\.codex\/\*\*/);
  assert.match(runbook, /\.git\/index\.lock/);
  assert.match(runbook, /codex\/\*\*/);
  assert.match(runbook, /2026-06-03 `webhook-provider-bridge` provider-safety pilot attempt/);
  assert.match(runbook, /calibration, not formal evidence/i);
  const benchmarkReadme = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "README.md"), "utf8");
  assert.match(benchmarkReadme, /Design Rationale/);
  assert.match(benchmarkReadme, /High-Signal, Not Hacked/);
  assert.match(benchmarkReadme, /not a\s+license to distort results/);
  assert.match(benchmarkReadme, /clean independent run/);
  assert.match(benchmarkReadme, /independent local git/);
  assert.match(benchmarkReadme, /\.benchmark\/remote\.git/);
  assert.match(benchmarkReadme, /clean committed product state/i);
  assert.match(benchmarkReadme, /one ordinary product delivery commit and push/i);
  assert.match(benchmarkReadme, /dirty product source\/docs\/tests/i);
  assert.match(benchmarkReadme, /operator owns observer, timer, intervention and gate-value/);
  assert.match(benchmarkReadme, /staged injection/i);
  assert.match(benchmarkReadme, /initial prompt is also a hard stage boundary/i);
  assert.match(benchmarkReadme, /does not authorize.*`REVIEWING`, `TESTING`,\s+`RELEASING`/s);
  assert.match(benchmarkReadme, /stage-prompt/);
  assert.match(benchmarkReadme, /ADR 008: Delivery Benchmark Scenario Design/);
  assert.match(benchmarkReadme, /same-quality delivery efficiency/);
  assert.match(benchmarkReadme, /Gate Profile and Fast Path/);
  assert.match(benchmarkReadme, /Gate Cost Breakdown/);
  assert.match(benchmarkReadme, /package checks/);
  assert.match(benchmarkReadme, /Metric confidence/);
  assert.match(benchmarkReadme, /quality-probe/);
  assert.match(benchmarkReadme, /recovery-score/);
  assert.match(benchmarkReadme, /static keyword\/path rubric/i);
  assert.match(benchmarkReadme, /complex-task automation capacity/i);
  assert.match(benchmarkReadme, /Automation Burden and Gate Value/);
  assert.match(benchmarkReadme, /intervention-record/);
  assert.match(benchmarkReadme, /prompts\.ndjson/);
  assert.match(benchmarkReadme, /prompt-record/);
  assert.match(benchmarkReadme, /does not by itself prove that no unrecorded operator prompt was\s+sent/s);
  assert.match(benchmarkReadme, /gate-record/);
  assert.match(benchmarkReadme, /support-triage-board/);
  assert.match(benchmarkReadme, /createWebhookBridge/);
  assert.match(benchmarkReadme, /independently computed HMAC signatures/);
  assert.match(benchmarkReadme, /calibration ledger/i);
  assert.match(benchmarkReadme, /repeated pilot experience becomes benchmark\s+protocol/i);
  assert.match(benchmarkReadme, /Only high-confidence metrics are conclusion-grade/);
  assert.match(benchmarkReadme, /Artifact Inventory/);
  assert.match(benchmarkReadme, /--run-type cold\|warm\|unknown/);
  assert.match(benchmarkReadme, /EVIDENCE_CHECKLIST\.md/);
  assert.match(benchmarkReadme, /evidence-check/);
  assert.match(benchmarkReadme, /26\.9158 min.*48\.4984 min/s);
  assert.match(benchmarkReadme, /GATE_THINNING_ANALYSIS\.md/);
  assert.match(benchmarkReadme, /adopted into the\s+common Harness guidance/s);
  assert.match(benchmarkReadme, /Standard Thin/);
  assert.match(benchmarkReadme, /sandbox blocks `.codex\/\*\*`/);
  assert.match(benchmarkReadme, /\.git\/index\.lock/);
  assert.match(benchmarkReadme, /fell back to `codex\/\*\*`/);
  const benchmarkResultsReadme = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "results", "README.md"), "utf8");
  assert.match(benchmarkResultsReadme, /webhook-provider-bridge.*calibration attempt/s);
  assert.match(benchmarkResultsReadme, /could not create `.codex\/\*\*` or write\s+`.git\/index\.lock`/s);
  assert.match(benchmarkResultsReadme, /product\s+source\/tests\/docs.*uncommitted/s);
  assert.match(benchmarkResultsReadme, /clean committed product state/i);
  assert.match(benchmarkResultsReadme, /pending.*sandbox blocker/s);
  const benchmarkProductDoc = await readFile(
    path.join(repoRoot, ".work_products", "01_product", "delivery_benchmark_evidence_model.md"),
    "utf8"
  );
  assert.match(benchmarkProductDoc, /Delivery Benchmark 是 AI SDLC Harness 自举项目的证据模块/);
  assert.match(benchmarkProductDoc, /examples\/delivery-benchmark/);
  assert.match(benchmarkProductDoc, /cold \/ warm run/);
  assert.match(benchmarkProductDoc, /artifact inventory/);
  assert.match(benchmarkProductDoc, /publishable evidence check/);
  assert.match(benchmarkProductDoc, /PRD-BENCH-014/);
  assert.match(benchmarkProductDoc, /PRD-BENCH-015/);
  assert.match(benchmarkProductDoc, /clean committed product state/);
  assert.match(benchmarkProductDoc, /\.codex.*\.git\/index\.lock/s);
  assert.match(benchmarkProductDoc, /不能单独证明有用/);
  const benchmarkTechPlan = await readFile(
    path.join(repoRoot, ".work_products", "03_tech_plan", "delivery_benchmark_evidence_model.md"),
    "utf8"
  );
  assert.match(benchmarkTechPlan, /Runnable module: `examples\/delivery-benchmark\/\*\*`/);
  assert.match(benchmarkTechPlan, /Artifact Inventory/);
  assert.match(benchmarkTechPlan, /artifact_inventory\.categories\.managed_runtime\.files\/lines/);
  assert.match(benchmarkTechPlan, /Run 类型/);
  assert.match(benchmarkTechPlan, /prompt_ledger/);
  assert.match(benchmarkTechPlan, /不能单独证明没有未记录的人为提示/);
  assert.match(benchmarkTechPlan, /Provider Safety/);
  assert.match(benchmarkTechPlan, /hidden probe 独立计算签名/);
  assert.match(benchmarkTechPlan, /Measured-Agent Environment Preflight/);
  assert.match(benchmarkTechPlan, /Clean Committed Handoff Boundary/);
  assert.match(benchmarkTechPlan, /product delivery commit/);
  assert.match(benchmarkTechPlan, /\.codex\/\*\*/);
  assert.match(benchmarkTechPlan, /\.git\/index\.lock/);
  assert.match(benchmarkTechPlan, /evidence-check/);
  const benchmarkImplementationDoc = await readFile(
    path.join(repoRoot, ".work_products", "04_implementation", "delivery_benchmark", "evidence_model_and_runner.md"),
    "utf8"
  );
  assert.match(benchmarkImplementationDoc, /Runnable implementation: `examples\/delivery-benchmark\/\*\*`/);
  assert.match(benchmarkImplementationDoc, /artifact_inventory/);
  assert.match(benchmarkImplementationDoc, /managed_runtime/);
  assert.match(benchmarkImplementationDoc, /prompt-record/);
  assert.match(benchmarkImplementationDoc, /automation_burden\.prompt_ledger/);
  assert.match(benchmarkImplementationDoc, /webhook-provider-bridge\/quality_probe\.mjs/);
  assert.match(benchmarkImplementationDoc, /invalid signature rejection/);
  assert.match(benchmarkImplementationDoc, /2026-06-03 `webhook-provider-bridge` pilot attempt/);
  assert.match(benchmarkImplementationDoc, /blocked `.codex\/\*\*` creation and `.git\/index\.lock` writes/);
  assert.match(benchmarkImplementationDoc, /Baseline must also create a clean product delivery commit/);
  assert.match(benchmarkImplementationDoc, /dirty worktree instead of a stable delivered repository state/);
  assert.match(benchmarkImplementationDoc, /alternative term\/reference groups/);
  assert.match(benchmarkImplementationDoc, /evidence-check/);
  const evidenceChecklist = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "EVIDENCE_CHECKLIST.md"), "utf8");
  assert.match(evidenceChecklist, /Design Purpose Under Test/);
  assert.match(evidenceChecklist, /Publishable Pair Checklist/);
  assert.match(evidenceChecklist, /same hidden product quality/i);
  assert.match(evidenceChecklist, /evidence-check/);
  assert.match(evidenceChecklist, /negative_elapsed_signal/);
  assert.match(evidenceChecklist, /prompts\.ndjson/);
  assert.match(evidenceChecklist, /missing intervention record is never\s+evidence of zero intervention burden/s);
  assert.match(evidenceChecklist, /What Not To Do/);
  const gateThinningAnalysis = await readFile(
    path.join(repoRoot, "examples", "delivery-benchmark", "GATE_THINNING_ANALYSIS.md"),
    "utf8"
  );
  assert.match(gateThinningAnalysis, /Status: Recommendation adopted into common Harness guidance/);
  assert.match(gateThinningAnalysis, /Current Conclusion/);
  assert.match(gateThinningAnalysis, /Recommended Gate Thickness/);
  assert.match(gateThinningAnalysis, /Recommended thickness|推荐厚度|Standard Thin/);
  assert.match(gateThinningAnalysis, /48\.4984 min.*26\.9158 min/s);
  assert.match(gateThinningAnalysis, /Evidence Boundary/);
  assert.match(gateThinningAnalysis, /Gate Decision Matrix/);
  assert.match(gateThinningAnalysis, /Orientation gate/);
  assert.match(gateThinningAnalysis, /Product \/ domain gate/);
  assert.match(gateThinningAnalysis, /Workflow state gate/);
  assert.match(gateThinningAnalysis, /Handoff \/ recovery gate/);
  assert.match(gateThinningAnalysis, /Phase \/ release gate/);
  assert.match(gateThinningAnalysis, /Package\/source\/full regression/);
  assert.match(gateThinningAnalysis, /收益/);
  assert.match(gateThinningAnalysis, /风险 \/ 损失/);
  assert.match(gateThinningAnalysis, /最高性价比/);
  assert.match(gateThinningAnalysis, /focused product gates/);
  assert.match(gateThinningAnalysis, /task completion \/ pre-commit \/ phase transition \/ release \/ package-source/);
  assert.match(gateThinningAnalysis, /不应该打到只剩产品测试/);
  assert.match(gateThinningAnalysis, /Option A: Benchmark Thin Profile/);
  assert.match(gateThinningAnalysis, /Option B: Conditional Gates/);
  assert.match(gateThinningAnalysis, /Option C: Strict Only At Boundaries/);
  assert.match(gateThinningAnalysis, /Option D: Keep Current Thickness/);
  assert.match(gateThinningAnalysis, /已被采纳为通用 Harness 默认 gate 厚度/);
  assert.match(gateThinningAnalysis, /workflow 已采用 `Standard Thin` profile/);
  const benchmarkDesignAdr = await readFile(
    path.join(repoRoot, ".work_products", "05_decisions", "ADR_008_delivery_benchmark_scenario_design.md"),
    "utf8"
  );
  assert.match(benchmarkDesignAdr, /same-quality/);
  assert.match(benchmarkDesignAdr, /lifecycle/);
  assert.match(benchmarkDesignAdr, /fresh-agent recovery/);
  assert.match(benchmarkDesignAdr, /RFC/);
  assert.match(benchmarkDesignAdr, /debug/);
  assert.match(benchmarkDesignAdr, /project-context-recovery-lab/);
  assert.match(benchmarkDesignAdr, /support-triage-board/);
  assert.match(benchmarkDesignAdr, /webhook-provider-bridge/);
  assert.match(benchmarkDesignAdr, /gate_profile\.md/);
  assert.match(benchmarkDesignAdr, /out-of-scope package regression/);
  assert.match(benchmarkDesignAdr, /high-signal/);
  assert.match(benchmarkDesignAdr, /不是 hack 结果/);
  assert.match(benchmarkDesignAdr, /不能.*选择性发布有利数字/);
  assert.match(benchmarkDesignAdr, /staged injection/i);
  assert.match(benchmarkDesignAdr, /不能.*提前.*暴露/);
  assert.match(benchmarkDesignAdr, /独立 git repo/);
  assert.match(benchmarkDesignAdr, /commit\/push/);
  assert.match(benchmarkDesignAdr, /clean committed handoff boundary/);
  assert.match(benchmarkDesignAdr, /普通 product delivery commit/);
  assert.match(benchmarkDesignAdr, /dirty worktree 草稿/);
  assert.match(benchmarkDesignAdr, /observer\/timer\/gate-value.*operator/);
  assert.match(benchmarkDesignAdr, /置信度/);
  assert.match(benchmarkDesignAdr, /`INITIAL_DELIVERY` 也是硬阶段边界/);
  assert.match(benchmarkDesignAdr, /不能继续进入 `REVIEWING`、`TESTING`、`RELEASING`/);
  assert.match(benchmarkDesignAdr, /hidden quality probe/);
  assert.match(benchmarkDesignAdr, /recovery_answer_key\.json/);
  assert.match(benchmarkDesignAdr, /可持续自动化交付能力/);
  assert.match(benchmarkDesignAdr, /intervention-record/);
  assert.match(benchmarkDesignAdr, /gate-record/);
  assert.match(benchmarkDesignAdr, /Gate 是可证伪成本假设/);
  assert.match(benchmarkDesignAdr, /conclusion-grade/);
  assert.match(benchmarkDesignAdr, /26\.9158 min.*48\.4984 min/s);
  assert.match(benchmarkDesignAdr, /gate 打薄评估/);
  assert.match(benchmarkDesignAdr, /收益与损失/);
  assert.match(benchmarkDesignAdr, /Standard Thin/);
  assert.match(benchmarkDesignAdr, /性价比最高/);
  assert.match(benchmarkDesignAdr, /calibration ledger/);
  assert.match(benchmarkDesignAdr, /operator artifact 污染 git surface/);
  assert.match(benchmarkDesignAdr, /publishable \/ calibration \/ blocker/);
  assert.match(benchmarkDesignAdr, /measured-agent sandbox/);
  assert.match(benchmarkDesignAdr, /\.codex\/\*\*.*\.git\/index\.lock/s);

  for (const scenarioId of lifecycleScenarios) {
    const lifecycleProbe = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "lifecycle_probe.md"),
      "utf8"
    );
    assert.match(lifecycleProbe, /INITIAL_DELIVERY/);
    assert.match(lifecycleProbe, /RECOVERY/);
    assert.match(lifecycleProbe, /RFC/);
    assert.match(lifecycleProbe, /DEBUG/);
    assert.match(lifecycleProbe, /Wrong-Path Count/);
    const recoveryCheckpoint = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "recovery_checkpoint.md"),
      "utf8"
    );
    const rfcChange = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "rfc_change.md"),
      "utf8"
    );
    const debugFix = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "debug_fix.md"),
      "utf8"
    );
    assert.match(recoveryCheckpoint, /fresh agent|fresh Agent|fresh-agent/i);
    assert.match(recoveryCheckpoint, /takeover memo|Takeover/i);
    assert.match(recoveryCheckpoint, /hidden answer key/i);
    assert.ok(
      await readFile(
        path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "recovery_answer_key.json"),
        "utf8"
      )
    );
    assert.ok(
      await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "quality_probe.mjs"), "utf8")
    );
    assert.match(rfcChange, /RFC 1/);
    assert.match(rfcChange, /RFC 2/);
    assert.doesNotMatch(rfcChange, /^## Debug Fix/m);
    assert.match(debugFix, /Debug Fix/);
    assert.match(debugFix, /regression coverage|regression/i);
    if (scenarioId === "webhook-provider-bridge") {
      const webhookRequirements = await readFile(
        path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "requirements.md"),
        "utf8"
      );
      assert.match(webhookRequirements, /createWebhookBridge/);
      assert.match(webhookRequirements, /receiveWebhook/);
      assert.match(webhookRequirements, /getEvidenceBoundary/);
      assert.match(webhookRequirements, /\$\{timestamp\}\.\$\{rawBody\}/);
      assert.match(rfcChange, /\$\{tenantId\}\.\$\{eventId\}\.\$\{eventType\}\.\$\{createdAt\}\.\$\{rawBody\}/);
    }
    const gateProfile = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "gate_profile.md"),
      "utf8"
    );
    assert.match(gateProfile, /Orientation/);
    assert.match(gateProfile, /Domain Focused Gates/);
    assert.match(gateProfile, /Harness Task Gates/);
    assert.match(gateProfile, /Phase Exit Gates/);
    assert.match(gateProfile, /Out-of-Scope Gates/);
    assert.match(gateProfile, /Baseline mode does not run Harness validators/);
    assert.match(gateProfile, /phase GATE/);
    const rubric = JSON.parse(
      await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "rubric.json"), "utf8")
    );
    assert.ok(rubric.sections.acceptance?.length > 0);
    assert.ok(rubric.sections.context_recovery?.length > 0);
    assert.ok(rubric.sections.rfc_debug?.length > 0);
    assert.ok(rubric.sections.handoff?.length > 0);
  }

  const lifecycleRunDir = path.join(root, "context-recovery-run");
  await prepareRunDirectory({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    outDir: lifecycleRunDir,
    force: true
  });
  const lifecyclePrompt = await readFile(path.join(lifecycleRunDir, ".benchmark", "prompt.md"), "utf8");
  const lifecycleScenarioBundle = await readFile(path.join(lifecycleRunDir, ".benchmark", "scenario.md"), "utf8");
  assert.match(lifecyclePrompt, /Gate Profile/);
  assert.match(lifecycleScenarioBundle, /Gate Profile/);
  assert.match(lifecyclePrompt, /Domain Focused Gates/);
  assert.match(lifecyclePrompt, /base delivery contract/);
  assert.doesNotMatch(lifecyclePrompt, /Fresh-Agent Recovery Probe/);
  assert.doesNotMatch(lifecyclePrompt, /RFC Cascade/);
  assert.doesNotMatch(lifecyclePrompt, /Debug Fix/);
  assert.doesNotMatch(lifecyclePrompt, /Wrong-Path Count/);
  assert.doesNotMatch(lifecyclePrompt, /recovery_answer_key/);
  assert.doesNotMatch(lifecyclePrompt, /hidden quality probe/i);
  assert.doesNotMatch(lifecyclePrompt, /impactLevel/);
  assert.doesNotMatch(lifecyclePrompt, /provider\.incident\.opened/);
  assert.doesNotMatch(lifecycleScenarioBundle, /Fresh-Agent Recovery Probe/);
  assert.doesNotMatch(lifecycleScenarioBundle, /RFC Cascade/);
  assert.doesNotMatch(lifecycleScenarioBundle, /Debug Fix/);
  assert.doesNotMatch(lifecycleScenarioBundle, /recovery_answer_key/);
  assert.doesNotMatch(lifecycleScenarioBundle, /hidden quality probe/i);
  const baselineLifecycleRunDir = path.join(root, "context-recovery-baseline-run");
  await prepareRunDirectory({
    scenario: "project-context-recovery-lab",
    mode: "baseline",
    outDir: baselineLifecycleRunDir,
    force: true
  });
  const baselineLifecyclePrompt = await readFile(path.join(baselineLifecycleRunDir, ".benchmark", "prompt.md"), "utf8");
  assert.match(baselineLifecyclePrompt, /Gate Profile/);
  assert.match(baselineLifecyclePrompt, /Baseline mode does not run Harness validators/);
  assert.doesNotMatch(baselineLifecyclePrompt, /must run .*validate-/i);
  const recoveryStagePrompt = await renderStagePrompt({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    stage: "recovery"
  });
  assert.match(recoveryStagePrompt, /Stage: RECOVERY/);
  assert.match(recoveryStagePrompt, /Incident Ops Console Fresh-Agent Takeover Task/);
  assert.match(recoveryStagePrompt, /next safe action/i);
  assert.match(recoveryStagePrompt, /\.benchmark\/takeover-answer\.md/);
  assert.doesNotMatch(recoveryStagePrompt, /RFC 1/);
  assert.doesNotMatch(recoveryStagePrompt, /Debug Fix/);
  assert.doesNotMatch(recoveryStagePrompt, /Wrong-Path Count/);
  assert.doesNotMatch(recoveryStagePrompt, /recovery_answer_key/);
  const recoveryStageCli = spawnSync(
    process.execPath,
    [
      runnerPath,
      "stage-prompt",
      "--scenario",
      "project-context-recovery-lab",
      "--mode",
      "harness",
      "--stage",
      "recovery",
      "--run-dir",
      lifecycleRunDir
    ],
    { encoding: "utf8" }
  );
  assert.equal(recoveryStageCli.status, 0, recoveryStageCli.stderr);
  assert.match(recoveryStageCli.stdout, /Stage: RECOVERY/);
  const lifecyclePromptLedger = (await readFile(path.join(lifecycleRunDir, ".benchmark", "prompts.ndjson"), "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(lifecyclePromptLedger.length, 2);
  assert.deepEqual(
    lifecyclePromptLedger.map((record) => record.prompt_kind),
    ["protocol_initial", "protocol_stage"]
  );
  const rfcStagePrompt = await renderStagePrompt({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    stage: "rfc"
  });
  assert.match(rfcStagePrompt, /Stage: RFC/);
  assert.match(rfcStagePrompt, /Incident Ops Console RFC Cascade/);
  assert.match(rfcStagePrompt, /impactLevel/);
  assert.match(rfcStagePrompt, /provider\.incident\.opened/);
  assert.match(
    await renderStagePrompt({ scenario: "webhook-provider-bridge", mode: "baseline", stage: "rfc" }),
    /normal product commit and push `main` to the existing local `origin`/
  );
  assert.doesNotMatch(rfcStagePrompt, /^## Debug Fix/m);
  const debugStagePrompt = await renderStagePrompt({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    stage: "debug"
  });
  assert.match(debugStagePrompt, /Stage: DEBUG/);
  assert.match(debugStagePrompt, /Incident Ops Console Debug Fix/);
  assert.match(debugStagePrompt, /old provider event names/);
  assert.match(debugStagePrompt, /normal Harness task commit\/push protocol/);
  const noInterventionLifecycleReport = await scoreRun({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    runDir: lifecycleRunDir
  });
  assert.equal(noInterventionLifecycleReport.automation_burden.intervention_count, 0);
  assert.equal(noInterventionLifecycleReport.automation_burden.operator_prompt_chars, 0);
  assert.equal(noInterventionLifecycleReport.automation_burden.prompt_ledger.protocol_prompt_count, 2);
  assert.ok(noInterventionLifecycleReport.automation_burden.protocol_prompt_chars > 0);
  assert.equal(noInterventionLifecycleReport.metric_confidence.prompt_ledger.level, "high");
  assert.equal(noInterventionLifecycleReport.metric_confidence.human_intervention.level, "unavailable");
  assert.equal(noInterventionLifecycleReport.gate_value.defects_caught, 0);
  for (const scenarioId of ["support-triage-board", "webhook-provider-bridge"]) {
    const promptRunDir = path.join(root, `${scenarioId}-prompt-run`);
    await prepareRunDirectory({
      scenario: scenarioId,
      mode: "harness",
      outDir: promptRunDir,
      force: true
    });
    const scenarioPrompt = await readFile(path.join(promptRunDir, ".benchmark", "prompt.md"), "utf8");
    assert.match(scenarioPrompt, /Gate Profile/);
    assert.doesNotMatch(scenarioPrompt, /Lifecycle Probe/);
    assert.doesNotMatch(scenarioPrompt, /Fresh-Agent Recovery Probe/);
    assert.doesNotMatch(scenarioPrompt, /RFC Cascade/);
    assert.doesNotMatch(scenarioPrompt, /Debug Fix/);
    assert.doesNotMatch(scenarioPrompt, /Wrong-Path Count/);
    assert.match(await renderStagePrompt({ scenario: scenarioId, mode: "harness", stage: "recovery" }), /Stage: RECOVERY/);
    assert.match(await renderStagePrompt({ scenario: scenarioId, mode: "harness", stage: "rfc" }), /Stage: RFC/);
    assert.match(await renderStagePrompt({ scenario: scenarioId, mode: "harness", stage: "debug" }), /Stage: DEBUG/);
  }

  const webhookProbeRunDir = path.join(root, "webhook-probe-run");
  await prepareRunDirectory({
    scenario: "webhook-provider-bridge",
    mode: "baseline",
    outDir: webhookProbeRunDir,
    force: true
  });
  await mkdir(path.join(webhookProbeRunDir, "src"), { recursive: true });
  await mkdir(path.join(webhookProbeRunDir, "test"), { recursive: true });
  await writeFile(
    path.join(webhookProbeRunDir, "src", "webhookBridge.js"),
    [
      "import { createHmac } from 'node:crypto';",
      "const DEFAULT_NOW = '2026-06-01T12:00:00.000Z';",
      "const DEFAULT_TENANTS = { tenant_a: { activeSecret: 'whsec_test_primary', previousSecret: 'whsec_test_previous', previousSecretExpiresAt: '2026-06-01T12:05:00.000Z' }, tenant_b: { activeSecret: 'whsec_test_tenant_b' } };",
      "function hmac(secret, payload) { return createHmac('sha256', secret).update(payload).digest('hex'); }",
      "function asMs(value) { return typeof value === 'number' ? value : Date.parse(value); }",
      "function reject(errorCode, detail) { return { accepted: false, rejected: true, errorCode, detail }; }",
      "export function createWebhookBridge(options = {}) {",
      "  const nowMs = asMs(options.now || DEFAULT_NOW);",
      "  const tenants = options.tenants || DEFAULT_TENANTS;",
      "  const retryLimit = options.retryLimit ?? 2;",
      "  const seen = new Set();",
      "  const queue = [];",
      "  const dlq = [];",
      "  const audit = [];",
      "  function tenantFor(id) { return tenants[id] || {}; }",
      "  function verify(req) {",
      "    if (!req.eventId || !req.eventType || !req.createdAt) return { ok: false, errorCode: 'LEGACY_V1_SCHEMA_REJECTED' };",
      "    const tenant = tenantFor(req.tenantId);",
      "    const payload = `${req.tenantId}.${req.eventId}.${req.eventType}.${req.createdAt}.${req.rawBody}`;",
      "    if (tenant.activeSecret && hmac(tenant.activeSecret, payload) === req.signature) return { ok: true, source: 'active' };",
      "    if (tenant.previousSecret && nowMs <= asMs(tenant.previousSecretExpiresAt) && hmac(tenant.previousSecret, payload) === req.signature) return { ok: true, source: 'previous' };",
      "    if (tenant.previousSecret && hmac(tenant.previousSecret, payload) === req.signature) return { ok: false, errorCode: 'EXPIRED_PREVIOUS_SECRET' };",
      "    return { ok: false, errorCode: 'INVALID_SIGNATURE' };",
      "  }",
      "  return {",
      "    receiveWebhook(req) {",
      "      const verified = verify(req);",
      "      if (!verified.ok) return reject(verified.errorCode, 'signature or schema rejected');",
      "      if (Math.abs(nowMs - asMs(req.timestamp || req.createdAt)) > 5 * 60 * 1000) return reject('STALE_TIMESTAMP', 'timestamp freshness failed');",
      "      const replayKey = `${req.tenantId}:${req.eventId}`;",
      "      if (seen.has(replayKey)) return { accepted: false, rejected: true, duplicate: true, errorCode: 'REPLAY_EVENT', replayKey };",
      "      seen.add(replayKey);",
      "      const job = { id: req.eventId, tenantId: req.tenantId, normalizedEvent: req.eventType.replace(/^provider[.:]/, '').replace(/\\./g, '_'), attempts: 0 };",
      "      queue.push(job);",
      "      audit.push({ event: 'queued', replayKey, normalizedEvent: job.normalizedEvent, evidenceLevel: 'local_mock' });",
      "      return { accepted: true, queued: true, normalizedEvent: job.normalizedEvent, queue: queue.map((item) => item.id), evidenceLevel: 'local_mock' };",
      "    },",
      "    processNextDelivery({ fail = false } = {}) {",
      "      const job = queue.shift();",
      "      if (!job) return { ok: true, queue: [], dlq };",
      "      if (!fail) { audit.push({ event: 'delivered', id: job.id }); return { accepted: true, delivered: true, id: job.id }; }",
      "      job.attempts += 1;",
      "      if (job.attempts > retryLimit) { dlq.push(job); audit.push({ event: 'dead-letter', id: job.id }); return { accepted: false, dlq: true, deadLetter: dlq.map((item) => item.id) }; }",
      "      queue.unshift(job);",
      "      audit.push({ event: 'retry', id: job.id, attempts: job.attempts, backoff: 'bounded' });",
      "      return { accepted: false, retry: true, boundedBackoff: true, attempts: job.attempts };",
      "    },",
      "    getStatus() { return { health: 'ok', queue: queue.map((item) => item.id), dlq: dlq.map((item) => item.id), replayProtected: Array.from(seen), audit }; },",
      "    runMockProviderSmoke() { return { passed: true, evidenceLevel: 'mock_provider_smoke', mock: true, local: true, usedLiveCredentials: false, status: { audit: [{ errorCode: 'PREVIOUS_NEGATIVE_CHECK', replay: true }] }, live: 'blocked' }; },",
      "    getEvidenceBoundary() { return { local: 'npm test and mock provider smoke', mock: 'deterministic fixture', live: 'BLOCKED without WEBHOOK_PROVIDER_TOKEN credential', doNotRetry: 'do-not-retry live credential guesses', nextSafeAction: 'run npm test and mock smoke' }; }",
      "  };",
      "}"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(webhookProbeRunDir, "test", "webhookBridge.test.js"),
    "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('webhook bridge fixture is present', () => assert.equal(1, 1));\n",
    "utf8"
  );
  await writeFile(
    path.join(webhookProbeRunDir, "README.md"),
    [
      "# Webhook Provider Safety Bridge",
      "Use `src/webhookBridge.js#createWebhookBridge()` for deterministic local smoke.",
      "Local/mock evidence comes from npm test and deterministic mock provider smoke.",
      "Live evidence is BLOCKED without named credential WEBHOOK_PROVIDER_TOKEN.",
      "Do-not-retry live credential guesses. Next safe action: run npm test and mock smoke."
    ].join("\n"),
    "utf8"
  );
  const webhookProbe = await runQualityProbe({
    scenario: "webhook-provider-bridge",
    runDir: webhookProbeRunDir,
    stage: "final",
    out: path.join(webhookProbeRunDir, ".benchmark", "quality-probe.json")
  });
  assert.equal(webhookProbe.available, true);
  assert.equal(webhookProbe.confidence, "high");
  assert.equal(webhookProbe.decision, "PASS", JSON.stringify(webhookProbe.checks.filter((check) => !check.passed), null, 2));
  assert.ok(webhookProbe.checks.some((check) => check.id === "QP-WEBHOOK-016"));
  assert.ok(webhookProbe.checks.some((check) => check.id === "QP-WEBHOOK-017"));
  assert.ok(webhookProbe.checks.some((check) => check.id === "QP-WEBHOOK-018"));
  await mkdir(path.join(webhookProbeRunDir, ".work_products", "04_implementation"), { recursive: true });
  await writeFile(
    path.join(webhookProbeRunDir, ".work_products", "04_implementation", "webhook_bridge.md"),
    "receiver, mock/live evidence boundary, do-not-retry credential blocker, HMAC timestamp replay idempotency and DLQ facts live here.",
    "utf8"
  );
  await writeFile(
    path.join(webhookProbeRunDir, "takeover-answer.md"),
    [
      "The receiver is `src/webhookBridge.js#createWebhookBridge().receiveWebhook`; fixture and npm test entrypoints are visible from package.json and `.work_products/04_implementation/webhook_bridge.md`.",
      "The mock/live evidence boundary is recorded in `.work_products/04_implementation/webhook_bridge.md`: local evidence uses mock fixtures, live evidence needs credentials.",
      "Credential access is blocked; do-not-retry and do not guess provider secrets, as noted in `.work_products/04_implementation/webhook_bridge.md`.",
      "Safeguards include signature/HMAC validation, timestamp freshness, replay and duplicate protection, idempotency, and DLQ/dead-letter handling in `.work_products/04_implementation/webhook_bridge.md`."
    ].join("\n"),
    "utf8"
  );
  const webhookRecoveryScore = await scoreRecoveryAnswer({
    scenario: "webhook-provider-bridge",
    runDir: webhookProbeRunDir,
    answer: path.join(webhookProbeRunDir, "takeover-answer.md"),
    out: path.join(webhookProbeRunDir, ".benchmark", "recovery-score.json")
  });
  assert.equal(webhookRecoveryScore.decision, "PASS", JSON.stringify(webhookRecoveryScore.items, null, 2));
  assert.equal(webhookRecoveryScore.passed, webhookRecoveryScore.total);

  const timerRunDir = path.join(root, "timer-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "harness",
    outDir: timerRunDir,
    force: true
  });
  const started = await startTimer({
    runDir: timerRunDir,
    event: "workflow_orientation",
    kind: "workflow_control",
    phase: "REQUIREMENT_GATHERING",
    notes: "read scenario and workflow prompt"
  });
  assert.equal(started.active, true);
  assert.equal(started.timing_source, "system_timer");
  assert.ok(Number.isFinite(started.started_at_epoch_ms));
  const activeStatus = await getTimerStatus({ runDir: timerRunDir });
  assert.equal(activeStatus.active, true);
  assert.equal(activeStatus.event, "workflow_orientation");
  await new Promise((resolve) => setTimeout(resolve, 20));
  const stopped = await stopTimer({ runDir: timerRunDir, notes: "orientation complete" });
  assert.equal(stopped.active, false);
  assert.equal(stopped.event.timing_source, "system_timer");
  assert.equal(stopped.event.timing_confidence, "system_timed_manual_boundary");
  assert.ok(stopped.event.duration_ms >= 0);
  assert.ok(stopped.event.minutes >= 0);
  assert.ok(stopped.event.started_at);
  assert.ok(stopped.event.ended_at);
  assert.match(stopped.event.notes, /orientation complete/);
  const inactiveStatus = await getTimerStatus({ runDir: timerRunDir });
  assert.equal(inactiveStatus.active, false);
  const timedReport = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "harness",
    runDir: timerRunDir
  });
  assert.equal(timedReport.workflow_cost.cost_data_source, "system_timed_manual_boundary");
  assert.equal(timedReport.workflow_cost.comparison_confidence, "medium");
  assert.equal(timedReport.workflow_cost.timing_sources.system_timer, 1);

  const observerRunDir = path.join(root, "observer-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "baseline",
    outDir: observerRunDir,
    force: true
  });
  const observer = await startObserver({ runDir: observerRunDir, intervalMs: 25 });
  assert.equal(observer.active, true);
  assert.equal(observer.data_source, "observer_measured");
  await waitForObservation(observerRunDir, (observation) => observation.event === "observer_start");
  await writeFile(path.join(observerRunDir, "src", "observed.js"), "export const observed = 1;\n", "utf8");
  await waitForObservation(
    observerRunDir,
    (observation) => observation.event === "file_added" && observation.path === "src/observed.js"
  );
  await writeFile(path.join(observerRunDir, "src", "observed.js"), "export const observed = 2;\n", "utf8");
  await waitForObservation(
    observerRunDir,
    (observation) => observation.event === "file_modified" && observation.path === "src/observed.js"
  );
  await rm(path.join(observerRunDir, "src", "observed.js"));
  await waitForObservation(
    observerRunDir,
    (observation) => observation.event === "file_deleted" && observation.path === "src/observed.js"
  );
  const stoppedObserver = await stopObserver({ runDir: observerRunDir });
  assert.equal(stoppedObserver.stopped, true);
  assert.equal(stoppedObserver.active, false);
  const observerStatus = await getObserverStatus({ runDir: observerRunDir });
  assert.equal(observerStatus.active, false);
  assert.ok(observerStatus.observation_count >= 4);
  const observations = await readObservationEvents(observerRunDir);
  assert.ok(observations.every((observation) => observation.data_source === "observer_measured"));
  assert.ok(observations.some((observation) => observation.event === "observer_start"));
  assert.ok(observations.some((observation) => observation.event === "file_added" && observation.path === "src/observed.js"));
  assert.ok(observations.some((observation) => observation.event === "file_modified" && observation.path === "src/observed.js"));
  assert.ok(observations.some((observation) => observation.event === "file_deleted" && observation.path === "src/observed.js"));
  assert.ok(observations.some((observation) => observation.event === "observer_stop" && observation.duration_ms >= 0));
  const observerReport = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "baseline",
    runDir: observerRunDir
  });
  assert.equal(observerReport.workflow_cost.cost_data_source, "observer_measured");
  assert.equal(observerReport.workflow_cost.comparison_confidence, "high");
  assert.equal(observerReport.workflow_cost.timing_sources.observer_measured, 1);
  assert.ok(observerReport.workflow_cost.observed_total_delivery_minutes >= 0);
  assert.equal(observerReport.workflow_cost.file_activity_summary.touched_files, 1);

  const multiObserverRunDir = path.join(root, "multi-observer-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "baseline",
    outDir: multiObserverRunDir,
    force: true
  });
  await writeFile(
    path.join(multiObserverRunDir, ".benchmark", "observations.ndjson"),
    [
      {
        at: new Date().toISOString(),
        event: "observer_start",
        path: null,
        data_source: "observer_measured"
      },
      {
        at: new Date().toISOString(),
        event: "file_added",
        path: "src/first.js",
        size: 1,
        mtime_ms: 1,
        sha256: "first",
        data_source: "observer_measured"
      },
      {
        at: new Date().toISOString(),
        event: "observer_stop",
        path: null,
        duration_ms: 60000,
        data_source: "observer_measured"
      },
      {
        at: new Date().toISOString(),
        event: "observer_start",
        path: null,
        data_source: "observer_measured"
      },
      {
        at: new Date().toISOString(),
        event: "file_modified",
        path: "src/second.js",
        size: 2,
        mtime_ms: 2,
        sha256: "second",
        data_source: "observer_measured"
      },
      {
        at: new Date().toISOString(),
        event: "observer_stop",
        path: null,
        duration_ms: 30000,
        data_source: "observer_measured"
      }
    ].map((observation) => JSON.stringify(observation)).join("\n") + "\n",
    "utf8"
  );
  const multiObserverReport = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "baseline",
    runDir: multiObserverRunDir
  });
  assert.equal(multiObserverReport.workflow_cost.observed_total_delivery_minutes, 1.5);
  assert.equal(multiObserverReport.workflow_cost.file_activity_summary.touched_files, 2);

  const observerOnlyEvidenceRunDir = path.join(root, "observer-evidence-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "baseline",
    outDir: observerOnlyEvidenceRunDir,
    force: true
  });
  await writeFile(
    path.join(observerOnlyEvidenceRunDir, ".benchmark", "observations.ndjson"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      event: "file_added",
      path: "src/fake.js",
      size: 1,
      mtime_ms: 1,
      sha256: "APPROVED auditTrail MEAL_LIMIT_EXCEEDED MISSING_RECEIPT WEEKEND_TRAVEL_REVIEW INVALID_INPUT jurisdiction deprecated alias PASS",
      data_source: "observer_measured"
    })}\n`,
    "utf8"
  );
  const observerOnlyEvidenceReport = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "baseline",
    runDir: observerOnlyEvidenceRunDir
  });
  assert.equal(observerOnlyEvidenceReport.summary.decision, "WARN");

  const cancelRunDir = path.join(root, "cancel-run");
  await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "baseline",
    outDir: cancelRunDir,
    force: true
  });
  await startTimer({
    runDir: cancelRunDir,
    event: "scratch",
    kind: "coding",
    phase: "SPRINTING"
  });
  const cancelled = await cancelTimer({ runDir: cancelRunDir });
  assert.equal(cancelled.cancelled, true);
  assert.equal((await getTimerStatus({ runDir: cancelRunDir })).active, false);

  await recordEvent({
    runDir,
    event: "sync",
    kind: "workflow_control",
    phase: "REQUIREMENT_GATHERING",
    minutes: 3,
    notes: "sync overhead"
  });
  await recordEvent({
    runDir,
    event: "implementation",
    kind: "coding",
    phase: "SPRINTING",
    minutes: 12
  });
  const manualEvents = (await readFile(path.join(runDir, ".benchmark", "events.ndjson"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(manualEvents.every((event) => event.timing_source === "agent_recorded_estimate"));
  assert.ok(manualEvents.every((event) => event.timing_confidence === "low"));

  await mkdir(path.join(runDir, "src"), { recursive: true });
  await mkdir(path.join(runDir, "tests"), { recursive: true });
  await writeFile(
    path.join(runDir, "src", "index.js"),
    [
      "const input = JSON.parse(process.argv[2] ?? '{}');",
      "const jurisdiction = input.jurisdiction ?? input.region;",
      "console.log(JSON.stringify({ approved: true, reasonCode: 'APPROVED', auditTrail: ['jurisdiction ' + jurisdiction] }));",
      "export const codes = ['MEAL_LIMIT_EXCEEDED', 'MISSING_RECEIPT', 'WEEKEND_TRAVEL_REVIEW', 'INVALID_INPUT', 'executive'];"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(runDir, "tests", "index.test.js"),
    [
      "const expected = ['APPROVED', 'auditTrail', 'MEAL_LIMIT_EXCEEDED', 'MISSING_RECEIPT', 'WEEKEND_TRAVEL_REVIEW', 'INVALID_INPUT', 'executive', 'region', 'jurisdiction'];",
      "console.log(expected.join(' '));"
    ].join("\n"),
    "utf8"
  );
  await mkdir(path.join(runDir, "public"), { recursive: true });
  await writeFile(path.join(runDir, "public", "app.js"), "console.log('browser UI asset');\n", "utf8");
  await writeFile(
    path.join(runDir, ".benchmark", "transcript.md"),
    "CLI smoke PASS\nnpm test PASS\nnext action: final review\nregion deprecated alias\n",
    "utf8"
  );
  await mkdir(path.join(runDir, ".codex", "skills", "pjsdlc_dev_sprint"), { recursive: true });
  await writeFile(
    path.join(runDir, ".codex", "skills", "pjsdlc_dev_sprint", "SKILL.md"),
    "# Managed Runtime\n\nHarness managed workflow skill copied during adoption.\n",
    "utf8"
  );
  await mkdir(path.join(runDir, ".work_products", "04_implementation"), { recursive: true });
  await writeFile(
    path.join(runDir, ".work_products", "04_implementation", "expense_engine.md"),
    "# Expense Engine Implementation\n\nThe implementation records the jurisdiction migration and test entrypoint.\n",
    "utf8"
  );

  const report = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "harness",
    runDir,
    runType: "warm",
    bootstrapMinutes: 2.5,
    estimatedVibeHandoffMinutes: 30,
    avoidedReworkMinutes: 10,
    comparisonConfidence: "medium"
  });
  assert.equal(report.workflow_cost.run_type, "warm");
  assert.equal(report.workflow_cost.bootstrap_minutes, 2.5);
  assert.equal(report.workflow_cost.cost_boundary.bootstrap_included_in_delivery, false);
  assert.equal(report.workflow_cost.workflow_control_minutes, 3);
  assert.equal(report.workflow_cost.total_delivery_minutes, 15);
  assert.equal(report.outcome.workflow_overhead_ratio, 0.2);
  assert.equal(report.outcome.net_value_minutes, 25);
  assert.equal(report.sections.acceptance.total, 10);
  assert.ok(report.sections.acceptance.passed > 0);
  assert.equal(report.artifact_inventory.data_source, "filesystem_scan");
  assert.equal(report.artifact_inventory.confidence, "high");
  assert.equal(report.artifact_inventory.conclusion_eligible, false);
  assert.ok(report.artifact_inventory.categories.managed_runtime.files >= 1);
  assert.ok(report.artifact_inventory.categories.project_facts.files >= 1);
  assert.ok(report.artifact_inventory.categories.product_source_tests.files >= 3);
  assert.ok(report.artifact_inventory.categories.product_docs.files >= 1);
  assert.equal(report.artifact_inventory.categories.other.files, 0);
  assert.equal(report.artifact_inventory.artifact_type_coverage.managed_runtime, true);
  assert.ok(report.artifact_inventory.top_files.every((file) => !file.path.startsWith(".benchmark/")));
  assert.match(renderMarkdownReport(report), /Delivery Benchmark Report/);
  assert.match(renderMarkdownReport(report), /Run type: warm/);
  assert.match(renderMarkdownReport(report), /Artifact Inventory/);
  assert.match(renderMarkdownReport(report), /Harness managed runtime/);

  const evidenceBaselineReport = {
    scenario_id: "support-triage-board",
    mode: "baseline",
    workflow_cost: { observed_total_delivery_minutes: 10, run_type: "warm" },
    quality_assessment: {
      hidden_probe: { available: true, passed: 12, total: 12, decision: "PASS", confidence: "high" }
    },
    metric_confidence: {
      elapsed_time: { level: "high", data_source: "observer_measured", conclusion_eligible: true },
      quality_score: { level: "high", data_source: "hidden_quality_probe", conclusion_eligible: true },
      context_recovery: { level: "medium", data_source: "hidden_answer_key_with_file_references", conclusion_eligible: false },
      gate_value: { level: "unavailable", data_source: "unavailable", conclusion_eligible: false },
      human_intervention: { level: "unavailable", data_source: "unavailable", conclusion_eligible: false }
    },
    artifact_inventory: {
      total: { files: 10, lines: 2000, bytes: 10000 },
      categories: {
        product_source_tests: { lines: 1800 },
        managed_runtime: { lines: 0 },
        project_facts: { lines: 0 }
      }
    }
  };
  const evidenceHarnessReport = {
    ...evidenceBaselineReport,
    mode: "harness",
    workflow_cost: { observed_total_delivery_minutes: 18, run_type: "warm" },
    artifact_inventory: {
      total: { files: 100, lines: 9000, bytes: 90000 },
      categories: {
        product_source_tests: { lines: 1600 },
        managed_runtime: { lines: 5800 },
        project_facts: { lines: 1800 }
      }
    }
  };
  const evidenceCheck = buildEvidenceCheck(evidenceBaselineReport, evidenceHarnessReport, { protocolStatus: "formal" });
  assert.equal(evidenceCheck.elapsed_comparison.conclusion_eligible, true);
  assert.equal(evidenceCheck.elapsed_comparison.delta_minutes, 8);
  assert.equal(evidenceCheck.design_purpose_status, "negative_elapsed_signal");
  assert.ok(evidenceCheck.allowed_conclusions.some((item) => item.includes("against a direct faster-or-more-efficient claim")));
  const bootstrapLeakHarnessReport = {
    ...evidenceHarnessReport,
    workflow_cost: {
      ...evidenceHarnessReport.workflow_cost,
      observations: [
        { event: "observer_start", data_source: "observer_measured" },
        { event: "file_added", path: ".codex/config.yaml", data_source: "observer_measured" },
        { event: "observer_stop", duration_ms: 1000, data_source: "observer_measured" }
      ]
    }
  };
  const bootstrapLeakCheck = buildEvidenceCheck(evidenceBaselineReport, bootstrapLeakHarnessReport, { protocolStatus: "formal" });
  assert.equal(bootstrapLeakCheck.checks.cost_boundary.passed, false);
  assert.equal(bootstrapLeakCheck.elapsed_comparison.conclusion_eligible, false);
  assert.match(bootstrapLeakCheck.checks.cost_boundary.evidence, /warm bootstrap observed baseline=false harness=true/);
  assert.equal(evidenceCheck.checks.same_hidden_quality.passed, true);
  assert.equal(evidenceCheck.checks.cost_boundary.passed, true);
  assert.ok(evidenceCheck.missing_for_design_purpose.includes("gate_value_high_confidence"));
  assert.equal(evidenceCheck.diagnostic.artifact_inventory.available, true);
  assert.equal(evidenceCheck.diagnostic.artifact_inventory.harness_managed_runtime_lines, 5800);
  const calibrationEvidenceCheck = buildEvidenceCheck(evidenceBaselineReport, evidenceHarnessReport, {
    protocolStatus: "calibration"
  });
  assert.equal(calibrationEvidenceCheck.elapsed_comparison.conclusion_eligible, false);
  assert.equal(calibrationEvidenceCheck.design_purpose_status, "not_evaluable");
  assert.equal(calibrationEvidenceCheck.checks.protocol_status.passed, false);

  await recordEvent({
    runDir: lifecycleRunDir,
    event: "initial_delivery",
    kind: "coding",
    phase: "INITIAL_DELIVERY",
    minutes: 20
  });
  await recordEvent({
    runDir: lifecycleRunDir,
    event: "fresh_agent_recovery",
    kind: "handoff",
    phase: "RECOVERY",
    minutes: 5
  });
  await recordEvent({
    runDir: lifecycleRunDir,
    event: "rfc_cascade",
    kind: "rework",
    phase: "RFC",
    minutes: 12
  });
  await recordEvent({
    runDir: lifecycleRunDir,
    event: "debug_fix",
    kind: "rework",
    phase: "DEBUG",
    minutes: 8
  });
  await startTimer({
    runDir: lifecycleRunDir,
    event: "gate:npm-test",
    kind: "test",
    phase: "GATE"
  });
  await wait(20);
  await stopTimer({ runDir: lifecycleRunDir, notes: "project-local test gate complete" });
  await startTimer({
    runDir: lifecycleRunDir,
    event: "gate:validate-dev",
    kind: "workflow_control",
    phase: "GATE"
  });
  await wait(20);
  await stopTimer({ runDir: lifecycleRunDir, notes: "Harness development gate complete" });
  const correctionPrompt = "Please fix API sorting, update the UI smoke path, and keep docs aligned.\n";
  const correctionPromptPath = path.join(lifecycleRunDir, "operator-correction.md");
  await writeFile(correctionPromptPath, correctionPrompt, "utf8");
  const correctionIntervention = await recordIntervention({
    runDir: lifecycleRunDir,
    stage: "RFC",
    severity: "correction",
    promptFile: correctionPromptPath,
    reason: "first-pass checklist found API/UI drift",
    notes: "planned benchmark prompts are not counted"
  });
  assert.equal(correctionIntervention.data_source, "operator_recorded");
  assert.equal(correctionIntervention.prompt_chars, Array.from(correctionPrompt).length);
  assert.equal(correctionIntervention.prompt_words, correctionPrompt.trim().split(/\s+/).length);
  assert.match(correctionIntervention.prompt_sha256, /^[a-f0-9]{64}$/);
  const reworkPromptPath = path.join(lifecycleRunDir, "operator-rework.md");
  await writeFile(reworkPromptPath, "Redo the stale-state repair loop and rerun the hidden probe.\n", "utf8");
  await recordIntervention({
    runDir: lifecycleRunDir,
    stage: "DEBUG",
    severity: "rework",
    promptFile: reworkPromptPath,
    reason: "repair loop needed after first-pass defect",
    notes: "counts as one repair loop"
  });
  const operatorNotePath = path.join(lifecycleRunDir, "operator-note.md");
  await writeFile(operatorNotePath, "Operator note: first-pass score was saved before correction.\n", "utf8");
  const operatorNotePrompt = await recordPrompt({
    runDir: lifecycleRunDir,
    stage: "RFC",
    promptKind: "operator_note",
    promptFile: operatorNotePath,
    reason: "record diagnostic operator note without counting it as an intervention"
  });
  assert.equal(operatorNotePrompt.prompt_kind, "operator_note");
  assert.equal(operatorNotePrompt.counts_as_protocol, false);
  assert.equal(operatorNotePrompt.counts_as_intervention, false);
  const productGateFinding = await recordGateFinding({
    runDir: lifecycleRunDir,
    event: "gate:npm-test",
    stage: "RFC",
    gateType: "product",
    defectsCaught: 2,
    defectIds: "API-SORT,UI-STALE",
    wouldEscape: true,
    notes: "product test gate caught cross-layer drift"
  });
  assert.equal(productGateFinding.data_source, "operator_recorded");
  assert.deepEqual(productGateFinding.defect_ids, ["API-SORT", "UI-STALE"]);
  assert.equal(productGateFinding.would_escape_without_gate, true);
  await recordGateFinding({
    runDir: lifecycleRunDir,
    event: "gate:validate-dev",
    stage: "DEBUG",
    gateType: "workflow",
    defectsCaught: 1,
    defectIds: "DOC-HANDOFF",
    wouldEscape: false,
    notes: "workflow gate caught missing handoff detail"
  });
  await mkdir(path.join(lifecycleRunDir, "src"), { recursive: true });
  await mkdir(path.join(lifecycleRunDir, "test"), { recursive: true });
  await writeFile(
    path.join(lifecycleRunDir, "src", "index.js"),
    [
      "export const incident = { id: 'INC-1', impactLevel: 'critical', severity: 'deprecated alias', providerEventId: 'evt-1', owner: 'nina', status: 'new', auditTrail: [] };",
      "export const statuses = ['new', 'investigating', 'mitigated', 'resolved'];",
      "export const risk = ['enterprise', 'critical', 'risk'];",
      "export const api = ['create', 'update', 'list', 'inspect'];",
      "export const provider = 'mock provider providerEventId idempotent duplicate retry dead-letter provider.incident.opened provider.incident.closed incident.opened rejected INVALID_PROVIDER_EVENT';",
      "export const errors = ['errorCode', 'INVALID', 'structured', 'state transition', 'incident:write', 'permission'];"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(lifecycleRunDir, "test", "lifecycle.test.js"),
    [
      "console.log('API worker UI smoke browser');",
      "console.log('inspect GET POST update owner status auditTrail');",
      "console.log('INVALID state transition permission incident.opened provider.incident.opened');"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(lifecycleRunDir, "README.md"),
    [
      "# Context Recovery Run",
      "entrypoint: npm test, npm run api, npm run worker, npm run board.",
      "canonical model: impactLevel is canonical; severity is a deprecated alias.",
      "provider boundary: use deterministic mock provider; live provider credentials are not required.",
      "RFC 1 and RFC 2 are applied. Debug Fix rejected deprecated provider event names.",
      "next safe action: run npm test and review provider fixture smoke evidence."
    ].join("\n"),
    "utf8"
  );
  const qualityProbe = await runQualityProbe({
    scenario: "project-context-recovery-lab",
    runDir: lifecycleRunDir,
    out: path.join(lifecycleRunDir, ".benchmark", "quality-probe.json")
  });
  assert.equal(qualityProbe.available, true);
  assert.equal(qualityProbe.data_source, "hidden_quality_probe");
  assert.equal(qualityProbe.confidence, "high");
  assert.equal(qualityProbe.decision, "PASS");
  await writeFile(
    path.join(lifecycleRunDir, "takeover-answer.md"),
    [
      "The API, worker, board, and test entrypoints are recoverable from package.json and README.md.",
      "The current model uses impactLevel; severity is a deprecated alias, documented in README.md.",
      "The provider boundary uses a mock provider and does not require a live provider for local recovery; see README.md.",
      "The next safe action is npm test, documented in README.md."
    ].join("\n"),
    "utf8"
  );
  const recoveryScore = await scoreRecoveryAnswer({
    scenario: "project-context-recovery-lab",
    runDir: lifecycleRunDir,
    answer: path.join(lifecycleRunDir, "takeover-answer.md"),
    out: path.join(lifecycleRunDir, ".benchmark", "recovery-score.json")
  });
  assert.equal(recoveryScore.data_source, "hidden_answer_key_with_file_references");
  assert.equal(recoveryScore.confidence, "medium-high");
  assert.equal(recoveryScore.passed, recoveryScore.total);
  const hiddenScoredLifecycleReport = await scoreRun({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    runDir: lifecycleRunDir
  });
  assert.equal(hiddenScoredLifecycleReport.quality_assessment.primary_source, "hidden_quality_probe");
  assert.equal(hiddenScoredLifecycleReport.quality_assessment.confidence, "high");
  assert.deepEqual(hiddenScoredLifecycleReport.summary, hiddenScoredLifecycleReport.quality_assessment.primary_summary);
  assert.equal(hiddenScoredLifecycleReport.summary.total, hiddenScoredLifecycleReport.quality_assessment.hidden_probe.total);
  assert.equal(hiddenScoredLifecycleReport.lifecycle.context_recovery_score, recoveryScore.passed);
  assert.equal(hiddenScoredLifecycleReport.lifecycle.recovery_score_source, "hidden_answer_key_with_file_references");
  assert.equal(hiddenScoredLifecycleReport.metric_confidence.quality_score.level, "high");
  assert.equal(hiddenScoredLifecycleReport.metric_confidence.quality_score.conclusion_eligible, true);
  assert.equal(hiddenScoredLifecycleReport.metric_confidence.context_recovery.level, "medium-high");
  assert.equal(hiddenScoredLifecycleReport.metric_confidence.context_recovery.conclusion_eligible, false);
  const lifecycleReport = await scoreRun({
    scenario: "project-context-recovery-lab",
    mode: "harness",
    runDir: lifecycleRunDir,
    contextRecoveryScore: 5,
    contextRecoveryTotal: 6,
    wrongPathCount: 1
  });
  assert.equal(lifecycleReport.lifecycle.initial_delivery_minutes, 20);
  assert.equal(lifecycleReport.lifecycle.recovery_orientation_minutes, 5);
  assert.equal(lifecycleReport.lifecycle.rfc_fix_minutes, 12);
  assert.equal(lifecycleReport.lifecycle.debug_fix_minutes, 8);
  assert.equal(lifecycleReport.lifecycle.total_lifecycle_minutes, 45);
  assert.equal(lifecycleReport.lifecycle.context_recovery_score, 5);
  assert.equal(lifecycleReport.lifecycle.context_recovery_total, 6);
  assert.equal(lifecycleReport.lifecycle.recovery_score_source, "operator_recorded");
  assert.equal(lifecycleReport.lifecycle.recovery_score_confidence, "medium");
  assert.equal(lifecycleReport.lifecycle.wrong_path_count, 1);
  assert.equal(lifecycleReport.lifecycle.final_quality_score.total, lifecycleReport.summary.total);
  assert.ok(lifecycleReport.lifecycle.final_quality_score.total > 0);
  assert.equal(lifecycleReport.quality_assessment.primary_source, "hidden_quality_probe");
  assert.equal(lifecycleReport.quality_assessment.static_rubric.confidence, "low");
  assert.equal(lifecycleReport.metric_confidence.elapsed_time.level, "mixed");
  assert.equal(lifecycleReport.metric_confidence.elapsed_time.conclusion_eligible, false);
  assert.equal(lifecycleReport.metric_confidence.quality_score.conclusion_eligible, true);
  assert.equal(lifecycleReport.metric_confidence.gate_value.level, "medium");
  assert.equal(lifecycleReport.metric_confidence.gate_value.conclusion_eligible, false);
  assert.equal(lifecycleReport.metric_confidence.human_intervention.level, "medium");
  assert.equal(lifecycleReport.metric_confidence.human_intervention.conclusion_eligible, false);
  assert.equal(lifecycleReport.automation_burden.intervention_count, 2);
  assert.ok(lifecycleReport.automation_burden.operator_prompt_chars > 0);
  assert.ok(lifecycleReport.automation_burden.operator_prompt_words > 0);
  assert.equal(lifecycleReport.automation_burden.by_stage.RFC.count, 1);
  assert.equal(lifecycleReport.automation_burden.by_stage.DEBUG.count, 1);
  assert.equal(lifecycleReport.automation_burden.by_severity.correction.count, 1);
  assert.equal(lifecycleReport.automation_burden.by_severity.rework.count, 1);
  assert.equal(lifecycleReport.automation_burden.repair_loop_count, 1);
  assert.equal(lifecycleReport.automation_burden.prompt_ledger.prompt_count, 5);
  assert.equal(lifecycleReport.automation_burden.prompt_ledger.protocol_prompt_count, 2);
  assert.equal(lifecycleReport.automation_burden.prompt_ledger.intervention_prompt_count, 2);
  assert.equal(lifecycleReport.automation_burden.prompt_ledger.operator_note_prompt_count, 1);
  assert.equal(lifecycleReport.automation_burden.prompt_ledger.confidence, "high_for_recorded_prompt_text");
  assert.ok(lifecycleReport.automation_burden.prompt_ledger.intervention_prompt_chars > 0);
  assert.equal(lifecycleReport.metric_confidence.prompt_ledger.level, "high");
  assert.equal(lifecycleReport.metric_confidence.prompt_ledger.conclusion_eligible, true);
  assert.equal(lifecycleReport.gate_value.defects_caught, 3);
  assert.equal(lifecycleReport.gate_value.product_gate_defects_caught, 2);
  assert.equal(lifecycleReport.gate_value.workflow_gate_defects_caught, 1);
  assert.equal(lifecycleReport.gate_value.would_escape_without_gate_defect_count, 2);
  assert.equal(lifecycleReport.gate_value.first_pass_quality_score.passed, qualityProbe.passed);
  assert.equal(lifecycleReport.gate_value.escaped_defect_count, null);
  assert.equal(lifecycleReport.gate_value.repair_loop_count, 1);
  assert.equal(lifecycleReport.workflow_cost.gate_breakdown.has_gate_data, true);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.total_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.workflow_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.product_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.by_event.some((item) => item.event === "gate:npm-test"));
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.by_event.some((item) => item.event === "gate:validate-dev"));
  assert.match(renderMarkdownReport(lifecycleReport), /Lifecycle Efficiency/);
  assert.match(renderMarkdownReport(lifecycleReport), /Gate Cost Breakdown/);
  assert.match(renderMarkdownReport(lifecycleReport), /Automation Burden/);
  assert.match(renderMarkdownReport(lifecycleReport), /Prompt Ledger/);
  assert.match(renderMarkdownReport(lifecycleReport), /Gate Value/);
  assert.match(renderMarkdownReport(lifecycleReport), /Metric Confidence/);
  assert.match(renderMarkdownReport(lifecycleReport), /Conclusion Eligible/);
  assert.match(renderMarkdownReport(lifecycleReport), /Quality Assessment Confidence/);
  assert.match(renderMarkdownReport(lifecycleReport), /Supplemental Static Failed Checks/);

  const resultsDir = path.join(repoRoot, "examples/delivery-benchmark/results");
  const dataScript = await readFile(path.join(resultsDir, "benchmark-data.js"), "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(dataScript, context);

  const benchmarkData = context.window.__DELIVERY_BENCHMARK_DATA__;
  assert.ok(benchmarkData);
  assert.ok(benchmarkData.copy.en);
  assert.ok(benchmarkData.copy.zh);
  assert.ok(benchmarkData.copy.en.keyFinding);
  assert.ok(benchmarkData.copy.zh.keyFinding);
  assert.ok(Array.isArray(benchmarkData.copy.en.evidenceMetrics));
  assert.ok(Array.isArray(benchmarkData.copy.zh.evidenceMetrics));
  assert.ok(benchmarkData.copy.en.evidenceMetrics.every((metric) => metric.help));
  assert.ok(benchmarkData.copy.zh.evidenceMetrics.every((metric) => metric.help));
  assert.ok(benchmarkData.copy.en.evidenceStatus);
  assert.ok(benchmarkData.copy.zh.evidenceStatus);
  assert.match(benchmarkData.copy.zh.documentTitle, /交付可靠性基准测试/);
  assert.match(benchmarkData.copy.en.lede, /same-quality delivery/);
  assert.match(benchmarkData.copy.zh.lede, /同等质量交付/);
  assert.match(benchmarkData.copy.zh.keyFinding.headline, /尚不能证明.*(更快|更高效)/);
  assert.match(benchmarkData.copy.zh.keyFinding.body, /结论级证据/);
  assert.match(benchmarkData.copy.zh.keyFinding.body, /Baseline 26\.9158 分钟、Harness 48\.4984 分钟/);
  assert.match(benchmarkData.copy.zh.keyFinding.body, /gate 成本和工作流厚度/);
  assert.match(benchmarkData.copy.zh.evidenceMetrics.find((metric) => metric.id === "confidence").help, /Gate 价值、人工介入和上下文恢复目前仍是诊断级/);
  assert.match(benchmarkData.copy.zh.evidenceStatus, /workflow 迭代输入/);
  assert.match(benchmarkData.copy.en.caveats.join("\n"), /workflow control/i);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /工作流控制成本/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /不能证明 Harness 更快或更高效/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /高信号场景/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /外部 observer/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /只有高置信度指标是结论级/);
  assert.doesNotMatch(dataScript, /4\.3144|3\.6898|0\.1127/);
  assert.match(dataScript, /14\.0196/);
  assert.match(dataScript, /21\.0036/);
  assert.match(dataScript, /26\.9158/);
  assert.match(dataScript, /48\.4984/);
  assert.ok(benchmarkData.copy.en.lifecycleEfficiency);
  assert.ok(benchmarkData.copy.zh.lifecycleEfficiency);
  assert.match(benchmarkData.copy.zh.lifecycleEfficiency.body, /生命周期效率/);
  assert.match(benchmarkData.copy.zh.contextContinuity.body, /新对话/);
  assert.ok(benchmarkData.copy.en.scenarioBriefLabels);
  assert.ok(benchmarkData.copy.zh.scenarioBriefLabels);
  assert.ok(benchmarkData.copy.en.scenarioBriefLabels.expectedAdvantage);
  assert.ok(benchmarkData.copy.zh.scenarioBriefLabels.expectedAdvantage);
  assert.ok(benchmarkData.copy.en.measurementMethods);
  assert.ok(benchmarkData.copy.zh.measurementMethods);
  assert.ok(benchmarkData.copy.en.metricConfidenceIntro);
  assert.ok(benchmarkData.copy.zh.metricConfidenceIntro);
  assert.match(benchmarkData.copy.zh.metricConfidenceIntro, /不是每个 benchmark 数字都有同样强的证据/);
  assert.match(benchmarkData.copy.zh.metricConfidenceIntro, /只有高置信度指标可以进入核心结论/);
  assert.ok(benchmarkData.copy.en.metricConfidenceGroups);
  assert.ok(benchmarkData.copy.zh.conclusionEligibilityLabels);
  assert.ok(benchmarkData.copy.en.automationBurdenIntro);
  assert.ok(benchmarkData.copy.zh.automationBurdenIntro);
  assert.ok(benchmarkData.copy.en.gateValueIntro);
  assert.ok(benchmarkData.copy.zh.gateValueIntro);
  assert.ok(benchmarkData.copy.en.gateThinningRecommendation);
  assert.ok(benchmarkData.copy.zh.gateThinningRecommendation);
  assert.ok(benchmarkData.copy.en.artifactInventoryLabels);
  assert.ok(benchmarkData.copy.zh.artifactInventoryLabels);
  assert.match(benchmarkData.copy.zh.artifactInventoryCategories.product_source_tests, /产品源码/);
  assert.match(benchmarkData.copy.zh.automationBurdenIntro, /额外补了多少计划外提示/);
  assert.match(benchmarkData.copy.zh.gateValueIntro, /gate 是否真的创造质量价值/);
  assert.match(benchmarkData.copy.zh.gateThinningRecommendation.label, /Standard Thin/);
  assert.match(benchmarkData.copy.zh.gateThinningRecommendation.body, /最高|strict|focused product quality gate|高风险/);
  assert.ok(benchmarkData.copy.en.confidenceLevelLabels);
  assert.ok(benchmarkData.copy.zh.confidenceLevelLabels);
  const completedScenarios = benchmarkData.scenarios.filter((scenario) => scenario.status === "completed");
  assert.ok(completedScenarios.length >= 1);
  assert.ok(completedScenarios.some((scenario) => scenario.modes.baseline && scenario.modes.harness));
  assert.ok(completedScenarios.every((scenario) => scenario.copy.en && scenario.copy.zh));
  assert.ok(benchmarkData.scenarios.every((scenario) => scenario.copy.en.projectBrief?.whatItBuilds));
  assert.ok(benchmarkData.scenarios.every((scenario) => scenario.copy.zh.projectBrief?.whatItBuilds));
  assert.ok(
    benchmarkData.scenarios
      .filter((scenario) => lifecycleScenarios.includes(scenario.id))
      .every((scenario) => scenario.copy.en.projectBrief?.expectedAdvantage && scenario.copy.zh.projectBrief?.expectedAdvantage)
  );
  const expenseScenario = completedScenarios.find((scenario) => scenario.id === "expense-policy-engine");
  assert.equal(expenseScenario.modes.baseline.totalDeliveryMinutes, 25);
  assert.equal(expenseScenario.modes.harness.totalDeliveryMinutes, 53);
  assert.equal(expenseScenario.modes.harness.workflowControlMinutes, 29);
  assert.equal(expenseScenario.measurement.methods[0], "agent_recorded_estimate");
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "elapsed_time").level, "low");
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "elapsed_time").conclusionEligible, false);
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "quality_score").dataSource, "static_keyword_path_rubric");
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "quality_score").conclusionEligible, false);
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "gate_value").level, "unavailable");
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "human_intervention").level, "unavailable");
  assert.equal(expenseScenario.metricConfidence.find((metric) => metric.id === "prompt_ledger").level, "unavailable");
  assert.equal(expenseScenario.automationBurden.metrics.interventionCount, null);
  assert.equal(expenseScenario.gateValue.metrics.defectsCaught, null);
  assert.match(expenseScenario.measurement.copy.zh.body, /observer-measured/);
  assert.match(expenseScenario.copy.zh.projectBrief.whatItBuilds, /费用报销政策判定引擎/);
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "webhook-provider-bridge").copy.zh.projectBrief.complexitySignals,
    /HMAC/
  );
  const recoveryLab = benchmarkData.scenarios.find((scenario) => scenario.id === "project-context-recovery-lab");
  assert.ok(recoveryLab);
  assert.equal(recoveryLab.status, "completed");
  assert.equal(recoveryLab.featured, undefined);
  assert.equal(recoveryLab.modes.baseline.scorePassed, 17);
  assert.equal(recoveryLab.modes.harness.scorePassed, 17);
  assert.equal(recoveryLab.modes.baseline.totalDeliveryMinutes, 14.0196);
  assert.equal(recoveryLab.modes.harness.totalDeliveryMinutes, 21.0036);
  assert.equal(recoveryLab.measurement.methods[0], "observer_measured");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "elapsed_time").level, "high");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "elapsed_time").conclusionEligible, true);
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "quality_score").level, "low");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "quality_score").conclusionEligible, false);
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "context_recovery").level, "medium");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "gate_value").level, "unavailable");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "human_intervention").level, "unavailable");
  assert.equal(recoveryLab.metricConfidence.find((metric) => metric.id === "prompt_ledger").level, "unavailable");
  assert.equal(recoveryLab.automationBurden.status, "unrecorded");
  assert.equal(recoveryLab.gateValue.status, "unrecorded");
  assert.match(recoveryLab.automationBurden.copy.zh.body, /不能把缺失数据解读成自动化负担低/);
  assert.match(recoveryLab.gateValue.copy.zh.body, /不能证明 gate 净价值/);
  assert.match(recoveryLab.metricConfidence.find((metric) => metric.id === "quality_score").copy.zh.explanation, /不能倒推升级旧分数/);
  assert.equal(recoveryLab.sections.length, 4);
  assert.equal(recoveryLab.lifecycle.metrics.baseline.contextRecoveryScore, 6);
  assert.equal(recoveryLab.lifecycle.metrics.harness.contextRecoveryScore, 6);
  assert.equal(recoveryLab.lifecycle.metrics.baseline.wrongPathCount, 0);
  assert.equal(recoveryLab.lifecycle.metrics.harness.wrongPathCount, 0);
  assert.equal(recoveryLab.lifecycle.metrics.baseline.totalLifecycleMinutes, 12.26);
  assert.equal(recoveryLab.lifecycle.metrics.harness.totalLifecycleMinutes, 19.16);
  assert.match(recoveryLab.copy.zh.projectBrief.whatItBuilds, /Incident Ops Console/);
  assert.match(recoveryLab.copy.zh.projectBrief.expectedAdvantage, /没有体现这个优势/);
  assert.match(recoveryLab.interpretation.zh.join("\n"), /Baseline 总耗时更短/);
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "support-triage-board").copy.zh.projectBrief.expectedAdvantage,
    /partial fix/
  );
  const supportScenario = benchmarkData.scenarios.find((scenario) => scenario.id === "support-triage-board");
  assert.equal(supportScenario.status, "completed");
  assert.equal(supportScenario.modes.baseline.scorePassed, 12);
  assert.equal(supportScenario.modes.harness.scorePassed, 12);
  assert.equal(supportScenario.modes.baseline.totalDeliveryMinutes, 26.9158);
  assert.equal(supportScenario.modes.harness.totalDeliveryMinutes, 48.4984);
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "elapsed_time").level, "high");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "elapsed_time").conclusionEligible, true);
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "quality_score").level, "high");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "quality_score").conclusionEligible, true);
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "gate_value").level, "medium");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "gate_value").conclusionEligible, false);
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "human_intervention").level, "unavailable");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "prompt_ledger").level, "unavailable");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "artifact_inventory").level, "high");
  assert.equal(supportScenario.metricConfidence.find((metric) => metric.id === "artifact_inventory").conclusionEligible, false);
  assert.equal(supportScenario.artifactInventory.dataSource, "filesystem_scan");
  assert.equal(supportScenario.artifactInventory.confidence, "high");
  assert.equal(supportScenario.artifactInventory.conclusionEligible, false);
  assert.equal(supportScenario.artifactInventory.runType, "warm");
  assert.equal(supportScenario.artifactInventory.modes.baseline.categories.product_source_tests.lines, 2151);
  assert.equal(supportScenario.artifactInventory.modes.harness.categories.product_source_tests.lines, 1365);
  assert.equal(supportScenario.artifactInventory.modes.harness.categories.managed_runtime.lines, 5818);
  assert.equal(supportScenario.artifactInventory.modes.harness.categories.project_facts.lines, 1828);
  assert.match(supportScenario.artifactInventory.copy.zh.body, /不能.*价值证明/);
  assert.equal(supportScenario.automationBurden.status, "unavailable");
  assert.equal(supportScenario.gateValue.status, "diagnostic");
  assert.equal(supportScenario.gateValue.metrics.defectsCaught, 9);
  assert.match(supportScenario.gateValue.copy.zh.body, /诊断证据/);
  assert.match(supportScenario.copy.zh.projectBrief.expectedAdvantage, /约慢 1\.8 倍/);
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "webhook-provider-bridge").copy.zh.projectBrief.expectedAdvantage,
    /credential/
  );

  const reportHtml = await readFile(path.join(resultsDir, "index.html"), "utf8");
  assert.match(reportHtml, /benchmark-data\.js/);
  assert.match(reportHtml, /id="conclusion"/);
  assert.match(reportHtml, /id="evidence-metrics"/);
  assert.match(reportHtml, /id="measurement-method"/);
  assert.match(reportHtml, /id="metric-confidence"/);
  assert.match(reportHtml, /metricConfidenceGroup/);
  assert.match(reportHtml, /confidence-group-heading/);
  assert.match(reportHtml, /isConclusionMetric/);
  assert.match(reportHtml, /id="automation-burden"/);
  assert.match(reportHtml, /id="gate-value"/);
  assert.match(reportHtml, /id="gate-thinning-recommendation"/);
  assert.match(reportHtml, /gateThinningPanel/);
  assert.match(reportHtml, /id="artifact-inventory"/);
  assert.match(reportHtml, /artifactInventoryPanel/);
  assert.match(reportHtml, /id="lifecycle-efficiency"/);
  assert.match(reportHtml, /id="context-continuity"/);
  assert.match(reportHtml, /id="scenario-detail"/);
  assert.match(reportHtml, /scenario-summary/);
  assert.match(reportHtml, /help-anchor/);
  assert.match(reportHtml, /data-help=/);
  assert.match(reportHtml, /language-switch/);
  assert.match(reportHtml, /data-lang="zh"/);
  assert.match(reportHtml, /data-lang="en"/);
  assert.match(reportHtml, /Delivery Reliability Benchmark/);
} finally {
  await rm(root, { recursive: true, force: true });
}
