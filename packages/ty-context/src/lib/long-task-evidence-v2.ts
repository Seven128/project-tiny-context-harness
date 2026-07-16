import { copyFile, cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  evaluateDeliveryAssertion,
  evaluatePopulation,
} from "./long-task-assertions-v2.js";
import { collectCheckArtifacts } from "./long-task-artifacts.js";
import { executeCheckRunner } from "./long-task-check-runner.js";
import type {
  CheckExecutionResultV2,
  ClaimProofV2,
  CompiledCheckV2,
  CompiledOutcomeV2,
  LongTaskFindingV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";
import { resolveInsideRepository } from "./long-task-workspace.js";

export async function evaluateCheckEvidence(
  check: CompiledCheckV2,
  raw: RawCommandExecutionV2,
  snapshotRoot: string,
  outcome?: CompiledOutcomeV2,
): Promise<CheckExecutionResultV2> {
  const artifacts = await collectCheckArtifacts(check, snapshotRoot);
  const assertions = [
    ...check.positive_assertions.map((assertion) => ({
      assertion,
      polarity: "positive" as const,
    })),
    ...check.negative_assertions.map((assertion) => ({
      assertion,
      polarity: "negative" as const,
    })),
  ];
  const assertionResults = assertions.map(({ assertion, polarity }) => ({
    key: assertion.key,
    polarity,
    passed: evaluateDeliveryAssertion(assertion, raw.observations),
    claims: assertion.claims,
  }));
  const findings: LongTaskFindingV2[] = [];
  if (raw.execution_status !== "completed")
    findings.push(
      finding(
        check,
        raw.execution_status,
        raw.error ?? raw.execution_status,
        raw.execution_status === "blocked_external"
          ? "Satisfy the declared Environment Requirement and rerun this Check."
          : "Repair the declared runner or evidence protocol and rerun this Check.",
      ),
    );
  if (raw.execution_status === "completed" && raw.exit_code !== 0)
    findings.push(
      finding(
        check,
        "test_failed",
        `command exited ${raw.exit_code}`,
        "Fix the implementation or declared verification command, then rerun this Check.",
      ),
    );
  if (raw.observations["playwright.zero_or_all_skipped"] === true)
    findings.push(
      finding(
        check,
        "test_failed",
        "Playwright executed zero tests or skipped every test.",
        "Make the declared Playwright target execute at least one non-skipped test.",
      ),
    );
  for (const error of artifacts.errors)
    findings.push(
      finding(
        check,
        "invalid_evidence",
        error,
        "Produce the artifact declared for this Check and rerun it.",
      ),
    );
  for (const result of assertionResults)
    if (!result.passed)
      findings.push(
        finding(
          check,
          "assertion_failed",
          `assertion ${result.key} failed`,
          "Fix the observable behavior or the Contract assertion, then rerun this Check.",
        ),
      );

  const population = outcome?.acceptance.population;
  let populationPassed = true;
  if (population?.check_key === check.key) {
    const result = evaluatePopulation(population, raw.observations);
    populationPassed = result.passed;
    if (!result.passed)
      findings.push({
        ...finding(
          check,
          "population_coverage_failed",
          result.reason ?? "full population coverage was not proven",
          "Fix entity enumeration/exclusion behavior and rerun the population Check.",
        ),
        expected: { coverage_percent: 100 },
        actual: result.actual,
      });
  }

  const status = classifyStatus(raw, findings);
  const claimProofs: ClaimProofV2[] = assertionResults
    .filter((result) => result.passed)
    .flatMap((result) =>
      result.claims.map((claim) => ({
        check_key: check.key,
        assertion_key: result.key,
        polarity: result.polarity,
        proof_surface: check.proof_surface,
      })),
    );
  if (population && population.check_key === check.key && populationPassed)
    claimProofs.push(
      ...population.claims.map((claim) => ({
        check_key: check.key,
        assertion_key: null,
        polarity: "population" as const,
        proof_surface: check.proof_surface,
      })),
    );
  return {
    internal_id: check.internal_id,
    outcome_key: check.outcome_key,
    check_key: check.key,
    status,
    execution_identity: check.runner.execution_identity,
    assertion_results: assertionResults,
    observations: raw.observations,
    artifact_hashes: artifacts.hashes,
    claim_proofs: claimProofs,
    findings,
    attempts: raw.attempts,
    duration_ms: raw.duration_ms,
  };
}

export async function evaluateOutcomeCounterfactuals(
  outcome: CompiledOutcomeV2,
  snapshotRoot: string,
): Promise<LongTaskFindingV2[]> {
  const findings: LongTaskFindingV2[] = [];
  for (const control of outcome.acceptance.counterfactual_controls) {
    const check = outcome.acceptance.checks.find(
      (item) => item.key === control.check_key,
    )!;
    const root = await mkdtemp(
      path.join(os.tmpdir(), "ty-context-counterfactual-"),
    );
    try {
      await cp(snapshotRoot, root, {
        recursive: true,
        force: true,
        dereference: false,
      });
      if (control.mutation.type === "remove_paths") {
        for (const target of control.mutation.paths)
          await rm(
            resolveInsideRepository(
              root,
              target,
              "counterfactual.remove_paths",
            ),
            { recursive: true, force: true },
          );
      } else {
        await copyFile(
          resolveInsideRepository(
            root,
            control.mutation.fixture_path,
            "counterfactual.fixture",
          ),
          resolveInsideRepository(
            root,
            control.mutation.path,
            "counterfactual.path",
          ),
        );
      }
      const raw = await executeCheckRunner(check, root);
      const result = await evaluateCheckEvidence(check, raw, root, outcome);
      const failedAssertions = result.assertion_results
        .filter((assertion) => !assertion.passed)
        .map((assertion) => assertion.key)
        .sort();
      const expected = [...control.expected_assertion_failures].sort();
      const onlyExpectedAssertionFailures =
        result.status === "assertion_failed" &&
        result.findings.length === expected.length &&
        result.findings.every(
          (finding) =>
            finding.code === "assertion_failed" &&
            expected.some((key) => finding.message === `assertion ${key} failed`),
        );
      const valid =
        raw.execution_status === "completed" &&
        raw.exit_code === 0 &&
        onlyExpectedAssertionFailures &&
        failedAssertions.length === expected.length &&
        failedAssertions.every((item, index) => item === expected[index]);
      if (!valid)
        findings.push({
          code: "counterfactual_integrity_failed",
          outcome_key: outcome.key,
          check_key: check.key,
          message: `Counterfactual ${control.key} did not fail exactly the designated Assertions.`,
          expected,
          actual: {
            execution_status: raw.execution_status,
            exit_code: raw.exit_code,
            result_status: result.status,
            failed_assertions: failedAssertions,
            finding_codes: result.findings.map((finding) => finding.code),
          },
          next_action:
            "Repair the carrier mutation or proof so only the designated Assertion failures demonstrate sensitivity.",
        });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  return findings;
}

function classifyStatus(
  raw: RawCommandExecutionV2,
  findings: LongTaskFindingV2[],
): CheckExecutionResultV2["status"] {
  if (raw.execution_status !== "completed") return raw.execution_status;
  if (
    raw.exit_code !== 0 ||
    findings.some((item) => item.code === "test_failed")
  )
    return "test_failed";
  if (findings.some((item) => item.code === "invalid_evidence"))
    return "invalid_evidence";
  if (
    findings.some(
      (item) =>
        item.code === "assertion_failed" ||
        item.code === "population_coverage_failed",
    )
  )
    return "assertion_failed";
  return "passed";
}

function finding(
  check: CompiledCheckV2,
  code: string,
  message: string,
  nextAction: string,
): LongTaskFindingV2 {
  return {
    code,
    outcome_key: check.outcome_key,
    check_key: check.key,
    message,
    next_action: nextAction,
  };
}
