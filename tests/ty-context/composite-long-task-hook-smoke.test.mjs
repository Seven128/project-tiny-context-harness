import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkLongTaskHostGate } from "../../packages/ty-context/dist/lib/long-task-hook-preflight.js";

const hash=(v)=>createHash("sha256").update(v).digest("hex");
async function host(){const root=await mkdtemp(path.join(os.tmpdir(),"ltw-smoke-"));await mkdir(path.join(root,".codex/hooks"),{recursive:true});await mkdir(path.join(root,"packages/ty-context/dist"),{recursive:true});const cli=path.join(root,"packages/ty-context/dist/cli.js");await writeFile(cli,"console.log('cli')\n");const script="console.log('{}')\n";const handler={hooks:[{type:"command",command:"node .codex/hooks/long-task-hook.mjs"}]};const config=JSON.stringify({hooks:{SessionStart:[handler],PostCompact:[handler],Stop:[handler]}},null,2)+"\n";await writeFile(path.join(root,".codex/hooks/long-task-hook.mjs"),script);await writeFile(path.join(root,".codex/hooks.json"),config);const scriptHash=hash(script),configHash=hash(config);await writeFile(path.join(root,".codex/ty-context-long-task-hook-heartbeat.json"),JSON.stringify({repository_root:root,hook_sha256:scriptHash,bundle_sha256:hash(`${configHash}:${scriptHash}`),verifier_cli_path:cli,verifier_cli_sha256:hash(await readFile(cli)),verifier_drift_observed:false,events:{Stop:new Date().toISOString()}}));return root;}
test("valid trusted Hook bundle is available",async()=>assert.equal((await checkLongTaskHostGate(await host())).status,"available"));
test("modified Hook is unavailable",async()=>{const root=await host();await writeFile(path.join(root,".codex/hooks/long-task-hook.mjs"),"modified\n");assert.equal((await checkLongTaskHostGate(root)).status,"host_completion_gate_unavailable");});
test("wrong repository heartbeat is unavailable",async()=>{const root=await host();const file=path.join(root,".codex/ty-context-long-task-hook-heartbeat.json");const h=JSON.parse(await readFile(file));h.repository_root=os.tmpdir();await writeFile(file,JSON.stringify(h));assert.equal((await checkLongTaskHostGate(root)).status,"host_completion_gate_unavailable");});
test("conflicting_stop_hook_continue_false is unavailable",async()=>{const root=await host();const file=path.join(root,".codex/hooks.json");const c=JSON.parse(await readFile(file));c.hooks.Stop.unshift({continue:false});await writeFile(file,JSON.stringify(c));const result=await checkLongTaskHostGate(root);assert.ok(result.findings.includes("conflicting_stop_hook_continue_false"));});
test("compiler_replaced_then_recompiled is unavailable under the original trust heartbeat",async()=>{const root=await host();await writeFile(path.join(root,"packages/ty-context/dist/cli.js"),"console.log('replaced')\n");const result=await checkLongTaskHostGate(root);assert.ok(result.findings.includes("trusted_verifier_cli_hash_mismatch"));});
