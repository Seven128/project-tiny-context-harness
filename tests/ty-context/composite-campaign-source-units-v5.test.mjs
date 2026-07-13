import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertSourceUnitPacketBindingsV4 } from "../../packages/ty-context/dist/lib/composite-campaign-source-units.js";
import { parseLongTaskSources } from "../../packages/ty-context/dist/lib/long-task-contract-parser.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

test("every Source Unit maps through Requirement, PI Obligation, AC, and Verification Spec",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"source-unit-chain-"));const task=await writeHappyV3Contract(root);const bundle=await parseLongTaskSources(task);const scope=scopeWith(["SRCU-001","SRCU-002"]);const rows=[binding("SRCU-001"),binding("SRCU-002")];
  assert.deepEqual(assertSourceUnitPacketBindingsV4(scope,"SFC-001",rows,bundle),rows);
  assert.throws(()=>assertSourceUnitPacketBindingsV4(scope,"SFC-001",rows.slice(0,1),bundle),/unit_binding_missing:SRCU-002/);
  const broken=structuredClone(rows);broken[0].verification_spec_ids=["VS-UNKNOWN"];assert.throws(()=>assertSourceUnitPacketBindingsV4(scope,"SFC-001",broken,bundle),/verification_spec_unknown/);
});

function binding(source_unit_id){return{source_unit_id,requirement_ids:["PR-001"],obligation_ids:["PI-001-OB-001"],acceptance_criterion_ids:["AC-001"],verification_spec_ids:["VS-AC-001"]};}
function scopeWith(source_unit_refs){return{schema_version:"scope-fit-result-v4",request_sha256:"a".repeat(64),decision:"fit_for_three_inputs",campaign_goal:"map",granularity_contract:{unit:"control_or_capability_unit",slice_policy:"maximal_coherent_authorable_scope",parallelism_must_not_force_split:true},source_units:source_unit_refs.map((unit_id,index)=>({unit_id,kind:"cli_command",statement:unit_id,cohesion_key:"map",owner_boundary:"cli",acceptance_outcome:"map",source_refs:[`SRC-${String(index+1).padStart(3,"0")}`],details:{acceptance_evidence:"oracle"}})),global_constraints:[],slices:[{slice_id:"SFC-001",stable_key:"map",title:"Map",objective:"Map",depends_on:[],priority:1,source_refs:["SRC-001","SRC-002"],source_unit_refs,scope_summary:["map"],out_of_scope:[],separation_reasons:[],produces_contracts:[],consumes_contracts:[],conflict_domains:["map"],resource_locks:[]}],decision_required:null};}
