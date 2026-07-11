import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { LongTaskFindingV2, VerificationRunResultV2 } from "./long-task-run-result.js";

const ALLOWED = new Set(["mfa_required", "credential_unavailable", "permission_denied", "user_contract_decision_required", "external_approval_required", "platform_or_legal_restriction", "external_service_persistently_unavailable"]);

export function classifyExternalBlocker(run: VerificationRunResultV2, contract: CompiledContractV3): { externally_blocked: boolean; findings: LongTaskFindingV2[]; minimal_user_action?: string } {
  const blocked = run.spec_results.filter((result) => result.status === "blocked"); const failed = run.spec_results.filter((result) => result.status === "failed");
  if (blocked.length === 0 || failed.length > 0) return { externally_blocked: false, findings: run.findings };
  for (const result of blocked) { const blocker = result.external_blocker; const spec = contract.verification_specs.find((item) => item.id === result.spec_id); const frozen = spec?.environment_requirements.find((item) => item.id === blocker?.environment_requirement_id); if (!blocker || !frozen || !ALLOWED.has(blocker.reason_code) || frozen.reason_code !== blocker.reason_code) return { externally_blocked: false, findings: [...run.findings, forged(result.spec_id)] }; }
  const actions = [...new Set(blocked.map((result) => result.external_blocker!.minimal_user_action))]; return { externally_blocked: true, findings: [], minimal_user_action: actions.join("; ") };
}
function forged(spec: string): LongTaskFindingV2 { return { category: "forged_externally_blocked", verification_spec_id: spec, expected: "fresh frozen-oracle blocker evidence", actual: "invalid blocker result", evidence_path: "latest verification result", next_action: "Fix the implementation or trusted environment probe", reverify_command: "ty-context composite-long-task final-gate" }; }
