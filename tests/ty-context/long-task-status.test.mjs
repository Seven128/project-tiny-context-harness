import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeLongTaskStatus, readLongTaskStatus } from "../../packages/ty-context/dist/lib/long-task-status.js";
test("current status is verifier-derived and atomic",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"ltw-status-"));const run={contract_sha256:"a",run_id:"RUN-1",verification_scope:"targeted_repair",acceptance_authorized:false,findings:[],spec_results:[{status:"passed"}]};const status=await writeLongTaskStatus(dir,run);assert.equal(status.workflow_status,"needs_work");assert.equal((await readLongTaskStatus(dir)).latest_run_id,"RUN-1");assert.doesNotMatch(await readFile(path.join(dir,"current-status.json"),"utf8"),/requirement_status|ac_status|plan_item_status/);});
test("blocked verification remains internal needs_work",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"ltw-status-"));const run={contract_sha256:"a",run_id:"RUN-2",verification_scope:"impact_repair",acceptance_authorized:false,findings:[],spec_results:[{status:"blocked"}]};assert.equal((await writeLongTaskStatus(dir,run)).workflow_status,"needs_work");});
