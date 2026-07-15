import { createHash } from "node:crypto";
import YAML, {
  isAlias,
  isMap,
  isPair,
  isScalar,
  isSeq,
  visit,
  type Document,
  type Node,
} from "yaml";

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortCanonical(value), null, 2)}\n`;
}

export function canonicalValueJson(value: unknown): string {
  return JSON.stringify(sortCanonical(value));
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseStrictYaml(content: string): unknown {
  if (content.charCodeAt(0) === 0xfeff)
    throw new Error("YAML byte-order marks are not allowed");
  if (/^%(?:YAML|TAG)\b/m.test(content))
    throw new Error("YAML directives are not allowed");
  const documents = YAML.parseAllDocuments(content, {
    merge: false,
    schema: "core",
    strict: true,
    stringKeys: true,
    uniqueKeys: true,
  });
  const document = assertSingleDocument(documents);
  if (
    document.directives.yaml.explicit ||
    Object.keys(document.directives.tags).some((handle) => handle !== "!!")
  )
    throw new Error("YAML directives are not allowed");
  visit(document, (_key, node) => inspectNode(node));
  return document.toJS({ maxAliasCount: 0 }) as unknown;
}

function assertSingleDocument(documents: Document.Parsed[]): Document.Parsed {
  if (documents.length !== 1)
    throw new Error("YAML must contain exactly one document");
  const document = documents[0];
  const issue = document.errors[0] ?? document.warnings[0];
  if (issue) throw new Error(`Invalid YAML: ${issue.message}`);
  return document;
}

function inspectNode(node: unknown): void {
  if (isAlias(node)) throw new Error("YAML aliases are not allowed");
  const tagged = node as Node & { anchor?: string; tag?: string };
  if (tagged.anchor) throw new Error("YAML anchors are not allowed");
  if (tagged.tag) throw new Error("YAML explicit tags are not allowed");
  if (isPair(node) && isScalar(node.key) && node.key.value === "<<")
    throw new Error("YAML merge keys are not allowed");
  if (isMap(node) || isSeq(node) || isScalar(node) || isPair(node)) return;
  throw new Error("Unsupported YAML node");
}

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          sortCanonical((value as Record<string, unknown>)[key]),
        ]),
    );
  return value;
}
