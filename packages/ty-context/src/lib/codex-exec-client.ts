import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from "node:child_process";
import { runGit } from "./composite-campaign-git-baseline.js";
import type { ModelProfile } from "./codex-model-profile.js";

const DEFAULT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const DEFAULT_GRACE_MS = 5_000;
const DEFAULT_STDOUT_LIMIT = 8 * 1024 * 1024;
const DEFAULT_STDERR_LIMIT = 512 * 1024;

export type CodexExecWorkerKind = "authoring" | "execution" | "repair";

export interface CodexExecArgvOptions {
  kind: CodexExecWorkerKind;
  cwd: string;
  profile: ModelProfile;
  outputSchemaFile?: string;
  outputLastMessageFile?: string;
}

export interface CodexExecInvocation {
  runId?: string;
  executable?: string;
  args: string[];
  cwd: string;
  prompt: string;
  timeoutMs?: number;
  gracefulTerminationMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
  stderrFile?: string;
  signal?: AbortSignal;
  onSpawn?: (pid: number) => void | Promise<void>;
}

export interface CodexExecJsonEvent {
  [key: string]: unknown;
}

export interface CodexExecResult {
  run_id: string;
  pid: number;
  argv: string[];
  cwd: string;
  events: CodexExecJsonEvent[];
  invalid_jsonl_lines: number;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  interrupted: boolean;
  stdout_limited: boolean;
  stderr_limited: boolean;
  stderr: string;
  started_at: string;
  completed_at: string;
}

export interface CodexExecCheckResult {
  schema_version: "codex-exec-check-v1";
  execution_engine_id: "codex-exec-v1";
  executable: string;
  executable_available: boolean;
  version: string | null;
  version_check: "passed" | "failed";
  exec_help_check: "passed" | "failed";
  supported_arguments: Record<string, boolean>;
  git_repository: boolean;
  authentication_resolved_by_cli: boolean;
  passed: boolean;
  error_codes: string[];
}

export function buildCodexExecArgv(options: CodexExecArgvOptions): string[] {
  const model = requiredText(options.profile.model, "worker_model");
  const effort = requiredText(options.profile.effort, "worker_effort");
  const cwd = path.resolve(options.cwd);
  const args = [
    "exec",
    "--json",
    "--ephemeral",
    "--cd",
    cwd,
    "--model",
    model,
    "--config",
    `model_reasoning_effort=${tomlString(effort)}`,
    "--config",
    "agents.max_threads=1",
    "--config",
    "agents.max_depth=0",
    "--sandbox",
    options.kind === "authoring" ? "read-only" : "workspace-write",
    "--ask-for-approval",
    "never",
  ];
  if (options.kind === "authoring") {
    if (!options.outputSchemaFile || !options.outputLastMessageFile)
      throw new Error("authoring_worker_output_files_required");
    args.push(
      "--output-schema",
      path.resolve(options.outputSchemaFile),
      "--output-last-message",
      path.resolve(options.outputLastMessageFile),
    );
  } else if (options.outputSchemaFile || options.outputLastMessageFile) {
    throw new Error("write_worker_structured_output_files_forbidden");
  }
  args.push("-");
  return args;
}

export function redactedCodexExecArgv(args: readonly string[]): string[] {
  const redacted = [...args];
  for (let index = 0; index < redacted.length - 1; index += 1) {
    const flag = redacted[index];
    if (flag === "--cd") redacted[index + 1] = "<worker-cwd>";
    if (flag === "--output-schema") redacted[index + 1] = "<output-schema>";
    if (flag === "--output-last-message")
      redacted[index + 1] = "<output-last-message>";
  }
  return redacted;
}

