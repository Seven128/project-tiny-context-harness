import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blackBoxV3CaseHandlers, registeredBlackBoxV3CaseIds } from "./black-box-v3-cases.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const manifest=JSON.parse(await readFile(path.join(repo,"tests","ty-context","fixtures","composite-long-task-v3","manifest.json"),"utf8"));
const enabled=!!process.env.TY_CONTEXT_BLACK_BOX_CANDIDATE_TARBALL&&!!process.env.TY_CONTEXT_MANAGED_HOST_READY;
assert.deepEqual(registeredBlackBoxV3CaseIds,manifest.cases.map((row)=>row.id).sort(),"structured registrations must exactly equal the manifest");

for(const row of manifest.cases)test(row.test_name,{skip:enabled?false:"explicit candidate tarball and managed Host are required",timeout:12*60_000},async(t)=>{
  const handler=blackBoxV3CaseHandlers.get(row.id);assert.ok(handler,`missing structured handler: ${row.id}`);
  const actual=await handler(row,t);assert.equal(actual.status,row.expected_status,`${row.id}: ${actual.raw}`);assert.equal(actual.code,row.expected_code,`${row.id}: ${actual.raw}`);
  if(["compile_rejected","needs_work","blocked"].includes(row.expected_status))assert.doesNotMatch(actual.raw,/"workflow_status"\s*:\s*"accepted"/u,`${row.id} emitted accepted`);
});
