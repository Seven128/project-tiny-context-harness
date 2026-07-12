import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runLongTaskFinalGate } from "./long-task-test-runtime.mjs";
import { observationV2OracleScript, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

async function setup(name,mutate=()=>{}){const root=await mkdtemp(path.join(os.tmpdir(),`ltw-binding-${name}-`));const workdir=await writeHappyV3Contract(root,mutate);return {root,workdir};}
async function final(x){await compileLongTaskContract(x.workdir,x.root);return runLongTaskFinalGate(x.workdir);}
const has=(result,code)=>result.findings.some((finding)=>finding.category===code);

test("real implementation and obligation-sensitive Oracle pass every entity",async()=>{const result=await final(await setup("happy"));assert.equal(result.workflow_status,"accepted");for(const family of ["binding_results","counterfactual_results","proof_requirement_results","acceptance_criterion_results","obligation_results","plan_item_results","requirement_results"])assert.ok(Object.values(result[family]).every((value)=>typeof value==="string"?value==="passed":value.status==="passed"),family);});

test("implementation_missing_oracle_constant_success",async()=>{const x=await setup("missing");await rm(path.join(x.root,"src/value.txt"));await writeFile(path.join(x.root,"tests/acceptance/oracle.mjs"),observationV2OracleScript());const result=await final(x);assert.equal(result.workflow_status,"needs_work");assert.ok(has(result,"binding_target_missing"));});

test("implementation_path_exists_but_noop",async()=>{const x=await setup("noop");await writeFile(path.join(x.root,"src/value.txt"),"noop\n");await writeFile(path.join(x.root,"tests/acceptance/oracle.mjs"),observationV2OracleScript());const result=await final(x);assert.equal(result.workflow_status,"needs_work");assert.ok(has(result,"verifier_not_sensitive_to_obligation"));});

test("counterfactual_removed_implementation_still_passes",async()=>{const x=await setup("constant");await writeFile(path.join(x.root,"tests/acceptance/oracle.mjs"),observationV2OracleScript());const result=await final(x);assert.equal(result.workflow_status,"needs_work");assert.ok(has(result,"verifier_not_sensitive_to_obligation"));});

test("counterfactual_wrong_binding_target",async()=>{const x=await setup("wrong-target",(data)=>{const obligation=data.plan.plan_items[0].obligations[0];obligation.implementation_bindings.push({id:"IB-DECOY",kind:"file",target:"src/decoy.txt",verification:{mode:"harness_static"}});data.checklist.verification_specs[0].claims.binding_ids.push("IB-DECOY");data.plan.counterfactual_controls[0].mutation.binding_ids=["IB-DECOY"];});await writeFile(path.join(x.root,"src/decoy.txt"),"decoy\n");const result=await final(x);assert.equal(result.workflow_status,"needs_work");assert.ok(has(result,"verifier_not_sensitive_to_obligation"));});

test("binding observation must identify the exact binding target",async()=>{const x=await setup("observation-mismatch",(data)=>{data.checklist.verification_specs[0].positive_assertions[0].expected={binding_id:"IB-WRONG",capability:"value.read",value:"good"};});await writeFile(path.join(x.root,"tests/acceptance/oracle.mjs"),observationV2OracleScript("good","IB-WRONG","value.read"));const result=await final(x);assert.equal(result.workflow_status,"needs_work");assert.ok(has(result,"binding_observation_mismatch"));});
