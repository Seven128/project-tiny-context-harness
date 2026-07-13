import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { lstat, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OUTPUT_LIMIT = 512 * 1024;

export interface GitRunOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  throwOnError?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface GitCommandResult {
  cwd: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputLimited: boolean;
}

export class GitCommandError extends Error {
  readonly result: GitCommandResult;

  constructor(result: GitCommandResult) {
    const reason = result.timedOut ? "timeout" : result.outputLimited ? "output_limit" : `exit_${result.exitCode}`;
    const detail = result.stderr.trim() || result.stdout.trim();
    super(`git_${safeCommandName(result.args[0])}_${reason}${detail ? `:${detail}` : ""}`);
    this.name = "GitCommandError";
    this.result = result;
  }
}

export interface GitStatusEntry {
  indexStatus: string;
  worktreeStatus: string;
  path: string;
  originalPath?: string;
}

export interface GitStatus {
  clean: boolean;
  entries: GitStatusEntry[];
}

export type GitSyncAction = "no_upstream" | "unchanged" | "fast_forward" | "local_ahead" | "rebased";

export interface GitBaselineOptions {
  repositoryRoot: string;
  campaignId: string;
  targetBranch?: string;
  fetch?: boolean;
  timeoutMs?: number;
}

export interface GitBaselineResult {
  repositoryRoot: string;
  targetBranch: string;
  originalHead: string;
  checkpointCommit: string | null;
  upstream: string | null;
  syncAction: GitSyncAction;
  baseCommit: string;
}

export async function runGit(root: string, args: readonly string[], options: GitRunOptions = {}): Promise<GitCommandResult> {
  const cwd = path.resolve(root);
  const timeoutMs = boundedPositive(options.timeoutMs, DEFAULT_TIMEOUT_MS, 3_600_000);
  const maxOutputBytes = boundedPositive(options.maxOutputBytes, DEFAULT_OUTPUT_LIMIT, 16 * 1024 * 1024);
  const result = await new Promise<GitCommandResult>((resolve) => {
    const child = spawn("git", [...args], {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, ...options.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let timedOut = false;
    let outputLimited = false;
    let settled = false;
    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        cwd,
        args: args.map((item) => sanitizeGitOutput(item)),
        exitCode,
        stdout: sanitizeGitOutput(Buffer.concat(stdout).toString("utf8")),
        stderr: sanitizeGitOutput(Buffer.concat(stderr).toString("utf8")),
        timedOut,
        outputLimited
      });
    };
    const capture = (target: Buffer[]) => (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        outputLimited = true;
        child.kill("SIGKILL");
        return;
      }
      target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.on("error", (error) => {
      stderr.push(Buffer.from(error.message));
      finish(-1);
    });
    child.on("close", (code) => finish(code ?? -1));
    child.stdin.end();
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
  });
  if ((result.exitCode !== 0 || result.timedOut || result.outputLimited) && options.throwOnError !== false) {
    throw new GitCommandError(result);
  }
  return result;
}

export async function currentBranch(root: string): Promise<string> {
  const result = await runGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], { throwOnError: false });
  if (result.exitCode !== 0 || !result.stdout.trim()) throw new Error("git_detached_head_not_supported");
  return result.stdout.trim();
}

export async function currentHead(root: string, ref = "HEAD"): Promise<string> {
  return (await runGit(root, ["rev-parse", "--verify", `${ref}^{commit}`])).stdout.trim();
}

export async function gitStatus(root: string): Promise<GitStatus> {
  const output = (await runGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])).stdout;
  const fields = output.split("\0");
  const entries: GitStatusEntry[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    const entry: GitStatusEntry = { indexStatus: field[0] ?? " ", worktreeStatus: field[1] ?? " ", path: field.slice(3) };
    if (entry.indexStatus === "R" || entry.indexStatus === "C") entry.originalPath = fields[++index] || undefined;
    entries.push(entry);
  }
  return { clean: entries.length === 0, entries };
}

export async function isGitWorktreeClean(root: string): Promise<boolean> {
  return (await gitStatus(root)).clean;
}

export async function assertNoGitOperation(root: string): Promise<void> {
  const markers = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer"];
  const active: string[] = [];
  for (const marker of markers) {
    const file = (await runGit(root, ["rev-parse", "--path-format=absolute", "--git-path", marker])).stdout.trim();
    if (await exists(file)) active.push(marker);
  }
  if (active.length > 0) throw new Error(`git_operation_in_progress:${active.join(",")}`);
}

export async function assertNoApparentSecretsInDirtyFiles(root: string, status?: GitStatus): Promise<void> {
  const repositoryRoot = path.resolve(root);
  const currentStatus = status ?? await gitStatus(repositoryRoot);
  const flagged: string[] = [];
  for (const entry of currentStatus.entries) {
    if (entry.worktreeStatus === "D" || entry.indexStatus === "D") continue;
    const candidate = path.resolve(repositoryRoot, entry.path);
    if (!isInside(repositoryRoot, candidate)) throw new Error("dirty_path_escapes_repository");
    const metadata = await lstat(candidate).catch(() => null);
    if (!metadata?.isFile()) continue;
    if (await fileContainsApparentSecret(candidate)) flagged.push(entry.path.replace(/\\/gu, "/"));
  }
  if (flagged.length > 0) throw new Error(`dirty_checkpoint_contains_apparent_secret:${flagged.sort().join(",")}`);
}

