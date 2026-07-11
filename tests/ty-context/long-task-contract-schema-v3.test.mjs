import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { COMPOSITE_V3_SCHEMAS, COMPOSITE_V3_SCHEMA_SET_SHA256, requiredRootFields } from "../../packages/ty-context/dist/lib/long-task-contract-schema-registry.js";
import { parseLongTaskSources } from "../../packages/ty-context/dist/lib/long-task-contract-parser.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const expected={
  "product-source-v3":["schema_version","product_goal","delivery_scope","full_population_required","owner_surfaces","requirements","boundaries","non_completing_outcomes","population_exclusion_rules","representative_samples_validate","representative_samples_do_not_validate","out_of_scope_backlog"],
  "technical-plan-v3":["schema_version","plan_items","counterfactual_controls"],
  "acceptance-checklist-v3":["schema_version","counterexample_fixtures","proof_requirements","acceptance_criteria","verification_specs","environment_probes"]
};

test("machine schemas are Draft 2020-12 closed authorities with the exact V3 roots",()=>{
  for(const [name,fields] of Object.entries(expected)){
    const schema=COMPOSITE_V3_SCHEMAS[name];
    assert.equal(schema.$schema,"https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.additionalProperties,false);
    assert.deepEqual(requiredRootFields(name).sort(),[...fields].sort());
  }
  assert.match(COMPOSITE_V3_SCHEMA_SET_SHA256,/^[a-f0-9]{64}$/);
});

test("nested unknown fields are rejected by the machine-schema-backed parser",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"ltw-schema-v3-"));
  const workdir=await writeHappyV3Contract(root,(data)=>{data.checklist.verification_specs[0].oracle.agent_status="complete";});
  await assert.rejects(parseLongTaskSources(workdir),/unknown field|unknown_field/);
});

test("legacy author-controlled executable and oracle_paths fields are not in Acceptance V3",()=>{
  const spec=COMPOSITE_V3_SCHEMAS["acceptance-checklist-v3"].$defs.verificationSpec.properties;
  for(const field of ["executable","argv","oracle_protocol","oracle_paths","implementation_test_paths","invalid_completion_signals"])assert.equal(field in spec,false,field);
  for(const field of ["oracle","network_policy","command_steps","positive_assertions","negative_assertions"])assert.equal(field in spec,true,field);
});

for(const [name,mutate,pattern] of [
  ["truthy forbids expected",(data)=>{const assertion=data.checklist.verification_specs[0].positive_assertions[0];assertion.operator="truthy";assertion.expected=true;},/assertion_expected_forbidden/],
  ["equals requires expected",(data)=>{delete data.checklist.verification_specs[0].positive_assertions[0].expected;},/assertion_expected_required/],
  ["regex flags are a unique closed set",(data)=>{const assertion=data.checklist.verification_specs[0].positive_assertions[0];assertion.operator="matches";assertion.expected={pattern:"good",flags:"ii"};},/source_schema_invalid/],
  ["set expected members are unique scalars",(data)=>{const assertion=data.checklist.verification_specs[0].positive_assertions[0];assertion.operator="set_equals";assertion.expected=["a","a"];},/source_schema_invalid/]
])test(name,async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"ltw-assertion-schema-"));const workdir=await writeHappyV3Contract(root,mutate);await assert.rejects(parseLongTaskSources(workdir),pattern);});
