import { readFile } from "node:fs/promises";
import path from "node:path";
import { packageOwnedCommand } from "./long-task-hook-install.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

export interface CompletionGateCheck {
  status: "available" | "completion_gate_unavailable";
  bundle_sha256: string;
  findings: string[];
}

export async function checkLongTaskCompletionGate(
  repositoryRoot: string,
  packageRoot: string,
): Promise<CompletionGateCheck> {
  const config = path.join(
    path.resolve(repositoryRoot),
    ".codex",
    "hooks.json",
  );
  const entry = path.join(
    path.resolve(packageRoot),
    "dist",
    "long-task-hook.js",
  );
  const expectedCommand = packageOwnedCommand(entry);
  const findings: string[] = [];
  let configHash = "missing";
  let hookHash = "missing";
  try {
    hookHash = sha256Hex(
      await readFile(
        await assertProtectedRepositoryFile(
          packageRoot,
          entry,
          "package_owned_hook",
        ),
      ),
    );
  } catch {
    findings.push("package_owned_hook_missing");
  }
  try {
    const content = await readFile(
      await assertProtectedRepositoryFile(
        repositoryRoot,
        config,
        "completion_hook_config",
      ),
      "utf8",
    );
    configHash = sha256Hex(content);
    const value = JSON.parse(content) as { hooks?: Record<string, unknown[]> };
    for (const event of ["SessionStart", "PostCompact", "Stop"]) {
      const handlers = managedHandlers(value.hooks?.[event], expectedCommand);
      if (handlers.length !== 1)
        findings.push(`completion_hook_event_missing:${event}`);
      else {
        const timeout = handlers[0].timeout;
        const expected = event === "Stop" ? 3600 : 10;
        if (timeout !== expected)
          findings.push(`completion_hook_timeout_invalid:${event}`);
      }
    }
  } catch {
    findings.push("hooks_config_missing_or_invalid");
  }
  const bundle_sha256 = sha256Hex(`${configHash}:${hookHash}`);
  return {
    status: findings.length ? "completion_gate_unavailable" : "available",
    bundle_sha256,
    findings,
  };
}

function managedHandlers(
  value: unknown,
  expectedCommand: string,
): Record<string, unknown>[] {
  if (Array.isArray(value))
    return value.flatMap((item) => managedHandlers(item, expectedCommand));
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (
      item.type === "command" &&
      item.command === expectedCommand &&
      item.commandWindows === expectedCommand
    )
      return [item];
    return Object.values(item).flatMap((child) =>
      managedHandlers(child, expectedCommand),
    );
  }
  return [];
}
