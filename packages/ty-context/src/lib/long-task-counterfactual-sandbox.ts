import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readlink,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  CompiledCheckV2,
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";

export interface CounterfactualSandboxV2 {
  root: string;
  dispose(): Promise<void>;
}

export async function createCounterfactualSandbox(
  snapshotRoot: string,
  check: CompiledCheckV2,
  control: CounterfactualControlV2 | GlobalCounterfactualControlV2,
  bindingCarrierPaths: string[],
  manifest?: WorkspaceManifestV2,
): Promise<CounterfactualSandboxV2> {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-counterfactual-"),
  );
  if (!manifest) {
    await cp(snapshotRoot, root, {
      recursive: true,
      force: true,
      dereference: false,
    });
    return disposable(root);
  }

  const exactPaths = new Set([
    ...Object.keys(check.runner.frozen_files),
    ...Object.keys(check.verification_input_hashes),
    check.runner.resolved_target,
    ...(control.mutation.type === "replace_file"
      ? [control.mutation.fixture_path]
      : []),
  ]);
  const patterns = [
    ...check.input_paths,
    ...check.expected_output_paths,
    ...check.artifact_globs,
    ...bindingCarrierPaths,
    ...(control.mutation.type === "remove_paths"
      ? control.mutation.paths
      : [control.mutation.path]),
  ];
  for (const requirement of check.environment_requirements) {
    if (requirement.kind === "file") exactPaths.add(requirement.target);
    if (requirement.kind === "directory")
      patterns.push(`${requirement.target}/**`);
  }
  const selected = manifest.files
    .map((file) => file.path)
    .filter(
      (relative) =>
        exactPaths.has(relative) ||
        patterns.some((pattern) => matchesRepoPattern(relative, pattern)),
    );
  await copyInBatches(snapshotRoot, root, selected);
  await mkdir(path.join(root, check.runner.resolved_cwd), { recursive: true });
  await linkDependencyRoots(snapshotRoot, root, check.runner.resolved_cwd);
  return disposable(root);
}

async function copyInBatches(
  sourceRoot: string,
  targetRoot: string,
  paths: string[],
): Promise<void> {
  const concurrency = 32;
  for (let index = 0; index < paths.length; index += concurrency)
    await Promise.all(
      paths
        .slice(index, index + concurrency)
        .map((relative) =>
          copyEntry(
            path.join(sourceRoot, relative),
            path.join(targetRoot, relative),
          ),
        ),
    );
}

async function copyEntry(source: string, target: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const info = await lstat(source);
  if (!info.isSymbolicLink()) {
    await copyFile(source, target);
    return;
  }
  const link = await readlink(source);
  if (process.platform === "win32") await symlink(link, target, "junction");
  else await symlink(link, target);
}

async function linkDependencyRoots(
  sourceRoot: string,
  targetRoot: string,
  resolvedCwd: string,
): Promise<void> {
  const segments = resolvedCwd === "." ? [] : resolvedCwd.split("/");
  for (let length = 0; length <= segments.length; length += 1) {
    const relative = path.join(...segments.slice(0, length), "node_modules");
    const source = path.join(sourceRoot, relative);
    if (!(await lstat(source).catch(() => null))) continue;
    const target = path.join(targetRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await rm(target, { recursive: true, force: true });
    await symlink(
      await realpath(source),
      target,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
}

function disposable(root: string): CounterfactualSandboxV2 {
  return {
    root,
    async dispose() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
