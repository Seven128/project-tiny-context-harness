import path from "node:path";
import { pathExists } from "./fs.js";
import { validateAcceptanceArtifactDiagnostics } from "./plan-acceptance-artifacts.js";
import { assertExternalReviewerFields } from "./plan-acceptance-evidence.js";
import {
  AC_STATUSES,
  MATRIX_STATUSES,
  NON_COMPLETE_AC,
  NON_COMPLETE_MATRIX,
  assertStructuredNa,
  assertSurfaceConformance,
  contextDeltaRequired,
  findJsonFile,
  findRows,
  hasExplicitNoTestScope,
  isOutOfScope,
  isSurfaceConformanceRow,
  overallStatus,
  readJson,
  statusOf
} from "./plan-acceptance-json.js";
import {
  assertReferencedPathsExist,
  hasRealPageEvidence,
  isBlankish,
  isUiFacing,
  primitiveText,
  repoRelative,
  resolveInputDir,
  valuesAsArray,
  weakProofHit
} from "./plan-validator-common.js";
import type { ValidatorReport } from "./validators.js";

export async function validatePlanAcceptance(projectRoot: string, args: string[] = []): Promise<ValidatorReport> {
  const info: string[] = [];
  const warnings: string[] = [];
  const hygiene: string[] = [];
  const errors: string[] = [];
  const targetDir = await resolveInputDir(projectRoot, args[0], "tmp/ty-context/plan-acceptance");
  if (!(await pathExists(targetDir))) {
    return { info, warnings, hygiene, errors: [`plan acceptance directory is missing: ${repoRelative(projectRoot, targetDir)}`] };
  }

  const matrixFile = await findJsonFile(targetDir, "plan-conformance-matrix");
  const verdictFile = await findJsonFile(targetDir, "final-acceptance-verdict");
  if (!matrixFile) {
    errors.push(`plan acceptance directory is missing *-plan-conformance-matrix.json`);
  }
  if (!verdictFile) {
    errors.push(`plan acceptance directory is missing *-final-acceptance-verdict.json`);
  }
  if (!matrixFile || !verdictFile) {
    return { info, warnings, hygiene, errors };
  }

  const matrix = await readJson(matrixFile, errors);
  const verdict = await readJson(verdictFile, errors);
  if (matrix === undefined || verdict === undefined) {
    return { info, warnings, hygiene, errors };
  }

  const matrixRows = findRows(matrix, ["plan_items", "items", "matrix", "entries", "plan_conformance"]);
  const verdictRows = findRows(verdict, ["acceptance_items", "ac_verdicts", "verdicts", "items", "entries", "acs"]);
  await validateMatrixRows(projectRoot, matrixRows, overallStatus(matrix), errors);
  await validateVerdictRows(projectRoot, verdictRows, overallStatus(verdict), errors);
  validateCrossReferences(matrixRows, verdictRows, errors);
  validateContextFactReferences(matrix, verdict, matrixRows, verdictRows, errors);
  await validateAcceptanceArtifactDiagnostics(
    projectRoot,
    targetDir,
    matrixRows,
    verdictRows,
    overallStatus(verdict),
    errors,
    warnings,
    hygiene
  );

  info.push(
    `checked plan acceptance ${repoRelative(projectRoot, targetDir)} matrix_rows=${matrixRows.length} verdict_rows=${verdictRows.length}`
  );
  if (errors.length === 0) {
    info.push("Plan acceptance artifact consistency passed");
  }
  return { info, warnings, hygiene, errors };
}

async function validateMatrixRows(
  projectRoot: string,
  rows: Record<string, unknown>[],
  overall: string,
  errors: string[]
): Promise<void> {
  if (rows.length === 0) {
    errors.push("plan-conformance matrix has no trace rows");
  }
  for (const [index, row] of rows.entries()) {
    const label = `plan-conformance matrix row ${index + 1}`;
    const status = statusOf(row);
    if (!MATRIX_STATUSES.has(status)) {
      errors.push(`${label} has unsupported status: ${status || "<empty>"}`);
    }
    if (status === "out_of_scope_NA") {
      assertStructuredNa(row, label, errors);
    }
    if (overall === "complete" && NON_COMPLETE_MATRIX.has(status)) {
      errors.push(`${label} is ${status} but overall_status is complete`);
    }
    if (status === "complete" && !isBlankish(row.missing_paths)) {
      errors.push(`${label} is complete but missing_paths is not empty`);
    }
    if (status === "complete") {
      if (isBlankish(row.plan_requirement)) {
        errors.push(`${label} is complete but plan_requirement is empty`);
      }
      if (isBlankish(row.expected_surfaces)) {
        errors.push(`${label} is complete but expected_surfaces is empty`);
      }
      if (isBlankish(row.implemented_paths)) {
        errors.push(`${label} is complete but implemented_paths is empty`);
      }
      if (isBlankish(row.tests) && !hasExplicitNoTestScope(row)) {
        errors.push(`${label} is complete but tests is empty and no explicit no-test scope is recorded`);
      }
      if (isBlankish(row.runtime_evidence) && isBlankish(row.artifact_evidence) && isBlankish(row.real_page_evidence)) {
        errors.push(`${label} is complete but has no runtime, artifact or real-page evidence`);
      }
      if (isBlankish(row.scope_assessment)) {
        errors.push(`${label} is complete but scope_assessment is empty`);
      }
      if (isBlankish(row.drift)) {
        errors.push(`${label} is complete but drift is empty`);
      }
      assertExternalReviewerFields(
        label,
        row,
        primitiveText([row.runtime_evidence, row.artifact_evidence, row.real_page_evidence, row.fresh_evidence]),
        errors
      );
      const weak = weakProofHit(primitiveText(row));
      if (weak) {
        errors.push(`${label} is complete but contains weak-proof language matching /${weak}/`);
      }
      if (isUiFacing(primitiveText([row.expected_surfaces, row.plan_requirement, row.conformance_type]))) {
        const realPageEvidence = primitiveText([
          row.real_page_evidence,
          row.user_path_evidence,
          row.fresh_evidence,
          row.runtime_evidence,
          row.artifact_evidence
        ]);
        if (!hasRealPageEvidence(realPageEvidence)) {
          errors.push(`${label} is UI/surface-facing but lacks real_page_evidence`);
        }
      }
      if (isSurfaceConformanceRow(row)) {
        assertSurfaceConformance(row, label, errors);
      }
      await assertReferencedPathsExist(
        projectRoot,
        label,
        primitiveText([
          row.implemented_paths,
          row.tests,
          row.runtime_evidence,
          row.artifact_evidence,
          row.real_page_evidence,
          row.negative_surface_checks,
          row.context_fact_refs
        ]),
        errors
      );
    }
  }
}

