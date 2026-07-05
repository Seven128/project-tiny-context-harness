export type CompileReportCategory =
  | "blocking_missing_source"
  | "blocking_missing_plan"
  | "blocking_missing_checklist"
  | "blocking_unparseable_object"
  | "blocking_scope_conflict"
  | "blocking_missing_assertion_spec"
  | "blocking_missing_owner_boundary"
  | "blocking_missing_primary_path"
  | "blocking_missing_observable_result"
  | "blocking_missing_invalid_evidence"
  | "warning_weak_acceptance_wording"
  | "hygiene_non_canonical_field_order";

export function compileError(
  message: string,
  category: CompileReportCategory,
  file: string,
  line: number,
  field: string,
  whyBlocking: string,
  requiredFix: string
): string {
  return `${message}${compileReportSuffix(category, file, line, field, whyBlocking, requiredFix)}`;
}

export function compileReportSuffix(
  category: CompileReportCategory,
  file: string,
  line: number,
  field: string,
  whyBlocking: string,
  requiredFix: string
): string {
  return ` [category=${category}; file=${file}; line=${line}; invalid_or_missing_field=${field}; why_blocking=${whyBlocking}; required_fix=${requiredFix}; rerun_compile_enough=true]`;
}

export function missingCategory(label: string): CompileReportCategory {
  if (/^PI-\d+/i.test(label)) {
    return "blocking_missing_plan";
  }
  if (/^AC-\d+/i.test(label)) {
    return "blocking_missing_checklist";
  }
  return "blocking_missing_source";
}

export function throwCompileErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`Superpowers source compile failed:\n- ${errors.join("\n- ")}`);
  }
}
