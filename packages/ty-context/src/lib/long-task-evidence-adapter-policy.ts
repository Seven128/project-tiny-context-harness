import type {
  DeliveryCheckV2,
  EvidenceAdapter,
  ProofSurface,
  RunnerType,
} from "./long-task-delivery-types.js";

export function evidenceAdapterForRunner(type: RunnerType): EvidenceAdapter {
  return type === "playwright_test"
    ? "playwright_json_v1"
    : "structured_json_v2";
}

export function validateEvidenceAdapterCompatibility(
  check: DeliveryCheckV2,
  outcomeKey: string | null,
): void {
  const adapter = evidenceAdapterForRunner(check.runner.type);
  if (!adapterSupportsProofSurface(adapter, check.proof_surface))
    throw new Error(
      `evidence_adapter_mismatch:${outcomeKey ?? "GLOBAL"}:${check.key}:${check.proof_surface}:${adapter}`,
    );
}

export function adapterSupportsProofSurface(
  adapter: EvidenceAdapter,
  surface: ProofSurface,
): boolean {
  return surface === "ui_browser"
    ? adapter === "playwright_json_v1"
    : adapter === "structured_json_v2";
}
