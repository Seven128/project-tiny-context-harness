#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const input = await readStdin();
const root = path.resolve(gitOutput(path.resolve(input.cwd || process.cwd()), ["rev-parse", "--show-toplevel"]));
const pointer = path.join(root, ".codex", "ty-context-active-long-task.json");
const active = await optionalJson(pointer);
if (!active) output({});
await validateBinding(active, root);
const authority = authorityView(active);

if (input.hook_event_name === "SessionStart" || input.hook_event_name === "PostCompact") {
  output({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: [
        "Active Single-Goal Long-Task Workflow",
        authority.workdirLabel,
        authority.identityLabel,
        authority.resumeLabel,
      ].join("\n"),
    },
  });
}
if (input.hook_event_name !== "Stop") output({});

const cli = path.join(active.verifier_identity.package_root, "dist", "cli.js");
const run = spawnSync(
  process.execPath,
  [
    cli,
    authority.command,
    "stop-check",
    authority.workdir,
    "--message",
    input.last_assistant_message || "",
  ],
  { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000 },
);
if (!run.stdout?.trim())
  output({ decision: "block", reason: `Long-task completion gate failed closed: ${run.stderr || "no output"}` });
try {
  const result = JSON.parse(run.stdout.trim().split(/\r?\n/u).at(-1));
  if (result.continue === true) output({});
  output({ decision: "block", reason: result.message || result.reason || "Long-task result is not fresh and accepted." });
} catch {
  output({ decision: "block", reason: "Long-task completion gate returned invalid JSON." });
}

async function validateBinding(active, root) {
  const view = authorityView(active);
  const commonValid =
    active.schema_version === "active-long-task-binding-v1" &&
    samePath(active.repository_root || "", root) &&
    active.verifier_identity?.package_root &&
    active.verifier_identity?.bundle_sha256 &&
    active.verifier_identity?.bundle_files;
  if (!commonValid || !view.valid) failClosed("Invalid long-task active binding.");
  const authorityWorkdir = view.workdir;
  const workdir = await realpath(authorityWorkdir).catch(() => null);
  if (!workdir || !samePath(workdir, authorityWorkdir) || !inside(root, workdir))
    failClosed("Long-task workdir is missing, retargeted or outside the repository.");
  const compiled = await optionalJson(
    path.join(
      workdir,
      ".ty-context",
      view.compiledFile,
    ),
  );
  if (
    !compiled ||
    compiled?.[view.compiledIdentityField] !== view.compiledIdentity ||
    !samePath(compiled.repository_root || "", root) ||
    !samePath(
      compiled?.[view.compiledWorkdirField] || "",
      workdir,
    )
  ) failClosed("Compiled delivery authority does not match the active binding.");
  const files = {};
  for (const [relative, expected] of Object.entries(active.verifier_identity.bundle_files)) {
    const file = path.join(active.verifier_identity.package_root, "dist", ...relative.split("/"));
    const bytes = await readFile(file).catch(() => Buffer.alloc(0));
    files[relative] = hash(bytes);
    if (files[relative] !== expected)
      failClosed("Long-task verifier identity changed after activation.");
  }
  if (hash(canonical(files)) !== active.verifier_identity.bundle_sha256)
    failClosed("Long-task verifier bundle identity changed after activation.");
}

function authorityView(active) {
  if (active.mode === "delivery_set")
    return {
      valid:
        typeof active.set_workdir === "string" &&
        typeof active.compiled_set_identity === "string" &&
        Boolean(active.registered_child_contracts),
      command: "delivery-set",
      workdir: active.set_workdir,
      compiledIdentity: active.compiled_set_identity,
      compiledIdentityField: "compiled_set_identity",
      compiledWorkdirField: "set_workdir",
      compiledFile: "compiled-delivery-set.json",
      workdirLabel: `Set workdir: ${active.set_workdir}`,
      identityLabel: `Delivery Set identity: ${active.compiled_set_identity}`,
      resumeLabel: `Resume: ty-context delivery-set resume ${JSON.stringify(active.set_workdir)}`,
    };
  return {
    valid:
      typeof active.workdir === "string" &&
      typeof active.task_id === "string" &&
      typeof active.compiled_identity === "string",
    command: "long-task",
    workdir: active.workdir,
    compiledIdentity: active.compiled_identity,
    compiledIdentityField: "compiled_identity",
    compiledWorkdirField: "workdir",
    compiledFile: "compiled-contract.json",
    workdirLabel: `Workdir: ${active.workdir}`,
    identityLabel: `Task: ${active.task_id}`,
    resumeLabel: `Compiled identity: ${active.compiled_identity}\nResume: ty-context long-task resume ${JSON.stringify(active.workdir)}`,
  };
}

function failClosed(reason) {
  if (input.hook_event_name === "Stop") output({ decision: "block", reason });
  output({ continue: false, stopReason: reason });
}
async function optionalJson(file) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return undefined; } }
function gitOutput(directory, args) {
  const result = spawnSync("git", args, { cwd: directory, encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000 });
  if (result.status !== 0 || !result.stdout.trim()) throw new Error("Long-task Hook requires a Git repository.");
  return result.stdout.trim();
}
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.resolve(value).replace(/\\/gu, "/");
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value.trim() ? JSON.parse(value) : {};
}
function output(value) { process.stdout.write(`${JSON.stringify(value)}\n`); process.exit(0); }
