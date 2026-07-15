import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { packageAssetPath } from "./paths.js";
import { pathExists } from "./fs.js";
import type { SyncReport } from "./sync-engine.js";

const MANAGED_STATUS = "Tiny Context long-task completion gate";
const COMMAND =
  'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"';
const WINDOWS =
  "powershell -NoProfile -Command \"$r=(git rev-parse --show-toplevel); node (Join-Path $r '.codex/hooks/long-task-hook.mjs')\"";
export async function installLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
): Promise<void> {
  const source = packageAssetPath("hooks", "long-task-hook.mjs");
  if (!(await pathExists(source))) {
    report.skipped.push(".codex/hooks/long-task-hook.mjs");
    return;
  }
  const script = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  await mkdir(path.dirname(script), { recursive: true });
  if (await writeIfChanged(script, await readFile(source, "utf8")))
    report.changed.push(".codex/hooks/long-task-hook.mjs");
  else report.skipped.push(".codex/hooks/long-task-hook.mjs");
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
      ? (hooks[event] as Array<Record<string, unknown>>)
      : [];
    const retained = groups.filter((group) => !containsManaged(group));
    retained.push({
      hooks: [
        {
          type: "command",
          command: COMMAND,
          commandWindows: WINDOWS,
          timeout: 3600,
          statusMessage: MANAGED_STATUS,
        },
      ],
    });
    hooks[event] = retained;
  }
  if (await writeIfChanged(config, `${JSON.stringify(root, null, 2)}\n`))
    report.changed.push(".codex/hooks.json");
  else report.skipped.push(".codex/hooks.json");
}

export async function uninstallLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
): Promise<void> {
  const script = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  const supported = packageAssetPath("hooks", "long-task-hook.mjs");
  if (await pathExists(script)) {
    if (
      (await pathExists(supported)) &&
      (await readFile(script, "utf8")) === (await readFile(supported, "utf8"))
    ) {
      await rm(script, { force: true });
      report.changed.push(".codex/hooks/long-task-hook.mjs");
    } else {
      report.skipped.push(".codex/hooks/long-task-hook.mjs: customized");
    }
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
    const previous = hooks[event] as Array<Record<string, unknown>>;
    const retained = previous.filter((group) => !containsManaged(group));
    if (retained.length === previous.length) continue;
    changed = true;
    if (retained.length) hooks[event] = retained;
    else delete hooks[event];
  }
  if (!changed) return;
  root.hooks = hooks;
  if (Object.keys(hooks).length === 0 && Object.keys(root).length === 1) {
    await rm(config, { force: true });
  } else {
    await writeIfChanged(config, `${JSON.stringify(root, null, 2)}\n`);
  }
  report.changed.push(".codex/hooks.json");
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function containsManaged(group: Record<string, unknown>): boolean {
  return (
    Array.isArray(group.hooks) &&
    group.hooks.some((hook) => object(hook).statusMessage === MANAGED_STATUS)
  );
}
async function writeIfChanged(file: string, content: string): Promise<boolean> {
  try {
    if ((await readFile(file, "utf8")) === content) return false;
  } catch {}
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temp, content, { flag: "wx" });
  await rename(temp, file);
  return true;
}
