import { compileDiagnostic, throwCompileErrors, type CompileDiagnosticRecord } from "./superpowers-task-compile-diagnostics.js";

export interface ParsedField {
  value: string | string[];
  line: number;
}

export interface ParsedDefinition {
  id: string;
  title: string;
  fields: Record<string, ParsedField>;
  source_file: string;
  source_start_line: number;
  source_end_line: number;
}

export interface DefinitionParseOptions {
  kind: "PI" | "AC";
  sourceFile: string;
  allowedFields: Set<string>;
}

export function parseHeadingDefinitions(content: string, options: DefinitionParseOptions): ParsedDefinition[] {
  const lines = splitLines(content);
  const errors: CompileDiagnosticRecord[] = [];
  rejectListStyleDefinitions(lines, options, errors);
  const headings = findDefinitionHeadings(lines, options.kind);
  const seen = new Map<string, number>();
  const definitions: ParsedDefinition[] = [];

  for (const heading of headings) {
    const firstLine = seen.get(heading.id);
    if (firstLine !== undefined) {
      errors.push(compileDiagnostic(`${heading.id} duplicate definition at ${options.sourceFile}:${firstLine} and ${options.sourceFile}:${heading.line}`, "blocking_unparseable_object", options.sourceFile, heading.line, heading.id, "duplicate object ids make PI/AC graph references ambiguous", "keep exactly one heading definition for this id"));
      continue;
    }
    seen.set(heading.id, heading.line);
    const sourceEndLine = sectionEndLine(lines, heading.index, heading.level);
    const section = lines.slice(heading.index, sourceEndLine);
    definitions.push({
      id: heading.id,
      title: heading.title,
      fields: parseFields(section, options.sourceFile, heading.line, options.allowedFields, errors),
      source_file: options.sourceFile,
      source_start_line: heading.line,
      source_end_line: sourceEndLine
    });
  }

  if (definitions.length === 0) {
    errors.push(compileDiagnostic(`${options.sourceFile} must define ${options.kind} items with Markdown headings like "## ${options.kind}-001: ..."`, options.kind === "PI" ? "blocking_missing_plan" : "blocking_missing_checklist", options.sourceFile, 1, `${options.kind}_heading`, "the source cannot compile without at least one object heading", `add headings like ## ${options.kind}-001: ...`));
  }
  throwCompileErrors(errors);
  return definitions;
}

export function parseDocumentFields(content: string, sourceFile: string, allowedFields: Set<string>): Record<string, ParsedField> {
  const errors: CompileDiagnosticRecord[] = [];
  const fields = parseFields(splitLines(content), sourceFile, 1, allowedFields, errors);
  throwCompileErrors(errors);
  return fields;
}

export function fieldText(fields: Record<string, ParsedField>, name: string): string {
  const field = fields[name];
  if (!field) {
    return "";
  }
  return Array.isArray(field.value) ? field.value.join("\n").trim() : field.value.trim();
}

export function fieldArray(fields: Record<string, ParsedField>, name: string): string[] {
  const field = fields[name];
  if (!field) {
    return [];
  }
  if (Array.isArray(field.value)) {
    return field.value.flatMap(splitScalarArray).filter(Boolean);
  }
  return splitScalarArray(field.value);
}

