export async function finalGateLongTaskViaHost() {
  return {
    schema_version: "ty-context-host-final-result-summary-v1",
    contract_sha256: "a".repeat(64),
    run_id: "RUN-HFC012-BLOCKED",
    workflow_status: "externally_blocked",
    findings_count: 0,
    final_result_path: "final-result.json",
    external_blocker: {
      environment_requirement_ids: ["ER-HFC012"],
      reason_codes: ["mfa_required"],
      minimal_user_action: "Complete the frozen MFA approval and rerun final-gate."
    }
  };
}

export async function compileAndSealLongTaskContractViaHost() {
  throw new Error("unexpected_compile");
}

export async function verifyLongTaskViaHost() {
  throw new Error("unexpected_verify");
}
