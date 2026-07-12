import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runLongTaskFinalGate } from "../../packages/ty-context/dist/lib/long-task-final-gate.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

async function finalWithOracle(name,body,mutate=()=>{}){
  const root=await mkdtemp(path.join(os.tmpdir(),`ltw-observation-v2-${name}-`));
  const workdir=await writeHappyV3Contract(root,(data)=>{
    const positive=data.checklist.verification_specs[0].positive_assertions[0];
    positive.expected={binding_id:"IB-002",capability:"value.read",value:"good"};
    mutate(data);
  });
  await writeFile(path.join(root,"tests/acceptance/oracle.mjs"),`console.log(${JSON.stringify(JSON.stringify(body))})\n`);
  await compileLongTaskContract(workdir,root);
  return runLongTaskFinalGate(workdir);
}
function observation(actual="good"){
  return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value:actual},artifact_refs:[]},forbidden:{kind:"scalar",actual,artifact_refs:[]}}};
}
function has(result,code){return result.findings.some((finding)=>finding.category===code);}

test("Observation V2 happy actual values are evaluated by the Harness",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"ltw-observation-v2-happy-"));
  const workdir=await writeHappyV3Contract(root);
  await compileLongTaskContract(workdir,root);
  const result=await runLongTaskFinalGate(workdir);
  assert.equal(result.workflow_status,"accepted");
});

test("Observation V1 passed true with a wrong actual is rejected instead of self-signing completion",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"ltw-observation-v1-self-sign-"));
  const workdir=await writeHappyV3Contract(root);
  await writeFile(path.join(root,"tests/acceptance/oracle.mjs"),`console.log(JSON.stringify({schema_version:"ty-context-observation-v1",checks:{works:{passed:true,actual:"wrong"},forbidden:{passed:true,actual:"forbidden"}}}))\n`);
  await compileLongTaskContract(workdir,root);
  const result=await runLongTaskFinalGate(workdir);
  assert.equal(result.workflow_status,"needs_work");
  assert.ok(has(result,"observation_protocol_invalid"));
});

test("Oracle self-signed passed fields are rejected recursively",async()=>{
  const body=observation();body.observations.forbidden.actual={passed:true};
  const result=await finalWithOracle("self-sign",body);
  assert.equal(result.workflow_status,"needs_work");
  assert.ok(has(result,"oracle_self_signed_result"));
});

test("V2 actual mismatch fails even without any Oracle status field",async()=>{
  const result=await finalWithOracle("actual-mismatch",observation("wrong"));
  assert.equal(result.workflow_status,"needs_work");
  assert.ok(has(result,"assertion_failed"));
});

test("negative assertion fails when the forbidden state is actually present",async()=>{
  const body=observation();body.observations.forbidden.actual="forbidden";const result=await finalWithOracle("negative-present",body);
  assert.equal(result.workflow_status,"needs_work");
  assert.ok(has(result,"assertion_failed"));
});

test("full-population missing objects cannot be accepted",async()=>{
  const body=observation();body.observations.population={kind:"population_coverage",actual:{enumerated_ids:["a","b"],validated_ids:["a"],exclusions:[]},artifact_refs:[]};
  const result=await finalWithOracle("population-missing",body,(data)=>{
    data.product.full_population_required=true;data.product.delivery_scope="full_population_operation";data.product.requirements[0].population_policy="full_population";
    const spec=data.checklist.verification_specs[0];spec.proof_capabilities.push("population_coverage");spec.positive_assertions.push({id:"PA-POP-001",observation_id:"population",observation_kind:"population_coverage",operator:"exists"});spec.population_enumerator={observation_id:"population",exclusion_rule_ids:[],required_coverage_percent:100};spec.claims.proof_requirement_ids.push("PRF-AC-001-POP");
    data.checklist.proof_requirements.push({id:"PRF-AC-001-POP",proof_surface:"population_coverage",obligation_refs:["PI-001-OB-001"],owner_surface_refs:["OS-RUNTIME"],verification_spec_ids:["VS-AC-001"]});data.checklist.acceptance_criteria[0].proof_requirement_refs.push("PRF-AC-001-POP");
  });
  assert.equal(result.workflow_status,"needs_work");
  assert.ok(has(result,"population_missing_objects")||has(result,"population_not_full"));
});