export async function runCodexExec(
  invocation: CodexExecInvocation,
): Promise<CodexExecResult> {
  const executable = invocation.executable ?? "codex";
  const cwd = path.resolve(invocation.cwd);
  const timeoutMs = positiveBound(
    invocation.timeoutMs,
    DEFAULT_TIMEOUT_MS,
    24 * 60 * 60 * 1000,
  );
  const gracefulMs = positiveBound(
    invocation.gracefulTerminationMs,
    DEFAULT_GRACE_MS,
    60_000,
  );
  const stdoutLimit = positiveBound(
    invocation.maxStdoutBytes,
    DEFAULT_STDOUT_LIMIT,
    64 * 1024 * 1024,
  );
  const stderrLimit = positiveBound(
    invocation.maxStderrBytes,
    DEFAULT_STDERR_LIMIT,
    16 * 1024 * 1024,
  );
  const runId = invocation.runId ?? randomUUID();
  const startedAt = new Date().toISOString();
  const child = spawn(executable, [...invocation.args], spawnOptions(cwd));
  await new Promise<void>((resolve, reject) => {
    const onSpawn = () => {
      child.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      child.off("spawn", onSpawn);
      reject(error);
    };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
  const pid = child.pid;
  if (!pid) throw new Error("codex_exec_spawn_missing_pid");

  const events: CodexExecJsonEvent[] = [];
  const stderrChunks: Buffer[] = [];
  let stderrBytes = 0;
  let stdoutBytes = 0;
  let stdoutRemainder = "";
  let invalidJsonlLines = 0;
  let stdoutLimited = false;
  let stderrLimited = false;
  let timedOut = false;
  let interrupted = false;
  let terminationStarted = false;

  const requestTermination = async (
    reason: "timeout" | "interrupt" | "output",
  ) => {
    if (terminationStarted) return;
    terminationStarted = true;
    timedOut = reason === "timeout";
    interrupted = reason === "interrupt";
    await terminateChild(child, pid, gracefulMs);
  };

  const timer = setTimeout(() => void requestTermination("timeout"), timeoutMs);
  const abort = () => void requestTermination("interrupt");
  invocation.signal?.addEventListener("abort", abort, { once: true });

  const completion = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes > stdoutLimit) {
      stdoutLimited = true;
      void requestTermination("output");
      return;
    }
    stdoutRemainder += chunk.toString("utf8");
    const lines = stdoutRemainder.split(/\r?\n/u);
    stdoutRemainder = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const value = JSON.parse(line) as unknown;
        if (!value || typeof value !== "object" || Array.isArray(value))
          invalidJsonlLines += 1;
        else events.push(value as CodexExecJsonEvent);
      } catch {
        invalidJsonlLines += 1;
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const remaining = stderrLimit - stderrBytes;
    if (remaining <= 0) {
      stderrLimited = true;
      return;
    }
    const kept = chunk.subarray(0, remaining);
    stderrChunks.push(Buffer.from(kept));
    stderrBytes += kept.length;
    if (kept.length !== chunk.length) stderrLimited = true;
  });

  let closed: { code: number | null; signal: NodeJS.Signals | null };
  try {
    await invocation.onSpawn?.(pid);
    child.stdin.end(invocation.prompt, "utf8");
    closed = await completion;
  } catch (error) {
    child.stdin.destroy();
    await terminateChild(child, pid, gracefulMs);
    await completion.catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    invocation.signal?.removeEventListener("abort", abort);
  }
  if (stdoutRemainder.trim() && !stdoutLimited) {
    try {
      const value = JSON.parse(stdoutRemainder) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value))
        invalidJsonlLines += 1;
      else events.push(value as CodexExecJsonEvent);
    } catch {
      invalidJsonlLines += 1;
    }
  }
  const stderr = Buffer.concat(stderrChunks).toString("utf8");
  if (invocation.stderrFile) {
    const target = path.resolve(invocation.stderrFile);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, stderr, "utf8");
  }
  return {
    run_id: runId,
    pid,
    argv: redactedCodexExecArgv(invocation.args),
    cwd,
    events,
    invalid_jsonl_lines: invalidJsonlLines,
    exit_code: closed.code,
    signal: closed.signal,
    timed_out: timedOut,
    interrupted,
    stdout_limited: stdoutLimited,
    stderr_limited: stderrLimited,
    stderr,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  };
}

