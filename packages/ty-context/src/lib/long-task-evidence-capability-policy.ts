import type {
  CompiledCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityRecordV2,
  EvidenceCapabilityV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { validateRuntimeEvidenceRecord } from "./long-task-evidence-capability-runtime.js";
import { checkFinding } from "./long-task-evidence-findings.js";

export { decodeEvidenceCapabilityRecords } from "./long-task-evidence-capability-codec.js";

type Reporter = (message: string) => void;

export function validateEvidenceCapabilityDeclarations(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  const targets = new Map(
    contract.task.execution_targets.map((target) => [target.key, target]),
  );
  for (const [outcomeKey, check] of allChecks(contract)) {
    unique(
      check.journey_roles,
      "journey_role_duplicate",
      checkLabel(outcomeKey, check.key),
      report,
    );
    if (!check.journey_roles.length)
      issue(report, "journey_role_required", checkLabel(outcomeKey, check.key));
    validateScenario(check, outcomeKey, report);
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ]) {
      const label = `${checkLabel(outcomeKey, check.key)}:${assertion.key}`;
      unique(
        assertion.evidence_capabilities,
        "evidence_capability_duplicate",
        label,
        report,
      );
      if (!assertion.evidence_capabilities.length)
        issue(report, "evidence_capability_required", label);
      if (
        assertion.claims.length &&
        check.proof_surface !== "implementation_structure" &&
        assertion.evidence_capabilities.every(
          (capability) => capability === "presence",
        )
      )
        issue(report, "presence_cannot_prove_behavior", label);
      if (
        assertion.operator === "exists" &&
        !assertion.evidence_capabilities.includes("presence")
      )
        issue(report, "exists_requires_presence_capability", label);
      if (
        assertion.evidence_capabilities.includes("visual_render") &&
        !check.artifact_globs.length
      )
        issue(report, "visual_render_artifact_required", label);
      if (
        assertion.evidence_capabilities.includes("design_conformance") &&
        !check.artifact_globs.length
      )
        issue(report, "design_conformance_artifact_required", label);
      if (
        assertion.evidence_capabilities.includes("interaction_trace") &&
        !check.scenario.when.length
      )
        issue(report, "interaction_trace_actions_required", label);
      if (
        check.runner.type === "playwright_test" &&
        assertion.evidence_capabilities.some(
          (capability) =>
            capability !== "presence" &&
            capability !== "interaction_trace" &&
            capability !== "design_conformance" &&
            capability !== "target_runtime",
        )
      )
        issue(report, "playwright_evidence_capability_unsupported", label);
      if (
        ["boundary_invocation", "external_side_effect"].some((capability) =>
          assertion.evidence_capabilities.includes(
            capability as EvidenceCapabilityV2,
          ),
        ) &&
        targets.get(check.execution_target.target_ref)?.role !== "observer"
      )
        issue(report, "observer_check_target_required", label);
    }
  }
  validateJourneySeparation(contract, report);
}

function validateScenario(
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
  outcomeKey: string | null,
  report?: Reporter,
): void {
  const label = checkLabel(outcomeKey, check.key);
  if (!check.scenario.given.length)
    issue(report, "scenario_given_required", label);
  if (!check.scenario.when.length)
    issue(report, "scenario_when_required", label);
  unique(
    check.scenario.given.map((step) => step.key),
    "scenario_given_key_duplicate",
    label,
    report,
  );
  unique(
    check.scenario.when.map((step) => step.key),
    "scenario_when_key_duplicate",
    label,
    report,
  );
}

function validateJourneySeparation(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  for (const outcome of contract.outcomes) {
    for (const check of outcome.acceptance.checks)
      if (
        check.journey_roles.includes("success") &&
        check.journey_roles.includes("degradation")
      )
        issue(
          report,
          "success_degradation_check_must_be_distinct",
          `${outcome.key}:${check.key}`,
        );
    if (
      outcome.product.success_path_required &&
      !outcome.acceptance.checks.some((check) =>
        check.journey_roles.includes("success"),
      )
    )
      issue(report, "success_path_check_required", outcome.key);
    if (
      outcome.product.degradation_path_required &&
      !outcome.acceptance.checks.some((check) =>
        check.journey_roles.includes("degradation"),
      )
    )
      issue(report, "degradation_path_check_required", outcome.key);
    for (const check of outcome.acceptance.checks) {
      const provesResult = [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ].some((assertion) => assertion.claims.includes("result"));
      if (provesResult && !check.journey_roles.includes("success"))
        issue(
          report,
          "result_claim_requires_success_journey",
          `${outcome.key}:${check.key}`,
        );
    }
  }
}

export function evaluateEvidenceCapabilities(
  check: CompiledCheckV2,
  records: EvidenceCapabilityRecordV2[],
  artifactHashes: Record<string, string>,
): {
  complete: Record<string, boolean>;
  findings: LongTaskFindingV2[];
} {
  const runtimeRecords = records ?? [];
  const complete: Record<string, boolean> = {};
  const findings: LongTaskFindingV2[] = [];
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const assertionsByKey = new Map(
    assertions.map((assertion) => [assertion.key, assertion]),
  );
  for (const record of runtimeRecords) {
    const assertion = assertionsByKey.get(record.assertion_key);
    const reason = !assertion
      ? "assertion_unknown"
      : !assertion.evidence_capabilities.includes(record.capability)
        ? "capability_undeclared"
        : null;
    if (!reason) continue;
    findings.push({
      ...checkFinding(
        check,
        "evidence_capability_invalid",
        `Evidence record ${record.assertion_key}:${record.capability} is not bound to a declared Assertion capability: ${reason}.`,
        "Emit records only for capabilities declared by Assertions in this Check.",
      ),
      assertion_key: record.assertion_key,
      claim_keys: assertion?.claims ?? [],
      expected: "declared_assertion_capability",
      actual: reason,
    });
  }
  for (const assertion of assertions) {
    let assertionComplete = true;
    for (const capability of assertion.evidence_capabilities) {
      if (capability === "presence") continue;
      const matches = runtimeRecords.filter(
        (record) =>
          record.assertion_key === assertion.key &&
          record.capability === capability,
      );
      const reason =
        matches.length === 1
          ? validateRuntimeEvidenceRecord(check, matches[0], artifactHashes)
          : matches.length === 0
            ? "record_missing"
            : "record_duplicate";
      if (!reason) continue;
      assertionComplete = false;
      findings.push({
        ...checkFinding(
          check,
          "evidence_capability_invalid",
          `Assertion ${assertion.key} did not provide valid ${capability} evidence: ${reason}.`,
          "Make the current Check execution emit one valid typed evidence record for the declared capability.",
        ),
        assertion_key: assertion.key,
        claim_keys: assertion.claims,
        expected: capability,
        actual: reason,
      });
    }
    complete[assertion.key] = assertionComplete;
  }
  return { complete, findings };
}

function allChecks(contract: DeliveryContractV2) {
  return [
    ...contract.global.acceptance.checks.map((check) => [null, check] as const),
    ...contract.outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map((check) => [outcome.key, check] as const),
    ),
  ];
}

function checkLabel(outcomeKey: string | null, checkKey: string): string {
  return `${outcomeKey ?? "GLOBAL"}:${checkKey}`;
}

function unique(
  values: string[],
  code: string,
  detail: string,
  report?: Reporter,
): void {
  if (new Set(values).size !== values.length) issue(report, code, detail);
}

function issue(
  report: Reporter | undefined,
  code: string,
  detail: string,
): void {
  const message = `delivery_contract_invalid:${code}:${detail}`;
  if (report) report(message);
  else throw new Error(message);
}
