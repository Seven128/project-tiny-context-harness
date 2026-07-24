import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsDesignResourceHandoff } from "./design-resource-handoff-parser.js";
import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceHandoffTargetV1,
} from "./design-resource-handoff-types.js";
import { preflightDesignResourceHandoff } from "./design-resource-handoff-validation.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

interface ContractDesignTarget {
  outcome_key: string;
  binding: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number];
  target: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number]["design_targets"][number];
}

interface IndexedHandoffTarget {
  preflight: DesignResourceHandoffPreflightV1;
  target: DesignResourceHandoffTargetV1;
}

export async function validateLongTaskDesignResourceHandoffs(
  contract: DeliveryContractV2,
  repository: string,
): Promise<void> {
  const handoffs = await loadHandoffs(contract, repository);
  const indexed = indexHandoffTargets(handoffs);
  const contractTargets = contract.outcomes.flatMap((outcome) =>
    outcome.product.surface_bindings.flatMap((binding) =>
      binding.design_targets.map((target) => ({
        outcome_key: outcome.key,
        binding,
        target,
      })),
    ),
  );
  const consumed = new Set<string>();
  for (const contractTarget of contractTargets) {
    const indexedTarget = indexed.get(contractTarget.target.key);
    if (!indexedTarget)
      invalid("target_handoff_missing", contractTarget.target.key);
    consumed.add(contractTarget.target.key);
    validateTargetIdentity(contractTarget, indexedTarget);
    validateCoverageClaims(contract, contractTarget, indexedTarget);
    validateBlockerBindings(contractTarget, indexedTarget);
  }
  for (const key of indexed.keys())
    if (!consumed.has(key)) invalid("handoff_target_unbound", key);
}

async function loadHandoffs(
  contract: DeliveryContractV2,
  repository: string,
): Promise<DesignResourceHandoffPreflightV1[]> {
  const results: DesignResourceHandoffPreflightV1[] = [];
  for (const sourcePath of contract.task.source_paths) {
    if (!sourcePath.toLowerCase().endsWith(".md")) continue;
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...sourcePath.split("/")),
      `design_resource_handoff_source:${sourcePath}`,
    );
    const content = await readFile(file, "utf8");
    if (containsDesignResourceHandoff(content))
      results.push(await preflightDesignResourceHandoff(repository, sourcePath));
  }
  return results;
}

function indexHandoffTargets(
  handoffs: DesignResourceHandoffPreflightV1[],
): Map<string, IndexedHandoffTarget> {
  const indexed = new Map<string, IndexedHandoffTarget>();
  for (const preflight of handoffs)
    for (const target of preflight.handoff.targets) {
      if (indexed.has(target.key))
        invalid("handoff_target_duplicate", target.key);
      indexed.set(target.key, { preflight, target });
    }
  return indexed;
}

function validateTargetIdentity(
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const { target } = contractTarget;
  const handoffTarget = indexed.target;
  if (target.interpretation !== handoffTarget.interpretation)
    invalid(
      "target_interpretation_mismatch",
      `${target.key}:${target.interpretation}:${handoffTarget.interpretation}`,
    );
  assertSameSet(
    target.condition_keys,
    handoffTarget.condition_refs,
    "target_conditions_mismatch",
    target.key,
  );
  const resourcePaths = handoffTarget.resource_refs.map(
    (ref) =>
      indexed.preflight.handoff.resources.find((item) => item.key === ref)!.path,
  );
  assertSameSet(
    target.source_paths,
    [indexed.preflight.handoff_path, ...resourcePaths],
    "target_source_paths_mismatch",
    target.key,
  );
}

function validateCoverageClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const target = contractTarget.target;
  const check = contract.outcomes
    .find((item) => item.key === contractTarget.outcome_key)!
    .acceptance.checks.find(
      (item) => item.key === target.conformance_check_ref,
    )!;
  const assertion = check.positive_assertions.find(
    (item) => item.key === target.conformance_assertion_ref,
  )!;
  const claims = new Map(contract.source_claims.map((item) => [item.key, item]));
  const rows = indexed.preflight.handoff.coverage.filter(
    (row) =>
      row.disposition === "covered" && row.target_refs.includes(target.key),
  );
  if (!rows.length) invalid("target_covered_claims_required", target.key);
  for (const row of rows)
    for (const sourceItemRef of row.source_item_refs) {
      const claim = claims.get(sourceItemRef);
      if (!claim)
        invalid(
          "coverage_source_claim_unknown",
          `${target.key}:${sourceItemRef}`,
        );
      if (claim.source_ref.split("#")[0] !== indexed.preflight.handoff_path)
        invalid(
          "coverage_source_claim_file_mismatch",
          `${target.key}:${sourceItemRef}`,
        );
      if (claim.disposition.type !== "claim")
        invalid(
          "coverage_source_claim_disposition_required",
          `${target.key}:${sourceItemRef}:${claim.disposition.type}`,
        );
      for (const claimRef of claim.disposition.refs) {
        const prefix = `${contractTarget.outcome_key}.`;
        if (!claimRef.startsWith(prefix))
          invalid(
            "coverage_claim_outcome_mismatch",
            `${target.key}:${sourceItemRef}:${claimRef}`,
          );
        const localClaimRef = claimRef.slice(prefix.length);
        if (!assertion.claims.includes(localClaimRef))
          invalid(
            "coverage_claim_not_in_conformance_assertion",
            `${target.key}:${sourceItemRef}:${claimRef}`,
          );
      }
    }
}

function validateBlockerBindings(
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const bound = new Set(
    contractTarget.binding.acceptance_blockers.map((item) => item.key),
  );
  for (const blocker of indexed.preflight.handoff.acceptance_blockers)
    if (blocker.target_refs.includes(contractTarget.target.key) && !bound.has(blocker.key))
      invalid(
        "acceptance_blocker_unbound",
        `${contractTarget.target.key}:${blocker.key}`,
      );
}

function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalid(code, `${detail}:${left.join(",")}:${right.join(",")}`);
}

function invalid(code: string, detail: string): never {
  throw new Error(`delivery_contract_invalid:design_resource_${code}:${detail}`);
}
