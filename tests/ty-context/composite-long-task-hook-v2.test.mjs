import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLongTaskHostGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=path.join(repoRoot,".codex/ty-context-managed/hooks/long-task-hook.mjs");
const hookSource=readFileSync(source);
// Regression identity: ordinary_question_hook_noop.
test("ordinary hook invocation is a no-op and produces trusted Stop heartbeat",async()=>{ const root=await repo(); const result=runHook(root,{hook_event_name:"Stop",cwd:root,last_assistant_message:"ordinary answer"}); assert.deepEqual(result,{}); const heartbeat=JSON.parse(await readFile(path.join(root,".codex","ty-context-long-task-hook-heartbeat.json"),"utf8")); assert.equal(heartbeat.repository_root,root); assert.ok(heartbeat.events.Stop); assert.equal((await checkLongTaskHostGate(root)).status,"available"); });
test("missing Hook capability fails closed",async()=>{ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-hook-missing-")); assert.equal((await checkLongTaskHostGate(root)).status,"host_completion_gate_unavailable"); });
test("Stop delegates the real last assistant message to the trusted gate",async()=>{ const root=await repo(); const cli=path.join(root,"fake-cli.mjs"); await writeFile(cli,`console.log(JSON.stringify(process.argv.includes("DONE")?{decision:"block",reason:"continue"}:{}))\n`); const workdir=path.join(root,"task"); await mkdir(workdir); const config=await readFile(path.join(root,".codex","hooks.json")); const script=await readFile(path.join(root,".codex","hooks","long-task-hook.mjs")); const hash=(v)=>createHash("sha256").update(v).digest("hex"); const contractHash="a".repeat(64); await writeFile(path.join(workdir,"compiled-contract.json"),JSON.stringify({repository_root:root,workdir,contract_sha256:contractHash})); const active={schema_version:"active-long-task-binding-v2",repository_root:root,workdir,contract_sha256:contractHash,hook_bundle_sha256:hash(`${hash(config)}:${hash(script)}`),verifier:{cli_path:cli,cli_sha256:hash(await readFile(cli))}}; await writeFile(path.join(root,".codex","ty-context-active-long-task.json"),JSON.stringify(active)); await writeFile(path.join(root,".git","ty-context-active-long-task.json"),JSON.stringify(active)); assert.deepEqual(runHook(root,{hook_event_name:"Stop",cwd:root,last_assistant_message:"DONE"}),{decision:"block",reason:"continue"}); });
test("active_pointer_deleted_or_retargeted",async()=>{const root=await repo();await writeFile(path.join(root,".git","ty-context-active-long-task.json"),JSON.stringify({repository_root:root}));const result=runHook(root,{hook_event_name:"Stop",cwd:root});assert.equal(result.decision,"block");});
async function repo(){ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-hook-")); spawnSync("git",["init","-q"],{cwd:root}); await mkdir(path.join(root,".codex","hooks"),{recursive:true}); await mkdir(path.join(root,"packages/ty-context/dist"),{recursive:true}); await writeFile(path.join(root,"packages/ty-context/dist/cli.js"),"console.log('{}')\n"); await writeFile(path.join(root,".codex","hooks","long-task-hook.mjs"),hookSource); await writeConfig(root); return root; }
function runHook(root,input){ const result=spawnSync(process.execPath,[path.join(root,".codex","hooks","long-task-hook.mjs")],{cwd:root,input:JSON.stringify(input),encoding:"utf8"}); assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout.trim()); }
async function writeConfig(root){ const handler={type:"command",command:'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"'}; await writeFile(path.join(root,".codex","hooks.json"),JSON.stringify({hooks:{SessionStart:[{hooks:[handler]}],PostCompact:[{hooks:[handler]}],Stop:[{hooks:[handler]}]}})); }
