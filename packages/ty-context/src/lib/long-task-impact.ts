import type { CompiledContractV3 } from "./long-task-contract-schema.js";

export interface ImpactDecision {
  mode: "affected" | "all";
  verification_spec_ids: string[];
  reason: string;
}
export function decideLongTaskImpact(
  contract: CompiledContractV3,
  changedPaths: string[],
): ImpactDecision {
  const all = contract.verification_specs.map((spec) => spec.id).sort();
  if (changedPaths.length === 0)
    return {
      mode: "all",
      verification_spec_ids: all,
      reason: "no trusted change basis",
    };
  const matched = contract.verification_specs.filter((spec) =>
    changedPaths.some((changed) =>
      spec.input_paths.some((glob) =>
        matches(changed.replace(/\\/g, "/"), glob),
      ),
    ),
  );
  if (matched.length === 0)
    return {
      mode: "all",
      verification_spec_ids: all,
      reason: "unmapped change requires conservative full verification",
    };
  const selected = [
    ...new Set(
      [
        ...matched,
        ...contract.verification_specs.filter((spec) => spec.global_invariant),
      ].map((spec) => spec.id),
    ),
  ].sort();
  return {
    mode: "affected",
    verification_spec_ids: selected,
    reason: "frozen input_paths matched current changes",
  };
}
function matches(value: string, glob: string): boolean {
  return new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")}$`,
    "i",
  ).test(value);
}
