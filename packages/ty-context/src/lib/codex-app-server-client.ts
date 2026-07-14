import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import {
  asRecord,
  finalAgentText,
  normalizeThread,
  normalizeTurn,
  responseResult,
  textInput,
  type CodexAppServerClient,
  type CodexGoal,
  type CodexModelDescriptor,
  type CodexThread,
  type CodexTurn,
  type JsonRpcNotification,
  type JsonRpcResponse,
  type JsonValue,
  type SetGoalInput,
  type StartThreadInput,
  type StartTurnInput,
  type TurnCompletion,
} from "./codex-app-server-protocol.js";

export interface CodexAppServerClientOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
  turnTimeoutMs?: number;
  maxLineBytes?: number;
  maxStderrBytes?: number;
}

interface PendingRequest {
  method: string;
  ambiguous: boolean;
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

interface TurnWaiter {
  resolve(value: TurnCompletion): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

export class AppServerUnavailableError extends Error {
  readonly code = "app_server_unavailable";
  constructor(message = "Codex App Server is unavailable") {
    super(`${message} [app_server_unavailable]`);
  }
}

export class AmbiguousThreadLaunchError extends Error {
  readonly code = "ambiguous_host_thread_launch";
  constructor() {
    super(
      "Thread start was dispatched without a correlated response [ambiguous_host_thread_launch]",
    );
  }
}

export class StdioCodexAppServerClient implements CodexAppServerClient {
  private readonly options: Required<
    Pick<
      CodexAppServerClientOptions,
      "requestTimeoutMs" | "turnTimeoutMs" | "maxLineBytes" | "maxStderrBytes"
    >
  > &
    CodexAppServerClientOptions;
  private child: ChildProcessWithoutNullStreams | null = null;
  private requestId = 0;
  private initialized = false;
  private closing = false;
  private stderr = "";
  private fatal: Error | null = null;
  private initializeResult: Record<string, unknown> | null = null;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly waiters = new Map<string, TurnWaiter[]>();
  private readonly completions = new Map<string, TurnCompletion>();
  private readonly subscribers = new Set<
    (notification: JsonRpcNotification) => void
  >();

