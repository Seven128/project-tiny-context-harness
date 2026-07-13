export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonRpcRequest {
  id: number;
  method: string;
  params?: JsonValue;
}

export interface JsonRpcNotification {
  method: string;
  params?: JsonValue;
}

export interface JsonRpcResponse {
  id: number;
  result?: JsonValue;
  error?: { code: number; message: string; data?: JsonValue };
}

export interface CodexModelDescriptor {
  id: string;
  model: string;
  upgrade: string | null;
  upgradeInfo?: { model: string } | null;
  hidden?: boolean;
  supportedReasoningEfforts: Array<string | { reasoningEffort: string }>;
  defaultReasoningEffort?: string;
  [key: string]: unknown;
}

export interface CodexTurn {
  id: string;
  status: "completed" | "interrupted" | "failed" | "inProgress" | string;
  items: Array<Record<string, unknown>>;
  error?: unknown;
  [key: string]: unknown;
}

export interface CodexThread {
  id: string;
  sessionId: string;
  status: unknown;
  turns: CodexTurn[];
  cwd?: string;
  [key: string]: unknown;
}

export interface CodexGoal {
  threadId: string;
  objective: string;
  status: "active" | "paused" | "blocked" | "usageLimited" | "budgetLimited" | "complete" | string;
  tokenBudget: number | null;
  [key: string]: unknown;
}

export interface StartThreadInput {
  cwd: string;
  model?: string;
  baseInstructions?: string;
  developerInstructions?: string;
}

export interface SetGoalInput {
  threadId: string;
  objective: string;
  status?: "active" | "paused" | "blocked" | "complete";
  tokenBudget?: number | null;
}

export interface SandboxReadOnly {
  type: "readOnly";
  networkAccess: boolean;
}

export interface SandboxWorkspaceWrite {
  type: "workspaceWrite";
  writableRoots: string[];
  networkAccess: boolean;
  excludeTmpdirEnvVar: boolean;
  excludeSlashTmp: boolean;
}

export interface StartTurnInput {
  threadId: string;
  input: string;
  cwd?: string;
  model?: string;
  effort?: string;
  sandboxPolicy: SandboxReadOnly | SandboxWorkspaceWrite;
  outputSchema?: JsonValue;
  clientUserMessageId?: string;
}

export interface TurnCompletion {
  threadId: string;
  turn: CodexTurn;
  status: CodexTurn["status"];
  outputText: string | null;
}

export interface CodexAppServerClient {
  initialize(): Promise<void>;
  listModels(): Promise<CodexModelDescriptor[]>;
  startThread(input: StartThreadInput): Promise<CodexThread>;
  resumeThread(threadId: string): Promise<CodexThread>;
  readThread(threadId: string): Promise<CodexThread>;
  setGoal(input: SetGoalInput): Promise<CodexGoal>;
  getGoal(threadId: string): Promise<CodexGoal | null>;
  startTurn(input: StartTurnInput): Promise<CodexTurn>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  waitForTurn(threadId: string, turnId: string): Promise<TurnCompletion>;
  close(): Promise<void>;
}

export function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`app_server_protocol_invalid:${label}`);
  return value as Record<string, unknown>;
}

export function responseResult(value: unknown, field?: string): Record<string, unknown> {
  const root = asRecord(value, "response");
  return field ? asRecord(root[field], field) : root;
}

export function normalizeThread(value: unknown): CodexThread {
  const row = asRecord(value, "thread");
  if (typeof row.id !== "string" || !row.id) throw new Error("app_server_protocol_invalid:thread.id");
  if (typeof row.sessionId !== "string") row.sessionId = row.id;
  if (!Array.isArray(row.turns)) row.turns = [];
  return row as unknown as CodexThread;
}

export function normalizeTurn(value: unknown): CodexTurn {
  const row = asRecord(value, "turn");
  if (typeof row.id !== "string" || !row.id || typeof row.status !== "string") throw new Error("app_server_protocol_invalid:turn");
  if (!Array.isArray(row.items)) row.items = [];
  return row as unknown as CodexTurn;
}

export function finalAgentText(turn: CodexTurn): string | null {
  for (let index = turn.items.length - 1; index >= 0; index -= 1) {
    const item = turn.items[index];
    if (item.type === "agentMessage" && typeof item.text === "string") return item.text;
  }
  return null;
}

export function textInput(text: string): JsonValue {
  return { type: "text", text, text_elements: [] };
}
