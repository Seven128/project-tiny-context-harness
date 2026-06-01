import path from "node:path";
import { harnessPath, readHarnessRootConfig } from "./harness-root.js";
import { pathExists, readText } from "./fs.js";
import { parseYaml } from "./yaml.js";
import { runValidator } from "./validators.js";

export type InspectionDecision = "PASS" | "WARN" | "BLOCKED";
export type InspectionDataSource = "measured" | "inferred" | "self_reported" | "unavailable";

export interface WorkflowInspectionOptions {
  recentMinutes?: number;
  recentTurns?: number;
  estimatedTokens?: number;
}

export interface WorkflowInspectionMetric {
  id: string;
  label: string;
  value: string | number | boolean | null;
  level: InspectionDecision;
  data_source: InspectionDataSource;
  details: string;
}

export interface WorkflowInspectionFinding {
  severity: InspectionDecision;
  code: string;
  message: string;
  recommendation: string;
  data_source: InspectionDataSource;
}

export interface WorkflowInspectionReport {
  decision: InspectionDecision;
  harness_root: string;
  harness_root_source: string;
  current_phase: string;
  current_task_id: string;
  inspected_at: string;
  metrics: WorkflowInspectionMetric[];
  findings: WorkflowInspectionFinding[];
}

const OPEN_TASK_STATUSES = new Set(["pending", "in_progress", "blocked", "pending_revision"]);
const HIGH_RISK_EVIDENCE_LEVELS = new Set(["external_provider_live", "deployed_runtime", "business_handoff_ready"]);
const HIGH_RISK_TARGETS = new Set(["cloud_vm", "managed_service", "browser", "worker"]);

export async function runWorkflowInspection(
  projectRoot: string,
  options: WorkflowInspectionOptions = {}
): Promise<WorkflowInspectionReport> {
  const rootConfig = await readHarnessRootConfig(projectRoot);
  const root = rootConfig.harnessFolderName;
  const inspectedAt = new Date().toISOString();
  const metrics: WorkflowInspectionMetric[] = [];
  const findings: WorkflowInspectionFinding[] = [];

  const lifecyclePath = path.join(projectRoot, harnessPath(root, "state", "lifecycle.yaml"));
  const planPath = path.join(projectRoot, harnessPath(root, "state", "plan.yaml"));
  const lifecycle = await readYamlObject(lifecyclePath);
  const plan = await readYamlObject(planPath);
  const currentPhase = String(lifecycle?.current_phase ?? "");
  const currentTaskId = String(plan?.current_task_id ?? "");
  const tasks = arrayOfRecords(plan?.tasks);
  const openTasks = tasks.filter((task) => OPEN_TASK_STATUSES.has(String(task.status ?? "")));
  const currentTask = currentTaskId ? tasks.find((task) => String(task.id ?? "") === currentTaskId) : undefined;
  const inferredTask = currentTask ?? (openTasks.length === 1 ? openTasks[0] : undefined);
  const planText = await readIfExists(planPath);

  addMetric(
    metrics,
    findings,
    "workflow_weight.plan_lines",
    "plan.yaml line count",
    planText ? countLines(planText) : null,
    levelByThreshold(planText ? countLines(planText) : 0, 200, 500),
    "measured",
    "Active plan should stay short enough for an Agent to recover current work without reading historical execution flow.",
    "Keep only current/future task contracts in plan.yaml; move completed history to implementation docs, git or external release records."
  );
  addMetric(
    metrics,
    findings,
    "workflow_weight.open_tasks",
    "open task count",
    openTasks.length,
    openTasks.length <= 1 ? "PASS" : "BLOCKED",
    "measured",
    "The Harness expects one active stage task at a time; multiple open tasks make recovery and allowed_paths ambiguous.",
    "Split sequentially or choose one current task, then remove or defer the other open task contracts."
  );

  const docRefs = inferredTask ? collectTaskDocRefs(inferredTask) : [];
  addMetric(
    metrics,
    findings,
    "workflow_weight.current_task_doc_refs",
    "current task document refs",
    inferredTask ? docRefs.length : null,
    levelByThreshold(docRefs.length, 5, 10),
    inferredTask ? "measured" : "unavailable",
    inferredTask
      ? "Too many task-scoped docs usually means the Agent must hydrate too much context before acting."
      : "No current/open task is selected, so task-scoped document weight is not measurable.",
    "Narrow the current task result_docs / implementation_doc / docs refs to the smallest handoff surface."
  );
  const allowedPaths = inferredTask ? asStringList(inferredTask.allowed_paths) : [];
  addMetric(
    metrics,
    findings,
    "workflow_weight.allowed_paths",
    "current task allowed_paths",
    inferredTask ? allowedPaths.length : null,
    levelByThreshold(allowedPaths.length, 12, 25),
    inferredTask ? "measured" : "unavailable",
    inferredTask
      ? "Wide allowed_paths increase blast radius and make it harder to tell whether work stayed inside the task contract."
      : "No current/open task is selected, so allowed_paths weight is not measurable.",
    "Split the task or replace broad globs with the concrete files/directories needed for this step."
  );
  const workingNotesCount = inferredTask ? countWorkingNotes(inferredTask.working_notes) : null;
  addMetric(
    metrics,
    findings,
    "workflow_weight.working_notes",
    "current task working_notes",
    workingNotesCount,
    workingNotesCount === null ? "PASS" : workingNotesCount <= 8 ? "PASS" : "BLOCKED",
    inferredTask ? "measured" : "unavailable",
    inferredTask
      ? "working_notes is recovery-first scratch state; more than eight items usually means historical flow is leaking into active context."
      : "No current/open task is selected, so working_notes weight is not measurable.",
    "Collapse notes to resume state, next step, blocker, last passed gate and do-not-retry facts; move history elsewhere."
  );

  await addSelfTestReportMetric(projectRoot, inferredTask, metrics, findings);
  await addLargestDocMetric(projectRoot, docRefs, metrics, findings);
  await addValidatorMetric(projectRoot, "validate-harness", metrics, findings);
  await addValidatorMetric(projectRoot, "validate-plan", metrics, findings);
  await addTestingReadinessMetric(projectRoot, currentPhase, metrics, findings);
  addLifecycleMetric(lifecycle, plan, currentPhase, currentTaskId, currentTask, openTasks, metrics, findings);
  addRecoveryMetric(plan, inferredTask, metrics, findings);
  addManualMetrics(options, metrics, findings);

  const decision = combineDecision(metrics.map((metric) => metric.level));
  return {
    decision,
    harness_root: root,
    harness_root_source: rootConfig.source,
    current_phase: currentPhase || "UNKNOWN",
    current_task_id: currentTaskId,
    inspected_at: inspectedAt,
    metrics,
    findings
  };
}

