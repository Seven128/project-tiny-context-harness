import { promises as fs } from "node:fs";
import path from "node:path";
import { readText } from "./fs.js";
import { isBlankish, primitiveText, valuesAsArray } from "./plan-validator-common.js";

export const MATRIX_STATUSES = new Set([
  "complete",
  "partial",
  "sampled_only",
  "not_implemented",
  "blocked",
  "scope_changed_requires_user_approval",
  "contradicted_by_current_state",
  "out_of_scope_NA"
]);

export const AC_STATUSES = new Set(["complete", "partial", "blocked", "not_run", "invalidated", "out_of_scope_NA"]);
export const NON_COMPLETE_MATRIX = new Set([
  "partial",
  "sampled_only",
  "not_implemented",
  "blocked",
  "scope_changed_requires_user_approval",
  "contradicted_by_current_state"
]);
export const NON_COMPLETE_AC = new Set(["partial", "blocked", "not_run", "invalidated"]);

export async function findJsonFile(targetDir: string, marker: string): Promise<string | undefined> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name.includes(marker))
    .map((entry) => path.join(targetDir, entry.name))
    .sort()[0];
}

export async function readJson(file: string, errors: string[]): Promise<unknown> {
  try {
    return JSON.parse(await readText(file));
  } catch (error) {
    errors.push(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export function findRows(value: unknown, preferredKeys: string[]): Record<string, unknown>[] {
  if (Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return value as Record<string, unknown>[];
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const object = value as Record<string, unknown>;
  for (const key of preferredKeys) {
    const rows = findRows(object[key], []);
    if (rows.length > 0) {
      return rows;
    }
  }
  return Object.values(object).map((item) => findRows(item, [])).sort((a, b) => b.length - a.length)[0] ?? [];
}

export function overallStatus(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const object = value as Record<string, unknown>;
  return String(object.overall_status ?? object.overallStatus ?? object.status ?? "").trim();
}

export function statusOf(row: Record<string, unknown>): string {
  return String(row.status ?? "").trim();
}

export function isOutOfScope(row: Record<string, unknown>): boolean {
  return statusOf(row) === "out_of_scope_NA" || /out[_ -]?of[_ -]?scope|n\/a|not applicable/i.test(primitiveText(row));
}

export function contextDeltaRequired(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const object = value as Record<string, unknown>;
  return [
    object.context_delta,
    object.contextDelta,
    object.product_context_delta,
    object.productContextDelta,
    object.technical_context_delta,
    object.technicalContextDelta
  ].some((item) => /\brequired\b/i.test(primitiveText(item)));
}

export function isSurfaceConformanceRow(row: Record<string, unknown>): boolean {
  return (
    /\b(product[_ -]?surface|surface|ia|information[_ -]?architecture|architecture[_ -]?migration|ui)\b/i.test(
      primitiveText(row.conformance_type)
    ) ||
    !isBlankish(row.owner_surface) ||
    !isBlankish(row.forbidden_primary_surfaces) ||
    !isBlankish(row.required_user_paths)
  );
}

export function hasExplicitNoTestScope(row: Record<string, unknown>): boolean {
  return /\b(no[- ]?test|no automated test|test out of scope|tests? not required)\b/i.test(
    primitiveText([row.test_scope, row.no_test_scope, row.tests])
  );
}

export function assertSurfaceConformance(row: Record<string, unknown>, label: string, errors: string[]): void {
  if (isBlankish(row.owner_surface)) {
    errors.push(`${label} is surface/architecture conformance but owner_surface is empty`);
  }
  if (isBlankish(row.required_user_paths)) {
    errors.push(`${label} is surface/architecture conformance but required_user_paths is empty`);
  }
  if (isBlankish(row.real_page_evidence)) {
    errors.push(`${label} is surface/architecture conformance but real_page_evidence is empty`);
  }
  if (isBlankish(row.context_fact_refs)) {
    errors.push(`${label} is surface/architecture conformance but context_fact_refs is empty`);
  }
  if (!isBlankish(row.forbidden_primary_surfaces) && isBlankish(row.negative_surface_checks)) {
    errors.push(`${label} declares forbidden_primary_surfaces but negative_surface_checks is empty`);
  }
  const userPathText = primitiveText([row.required_user_paths, row.primary_user_paths]);
  for (const forbiddenSurface of valuesAsArray(row.forbidden_primary_surfaces)) {
    if (userPathText.toLowerCase().includes(forbiddenSurface.toLowerCase())) {
      errors.push(`${label} routes a required/primary user path through forbidden surface: ${forbiddenSurface}`);
    }
  }
  if (row.default_visibility_required === true && !mentionsDefaultVisibility(primitiveText(row.real_page_evidence))) {
    errors.push(`${label} requires default visibility but real_page_evidence does not record default-visible proof`);
  }
}

export function assertStructuredNa(row: Record<string, unknown>, label: string, errors: string[]): void {
  if (isBlankish(row.na_reason) && isBlankish(row.out_of_scope_reason)) {
    errors.push(`${label} is out_of_scope_NA but lacks na_reason or out_of_scope_reason`);
  }
  if (isBlankish(row.scope_source) && isBlankish(row.approval_source) && isBlankish(row.source_reference)) {
    errors.push(`${label} is out_of_scope_NA but lacks scope_source, approval_source or source_reference`);
  }
}

function mentionsDefaultVisibility(value: string): boolean {
  return /\b(default[- ]?visible|visible by default|primary entry|first-level|top-level|main entry)\b/i.test(value);
}
