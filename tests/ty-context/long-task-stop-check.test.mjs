import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { observationV2OracleScript, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runLongTaskFinalGate, stopCheckLongTask } from "./long-task-test-runtime.mjs";
// Regression identity: accepted_stop_hook_allows_exit.

test("Stop blocks before final gate, allows accepted unchanged, then blocks drift",async()=>{ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-stop-")); const workdir=await writeHappyV3Contract(root); await compileLongTaskContract(workdir,root); assert.equal((await stopCheckLongTask(workdir,"done")).decision,"block"); await runLongTaskFinalGate(workdir); assert.deepEqual(await stopCheckLongTask(workdir,"completed"),{}); await writeFile(path.join(root,"new-file.txt"),"drift"); assert.equal((await stopCheckLongTask(workdir,"completed")).decision,"block"); });
test("needs-work cannot be reported as accepted",async()=>{ const root=await mkdtemp(path.join(os.tmpdir(),"ltw-stop-needs-")); const workdir=await writeHappyV3Contract(root); await writeFile(path.join(root,"tests","acceptance","oracle.mjs"),observationV2OracleScript("wrong")); await compileLongTaskContract(workdir,root); await runLongTaskFinalGate(workdir); const result=await stopCheckLongTask(workdir,"accepted and completed"); assert.equal(result.decision,"block"); });
