import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FrozenVerificationSpecV2 } from "./long-task-contract-schema.js";
import type { CommandRunV2 } from "./long-task-run-result.js";
import { sha256Hex } from "./composite-campaign-codec.js";

const OUTPUT_LIMIT = 2 * 1024 * 1024;
export async function runFrozenCommand(spec: FrozenVerificationSpecV2, snapshotRoot: string, outputRoot: string, artifactRoot: string): Promise<CommandRunV2> {
  const cwd = spec.cwd === "repo_root" ? snapshotRoot : path.resolve(snapshotRoot, spec.cwd); if (cwd !== snapshotRoot && !cwd.startsWith(`${snapshotRoot}${path.sep}`)) throw new Error(`wrong_cwd:${spec.id}`);
  await mkdir(outputRoot, { recursive: true }); const stdoutPath = path.join(outputRoot, "stdout.txt"); const stderrPath = path.join(outputRoot, "stderr.txt"); const startedAt = new Date().toISOString();
  const result = await new Promise<{ code: number; stdout: Buffer; stderr: Buffer }>((resolve, reject) => { const child = spawn(spec.executable_path, spec.argv, { cwd, shell: false, env: allowedEnvironment(artifactRoot), windowsHide: true }); const stdout: Buffer[] = []; const stderr: Buffer[] = []; let size = 0; const capture = (target: Buffer[]) => (chunk: Buffer) => { size += chunk.length; if (size > OUTPUT_LIMIT) { child.kill(); reject(new Error(`command_output_limit_exceeded:${spec.id}`)); return; } target.push(Buffer.from(chunk)); }; child.stdout.on("data", capture(stdout)); child.stderr.on("data", capture(stderr)); child.on("error", reject); const timer = setTimeout(() => { child.kill(); reject(new Error(`command_timeout:${spec.id}`)); }, spec.timeout_ms); child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? -1, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }); }); });
  await writeFile(stdoutPath, result.stdout); await writeFile(stderrPath, result.stderr); return { spec_id: spec.id, executable: spec.executable_path, argv: [...spec.argv], cwd, exit_code: result.code, stdout_path: stdoutPath, stdout_sha256: sha256Hex(result.stdout), stderr_path: stderrPath, stderr_sha256: sha256Hex(result.stderr), started_at: startedAt, completed_at: new Date().toISOString() };
}
function allowedEnvironment(artifactRoot: string): NodeJS.ProcessEnv { const result: NodeJS.ProcessEnv = {}; for (const key of ["PATH", "Path", "PATHEXT", "SYSTEMROOT", "WINDIR", "HOME", "USERPROFILE", "TMP", "TEMP", "CI", "LANG", "LC_ALL"]) if (process.env[key] !== undefined) result[key] = process.env[key]; result.TY_CONTEXT_ORACLE_PROTOCOL = "ty-context-observation-v1"; result.TY_CONTEXT_ARTIFACT_DIR = artifactRoot; return result; }
