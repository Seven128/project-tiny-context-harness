import type { ProofSurface } from "./long-task-delivery-types.js";
import {
  array,
  fail,
  literal,
  PROOF_SURFACES,
} from "./long-task-shape-primitives.js";

export function parseRequiredProofSurfaces(
  value: unknown,
  label: string,
): ProofSurface[] {
  const surfaces = array(value, label).map((surface, index) =>
    literal(surface, PROOF_SURFACES, `${label}[${index}]`),
  ) as ProofSurface[];
  if (!surfaces.length) fail("required_proof_surfaces_empty", label);
  const seen = new Set<ProofSurface>();
  for (const surface of surfaces) {
    if (seen.has(surface))
      fail("required_proof_surface_duplicate", `${label}:${surface}`);
    seen.add(surface);
  }
  return surfaces;
}
