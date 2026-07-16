import type { CompiledCheckV2 } from "./long-task-delivery-types.js";

export function validateRawExecutionObservationOwnership(
  checks: CompiledCheckV2[],
): void {
  const byExecution = new Map<string, Map<string, string>>();
  for (const check of checks) {
    let observations = byExecution.get(check.raw_execution_identity);
    if (!observations) {
      observations = new Map();
      byExecution.set(check.raw_execution_identity, observations);
    }
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ]) {
      if (!assertion.claims.length) continue;
      const owner = `${check.outcome_key ?? "GLOBAL"}.${check.key}.${assertion.key}`;
      const previous = observations.get(assertion.observation);
      if (previous)
        throw new Error(
          `raw_execution_observation_reused:${check.raw_execution_identity}:${assertion.observation}:${previous}:${owner}`,
        );
      observations.set(assertion.observation, owner);
    }
  }
}