export async function prepareGitBaseline(options: GitBaselineOptions): Promise<GitBaselineResult> {
  const repositoryRoot = await resolveRepositoryRoot(options.repositoryRoot);
  await assertNoGitOperation(repositoryRoot);
  const branch = await currentBranch(repositoryRoot);
  const targetBranch = options.targetBranch ?? branch;
  if (branch !== targetBranch) throw new Error(`baseline_target_branch_not_checked_out:${targetBranch}`);
  const originalHead = await currentHead(repositoryRoot);
  const status = await gitStatus(repositoryRoot);
  let checkpointCommit: string | null = null;
  if (!status.clean) {
    await assertNoApparentSecretsInDirtyFiles(repositoryRoot, status);
    await runGit(repositoryRoot, ["add", "-A"]);
    await runGit(repositoryRoot, ["commit", "--no-gpg-sign", "-m", `chore(ty-context): checkpoint before campaign ${safeCommitLabel(options.campaignId)}`], { timeoutMs: options.timeoutMs ?? 120_000 });
    if (!(await gitStatus(repositoryRoot)).clean) throw new Error("git_checkpoint_left_worktree_dirty");
    checkpointCommit = await currentHead(repositoryRoot);
  }
  const upstream = await branchUpstream(repositoryRoot, targetBranch);
  let syncAction: GitSyncAction = "no_upstream";
  if (upstream) {
    const remote = (await runGit(repositoryRoot, ["config", "--get", `branch.${targetBranch}.remote`], { throwOnError: false })).stdout.trim();
    if (options.fetch !== false && remote && remote !== ".") await runGit(repositoryRoot, ["fetch", "--prune", remote], { timeoutMs: options.timeoutMs ?? 120_000 });
    const counts = (await runGit(repositoryRoot, ["rev-list", "--left-right", "--count", `HEAD...${upstream}`])).stdout.trim().split(/\s+/u).map(Number);
    const [ahead, behind] = counts;
    if (!Number.isInteger(ahead) || !Number.isInteger(behind)) throw new Error("git_upstream_counts_invalid");
    if (ahead === 0 && behind === 0) syncAction = "unchanged";
    else if (ahead === 0) {
      await runGit(repositoryRoot, ["merge", "--ff-only", upstream], { timeoutMs: options.timeoutMs ?? 120_000 });
      syncAction = "fast_forward";
    } else if (behind === 0) syncAction = "local_ahead";
    else {
      await runGit(repositoryRoot, ["rebase", upstream], { timeoutMs: options.timeoutMs ?? 120_000 });
      syncAction = "rebased";
    }
  }
  if (!(await gitStatus(repositoryRoot)).clean) throw new Error("git_baseline_not_clean_after_sync");
  return { repositoryRoot, targetBranch, originalHead, checkpointCommit, upstream, syncAction, baseCommit: await currentHead(repositoryRoot) };
}

async function resolveRepositoryRoot(root: string): Promise<string> {
  const supplied = path.resolve(root);
  const result = await runGit(supplied, ["rev-parse", "--show-toplevel"], { throwOnError: false });
  if (result.exitCode !== 0 || !result.stdout.trim()) throw new Error("git_repository_required");
  const repositoryRoot = path.resolve(result.stdout.trim());
  if (!samePath(supplied, repositoryRoot)) throw new Error(`git_repository_root_required:${repositoryRoot}`);
  return repositoryRoot;
}

async function branchUpstream(root: string, branch: string): Promise<string | null> {
  const result = await runGit(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{upstream}`], { throwOnError: false });
  return result.exitCode === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

function containsApparentSecret(value: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bauthorization\s*[:=]\s*bearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(value);
}

async function fileContainsApparentSecret(file: string): Promise<boolean> {
  let carry = "";
  let first = true;
  for await (const value of createReadStream(file, { highWaterMark: 64 * 1024 })) {
    const chunk = value as Buffer;
    if (first && chunk.includes(0)) return false;
    first = false;
    const text = carry + chunk.toString("utf8");
    if (containsApparentSecret(text)) return true;
    carry = text.slice(-256);
  }
  return false;
}

function sanitizeGitOutput(value: string): string {
  return value
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/giu, "$1<redacted>@")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gu, "<redacted-token>")
    .replace(/(\b(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*)([^\s]+)/giu, "$1<redacted>");
}

function safeCommitLabel(value: string): string {
  const label = value.normalize("NFKC").replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^[.-]+|[.-]+$/gu, "").slice(0, 64);
  return label || "campaign";
}

function safeCommandName(value: string | undefined): string {
  return (value ?? "command").replace(/[^a-z0-9-]/giu, "_").slice(0, 40);
}

function boundedPositive(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? Math.min(value as number, maximum) : fallback;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
  return normalize(left) === normalize(right);
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true, () => false);
}
