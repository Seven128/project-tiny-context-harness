import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import type {
  WorkspaceFileV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";

const ROOT_EXCLUDES = new Set([".git", "node_modules", ".DS_Store"]);
const RUNTIME_EXCLUDES = new Set([
  ".codex/ty-context-active-long-task.json",
  ".codex/ty-context-final-result-receipt.json",
]);

export interface WorkspaceSnapshotV1 {
  root: string;
  manifest: WorkspaceManifestV1;
  dispose(): Promise<void>;
}

export async function repositoryRoot(start: string): Promise<string> {
  return path.resolve(
    await gitOutput(path.resolve(start), ["rev-parse", "--show-toplevel"]),
  );
}

export async function captureWorkspaceManifest(
  rootInput: string,
  workdirInput: string,
  copyRoot?: string,
): Promise<WorkspaceManifestV1> {
  const root = path.resolve(rootInput);
  const workdir = path.resolve(workdirInput);
  const workdirRelative = repoRelative(root, workdir);
  if (!workdirRelative)
    throw new Error("long_task_workdir_must_not_be_repository_root");
  const files: WorkspaceFileV1[] = [];
  const seen = new Set<string>();

  async function visit(directory: string, relative = ""): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (!relative && ROOT_EXCLUDES.has(entry.name)) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        rel === workdirRelative ||
        rel.startsWith(`${workdirRelative}/`) ||
        rel.startsWith("project_context/") ||
        rel.startsWith("tmp/ty-context/long-task-runs/") ||
        RUNTIME_EXCLUDES.has(rel)
      )
        continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`workspace_symlink_rejected:${rel}`);
      if (entry.isDirectory()) {
        await visit(absolute, rel);
        continue;
      }
      if (!entry.isFile())
        throw new Error(`workspace_special_file_rejected:${rel}`);
      const info = await stat(absolute, { bigint: true });
      const identity = `${info.dev}:${info.ino}`;
      if (info.nlink > 1n || seen.has(identity))
        throw new Error(`workspace_hardlink_rejected:${rel}`);
      seen.add(identity);
      const content = await readFile(absolute);
      const row: WorkspaceFileV1 = {
        path: rel,
        mode: Number(info.mode),
        size: content.length,
        sha256: sha256Hex(content),
      };
      files.push(row);
      if (copyRoot) {
        const target = path.join(copyRoot, ...rel.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content, { mode: row.mode });
      }
    }
  }

  await visit(root);
  const gitHead = await gitOutput(root, ["rev-parse", "HEAD"]);
  const identity = { repository_root: root, git_head: gitHead, files };
  return {
    ...identity,
    snapshot_sha256: sha256Hex(canonicalValueJson(identity)),
  };
}

export async function createWorkspaceSnapshot(
  root: string,
  workdir: string,
  label: string,
): Promise<WorkspaceSnapshotV1> {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `ty-context-${safe(label)}-`),
  );
  try {
    const manifest = await captureWorkspaceManifest(root, workdir, temporary);
    await linkDependencyTrees(root, temporary, workdir);
    return {
      root: temporary,
      manifest,
      dispose: () => rm(temporary, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export function changedWorkspacePaths(
  baseline: WorkspaceManifestV1,
  current: WorkspaceManifestV1,
): string[] {
  const before = new Map(
    baseline.files.map((file) => [file.path, file.sha256]),
  );
  const after = new Map(current.files.map((file) => [file.path, file.sha256]));
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((file) => before.get(file) !== after.get(file))
    .sort();
}

export async function currentGitState(root: string): Promise<{
  head: string;
  dirty: string[];
}> {
  const [head, raw] = await Promise.all([
    gitOutput(root, ["rev-parse", "HEAD"]),
    gitOutput(root, ["status", "--short", "--untracked-files=all"]),
  ]);
  return { head, dirty: raw ? raw.split(/\r?\n/u).filter(Boolean) : [] };
}

export async function gitPath(root: string, pathSpec: string): Promise<string> {
  return path.resolve(
    await gitOutput(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-path",
      pathSpec,
    ]),
  );
}

export function resolveInsideRepository(
  rootInput: string,
  relativeInput: string,
  label: string,
): string {
  if (!relativeInput || path.isAbsolute(relativeInput))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const normalized = relativeInput.replace(/\\/gu, "/");
  if (normalized.split("/").includes(".."))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const root = path.resolve(rootInput);
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  return resolved;
}

export function repoRelative(rootInput: string, fileInput: string): string {
  const value = path
    .relative(path.resolve(rootInput), path.resolve(fileInput))
    .replace(/\\/gu, "/");
  if (value.startsWith("../") || path.isAbsolute(value))
    throw new Error(`path_outside_repository:${fileInput}`);
  return value;
}

async function gitOutput(root: string, argv: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", argv, {
      cwd: root,
      shell: false,
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout).toString("utf8").trim());
      else
        reject(
          new Error(
            `git_identity_unavailable:${argv.join(" ")}:${Buffer.concat(stderr).toString("utf8").trim()}`,
          ),
        );
    });
  });
}

async function linkDependencyTrees(
  sourceRoot: string,
  snapshotRoot: string,
  workdir: string,
): Promise<void> {
  const protectedWorkdir = repoRelative(sourceRoot, workdir);
  async function visit(directory: string, relative = ""): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (next === protectedWorkdir || next.startsWith(`${protectedWorkdir}/`))
        continue;
      if (entry.name === ".git") continue;
      const source = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name === "node_modules") {
        const target = path.join(snapshotRoot, ...next.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        await symlink(
          source,
          target,
          process.platform === "win32" ? "junction" : "dir",
        );
      } else if (entry.isDirectory()) {
        await visit(source, next);
      }
    }
  }
  await visit(sourceRoot);
}

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/gu, "-").slice(0, 80);
}