export function fieldBoolean(fields: Record<string, ParsedField>, name: string): boolean | null {
  const value = fieldText(fields, name).toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export function fieldLine(fields: Record<string, ParsedField>, name: string): number | undefined {
  return fields[name]?.line;
}

function parseFields(
  lines: string[],
  sourceFile: string,
  startLine: number,
  allowedFields: Set<string>,
  errors: CompileDiagnosticRecord[]
): Record<string, ParsedField> {
  const fields: Record<string, ParsedField> = {};
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = startLine + index;
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading && allowedFields.has(heading[2].trim())) {
      errors.push(compileDiagnostic(`${sourceFile}:${lineNumber} field headings are not supported; use "${heading[2].trim()}: ..."`,
        "blocking_unparseable_object", sourceFile, lineNumber, heading[2].trim(), "field heading syntax is ambiguous in compiled source", "use key: value fields"));
      continue;
    }
    if (/^\s*\|/.test(line) && containsKnownField(line, allowedFields)) {
      errors.push(compileDiagnostic(`${sourceFile}:${lineNumber} table fields are not supported; use key: value fields`,
        "blocking_unparseable_object", sourceFile, lineNumber, "table_field", "table fields cannot be parsed into canonical state safely", "use key: value fields"));
      continue;
    }
    const match = /^([a-z][a-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const name = match[1];
    if (!allowedFields.has(name)) {
      errors.push(compileDiagnostic(`${sourceFile}:${lineNumber} unknown field ${name}`,
        "blocking_unparseable_object", sourceFile, lineNumber, name, "unknown fields may hide required source semantics", "rename the field to a supported canonical key"));
      continue;
    }
    if (fields[name]) {
      errors.push(compileDiagnostic(`${sourceFile}:${lineNumber} duplicate field ${name}`,
        "blocking_unparseable_object", sourceFile, lineNumber, name, "duplicate fields make canonical source values ambiguous", "keep one field value"));
      continue;
    }
    const parsed = parseFieldValue(lines, index, match[2], sourceFile, lineNumber, errors);
    fields[name] = { value: parsed.value, line: lineNumber };
    index = parsed.endIndex;
  }
  return fields;
}

function parseFieldValue(
  lines: string[],
  index: number,
  rest: string,
  sourceFile: string,
  lineNumber: number,
  errors: CompileDiagnosticRecord[]
): { value: string | string[]; endIndex: number } {
  const trimmed = rest.trim();
  if (trimmed === "|") {
    const block: string[] = [];
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const next = lines[cursor];
      if (next.trim() && isTopLevelFieldOrHeading(next)) {
        break;
      }
      block.push(next.replace(/^\s{0,2}/, ""));
    }
    if (block.length === 0) {
      errors.push(compileDiagnostic(`${sourceFile}:${lineNumber} block field must include indented text`,
        "blocking_unparseable_object", sourceFile, lineNumber, "block_field", "empty block field cannot prove source intent", "add indented text or remove the field"));
    }
    return { value: block.join("\n").trim(), endIndex: cursor - 1 };
  }
  if (trimmed) {
    return { value: cleanValue(trimmed), endIndex: index };
  }

  const values: string[] = [];
  let cursor = index + 1;
  for (; cursor < lines.length; cursor++) {
    const next = lines[cursor];
    if (!next.trim()) {
      continue;
    }
    if (isTopLevelFieldOrHeading(next)) {
      break;
    }
    const listItem = /^\s*[-*+]\s+(.+?)\s*$/.exec(next);
    if (!listItem) {
      errors.push(compileDiagnostic(`${sourceFile}:${cursor + 1} field lists must use indented "- item" entries or key: | blocks`,
        "blocking_unparseable_object", sourceFile, cursor + 1, "list_field", "list syntax cannot be parsed into canonical arrays", "use indented '- item' entries or key: | blocks"));
      continue;
    }
    values.push(cleanValue(listItem[1]));
  }
  return { value: values, endIndex: cursor - 1 };
}

function isTopLevelFieldOrHeading(line: string): boolean {
  if (/^(#{1,6})\s+/.test(line)) {
    return true;
  }
  return /^([a-z][a-z0-9_]*)\s*:/.test(line);
}

function rejectListStyleDefinitions(
  lines: string[],
  options: DefinitionParseOptions,
  errors: CompileDiagnosticRecord[]
): void {
  const idPattern = options.kind === "PI" ? "PI" : "AC";
  const listPattern = new RegExp(`^\\s*[-*+]\\s+(${idPattern}-\\d{3,})\\b\\s*[:.-]?`, "i");
  for (let index = 0; index < lines.length; index++) {
    const match = listPattern.exec(lines[index]);
    if (!match) {
      continue;
    }
    const block = listItemBlock(lines, index);
    if (!block.some((line) => containsKnownField(line, options.allowedFields))) {
      continue;
    }
    const id = match[1].toUpperCase();
    errors.push(compileDiagnostic(`${id} list-style definition is not allowed at ${options.sourceFile}:${index + 1}; use "## ${id}: ..."`,
      "blocking_unparseable_object", options.sourceFile, index + 1, id, "list-style object definitions are not canonical PI/AC headings", `use "## ${id}: ..."`));
  }
}

function listItemBlock(lines: string[], start: number): string[] {
  const block = [lines[start]];
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() && !/^\s/.test(line)) {
      break;
    }
    block.push(line);
  }
  return block;
}

function findDefinitionHeadings(lines: string[], kind: "PI" | "AC") {
  const pattern = new RegExp(`^(#{1,6})\\s+(${kind}-\\d{3,})\\b(?:\\s*[:.-]\\s*|\\s+)?(.*?)\\s*$`, "i");
  return lines.flatMap((line, index) => {
    const match = pattern.exec(line);
    if (!match) {
      return [];
    }
    return [{
      id: match[2].toUpperCase(),
      level: match[1].length,
      title: cleanValue(match[3]) || match[2].toUpperCase(),
      index,
      line: index + 1
    }];
  });
}

function sectionEndLine(lines: string[], headingIndex: number, headingLevel: number): number {
  for (let index = headingIndex + 1; index < lines.length; index++) {
    const match = /^(#{1,6})\s+/.exec(lines[index]);
    if (match && match[1].length <= headingLevel) {
      return index;
    }
  }
  return lines.length;
}

function containsKnownField(line: string, allowedFields: Set<string>): boolean {
  for (const field of allowedFields) {
    if (new RegExp(`\\b${field}\\b\\s*:`, "i").test(line) || new RegExp(`\\b${field}\\b`, "i").test(line)) {
      return true;
    }
  }
  return false;
}

function splitScalarArray(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => cleanValue(item))
    .filter(Boolean);
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function cleanValue(value: string): string {
  return value.replace(/^[-#*\s]+/, "").trim();
}
