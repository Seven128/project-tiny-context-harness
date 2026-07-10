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
  | "blocking_unsafe_source_path"
  | "blocking_unreadable_source"
  | "warning_weak_acceptance_wording"
  | "hygiene_non_canonical_field_order";

export interface CompositeCompileDiagnostic {
  category: CompileReportCategory;
  file: string;
  line: number;
  field: string;
  why: string;
  fix: string;
  message: string;
}

export interface CompileDiagnosticRecord extends CompositeCompileDiagnostic {
  formatted_message: string;
}

export class CompositeSourceCompileError extends Error {
  readonly diagnostics: CompositeCompileDiagnostic[];

  constructor(records: readonly CompileDiagnosticRecord[]) {
    super(`Superpowers source compile failed:\n- ${records.map((record) => record.formatted_message).join("\n- ")}`);
    this.name = "Error";
    this.diagnostics = records.map(({ formatted_message: _formattedMessage, ...diagnostic }) => diagnostic);
  }
}

export function compileDiagnostic(
  message: string,
  category: CompileReportCategory,
  file: string,
  line: number,
  field: string,
  why: string,
  fix: string
): CompileDiagnosticRecord {
  return {
    category,
    file,
    line,
    field,
    why,
    fix,
    message,
    formatted_message: `${message}${compileReportSuffix(category, file, line, field, why, fix)}`
  };
}

export function compileError(
  message: string,
  category: CompileReportCategory,
  file: string,
  line: number,
  field: string,
  whyBlocking: string,
  requiredFix: string
): string {
  return compileDiagnostic(message, category, file, line, field, whyBlocking, requiredFix).formatted_message;
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

export function throwCompileErrors(errors: readonly (CompileDiagnosticRecord | string)[]): void {
  if (errors.length > 0) {
    throw new CompositeSourceCompileError(errors.map(normalizeCompileDiagnostic));
  }
}

export function isCompositeSourceCompileError(error: unknown): error is CompositeSourceCompileError {
  return error instanceof CompositeSourceCompileError;
}

function normalizeCompileDiagnostic(error: CompileDiagnosticRecord | string): CompileDiagnosticRecord {
  if (typeof error !== "string") {
    return error;
  }
  return {
    category: "blocking_unparseable_object",
    file: "",
    line: 1,
    field: "",
    why: "source compilation failed",
    fix: "fix the reported source error and rerun compile",
    message: error,
    formatted_message: error
  };
}
