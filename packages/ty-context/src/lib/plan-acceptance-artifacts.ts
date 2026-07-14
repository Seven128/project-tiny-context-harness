import { promises as fs } from "node:fs";
import path from "node:path";
import { readText } from "./fs.js";
import { findSensitiveEvidence } from "./plan-acceptance-evidence.js";
import { isOutOfScope, statusOf } from "./plan-acceptance-json.js";
import {
  isBlankish,
  primitiveText,
  repoRelative,
  valuesAsArray,
} from "./plan-validator-common.js";

const MILESTONE_STATUSES = new Set([
  "not_started",
  "implemented_no_proof",
  "proof_partial",
  "proof_ready",
  "complete",
  "blocked",
  "out_of_scope_NA",
]);

const GENERATED_ACTIVE_COUNTS =
  /<!--\s*generated:active-counts:start\s*-->([\s\S]*?)<!--\s*generated:active-counts:end\s*-->/i;

export async function validateAcceptanceArtifactDiagnostics(
  projectRoot: string,
  targetDir: string,
  matrixRows: Record<string, unknown>[],
  verdictRows: Record<string, unknown>[],
  verdictOverall: string,
  errors: string[],
  warnings: string[],
  hygiene: string[],
): Promise<void> {
  validateRows(matrixRows, "plan-conformance matrix row", warnings, hygiene);
  validateRows(verdictRows, "final acceptance verdict row", warnings, hygiene);

  const manifestEvidenceIds = await validateEvidenceManifest(
    projectRoot,
    targetDir,
    errors,
    warnings,
  );
  if (manifestEvidenceIds.size > 0) {
    validateEvidenceIdReferences(
      matrixRows,
      "plan-conformance matrix row",
      manifestEvidenceIds,
      errors,
    );
    validateEvidenceIdReferences(
      verdictRows,
      "final acceptance verdict row",
      manifestEvidenceIds,
      errors,
    );
  }

  await validateFinalVerdictMarkdown(
    projectRoot,
    targetDir,
    verdictRows,
    verdictOverall,
    errors,
    warnings,
    hygiene,
  );
}

function validateRows(
  rows: Record<string, unknown>[],
  labelPrefix: string,
  warnings: string[],
  hygiene: string[],
): void {
  for (const [index, row] of rows.entries()) {
    const label = `${labelPrefix} ${index + 1}`;
    validateMilestones(row, label, warnings);
    validateStalePartialText(row, label, hygiene);
  }
}

function validateMilestones(
  row: Record<string, unknown>,
  label: string,
  warnings: string[],
): void {
  const milestones =
    row.milestones ?? row.proof_layer_milestones ?? row.proofLayerMilestones;
  if (isBlankish(milestones)) {
    return;
  }
  for (const status of extractMilestoneStatuses(milestones)) {
    if (!MILESTONE_STATUSES.has(status)) {
      warnings.push(
        `${label} has unsupported milestone status: ${status || "<empty>"}`,
      );
    }
  }
}

function extractMilestoneStatuses(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(extractMilestoneStatuses);
  }
  if (!value || typeof value !== "object") {
    return valuesAsArray(value).map((item) => item.trim());
  }
  const object = value as Record<string, unknown>;
  if (!isBlankish(object.status)) {
    return [String(object.status).trim()];
  }
  return Object.values(object).flatMap(extractMilestoneStatuses);
}

function validateStalePartialText(
  row: Record<string, unknown>,
  label: string,
  hygiene: string[],
): void {
  const status = statusOf(row);
  if (status === "complete" || status === "out_of_scope_NA") {
    return;
  }
  const text = primitiveText(row);
  const hasCompletionClaim =
    /\b(accepted|complete|final passed|goal achieved|product_goal_complete=true)\b/i.test(
      text,
    );
  const hasStaleQualifier =
    /\b(old|stale|previously|prior|outdated|superseded|no longer current)\b/i.test(
      text,
    );
  if (hasCompletionClaim && hasStaleQualifier) {
    hygiene.push(
      `${label} has stale or overclaim completion prose while status is ${status || "<empty>"}`,
    );
  }
}

