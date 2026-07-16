import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import {
  decodeCheckEvidence,
  invalidEvidence,
} from "./long-task-check-evidence-decoder.js";
import type {
  CompiledCheckV2,
  EnvironmentRequirementV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";
import {
  declaredEnvironmentValues,
  outputContainsDeclaredEnvironmentValue,
  runnerEnvironment,
} from "./long-task-runner-environment.js";
import { resolveInsideRepository } from "./long-task-workspace.js";
import { sha256Hex } from "./strict-codec.js";

const OUTPUT_LIMIT = 2 * 1024 * 1024;

export async function executeCheckRunner(
  check: CompiledCheckV2,
  snapshotRoot: string,
): Promise<RawCommandExecutionV2> {
  const started = Date.now();
  const unavailable = await probeEnvironment(
    check.environment_requirements,
    snapshotRoot,
  );
  if (unavailable)
    return {
      raw_execution_identity: check.raw_execution_identity,
      execution_identity: check.raw_execution_identity,
      execution_status: "blocked_external",
      exit_code: -1,
      observations: {},
      stdout_sha256: sha256Hex(""),
      stderr_sha256: sha256Hex(""),
      attempts: 0,
      duration_ms: Date.now() - started,
      error: unavailable,
    };
  const retryAllowed =
    check.runner.retry_policy === "transient_once" &&
    check.runner.idempotent &&
    (check.runner.effect === "read_only" ||
      check.runner.effect === "test_sandbox");
  const maximumAttempts = retryAllowed ? 2 : 1;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const raw = await runOnce(check, snapshotRoot);
      const secrets = declaredEnvironmentValues(
        check.environment_requirements,
      );
      const decoded = outputContainsDeclaredEnvironmentValue(raw, secrets)
        ? invalidEvidence(
            raw.exit_code,
            "check_evidence_contains_declared_environment_value",
          )
        : decodeCheckEvidence(
            check,
            raw.exit_code,
            raw.stdout,
            raw.stderr,
          );
      return {
        raw_execution_identity: check.raw_execution_identity,
        execution_identity: check.raw_execution_identity,
        ...decoded,
        stdout_sha256: sha256Hex(raw.stdout),
        stderr_sha256: sha256Hex(raw.stderr),
        attempts: attempt,
        duration_ms: Date.now() - started,
      };
    } catch (error) {
      const reason = message(error);
      if (attempt < maximumAttempts) continue;
      return {
        raw_execution_identity: check.raw_execution_identity,
        execution_identity: check.raw_execution_identity,
        execution_status: "infrastructure_error",
        exit_code: -1,
        observations: {},
        stdout_sha256: sha256Hex(""),
        stderr_sha256: sha256Hex(reason),
        attempts: attempt,
        duration_ms: Date.now() - started,
        error: reason,
      };
    }
  }
  throw new Error("unreachable");
}

async function runOnce(
  check: CompiledCheckV2,
  snapshotRoot: string,
): Promise<{ exit_code: number; stdout: Buffer; stderr: Buffer }> {
  const runner = check.runner;
  const cwd = resolveInsideRepository(
    snapshotRoot,
    runner.resolved_cwd || ".",
    "runner.resolved_cwd",
  );
  const executable =
    runner.type === "project_binary"
      ? resolveInsideRepository(
          snapshotRoot,
          runner.resolved_target,
          "runner.resolved_target",
        )
      : runner.executable;
  const argv = [...runner.executable_argv_prefix, ...runner.argv];
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      windowsHide: true,
      env: runnerEnvironment(check.environment_requirements),
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

async function probeEnvironment(
  requirements: EnvironmentRequirementV2[],
  snapshotRoot: string,
): Promise<string | null> {
  for (const requirement of requirements) {
    let available = false;
    if (requirement.kind === "executable")
      available = await executableExists(requirement.target);
    else if (requirement.kind === "env_var")
      available = Boolean(process.env[requirement.target]);
    else if (requirement.kind === "file")
      available = Boolean(
        (
          await statSafe(
            resolveInsideRepository(
              snapshotRoot,
              requirement.target,
              `environment.${requirement.key}`,
            ),
          )
        )?.isFile(),
      );
    else if (requirement.kind === "directory")
      available = Boolean(
        (
          await statSafe(
            resolveInsideRepository(
              snapshotRoot,
              requirement.target,
              `environment.${requirement.key}`,
            ),
          )
        )?.isDirectory(),
      );
    else if ("host" in requirement)
      available = await loopbackAvailable(
        requirement.host,
        requirement.port,
        requirement.timeout_ms,
      );
    if (!available)
      return `environment_requirement_unavailable:${requirement.key}`;
  }
  return null;
}

async function executableExists(target: string): Promise<boolean> {
  if (path.isAbsolute(target))
    return access(target)
      .then(() => true)
      .catch(() => false);
  const names =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .flatMap((extension) => [target, `${target}${extension}`])
      : [target];
  for (const folder of (process.env.PATH ?? "").split(path.delimiter))
    for (const name of names)
      if (
        await access(path.join(folder, name))
          .then(() => true)
          .catch(() => false)
      )
        return true;
  return false;
}

async function loopbackAvailable(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (value: boolean): void => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function statSafe(file: string) {
  return import("node:fs/promises")
    .then(({ stat }) => stat(file))
    .catch(() => null);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
