import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { observationV2OracleScript, runCompositeCompile, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { readCompiledLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { writeLongTaskFinalAuthority } from "../../packages/ty-context/dist/lib/long-task-final-receipt.js";
import { runLongTaskFinalGate } from "../../packages/ty-context/dist/lib/long-task-final-gate.js";
import { stopCheckLongTask } from "../../packages/ty-context/dist/lib/long-task-stop-check.js";
// Regression identity: accepted_stop_hook_allows_exit.

test("Stop validates the accepted result without rerunning final, then blocks drift",async()=>{ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-stop-")); const workdir=await writeHappyV3Contract(root); await compileLongTaskContract(workdir,root); assert.equal((await stopCheckLongTask(workdir,"done")).decision,"block"); await runLongTaskFinalGate(workdir); const finalBefore=await readFile(path.join(workdir,"final-result.json"),"utf8");const runsBefore=await readdir(path.join(workdir,"runs")); assert.deepEqual(await stopCheckLongTask(workdir,"completed"),{}); assert.equal(await readFile(path.join(workdir,"final-result.json"),"utf8"),finalBefore);assert.deepEqual(await readdir(path.join(workdir,"runs")),runsBefore); await writeFile(path.join(root,"new-file.txt"),"drift"); assert.equal((await stopCheckLongTask(workdir,"completed")).decision,"block"); });
test("needs-work cannot be reported as accepted",async()=>{ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-stop-needs-")); const workdir=await writeHappyV3Contract(root); await writeFile(path.join(root,"tests","acceptance","oracle.mjs"),observationV2OracleScript("wrong")); await compileLongTaskContract(workdir,root); await runLongTaskFinalGate(workdir); const result=await stopCheckLongTask(workdir,"accepted and completed"); assert.equal(result.decision,"block"); });
test("active and final project receipts remain outside worktree cleanliness",async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"ltw-receipt-clean-"));const workdir=await writeHappyV3Contract(root);await appendFile(path.join(root,".git","info","exclude"),"\n/task/\n","utf8");const compiled=runCompositeCompile(root,workdir);assert.equal(compiled.status,0,compiled.stderr);const contract=await readCompiledLongTaskContract(workdir);await writeLongTaskFinalAuthority(contract,workdir,{run_id:"FINAL-CLEAN",workflow_status:"accepted",final_snapshot_sha256:"a".repeat(64)});const status=spawnSync("git",["status","--porcelain=v1","--untracked-files=all"],{cwd:root,encoding:"utf8",windowsHide:true});assert.equal(status.status,0,status.stderr);assert.equal(status.stdout.trim(),"");assert.equal(JSON.parse(await readFile(path.join(root,".codex","ty-context-final-result-receipt.json"),"utf8")).workflow_status,"accepted");});
