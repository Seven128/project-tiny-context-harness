import { auxiliaryCredentialLabel, redactAuxiliaryCredentialSyntax } from "./composite-campaign-sensitive-syntax.js";
import {
  COMPOSITE_REDACTED,
  isExplicitlyRedacted,
  isHighConfidenceCredential,
  isRedactedValue,
  isSensitiveKey,
  normalizeSensitiveKey,
  secretLabelForKey
} from "./composite-campaign-sensitive-rules.js";

const PRIVATE_KEY_BLOCK = /-----BEGIN ((?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?)-----[\s\S]*?-----END \1-----/gi;
const PRIVATE_KEY_HEADER = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/i;
const PROVIDER_TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|npm_[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9_-]{20,}|sk-ant-api03-[A-Za-z0-9_-]{16,}|sk[-_](?:live|test|proj)[_-][A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{24,}|(?:AKIA|ASIA)[A-Z0-9]{16}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{12,}|eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,})\b/g;
const BARE_AUTHORIZATION = /\b(bearer\s+)([^\s,;]+)/gi;
const ASSIGNMENT = /(^|[^A-Za-z0-9_])(?:(?:export)[ \t]+)?(["']?)([A-Za-z_][A-Za-z0-9_-]*)\2[ \t]*(\+=|:|=)[ \t]*/gi;

interface Assignment {
  key: string;
  operator: string;
  valueStart: number;
  cliOption: boolean;
}

interface Scalar {
  end: number;
  value: string;
  replacement: string;
}

interface SimpleBlockHeader {
  prefix: string;
  keyIndent: number;
}

export interface SanitizedRequestText {
  content: string;
  redactionCount: number;
}

export function sanitizeCompositeRequestText(raw: string): SanitizedRequestText {
  let redactionCount = 0;
  let normalized = normalizeText(raw);
  assertNoEmptySensitiveAssignments(normalized);
  normalized = normalized.replace(PRIVATE_KEY_BLOCK, () => {
    redactionCount += 1;
    return COMPOSITE_REDACTED;
  });
  const blocks = redactSensitiveYamlBlockScalars(normalized);
  normalized = blocks.content;
  redactionCount += blocks.redactionCount;
  const lines = normalized.replace(/\n$/, "").split("\n").map((line) => {
    const assignments = redactSensitiveAssignments(line);
    redactionCount += assignments.redactionCount;
    const auxiliary = redactAuxiliaryCredentialSyntax(assignments.content);
    redactionCount += auxiliary.redactionCount;
    let sanitized = auxiliary.content.replace(BARE_AUTHORIZATION, (match, prefix: string, credential: string) => {
      if (isRedactedValue(credential) || !isHighConfidenceCredential(credential)) return match;
      redactionCount += 1;
      return `${prefix}${COMPOSITE_REDACTED}`;
    });
    sanitized = sanitized.replace(PROVIDER_TOKEN, () => {
      redactionCount += 1;
      return COMPOSITE_REDACTED;
    });
    return sanitized;
  });
  const content = `${lines.join("\n").replace(/\n*$/, "")}\n`;
  if (content.split("\n").some((line) => secretLabelForText(line))) {
    throw new Error("Composite campaign request sanitization left residual secret or credential material");
  }
  return { content, redactionCount };
}

export function secretLabelForText(value: string): string | undefined {
  PRIVATE_KEY_BLOCK.lastIndex = 0;
  if (PRIVATE_KEY_BLOCK.test(value)) {
    PRIVATE_KEY_BLOCK.lastIndex = 0;
    return "private_key";
  }
  PRIVATE_KEY_BLOCK.lastIndex = 0;
  if (PRIVATE_KEY_HEADER.test(value)) return "private_key";
  for (const line of value.replace(/\r\n?/g, "\n").split("\n")) {
    if (sensitiveYamlBlockCandidate(line)) return "yaml_block_secret";
    for (const assignment of sensitiveAssignments(line)) {
      const scalar = readScalar(line, assignment);
      if (!isExplicitlyRedacted(assignment.key, scalar.value)) return secretLabelForKey(assignment.key);
    }
  }
  for (const bearer of value.matchAll(BARE_AUTHORIZATION)) {
    if (!isRedactedValue(bearer[2]) && isHighConfidenceCredential(bearer[2])) return "bearer_token";
  }
  const auxiliary = auxiliaryCredentialLabel(value);
  if (auxiliary) return auxiliary;
  PROVIDER_TOKEN.lastIndex = 0;
  const provider = PROVIDER_TOKEN.test(value);
  PROVIDER_TOKEN.lastIndex = 0;
  return provider ? "provider_token" : undefined;
}

function redactSensitiveAssignments(line: string): { content: string; redactionCount: number } {
  let content = "";
  let cursor = 0;
  let redactionCount = 0;
  for (const assignment of sensitiveAssignments(line)) {
    if (assignment.valueStart < cursor) continue;
    const scalar = readScalar(line, assignment);
    content += line.slice(cursor, assignment.valueStart);
    if (isExplicitlyRedacted(assignment.key, scalar.value)) {
      content += line.slice(assignment.valueStart, scalar.end);
    } else {
      content += replacementFor(assignment.key, scalar, line.slice(0, assignment.valueStart));
      redactionCount += 1;
    }
    cursor = scalar.end;
  }
  return { content: `${content}${line.slice(cursor)}`, redactionCount };
}

function assertNoEmptySensitiveAssignments(value: string): void {
  for (const line of value.replace(/\n$/, "").split("\n")) {
    for (const assignment of sensitiveAssignments(line)) {
      const tail = line.slice(assignment.valueStart);
      if (/^\s*(?:(?:#|\/\/).*)?$/.test(tail) || /^\s*[,}\]]/.test(tail)) {
        throw new Error("Sensitive assignment has an empty or comment-only value; refusing to persist request content");
      }
    }
  }
}

function sensitiveAssignments(line: string): Assignment[] {
  const assignments: Assignment[] = [];
  ASSIGNMENT.lastIndex = 0;
  for (let match = ASSIGNMENT.exec(line); match; match = ASSIGNMENT.exec(line)) {
    if (!isSensitiveKey(match[3])) continue;
    const keyOffset = match[0].lastIndexOf(match[3]);
    const keyStart = match.index + keyOffset;
    assignments.push({
      key: match[3],
      operator: match[4],
      valueStart: match.index + match[0].length,
      cliOption: keyStart >= 2 && line.slice(keyStart - 2, keyStart) === "--"
    });
  }
  ASSIGNMENT.lastIndex = 0;
  return assignments;
}

function readScalar(line: string, assignment: Assignment): Scalar {
  const start = assignment.valueStart;
  const quote = line[start];
  if (quote === '"' || quote === "'") {
    for (let index = start + 1; index < line.length; index += 1) {
      if (line[index] === "\\") {
        index += 1;
      } else if (quote === "'" && line[index] === "'" && line[index + 1] === "'") {
        index += 1;
      } else if (line[index] === quote) {
        return { end: index + 1, value: line.slice(start + 1, index), replacement: `${quote}${COMPOSITE_REDACTED}${quote}` };
      }
    }
    throw new Error("Sensitive quoted assignment is unterminated; refusing to persist request content");
  }
  const tail = line.slice(start);
  if (assignment.cliOption) {
    const token = /^[^\s]+/.exec(tail)?.[0] ?? "";
    return { end: start + token.length, value: token, replacement: COMPOSITE_REDACTED };
  }
  const closing = /^(.*?)([ \t]*[,}][ \t]*)$/.exec(tail);
  const value = closing ? closing[1] : tail;
  if (/\\[ \t]*$/.test(value)) {
    throw new Error("Sensitive scalar uses an ambiguous backslash continuation; refusing to persist request content");
  }
  return { end: start + value.length, value, replacement: COMPOSITE_REDACTED };
}

function replacementFor(key: string, scalar: Scalar, prefix: string): string {
  if (scalar.replacement !== COMPOSITE_REDACTED) {
    return isWholeLineAssignmentPrefix(prefix) ? COMPOSITE_REDACTED : scalar.replacement;
  }
  if (/(?:^|_)authorization$/.test(normalizeSensitiveKey(key))) {
    const scheme = /^\s*(bearer|basic)\s+/i.exec(scalar.value);
    if (scheme) return `${scheme[1]} ${COMPOSITE_REDACTED}`;
  }
  return COMPOSITE_REDACTED;
}

function isWholeLineAssignmentPrefix(value: string): boolean {
  return /^[ \t]*(?:[-*+][ \t]+)?(?:["'][A-Za-z_][A-Za-z0-9_-]*["']|[A-Za-z_][A-Za-z0-9_-]*)[ \t]*(?:\+=|:|=)[ \t]*$/.test(value);
}

function redactSensitiveYamlBlockScalars(value: string): SanitizedRequestText {
  const lines = value.replace(/\n$/, "").split("\n");
  const output: string[] = [];
  let redactionCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const header = simpleSensitiveBlockHeader(lines[index]);
    if (!header) {
      if (sensitiveYamlBlockCandidate(lines[index])) {
        throw new Error("Sensitive YAML block scalar uses an unsupported or ambiguous form; refusing to persist request content");
      }
      output.push(lines[index]);
      continue;
    }
    output.push(`${header.prefix}${COMPOSITE_REDACTED}`);
    redactionCount += 1;
    let contentIndent: number | null = null;
    let cursor = index + 1;
    for (; cursor < lines.length; cursor += 1) {
      const next = lines[cursor];
      if (/^[ ]*$/.test(next)) continue;
      const indentation = /^[ \t]*/.exec(next)![0];
      if (indentation.includes("\t")) throw new Error("Sensitive YAML block scalar has ambiguous tab indentation; refusing to persist request content");
      const indent = indentation.length;
      if (contentIndent === null) {
        if (indent <= header.keyIndent) {
          if (!isUnambiguousYamlPeerBoundary(next)) throw new Error("Sensitive YAML block scalar body has ambiguous indentation; refusing to persist request content");
          break;
        }
        contentIndent = indent;
      } else if (indent < contentIndent) {
        if (indent > header.keyIndent) throw new Error("Sensitive YAML block scalar has ambiguous indentation; refusing to persist request content");
        break;
      }
    }
    index = cursor - 1;
  }
  return { content: `${output.join("\n")}\n`, redactionCount };
}

function simpleSensitiveBlockHeader(line: string): SimpleBlockHeader | null {
  const match = /^(([ ]*)((?:[-*+][ ]+)?)(?:(["'])([A-Za-z_][A-Za-z0-9_-]*)\4|([A-Za-z_][A-Za-z0-9_-]*))[ ]*:[ ]*)([|>][+-]?)(?:[ ]*#.*)?$/.exec(line);
  if (!match || !isSensitiveKey(match[5] ?? match[6])) return null;
  return { prefix: match[1], keyIndent: match[2].length + match[3].length };
}

function sensitiveYamlBlockCandidate(line: string): boolean {
  return sensitiveAssignments(line).some((assignment) => assignment.operator === ":" &&
    /^(?:(?:!![^\s]+|&[^\s]+)[ \t]+)*[|>]/.test(line.slice(assignment.valueStart).trim()));
}

function isUnambiguousYamlPeerBoundary(value: string): boolean {
  const trimmed = value.trimStart();
  return /^(?:#|---(?:\s|$)|\.\.\.(?:\s|$)|[-*+]\s+|(?:["'][^"'\r\n]+["']|[A-Za-z0-9_.-]+)\s*:)/.test(trimmed);
}

function normalizeText(value: string): string {
  return `${value.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
}
