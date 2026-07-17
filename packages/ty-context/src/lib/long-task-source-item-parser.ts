import type {
  CompiledSourceItemV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { RISK_FACT_NAMES, type RiskFactName } from "./long-task-risk-types.js";
import { sha256Hex } from "./strict-codec.js";

const KINDS = new Set<SourceItemKind>([
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "non_completing",
  "non_goal",
  "forbidden_shortcut",
  "risk_fact",
  "external_confirmation",
  "decision",
]);
const RISK_FACTS = new Set<RiskFactName>(RISK_FACT_NAMES);

const START = /^\s*<!--\s*ty-source-item:start\s+(.+?)\s*-->\s*$/u;
const END = /^\s*<!--\s*ty-source-item:end\s*-->\s*$/u;

export function parseSourceItems(
  sourcePath: string,
  content: string,
): CompiledSourceItemV2[] {
  const items: CompiledSourceItemV2[] = [];
  const seen = new Set<string>();
  let open: {
    key: string;
    kind: SourceItemKind;
    risk_semantics?: CompiledSourceItemV2["risk_semantics"];
    lines: string[];
    line: number;
  } | null = null;
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  for (const [index, line] of lines.entries()) {
    const start = START.exec(line);
    if (start) {
      if (open)
        throw new Error(
          `source_item_nested_or_overlapping:${sourcePath}:${open.key}:${index + 1}`,
        );
      const marker = parseStartMarker(sourcePath, index + 1, start[1]);
      open = { ...marker, lines: [], line: index + 1 };
      continue;
    }
    if (END.test(line)) {
      if (!open)
        throw new Error(
          `source_item_end_without_start:${sourcePath}:${index + 1}`,
        );
      const normalizedText = normalizeSourceItemText(open.lines.join("\n"));
      if (!normalizedText)
        throw new Error(`source_item_empty:${sourcePath}:${open.key}`);
      if (seen.has(open.key))
        throw new Error(`source_item_key_duplicate:${open.key}`);
      seen.add(open.key);
      items.push({
        key: open.key,
        kind: open.kind,
        source_path: sourcePath,
        normalized_text: normalizedText,
        text_sha256: sha256Hex(normalizedText),
        ...(open.risk_semantics ? { risk_semantics: open.risk_semantics } : {}),
      });
      open = null;
      continue;
    }
    if (
      line.includes("ty-source-item:start") ||
      line.includes("ty-source-item:end")
    )
      throw new Error(`source_item_marker_invalid:${sourcePath}:${index + 1}`);
    if (open) open.lines.push(line);
  }
  if (open)
    throw new Error(
      `source_item_unclosed:${sourcePath}:${open.key}:${open.line}`,
    );
  return items;
}

function parseStartMarker(
  sourcePath: string,
  line: number,
  declaration: string,
): Pick<CompiledSourceItemV2, "key" | "kind" | "risk_semantics"> {
  const attributes = new Map<string, string>();
  for (const token of declaration.trim().split(/\s+/u)) {
    const match = /^([a-z_]+)=([^\s=]+)$/u.exec(token);
    if (!match)
      throw new Error(`source_item_marker_invalid:${sourcePath}:${line}`);
    if (attributes.has(match[1]))
      throw new Error(
        `source_item_marker_attribute_duplicate:${sourcePath}:${line}:${match[1]}`,
      );
    attributes.set(match[1], match[2]);
  }
  for (const name of attributes.keys())
    if (!["key", "kind", "fact", "outcome"].includes(name))
      throw new Error(
        `source_item_marker_attribute_unknown:${sourcePath}:${line}:${name}`,
      );
  const key = attributes.get("key") ?? "";
  const kind = (attributes.get("kind") ?? "") as SourceItemKind;
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(key) || !KINDS.has(kind))
    throw new Error(`source_item_marker_invalid:${sourcePath}:${line}`);
  const fact = attributes.get("fact");
  const outcome = attributes.get("outcome");
  if (kind !== "risk_fact") {
    if (fact !== undefined || outcome !== undefined)
      throw new Error(
        `source_item_marker_attributes_forbidden:${sourcePath}:${key}:${kind}`,
      );
    return { key, kind };
  }
  if (!fact || !outcome)
    throw new Error(`source_item_risk_semantics_required:${sourcePath}:${key}`);
  if (!RISK_FACTS.has(fact as RiskFactName))
    throw new Error(
      `source_item_risk_fact_invalid:${sourcePath}:${key}:${fact}`,
    );
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(outcome))
    throw new Error(
      `source_item_risk_outcome_invalid:${sourcePath}:${key}:${outcome}`,
    );
  return {
    key,
    kind,
    risk_semantics: {
      fact: fact as RiskFactName,
      affected_outcome: outcome,
    },
  };
}

export function normalizeSourceItemText(value: string): string {
  const lines = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  return lines.join("\n");
}
