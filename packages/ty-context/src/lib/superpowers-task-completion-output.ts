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

export interface CompletionPhraseFinding {
  surface: string;
  phrase: string;
  line: number;
  text: string;
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
  return resolveCompletionOutputStatus({
    final_gate_ran: hasStoredOutput || isRecord(state.gates?.final_gate),
    product_goal_complete: state.final.product_goal_complete,
    acceptance_target_status: state.final.acceptance_target_status,
    audit_task_complete: state.final.audit_task_complete,
    blocked_reasons: asStringArray(finalRecord.blocked_reasons ?? gate.blocked_reasons),
    rejection_reasons: asStringArray(finalRecord.rejection_reasons ?? gate.rejection_reasons),
    generated_output_mismatch: finalRecord.generated_output_mismatch === true || gate.generated_output_mismatch === true
  });
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
  metaRecord.completion_output_status = contract.completion_output_status;
}

export function scanFalseCompletionPhrases(input: {
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
      if (lineAllowedForNonAccept(line)) {
        continue;
      }
      for (const item of FORBIDDEN_PHRASES) {
        if (item.pattern.test(line)) {
          findings.push({ surface: surface.surface, phrase: item.phrase, line: index + 1, text: line.trim() });
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
  const surfaces: CompletionOutputSurface[] = [];
  for (const relative of GENERATED_COMPLETION_SURFACES) {
    const file = path.join(workdir, ...relative.split("/"));
    if (await pathExists(file)) {
      surfaces.push({ surface: relative, text: await readText(file) });
    }
  }
  return scanFalseCompletionPhrases({ completion_output_status: contract.completion_output_status, surfaces });
}

export function completionPhraseFindingMessages(findings: CompletionPhraseFinding[]): string[] {
  return findings.map((finding) => `false completion phrase in ${finding.surface}:${finding.line}: ${finding.phrase}`);
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

function lineAllowedForNonAccept(line: string): boolean {
  const text = line.trim();
  if (!text) {
    return true;
  }
  if (/Audit workflow completed; acceptance target not complete\./i.test(text)) {
    return true;
  }
  if (/^Product goal complete:\s*false$/i.test(text)) {
    return true;
  }
  if (/^(?:complete|partial|acceptance_required|missing_layer)_count:\s*\d+$/i.test(text)) {
    return true;
  }
  if (/^-\s+[A-Z]+-\d+:\s*(?:complete|accepted|accept)\s*$/i.test(text)) {
    return true;
  }
  const jsonField = /^"([^"]+)"\s*:\s*/.exec(text);
  if (jsonField && !/^(final_answer|final_conclusion|conclusion|summary|message|required_user_visible_status)$/i.test(jsonField[1])) {
    return true;
  }
  if (/\b(product_goal_complete|completion_output_status|acceptance_target_status|audit_task_complete)\b/i.test(text)) {
    return true;
  }
  if (/["']?(overall_)?status["']?\s*:\s*["']?(complete|accepted|accept)["']?/i.test(text)) {
    return true;
  }
  if (/diagnostic|row-level|row status|not[_ -]?in[_ -]?scope/i.test(text)) {
    return true;
  }
  if (/\b(do not|must not|cannot|never|unless|only when|forbid|forbidden|invalid|false[- ]completion|does not mean|cannot authorize|cannot imply)\b/i.test(text)) {
    return true;
  }
  if (/\bnot\s+(?:complete|completed|accepted|accept|done|successful)\b/i.test(text)) {
    return true;
  }
  if (/不得|不能|禁止|仅当|不是|不等于/.test(text)) {
    return true;
  }
  return false;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
