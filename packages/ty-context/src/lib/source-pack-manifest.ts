import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { ensureDir, writeTextIfChanged } from "./fs.js";
import { repoRelative, sha256 } from "./source-pack-records.js";
import type { SourcePackArtifactReport, SourcePackMode, SourcePackOmitted } from "./source-pack-types.js";

const execFileAsync = promisify(execFile);

export interface PendingArtifact {
  kind: string;
  name: string;
  relativePath: string;
  content: string;
  sourceCount: number;
  sourceLineCount: number;
  warningCount: number;
}

export async function buildManifest(params: {
  projectRoot: string;
  generatedAt: string;
  command: string;
  maxPackFiles: number;
  artifacts: PendingArtifact[];
  warnings: string[];
  omitted: SourcePackOmitted;
  recommendedUploadSets: Record<string, string[]>;
}): Promise<string> {
  const git = await gitInfo(params.projectRoot);
  const manifest = {
    schema_version: "source-pack-v1",
    generated_at: params.generatedAt,
    tool: "ty-context export-context",
    tool_version: await readPackageVersion(),
    git_sha: git.sha,
    git_dirty: git.dirty,
    command: params.command,
    max_pack_files: params.maxPackFiles,
    artifacts: params.artifacts.map((artifact) => artifactReport(artifact)),
    warnings: params.warnings,
    omitted: params.omitted,
    recommended_upload_sets: params.recommendedUploadSets
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function artifactReport(artifact: PendingArtifact): SourcePackArtifactReport {
  return {
    kind: artifact.kind,
    name: artifact.name,
    path: artifact.relativePath,
    sha256: sha256(artifact.content),
    characters: artifact.content.length,
    source_count: artifact.sourceCount,
    source_line_count: artifact.sourceLineCount,
    warning_count: artifact.warningCount
  };
}

export async function writeArtifactSet(projectRoot: string, outputDir: string, artifacts: PendingArtifact[]): Promise<void> {
  const outputRelative = repoRelative(projectRoot, outputDir);
  if (!outputRelative.startsWith("tmp/ty-context/context-exports/")) {
    throw new Error("Source Pack output directory must stay under tmp/ty-context/context-exports/**");
  }
  await fs.rm(outputDir, { recursive: true, force: true });
  await writeArtifacts(projectRoot, outputDir, artifacts);
}

export async function pruneTimestampedExports(projectRoot: string, keepCount: number): Promise<void> {
  if (!Number.isInteger(keepCount) || keepCount < 0) {
    throw new Error("export-context --prune requires a non-negative integer");
  }
  const exportsRoot = path.join(projectRoot, "tmp", "ty-context", "context-exports");
  let entries: string[];
  try {
    entries = await fs.readdir(exportsRoot);
  } catch {
    return;
  }
  const timestampDirs = entries.filter((entry) => /^\d{8}T\d{6}Z$/.test(entry)).sort().reverse();
  for (const entry of timestampDirs.slice(keepCount)) {
    await fs.rm(path.join(exportsRoot, entry), { recursive: true, force: true });
  }
}

export function timestampForFile(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function writeArtifacts(projectRoot: string, outputDir: string, artifacts: PendingArtifact[]): Promise<void> {
  for (const artifact of artifacts) {
    const target = path.join(outputDir, ...artifact.name.split("/"));
    const relative = repoRelative(projectRoot, target);
    if (!relative.startsWith("tmp/ty-context/context-exports/")) {
      throw new Error("Source Pack artifacts must stay under tmp/ty-context/context-exports/**");
    }
    await ensureDir(path.dirname(target));
    await writeTextIfChanged(target, artifact.content);
  }
}

async function gitInfo(projectRoot: string): Promise<{ sha: string | null; dirty: boolean }> {
  try {
    const shaResult = await execFileAsync("git", ["-C", projectRoot, "rev-parse", "HEAD"], { encoding: "utf8" });
    const dirtyResult = await execFileAsync("git", ["-C", projectRoot, "status", "--porcelain"], { encoding: "utf8" });
    return { sha: shaResult.stdout.trim() || null, dirty: dirtyResult.stdout.trim().length > 0 };
  } catch {
    return { sha: null, dirty: false };
  }
}

export async function readPackageVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(await fs.readFile(new URL("../../package.json", import.meta.url), "utf8")) as { version?: string };
    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
