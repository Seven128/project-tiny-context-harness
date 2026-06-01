import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  listScenarios,
  cancelTimer,
  getObserverStatus,
  getTimerStatus,
  prepareRunDirectory,
  recordEvent,
  renderMarkdownReport,
  scoreRun,
  startObserver,
  startTimer,
  stopObserver,
  stopTimer
} from "../../examples/delivery-benchmark/runner/delivery_benchmark.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const root = await mkdtemp(path.join(tmpdir(), "delivery-benchmark-"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pendingLifecycleScenarios = ["project-context-recovery-lab", "support-triage-board", "webhook-provider-bridge"];
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
  const prompt = await readFile(path.join(runDir, ".benchmark", "prompt.md"), "utf8");
  assert.match(prompt, /Harness Prompt/);
  assert.match(prompt, /Expense Policy Engine Requirements/);
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
  assert.match(runbook, /RECOVERY/);
  assert.match(runbook, /DEBUG/);
  assert.match(runbook, /Gate Timing Protocol/);
  assert.match(runbook, /phase GATE/);
  assert.match(runbook, /gate:validate-dev/);
  assert.match(runbook, /package regression/i);
  const benchmarkReadme = await readFile(path.join(repoRoot, "examples", "delivery-benchmark", "README.md"), "utf8");
  assert.match(benchmarkReadme, /Design Rationale/);
  assert.match(benchmarkReadme, /ADR 008: Delivery Benchmark Scenario Design/);
  assert.match(benchmarkReadme, /same-quality delivery efficiency/);
  assert.match(benchmarkReadme, /Gate Profile and Fast Path/);
  assert.match(benchmarkReadme, /Gate Cost Breakdown/);
  assert.match(benchmarkReadme, /package checks/);
  const benchmarkDesignAdr = await readFile(
    path.join(repoRoot, ".docs", "05_decisions", "ADR_008_delivery_benchmark_scenario_design.md"),
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

  for (const scenarioId of pendingLifecycleScenarios) {
    const lifecycleProbe = await readFile(
      path.join(repoRoot, "examples", "delivery-benchmark", "scenarios", scenarioId, "lifecycle_probe.md"),
      "utf8"
    );
    assert.match(lifecycleProbe, /INITIAL_DELIVERY/);
    assert.match(lifecycleProbe, /RECOVERY/);
    assert.match(lifecycleProbe, /RFC/);
    assert.match(lifecycleProbe, /DEBUG/);
    assert.match(lifecycleProbe, /Wrong-Path Count/);
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
  assert.match(lifecyclePrompt, /Lifecycle Probe/);
  assert.match(lifecyclePrompt, /Gate Profile/);
  assert.match(lifecycleScenarioBundle, /Gate Profile/);
  assert.match(lifecyclePrompt, /Domain Focused Gates/);
  assert.match(lifecyclePrompt, /Fresh-Agent Recovery Probe/);
  assert.match(lifecyclePrompt, /RFC Cascade/);
  assert.match(lifecyclePrompt, /Debug Fix/);
  assert.match(lifecyclePrompt, /Wrong-Path Count/);
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
  for (const scenarioId of ["support-triage-board", "webhook-provider-bridge"]) {
    const promptRunDir = path.join(root, `${scenarioId}-prompt-run`);
    await prepareRunDirectory({
      scenario: scenarioId,
      mode: "harness",
      outDir: promptRunDir,
      force: true
    });
    const scenarioPrompt = await readFile(path.join(promptRunDir, ".benchmark", "prompt.md"), "utf8");
    assert.match(scenarioPrompt, /Lifecycle Probe/);
    assert.match(scenarioPrompt, /Gate Profile/);
    assert.match(scenarioPrompt, /Fresh-Agent Recovery Probe/);
    assert.match(scenarioPrompt, /RFC Cascade/);
    assert.match(scenarioPrompt, /Debug Fix/);
    assert.match(scenarioPrompt, /Wrong-Path Count/);
  }

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
  await writeFile(
    path.join(runDir, ".benchmark", "transcript.md"),
    "CLI smoke PASS\nnpm test PASS\nnext action: final review\nregion deprecated alias\n",
    "utf8"
  );

  const report = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "harness",
    runDir,
    estimatedVibeHandoffMinutes: 30,
    avoidedReworkMinutes: 10,
    comparisonConfidence: "medium"
  });
  assert.equal(report.workflow_cost.workflow_control_minutes, 3);
  assert.equal(report.workflow_cost.total_delivery_minutes, 15);
  assert.equal(report.outcome.workflow_overhead_ratio, 0.2);
  assert.equal(report.outcome.net_value_minutes, 25);
  assert.equal(report.sections.acceptance.total, 10);
  assert.ok(report.sections.acceptance.passed > 0);
  assert.match(renderMarkdownReport(report), /Delivery Benchmark Report/);

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
  await mkdir(path.join(lifecycleRunDir, "src"), { recursive: true });
  await mkdir(path.join(lifecycleRunDir, "tests"), { recursive: true });
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
    path.join(lifecycleRunDir, "tests", "lifecycle.test.js"),
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
      "provider boundary: use deterministic mock provider; do-not-retry live credentials.",
      "RFC 1 and RFC 2 are applied. Debug Fix rejected deprecated provider event names.",
      "next safe action: run npm test and review provider fixture smoke evidence."
    ].join("\n"),
    "utf8"
  );
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
  assert.equal(lifecycleReport.lifecycle.wrong_path_count, 1);
  assert.equal(lifecycleReport.lifecycle.final_quality_score.total, lifecycleReport.summary.total);
  assert.ok(lifecycleReport.lifecycle.final_quality_score.total > 0);
  assert.equal(lifecycleReport.workflow_cost.gate_breakdown.has_gate_data, true);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.total_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.workflow_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.product_gate_minutes >= 0);
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.by_event.some((item) => item.event === "gate:npm-test"));
  assert.ok(lifecycleReport.workflow_cost.gate_breakdown.by_event.some((item) => item.event === "gate:validate-dev"));
  assert.match(renderMarkdownReport(lifecycleReport), /Lifecycle Efficiency/);
  assert.match(renderMarkdownReport(lifecycleReport), /Gate Cost Breakdown/);

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
  assert.match(benchmarkData.copy.zh.keyFinding.body, /工作流控制成本/);
  assert.match(benchmarkData.copy.zh.evidenceMetrics.find((metric) => metric.id === "confidence").help, /不是.*telemetry/);
  assert.match(benchmarkData.copy.zh.evidenceStatus, /不能提前下结论/);
  assert.match(benchmarkData.copy.en.caveats.join("\n"), /workflow control/i);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /工作流控制成本/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /不能证明 Harness 更快或更高效/);
  assert.match(benchmarkData.copy.zh.caveats.join("\n"), /外部 observer/);
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
  const completedScenarios = benchmarkData.scenarios.filter((scenario) => scenario.status === "completed");
  assert.ok(completedScenarios.length >= 1);
  assert.ok(completedScenarios.some((scenario) => scenario.modes.baseline && scenario.modes.harness));
  assert.ok(completedScenarios.every((scenario) => scenario.copy.en && scenario.copy.zh));
  assert.ok(benchmarkData.scenarios.every((scenario) => scenario.copy.en.projectBrief?.whatItBuilds));
  assert.ok(benchmarkData.scenarios.every((scenario) => scenario.copy.zh.projectBrief?.whatItBuilds));
  assert.ok(
    benchmarkData.scenarios
      .filter((scenario) => pendingLifecycleScenarios.includes(scenario.id))
      .every((scenario) => scenario.copy.en.projectBrief?.expectedAdvantage && scenario.copy.zh.projectBrief?.expectedAdvantage)
  );
  const expenseScenario = completedScenarios.find((scenario) => scenario.id === "expense-policy-engine");
  assert.equal(expenseScenario.modes.baseline.totalDeliveryMinutes, 25);
  assert.equal(expenseScenario.modes.harness.totalDeliveryMinutes, 53);
  assert.equal(expenseScenario.modes.harness.workflowControlMinutes, 29);
  assert.equal(expenseScenario.measurement.methods[0], "agent_recorded_estimate");
  assert.match(expenseScenario.measurement.copy.zh.body, /observer-measured/);
  assert.match(expenseScenario.copy.zh.projectBrief.whatItBuilds, /费用报销政策判定引擎/);
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "webhook-provider-bridge").copy.zh.projectBrief.complexitySignals,
    /HMAC/
  );
  const recoveryLab = benchmarkData.scenarios.find((scenario) => scenario.id === "project-context-recovery-lab");
  assert.ok(recoveryLab);
  assert.equal(recoveryLab.status, "pending");
  assert.match(recoveryLab.copy.zh.projectBrief.whatItBuilds, /Incident Ops Console/);
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "support-triage-board").copy.zh.projectBrief.expectedAdvantage,
    /partial fix/
  );
  assert.match(
    benchmarkData.scenarios.find((scenario) => scenario.id === "webhook-provider-bridge").copy.zh.projectBrief.expectedAdvantage,
    /credential/
  );

  const reportHtml = await readFile(path.join(resultsDir, "index.html"), "utf8");
  assert.match(reportHtml, /benchmark-data\.js/);
  assert.match(reportHtml, /id="conclusion"/);
  assert.match(reportHtml, /id="evidence-metrics"/);
  assert.match(reportHtml, /id="measurement-method"/);
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
