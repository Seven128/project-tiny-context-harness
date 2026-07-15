import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledCheckV1,
  FrozenRunnerV1,
} from "./long-task-delivery-types.js";
import { resolveInsideRepository } from "./long-task-workspace.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { sha256Hex } from "./strict-codec.js";

const OUTPUT_LIMIT = 2 * 1024 * 1024;

export interface RunnerEvidenceV1 {
  status: "completed" | "blocked_external";
  exit_code: number;
  observations: Record<string, unknown>;
  attempts: number;
  duration_ms: number;
  error: string | null;
}

export async function executeCheckRunner(
  check: CompiledCheckV1,
  snapshotRoot: string,
): Promise<RunnerEvidenceV1> {
  const started = Date.now();
  const retryAllowed =
    check.runner.retry_policy === "transient_once" &&
    check.runner.idempotent &&
    (check.runner.effect === "read_only" ||
      check.runner.effect === "test_sandbox");
  let attempt = 0;
  const maximumAttempts = retryAllowed ? 2 : 1;
  while (attempt < maximumAttempts) {
    attempt += 1;
    try {
      const result = await runOnce(check.runner, snapshotRoot);
      const decoded = decodeEvidence(check, result.exit_code, result.stdout);
      const artifacts = await collectArtifacts(check, snapshotRoot);
      return {
        ...decoded,
        observations: {
          ...decoded.observations,
          artifacts: {
            paths: artifacts.files.map((item) => item.path),
            sha256: Object.fromEntries(
              artifacts.files.map((item) => [item.path, item.sha256]),
            ),
          },
        },
        error:
          [decoded.error, ...artifacts.errors].filter(Boolean).join(";") ||
          null,
        attempts: attempt,
        duration_ms: Date.now() - started,
      };
    } catch (error) {
      if (attempt < maximumAttempts && isTransient(error)) continue;
      return {
        status: "blocked_external",
        exit_code: -1,
        observations: {},
        attempts: attempt,
        duration_ms: Date.now() - started,
        error: message(error),
      };
    }
  }
  throw new Error("unreachable");
}

async function collectArtifacts(
  check: CompiledCheckV1,
  snapshotRoot: string,
): Promise<{
  files: Array<{ path: string; sha256: string }>;
  errors: string[];
}> {
  if (!check.artifact_globs.length) return { files: [], errors: [] };
  const candidates: string[] = [];
  async function visit(directory: string, relative = ""): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!relative && (entry.name === ".git" || entry.name === "node_modules"))
        continue;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory())
        await visit(path.join(directory, entry.name), next);
      else if (entry.isFile()) candidates.push(next);
    }
  }
  await visit(snapshotRoot);
  const selected = [
    ...new Set(
      check.artifact_globs.flatMap((pattern) =>
        candidates.filter((candidate) =>
          matchesRepoPattern(candidate, pattern),
        ),
      ),
    ),
  ].sort();
  const files = await Promise.all(
    selected.map(async (relative) => ({
      path: relative,
      sha256: sha256Hex(
        await readFile(path.join(snapshotRoot, ...relative.split("/"))),
      ),
    })),
  );
  const errors = check.artifact_globs
    .filter(
      (pattern) => !selected.some((file) => matchesRepoPattern(file, pattern)),
    )
    .map((pattern) => `artifact_glob_empty:${pattern}`);
  return { files, errors };
}

async function runOnce(
  runner: FrozenRunnerV1,
  snapshotRoot: string,
): Promise<{ exit_code: number; stdout: Buffer; stderr: Buffer }> {
  const cwd = resolveInsideRepository(snapshotRoot, runner.cwd, "runner.cwd");
  const executable =
    runner.type === "project_binary"
      ? resolveInsideRepository(
          snapshotRoot,
          runner.executable,
          "runner.executable",
        )
      : runner.executable;
  const argv = [...runner.executable_argv_prefix, ...runner.argv];
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      windowsHide: true,
      env: runnerEnvironment(runner),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let settled = false;
    const capture = (target: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > OUTPUT_LIMIT) {
        child.kill();
        if (!settled) {
          settled = true;
          reject(new Error("command_output_limit_exceeded"));
        }
        return;
      }
      target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(new Error(`command_spawn_error:${message(error)}`));
      }
    });
    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new Error("command_timeout"));
      }
    }, runner.timeout_ms);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({
        exit_code: code ?? -1,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

function decodeEvidence(
  check: CompiledCheckV1,
  exitCode: number,
  stdout: Buffer,
): Omit<RunnerEvidenceV1, "attempts" | "duration_ms"> {
  if (check.runner.type === "playwright_test") {
    try {
      const report = JSON.parse(stdout.toString("utf8")) as Record<
        string,
        unknown
      >;
      const stats =
        report.stats && typeof report.stats === "object"
          ? (report.stats as Record<string, unknown>)
          : {};
      return {
        status: "completed",
        exit_code: exitCode,
        observations: {
          "playwright.passed": exitCode === 0,
          "playwright.unexpected": stats.unexpected ?? null,
          "playwright.expected": stats.expected ?? null,
          "playwright.skipped": stats.skipped ?? null,
        },
        error: null,
      };
    } catch (error) {
      return completedError(
        exitCode,
        `playwright_report_invalid:${message(error)}`,
      );
    }
  }
  const lines = stdout
    .toString("utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  try {
    const payload = JSON.parse(lines.at(-1) ?? "") as Record<string, unknown>;
    if (payload.schema_version !== "long-task-check-result-v1")
      return completedError(exitCode, "check_evidence_schema_invalid");
    if (payload.blocked_external !== undefined)
      return {
        status: "blocked_external",
        exit_code: exitCode,
        observations: {},
        error: `blocked_external:${String(payload.blocked_external)}`,
      };
    if (
      !payload.observations ||
      typeof payload.observations !== "object" ||
      Array.isArray(payload.observations)
    )
      return completedError(exitCode, "check_evidence_observations_invalid");
    return {
      status: "completed",
      exit_code: exitCode,
      observations: payload.observations as Record<string, unknown>,
      error: null,
    };
  } catch (error) {
    return completedError(
      exitCode,
      `check_evidence_json_invalid:${message(error)}`,
    );
  }
}

function completedError(
  exitCode: number,
  error: string,
): Omit<RunnerEvidenceV1, "attempts" | "duration_ms"> {
  return { status: "completed", exit_code: exitCode, observations: {}, error };
}

function runnerEnvironment(runner: FrozenRunnerV1): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH",
    "Path",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "HOME",
    "USERPROFILE",
    "TMP",
    "TEMP",
    "CI",
    "LANG",
    "LC_ALL",
  ])
    if (process.env[key] !== undefined) result[key] = process.env[key];
  result.TY_CONTEXT_CHECK_PROTOCOL = "long-task-check-result-v1";
  result.TY_CONTEXT_NETWORK_POLICY = runner.network_policy.mode;
  result.TY_CONTEXT_ALLOWED_HOSTS =
    runner.network_policy.allowed_hosts.join(",");
  if (runner.network_policy.mode === "none") {
    result.HTTP_PROXY = "";
    result.HTTPS_PROXY = "";
    result.ALL_PROXY = "";
    result.NO_PROXY = "*";
  }
  return result;
}

function isTransient(error: unknown): boolean {
  const text = message(error);
  return (
    text.includes("command_spawn_error") || text.includes("command_timeout")
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
