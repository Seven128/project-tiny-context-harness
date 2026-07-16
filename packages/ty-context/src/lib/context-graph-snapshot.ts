import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./strict-codec.js";
import {
  parseContextManifest,
  type ContextManifest,
} from "./context-manifest-schema.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

export interface ContextGraphSnapshot {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
}

export interface CampaignContextBaseline {
  graph_sha256: string;
  files: Record<string, string>;
  baseline_sha256: string;
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
        async (file) =>
          [file, await hashFile(root, path.join(root, file))] as const,
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
  const files = sortRecord(snapshot.sha256);
  return {
    graph_sha256: snapshot.topology_sha256,
    files,
    baseline_sha256: sha256Hex(
      canonicalJson({ graph_sha256: snapshot.topology_sha256, files }),
    ),
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
  if (current.graph_sha256 !== expected.graph_sha256) {
    throw new Error("campaign_context_changed:graph");
  }
  if (current.baseline_sha256 !== expected.baseline_sha256) {
    const changed = [
      ...new Set([
        ...Object.keys(expected.files),
        ...Object.keys(current.files),
      ]),
    ]
      .filter((file) => expected.files[file] !== current.files[file])
      .sort();
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
        throw new Error(
          `protected_input_symlink_not_allowed:context_authority:${absolute.replace(/\\/gu, "/")}`,
        );
      }
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        await assertProtectedRepositoryFile(
          root,
          absolute,
          "context_authority",
        );
        result.push(repoRelative(root, absolute));
      }
    }
  }
  await visit(contextRoot);
  return result.sort();
}

async function readContextManifest(root: string): Promise<ContextManifest> {
  const manifestFile = await assertProtectedRepositoryFile(
    root,
    path.join(root, "project_context", "context.toml"),
    "context_manifest",
  );
  const parsed = parseContextManifest(await readFile(manifestFile, "utf8"));
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

async function hashFile(root: string, file: string): Promise<string> {
  const protectedFile = await assertProtectedRepositoryFile(
    root,
    file,
    "context_authority",
  );
  return sha256Hex(await readFile(protectedFile));
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