export async function checkCodexExecV1(options: {
  projectRoot: string;
  executable?: string;
}): Promise<CodexExecCheckResult> {
  const executable = options.executable ?? "codex";
  const errors: string[] = [];
  const version = await runProbe(
    executable,
    ["--version"],
    options.projectRoot,
  );
  if (!version.ok) errors.push("codex_version_failed");
  const help = await runProbe(
    executable,
    ["exec", "--help"],
    options.projectRoot,
  );
  if (!help.ok) errors.push("codex_exec_help_failed");
  const required = [
    "--json",
    "--ephemeral",
    "--cd",
    "--model",
    "--config",
    "--sandbox",
    "--output-schema",
    "--output-last-message",
    "--ask-for-approval",
  ];
  const supported = Object.fromEntries(
    required.map((flag) => [flag, help.ok && help.stdout.includes(flag)]),
  );
  for (const [flag, present] of Object.entries(supported))
    if (!present) errors.push(`codex_exec_argument_missing:${flag}`);
  const auth = await runProbe(
    executable,
    ["login", "status"],
    options.projectRoot,
  );
  if (!auth.ok) errors.push("codex_auth_unresolved");
  let gitRepository = false;
  try {
    gitRepository =
      (
        await runGit(options.projectRoot, [
          "rev-parse",
          "--is-inside-work-tree",
        ])
      ).stdout.trim() === "true";
  } catch {
    errors.push("git_repository_required");
  }
  return {
    schema_version: "codex-exec-check-v1",
    execution_engine_id: "codex-exec-v1",
    executable,
    executable_available: version.spawned,
    version: version.ok ? firstLine(version.stdout) : null,
    version_check: version.ok ? "passed" : "failed",
    exec_help_check: help.ok ? "passed" : "failed",
    supported_arguments: supported,
    git_repository: gitRepository,
    authentication_resolved_by_cli: auth.ok,
    passed: errors.length === 0 && gitRepository,
    error_codes: errors,
  };
}

export async function terminateKnownProcessTree(
  pid: number,
  force: boolean,
): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("worker_pid_invalid");
  if (process.platform === "win32") {
    const args = ["/PID", String(pid), "/T"];
    if (force) args.push("/F");
    await runProbe("taskkill", args, process.cwd(), 15_000);
    return;
  }
  const descendants = await unixDescendants(pid);
  const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
  for (const candidate of [...descendants.reverse(), pid]) {
    try {
      process.kill(candidate, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
}

async function terminateChild(
  child: ChildProcessWithoutNullStreams,
  pid: number,
  gracefulMs: number,
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else await terminateKnownProcessTree(pid, false);
  } catch {}
  await waitForExit(child, gracefulMs);
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    await terminateKnownProcessTree(pid, true);
  } catch {}
}

async function waitForExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function unixDescendants(parent: number): Promise<number[]> {
  const probe = await runProbe("ps", ["-eo", "pid=,ppid="], process.cwd());
  if (!probe.ok) return [];
  const children = new Map<number, number[]>();
  for (const line of probe.stdout.split(/\r?\n/u)) {
    const match = /^\s*(\d+)\s+(\d+)\s*$/u.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const found: number[] = [];
  const visit = (pid: number) => {
    for (const child of children.get(pid) ?? []) {
      found.push(child);
      visit(child);
    }
  };
  visit(parent);
  return found;
}

async function runProbe(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs = 10_000,
): Promise<{
  ok: boolean;
  spawned: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  return new Promise((resolve) => {
    let spawned = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(executable, args, spawnOptions(path.resolve(cwd)));
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let bytes = 0;
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        ok: exitCode === 0,
        spawned,
        stdout: Buffer.concat(stdout)
          .toString("utf8")
          .slice(0, 256 * 1024),
        stderr: Buffer.concat(stderr)
          .toString("utf8")
          .slice(0, 256 * 1024),
        exitCode,
      });
    };
    const capture = (target: Buffer[]) => (chunk: Buffer) => {
      if (bytes >= 256 * 1024) return;
      const kept = chunk.subarray(0, 256 * 1024 - bytes);
      target.push(Buffer.from(kept));
      bytes += kept.length;
    };
    child.once("spawn", () => {
      spawned = true;
    });
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.once("error", () => finish(null));
    child.once("close", (code) => finish(code));
    child.stdin.end();
    timer = setTimeout(() => {
      if (child.pid) void terminateKnownProcessTree(child.pid, true);
      finish(null);
    }, timeoutMs);
  });
}

function spawnOptions(cwd: string): SpawnOptionsWithoutStdio & {
  stdio: ["pipe", "pipe", "pipe"];
} {
  return {
    cwd,
    shell: false,
    windowsHide: true,
    detached: false,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
  };
}

function positiveBound(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  const selected = value ?? fallback;
  if (!Number.isInteger(selected) || selected <= 0 || selected > maximum)
    throw new Error("codex_exec_numeric_bound_invalid");
  return selected;
}

function requiredText(value: string, label: string): string {
  if (!value.trim() || value === "unknown")
    throw new Error(`${label}_required`);
  return value.trim();
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function firstLine(value: string): string {
  return value.split(/\r?\n/u)[0]?.trim().slice(0, 256) ?? "";
}
