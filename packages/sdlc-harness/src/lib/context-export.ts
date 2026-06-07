import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessRoot } from "./harness-root.js";

export interface ExportContextOptions {
  full?: boolean;
  output?: string;
  check?: boolean;
  now?: Date;
}

export interface ExportContextReport {
  outputPath: string;
  outputRelativePath: string;
  sourceFiles: string[];
  sourceContextCount: number;
  warnings: string[];
  wrote: boolean;
}

interface RedactionResult {
  content: string;
  count: number;
}

const EXPORT_HEADER = "Export artifact. Do not reference from project_context/context.toml.";
const DEFAULT_EXPORT_DIR = "tmp/sdlc/context-exports";
const MAX_TREE_ENTRIES = 300;
const MAX_TREE_DEPTH = 4;

const EXCLUDED_DIR_NAMES = new Set([
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "artifacts",
  "build",
  "cache",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "raw-captures",
  "reports",
  "target",
  "test-reports",
  "test-results",
  "tmp"
]);

const EXCLUDED_FILE_PATTERNS = [
  /^\.env(?:\.|$)/i,
  /(^|[-_.])(secret|secrets|cookie|cookies|credential|credentials|api-key|apikey|access-token|refresh-token|auth-token|private-key)([-_.]|$)/i,
  /(^|[-_.])(raw-capture|capture-dump|licensed-payload|license-payload|test-report)([-_.]|$)/i,
  /full-project-context-\d{8}T\d{6}Z\.md$/i,
  /(^|[-_.])(context-export|context-bundle)([-_.]|$)/i
];

