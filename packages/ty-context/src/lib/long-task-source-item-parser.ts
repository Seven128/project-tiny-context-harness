import type {
  CompiledSourceItemV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { sha256Hex } from "./strict-codec.js";

const KINDS = new Set<SourceItemKind>([
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "non_goal",
  "forbidden_shortcut",
  "risk_fact",
  "external_confirmation",
  "decision",
]);

const START =
  /^\s*<!--\s*ty-source-item:start\s+key=([a-z0-9][a-z0-9-]*)\s+kind=([a-z_]+)\s*-->\s*$/u;
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
      const kind = start[2] as SourceItemKind;
      if (!KINDS.has(kind))
        throw new Error(
          `source_item_kind_invalid:${sourcePath}:${start[1]}:${start[2]}`,
        );
      open = { key: start[1], kind, lines: [], line: index + 1 };
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

export function normalizeSourceItemText(value: string): string {
  const lines = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  return lines.join("\n");
}
