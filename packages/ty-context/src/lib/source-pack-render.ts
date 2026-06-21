import type { ContextAreaMapping, ContextArtifact, SourcePackOmitted, SourcePackRecord } from "./source-pack-types.js";

export const SOURCE_PACK_EXPORT_HEADER = "Export artifact. Do not reference from project_context/context.toml.";

export interface RenderMeta {
  generatedAt: string;
  outputPath: string;
  command: string;
  toolVersion: string;
}

export function renderFullProjectContextArtifact(contexts: ContextArtifact[], warnings: string[], meta: RenderMeta): string {
  return [
    "# Full Project Context Export",
    "",
    `> ${SOURCE_PACK_EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${meta.generatedAt}`,
    `- output_path: ${meta.outputPath}`,
    `- command: ${meta.command}`,
    `- source_context_count: ${contexts.filter((context) => context.relative.startsWith("project_context/")).length}`,
    "- warnings:",
    ...renderWarningList(warnings),
    "",
    "## Export Boundary",
    "",
    "- This temporary artifact is for external planning and handoff only.",
    "- Do not register it in project_context/context.toml.",
    "",
    "## Context Sources",
    "",
    ...contexts.map(renderContextArtifact),
    ""
  ].join("\n");
}

export function renderCodeIndexArtifact(
  records: SourcePackRecord[],
  areas: ContextAreaMapping[],
  warnings: string[],
  meta: RenderMeta
): string {
  const totalLines = records.reduce((sum, record) => sum + record.lines, 0);
  const totalCharacters = records.reduce((sum, record) => sum + record.characters, 0);
  return [
    "# Code Index Export",
    "",
    `> ${SOURCE_PACK_EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${meta.generatedAt}`,
    `- output_path: ${meta.outputPath}`,
    `- command: ${meta.command}`,
    `- tool_version: ${meta.toolVersion}`,
    `- source_file_count: ${records.length}`,
    `- total_lines: ${totalLines}`,
    `- total_characters: ${totalCharacters}`,
    "- warnings:",
    ...renderWarningList(warnings),
    "",
    "## Repository Shape",
    "",
    renderRepositoryShape(records),
    "",
    "## Context Area Mapping",
    "",
    "Inferred buckets below are export routing only; they are not durable architecture or product ownership facts.",
    areas.length > 0 ? areas.map((area) => `- ${area.id}: root=${area.root}; context=${area.context}`).join("\n") : "- No Context area mappings found.",
    "",
    "## Key Entry Points",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("entry")).slice(0, 30)),
    "",
    "## API / Route Index",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("api")).slice(0, 30), true),
    "",
    "## UI Surface Index",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("ui")).slice(0, 30)),
    "",
    "## CLI / Worker / Script Index",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("cli") || record.tags.includes("worker")).slice(0, 30)),
    "",
    "## Test / Verification Index",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("test")).slice(0, 30)),
    "",
    "## Oversized Files",
    "",
    renderRecordList(records.filter((record) => record.tags.includes("oversized")).slice(0, 30)),
    "",
    "## Source File Index",
    "",
    renderSourceFileIndex(records),
    ""
  ].join("\n");
}

export function renderBundleArtifact(
  title: string,
  records: SourcePackRecord[],
  contexts: ContextArtifact[],
  omitted: SourcePackOmitted,
  warnings: string[],
  meta: RenderMeta,
  policy: string
): string {
  return [
    `# ${title}`,
    "",
    `> ${SOURCE_PACK_EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${meta.generatedAt}`,
    `- output_path: ${meta.outputPath}`,
    `- command: ${meta.command}`,
    `- source_file_count: ${records.length}`,
    "- warnings:",
    ...renderWarningList(warnings),
    "",
    "## Bundle Selection Policy",
    "",
    policy,
    "",
    "## Bundle Index",
    "",
    renderSourceFileIndex(records),
    "",
    "## Related Context Paths",
    "",
    contexts.length > 0 ? contexts.map((context) => `- ${context.relative} (${context.lines} lines)`).join("\n") : "- No related Context files selected.",
    "",
    "## Source Files",
    "",
    records.map(renderSourceRecord).join("\n\n") || "- No source files selected for this bundle.",
    "",
    "## Omitted Files Summary",
    "",
    renderOmittedSummary(omitted),
    ""
  ].join("\n");
}

