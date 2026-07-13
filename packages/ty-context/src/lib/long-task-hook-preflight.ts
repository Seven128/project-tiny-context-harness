import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex } from "./composite-campaign-codec.js";

const POSIX_COMMAND = "node \"$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs\"";
const WINDOWS_COMMAND = "powershell -NoProfile -Command \"$r=(git rev-parse --show-toplevel); node (Join-Path $r '.codex/hooks/long-task-hook.mjs')\"";

export interface CompletionGateCheck {
  status: "available" | "completion_gate_unavailable";
  bundle_sha256: string;
  findings: string[];
}

export async function checkLongTaskCompletionGate(repositoryRoot: string): Promise<CompletionGateCheck> {
  const root = path.resolve(repositoryRoot);
  const findings: string[] = [];
  const script = path.join(root, ".codex", "hooks", "long-task-hook.mjs");
  const config = path.join(root, ".codex", "hooks.json");
  let scriptHash = "missing";
  let configHash = "missing";
  try {
    const scriptBytes = await readFile(script);
    scriptHash = sha256Hex(scriptBytes);
    const supported = fileURLToPath(new URL("../../assets/hooks/long-task-hook.mjs", import.meta.url));
    const supportedBytes = await readFile(supported);
    if (sha256Hex(normalizeManagedText(scriptBytes)) !== sha256Hex(normalizeManagedText(supportedBytes))) findings.push("completion_hook_script_unmanaged");
  }
  catch { findings.push("completion_hook_script_missing"); }
  try {
    const content = await readFile(config, "utf8");
    configHash = sha256Hex(content);
    const value = JSON.parse(content) as { hooks?: Record<string, unknown[]> };
    for (const event of ["SessionStart", "PostCompact", "Stop"]) {
      if (!Array.isArray(value.hooks?.[event]) || !containsManagedHandler(value.hooks[event])) {
        findings.push(`completion_hook_event_missing:${event}`);
      }
    }
    if (containsContinueFalse(value.hooks?.Stop)) findings.push("conflicting_stop_hook_continue_false");
  } catch {
    findings.push("hooks_config_missing_or_invalid");
  }
  const bundle_sha256 = sha256Hex(`${configHash}:${scriptHash}`);
  return {
    status: findings.length === 0 ? "available" : "completion_gate_unavailable",
    bundle_sha256,
    findings
  };
}

function normalizeManagedText(value: Uint8Array): Buffer {
  return Buffer.from(Buffer.from(value).toString("utf8").replace(/\r\n?/gu, "\n"), "utf8");
}

export async function assertLongTaskCompletionGate(repositoryRoot: string): Promise<CompletionGateCheck> {
  const result = await checkLongTaskCompletionGate(repositoryRoot);
  if (result.status !== "available") {
    throw new Error(`completion_gate_unavailable:${result.findings.join(",")}`);
  }
  return result;
}

function containsContinueFalse(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsContinueFalse);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, item]) => (key === "continue" && item === false) || containsContinueFalse(item)
    );
  }
  return false;
}

function containsManagedHandler(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsManagedHandler);
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (item.type === "command" && item.command === POSIX_COMMAND && item.commandWindows === WINDOWS_COMMAND) return true;
    return Object.values(item).some(containsManagedHandler);
  }
  return false;
}
