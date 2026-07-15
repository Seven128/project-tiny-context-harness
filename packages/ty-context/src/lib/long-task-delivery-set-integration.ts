import type {
  CheckExecutionResultV1,
  CompiledCheckV1,
  LongTaskFindingV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
import {
  executeCheckRunner,
  type RunnerEvidenceV1,
} from "./long-task-check-runner.js";
import { evaluateCheckEvidence } from "./long-task-evidence-v1.js";
import { matchesRepoPattern } from "./long-task-paths.js";

export async function runDeliverySetIntegrationChecks(
  checks: CompiledCheckV1[],
  manifest: WorkspaceManifestV1,
  snapshotRoot: string,
): Promise<{
  results: CheckExecutionResultV1[];
  findings: LongTaskFindingV1[];
}> {
  const evidence = new Map<string, RunnerEvidenceV1>();
  const results: CheckExecutionResultV1[] = [];
  const findings: LongTaskFindingV1[] = [];
  for (const check of checks) {
    for (const pattern of check.expected_output_paths)
      if (
        !manifest.files.some((file) => matchesRepoPattern(file.path, pattern))
      )
        findings.push({
          code: "expected_output_path_missing",
          outcome_key: null,
          check_key: check.key,
          message: `Expected integration output path did not exist: ${pattern}`,
          expected: pattern,
          next_action: "Create the declared output and rerun Final Gate.",
        });
    let run = evidence.get(check.runner.execution_identity);
    if (!run) {
      run = await executeCheckRunner(check, snapshotRoot);
      evidence.set(check.runner.execution_identity, run);
    }
    const result = evaluateCheckEvidence(check, run);
    results.push(result);
    findings.push(...result.findings);
  }
  return { results, findings };
}