export function renderWorkflowInspection(report: WorkflowInspectionReport): string {
  const lines = [
    `Workflow inspection: ${report.decision}`,
    `harness root: ${report.harness_root} (${report.harness_root_source})`,
    `current phase: ${report.current_phase}`,
    `current task: ${report.current_task_id || "(none)"}`,
    "",
    "Metrics:",
    ...report.metrics.map((metric) => {
      const value = metric.value === null ? "unknown" : String(metric.value);
      return `- ${metric.level} ${metric.id}: ${value} [${metric.data_source}] - ${metric.details}`;
    })
  ];
  if (report.findings.length > 0) {
    lines.push("", "Findings:");
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity} ${finding.code}: ${finding.message}`);
      lines.push(`  next: ${finding.recommendation}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function renderWorkflowInspectionPrompt(report: WorkflowInspectionReport): string {
  return [
    "# Workflow Self-Inspection Prompt",
    "",
    "你是用户仓库里的 Harness workflow self-inspection agent。请结合上面的 measured / inferred 指标和你最近一次真实执行经历，判断工作流是否符合预期。",
    "",
    "必须区分数据来源：",
    "- measured: 脚本真实读到的文件、字段、validator 结果或命令耗时。",
    "- inferred: 脚本只能从体量、字段缺失、重复或过长现象推断。",
    "- self_reported: 你根据最近一次执行过程填写的耗时、turns、估算 token 和反复回读情况。",
    "- unavailable: 当前环境没有 telemetry，不能伪造精确 token 或真实执行耗时。",
    "",
    "请回答：",
    "1. 当前 workflow 从哪里进、当前任务是什么、下一步是什么？如果不能在 2 分钟内回答，记为 WARN。",
    "2. 最近一次只是为了理解 workflow / 找事实源花了多少分钟、多少轮对话、估算多少 tokens？>15 分钟或 >10k tokens 记 WARN；>30 分钟或 >20k tokens 记 BLOCKED 候选。",
    "3. 是否有会改变下一步动作的判断只埋在 notes/evidence/appendix/long doc 中，而没有 promoted 到 hard constraint、do_not_retry 或短 runbook 顶部？",
    "4. 当前 Development Self-Test Report / TEST_CASES / TEST_REPORT 是否像可执行交接卡，而不是 debug log、operator log、evidence dump 或历史流水？",
    "5. Review / Testing 是否能直接消费入口、核心路径、checkpoint、observable exit 和 evidence refs，而不用重新发明 runtime？",
    "",
    "输出格式：",
    "- Decision: PASS | WARN | BLOCKED",
    "- Data gaps: 列出 unavailable 或只能 self_reported 的指标",
    "- Findings: 每条注明 measured / inferred / self_reported / unavailable",
    "- Next action: 最小修复动作，不要扩展工作流体量",
    "",
    `Current script decision: ${report.decision}`,
    `Current phase: ${report.current_phase}`,
    `Current task: ${report.current_task_id || "(none)"}`
  ].join("\n");
}

async function addValidatorMetric(
  projectRoot: string,
  gate: string,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): Promise<void> {
  try {
    const report = await runValidator(projectRoot, gate);
    addMetric(
      metrics,
      findings,
      `fact_source_alignment.${gate}`,
      gate,
      report.errors.length,
      report.errors.length === 0 ? "PASS" : "BLOCKED",
      "measured",
      report.errors.length === 0 ? `${gate} reported no errors.` : report.errors.join("; "),
      `Run npx sdlc-harness ${gate} and fix the reported source-of-truth drift.`
    );
  } catch (error) {
    addMetric(
      metrics,
      findings,
      `fact_source_alignment.${gate}`,
      gate,
      null,
      "BLOCKED",
      "measured",
      error instanceof Error ? error.message : String(error),
      `Restore files required by ${gate}, then rerun inspect-workflow.`
    );
  }
}

async function addTestingReadinessMetric(
  projectRoot: string,
  currentPhase: string,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): Promise<void> {
  const reportPath = path.join(projectRoot, ".docs/07_test/TEST_REPORT.md");
  const casesPath = path.join(projectRoot, ".docs/07_test/TEST_CASES.md");
  const shouldValidate = currentPhase === "TESTING" || (await pathExists(reportPath)) || (await pathExists(casesPath));
  if (!shouldValidate) {
    addMetric(
      metrics,
      findings,
      "testing_readiness.validate-test",
      "validate-test readiness",
      null,
      "PASS",
      "unavailable",
      "No TESTING fact source exists yet; validate-test readiness is not evaluated for this phase.",
      "Create TEST_CASES.md / TEST_REPORT.md only when TESTING has executable entry/exit facts."
    );
    return;
  }
  try {
    const report = await runValidator(projectRoot, "validate-test");
    const level: InspectionDecision = report.errors.length === 0 ? "PASS" : currentPhase === "TESTING" ? "BLOCKED" : "WARN";
    addMetric(
      metrics,
      findings,
      "testing_readiness.validate-test",
      "validate-test readiness",
      report.errors.length,
      level,
      "measured",
      report.errors.length === 0 ? "TESTING fact sources are structurally consumable." : report.errors.join("; "),
      "Keep TEST_CASES as reusable test design and TEST_REPORT as execution evidence; fix missing or drifting TC references."
    );
  } catch (error) {
    addMetric(
      metrics,
      findings,
      "testing_readiness.validate-test",
      "validate-test readiness",
      null,
      currentPhase === "TESTING" ? "BLOCKED" : "WARN",
      "measured",
      error instanceof Error ? error.message : String(error),
      "Restore TESTING fact sources or remove stale partial test files until TESTING is in scope."
    );
  }
}

function addLifecycleMetric(
  lifecycle: Record<string, unknown> | undefined,
  plan: Record<string, unknown> | undefined,
  currentPhase: string,
  currentTaskId: string,
  currentTask: Record<string, unknown> | undefined,
  openTasks: Array<Record<string, unknown>>,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): void {
  let level: InspectionDecision = "PASS";
  const problems: string[] = [];
  if (!currentPhase) {
    level = "BLOCKED";
    problems.push("lifecycle.yaml does not define current_phase");
  }
  if (plan && "current_phase" in plan) {
    level = "BLOCKED";
    problems.push("plan.yaml duplicates current_phase");
  }
  if (currentTaskId && !currentTask) {
    level = "BLOCKED";
    problems.push("current_task_id does not match any task");
  }
  if (!currentTaskId && openTasks.length === 1 && currentPhase !== "COMPLETED") {
    level = maxLevel(level, "WARN");
    problems.push("one open task exists but current_task_id is empty");
  }
  const allowedNext = Array.isArray(lifecycle?.allowed_next_phases) ? lifecycle?.allowed_next_phases.length : 0;
  if (allowedNext === 0 && !["COMPLETED", "UNKNOWN"].includes(currentPhase || "UNKNOWN")) {
    level = maxLevel(level, "WARN");
    problems.push("allowed_next_phases is empty");
  }
  addMetric(
    metrics,
    findings,
    "handoff_clarity.lifecycle",
    "lifecycle and current task clarity",
    problems.length,
    level,
    "measured",
    problems.length === 0 ? "Lifecycle and current task pointers are coherent." : problems.join("; "),
    "Keep current_phase only in lifecycle.yaml, current task only in plan.yaml, and regenerate allowed_next_phases through transition.py."
  );
}

function addRecoveryMetric(
  plan: Record<string, unknown> | undefined,
  currentTask: Record<string, unknown> | undefined,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): void {
  if (!currentTask || !isHighRiskTask(currentTask)) {
    addMetric(
      metrics,
      findings,
      "recovery_safety.resume_capsule",
      "high-risk resume capsule",
      null,
      "PASS",
      currentTask ? "inferred" : "unavailable",
      currentTask ? "Current task is not classified as high-risk by evidence_level or target_runtime_environment." : "No current/open task is selected.",
      "When a task becomes live/runtime/high-risk, add resume_capsule with canonical path, next step, blocker, do-not-retry and recovery refs."
    );
    return;
  }
  const capsule = isRecord(plan?.resume_capsule) ? (plan?.resume_capsule as Record<string, unknown>) : undefined;
  const problems: string[] = [];
  if (!capsule) problems.push("resume_capsule missing");
  if (capsule && asStringList(capsule.do_not_retry).length === 0) problems.push("do_not_retry missing");
  if (capsule && asStringList(capsule.recovery_refs).length === 0) problems.push("recovery_refs missing");
  addMetric(
    metrics,
    findings,
    "recovery_safety.resume_capsule",
    "high-risk resume capsule",
    problems.length,
    problems.length === 0 ? "PASS" : "BLOCKED",
    "measured",
    problems.length === 0 ? "High-risk task has resume-first recovery state." : problems.join("; "),
    "Record resume_capsule before continuing high-risk runtime/live work."
  );
}

function addManualMetrics(
  options: WorkflowInspectionOptions,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): void {
  addManualMetric(metrics, findings, "self_reported.recent_minutes", "recent workflow minutes", options.recentMinutes, 15, 30);
  addManualMetric(metrics, findings, "self_reported.recent_turns", "recent workflow turns", options.recentTurns, 6, 10);
  addManualMetric(metrics, findings, "self_reported.estimated_tokens", "estimated workflow tokens", options.estimatedTokens, 10000, 20000);
  if (options.estimatedTokens === undefined) {
    addMetric(
      metrics,
      findings,
      "workflow_weight.actual_tokens",
      "actual model tokens",
      null,
      "PASS",
      "unavailable",
      "No local token telemetry was provided; inspect-workflow will not invent a precise token number.",
      "Pass --estimated-tokens when the Agent/client has a reliable estimate, or answer the --prompt self-check."
    );
  }
}

function addManualMetric(
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[],
  id: string,
  label: string,
  value: number | undefined,
  warnThreshold: number,
  blockThreshold: number
): void {
  if (value === undefined) return;
  addMetric(
    metrics,
    findings,
    id,
    label,
    value,
    levelByThreshold(value, warnThreshold, blockThreshold),
    "self_reported",
    `${label} was supplied by the user/Agent, not measured from local files.`,
    "If this is WARN/BLOCKED, reduce workflow context weight before continuing."
  );
}

async function addSelfTestReportMetric(
  projectRoot: string,
  currentTask: Record<string, unknown> | undefined,
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): Promise<void> {
  const implementationDoc = typeof currentTask?.implementation_doc === "string" ? currentTask.implementation_doc.trim() : "";
  if (!implementationDoc) {
    addMetric(
      metrics,
      findings,
      "workflow_weight.self_test_report_lines",
      "Development Self-Test Report lines",
      null,
      "PASS",
      "unavailable",
      "No current implementation_doc is selected, so self-test report size is not measurable.",
      "When SPRINTING is active, keep the report as a short handoff card."
    );
    return;
  }
  const fullPath = path.join(projectRoot, implementationDoc);
  const text = await readIfExists(fullPath);
  if (!text) {
    addMetric(
      metrics,
      findings,
      "workflow_weight.self_test_report_lines",
      "Development Self-Test Report lines",
      null,
      "BLOCKED",
      "measured",
      `implementation_doc is missing: ${implementationDoc}`,
      "Create or point to the current task implementation doc."
    );
    return;
  }
  const section = markdownSection(text, ["development self-test report", "开发自测报告"]);
  if (!section) {
    addMetric(
      metrics,
      findings,
      "workflow_weight.self_test_report_lines",
      "Development Self-Test Report lines",
      null,
      "PASS",
      "unavailable",
      "No Development Self-Test Report section is present in the current implementation doc.",
      "Add the report when the current task has a self_test_contract."
    );
    return;
  }
  const lines = countLines(section);
  const highRisk = isHighRiskTask(currentTask as Record<string, unknown>);
  const level = levelByThreshold(lines, highRisk ? 120 : 80, highRisk ? 180 : 120);
  addMetric(
    metrics,
    findings,
    "workflow_weight.self_test_report_lines",
    "Development Self-Test Report lines",
    lines,
    level,
    "measured",
    highRisk ? "High-risk report line count uses 120/180 thresholds." : "Ordinary report line count uses 80/120 thresholds.",
    "Move debug/operator/evidence/exploration detail to runbook, evidence index or appendix; keep the report as a handoff card."
  );
}

async function addLargestDocMetric(
  projectRoot: string,
  docRefs: string[],
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[]
): Promise<void> {
  let largest = 0;
  let largestRef = "";
  for (const ref of docRefs) {
    const text = await readIfExists(path.join(projectRoot, ref));
    if (!text) continue;
    const lines = countLines(text);
    if (lines > largest) {
      largest = lines;
      largestRef = ref;
    }
  }
  addMetric(
    metrics,
    findings,
    "drift_risk.largest_current_doc_lines",
    "largest current task doc lines",
    largestRef ? largest : null,
    largest > 700 ? "WARN" : largest > 300 ? "WARN" : "PASS",
    largestRef ? "inferred" : "unavailable",
    largestRef ? `${largestRef} is the largest current task doc.` : "No current task document refs were available.",
    "If a current handoff doc keeps growing, split durable decisions into ADRs, runtime steps into runbooks, and evidence bodies into evidence indexes."
  );
}

function addMetric(
  metrics: WorkflowInspectionMetric[],
  findings: WorkflowInspectionFinding[],
  id: string,
  label: string,
  value: string | number | boolean | null,
  level: InspectionDecision,
  dataSource: InspectionDataSource,
  details: string,
  recommendation: string
): void {
  metrics.push({ id, label, value, level, data_source: dataSource, details });
  if (level !== "PASS") {
    findings.push({
      severity: level,
      code: id,
      message: details,
      recommendation,
      data_source: dataSource
    });
  }
}

async function readYamlObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  if (!(await pathExists(filePath))) return undefined;
  const parsed = parseYaml(await readText(filePath));
  return isRecord(parsed) ? parsed : undefined;
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  return (await pathExists(filePath)) ? readText(filePath) : undefined;
}

