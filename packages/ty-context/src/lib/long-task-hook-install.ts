import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists } from "./fs.js";
import type { SyncReport } from "./sync-engine.js";

const MANAGED_STATUS = "Tiny Context long-task live authority gate";
const LEGACY_MANAGED_STATUSES = new Set([
  "Tiny Context long-task live authority gate",
  "Tiny Context long-task authority gate",
  "Tiny Context long-task completion gate",
  "Tiny Context composite completion gate",
]);
const LEGACY_REPO_LOCAL_COMMANDS = new Set([
  'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"',
  "powershell -NoProfile -Command \"$r=(git rev-parse --show-toplevel); node (Join-Path $r '.codex/hooks/long-task-hook.mjs')\"",
  "node .codex/hooks/long-task-hook.mjs",
  'node ".codex/hooks/long-task-hook.mjs"',
  "node .codex\\hooks\\long-task-hook.mjs",
  'node ".codex\\hooks\\long-task-hook.mjs"',
]);

export async function installLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
): Promise<void> {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const entry = path.join(packageRoot, "dist", "long-task-hook.js");
  if (!(await pathExists(entry))) {
    report.blocked.push("package-owned dist/long-task-hook.js is missing");
    return;
  }
  const legacyScript = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  if (await pathExists(legacyScript)) {
    await rm(legacyScript, { force: true });
    report.changed.push(".codex/hooks/long-task-hook.mjs");
  }
  const command = packageOwnedCommand(entry);
  const config = path.join(projectRoot, ".codex", "hooks.json");
  let root: Record<string, unknown> = {};
  if (await pathExists(config)) {
    try {
      root = JSON.parse(await readFile(config, "utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      report.blocked.push(".codex/hooks.json: invalid JSON");
      return;
    }
  }
  const hooks = object(root.hooks);
  root.hooks = hooks;
  for (const event of ["SessionStart", "PostCompact", "Stop"]) {
    const groups = Array.isArray(hooks[event])
      ? hooks[event]
      : [];
    const cleaned = removeManagedHookEntries(groups, command);
    cleaned.groups.push({
      hooks: [
        {
          type: "command",
          command,
          commandWindows: command,
          timeout: event === "Stop" ? 3600 : 10,
          statusMessage: MANAGED_STATUS,
        },
      ],
    });
    hooks[event] = cleaned.groups;
  }
  if (await writeIfChanged(config, `${JSON.stringify(root, null, 2)}\n`))
    report.changed.push(".codex/hooks.json");
  else report.skipped.push(".codex/hooks.json");
}

export async function uninstallLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
): Promise<void> {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const command = packageOwnedCommand(
    path.join(packageRoot, "dist", "long-task-hook.js"),
  );
  const legacyScript = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  if (await pathExists(legacyScript)) {
    await rm(legacyScript, { force: true });
    report.changed.push(".codex/hooks/long-task-hook.mjs");
  }
  const config = path.join(projectRoot, ".codex", "hooks.json");
  if (!(await pathExists(config))) return;
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(await readFile(config, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    report.skipped.push(".codex/hooks.json: invalid JSON");
    return;
  }
  const hooks = object(root.hooks);
  let changed = false;
  for (const event of ["SessionStart", "PostCompact", "Stop"]) {
    if (!Array.isArray(hooks[event])) continue;
    const cleaned = removeManagedHookEntries(hooks[event], command);
    if (cleaned.removed === 0) continue;
    changed = true;
    if (cleaned.groups.length) hooks[event] = cleaned.groups;
    else delete hooks[event];
  }
  if (!changed) return;
  root.hooks = hooks;
  if (Object.keys(hooks).length === 0 && Object.keys(root).length === 1)
    await rm(config, { force: true });
  else await writeIfChanged(config, `${JSON.stringify(root, null, 2)}\n`);
  report.changed.push(".codex/hooks.json");
}

export function packageOwnedCommand(entry: string): string {
  return `node "${path.resolve(entry).replace(/"/gu, '\\"')}"`;
}

export function removeManagedHookEntries(
  groups: unknown,
  currentPackageCommand = "",
): { groups: unknown[]; removed: number } {
  if (!Array.isArray(groups)) return { groups: [], removed: 0 };
  const retained: unknown[] = [];
  let removed = 0;
  for (const groupValue of groups) {
    if (!isObject(groupValue) || !Array.isArray(groupValue.hooks)) {
      retained.push(groupValue);
      continue;
    }
    const hooks = groupValue.hooks.filter((entry) => {
      if (!isManagedHookEntry(entry, currentPackageCommand)) return true;
      removed += 1;
      return false;
    });
    if (hooks.length > 0) {
      retained.push({ ...groupValue, hooks });
      continue;
    }
    if (Object.keys(groupValue).some((key) => key !== "hooks"))
      retained.push({ ...groupValue, hooks });
  }
  return { groups: retained, removed };
}

export function isManagedHookEntry(
  entry: unknown,
  currentPackageCommand = "",
): boolean {
  const row = object(entry);
  if (row.type !== "command") return false;
  const commands = [row.command, row.commandWindows]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  if (
    currentPackageCommand &&
    commands.some((command) => command === currentPackageCommand)
  )
    return true;
  const repoLocal = commands.some((command) =>
    LEGACY_REPO_LOCAL_COMMANDS.has(command),
  );
  if (repoLocal) return true;
  const status = String(row.statusMessage ?? "");
  return (
    LEGACY_MANAGED_STATUSES.has(status) &&
    commands.some((command) => LEGACY_REPO_LOCAL_COMMANDS.has(command))
  );
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function writeIfChanged(file: string, content: string): Promise<boolean> {
  try {
    if ((await readFile(file, "utf8")) === content) return false;
  } catch {}
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temp, content, { flag: "wx" });
  await rename(temp, file);
  return true;
}
