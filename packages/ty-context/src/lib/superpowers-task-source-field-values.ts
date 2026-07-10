import {
  compileDiagnostic,
  missingCategory,
  type CompileDiagnosticRecord
} from "./superpowers-task-compile-diagnostics.js";
import {
  fieldArray,
  fieldBoolean,
  fieldLine,
  fieldText,
  type ParsedField
} from "./superpowers-task-source-parser.js";

export function requireEnum(
  errors: CompileDiagnosticRecord[],
  label: string,
  name: string,
  fields: Record<string, ParsedField>,
  allowed: Set<string>,
  sourceFile: string,
  fallbackLine: number
): string {
  const value = fieldText(fields, name);
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!value) {
    errors.push(compileDiagnostic(`${label} missing ${name} at ${sourceFile}:${line}`, missingCategory(label), sourceFile, line, name, "field is required", "add the required field and rerun compile"));
    return "";
  }
  if (!allowed.has(value)) {
    const allowedValues = [...allowed].join(", ");
    errors.push(compileDiagnostic(`${label} invalid ${name}: ${value} at ${sourceFile}:${line}; allowed: ${allowedValues}`, "blocking_unparseable_object", sourceFile, line, name, `value must be one of ${allowedValues}`, "fix the field value and rerun compile"));
  }
  return value;
}

export function requireText(errors: CompileDiagnosticRecord[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): string {
  const value = fieldText(fields, name);
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!value) {
    errors.push(compileDiagnostic(`${label} missing ${name} at ${sourceFile}:${line}`, missingCategory(label), sourceFile, line, name, "field is required", "add non-empty text and rerun compile"));
  }
  return value;
}

export function requireArray(errors: CompileDiagnosticRecord[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): string[] {
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!fields[name]) {
    errors.push(compileDiagnostic(`${label} missing ${name} at ${sourceFile}:${line}`, missingCategory(label), sourceFile, line, name, "field is required", "add the list field and rerun compile"));
    return [];
  }
  return fieldArray(fields, name);
}

export function requireBoolean(errors: CompileDiagnosticRecord[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): boolean | null {
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!fields[name]) {
    errors.push(compileDiagnostic(`${label} missing ${name} at ${sourceFile}:${line}`, missingCategory(label), sourceFile, line, name, "field is required", "add true or false and rerun compile"));
    return null;
  }
  const value = fieldBoolean(fields, name);
  if (value === null) {
    errors.push(compileDiagnostic(`${label} invalid ${name}: ${fieldText(fields, name)} at ${sourceFile}:${line}; must be true or false`, "blocking_unparseable_object", sourceFile, line, name, "value must be true or false", "fix the boolean and rerun compile"));
  }
  return value;
}

export function optionalArray(fields: Record<string, ParsedField>, name: string): string[] {
  return fields[name] ? fieldArray(fields, name) : [];
}

export function optionalText(fields: Record<string, ParsedField>, name: string): string {
  return fields[name] ? fieldText(fields, name) : "";
}
