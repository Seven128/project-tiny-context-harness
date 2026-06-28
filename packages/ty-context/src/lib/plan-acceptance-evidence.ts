import { isOutOfScope } from "./plan-acceptance-json.js";
import { isBlankish, primitiveText, valuesAsArray } from "./plan-validator-common.js";

const BLOCKING_AUDITOR_STATUSES = new Set(["partial", "blocked", "invalidated"]);
const SENSITIVE_EVIDENCE_PATTERNS = [
  {
    label: "Authorization bearer token",
    pattern: /\bauthorization\s*:\s*bearer\s+(?!<redacted>|redacted|\[redacted\])[A-Za-z0-9._~+/=-]{8,}/i
  },
  {
    label: "cookie value",
    pattern: /\bcookie\s*[:=]\s*(?!<redacted>|redacted|\[redacted\])[^;\s]{8,}/i
  },
  {
    label: "secret assignment",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password)\s*[:=]\s*["']?(?!<redacted>|redacted|\[redacted\])[A-Za-z0-9_./+=-]{8,}/i
  }
];

export function assertExternalReviewerFields(
  label: string,
  row: Record<string, unknown>,
  evidenceText: string,
  errors: string[]
): void {
  if (hasUnresolvedMissingRequiredLayers(row)) {
    errors.push(`${label} is complete but missing_required_layers is not empty`);
  }

  const driftSeverity = String(row.drift_severity ?? row.driftSeverity ?? "").trim().toLowerCase();
  if (driftSeverity === "material" || driftSeverity === "critical") {
    errors.push(`${label} is complete but drift_severity is ${driftSeverity}`);
  }

  if (siblingSubstitutionUsed(row) && !hasSiblingSubstitutionApproval(row)) {
    errors.push(`${label} is complete but sibling_substitution_used without approval`);
  }

  if (liveProofSubstitutionUsed(row) && !hasLiveProofSubstitutionApproval(row)) {
    errors.push(`${label} is complete but live_proof_substitution_used without approval`);
  }

  const auditorStatus = String(row.auditor_status ?? row.auditorStatus ?? "").trim().toLowerCase();
  if (BLOCKING_AUDITOR_STATUSES.has(auditorStatus)) {
    errors.push(`${label} is complete but auditor_status is ${auditorStatus}`);
  }

  if (hasOnlySelfCertifyingEvidence(evidenceText)) {
    errors.push(`${label} is complete but fresh_evidence contains only summary or self-certifying evidence`);
  }

  const sensitiveEvidence = findSensitiveEvidence(evidenceText);
  if (sensitiveEvidence) {
    errors.push(`${label} is complete but evidence contains raw secret/token/cookie material: ${sensitiveEvidence}`);
  }
}

export function findSensitiveEvidence(text: string): string | undefined {
  return SENSITIVE_EVIDENCE_PATTERNS.find((item) => item.pattern.test(text))?.label;
}

function hasUnresolvedMissingRequiredLayers(row: Record<string, unknown>): boolean {
  const value = row.missing_required_layers ?? row.missingRequiredLayers ?? row.missing_proof_layers;
  if (isBlankish(value)) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => !isBlankish(item) && !isStructuredLayerNa(item));
  }
  return !isStructuredLayerNa(value);
}

function isStructuredLayerNa(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const object = value as Record<string, unknown>;
  const text = primitiveText(object);
  const hasNaStatus = isOutOfScope(object) || /\bout[_ -]?of[_ -]?scope[_ -]?NA\b/i.test(text);
  const hasSource =
    !isBlankish(object.scope_source) ||
    !isBlankish(object.approval_source) ||
    !isBlankish(object.source_reference) ||
    !isBlankish(object.sourceReference);
  return hasNaStatus && hasSource;
}

function siblingSubstitutionUsed(row: Record<string, unknown>): boolean {
  const value = row.sibling_substitution_used ?? row.siblingSubstitutionUsed;
  if (value === true) {
    return true;
  }
  const text = primitiveText(value);
  if (/\b(false|no|none|not used|not_used)\b/i.test(text)) {
    return false;
  }
  return /\b(true|yes|used|present)\b/i.test(text);
}

function hasSiblingSubstitutionApproval(row: Record<string, unknown>): boolean {
  return (
    !isBlankish(row.sibling_substitution_approval_source) ||
    !isBlankish(row.substitution_approval_source) ||
    /\b(approved|explicitly allowed|out[_ -]?of[_ -]?scope[_ -]?NA)\b/i.test(
      primitiveText([row.sibling_substitution_approved, row.substitution_approval])
    )
  );
}

function liveProofSubstitutionUsed(row: Record<string, unknown>): boolean {
  const value = row.live_proof_substitution_used ?? row.liveProofSubstitutionUsed;
  if (value === true) {
    return true;
  }
  const text = primitiveText(value);
  if (/\b(false|no|none|not used|not_used)\b/i.test(text)) {
    return false;
  }
  return /\b(true|yes|used|present|substituted)\b/i.test(text);
}

function hasLiveProofSubstitutionApproval(row: Record<string, unknown>): boolean {
  return (
    !isBlankish(row.live_proof_substitution_approval_source) ||
    !isBlankish(row.liveProofSubstitutionApprovalSource) ||
    /\b(approved|explicitly allowed|out[_ -]?of[_ -]?scope[_ -]?NA)\b/i.test(
      primitiveText([row.live_proof_substitution_approved, row.liveProofSubstitutionApproved])
    )
  );
}

function hasOnlySelfCertifyingEvidence(text: string): boolean {
  const entries = valuesAsArray(text);
  return entries.length > 0 && entries.every(isSelfCertifyingEvidence);
}

function isSelfCertifyingEvidence(text: string): boolean {
  return /\b(local audit|audit says|plan[- ]conformance(?: matrix)?|matrix row|final[- ]acceptance[- ]verdict|final verdict|verdict row|subagent summary|agent summary|reviewer summary|validator pass|validate-plan-acceptance(?: passed| pass)?|green check|final result card)\b/i.test(
    text
  );
}