const SENSITIVE_ASSIGNMENT_PATTERN =
  /^(\s*(?:[-*]\s*)?(?:[`"']?[\w.-]*(?:secret|token|cookie|password|api[_-]?key)[\w.-]*[`"']?\s*[:=]\s*))(.+?)\s*$/i;

export async function runExportContext(projectRoot: string, options: ExportContextOptions = {}): Promise<ExportContextReport> {
  if (!options.full) {
    throw new Error("export-context currently requires --full");
  }

  const outputPath = resolveOutputPath(projectRoot, options.output, options.now);
  const outputRelativePath = repoRelative(projectRoot, outputPath);
  const warnings: string[] = [];
  const sourceFiles = await collectSourceFiles(projectRoot, warnings);
  const sourceRelativeFiles = sourceFiles.map((file) => repoRelative(projectRoot, file)).sort();
  const sourceContextCount = sourceRelativeFiles.filter(
    (file) => file === "project_context/context.toml" || file.startsWith("project_context/")
  ).length;

  const sourceSections: string[] = [];
  const contextEntrySections: string[] = [];

  for (const file of sourceFiles) {
    const relative = repoRelative(projectRoot, file);
    const rawContent = await readText(file);
    const redacted = redactSensitiveAssignments(rawContent);
    if (redacted.count > 0) {
      warnings.push(`${relative}: redacted ${redacted.count} sensitive assignment line(s)`);
    }
    if (relative.startsWith("project_context/") && relative.endsWith(".md")) {
      const codeEntries = extractSection(redacted.content, "Code Entry Points");
      if (codeEntries) {
        contextEntrySections.push(`### ${relative}\n\n${codeEntries}`);
      }
    }
    sourceSections.push(renderSourceSection(relative, redacted.content));
  }

  const makefileSummary = await buildMakefileVerificationSummary(projectRoot);
  const directoryTree = await buildDirectoryTree(projectRoot, warnings);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const content = [
    "# Full Project Context Export",
    "",
    `> ${EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${generatedAt}`,
    `- workspace_root: ${projectRoot}`,
    `- output_path: ${outputRelativePath}`,
    `- source_context_count: ${sourceContextCount}`,
    "- source_file_list:",
    ...sourceRelativeFiles.map((file) => `  - ${file}`),
    "- warnings:",
    ...(warnings.length > 0 ? warnings.map((warning) => `  - ${warning}`) : ["  - none"]),
    "",
    "## Directory Tree Summary",
    "",
    directoryTree,
    "",
    "## Makefile Verification Entry Summary",
    "",
    makefileSummary,
    "",
    "## Context Code Entry Point Index",
    "",
    contextEntrySections.length > 0 ? contextEntrySections.join("\n\n") : "- No Code Entry Points sections found in exported Context Markdown.",
    "",
    "## Source Files",
    "",
    sourceSections.join("\n\n"),
    ""
  ].join("\n");

  if (!options.check) {
    await ensureDir(path.dirname(outputPath));
    await writeTextIfChanged(outputPath, content);
  }

  return {
    outputPath,
    outputRelativePath,
    sourceFiles: sourceRelativeFiles,
    sourceContextCount,
    warnings,
    wrote: !options.check
  };
}

function resolveOutputPath(projectRoot: string, requestedOutput: string | undefined, now: Date | undefined): string {
  const defaultName = `full-project-context-${timestampForFile(now ?? new Date())}.md`;
  const rawOutput = requestedOutput?.trim() || path.join(DEFAULT_EXPORT_DIR, defaultName);
  const absoluteOutput = path.resolve(projectRoot, rawOutput);
  const relative = repoRelative(projectRoot, absoluteOutput);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("export-context --output must stay inside the workspace; use tmp/sdlc/context-exports/<name>.md");
  }
  const normalized = toPosix(relative);
  if (normalized === "project_context" || normalized.startsWith("project_context/")) {
    throw new Error("export-context output is a temporary artifact; use tmp/sdlc/context-exports/** instead of project_context/**");
  }
  if (!normalized.startsWith(`${DEFAULT_EXPORT_DIR}/`)) {
    throw new Error("export-context v1 only writes temporary artifacts under tmp/sdlc/context-exports/**");
  }
  if (!normalized.endsWith(".md")) {
    throw new Error("export-context --output must be a Markdown file under tmp/sdlc/context-exports/**");
  }
  return absoluteOutput;
}

async function collectSourceFiles(projectRoot: string, warnings: string[]): Promise<string[]> {
  const files = new Set<string>();
  await addIfExists(projectRoot, files, warnings, "AGENTS.md", true);
  await addIfExists(projectRoot, files, warnings, "README.md", false);
  await addIfExists(projectRoot, files, warnings, "DESIGN.md", false);
  await addIfExists(projectRoot, files, warnings, "project_context/global.md", true);
  await addIfExists(projectRoot, files, warnings, "project_context/architecture.md", true);
  await addIfExists(projectRoot, files, warnings, "project_context/context.toml", true);

  const contextRoot = path.join(projectRoot, "project_context");
  for (const file of await listFiles(contextRoot)) {
    const relative = repoRelative(projectRoot, file);
    if ((relative.endsWith(".md") || relative.endsWith(".toml")) && !shouldExcludeRelativePath(relative)) {
      files.add(file);
    }
  }

  const root = await harnessRoot(projectRoot);
  const skillRoot = path.join(projectRoot, root, "skills");
  for (const file of await listFiles(skillRoot)) {
    const relative = repoRelative(projectRoot, file);
    if (relative.endsWith("/SKILL.md") && !shouldExcludeRelativePath(relative)) {
      files.add(file);
    }
  }

  for (const file of await listCandidateFiles(projectRoot)) {
    const relative = repoRelative(projectRoot, file);
    const base = path.basename(file);
    if (["README.md", "AGENTS.md", "DESIGN.md"].includes(base) && !shouldExcludeRelativePath(relative)) {
      files.add(file);
    }
  }

  return [...files].sort((left, right) => repoRelative(projectRoot, left).localeCompare(repoRelative(projectRoot, right)));
}

async function addIfExists(
  projectRoot: string,
  files: Set<string>,
  warnings: string[],
  relative: string,
  required: boolean
): Promise<void> {
  const target = path.join(projectRoot, ...relative.split("/"));
  if (await pathExists(target)) {
    files.add(target);
  } else if (required) {
    warnings.push(`${relative}: missing expected source file`);
  }
}

async function listCandidateFiles(projectRoot: string): Promise<string[]> {
  const files: string[] = [];
  await walkCandidates(projectRoot, projectRoot, files);
  return files;
}

async function walkCandidates(projectRoot: string, current: string, files: string[]): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const fullPath = path.join(current, entry.name);
    const relative = repoRelative(projectRoot, fullPath);
    if (entry.isDirectory()) {
      if (!shouldExcludeRelativePath(relative)) {
        await walkCandidates(projectRoot, fullPath, files);
      }
      continue;
    }
    if (entry.isFile() && !shouldExcludeRelativePath(relative)) {
      files.push(fullPath);
    }
  }
}

