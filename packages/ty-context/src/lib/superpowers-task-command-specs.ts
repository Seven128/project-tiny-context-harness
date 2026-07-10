import { sha256, stableJson } from "./stable-json.js";
import type { RequiredCommandSpec, SuperpowersAcceptanceCriterion, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function deriveRequiredCommandSpecs(state: SuperpowersTaskState): RequiredCommandSpec[] {
  return deriveRequiredCommandSpecsFromAcceptanceCriteria(state.graph.acceptance_criteria);
}
export function deriveRequiredCommandSpecsFromAcceptanceCriteria(
  acceptanceCriteria: Record<string, SuperpowersAcceptanceCriterion>
): RequiredCommandSpec[] {
  return Object.entries(acceptanceCriteria).flatMap(([acId, ac]) => {
    const proofLayers = [...new Set((ac.required_proof_layers ?? []).filter(Boolean))];
    if (proofLayers.length === 0) {
      return [];
    }
    const spec: Omit<RequiredCommandSpec, "command_spec_id"> = {
      ac_id: acId,
      proof_layers: proofLayers,
      command: ac.assertion_command ?? "",
      assertion_artifacts: ac.assertion_artifacts ?? [],
      required_test_ids: ac.required_test_ids ?? [],
      machine_blocking: ac.machine_blocking !== false,
      assertion_result_required: ac.assertion_result_required !== false,
      positive_assertions: ac.positive_assertions ?? [],
      negative_assertions: ac.negative_assertions ?? [],
      invalid_completion_signals: ac.invalid_completion_signals ?? [],
      final_evidence_expected: ac.final_evidence_expected ?? []
    };
    return [{ command_spec_id: commandSpecId(spec), ...spec }];
  });
}

export function requiredCommandSpecsHash(specs: RequiredCommandSpec[]): string {
  return sha256(
    stableJson(
      specs.map((spec) => ({
        ...spec,
        proof_layers: [...(spec.proof_layers ?? [])].sort(),
        assertion_artifacts: [...(spec.assertion_artifacts ?? [])].sort(),
        required_test_ids: [...(spec.required_test_ids ?? [])].sort(),
        positive_assertions: [...(spec.positive_assertions ?? [])].sort(),
        negative_assertions: [...(spec.negative_assertions ?? [])].sort(),
        invalid_completion_signals: [...(spec.invalid_completion_signals ?? [])].sort(),
        final_evidence_expected: [...(spec.final_evidence_expected ?? [])].sort()
      }))
    )
  );
}

function commandSpecId(spec: Omit<RequiredCommandSpec, "command_spec_id">): string {
  return sha256(
    [
      spec.ac_id,
      spec.proof_layers.join(","),
      spec.command,
      spec.assertion_artifacts.join(","),
      spec.required_test_ids.join(","),
      spec.positive_assertions.join(","),
      spec.negative_assertions.join(","),
      spec.invalid_completion_signals.join(","),
      spec.final_evidence_expected.join(",")
    ].join("\n")
  );
}
