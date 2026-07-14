#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const input = await readStdin();
const cwd = path.resolve(input.cwd || process.cwd());
const git = gitPaths(cwd);
const root = git.worktreeRoot;
const pointer = path.join(root, ".codex", "ty-context-active-long-task.json");
const mirror = gitPath(cwd, "ty-context-active-long-task.json");
const active = await optionalJson(pointer); const mirrored = await optionalJson(mirror);
if (!active && !mirrored) output({});
if (!active || !mirrored || canonical(active) !== canonical(mirrored)) failClosed("Composite active binding was deleted, retargeted or disagrees with its repository mirror");
await validateBinding(active, git);
if (input.hook_event_name === "SessionStart" || input.hook_event_name === "PostCompact") {
  const status = await optionalJson(path.join(active.workdir, "current-status.json"));
  const findings = Array.isArray(status?.findings) ? status.findings.slice(0, 3) : [];
  output({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: `Active long-task workflow\nWorkdir: ${active.workdir}\nContract: ${active.contract_sha256}\nStatus: ${status?.workflow_status || "needs_work"}\nFindings: ${JSON.stringify(findings)}\nNext: ty-context composite-long-task verify ${JSON.stringify(active.workdir)}` } });
}
if (input.hook_event_name !== "Stop") output({});
const cli = active.verifier?.cli_path || path.join(root, "node_modules", "project-tiny-context-harness", "dist", "cli.js");
const run = spawnSync(process.execPath, [cli, "composite-long-task", "stop-check", active.workdir, "--message", input.last_assistant_message || ""], { cwd: root, encoding: "utf8", windowsHide: true });
if (run.status !== 0 || !run.stdout.trim()) output({ decision: "block", reason: `Composite completion gate failed closed: ${run.stderr || "no output"}` });
try { const result = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1)); if (!result.decision) { await rm(pointer, { force: true }); await rm(mirror, { force: true }); } output(result); } catch { output({ decision: "block", reason: "Composite completion gate returned invalid JSON" }); }

async function validateBinding(active, git) { const repositoryRoot=git.worktreeRoot; const standalone=active.campaign_id===null&&active.slice_id===null; const campaignSlice=typeof active.campaign_id==="string"&&active.campaign_id.length>0&&typeof active.slice_id==="string"&&active.slice_id.length>0; if (active.schema_version !== "active-long-task-binding-v4" || (!standalone&&!campaignSlice) || active.worktree_id!==gitWorktreeId(git.gitDir) || !samePath(active.repository_root || "",repositoryRoot) || !active.workdir || !active.contract_sha256 || !active.hook_bundle_sha256 || !active.verifier?.cli_path || !active.verifier?.cli_sha256) failClosed("Invalid long-task workflow active binding"); const actualWorkdir=await realpath(active.workdir).catch(()=>null); if (!actualWorkdir || !samePath(actualWorkdir,active.workdir) || !inside(repositoryRoot,actualWorkdir)) failClosed("Long-task workflow workdir is missing, retargeted or outside its repository"); const contract=await optionalJson(path.join(actualWorkdir,"compiled-contract.json")); if (!contract || contract.contract_sha256!==active.contract_sha256 || !samePath(contract.repository_root||"",repositoryRoot) || !samePath(contract.workdir||"",actualWorkdir)) failClosed("Long-task workflow compiled contract does not match the active binding"); const cliHash=createHash("sha256").update(await readFile(active.verifier.cli_path).catch(()=>Buffer.alloc(0))).digest("hex"); if(cliHash!==active.verifier.cli_sha256) failClosed("Long-task workflow verifier identity changed after activation"); const scriptHash=createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex"); const configHash=createHash("sha256").update(await readFile(path.join(repositoryRoot,".codex","hooks.json"))).digest("hex"); if(createHash("sha256").update(`${configHash}:${scriptHash}`).digest("hex")!==active.hook_bundle_sha256) failClosed("Long-task workflow Hook bundle changed after activation"); }
function canonical(value){if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;return JSON.stringify(value);}
function failClosed(reason){if(input.hook_event_name==="Stop")output({decision:"block",reason});output({continue:false,stopReason:reason});}
async function optionalJson(file) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return undefined; } }
function gitPaths(directory) { const lines=gitOutput(directory,["rev-parse","--path-format=absolute","--show-toplevel","--absolute-git-dir","--git-common-dir"]).split(/\r?\n/).filter(Boolean); if(lines.length!==3)throw new Error("Long-task Hook could not resolve the current Git worktree"); return {worktreeRoot:path.resolve(lines[0]),gitDir:path.resolve(lines[1]),commonDir:path.resolve(lines[2])}; }
function gitPath(directory,name) { if(!name||path.isAbsolute(name)||name.split(/[\\/]/).includes(".."))throw new Error("Long-task Hook rejected an invalid Git path"); return path.resolve(gitOutput(directory,["rev-parse","--path-format=absolute","--git-path",name])); }
function gitOutput(directory,args) { const result=spawnSync("git",args,{cwd:directory,encoding:"utf8",windowsHide:true,maxBuffer:1024*1024,timeout:10000}); if(result.status!==0||!result.stdout.trim())throw new Error("Long-task Hook requires a Git repository"); return result.stdout.trim(); }
function gitWorktreeId(gitDir) { let identity=path.resolve(gitDir).replace(/\\/g,"/"); if(process.platform==="win32")identity=identity.toLowerCase(); return createHash("sha256").update(identity).digest("hex"); }
function samePath(left,right) { const normalize=(value)=>{const resolved=path.resolve(value).replace(/\\/g,"/");return process.platform==="win32"?resolved.toLowerCase():resolved;}; return normalize(left)===normalize(right); }
function inside(root,target) { const relative=path.relative(root,target); return relative!==""&&!relative.startsWith(`..${path.sep}`)&&relative!==".."&&!path.isAbsolute(relative); }
async function readStdin() { let value = ""; for await (const chunk of process.stdin) value += chunk; return value.trim() ? JSON.parse(value) : {}; }
function output(value) { process.stdout.write(`${JSON.stringify(value)}\n`); process.exit(0); }
