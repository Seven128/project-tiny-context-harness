import { cp, copyFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  evaluateDeliveryAssertion,
  evaluatePopulation,
} from "./long-task-assertions-v1.js";
import {
  executeCheckRunner,
  type RunnerEvidenceV1,
} from "./long-task-check-runner.js";
import type {
  CheckExecutionResultV1,
  CompiledCheckV1,
  CompiledOutcomeV1,
  LongTaskFindingV1,
} from "./long-task-delivery-types.js";
import { resolveInsideRepository } from "./long-task-workspace.js";

export function evaluateCheckEvidence(
  check: CompiledCheckV1,
  evidence: RunnerEvidenceV1,
  outcome?: CompiledOutcomeV1,
): CheckExecutionResultV1 {
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const results = assertions.map((assertion) =>
    evaluateDeliveryAssertion(assertion, evidence.observations),
  );
  const findings: LongTaskFindingV1[] = [];
  if (evidence.status === "blocked_external")
    findings.push(
      finding(
        check,
        "blocked_external",
        evidence.error ?? "external requirement unavailable",
        "Satisfy the declared environment requirement and rerun this Check.",
      ),
    );
  if (evidence.status === "completed" && evidence.exit_code !== 0)
    findings.push(
      finding(
        check,
        "verification_command_failed",
        `command exited ${evidence.exit_code}`,
        "Fix the implementation or declared verification command, then rerun this Check.",
      ),
    );
  if (evidence.error && evidence.status === "completed")
    findings.push(
      finding(
        check,
        "verification_evidence_invalid",
        evidence.error,
        "Make the declared runner emit valid long-task-check-result-v1 evidence.",
      ),
    );
  results.forEach((passed, index) => {
    if (!passed)
      findings.push(
        finding(
          check,
          "assertion_failed",
          `assertion ${index} failed`,
          "Fix the observable behavior or the Contract assertion, then rerun this Check.",
        ),
      );
  });
  const population = outcome?.acceptance.population;
  if (population?.check_key === check.key) {
    const result = evaluatePopulation(population, evidence.observations);
    if (!result.passed)
      findings.push({
        ...finding(
          check,
          "population_coverage_failed",
          "full population coverage was not proven",
          "Fix the enumerator/coverage behavior and rerun the population Check.",
        ),
        expected: { required_coverage_percent: 100 },
        actual: result.actual,
      });
  }
  const status =
    evidence.status === "blocked_external"
      ? "blocked_external"
      : findings.length
        ? "failed"
        : "passed";
  return {
    internal_id: check.internal_id,
    outcome_key: check.outcome_key,
    check_key: check.key,
    status,
    execution_identity: check.runner.execution_identity,
    assertion_results: results,
    observations: evidence.observations,
    findings,
    attempts: evidence.attempts,
    duration_ms: evidence.duration_ms,
  };
}

export async function evaluateOutcomeCounterfactuals(
  outcome: CompiledOutcomeV1,
  snapshotRoot: string,
): Promise<LongTaskFindingV1[]> {
  const findings: LongTaskFindingV1[] = [];
  for (const [
    index,
    control,
  ] of outcome.acceptance.counterfactual_controls.entries()) {
    const check = outcome.acceptance.checks.find(
      (item) => item.key === control.check_key,
    )!;
    const root = await mkdtemp(
      path.join(os.tmpdir(), "ty-context-counterfactual-"),
    );
    try {
      await cp(snapshotRoot, root, { recursive: true, force: true });
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
      const result = evaluateCheckEvidence(
        check,
        await executeCheckRunner(check, root),
        outcome,
      );
      if (result.status === "passed")
        findings.push({
          code: "counterfactual_did_not_fail",
          outcome_key: outcome.key,
          check_key: check.key,
          message: `counterfactual control ${index} still passed`,
          next_action:
            "Strengthen the implementation proof or counterfactual mutation so the declared shortcut is falsifiable.",
        });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  return findings;
}

function finding(
  check: CompiledCheckV1,
  code: string,
  message: string,
  nextAction: string,
): LongTaskFindingV1 {
  return {
    code,
    outcome_key: check.outcome_key,
    check_key: check.key,
    message,
    next_action: nextAction,
  };
}
