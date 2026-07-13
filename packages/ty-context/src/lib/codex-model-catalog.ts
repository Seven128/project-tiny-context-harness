import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CodexModelDescriptor } from "./codex-app-server-protocol.js";

export interface NormalizedModelDescriptor {
  id: string;
  model: string;
  upgrade: string | null;
  hidden: boolean;
  efforts: string[];
  defaultEffort: string | null;
}

export interface CodexModelCatalog {
  models: NormalizedModelDescriptor[];
  sha256: string;
}

export function buildModelCatalog(values: CodexModelDescriptor[]): CodexModelCatalog {
  const models = values.map(normalizeModel).sort((left, right) => ascii(left.model, right.model) || ascii(left.id, right.id));
  if (new Set(models.map((item) => item.model)).size !== models.length) throw new Error("codex_model_catalog_invalid:duplicate_model");
  return { models, sha256: sha256Hex(canonicalValueJson(models)) };
}

export function normalizeModel(value: CodexModelDescriptor): NormalizedModelDescriptor {
  if (!value || typeof value.id !== "string" || typeof value.model !== "string") throw new Error("codex_model_catalog_invalid:model");
  const efforts = (value.supportedReasoningEfforts ?? []).map((item) => typeof item === "string" ? item : item.reasoningEffort);
  const upgrade = value.upgradeInfo?.model ?? value.upgrade ?? null;
  return {
    id: value.id,
    model: value.model,
    upgrade,
    hidden: value.hidden === true,
    efforts: [...new Set(efforts)].sort(ascii),
    defaultEffort: typeof value.defaultReasoningEffort === "string" ? value.defaultReasoningEffort : null
  };
}

export function catalogModel(catalog: CodexModelCatalog, model: string): NormalizedModelDescriptor | null {
  const exact = catalog.models.find((item) => item.model === model || item.id === model);
  if (exact) return exact;
  if (model === "gpt-5.6") return catalog.models.find((item) => item.model === "gpt-5.6-sol") ?? null;
  return null;
}

export function canonicalCatalogModel(catalog: CodexModelCatalog, model: string): string | null {
  return catalogModel(catalog, model)?.model ?? null;
}

export function catalogSupports(catalog: CodexModelCatalog, model: string, effort: string): boolean {
  const descriptor = catalogModel(catalog, model);
  return Boolean(descriptor && !descriptor.hidden && descriptor.efforts.includes(effort));
}

export function isCatalogSuccessor(catalog: CodexModelCatalog, candidate: string, ancestor: string): boolean {
  const resolvedCandidate = canonicalCatalogModel(catalog, candidate);
  const resolvedAncestor = canonicalCatalogModel(catalog, ancestor);
  if (!resolvedCandidate || !resolvedAncestor || resolvedCandidate === resolvedAncestor) return false;
  const seen = new Set<string>();
  let current: string | null = resolvedAncestor;
  while (current && !seen.has(current)) {
    seen.add(current);
    const next: string | null = catalogModel(catalog, current)?.upgrade ?? null;
    if (!next) return false;
    const resolved: string | null = canonicalCatalogModel(catalog, next);
    if (!resolved) return false;
    if (resolved === resolvedCandidate) return true;
    current = resolved;
  }
  return false;
}

function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