async function buildDirectoryTree(projectRoot: string, warnings: string[]): Promise<string> {
  const lines: string[] = ["."];
  let count = 0;
  let truncated = false;

  async function walk(current: string, prefix: string, depth: number): Promise<void> {
    if (depth >= MAX_TREE_DEPTH || truncated) {
      return;
    }
    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    const visibleEntries = entries
      .filter((entry) => !shouldExcludeRelativePath(repoRelative(projectRoot, path.join(current, entry.name))))
      .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name));
    for (const entry of visibleEntries) {
      if (count >= MAX_TREE_ENTRIES) {
        truncated = true;
        warnings.push(`directory tree truncated at ${MAX_TREE_ENTRIES} entries`);
        return;
      }
      count += 1;
      const fullPath = path.join(current, entry.name);
      const marker = entry.isDirectory() ? "/" : "";
      lines.push(`${prefix}- ${entry.name}${marker}`);
      if (entry.isDirectory()) {
        await walk(fullPath, `${prefix}  `, depth + 1);
      }
    }
  }

  await walk(projectRoot, "", 0);
  return lines.join("\n");
}

async function buildMakefileVerificationSummary(projectRoot: string): Promise<string> {
  const makefilePath = path.join(projectRoot, "Makefile");
  if (!(await pathExists(makefilePath))) {
    return "- No root Makefile found.";
  }
  const lines = (await readText(makefilePath)).split(/\r?\n/);
  const summary: string[] = [];
  let includeTarget = false;
  for (const line of lines) {
    const target = /^([A-Za-z0-9_.-]+):/.exec(line);
    if (target) {
      includeTarget = /validate|test|lint|build|smoke|doctor|check/i.test(target[1]);
      if (includeTarget) {
        summary.push(`- ${line.trim()}`);
      }
      continue;
    }
    if (includeTarget && /^\t/.test(line)) {
      summary.push(`  ${line.trim()}`);
    }
  }
  return summary.length > 0 ? summary.join("\n") : "- No obvious verification targets found in root Makefile.";
}

function redactSensitiveAssignments(content: string): RedactionResult {
  let count = 0;
  const lines = content.split(/\r?\n/).map((line) => {
    const match = SENSITIVE_ASSIGNMENT_PATTERN.exec(line);
    if (!match) {
      return line;
    }
    count += 1;
    return `${match[1]}[REDACTED]`;
  });
  return { content: lines.join("\n"), count };
}

function renderSourceSection(relative: string, content: string): string {
  const fence = fenceFor(content);
  const language = languageFor(relative);
  return [`### ${relative}`, "", `${fence}${language}`, content.trimEnd(), fence].join("\n");
}

function fenceFor(content: string): string {
  let fence = "```";
  while (content.includes(fence)) {
    fence += "`";
  }
  return fence;
}

function languageFor(relative: string): string {
  if (relative.endsWith(".toml")) {
    return "toml";
  }
  if (relative.endsWith(".md")) {
    return "markdown";
  }
  if (path.basename(relative) === "Makefile") {
    return "make";
  }
  return "";
}

function extractSection(content: string, heading: string): string | undefined {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(content);
  if (!match) {
    return undefined;
  }
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  const body = (next ? rest.slice(0, next.index) : rest).trim();
  return body || undefined;
}

function shouldExcludeRelativePath(relative: string): boolean {
  const normalized = toPosix(relative);
  const segments = normalized.split("/");
  if (segments.some((segment) => EXCLUDED_DIR_NAMES.has(segment))) {
    return true;
  }
  const base = segments[segments.length - 1] ?? "";
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(base) || pattern.test(normalized));
}

function timestampForFile(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function repoRelative(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}
