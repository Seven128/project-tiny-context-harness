import { type CompletionOutputContract } from "./superpowers-task-completion-output.js";
import { type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function renderFinalCard(contract: CompletionOutputContract, state: SuperpowersTaskState): string {
  const reasons = contract.completion_output_status === "blocked" ? contract.blocked_reasons : contract.rejection_reasons;
  const reasonBlock = reasons.length > 0 ? reasons.map((reason) => `- ${reason}`).join("\n") : "- none";
  const gate = contract.completion_output_status === "accept" ? "Final answer: accept" : `Final answer: ${contract.completion_output_status}`;
  const auditLine =
    contract.completion_output_status === "accept"
      ? "Final-gate accepted the current attempt."
      : "Audit workflow completed; acceptance target not complete.";
  return `# Final Card

completion_output_status: ${contract.completion_output_status}
${gate}
required_user_visible_status: ${contract.required_user_visible_status}
final_answer_allowed: ${contract.final_answer_allowed}
exit_code: ${contract.exit_code}
product_goal_complete: ${contract.product_goal_complete}
acceptance_target_status: ${contract.acceptance_target_status}
audit_task_complete: ${state.final.audit_task_complete}

${auditLine}

Reasons:
${reasonBlock}
`;
}
