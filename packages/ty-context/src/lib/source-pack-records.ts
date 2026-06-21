import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { listFiles, pathExists, readText } from "./fs.js";
import { shouldExcludeRelativePath, shouldIncludeCodeFile, toPosix } from "./source-files.js";
import { classifyCodeFile } from "./source-pack-classify.js";
import { matchesAny } from "./source-pack-config.js";
import type { ContextAreaMapping, ContextArtifact, SourcePackRecord } from "./source-pack-types.js";

const execFileAsync = promisify(execFile);
const GIT_LS_MAX_BUFFER = 64 * 1024 * 1024;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /^(\s*(?:[-*]\s*)?(?:[`"']?[\w.-]*(?:secret|token|cookie|password|api[_-]?key|credential|bearer|authorization)[\w.-]*[`"']?\s*[:=]\s*))(.+?)\s*$/i;

export async function collectCodeRecords(
  projectRoot: string,
  warnings: string[],
  options: { include?: string[]; exclude?: string[]; areas?: ContextAreaMapping[] } = {}
): Promise<SourcePackRecord[]> {
  const gitCandidates = await listGitCandidateFiles(projectRoot);
  const candidates = gitCandidates ?? (await listCandidateFiles(projectRoot));
  const records: SourcePackRecord[] = [];
  for (const file of candidates) {
    const relative = repoRelative(projectRoot, file);
    if (!shouldIncludeCodeFile(relative) || matchesAny(relative, options.exclude ?? [])) {
      continue;
    }
    if (options.include && options.include.length > 0 && !matchesAny(relative, options.include)) {
      continue;
    }
    if (!(await isRegularFile(file))) {
      continue;
    }
    const rawContent = await readText(file);
    const redacted = redactSensitiveAssignments(rawContent);
    if (redacted.count > 0) {
      warnings.push(`${relative}: redacted ${redacted.count} sensitive assignment line(s)`);
    }
    const content = redacted.content;
    const classification = classifyCodeFile(relative, content, options.areas ?? []);
    records.push({
      relative,
      language: classification.language,
      lines: countLines(content),
      characters: content.length,
      sha256: sha256(content),
      summary: classification.summary,
      content,
      tags: classification.tags,
      routes: classification.routes,
      score: classification.score,
      bucket: classification.bucket,
      bundle: "omitted"
    });
  }
  return records.sort((left, right) => left.relative.localeCompare(right.relative));
}

export async function collectContextArtifacts(
  projectRoot: string,
  warnings: string[],
  includePatterns?: string[]
): Promise<ContextArtifact[]> {
  const files = new Set<string>();
  for (const relative of ["AGENTS.md", "README.md", "DESIGN.md", "project_context/global.md", "project_context/architecture.md", "project_context/context.toml"]) {
    await addIfExists(projectRoot, files, warnings, relative, relative.startsWith("project_context/"));
  }
  for (const file of await listFiles(path.join(projectRoot, "project_context"))) {
    const relative = repoRelative(projectRoot, file);
    if ((relative.endsWith(".md") || relative.endsWith(".toml")) && !shouldExcludeRelativePath(relative)) {
      files.add(file);
    }
  }
  const artifacts: ContextArtifact[] = [];
  for (const file of [...files].sort((a, b) => repoRelative(projectRoot, a).localeCompare(repoRelative(projectRoot, b)))) {
    const relative = repoRelative(projectRoot, file);
    if (includePatterns && includePatterns.length > 0 && !matchesAny(relative, includePatterns)) {
      continue;
    }
    const rawContent = await readText(file);
    const redacted = redactSensitiveAssignments(rawContent);
    if (redacted.count > 0) {
      warnings.push(`${relative}: redacted ${redacted.count} sensitive assignment line(s)`);
    }
    artifacts.push({
      relative,
      content: redacted.content,
      lines: countLines(redacted.content),
      characters: redacted.content.length
    });
  }
  return artifacts;
}

export function countRedactionWarnings(warnings: string[]): number {
  return warnings.filter((warning) => /redacted \d+ sensitive assignment line/i.test(warning)).length;
}

export function countLines(content: string): number {
  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function repoRelative(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}

async function addIfExists(projectRoot: string, files: Set<string>, warnings: string[], relative: string, required: boolean): Promise<void> {
  const target = path.join(projectRoot, ...relative.split("/"));
  if (await pathExists(target)) {
    files.add(target);
  } else if (required) {
    warnings.push(`${relative}: missing expected source file`);
  }
}

async function listGitCandidateFiles(projectRoot: string): Promise<string[] | undefined> {
  try {
    const result = await execFileAsync("git", ["-C", projectRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8",
      maxBuffer: GIT_LS_MAX_BUFFER
    });
    return result.stdout.split("\0").filter(Boolean).map((relative) => path.join(projectRoot, ...toPosix(relative).split("/")));
  } catch {
    return undefined;
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
    } else if (entry.isFile() && !shouldExcludeRelativePath(relative)) {
      files.push(fullPath);
    }
  }
}

async function isRegularFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

function redactSensitiveAssignments(content: string): { content: string; count: number } {
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

