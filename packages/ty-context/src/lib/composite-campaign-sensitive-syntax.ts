import {
  COMPOSITE_REDACTED,
  isExplicitlyRedacted,
  isSensitiveKey,
  secretLabelForKey
} from "./composite-campaign-sensitive-rules.js";

const SCALAR_TOKEN = '"(?:\\\\.|[^"])*"|\'(?:\'\'|[^\'])*\'|[^\\s]+';
const SETX_CREDENTIAL = new RegExp(
  `^([ \\t]*setx[ \\t]+)([A-Za-z_][A-Za-z0-9_-]*)([ \\t]+)(${SCALAR_TOKEN})((?:[ \\t]+.*)?)$`,
  "i"
);
const URI_USERINFO = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^@\s/:]*):([^@\s]+)@/g;
const CASE_INSENSITIVE_COMMANDS = new Set([
  "bash", "cmd", "curl", "docker", "git", "kubectl", "node", "npm", "npx",
  "powershell", "pwsh", "python", "setx", "sh", "tool"
]);

interface CredentialSpan {
  key: string;
  value: string;
  start: number;
  end: number;
  replacement: string;
}

interface CommandToken {
  raw: string;
  value: string;
  start: number;
}

export function redactAuxiliaryCredentialSyntax(line: string): { content: string; redactionCount: number } {
  let content = line;
  let redactionCount = 0;
  const spans = commandCredentialSpans(line);
  if (spans.length > 0) {
    let cursor = 0;
    const output: string[] = [];
    for (const span of spans) {
      output.push(line.slice(cursor, span.start));
      if (isExplicitlyRedacted(span.key, span.value)) {
        output.push(line.slice(span.start, span.end));
      } else {
        output.push(span.replacement);
        redactionCount += 1;
      }
      cursor = span.end;
    }
    output.push(line.slice(cursor));
    content = output.join("");
  }
  content = content.replace(URI_USERINFO, (match, scheme: string, user: string, password: string) => {
    if (password === COMPOSITE_REDACTED) return match;
    redactionCount += 1;
    return `${scheme}${user}:${COMPOSITE_REDACTED}@`;
  });
  return { content, redactionCount };
}

export function auxiliaryCredentialLabel(value: string): string | undefined {
  for (const line of value.replace(/\r\n?/g, "\n").split("\n")) {
    for (const span of commandCredentialSpans(line)) {
      if (!isExplicitlyRedacted(span.key, span.value)) return secretLabelForKey(span.key);
    }
    URI_USERINFO.lastIndex = 0;
    for (const uri of line.matchAll(URI_USERINFO)) {
      if (uri[3] !== COMPOSITE_REDACTED) {
        URI_USERINFO.lastIndex = 0;
        return "uri_password";
      }
    }
    URI_USERINFO.lastIndex = 0;
  }
  return undefined;
}

function commandCredentialSpans(line: string): CredentialSpan[] {
  const setx = SETX_CREDENTIAL.exec(line);
  if (setx && isSensitiveKey(setx[2])) {
    const start = setx[1].length + setx[2].length + setx[3].length;
    return [credentialSpan(setx[2], setx[4], start)];
  }
  const tokens = tokenizeCommandLine(line);
  if (tokens.length === 0 || !hasReasonableCommandToken(tokens[0].value)) return [];
  const spans: CredentialSpan[] = [];
  for (let index = 1; index < tokens.length; index += 1) {
    const option = /^--([A-Za-z_][A-Za-z0-9_-]*)$/.exec(tokens[index].value);
    if (!option || !isSensitiveKey(option[1])) continue;
    const value = tokens[index + 1];
    if (!value || value.value.startsWith("-")) continue;
    spans.push(credentialSpan(option[1], value.raw, value.start));
    index += 1;
  }
  return spans;
}

function credentialSpan(key: string, token: string, start: number): CredentialSpan {
  const quote = token[0] === '"' || token[0] === "'" ? token[0] : "";
  const value = quote ? token.slice(1, -1) : token;
  return {
    key,
    value,
    start,
    end: start + token.length,
    replacement: `${quote}${COMPOSITE_REDACTED}${quote}`
  };
}

function tokenizeCommandLine(line: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  let index = 0;
  while (index < line.length) {
    while (line[index] === " " || line[index] === "\t") index += 1;
    if (index >= line.length) break;
    const start = index;
    const quote = line[index] === '"' || line[index] === "'" ? line[index] : "";
    if (quote) {
      index += 1;
      while (index < line.length) {
        if (quote === '"' && line[index] === "\\" && index + 1 < line.length) {
          index += 2;
        } else if (quote === "'" && line[index] === "'" && line[index + 1] === "'") {
          index += 2;
        } else if (line[index] === quote) {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
    } else {
      while (index < line.length && line[index] !== " " && line[index] !== "\t") index += 1;
    }
    const raw = line.slice(start, index);
    const closedQuote = quote && raw.endsWith(quote) && raw.length > 1;
    tokens.push({ raw, value: closedQuote ? raw.slice(1, -1) : raw, start });
  }
  return tokens;
}

function hasReasonableCommandToken(token: string): boolean {
  if (/^[A-Za-z0-9 _.\\/:+-]+$/.test(token) && /[.\\/]/.test(token)) return true;
  if (!/^[A-Za-z0-9_.\\/:+-]+$/.test(token)) return false;
  if (CASE_INSENSITIVE_COMMANDS.has(token.toLowerCase())) return true;
  return /^[a-z][a-z0-9_]*$/.test(token) || /[-.\\/]/.test(token) || /[a-z][A-Z]/.test(token);
}
