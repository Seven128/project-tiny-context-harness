import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  parseContextManifest,
  type ContextManifest,
} from "./context-manifest-schema.js";

export interface ContextFileHash {
  path: string;
  sha256: string;
}

export interface ContextGraphSnapshot {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
}

export interface CampaignContextBaseline {
  context_graph_sha256: string;
  context_baseline_sha256: string;
  context_files: ContextFileHash[];
}

export async function captureContextGraphSnapshot(
  repositoryRoot: string,
  contextRefs: Iterable<string>,
  mode: "referenced" | "full" = "referenced",
): Promise<ContextGraphSnapshot> {
  const root = path.resolve(repositoryRoot);
  const manifest = await readContextManifest(root);
  const allFiles = await listContextFiles(root);
  const available = new Set(allFiles);
  const selected = new Set<string>();

  if (mode === "full") {
    allFiles.forEach((file) => selected.add(file));
  } else {
    for (const required of [
      "project_context/context.toml",
      "project_context/global.md",
      "project_context/architecture.md",
    ]) {
      if (!available.has(required)) {
        throw new Error(`context_snapshot_required_file_missing:${required}`);
      }
      selected.add(required);
    }
    for (const contextRef of contextRefs) {
      const normalized = normalizeRepoPath(contextRef);
      if (!available.has(normalized)) {
        throw new Error(`context_ref_invalid:${contextRef}`);
      }
      selected.add(normalized);
    }
    addTransitiveChildren(manifest, selected, available);
  }

  const files = [...selected].sort();
  const hashes = Object.fromEntries(
    await Promise.all(
      files.map(
        async (file) => [file, await hashFile(path.join(root, file))] as const,
      ),
    ),
  );
  return {
    mode,
    topology_sha256: contextTopologyHash(manifest),
    files,
    sha256: sortRecord(hashes),
  };
}

export async function captureCampaignContextBaseline(
  repositoryRoot: string,
  contextRefs: Iterable<string>,
): Promise<CampaignContextBaseline> {
  const snapshot = await captureContextGraphSnapshot(
    repositoryRoot,
    contextRefs,
    "referenced",
  );
  const contextFiles = snapshot.files.map((file) => ({
    path: file,
    sha256: snapshot.sha256[file],
  }));
  return {
    context_graph_sha256: snapshot.topology_sha256,
    context_baseline_sha256: sha256Hex(canonicalJson(contextFiles)),
    context_files: contextFiles,
  };
}

export async function assertCampaignContextBaselineFresh(
  repositoryRoot: string,
  expected: CampaignContextBaseline,
  contextRefs: Iterable<string>,
): Promise<void> {
  const current = await captureCampaignContextBaseline(
    repositoryRoot,
    contextRefs,
  );
  if (current.context_graph_sha256 !== expected.context_graph_sha256) {
    throw new Error("campaign_context_changed:graph");
  }
  if (current.context_baseline_sha256 !== expected.context_baseline_sha256) {
    const previous = new Map(
      expected.context_files.map((file) => [file.path, file.sha256]),
    );
    const changed = current.context_files
      .filter((file) => previous.get(file.path) !== file.sha256)
      .map((file) => file.path);
    throw new Error(
      `campaign_context_changed:files:${changed.join(",") || "set"}`,
    );
  }
}

export async function currentContextTopologySha256(
  repositoryRoot: string,
): Promise<string> {
  return contextTopologyHash(
    await readContextManifest(path.resolve(repositoryRoot)),
  );
}

export async function listContextFiles(
  repositoryRoot: string,
): Promise<string[]> {
  const root = path.resolve(repositoryRoot);
  const contextRoot = path.join(root, "project_context");
  const result: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Context symlink is not allowed: ${absolute}`);
      }
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        result.push(repoRelative(root, absolute));
      }
    }
  }
  await visit(contextRoot);
  return result.sort();
}

async function readContextManifest(root: string): Promise<ContextManifest> {
  const parsed = parseContextManifest(
    await readFile(path.join(root, "project_context", "context.toml"), "utf8"),
  );
  if (!parsed.manifest || parsed.errors.length > 0) {
    throw new Error(`context_manifest_invalid:${parsed.errors.join("|")}`);
  }
  return parsed.manifest;
}

function addTransitiveChildren(
  manifest: ContextManifest,
  selected: Set<string>,
  available: Set<string>,
): void {
  const children = new Map(
    manifest.contexts.map(
      (entry) =>
        [
          normalizeRepoPath(entry.path),
          entry.default_children.map(normalizeRepoPath),
        ] as const,
    ),
  );
  const queue = [...selected];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (!available.has(child)) {
        throw new Error(`context_graph_child_missing:${current}:${child}`);
      }
      if (!selected.has(child)) {
        selected.add(child);
        queue.push(child);
      }
    }
  }
}

function contextTopologyHash(manifest: ContextManifest): string {
  const topology = {
    areas: manifest.areas
      .map(
        ({ line: _line, forbidden_runtime_dependencies, kind, ...area }) => ({
          ...area,
          ...(kind === undefined ? {} : { kind }),
          context: normalizeRepoPath(area.context),
          forbidden_runtime_dependencies: [
            ...forbidden_runtime_dependencies,
          ].sort(),
        }),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
    contexts: manifest.contexts
      .map(
        ({
          line: _line,
          triggers,
          default_children,
          read_when,
          read_policy,
          ...context
        }) => ({
          ...context,
          ...(read_when === undefined ? {} : { read_when }),
          ...(read_policy === undefined ? {} : { read_policy }),
          path: normalizeRepoPath(context.path),
          triggers: [...triggers].sort(),
          default_children: [...default_children].map(normalizeRepoPath).sort(),
        }),
      )
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
  return sha256Hex(canonicalJson(topology));
}

async function hashFile(file: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile()) {
    throw new Error(`Expected regular file: ${file}`);
  }
  return sha256Hex(await readFile(file));
}

function repoRelative(root: string, file: string): string {
  const value = path.relative(root, file).replace(/\\/g, "/");
  if (value.startsWith("../") || path.isAbsolute(value)) {
    throw new Error(`Path is outside repository: ${file}`);
  }
  return value;
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}