  constructor(options: CodexAppServerClientOptions = {}) {
    this.options = {
      requestTimeoutMs: 30_000,
      turnTimeoutMs: 30 * 60_000,
      maxLineBytes: 4 * 1024 * 1024,
      maxStderrBytes: 64 * 1024,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.startProcess();
    this.initializeResult = responseResult(
      await this.request("initialize", {
        clientInfo: {
          name: "ty-context",
          title: "Project Tiny Context Harness",
          version: await ownPackageVersion(),
        },
        capabilities: { experimentalApi: true, requestAttestation: false },
      }),
    );
    this.notify("initialized");
    this.initialized = true;
  }

  async listModels(): Promise<CodexModelDescriptor[]> {
    this.requireInitialized();
    const models: CodexModelDescriptor[] = [];
    let cursor: string | null = null;
    do {
      const page = responseResult(
        await this.request("model/list", {
          cursor,
          limit: 100,
          includeHidden: true,
        }),
      );
      if (!Array.isArray(page.data))
        throw new Error("app_server_protocol_invalid:model/list.data");
      models.push(...(page.data as CodexModelDescriptor[]));
      cursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
    } while (cursor);
    return models;
  }

  async startThread(input: StartThreadInput): Promise<CodexThread> {
    this.requireInitialized();
    try {
      const result = responseResult(
        await this.request(
          "thread/start",
          {
            cwd: input.cwd,
            model: input.model ?? null,
            approvalPolicy: "never",
            sandbox: "read-only",
            baseInstructions: input.baseInstructions ?? null,
            developerInstructions: input.developerInstructions ?? null,
            ephemeral: false,
            experimentalRawEvents: false,
          },
          true,
        ),
      );
      return normalizeThread(result.thread);
    } catch (error) {
      if (error instanceof DisconnectedRequestError)
        throw new AmbiguousThreadLaunchError();
      throw error;
    }
  }

  async resumeThread(threadId: string): Promise<CodexThread> {
    this.requireInitialized();
    const result = responseResult(
      await this.request("thread/resume", { threadId, excludeTurns: false }),
    );
    return normalizeThread(result.thread);
  }

  async readThread(threadId: string): Promise<CodexThread> {
    this.requireInitialized();
    const result = responseResult(
      await this.request("thread/read", { threadId, includeTurns: true }),
    );
    return normalizeThread(result.thread);
  }

  async setGoal(input: SetGoalInput): Promise<CodexGoal> {
    this.requireInitialized();
    if (input.objective.length > 4000)
      throw new Error("goal_objective_too_long:maximum_4000_characters");
    const result = responseResult(
      await this.request("thread/goal/set", {
        threadId: input.threadId,
        objective: input.objective,
        status: input.status ?? "active",
        tokenBudget: input.tokenBudget ?? null,
      }),
    );
    return responseResult(result.goal) as unknown as CodexGoal;
  }

  async getGoal(threadId: string): Promise<CodexGoal | null> {
    this.requireInitialized();
    const result = responseResult(
      await this.request("thread/goal/get", { threadId }),
    );
    return result.goal === null || result.goal === undefined
      ? null
      : (responseResult(result.goal) as unknown as CodexGoal);
  }

  async startTurn(input: StartTurnInput): Promise<CodexTurn> {
    this.requireInitialized();
    const params: Record<string, JsonValue> = {
      threadId: input.threadId,
      input: [textInput(input.input)],
      approvalPolicy: "never",
      sandboxPolicy: input.sandboxPolicy as unknown as JsonValue,
    };
    if (input.clientUserMessageId)
      params.clientUserMessageId = input.clientUserMessageId;
    if (input.cwd) params.cwd = input.cwd;
    if (input.model) params.model = input.model;
    if (input.effort) params.effort = input.effort;
    if (input.outputSchema) params.outputSchema = input.outputSchema;
    const result = responseResult(await this.request("turn/start", params));
    return normalizeTurn(result.turn);
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    this.requireInitialized();
    await this.request("turn/interrupt", { threadId, turnId });
  }

  async waitForTurn(threadId: string, turnId: string): Promise<TurnCompletion> {
    const key = turnKey(threadId, turnId);
    const completed = this.completions.get(key);
    if (completed) {
      this.completions.delete(key);
      return completed;
    }
    if (this.fatal) throw this.fatal;
    return new Promise<TurnCompletion>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeWaiter(key, waiter);
        reject(new Error(`app_server_turn_timeout:${threadId}:${turnId}`));
      }, this.options.turnTimeoutMs);
      const waiter: TurnWaiter = { resolve, reject, timer };
      this.waiters.set(key, [...(this.waiters.get(key) ?? []), waiter]);
    });
  }

  onNotification(
    listener: (notification: JsonRpcNotification) => void,
  ): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  getStderrSummary(): string {
    return redact(this.stderr);
  }
  getServerInfo(): Record<string, unknown> | null {
    return this.initializeResult && { ...this.initializeResult };
  }

  async close(): Promise<void> {
    this.closing = true;
    const child = this.child;
    if (!child) return;
    try {
      child.stdin.end();
      if (await waitForChildClose(child, 1500)) return;
      child.kill();
      if (await waitForChildClose(child, 1500)) return;
      child.kill("SIGKILL");
      if (!(await waitForChildClose(child, 1000)))
        throw new Error("app_server_close_timeout");
    } finally {
      this.child = null;
    }
  }

  private startProcess(): void {
    if (this.child) return;
    const launch = defaultLaunch(this.options);
    try {
      const child = spawn(launch.command, launch.args, {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      this.child = child;
      const lines = createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      });
      lines.on("line", (line) => this.handleLine(line));
      child.stderr.on("data", (chunk: Buffer) => {
        this.stderr = boundedTail(
          this.stderr + chunk.toString("utf8"),
          this.options.maxStderrBytes,
        );
      });
      child.once("error", (error) =>
        this.disconnect(new AppServerUnavailableError(error.message)),
      );
      child.once("close", (code) => {
        if (!this.closing)
          this.disconnect(
            new AppServerUnavailableError(
              `Codex App Server exited with code ${String(code)}`,
            ),
          );
      });
    } catch (error) {
      throw new AppServerUnavailableError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private request(
    method: string,
    params?: JsonValue,
    ambiguous = false,
  ): Promise<unknown> {
    if (!this.child || this.fatal)
      return Promise.reject(this.fatal ?? new AppServerUnavailableError());
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          ambiguous
            ? new DisconnectedRequestError(method)
            : new Error(`app_server_request_timeout:${method}`),
        );
      }, this.options.requestTimeoutMs);
      this.pending.set(id, { method, ambiguous, resolve, reject, timer });
      this.child!.stdin.write(
        `${JSON.stringify({ id, method, ...(params === undefined ? {} : { params }) })}\n`,
        (error) => {
          if (!error) return;
          const pending = this.pending.get(id);
          if (!pending) return;
          clearTimeout(pending.timer);
          this.pending.delete(id);
          reject(
            ambiguous
              ? new DisconnectedRequestError(method)
              : new AppServerUnavailableError(error.message),
          );
        },
      );
    });
  }

  private notify(method: string, params?: JsonValue): void {
    this.child?.stdin.write(
      `${JSON.stringify({ method, ...(params === undefined ? {} : { params }) })}\n`,
    );
  }

  private handleLine(line: string): void {
    if (Buffer.byteLength(line, "utf8") > this.options.maxLineBytes) {
      this.disconnect(new Error("app_server_protocol_invalid:line_too_large"));
      return;
    }
    let message: Record<string, unknown>;
    try {
      message = asRecord(JSON.parse(line), "message");
    } catch (error) {
      this.disconnect(error as Error);
      return;
    }
    if (
      typeof message.id === "number" &&
      (Object.hasOwn(message, "result") || Object.hasOwn(message, "error"))
    ) {
      this.handleResponse(message as unknown as JsonRpcResponse);
      return;
    }
    if (typeof message.method === "string" && !Object.hasOwn(message, "id"))
      this.handleNotification(message as unknown as JsonRpcNotification);
  }

  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(response.id);
    if (response.error)
      pending.reject(
        new Error(
          `app_server_rpc_error:${pending.method}:${response.error.code}:${response.error.message}`,
        ),
      );
    else pending.resolve(response.result ?? null);
  }

  private handleNotification(notification: JsonRpcNotification): void {
    for (const subscriber of this.subscribers) subscriber(notification);
    if (notification.method !== "turn/completed") return;
    try {
      const params = asRecord(notification.params, "turn/completed.params");
      if (typeof params.threadId !== "string")
        throw new Error("app_server_protocol_invalid:turn/completed.threadId");
      const turn = normalizeTurn(params.turn);
      const completion: TurnCompletion = {
        threadId: params.threadId,
        turn,
        status: turn.status,
        outputText: finalAgentText(turn),
      };
      const key = turnKey(params.threadId, turn.id);
      const waiters = this.waiters.get(key);
      if (!waiters?.length) this.completions.set(key, completion);
      else {
        this.waiters.delete(key);
        for (const waiter of waiters) {
          clearTimeout(waiter.timer);
          waiter.resolve(completion);
        }
      }
    } catch (error) {
      this.disconnect(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private disconnect(error: Error): void {
    if (this.fatal) return;
    this.fatal = error;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.pending.delete(id);
      pending.reject(
        pending.ambiguous
          ? new DisconnectedRequestError(pending.method)
          : error,
      );
    }
    for (const [key, waiters] of this.waiters) {
      this.waiters.delete(key);
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    }
  }

  private removeWaiter(key: string, target: TurnWaiter): void {
    const remaining = (this.waiters.get(key) ?? []).filter(
      (item) => item !== target,
    );
    if (remaining.length) this.waiters.set(key, remaining);
    else this.waiters.delete(key);
  }

  private requireInitialized(): void {
    if (!this.initialized) throw new Error("app_server_not_initialized");
  }
}

async function waitForChildClose(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise<boolean>((resolve) => {
    const closed = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("close", closed);
      resolve(child.exitCode !== null || child.signalCode !== null);
    }, timeoutMs);
    child.once("close", closed);
  });
}

