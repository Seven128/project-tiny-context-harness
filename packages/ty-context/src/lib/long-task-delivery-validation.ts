import type { DeliveryContractV1 } from "./long-task-delivery-types.js";
import { fail } from "./long-task-delivery-shape.js";

export function validateDeliveryContractStructure(
  contract: DeliveryContractV1,
): void {
  validateUniqueKeys(contract);
  validateDependencies(contract);
}

function validateUniqueKeys(contract: DeliveryContractV1): void {
  unique(
    contract.outcomes.map((outcome) => outcome.key),
    "outcome_key_duplicate",
  );
  const checks = [
    ...contract.global.acceptance.checks.map((check) => check.key),
    ...contract.outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map((check) => check.key),
    ),
  ];
  unique(checks, "check_key_duplicate");
  const controls = contract.outcomes.flatMap((outcome) =>
    outcome.product.controls.map((control) => control.key),
  );
  unique(controls, "control_key_duplicate");
}

function unique(values: string[], code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(code, value);
    seen.add(value);
  }
}

function validateDependencies(contract: DeliveryContractV1): void {
  const outcomes = new Map(
    contract.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const outcome of contract.outcomes)
    for (const dependency of outcome.depends_on) {
      if (dependency === outcome.key)
        fail("outcome_dependency_self", outcome.key);
      if (!outcomes.has(dependency))
        fail("outcome_dependency_unknown", `${outcome.key}:${dependency}`);
    }
  validateDependencyCycles(outcomes);
}

function validateDependencyCycles(
  outcomes: Map<string, DeliveryContractV1["outcomes"][number]>,
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (keyValue: string): void => {
    if (visiting.has(keyValue)) fail("outcome_dependency_cycle", keyValue);
    if (visited.has(keyValue)) return;
    visiting.add(keyValue);
    for (const dependency of outcomes.get(keyValue)!.depends_on)
      visit(dependency);
    visiting.delete(keyValue);
    visited.add(keyValue);
  };
  for (const outcome of outcomes.keys()) visit(outcome);
}