async function validateVerdictRows(
  projectRoot: string,
  rows: Record<string, unknown>[],
  overall: string,
  errors: string[]
): Promise<void> {
  if (rows.length === 0) {
    errors.push("final acceptance verdict has no AC rows");
  }
  for (const [index, row] of rows.entries()) {
    const label = `final acceptance verdict row ${index + 1}`;
    const status = statusOf(row);
    if (!AC_STATUSES.has(status)) {
      errors.push(`${label} has unsupported status: ${status || "<empty>"}`);
    }
    if (status === "out_of_scope_NA") {
      assertStructuredNa(row, label, errors);
    }
    if (overall === "complete" && NON_COMPLETE_AC.has(status)) {
      errors.push(`${label} is ${status} but overall_status is complete`);
    }
    if (status === "complete" && isBlankish(row.fresh_evidence)) {
      errors.push(`${label} is complete but fresh_evidence is empty`);
    }
    if (status === "complete" && isBlankish(row.required_evidence)) {
      errors.push(`${label} is complete but required_evidence is empty`);
    }
    if (status === "complete" && isBlankish(row.decision)) {
      errors.push(`${label} is complete but decision is empty`);
    }
    if (status === "complete" && !isBlankish(row.missing_evidence)) {
      errors.push(`${label} is complete but missing_evidence is not empty`);
    }
    if (status === "complete" && !isBlankish(row.contradictions)) {
      errors.push(`${label} is complete but contradictions is not empty`);
    }
    if (status === "complete") {
      const text = primitiveText(row);
      assertExternalReviewerFields(label, row, primitiveText(row.fresh_evidence), errors);
      const weak = weakProofHit(text);
      if (weak) {
        errors.push(`${label} is complete but contains weak-proof language matching /${weak}/`);
      }
      if (isUiFacing(text) && !isOutOfScope(row) && !hasRealPageEvidence(primitiveText(row.fresh_evidence))) {
        errors.push(`${label} is UI-facing but lacks fresh real-page evidence or explicit N/A`);
      }
      await assertReferencedPathsExist(projectRoot, label, primitiveText([row.fresh_evidence, row.context_fact_refs]), errors);
    }
  }
}

function validateCrossReferences(
  matrixRows: Record<string, unknown>[],
  verdictRows: Record<string, unknown>[],
  errors: string[]
): void {
  const planIds = new Set(matrixRows.map((row) => String(row.plan_item_id ?? row.id ?? "")).filter(Boolean));
  const acIds = new Set(verdictRows.map((row) => String(row.ac_id ?? row.id ?? row.acceptance_item ?? "")).filter(Boolean));
  let checked = 0;
  for (const [index, row] of matrixRows.entries()) {
    for (const acId of valuesAsArray(row.acceptance_ids ?? row.ac_ids)) {
      checked += 1;
      if (!acIds.has(acId)) {
        errors.push(`plan-conformance matrix row ${index + 1} references unknown AC id: ${acId}`);
      }
    }
  }
  for (const [index, row] of verdictRows.entries()) {
    for (const planId of valuesAsArray(row.related_plan_item_ids ?? row.plan_item_ids)) {
      checked += 1;
      if (!planIds.has(planId)) {
        errors.push(`final acceptance verdict row ${index + 1} references unknown plan item id: ${planId}`);
      }
    }
  }
  if (matrixRows.length > 0 && verdictRows.length > 0 && checked === 0) {
    errors.push("plan acceptance artifacts must include acceptance_ids or related_plan_item_ids cross references");
  }
}

function validateContextFactReferences(
  matrix: unknown,
  verdict: unknown,
  matrixRows: Record<string, unknown>[],
  verdictRows: Record<string, unknown>[],
  errors: string[]
): void {
  if (!contextDeltaRequired(matrix) && !contextDeltaRequired(verdict)) {
    return;
  }
  const rows = [...matrixRows, ...verdictRows];
  if (!rows.some((row) => !isBlankish(row.context_fact_refs))) {
    errors.push("Context Delta is required but matrix/verdict rows do not cite context_fact_refs");
  }
}
