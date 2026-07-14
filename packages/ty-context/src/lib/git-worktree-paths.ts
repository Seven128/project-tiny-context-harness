import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 10_000;
const GIT_OUTPUT_LIMIT = 1024 * 1024;

export interface GitWorktreePaths {
  worktree_root: string;
  git_dir: string;
  common_dir: string;
  worktree_id: string;
}

export const LONG_TASK_RUNTIME_EXCLUDES = [
  "/.codex/ty-context-active-long-task.json",
  "/.codex/ty-context-final-result-receipt.json",
  "/tmp/ty-context/plan-acceptance/",
] as const;

export async function resolveGitWorktreePaths(
  directory: string,
): Promise<GitWorktreePaths> {
  const cwd = path.resolve(directory);
  const output = await gitRevParse(cwd, [
    "--path-format=absolute",
    "--show-toplevel",
    "--absolute-git-dir",
    "--git-common-dir",
  ]);
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 3)
    throw new Error(
      "git_worktree_paths_unavailable:unexpected_rev_parse_output",
    );
  const [worktreeRoot, gitDir, commonDir] = lines.map(normalizeAbsolutePath);
  return {
    worktree_root: worktreeRoot,
    git_dir: gitDir,
    common_dir: commonDir,
    worktree_id: gitWorktreeId(gitDir),
  };
}

export async function resolveGitWorktreePath(
  directory: string,
  gitPath: string,
): Promise<string> {
  if (
    !gitPath ||
    path.isAbsolute(gitPath) ||
    gitPath.split(/[\\/]/u).includes("..")
  ) {
    throw new Error("git_worktree_path_invalid");
  }
  return normalizeAbsolutePath(
    await gitRevParse(path.resolve(directory), [
      "--path-format=absolute",
      "--git-path",
      gitPath,
    ]),
  );
}

export async function ensureLongTaskRuntimeExcludes(
  directory: string,
): Promise<void> {
  const excludeFile = await resolveGitWorktreePath(directory, "info/exclude");
  await mkdir(path.dirname(excludeFile), { recursive: true });
  let current = "";
  try {
    current = await readFile(excludeFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const existing = new Set(current.split(/\r?\n/u).map((line) => line.trim()));
  const missing = LONG_TASK_RUNTIME_EXCLUDES.filter(
    (entry) => !existing.has(entry),
  );
  if (missing.length === 0) return;
  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  await appendFile(excludeFile, `${prefix}${missing.join("\n")}\n`, "utf8");
}

export function gitWorktreeId(gitDir: string): string {
  let identity = normalizeAbsolutePath(gitDir).replace(/\\/gu, "/");
  if (process.platform === "win32") identity = identity.toLowerCase();
  return createHash("sha256").update(identity).digest("hex");
}

export function sameFilesystemPath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value).replace(/\\/gu, "/");
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

async function gitRevParse(cwd: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync(
      "git",
      ["-C", cwd, "rev-parse", ...args],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: GIT_OUTPUT_LIMIT,
      },
    );
    const output = result.stdout.trim();
    if (!output) throw new Error("empty_output");
    return output;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`git_worktree_paths_unavailable:${detail}`);
  }
}

function normalizeAbsolutePath(value: string): string {
  return path.resolve(value.trim());
}