function levelByThreshold(value: number, warnThreshold: number, blockThreshold: number): InspectionDecision {
  if (value > blockThreshold) return "BLOCKED";
  if (value > warnThreshold) return "WARN";
  return "PASS";
}

function combineDecision(levels: InspectionDecision[]): InspectionDecision {
  if (levels.includes("BLOCKED")) return "BLOCKED";
  if (levels.includes("WARN")) return "WARN";
  return "PASS";
}

function maxLevel(left: InspectionDecision, right: InspectionDecision): InspectionDecision {
  return combineDecision([left, right]);
}

function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function countWorkingNotes(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string" && value.trim()) return 1;
  return 0;
}

function collectTaskDocRefs(task: Record<string, unknown>): string[] {
  const refs = new Set<string>();
  for (const ref of asStringList(task.implementation_doc)) refs.add(normalizeDocRef(ref));
  for (const ref of asStringList(task.result_docs)) refs.add(normalizeDocRef(ref));
  if (isRecord(task.docs)) {
    for (const value of Object.values(task.docs)) {
      for (const ref of asStringList(value)) refs.add(normalizeDocRef(ref));
    }
  }
  return [...refs].filter(Boolean);
}

function normalizeDocRef(ref: string): string {
  return ref.replace(/\\/g, "/").replace(/^\.\//, "");
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHighRiskTask(task: Record<string, unknown>): boolean {
  const evidence = isRecord(task.evidence_level) ? String(task.evidence_level.required ?? "") : "";
  const target = isRecord(task.target_runtime_environment) ? String(task.target_runtime_environment.kind ?? "") : "";
  return HIGH_RISK_EVIDENCE_LEVELS.has(evidence) || HIGH_RISK_TARGETS.has(target);
}

function markdownSection(text: string, headerTerms: string[]): string | undefined {
  const lines = text.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const title = match[2].toLowerCase();
    if (headerTerms.some((term) => title.includes(term.toLowerCase()))) {
      start = index;
      level = match[1].length;
      break;
    }
  }
  if (start === -1) return undefined;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}
