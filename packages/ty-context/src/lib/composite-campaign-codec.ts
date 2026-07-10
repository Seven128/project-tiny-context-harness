import { createHash } from "node:crypto";
import YAML, { isAlias, isMap, isPair, isScalar, isSeq, visit, type Document, type Node } from "yaml";

export function canonicalJson(value: unknown): string {
  assertCanonicalValue(value, "$", new Set());
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function canonicalYaml(value: unknown): string {
  assertCanonicalValue(value, "$", new Set());
  return oneTrailingNewline(YAML.stringify(value, {
    aliasDuplicateObjects: false,
    blockQuote: false,
    directives: false,
    doubleQuotedAsJSON: true,
    lineWidth: 0,
    sortMapEntries: false
  }));
}

export function parseStrictJson(content: string): unknown {
  assertTextInput(content, "JSON");
  const duplicateCheck = YAML.parseAllDocuments(content, {
    schema: "json",
    strict: true,
    stringKeys: true,
    uniqueKeys: true
  });
  assertSingleValidDocument(duplicateCheck, "JSON");
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON syntax: ${messageOf(error)}`);
  }
}

export function parseStrictYaml(content: string): unknown {
  assertTextInput(content, "YAML");
  if (/^%(?:YAML|TAG)\b/m.test(content)) {
    throw new Error("YAML directives are not allowed");
  }
  const documents = YAML.parseAllDocuments(content, {
    merge: false,
    schema: "core",
    strict: true,
    stringKeys: true,
    uniqueKeys: true
  });
  const document = assertSingleValidDocument(documents, "YAML");
  const hasTagDirective = Object.keys(document.directives.tags).some((handle) => handle !== "!!");
  if (document.directives.yaml.explicit || hasTagDirective) {
    throw new Error("YAML directives are not allowed");
  }
  inspectYamlNodes(document);
  return document.toJS({ maxAliasCount: 0 }) as unknown;
}

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSingleValidDocument(documents: Document.Parsed[], label: string): Document.Parsed {
  if (documents.length !== 1) {
    throw new Error(`${label} must contain exactly one document; multiple documents are not allowed`);
  }
  const document = documents[0];
  const issue = document.errors[0] ?? document.warnings[0];
  if (issue) {
    throw new Error(`Invalid ${label}: ${issue.message}`);
  }
  return document;
}

function inspectYamlNodes(document: Document.Parsed): void {
  visit(document, (_key, node) => {
    if (isAlias(node)) {
      throw new Error("YAML aliases are not allowed");
    }
    const anchored = node as Node & { anchor?: string; tag?: string };
    if (anchored.anchor) {
      throw new Error("YAML anchors are not allowed");
    }
    if (anchored.tag) {
      throw new Error("YAML explicit tags are not allowed");
    }
    if (isPair(node) && isScalar(node.key) && node.key.value === "<<") {
      throw new Error("YAML merge keys are not allowed");
    }
    if (isMap(node) || isSeq(node) || isScalar(node) || isPair(node)) {
      return;
    }
    throw new Error("Unsupported YAML node");
  });
}

function assertCanonicalValue(value: unknown, path: string, ancestors: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Canonical value at ${path} must be a finite number`);
    return;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Canonical value at ${path} is not JSON-compatible`);
  }
  if (ancestors.has(value)) throw new Error(`Canonical value at ${path} contains a cycle`);
  ancestors.add(value);
  if (Array.isArray(value)) {
    assertPlainArrayOwnProperties(value, path);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new Error(`Canonical value at ${path}[${index}] contains a sparse array hole`);
      }
      assertCanonicalValue(value[index], `${path}[${index}]`, ancestors);
    }
  } else {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Canonical value at ${path} must be a plain object`);
    }
    for (const key of assertPlainObjectOwnProperties(value, path)) {
      assertCanonicalValue((value as Record<string, unknown>)[key], `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function assertPlainObjectOwnProperties(value: object, path: string): string[] {
  const keys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      throw new Error(`Canonical value at ${path} contains a symbol own property`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable) {
      throw new Error(`Canonical value at ${path}.${key} contains a non-enumerable own property`);
    }
    if (!("value" in descriptor)) {
      throw new Error(`Canonical value at ${path}.${key} contains an accessor own property`);
    }
    keys.push(key);
  }
  return keys;
}

function assertPlainArrayOwnProperties(value: unknown[], path: string): void {
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    if (typeof key === "symbol") {
      throw new Error(`Canonical array at ${path} contains a symbol own property`);
    }
    if (!/^(?:0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length || String(Number(key)) !== key) {
      throw new Error(`Canonical array at ${path} contains an extra own property ${key}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!("value" in descriptor)) {
      throw new Error(`Canonical array at ${path}[${key}] contains an accessor own property`);
    }
    if (!descriptor.enumerable) {
      throw new Error(`Canonical array at ${path}[${key}] contains a non-enumerable own property`);
    }
  }
}

function oneTrailingNewline(value: string): string {
  return `${value.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
}

function assertTextInput(content: string, label: string): void {
  if (typeof content !== "string") throw new TypeError(`${label} input must be a string`);
  if (content.charCodeAt(0) === 0xfeff) throw new Error(`${label} byte-order marks are not allowed`);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
