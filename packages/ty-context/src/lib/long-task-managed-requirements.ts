import path from "node:path";
import type { ManagedHostLayoutV1 } from "./long-task-managed-host-layout.js";

export interface ManagedRequirementsInspectionV1 { passed: boolean; findings: string[] }
const MANAGED_BEGIN = "# ty-context-host-gate:managed:begin";
const MANAGED_END = "# ty-context-host-gate:managed:end";

export function renderManagedRequirementsV1(layout: ManagedHostLayoutV1): string {
  const unixHook = path.posix.join(layout.unix_managed_dir.replace(/\\/gu, "/"), "long-task-hook.mjs");
  const windowsHook = path.win32.join(layout.windows_managed_dir, "long-task-hook.mjs");
  const unixCommand = `${shell(layout.unix_node_path)} ${shell(unixHook)}`;
  const windowsCommand = `${windows(layout.node_path)} ${windows(windowsHook)}`;
  return `${MANAGED_BEGIN}
allow_managed_hooks_only = true

[features]
hooks = true

[hooks]
managed_dir = ${toml(layout.unix_managed_dir)}
windows_managed_dir = ${tomlLiteral(layout.windows_managed_dir)}

[[hooks.SessionStart]]
matcher = "^(startup|resume|clear|compact)$"
[[hooks.SessionStart.hooks]]
type = "command"
command = ${toml(unixCommand)}
command_windows = ${tomlLiteral(windowsCommand)}
timeout = 10
statusMessage = "Restoring the sealed composite task"

[[hooks.PostCompact]]
matcher = "^(manual|auto)$"
[[hooks.PostCompact.hooks]]
type = "command"
command = ${toml(unixCommand)}
command_windows = ${tomlLiteral(windowsCommand)}
timeout = 10
statusMessage = "Restoring the sealed composite task"

[[hooks.Stop]]
[[hooks.Stop.hooks]]
type = "command"
command = ${toml(unixCommand)}
command_windows = ${tomlLiteral(windowsCommand)}
timeout = 21600
statusMessage = "Running sealed final acceptance"
${MANAGED_END}
`;
}

export function mergeManagedRequirementsV1(existing: string, layout: ManagedHostLayoutV1): string {
  const block = renderManagedRequirementsV1(layout).trimEnd();
  const begin = existing.indexOf(MANAGED_BEGIN); const end = existing.indexOf(MANAGED_END);
  if ((begin >= 0) !== (end >= 0) || (begin >= 0 && end < begin)) throw new Error("managed_requirements_owned_block_corrupt");
  if (begin >= 0) {
    const after = end + MANAGED_END.length;
    const outside = `${existing.slice(0, begin)}${existing.slice(after)}`;
    assertNoConflictingManagedKeys(outside);
    return `${existing.slice(0, begin)}${block}${existing.slice(after)}`.replace(/\s*$/u, "\n");
  }
  assertNoConflictingManagedKeys(existing);
  const prefix = existing.trimEnd();
  return `${prefix ? `${prefix}\n\n` : ""}${block}\n`;
}

export function removeManagedRequirementsV1(existing:string):string{const begin=existing.indexOf(MANAGED_BEGIN);const end=existing.indexOf(MANAGED_END);if((begin>=0)!==(end>=0)||(begin>=0&&end<begin))throw new Error("managed_requirements_owned_block_corrupt");if(begin<0)return existing;const value=`${existing.slice(0,begin)}${existing.slice(end+MANAGED_END.length)}`.replace(/\n{3,}/gu,"\n\n").trim();return value?`${value}\n`:"";}

export function inspectManagedRequirementsV1(content: string, layout: ManagedHostLayoutV1): ManagedRequirementsInspectionV1 {
  const findings: string[] = [];
  if (!/^allow_managed_hooks_only\s*=\s*true\s*$/mu.test(content)) findings.push("managed_hooks_not_exclusive");
  if (!/\[features\][\s\S]*?^hooks\s*=\s*true\s*$/mu.test(content)) findings.push("managed_hooks_not_forced");
  if (!hasAssignment(content, "managed_dir", layout.unix_managed_dir) || !hasAssignment(content, "windows_managed_dir", layout.windows_managed_dir)) findings.push("managed_hook_directory_mismatch");
  for (const event of ["SessionStart", "PostCompact", "Stop"]) if (!content.includes(`[[hooks.${event}]]`) || !content.includes(`[[hooks.${event}.hooks]]`)) findings.push(`managed_hook_event_missing:${event}`);
  if (!content.includes("timeout = 21600")) findings.push("managed_stop_timeout_invalid");
  if (/\.codex[\\/]hooks|git rev-parse/iu.test(content)) findings.push("repo_hook_fallback_forbidden");
  const expected = renderManagedRequirementsV1(layout);
  const begin = content.indexOf(MANAGED_BEGIN); const end = content.indexOf(MANAGED_END);
  if (begin < 0 || end < begin) findings.push("managed_requirements_owned_block_missing");
  else {
    const after = end + MANAGED_END.length;
    if (`${content.slice(begin, after)}\n` !== expected) findings.push("managed_requirements_not_canonical");
    try { assertNoConflictingManagedKeys(`${content.slice(0, begin)}${content.slice(after)}`); } catch { findings.push("managed_requirements_conflict"); }
  }
  return { passed: findings.length === 0, findings };
}

function assertNoConflictingManagedKeys(content: string): void {
  const meaningful = content.split(/\r?\n/u).map((line) => line.replace(/\s+#.*$/u, "").trim()).filter(Boolean);
  if (meaningful.some((line) => /^allow_managed_hooks_only\s*=|^\[features\]$|^\[hooks\]$|^\[\[hooks\./u.test(line))) throw new Error("managed_requirements_conflict");
}

function hasAssignment(content: string, key: string, value: string): boolean {
  return content.split(/\r?\n/u).some((line) => line.trim() === `${key} = ${toml(value)}` || line.trim() === `${key} = ${tomlLiteral(value)}`);
}
function toml(value: string): string { return JSON.stringify(value); }
function tomlLiteral(value: string): string { if (value.includes("'")) throw new Error("managed_path_contains_toml_quote"); return `'${value}'`; }
function shell(value: string): string { return `"${value.replace(/(["\\$`])/gu, "\\$1")}"`; }
function windows(value: string): string { return `"${value.replace(/"/gu, '\\"')}"`; }
