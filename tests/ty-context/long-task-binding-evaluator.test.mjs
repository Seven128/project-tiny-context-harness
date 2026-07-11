import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLongTaskBindings } from "../../packages/ty-context/dist/lib/long-task-binding-evaluator.js";

const bindings=[
  {id:"IB-FILE",kind:"file",target:"src/value.txt",verification:{mode:"harness_static"}},
  {id:"IB-GLOB",kind:"path_glob",target:"src/**/*.ts",verification:{mode:"harness_static"}},
  {id:"IB-SYMBOL",kind:"symbol",target:"src/value.ts#read",verification:{mode:"oracle_observation",spec_id:"VS-SYMBOL",observation_id:"symbol"}},
  {id:"IB-SCHEMA",kind:"schema",target:"schema/value.json#/properties/value",verification:{mode:"oracle_observation",spec_id:"VS-SCHEMA",observation_id:"schema"}},
  {id:"IB-RUNTIME",kind:"runtime_capability",target:"value.read",verification:{mode:"oracle_observation",spec_id:"VS-RUNTIME",observation_id:"runtime"}},
  {id:"IB-ROUTE",kind:"route",target:"/value",verification:{mode:"oracle_observation",spec_id:"VS-ROUTE",observation_id:"route"}}
];
const observations={
  "VS-SYMBOL":{symbol:{kind:"implementation_structure",actual:{binding_id:"IB-SYMBOL",target:"src/value.ts#read",observed:true,descriptor:{kind:"function"}},artifact_refs:[]}},
  "VS-SCHEMA":{schema:{kind:"implementation_structure",actual:{binding_id:"IB-SCHEMA",target:"schema/value.json#/properties/value",observed:true,descriptor:{pointer:"/properties/value",value:{type:"string"}}},artifact_refs:[]}},
  "VS-RUNTIME":{runtime:{kind:"runtime_behavior",actual:{binding_id:"IB-RUNTIME",capability:"value.read",value:"good"},artifact_refs:[]}},
  "VS-ROUTE":{route:{kind:"browser_interaction",actual:{binding_id:"IB-ROUTE",owner_surface_id:"OS-WEB",route:"/value",action:"read",feedback:"good-visible",trace_artifact:"trace.zip"},artifact_refs:["trace.zip"]}}
};
function fixture(){
  const specs=Object.keys(observations).map((id)=>({id,positive_assertions:[{id:`PA-${id}`,observation_id:Object.keys(observations[id])[0]}]}));
  const run={run_id:"RUN-BIND",spec_results:specs.map((spec)=>({spec_id:spec.id,status:"passed",assertion_results:{[`PA-${spec.id}`]:true},population_results:{},observations:observations[spec.id],findings:[]}))};
  const contract={bindings,verification_specs:specs,obligations:[{id:"PI-001-OB-001",source_requirement_ids:["PR-001"],implementation_bindings:bindings}],requirements:[{id:"PR-001",owner_surface_refs:["OS-WEB"]}],owner_surfaces:[{id:"OS-WEB",kind:"web",location:"/value",primary_action:"read",expected_feedback:"good-visible"}],graphs:{obligations:{"PI-001-OB-001":{requirement_ids:["PR-001"]}}}};
  const snapshot={files:[{path:"src/value.txt",type:"file",mode:33188,size:5,sha256:"a"},{path:"src/nested/value.ts",type:"file",mode:33188,size:5,sha256:"b"}]};
  return {contract,run,snapshot};
}

test("binding evaluator observes every static and semantic binding exactly",()=>{const x=fixture();const value=evaluateLongTaskBindings(x.contract,x.snapshot,x.run,"task");assert.deepEqual(Object.fromEntries(Object.entries(value.binding_results).map(([id,result])=>[id,result.status])),Object.fromEntries(bindings.map((binding)=>[binding.id,"passed"])));assert.equal(value.findings.length,0);});
test("binding evaluator distinguishes missing, unobservable, semantic, and owner mismatch",()=>{const x=fixture();x.snapshot.files=[];delete x.run.spec_results.find((item)=>item.spec_id==="VS-SYMBOL").observations.symbol;x.run.spec_results.find((item)=>item.spec_id==="VS-RUNTIME").observations.runtime.actual.binding_id="IB-WRONG";x.run.spec_results.find((item)=>item.spec_id==="VS-ROUTE").observations.route.actual.owner_surface_id="OS-WRONG";const value=evaluateLongTaskBindings(x.contract,x.snapshot,x.run,"task");assert.equal(value.binding_results["IB-FILE"].status,"failed");assert.equal(value.binding_results["IB-SYMBOL"].status,"unobservable");assert.deepEqual(new Set(value.findings.map((item)=>item.category)),new Set(["binding_target_missing","binding_unobservable","binding_observation_mismatch","binding_owner_surface_mismatch"]));});
