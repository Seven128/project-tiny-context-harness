export const CANONICAL_PROOF_LAYERS = [
  "code",
  "api_schema",
  "worker_runtime",
  "data_artifact",
  "integration",
  "ui_browser",
  "security_redaction",
  "all_provider_all_runner",
  "cleanup_stale_scan",
  "test"
] as const;

export const LEGACY_PROOF_LAYER_ALIASES: Record<string, string> = {
  runtime: "worker_runtime",
  browser: "ui_browser",
  api: "api_schema",
  data: "data_artifact",
  security: "security_redaction"
};

export const MACHINE_VERIFIABLE_LAYER_NAMES: Set<string> = new Set(
  CANONICAL_PROOF_LAYERS.filter((layer) => layer !== "code")
);
export const MACHINE_VERIFIABLE_PROOF_LAYERS = new Set(MACHINE_VERIFIABLE_LAYER_NAMES);

export function normalizeProofLayerName(layer: string): string {
  const normalized = layer.trim().toLowerCase().replace(/[- ]+/g, "_");
  return LEGACY_PROOF_LAYER_ALIASES[normalized] ?? normalized;
}

export function normalizeProofLayerId(layerId: string): string {
  const value = layerId.trim();
  if (!value.includes(".")) {
    return normalizeProofLayerName(value);
  }
  const acId = value.slice(0, value.lastIndexOf("."));
  const layer = value.slice(value.lastIndexOf(".") + 1);
  return `${acId}.${normalizeProofLayerName(layer)}`;
}

export function proofLayerName(layerId: string): string {
  const raw = layerId.includes(".") ? layerId.slice(layerId.lastIndexOf(".") + 1) : layerId;
  return normalizeProofLayerName(raw);
}

export function proofLayerAcId(layerId: string): string {
  return layerId.includes(".") ? layerId.slice(0, layerId.lastIndexOf(".")) : "";
}

export function isMachineVerifiableLayer(layerId: string): boolean {
  return MACHINE_VERIFIABLE_PROOF_LAYERS.has(proofLayerName(layerId));
}

export function isUiBrowserLayer(layerId: string): boolean {
  return proofLayerName(layerId) === "ui_browser";
}
