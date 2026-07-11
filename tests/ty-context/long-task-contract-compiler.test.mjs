import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract, assertLongTaskContractFresh } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { writeHappyContract } from "./long-task-v2-fixtures.mjs";

async function compiled() { const root=await mkdtemp(path.join(os.tmpdir(),"ltw-compiler-")); const workdir=await writeHappyContract(root); return {root,workdir,contract:await compileLongTaskContract(workdir,root)}; }
test("source_changed_after_compile", async () => { const x=await compiled(); await appendFile(path.join(x.workdir,"product-architecture-source.yaml"),"# drift\n"); await assert.rejects(()=>assertLongTaskContractFresh(x.contract),/source_changed_after_compile/); });
test("context_changed_after_compile", async () => { const x=await compiled(); await appendFile(path.join(x.root,"project_context/context.toml"),"# drift\n"); await assert.rejects(()=>assertLongTaskContractFresh(x.contract),/context_changed_after_compile/); });
test("oracle_changed_after_compile", async () => { const x=await compiled(); await appendFile(path.join(x.root,"tests/acceptance/oracle.mjs"),"// drift\n"); await assert.rejects(()=>assertLongTaskContractFresh(x.contract),/oracle_changed_after_compile/); });
test("compiled_contract_rewritten", async () => { const x=await compiled(); const file=path.join(x.workdir,"compiled-contract.json"); const value=JSON.parse(await readFile(file,"utf8")); value.requirement_graph={}; await writeFile(file,JSON.stringify(value)); await assert.rejects(async()=>{ const {readCompiledLongTaskContract}=await import("../../packages/ty-context/dist/lib/long-task-contract-compiler.js"); await readCompiledLongTaskContract(x.workdir); },/integrity mismatch/); });
