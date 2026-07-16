import type {
  DeliveryOutcomeV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  PROOF_SURFACES,
  string,
} from "./long-task-shape-primitives.js";

export function parseRequirements(
  value: unknown,
  label: string,
): DeliveryOutcomeV2["product"]["requirements"] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "required_proof_surfaces",
    ]);
    const surfaces = array(
      row.required_proof_surfaces,
      `${itemLabel}.required_proof_surfaces`,
    ).map((surface, surfaceIndex) =>
      literal(
        surface,
        PROOF_SURFACES,
        `${itemLabel}.required_proof_surfaces[${surfaceIndex}]`,
      ),
    ) as ProofSurface[];
    if (!surfaces.length)
      fail(`${itemLabel}.required_proof_surfaces`, "must not be empty");
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      required_proof_surfaces: surfaces,
    };
  });
}
