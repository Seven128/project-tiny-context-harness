import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { asStringArray, isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export type CompletionOutputStatus = "accept" | "reject" | "blocked";

export interface CompletionOutputContract {
  product_goal_complete: boolean;
  acceptance_target_status: string;
  completion_output_status: CompletionOutputStatus;
  final_answer_allowed: boolean;
  required_user_visible_status: "accepted" | "rejected" | "blocked";
  final_answer: CompletionOutputStatus;
  exit_code: 0 | 1 | 2;
  blocked_reasons: string[];
  rejection_reasons: string[];
  audit_task_complete: boolean;
  final_gate_ran: boolean;
  generated_output_mismatch: boolean;
  blocker_triage?: FinalGateBlockerTriage;
  candidate_state?: FinalGateCandidateState;
}

export interface CompletionOutputResolveInput {
  final_gate_ran?: boolean;
  product_goal_complete?: boolean;
  acceptance_target_status?: string;
  audit_task_complete?: boolean;
  validator_errors?: string[];
  acceptance_validator_errors?: string[];
  blocked_reasons?: string[];
  rejection_reasons?: string[];
  generated_output_mismatch?: boolean;
  required_command_not_run?: boolean;
  environment_unknown?: boolean;
  state_unreadable?: boolean;
  source_unreadable?: boolean;
  kernel_invalid?: boolean;
  required_validator_unavailable?: boolean;
}

export interface CompletionOutputSurface {
  surface: string;
  text: string;
}

export type CompletionOutputSurfaceType =
  | "user_visible_final_summary"
  | "final_card"
  | "agent_final_answer"
  | "generated_summary"
  | "machine_readable_json_status"
  | "derived_diagnostic_json"
  | "matrix_diagnostic"
  | "verdict_diagnostic"
  | "workflow_protocol_text"
  | "execution_binding_text"
  | "rule_explanation_text"
  | "local_audit_diagnostic"
  | "unknown";

export type CompletionPhraseClassification =
  | "true_false_completion_claim"
  | "allowed_protocol_reserved_word"
  | "allowed_machine_status_field"
  | "allowed_diagnostic_status"
  | "allowed_rule_explanation";

export interface CompletionPhraseFinding {
  surface: string;
  surface_type?: CompletionOutputSurfaceType;
  classification?: CompletionPhraseClassification;
  phrase: string;
  line: number;
  text: string;
  self_recoverable?: boolean;
}

export interface FinalGateCandidateState {
  final_gate_ran: boolean;
  product_goal_complete: boolean;
  acceptance_target_status: string;
  completion_output_status: CompletionOutputStatus;
  generated_output_mismatch: boolean;
  source: "trusted_evidence_kernel";
}

export type FinalGateBlockerCategory =
  | "none"
  | "product_evidence_failed"
  | "missing_current_evidence"
  | "stale_or_contradictory_evidence"
  | "generated_output_mismatch"
  | "self_recoverable_generated_output_mismatch"
  | "transient_state_bookkeeping"
  | "environment_blocked"
  | "contract_blocked"
  | "harness_drift_blocked";

export interface FinalGateBlockerTriage {
  category: FinalGateBlockerCategory;
  self_recoverable: boolean;
  recovery_attempted: boolean;
  recovery_action: string;
  next_action: string;
  details: string[];
  blocker_count: number;
}

export interface FinalGateBlockerTriageInput {
  errors: string[];
  output_findings: CompletionPhraseFinding[];
  previous_transient_findings?: string[];
  candidate_state?: FinalGateCandidateState;
  recovery_attempted?: boolean;
  recovery_action?: string;
}

const BLOCKING_TARGET_STATUSES = new Set(["not_run", "blocked", "under_specified", "unknown"]);
const REJECTING_TARGET_STATUSES = new Set(["partial", "failed", "rejected", "invalidated", "not_accepted"]);

const GENERATED_COMPLETION_SURFACES = [
  "derived/final-summary.md",
  "derived/final-card.md",
  "derived/final-acceptance-verdict.json",
  "derived/final-acceptance-verdict.md",
  "derived/plan-conformance-matrix.json",
  "derived/plan-conformance-matrix.md",
  "derived/local-audit.md",
  "goal-objective.txt",
  "execution-binding.md",
  "workflow-protocol.md"
];

const FORBIDDEN_PHRASES: Array<{ phrase: string; pattern: RegExp }> = [
  { phrase: "update_goal(status=\"complete\")", pattern: /update_goal\s*\(\s*status\s*=\s*["']complete["']\s*\)/i },
  { phrase: "goal achieved", pattern: /\bgoal achieved\b/i },
  { phrase: "ready to merge", pattern: /\bready to merge\b/i },
  { phrase: "implementation complete", pattern: /\bimplementation complete\b/i },
  { phrase: "all passed", pattern: /\ball (?:acs?|acceptance criteria|checks|tests)?\s*passed\b/i },
  { phrase: "product complete", pattern: /\bproduct complete\b/i },
  { phrase: "completed", pattern: /\bcompleted\b/i },
  { phrase: "complete", pattern: /\bcomplete\b/i },
  { phrase: "accepted", pattern: /\baccepted\b/i },
  { phrase: "accept", pattern: /\baccept\b/i },
  { phrase: "done", pattern: /\bdone\b/i },
  { phrase: "success", pattern: /\bsuccess(?:ful)?\b/i },
  { phrase: "任务完成", pattern: /任务完成/ },
  { phrase: "已完成", pattern: /已完成/ },
  { phrase: "验收通过", pattern: /验收通过/ },
  { phrase: "目标完成", pattern: /目标完成/ },
  { phrase: "全部通过", pattern: /全部通过/ },
  { phrase: "可以合并", pattern: /可以合并/ }
];

export function resolveCompletionOutputStatus(input: CompletionOutputResolveInput): CompletionOutputContract {
  const finalGateRan = input.final_gate_ran === true;
  const productGoalComplete = input.product_goal_complete === true;
  const acceptanceTargetStatus = normalizeAcceptanceTargetStatus(input.acceptance_target_status);
  const validatorErrors = [...(input.validator_errors ?? []), ...(input.acceptance_validator_errors ?? [])].filter(Boolean);
  const blockedReasons = [...(input.blocked_reasons ?? [])];
  const rejectionReasons = [...(input.rejection_reasons ?? [])];

  if (!finalGateRan) {
    blockedReasons.push("final_gate_not_run");
  }
  if (input.required_command_not_run === true) {
    blockedReasons.push("required_command_not_run");
  }
  if (input.environment_unknown === true) {
    blockedReasons.push("environment_unknown");
  }
  if (input.state_unreadable === true) {
    blockedReasons.push("state_unreadable");
  }
  if (input.source_unreadable === true) {
    blockedReasons.push("source_unreadable");
  }
  if (input.kernel_invalid === true) {
    blockedReasons.push("kernel_invalid");
  }
  if (input.required_validator_unavailable === true) {
    blockedReasons.push("required_validator_unavailable");
  }
  if (input.generated_output_mismatch === true) {
    blockedReasons.push("generated_output_mismatch");
  }
  if (BLOCKING_TARGET_STATUSES.has(acceptanceTargetStatus)) {
    blockedReasons.push(`acceptance_target_status=${acceptanceTargetStatus}`);
  }
  if (REJECTING_TARGET_STATUSES.has(acceptanceTargetStatus)) {
    rejectionReasons.push(`acceptance_target_status=${acceptanceTargetStatus}`);
  }
  if (finalGateRan && !productGoalComplete && !BLOCKING_TARGET_STATUSES.has(acceptanceTargetStatus)) {
    rejectionReasons.push("product_goal_complete=false");
  }
  if (validatorErrors.length > 0) {
    rejectionReasons.push(...validatorErrors);
  }

  const accept =
    finalGateRan &&
    productGoalComplete &&
    isAcceptedStatus(acceptanceTargetStatus) &&
    validatorErrors.length === 0 &&
    blockedReasons.length === 0 &&
    rejectionReasons.length === 0;
  const completionOutputStatus: CompletionOutputStatus = accept ? "accept" : blockedReasons.length > 0 ? "blocked" : "reject";
  const exitCode = completionOutputStatus === "accept" ? 0 : completionOutputStatus === "reject" ? 1 : 2;
  return {
    product_goal_complete: productGoalComplete && accept,
    acceptance_target_status: acceptanceTargetStatus,
    completion_output_status: completionOutputStatus,
    final_answer_allowed: completionOutputStatus === "accept",
    required_user_visible_status: completionOutputStatus === "accept" ? "accepted" : completionOutputStatus === "reject" ? "rejected" : "blocked",
    final_answer: completionOutputStatus,
    exit_code: exitCode,
    blocked_reasons: unique(blockedReasons),
    rejection_reasons: unique(rejectionReasons),
    audit_task_complete: input.audit_task_complete === true,
    final_gate_ran: finalGateRan,
    generated_output_mismatch: input.generated_output_mismatch === true
  };
}

export function completionOutputContractFromState(state: SuperpowersTaskState): CompletionOutputContract {
  const finalRecord = state.final as SuperpowersTaskState["final"] & Partial<CompletionOutputContract>;
  const gate = isRecord(state.gates?.final_gate) ? state.gates.final_gate : {};
  const hasStoredOutput = typeof finalRecord.completion_output_status === "string" || typeof gate.completion_output_status === "string";
  const contract = resolveCompletionOutputStatus({
    final_gate_ran: hasStoredOutput || isRecord(state.gates?.final_gate),
    product_goal_complete: state.final.product_goal_complete,
    acceptance_target_status: state.final.acceptance_target_status,
    audit_task_complete: state.final.audit_task_complete,
    blocked_reasons: asStringArray(finalRecord.blocked_reasons ?? gate.blocked_reasons),
    rejection_reasons: asStringArray(finalRecord.rejection_reasons ?? gate.rejection_reasons),
    generated_output_mismatch: finalRecord.generated_output_mismatch === true || gate.generated_output_mismatch === true
  });
  const triage = isRecord(finalRecord.blocker_triage)
    ? finalRecord.blocker_triage
    : isRecord(gate.blocker_triage)
      ? gate.blocker_triage
      : undefined;
  const candidate = isRecord(finalRecord.candidate_state)
    ? finalRecord.candidate_state
    : isRecord(gate.candidate_state)
      ? gate.candidate_state
      : undefined;
  if (triage) {
    contract.blocker_triage = triage as unknown as FinalGateBlockerTriage;
  }
  if (candidate) {
    contract.candidate_state = candidate as unknown as FinalGateCandidateState;
  }
  return contract;
}

export function applyCompletionOutputContract(state: SuperpowersTaskState, contract: CompletionOutputContract): void {
  const finalRecord = state.final as SuperpowersTaskState["final"] & Partial<CompletionOutputContract>;
  const metaRecord = state.meta as SuperpowersTaskState["meta"] & { completion_output_status?: CompletionOutputStatus };
  finalRecord.product_goal_complete = contract.product_goal_complete;
  state.meta.product_goal_complete = contract.product_goal_complete;
  finalRecord.acceptance_target_status = contract.acceptance_target_status;
  state.meta.acceptance_target_status = contract.acceptance_target_status;
  finalRecord.audit_task_complete = contract.audit_task_complete;
  state.meta.audit_task_complete = contract.audit_task_complete;
  finalRecord.completion_output_status = contract.completion_output_status;
  finalRecord.final_answer_allowed = contract.final_answer_allowed;
  finalRecord.required_user_visible_status = contract.required_user_visible_status;
  finalRecord.final_answer = contract.final_answer;
  finalRecord.exit_code = contract.exit_code;
  finalRecord.blocked_reasons = contract.blocked_reasons;
  finalRecord.rejection_reasons = contract.rejection_reasons;
  finalRecord.generated_output_mismatch = contract.generated_output_mismatch;
  if (contract.blocker_triage) {
    finalRecord.blocker_triage = contract.blocker_triage;
  }
  if (contract.candidate_state) {
    finalRecord.candidate_state = contract.candidate_state;
  }
  metaRecord.completion_output_status = contract.completion_output_status;
}

export function scanFalseCompletionPhrases(input: {
  completion_output_status: CompletionOutputStatus;
  surfaces: CompletionOutputSurface[] | string;
}): CompletionPhraseFinding[] {
  return scanFalseCompletionPhrasesDetailed(input);
}

export function scanFalseCompletionPhrasesDetailed(input: {
  completion_output_status: CompletionOutputStatus;
  surfaces: CompletionOutputSurface[] | string;
}): CompletionPhraseFinding[] {
  if (input.completion_output_status === "accept") {
    return [];
  }
  const surfaces = typeof input.surfaces === "string" ? [{ surface: "inline", text: input.surfaces }] : input.surfaces;
  const findings: CompletionPhraseFinding[] = [];
  for (const surface of surfaces) {
    const lines = surface.text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const allowed = classifyAllowedCompletionLine(surface.surface, line);
      if (allowed) {
        continue;
      }
      for (const item of FORBIDDEN_PHRASES) {
        if (item.pattern.test(line)) {
          findings.push({
            surface: surface.surface,
            surface_type: classifySurfaceLine(surface.surface, line),
            classification: "true_false_completion_claim",
            phrase: item.phrase,
            line: index + 1,
            text: line.trim(),
            self_recoverable: isSelfRecoverableSurface(surface.surface)
          });
          break;
        }
      }
    }
  }
  return findings;
}

export async function scanGeneratedCompletionOutputSurfaces(
  workdir: string,
  contract: CompletionOutputContract
): Promise<CompletionPhraseFinding[]> {
  return scanGeneratedCompletionOutputSurfacesDetailed(workdir, contract);
}

export async function scanGeneratedCompletionOutputSurfacesDetailed(
  workdir: string,
  contract: CompletionOutputContract
): Promise<CompletionPhraseFinding[]> {
  const surfaces: CompletionOutputSurface[] = [];
  for (const relative of GENERATED_COMPLETION_SURFACES) {
    const file = path.join(workdir, ...relative.split("/"));
    if (await pathExists(file)) {
      surfaces.push({ surface: relative, text: await readText(file) });
    }
  }
  return scanFalseCompletionPhrasesDetailed({ completion_output_status: contract.completion_output_status, surfaces });
}

export function completionPhraseFindingMessages(findings: CompletionPhraseFinding[]): string[] {
  return findings.map((finding) => {
    const kind = finding.classification ? ` ${finding.classification}` : "";
    return `false completion phrase${kind} in ${finding.surface}:${finding.line}: ${finding.phrase}`;
  });
}

export function triageFinalGateBlockers(input: FinalGateBlockerTriageInput): FinalGateBlockerTriage {
  const errors = unique(input.errors);
  const findings = input.output_findings ?? [];
  const previous = unique(input.previous_transient_findings ?? []);
  const details = unique([...errors, ...findings.map((finding) => `${finding.surface}:${finding.line}:${finding.phrase}`), ...previous]);
  const recoveryAttempted = input.recovery_attempted === true;
  const recoveryAction = input.recovery_action ?? "";
  if (findings.length > 0) {
    const selfRecoverable = findings.every((finding) => finding.self_recoverable === true);
    return {
      category: selfRecoverable ? "self_recoverable_generated_output_mismatch" : "generated_output_mismatch",
      self_recoverable: selfRecoverable,
      recovery_attempted: recoveryAttempted,
      recovery_action: recoveryAction,
      next_action: selfRecoverable
        ? "regenerate derived generated-output surfaces and rerun final-gate once"
        : "remove or regenerate the user-visible false completion wording before final-gate can accept",
      details,
      blocker_count: findings.length
    };
  }
  const text = errors.join("\n");
  if (/harness_drift|protected_baseline|product task modified|harness task missing/i.test(text)) {
    return blocker("harness_drift_blocked", false, recoveryAttempted, recoveryAction, "split harness changes into a harness_task with adversarial fixtures before proving product completion", details);
  }
  if (/source file is missing|source_unreadable|scope_conflict_requires_decision|three[- ]input|Product \/ Plan \/ Checklist|Context Delta coverage is unresolved/i.test(text)) {
    return blocker("contract_blocked", false, recoveryAttempted, recoveryAction, "clarify or restore the source contract before rerunning final-gate", details);
  }
  if (/required command not_run|command not_run|browser unavailable|playwright unavailable|dependency unavailable|environment_unknown|required_validator_unavailable|permission|MFA/i.test(text)) {
    return blocker("environment_blocked", false, recoveryAttempted, recoveryAction, "restore the unavailable command, browser, dependency or permission and rerun final-gate", details);
  }
  if (/stale evidence|negative evidence|current contradiction|source hash mismatch|dirty worktree|failed_test_result_artifact|owner_dom_forbidden_state|playwright_last_run_failed/i.test(text)) {
    return blocker("stale_or_contradictory_evidence", false, recoveryAttempted, recoveryAction, "replace stale or contradictory evidence with fresh current-attempt evidence", details);
  }
  if (/missing current|missing assertion result|not machine-backed|missing required proof layer|proof layer .*missing|requires all required plan items|incomplete|no evidence_ids|unknown evidence_id/i.test(text)) {
    return blocker("missing_current_evidence", false, recoveryAttempted, recoveryAction, "add fresh current-attempt evidence for the missing AC, PI or proof layer", details);
  }
  if (previous.length > 0 && errors.length === 0) {
    return blocker(
      "transient_state_bookkeeping",
      true,
      recoveryAttempted,
      recoveryAction || "cleared previous transient bookkeeping before current candidate scan",
      "cleared previous transient bookkeeping; no user action required",
      details
    );
  }
  if (errors.length > 0) {
    return blocker("product_evidence_failed", false, recoveryAttempted, recoveryAction, "fix the current product evidence failure and rerun final-gate", details);
  }
  return blocker("none", false, recoveryAttempted, recoveryAction, "no blocker remains", details);
}

function normalizeAcceptanceTargetStatus(value: string | undefined): string {
  const normalized = String(value ?? "not_run").trim().toLowerCase();
  if (normalized === "accepted") {
    return "complete";
  }
  if (normalized === "not accepted") {
    return "not_accepted";
  }
  return normalized || "not_run";
}

function isAcceptedStatus(value: string): boolean {
  return value === "complete" || value === "accepted";
}

function classifyAllowedCompletionLine(surface: string, line: string): CompletionPhraseClassification | undefined {
  const text = line.trim();
  if (!text) {
    return "allowed_rule_explanation";
  }
  if (/Audit workflow completed; acceptance target not complete\./i.test(text)) {
    return "allowed_rule_explanation";
  }
  if (/^Product goal complete:\s*false$/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  if (/^(?:complete|partial|acceptance_required|missing_layer)_count:\s*\d+$/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  if (/^-\s+[A-Z]+-\d+:\s*(?:complete|accepted|accept)\s*$/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  const jsonField = /^"([^"]+)"\s*:\s*/.exec(text);
  if (jsonField && !/^(final_answer|final_conclusion|conclusion|summary|message|required_user_visible_status)$/i.test(jsonField[1])) {
    return "allowed_machine_status_field";
  }
  if (/\b(product_goal_complete|completion_output_status|acceptance_target_status|audit_task_complete)\b/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  if (isDiagnosticSurface(surface) && /["']?(overall_)?status["']?\s*:\s*["']?(complete|accepted|accept)["']?/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  if (/diagnostic|row-level|row status|not[_ -]?in[_ -]?scope/i.test(text)) {
    return "allowed_diagnostic_status";
  }
  if (/\b(do not|must not|cannot|never|unless|only when|forbid|forbidden|invalid|false[- ]completion|does not mean|cannot authorize|cannot imply)\b/i.test(text)) {
    return "allowed_rule_explanation";
  }
  if (/\bnot\s+(?:complete|completed|accepted|accept|done|successful)\b/i.test(text)) {
    return "allowed_rule_explanation";
  }
  if (/不得|不能|禁止|仅当|不是|不等于/.test(text)) {
    return "allowed_rule_explanation";
  }
  return undefined;
}

function classifySurfaceLine(surface: string, line: string): CompletionOutputSurfaceType {
  const normalized = surface.split(path.sep).join("/");
  if (/^Final answer:|Goal achieved|ready to merge|implementation complete/i.test(line)) {
    return "agent_final_answer";
  }
  if (normalized.endsWith("derived/final-summary.md")) {
    return "user_visible_final_summary";
  }
  if (normalized.endsWith("derived/final-card.md")) {
    return "final_card";
  }
  if (normalized.endsWith("goal-objective.txt")) {
    return "agent_final_answer";
  }
  if (normalized.endsWith("execution-binding.md")) {
    return "execution_binding_text";
  }
  if (normalized.endsWith("workflow-protocol.md")) {
    return "workflow_protocol_text";
  }
  if (/final-acceptance-verdict\.json$/.test(normalized)) {
    return "verdict_diagnostic";
  }
  if (/plan-conformance-matrix\.json$/.test(normalized)) {
    return "matrix_diagnostic";
  }
  if (/\.json$/.test(normalized)) {
    return "machine_readable_json_status";
  }
  if (/local-audit/.test(normalized)) {
    return "local_audit_diagnostic";
  }
  if (/derived\//.test(normalized)) {
    return "generated_summary";
  }
  return "unknown";
}

function isSelfRecoverableSurface(surface: string): boolean {
  const normalized = surface.split(path.sep).join("/");
  return /^derived\/(?:final-summary|final-card|final-acceptance-verdict|plan-conformance-matrix|local-audit)\.(?:md|json)$/.test(normalized);
}

function isDiagnosticSurface(surface: string): boolean {
  const type = classifySurfaceLine(surface, "");
  return (
    type === "machine_readable_json_status" ||
    type === "derived_diagnostic_json" ||
    type === "matrix_diagnostic" ||
    type === "verdict_diagnostic" ||
    type === "local_audit_diagnostic"
  );
}

function blocker(
  category: FinalGateBlockerCategory,
  selfRecoverable: boolean,
  recoveryAttempted: boolean,
  recoveryAction: string,
  nextAction: string,
  details: string[]
): FinalGateBlockerTriage {
  return {
    category,
    self_recoverable: selfRecoverable,
    recovery_attempted: recoveryAttempted,
    recovery_action: recoveryAction,
    next_action: nextAction,
    details,
    blocker_count: category === "none" ? 0 : Math.max(1, details.length)
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
