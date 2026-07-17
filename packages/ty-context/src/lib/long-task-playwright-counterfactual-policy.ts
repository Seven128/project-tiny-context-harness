import type {
  CheckExecutionResultV2,
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";

export interface PlaywrightCounterfactualClassification {
  accepted_test_failure_exit: boolean;
  normalized_result: CheckExecutionResultV2;
  rejection_reasons: string[];
}

export function classifyPlaywrightCounterfactual(
  raw: RawCommandExecutionV2,
  result: CheckExecutionResultV2,
  control: CounterfactualControlV2 | GlobalCounterfactualControlV2,
): PlaywrightCounterfactualClassification {
  const reasons: string[] = [];
  const expected = [...new Set(control.expected_assertion_failures)].sort();
  if (expected.length !== control.expected_assertion_failures.length)
    reasons.push("expected_assertion_failures_duplicate");
  if (result.evidence_adapter !== "playwright_json_v1")
    reasons.push("evidence_adapter_not_playwright_json_v1");
  if (raw.execution_status !== "completed")
    reasons.push(`execution_status_${raw.execution_status}`);
  if (raw.exit_code === 0) reasons.push("exit_code_zero_with_test_failure");
  else if (raw.exit_code !== 1)
    reasons.push(`exit_code_not_expected_test_failure:${raw.exit_code}`);

  const reportErrorCount = count(
    raw.observations,
    "playwright.report_error_count",
    reasons,
  );
  const declaredUnexpectedInstances = count(
    raw.observations,
    "playwright.declared_unexpected_instances",
    reasons,
  );
  const unboundUnexpectedInstances = count(
    raw.observations,
    "playwright.unbound_unexpected_instances",
    reasons,
  );
  const reportUnexpectedInstances = count(
    raw.observations,
    "playwright.unexpected",
    reasons,
  );
  if (reportErrorCount !== null && reportErrorCount !== 0)
    reasons.push(`playwright_report_errors:${reportErrorCount}`);
  if (unboundUnexpectedInstances !== null && unboundUnexpectedInstances !== 0)
    reasons.push(
      `playwright_unbound_unexpected_instances:${unboundUnexpectedInstances}`,
    );

  const expectedCaseIds = new Set<string>();
  let expectedUnexpectedInstances = 0;
  for (const assertionKey of expected) {
    const assertion = result.assertion_results.find(
      (item) => item.key === assertionKey,
    );
    if (!assertion) {
      reasons.push(`expected_assertion_missing:${assertionKey}`);
      continue;
    }
    const caseId = playwrightCaseId(assertion.observation);
    if (!caseId) {
      reasons.push(`expected_assertion_not_playwright_ac:${assertionKey}`);
      continue;
    }
    if (expectedCaseIds.has(caseId))
      reasons.push(`expected_playwright_ac_duplicate:${caseId}`);
    expectedCaseIds.add(caseId);
    const prefix = `playwright.case.${caseId}`;
    if (boolean(raw.observations, `${prefix}.executed`) !== true)
      reasons.push(`expected_playwright_ac_not_executed:${caseId}`);
    if (boolean(raw.observations, `${prefix}.unexpected`) !== true)
      reasons.push(`expected_playwright_ac_not_unexpected:${caseId}`);
    if (boolean(raw.observations, `${prefix}.skipped`) !== false)
      reasons.push(`expected_playwright_ac_skipped:${caseId}`);
    if (boolean(raw.observations, `${prefix}.flaky`) !== false)
      reasons.push(`expected_playwright_ac_flaky:${caseId}`);
    const unexpectedInstances = count(
      raw.observations,
      `${prefix}.unexpected_instances`,
      reasons,
    );
    const timedOutInstances = count(
      raw.observations,
      `${prefix}.timed_out_instances`,
      reasons,
    );
    const interruptedInstances = count(
      raw.observations,
      `${prefix}.interrupted_instances`,
      reasons,
    );
    if (unexpectedInstances !== null) {
      expectedUnexpectedInstances += unexpectedInstances;
      if (unexpectedInstances === 0)
        reasons.push(
          `expected_playwright_ac_has_no_unexpected_instance:${caseId}`,
        );
    }
    if (timedOutInstances !== null && timedOutInstances !== 0)
      reasons.push(`expected_playwright_ac_timed_out:${caseId}`);
    if (interruptedInstances !== null && interruptedInstances !== 0)
      reasons.push(`expected_playwright_ac_interrupted:${caseId}`);
    if (assertion.passed || assertion.status !== "assertion_value_mismatch")
      reasons.push(`expected_assertion_not_value_mismatch:${assertionKey}`);
  }

  for (const assertion of result.assertion_results)
    if (!expected.includes(assertion.key) && !assertion.passed)
      reasons.push(`unspecified_assertion_failed:${assertion.key}`);

  if (
    declaredUnexpectedInstances !== null &&
    declaredUnexpectedInstances !== expectedUnexpectedInstances
  )
    reasons.push(
      `declared_unexpected_instance_mismatch:${declaredUnexpectedInstances}:${expectedUnexpectedInstances}`,
    );
  if (
    reportUnexpectedInstances !== null &&
    reportUnexpectedInstances !== expectedUnexpectedInstances
  )
    reasons.push(
      `report_unexpected_instance_mismatch:${reportUnexpectedInstances}:${expectedUnexpectedInstances}`,
    );

  const genericTestFailures = result.findings.filter(
    (finding) => finding.code === "test_failed" && !finding.assertion_key,
  );
  if (genericTestFailures.length !== 1)
    reasons.push(
      `generic_test_failure_count_unexpected:${genericTestFailures.length}`,
    );
  for (const finding of result.findings) {
    const expectedAcceptanceFailure =
      finding.code === "acceptance_case_unexpected" &&
      Boolean(finding.assertion_key) &&
      expected.includes(finding.assertion_key!);
    const genericTestFailure =
      finding.code === "test_failed" && !finding.assertion_key;
    if (!expectedAcceptanceFailure && !genericTestFailure)
      reasons.push(
        `unexplained_finding:${finding.code}:${finding.assertion_key ?? "none"}`,
      );
  }
  for (const assertionKey of expected)
    if (
      !result.findings.some(
        (finding) =>
          finding.code === "acceptance_case_unexpected" &&
          finding.assertion_key === assertionKey,
      )
    )
      reasons.push(`expected_acceptance_failure_missing:${assertionKey}`);

  const rejectionReasons = [...new Set(reasons)].sort();
  if (rejectionReasons.length)
    return {
      accepted_test_failure_exit: false,
      normalized_result: result,
      rejection_reasons: rejectionReasons,
    };
  return {
    accepted_test_failure_exit: true,
    normalized_result: {
      ...result,
      status: "assertion_failed",
      claim_proofs: [],
      findings: result.findings
        .filter(
          (finding) =>
            !(finding.code === "test_failed" && !finding.assertion_key),
        )
        .map((finding) =>
          finding.code === "acceptance_case_unexpected" &&
          finding.assertion_key &&
          expected.includes(finding.assertion_key)
            ? { ...finding, code: "assertion_value_mismatch" }
            : finding,
        ),
    },
    rejection_reasons: [],
  };
}

function playwrightCaseId(observation: string): string | null {
  return (
    /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.passed$/u.exec(
      observation,
    )?.[1] ?? null
  );
}

function count(
  observations: Record<string, unknown>,
  key: string,
  reasons: string[],
): number | null {
  const value = observations[key];
  if (!Number.isInteger(value) || Number(value) < 0) {
    reasons.push(`playwright_diagnostic_count_invalid:${key}`);
    return null;
  }
  return Number(value);
}

function boolean(
  observations: Record<string, unknown>,
  key: string,
): boolean | null {
  return typeof observations[key] === "boolean"
    ? (observations[key] as boolean)
    : null;
}