async function validateEvidenceManifest(
  projectRoot: string,
  targetDir: string,
  errors: string[],
  warnings: string[],
): Promise<Set<string>> {
  const manifestFile = await findFile(targetDir, "evidence-manifest", ".json");
  const evidenceIds = new Set<string>();
  if (!manifestFile) {
    return evidenceIds;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readText(manifestFile));
  } catch (error) {
    errors.push(
      `${repoRelative(projectRoot, manifestFile)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return evidenceIds;
  }

  const entries = findManifestEntries(parsed);
  if (entries.length === 0) {
    warnings.push(
      `${repoRelative(projectRoot, manifestFile)} has no evidence entries`,
    );
    return evidenceIds;
  }

  for (const [index, entry] of entries.entries()) {
    const label = `evidence manifest entry ${index + 1}`;
    const evidenceId = firstString(
      entry.evidence_id,
      entry.evidenceId,
      entry.id,
    );
    if (evidenceId) {
      evidenceIds.add(evidenceId);
    } else {
      errors.push(`${label} is missing evidence_id`);
    }

    warnIfBlank(entry, label, warnings, "slice_id", "sliceId");
    warnIfBlank(entry, label, warnings, "slice_goal", "sliceGoal");
    warnIfBlank(
      entry,
      label,
      warnings,
      "touched_plan_item_ids",
      "touched_plan_ids",
      "plan_item_ids",
    );
    warnIfBlank(
      entry,
      label,
      warnings,
      "touched_ac_ids",
      "acceptance_ids",
      "ac_ids",
    );
    warnIfBlank(entry, label, warnings, "missing_layer_classes");
    warnIfBlank(entry, label, warnings, "proves");
    warnIfBlank(
      entry,
      label,
      warnings,
      "explicitly_does_not_prove",
      "does_not_prove",
    );
    warnIfBlank(
      entry,
      label,
      warnings,
      "closed_missing_layers",
      "closed_layers",
    );
    warnIfBlank(
      entry,
      label,
      warnings,
      "remaining_missing_layers",
      "remaining_layers",
    );
    warnIfBlank(entry, label, warnings, "cleanup_status");
    warnIfBlank(
      entry,
      label,
      warnings,
      "redaction_security_status",
      "security_redaction_status",
    );
    warnIfBlank(entry, label, warnings, "freshness");

    const sensitiveEvidence = findSensitiveEvidence(primitiveText(entry));
    if (sensitiveEvidence) {
      errors.push(
        `${label} contains raw secret/token/cookie material: ${sensitiveEvidence}`,
      );
    }
    if (
      entry.safe_to_sync_to_verdict === true &&
      !isBlankish(entry.remaining_missing_layers ?? entry.remaining_layers)
    ) {
      warnings.push(
        `${label} is safe_to_sync_to_verdict but still has remaining missing layers`,
      );
    }
  }

  return evidenceIds;
}

function findManifestEntries(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (!isRecord(value)) {
    return [];
  }
  for (const key of ["evidence", "entries", "items", "manifest"]) {
    const rows = findManifestEntries(value[key]);
    if (rows.length > 0) {
      return rows;
    }
  }
  return [];
}

function validateEvidenceIdReferences(
  rows: Record<string, unknown>[],
  labelPrefix: string,
  evidenceIds: Set<string>,
  errors: string[],
): void {
  for (const [index, row] of rows.entries()) {
    for (const evidenceId of valuesAsArray(
      row.evidence_id ?? row.evidence_ids ?? row.evidenceId ?? row.evidenceIds,
    )) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(
          `${labelPrefix} ${index + 1} references unknown evidence_id: ${evidenceId}`,
        );
      }
    }
  }
}

async function validateFinalVerdictMarkdown(
  projectRoot: string,
  targetDir: string,
  verdictRows: Record<string, unknown>[],
  verdictOverall: string,
  errors: string[],
  warnings: string[],
  hygiene: string[],
): Promise<void> {
  const markdownFile = await findFile(
    targetDir,
    "final-acceptance-verdict",
    ".md",
  );
  if (!markdownFile) {
    return;
  }
  const content = await readText(markdownFile);
  const match = GENERATED_ACTIVE_COUNTS.exec(content);
  if (!match) {
    if (
      /\b(active[-_ ]?count|complete_count|acceptance_required_count|missing_layer_count)\b/i.test(
        content,
      )
    ) {
      hygiene.push(
        `${repoRelative(projectRoot, markdownFile)} has active-count-like prose outside generated active-count markers`,
      );
    }
    return;
  }

  const declared = parseCountBlock(match[1]);
  const actual = activeCounts(verdictRows);
  for (const [key, expected] of Object.entries(actual)) {
    const declaredValue = declared[key];
    if (declaredValue === undefined) {
      warnings.push(
        `${repoRelative(projectRoot, markdownFile)} generated active-count block is missing ${key}`,
      );
      continue;
    }
    if (declaredValue !== expected) {
      const message = `${repoRelative(projectRoot, markdownFile)} generated active-count ${key}=${declaredValue} but current verdict has ${expected}`;
      if (verdictOverall === "complete") {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }
}

function parseCountBlock(content: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_-]+)\s*[:=]\s*(\d+)\s*$/.exec(line);
    if (match) {
      counts[match[1].replace(/-/g, "_")] = Number(match[2]);
    }
  }
  return counts;
}

function activeCounts(rows: Record<string, unknown>[]): Record<string, number> {
  return {
    complete_count: rows.filter((row) => statusOf(row) === "complete").length,
    partial_count: rows.filter((row) => statusOf(row) === "partial").length,
    acceptance_required_count: rows.filter((row) => !isOutOfScope(row)).length,
    missing_layer_count: rows.reduce(
      (sum, row) => sum + missingLayerCount(row),
      0,
    ),
  };
}

function missingLayerCount(row: Record<string, unknown>): number {
  return valuesAsArray(
    row.missing_required_layers ??
      row.missingRequiredLayers ??
      row.missing_proof_layers ??
      row.missing_evidence,
  ).length;
}

async function findFile(
  targetDir: string,
  marker: string,
  extension: string,
): Promise<string | undefined> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(extension) &&
        entry.name.includes(marker),
    )
    .map((entry) => path.join(targetDir, entry.name))
    .sort()[0];
}

function warnIfBlank(
  entry: Record<string, unknown>,
  label: string,
  warnings: string[],
  ...keys: string[]
): void {
  if (keys.some((key) => !isBlankish(entry[key]))) {
    return;
  }
  warnings.push(`${label} is missing ${keys[0]}`);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (!isBlankish(value)) {
      return String(value).trim();
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
