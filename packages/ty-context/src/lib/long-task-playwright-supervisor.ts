import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface SupervisorConfigV1 {
  schema_version: "long-task-playwright-supervisor-v1";
  timeout_ms: number;
  browser: { executable: string; argv: string[]; cwd: string; profile: string };
  bridge: { entry: string; core_bundle: string; root: string; ready: string; done: string };
  test: { executable: string; argv: string[]; cwd: string; worker_adapter: string };
}

interface TrackedProcess {
  child: ChildProcessWithoutNullStreams;
  completion: Promise<ProcessResult>;
  settled?: ProcessResult;
}

interface ProcessResult {
  code: number;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
}

const OUTPUT_LIMIT = 16 * 1024 * 1024;

try {
  await main();
} catch (error) {
  process.stderr.write(`playwright_supervisor_failure:${message(error)}\n`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const configPath = absolute(process.argv[2], "config");
  const bytes = await readFile(configPath);
  const expectedHash = process.env.TY_CONTEXT_PLAYWRIGHT_SUPERVISOR_CONFIG_SHA256;
  if (!expectedHash || !/^[a-f0-9]{64}$/u.test(expectedHash) || sha256(bytes) !== expectedHash) {
    throw new Error("config_identity_invalid");
  }
  const config = validate(JSON.parse(bytes.toString("utf8")) as unknown);
  let browser: TrackedProcess | undefined;
  let bridge: TrackedProcess | undefined;
  let test: ProcessResult | undefined;
  let failure: Error | undefined;
  try {
    browser = tracked(config.browser.executable, config.browser.argv, config.browser.cwd, process.env);
    const activePort = await waitForFile(path.join(config.browser.profile, "DevToolsActivePort"), browser, 30_000, "browser_start_failed");
    const lines = activePort.toString("utf8").trim().split(/\r?\n/u);
    const port = Number(lines[0]);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !lines[1]?.startsWith("/devtools/browser/")) {
      throw new Error("devtools_endpoint_invalid");
    }
    bridge = tracked(process.execPath, ["--preserve-symlinks", config.bridge.entry], path.dirname(config.bridge.entry), {
      ...process.env,
      TY_CONTEXT_PLAYWRIGHT_CORE_BUNDLE: config.bridge.core_bundle,
      TY_CONTEXT_PLAYWRIGHT_CDP_ENDPOINT: `http://127.0.0.1:${port}`,
      TY_CONTEXT_PLAYWRIGHT_BRIDGE_READY: config.bridge.ready,
      TY_CONTEXT_PLAYWRIGHT_BRIDGE_DONE: config.bridge.done,
    });
    const readyBytes = await waitForFile(config.bridge.ready, bridge, 30_000, "bridge_start_failed");
    const ready = JSON.parse(readyBytes.toString("utf8")) as { schema_version?: unknown; ws_endpoint?: unknown };
    if (ready.schema_version !== "ty-context-playwright-bridge-v1" || typeof ready.ws_endpoint !== "string" || !/^ws:\/\/127\.0\.0\.1:\d+\/ty-context-playwright$/u.test(ready.ws_endpoint)) {
      throw new Error("bridge_endpoint_invalid");
    }
    test = await tracked(config.test.executable, ["--require", config.test.worker_adapter, ...config.test.argv], config.test.cwd, {
      ...process.env,
      PW_TEST_CONNECT_WS_ENDPOINT: ready.ws_endpoint,
      TY_CONTEXT_PLAYWRIGHT_WORKER_THREADS: "1",
    }).completion;
    await writeFile(config.bridge.done, "done", { flag: "wx" });
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error));
  } finally {
    await writeFile(config.bridge.done, "done", { flag: "wx" }).catch(() => undefined);
    const browserExitedBeforeCleanup = browser?.settled !== undefined;
    const bridgeResult = bridge ? await finish(bridge, 10_000) : undefined;
    const browserResult = browser ? await finish(browser, 500) : undefined;
    const background = [bridgeResult, browserResult].filter((value): value is ProcessResult => value !== undefined);
    if (!failure) {
      if (bridgeResult && bridgeResult.code !== 0) failure = new Error(`bridge_exit:${bridgeResult.code}:${bridgeResult.stderr.toString("utf8")}`);
      else if (browserExitedBeforeCleanup && browserResult && browserResult.code !== 0) failure = new Error(`browser_exit:${browserResult.code}:${browserResult.stderr.toString("utf8")}`);
    }
    if (test) {
      process.stdout.write(test.stdout);
      process.stderr.write(test.stderr);
    }
    for (const result of background) process.stderr.write(result.stderr);
  }
  if (failure) throw failure;
  if (!test) throw new Error("test_not_started");
  process.exitCode = test.code;
}

function tracked(executable: string, argv: string[], cwd: string, env: NodeJS.ProcessEnv): TrackedProcess {
  const child = spawn(executable, argv, { cwd, env, shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end();
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let size = 0;
  let tracker: TrackedProcess;
  const capture = (target: Buffer[]) => (chunk: Buffer): void => {
    size += chunk.length;
    if (size > OUTPUT_LIMIT) {
      child.kill("SIGKILL");
      return;
    }
    target.push(Buffer.from(chunk));
  };
  child.stdout.on("data", capture(stdout));
  child.stderr.on("data", capture(stderr));
  const completion = new Promise<ProcessResult>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      const result = { code: size > OUTPUT_LIMIT ? 1 : code ?? 1, signal, stdout: Buffer.concat(stdout), stderr: size > OUTPUT_LIMIT ? Buffer.from("playwright_output_limit") : Buffer.concat(stderr) };
      tracker.settled = result;
      resolve(result);
    });
  });
  tracker = { child, completion };
  return tracker;
}

async function waitForFile(file: string, process: TrackedProcess, timeout: number, code: string): Promise<Buffer> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { return await readFile(file); } catch (error) {
      if (!["ENOENT", "EBUSY", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    }
    if (process.settled) throw new Error(`${code}:${process.settled.code}:${process.settled.stderr.toString("utf8")}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(code);
}

async function finish(process: TrackedProcess, grace: number): Promise<ProcessResult> {
  if (process.settled) return process.settled;
  const graceful = await Promise.race([process.completion, new Promise<null>((resolve) => setTimeout(() => resolve(null), grace))]);
  if (graceful) return graceful;
  process.child.kill("SIGTERM");
  const terminated = await Promise.race([process.completion, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000))]);
  if (terminated) return terminated;
  process.child.kill("SIGKILL");
  return process.completion;
}

function validate(value: unknown): SupervisorConfigV1 {
  if (!value || typeof value !== "object") throw new Error("config_schema_invalid");
  const row = value as Partial<SupervisorConfigV1>;
  if (row.schema_version !== "long-task-playwright-supervisor-v1" || !Number.isInteger(row.timeout_ms) || (row.timeout_ms ?? 0) < 1) throw new Error("config_schema_invalid");
  if (!row.browser || !row.bridge || !row.test) throw new Error("config_schema_invalid");
  for (const file of [row.browser.executable, row.browser.cwd, row.browser.profile, row.bridge.entry, row.bridge.core_bundle, row.bridge.root, row.bridge.ready, row.bridge.done, row.test.executable, row.test.cwd, row.test.worker_adapter]) absolute(file, "path");
  if (!strings(row.browser.argv) || !strings(row.test.argv)) throw new Error("config_schema_invalid");
  return row as SupervisorConfigV1;
}

function absolute(value: unknown, field: string): string {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw new Error(`config_${field}_invalid`);
  return path.resolve(value);
}
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function sha256(value: Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
