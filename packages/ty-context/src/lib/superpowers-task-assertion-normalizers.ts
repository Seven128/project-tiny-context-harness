import { normalizeProofLayerId } from "./superpowers-task-fields.js";
import {
  isRecord,
  type AssertionCheck,
  type AssertionResult,
  type NegativeEvidenceScan,
  type NegativeFinding
} from "./superpowers-task-state-schema.js";

export function normalizeAssertionResult(value: unknown): AssertionResult | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    schema_version: String(value.schema_version ?? "") as AssertionResult["schema_version"],
    status: String(value.status ?? "") as AssertionResult["status"],
    runner: String(value.runner ?? ""),
    exit_code: numberValue(value.exit_code),
    target_ac_ids: stringArray(value.target_ac_ids),
    target_pi_ids: stringArray(value.target_pi_ids),
    target_proof_layers: stringArray(value.target_proof_layers).map(normalizeProofLayerId),
    owner_surface: value.owner_surface === undefined ? undefined : String(value.owner_surface),
    route: value.route === undefined ? undefined : String(value.route),
    action: value.action === undefined ? undefined : String(value.action),
    positive_assertions: checkArray(value.positive_assertions),
    negative_assertions: checkArray(value.negative_assertions),
    invalid_completion_signals: checkArray(value.invalid_completion_signals),
    negative_evidence_scan: normalizeNegativeEvidenceScan(value.negative_evidence_scan),
    required_test_ids: stringArray(value.required_test_ids),
    artifacts: stringArray(value.artifacts)
  };
}

export function normalizeNegativeEvidenceScan(value: unknown): NegativeEvidenceScan | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    schema_version: String(value.schema_version ?? "") as NegativeEvidenceScan["schema_version"],
    status: String(value.status ?? "") as NegativeEvidenceScan["status"],
    target_ac_ids: stringArray(value.target_ac_ids),
    target_proof_layers: stringArray(value.target_proof_layers).map(normalizeProofLayerId),
    invalid_completion_signals_checked: stringArray(value.invalid_completion_signals_checked),
    owner_surface: value.owner_surface === undefined ? undefined : String(value.owner_surface),
    route: value.route === undefined ? undefined : String(value.route),
    forbidden_findings: findingArray(value.forbidden_findings),
    required_findings: checkArray(value.required_findings),
    artifacts: stringArray(value.artifacts)
  };
}

function checkArray(value: unknown): AssertionCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    id: String(item.id ?? ""),
    status: String(item.status ?? "") as AssertionCheck["status"],
    actual: item.actual === undefined ? undefined : String(item.actual),
    expected: item.expected === undefined ? undefined : String(item.expected),
    forbidden_text: item.forbidden_text === undefined ? undefined : String(item.forbidden_text)
  }));
}

function findingArray(value: unknown): NegativeFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    id: String(item.id ?? ""),
    status: String(item.status ?? "") as NegativeFinding["status"],
    forbidden_text: item.forbidden_text === undefined ? undefined : String(item.forbidden_text),
    actual: item.actual === undefined ? undefined : String(item.actual)
  }));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item)).filter(Boolean);
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}