export function createCodexAppServerClientFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): StdioCodexAppServerClient {
  const command = env.TY_CONTEXT_APP_SERVER_COMMAND;
  let args: string[] | undefined;
  if (env.TY_CONTEXT_APP_SERVER_ARGS_JSON) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(env.TY_CONTEXT_APP_SERVER_ARGS_JSON);
    } catch {
      throw new Error(
        "TY_CONTEXT_APP_SERVER_ARGS_JSON must be a JSON string array",
      );
    }
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== "string")
    )
      throw new Error(
        "TY_CONTEXT_APP_SERVER_ARGS_JSON must be a JSON string array",
      );
    args = parsed as string[];
  }
  return new StdioCodexAppServerClient({
    ...(command ? { command, args: args ?? [] } : {}),
    ...(env.TY_CONTEXT_APP_SERVER_REQUEST_TIMEOUT_MS
      ? {
          requestTimeoutMs: positiveInt(
            env.TY_CONTEXT_APP_SERVER_REQUEST_TIMEOUT_MS,
            "request timeout",
          ),
        }
      : {}),
    ...(env.TY_CONTEXT_APP_SERVER_TURN_TIMEOUT_MS
      ? {
          turnTimeoutMs: positiveInt(
            env.TY_CONTEXT_APP_SERVER_TURN_TIMEOUT_MS,
            "turn timeout",
          ),
        }
      : {}),
  });
}

class DisconnectedRequestError extends Error {
  constructor(readonly method: string) {
    super(`app_server_request_disconnected:${method}`);
  }
}
function turnKey(threadId: string, turnId: string): string {
  return `${threadId}\u0000${turnId}`;
}
function boundedTail(value: string, bytes: number): string {
  return Buffer.byteLength(value) <= bytes
    ? value
    : Buffer.from(value).subarray(-bytes).toString("utf8");
}
function redact(value: string): string {
  return value.replace(
    /(token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/giu,
    "$1=[redacted]",
  );
}
function defaultLaunch(options: CodexAppServerClientOptions): {
  command: string;
  args: string[];
} {
  if (options.command)
    return { command: options.command, args: options.args ?? [] };
  if (process.platform === "win32")
    return {
      command: "pwsh.exe",
      args: [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "& codex.exe app-server --listen stdio://",
      ],
    };
  return { command: "codex", args: ["app-server", "--listen", "stdio://"] };
}
function positiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${label} must be a positive integer`);
  return parsed;
}
let cachedPackageVersion: string | undefined;
async function ownPackageVersion(): Promise<string> {
  if (cachedPackageVersion) return cachedPackageVersion;
  const value = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version?: unknown };
  if (
    typeof value.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value.version)
  )
    throw new Error("app_server_client_package_version_invalid");
  cachedPackageVersion = value.version;
  return value.version;
}
