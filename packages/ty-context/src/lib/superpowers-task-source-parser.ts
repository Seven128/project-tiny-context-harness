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
  const errors: string[] = [];
  rejectListStyleDefinitions(lines, options, errors);
  const headings = findDefinitionHeadings(lines, options.kind);
  const seen = new Map<string, number>();
  const definitions: ParsedDefinition[] = [];

  for (const heading of headings) {
    const firstLine = seen.get(heading.id);
    if (firstLine !== undefined) {
      errors.push(
        `${heading.id} duplicate definition at ${options.sourceFile}:${firstLine} and ${options.sourceFile}:${heading.line}`
      );
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
    errors.push(`${options.sourceFile} must define ${options.kind} items with Markdown headings like "## ${options.kind}-001: ..."`);
  }
  throwIfErrors(errors);
  return definitions;
}

export function parseDocumentFields(content: string, sourceFile: string, allowedFields: Set<string>): Record<string, ParsedField> {
  const errors: string[] = [];
  const fields = parseFields(splitLines(content), sourceFile, 1, allowedFields, errors);
  throwIfErrors(errors);
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
  errors: string[]
): Record<string, ParsedField> {
  const fields: Record<string, ParsedField> = {};
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = startLine + index;
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading && allowedFields.has(heading[2].trim())) {
      errors.push(`${sourceFile}:${lineNumber} field headings are not supported; use "${heading[2].trim()}: ..."`);
      continue;
    }
    if (/^\s*\|/.test(line) && containsKnownField(line, allowedFields)) {
      errors.push(`${sourceFile}:${lineNumber} table fields are not supported; use key: value fields`);
      continue;
    }
    const match = /^([a-z][a-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const name = match[1];
    if (!allowedFields.has(name)) {
      if (name.includes("_")) {
        errors.push(`${sourceFile}:${lineNumber} unknown field ${name}`);
      }
      continue;
    }
    if (fields[name]) {
      errors.push(`${sourceFile}:${lineNumber} duplicate field ${name}`);
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
  errors: string[]
): { value: string | string[]; endIndex: number } {
  const trimmed = rest.trim();
  if (trimmed === "|") {
    const block: string[] = [];
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const next = lines[cursor];
      if (next.trim() && !/^\s/.test(next)) {
        break;
      }
      block.push(next.replace(/^\s{0,2}/, ""));
    }
    if (block.length === 0) {
      errors.push(`${sourceFile}:${lineNumber} block field must include indented text`);
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
    if (!/^\s/.test(next)) {
      break;
    }
    const listItem = /^\s*[-*+]\s+(.+?)\s*$/.exec(next);
    if (!listItem) {
      errors.push(`${sourceFile}:${cursor + 1} field lists must use indented "- item" entries or key: | blocks`);
      continue;
    }
    values.push(cleanValue(listItem[1]));
  }
  return { value: values, endIndex: cursor - 1 };
}

function rejectListStyleDefinitions(
  lines: string[],
  options: DefinitionParseOptions,
  errors: string[]
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
    errors.push(`${id} list-style definition is not allowed at ${options.sourceFile}:${index + 1}; use "## ${id}: ..."`);
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

function throwIfErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`Superpowers source compile failed:\n- ${errors.join("\n- ")}`);
  }
}
