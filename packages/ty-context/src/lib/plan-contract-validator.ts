import { cell, hasRealPageEvidence, isBlankish, isRuntimeFacing, isUiFacing, parseRequiredTable, readRequiredFile, repoRelative, resolveInputFile, weakProofHit, assertReferencedPathsExist } from "./plan-validator-common.js";
import type { PlanTableRow } from "./plan-validator-common.js";
import type { ValidatorReport } from "./validators.js";

const SOURCE_HEADERS = [
  "Source item",
  "Durable constraint",
  "Type",
  "Existing Context Hit",
  "Context action",
  "Owning Context",
  "Coverage status"
];

const BINDING_HEADERS = [
  "Context fact",
  "Implementation obligation",
  "Expected surfaces",
  "Implemented paths",
  "Forbidden shortcuts",
  "Verification path",
  "Binding status"
];

const SOURCE_STATUSES = new Set([
  "covered",
  "new_context_required",
  "context_updated",
  "task_local_only",
  "out_of_scope_explicit",
  "needs_user_decision",
  "under_scoped"
]);

const BINDING_STATUSES = new Set([
  "bound",
  "partial",
  "missing",
  "blocked",
  "out_of_scope_explicit",
  "needs_user_decision",
  "contradicted_by_current_state"
]);

const UNRESOLVED_SOURCE = new Set(["new_context_required", "needs_user_decision", "under_scoped"]);
const NON_BOUND = new Set(["partial", "missing", "blocked", "needs_user_decision", "contradicted_by_current_state"]);

export async function validatePlanContract(projectRoot: string, args: string[] = []): Promise<ValidatorReport> {
  const info: string[] = [];
  const errors: string[] = [];
  const planPath = await resolveInputFile(projectRoot, args[0], "plan.md");
  const content = await readRequiredFile(projectRoot, planPath, "plan contract", errors);
  if (content === undefined) {
    return { info, errors };
  }

  const sourceTable = parseRequiredTable(content, "Source-to-Context Coverage", SOURCE_HEADERS, "Source-to-Context Coverage", errors);
  if (sourceTable?.headers.includes("implementation constraint")) {
    errors.push("Source-to-Context Coverage must not include Implementation constraint; use Context-to-Implementation Binding instead");
  }
  const bindingTable = parseRequiredTable(
    content,
    "Context-to-Implementation Binding",
    BINDING_HEADERS,
    "Context-to-Implementation Binding",
    errors
  );

  if (sourceTable) {
    for (const row of sourceTable.rows) {
      const status = cell(row, "Coverage status");
      const label = `Source-to-Context Coverage row ${row.index}`;
      if (!SOURCE_STATUSES.has(status)) {
        errors.push(`${label} has unsupported Coverage status: ${status || "<empty>"}`);
      }
      if (UNRESOLVED_SOURCE.has(status)) {
        errors.push(`${label} is unresolved (${status}) and cannot pass final plan-contract validation`);
      }
      if (status === "covered" && isBlankish(cell(row, "Existing Context Hit"))) {
        errors.push(`${label} is covered but has no Existing Context Hit`);
      }
      if (status === "context_updated" && isBlankish(cell(row, "Owning Context"))) {
        errors.push(`${label} is context_updated but has no Owning Context`);
      }
      await assertReferencedPathsExist(
        projectRoot,
        label,
        `${cell(row, "Existing Context Hit")} ${cell(row, "Owning Context")}`,
        errors
      );
    }
  }

  if (bindingTable) {
    for (const row of bindingTable.rows) {
      const status = cell(row, "Binding status");
      const label = `Context-to-Implementation Binding row ${row.index}`;
      const expectedSurfaces = cell(row, "Expected surfaces");
      const implementedPaths = cell(row, "Implemented paths");
      const verificationPath = cell(row, "Verification path");
      const evidenceText = `${implementedPaths} ${verificationPath}`;
      if (!BINDING_STATUSES.has(status)) {
        errors.push(`${label} has unsupported Binding status: ${status || "<empty>"}`);
      }
      if (NON_BOUND.has(status)) {
        errors.push(`${label} is ${status} and cannot pass final plan-contract validation`);
      }
      if (status === "bound") {
        if (isBlankish(expectedSurfaces)) {
          errors.push(`${label} is bound but has no Expected surfaces`);
        }
        if (isBlankish(implementedPaths)) {
          errors.push(`${label} is bound but has no Implemented paths`);
        }
        if (isBlankish(verificationPath)) {
          errors.push(`${label} is bound but has no Verification path`);
        }
        const weak = weakProofHit(`${cell(row, "Context fact")} ${cell(row, "Implementation obligation")} ${expectedSurfaces} ${evidenceText}`);
        if (weak) {
          errors.push(`${label} is bound but contains weak-proof language matching /${weak}/`);
        }
        if (isUiFacing(`${expectedSurfaces} ${cell(row, "Implementation obligation")}`) && !hasRealPageEvidence(evidenceText)) {
          errors.push(`${label} is UI/surface-facing but lacks real page, route, browser or screenshot evidence`);
        }
        if (isRuntimeFacing(expectedSurfaces) && !isRuntimeFacing(evidenceText)) {
          errors.push(`${label} expects runtime/API/worker coverage but implemented evidence does not name that surface`);
        }
        assertForbiddenShortcutsNotUsed(row, evidenceText, label, errors);
      }
      await assertReferencedPathsExist(
        projectRoot,
        label,
        `${cell(row, "Context fact")} ${implementedPaths} ${verificationPath}`,
        errors
      );
    }
  }

  info.push(
    `checked plan contract ${repoRelative(projectRoot, planPath)} source_rows=${sourceTable?.rows.length ?? 0} binding_rows=${bindingTable?.rows.length ?? 0}`
  );
  if (errors.length === 0) {
    info.push("Plan contract validation passed");
  }
  return { info, errors };
}

function assertForbiddenShortcutsNotUsed(
  row: PlanTableRow,
  evidenceText: string,
  label: string,
  errors: string[]
): void {
  const shortcuts = cell(row, "Forbidden shortcuts")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item) => item && !isBlankish(item));
  for (const shortcut of shortcuts) {
    if (evidenceText.toLowerCase().includes(shortcut.toLowerCase())) {
      errors.push(`${label} is bound but its evidence uses forbidden shortcut: ${shortcut}`);
    }
  }
}