export function renderTaskContextArtifact(
  taskName: string,
  contexts: ContextArtifact[],
  records: SourcePackRecord[],
  verification: string[],
  omitted: SourcePackOmitted,
  warnings: string[],
  meta: RenderMeta
): string {
  return [
    `# Task Context: ${taskName}`,
    "",
    `> ${SOURCE_PACK_EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${meta.generatedAt}`,
    `- output_path: ${meta.outputPath}`,
    `- command: ${meta.command}`,
    "- warnings:",
    ...renderWarningList(warnings),
    "",
    "## Boundary",
    "",
    "- This task pack is a temporary export selector output, not a durable fact source.",
    "- Profile verification commands are listed only; export does not execute them.",
    "",
    "## Selected Context",
    "",
    ...contexts.map(renderContextArtifact),
    "",
    "## Selected Source Index",
    "",
    renderSourceFileIndex(records),
    "",
    "## Selected Source Files",
    "",
    records.map(renderSourceRecord).join("\n\n") || "- No selected source files matched the task filters.",
    "",
    "## Verification Entry Points",
    "",
    verification.length > 0 ? verification.map((entry) => `- ${entry}`).join("\n") : "- No profile verification entries selected.",
    "",
    "## Omitted / Support Notes",
    "",
    renderOmittedSummary(omitted),
    ""
  ].join("\n");
}

function renderContextArtifact(context: ContextArtifact): string {
  const fence = fenceFor(context.content);
  return [`### ${context.relative}`, "", `${fence}markdown`, context.content.trimEnd(), fence, ""].join("\n");
}

function renderSourceRecord(record: SourcePackRecord): string {
  const fence = fenceFor(record.content);
  return [
    `### ${record.relative}`,
    "",
    `Summary: ${record.summary}`,
    "",
    "Metadata:",
    `- type: ${record.language}`,
    `- lines: ${record.lines}`,
    `- characters: ${record.characters}`,
    `- sha256: ${record.sha256}`,
    `- tags: ${record.tags.join(", ") || "none"}`,
    `- routing_bucket: ${record.bucket} (export routing only)`,
    "",
    `${fence}${record.language}`,
    record.content.trimEnd(),
    fence
  ].join("\n");
}

function renderSourceFileIndex(records: SourcePackRecord[]): string {
  if (records.length === 0) {
    return "- No source files matched.";
  }
  return [
    "| Path | Type | Lines | Characters | SHA256 | Summary | Bundle | Tags |",
    "|---|---:|---:|---:|---|---|---|---|",
    ...records.map(
      (record) =>
        `| ${escapeTableCell(record.relative)} | ${escapeTableCell(record.language)} | ${record.lines} | ${record.characters} | ${record.sha256.slice(0, 12)} | ${escapeTableCell(record.summary)} | ${record.bundle} | ${escapeTableCell(record.tags.join(", "))} |`
    )
  ].join("\n");
}

function renderRepositoryShape(records: SourcePackRecord[]): string {
  const counts = new Map<string, number>();
  for (const record of records) {
    const top = record.relative.split("/")[0] || ".";
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => `- ${name}: ${count} source file(s)`)
    .join("\n") || "- No source files matched.";
}

function renderRecordList(records: SourcePackRecord[], includeRoutes = false): string {
  if (records.length === 0) {
    return "- None detected.";
  }
  return records
    .map((record) => `- ${record.relative}: ${record.summary}${includeRoutes && record.routes.length > 0 ? ` Routes: ${record.routes.join(", ")}` : ""}`)
    .join("\n");
}

function renderWarningList(warnings: string[]): string[] {
  return warnings.length > 0 ? warnings.map((warning) => `  - ${warning}`) : ["  - none"];
}

function renderOmittedSummary(omitted: SourcePackOmitted): string {
  const reasons = Object.entries(omitted.reason_counts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([reason, count]) => `  - ${reason}: ${count}`);
  return [`- omitted_source_file_count: ${omitted.source_file_count}`, "- reason_counts:", ...(reasons.length > 0 ? reasons : ["  - none: 0"])].join("\n");
}

function fenceFor(content: string): string {
  let fence = "```";
  while (content.includes(fence)) fence += "`";
  return fence;
}

function escapeTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

