import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertScopeFitResultV4 } from "../../packages/ty-context/dist/lib/scope-fit-v4.js";
import { validateScopeFitGraphV4 } from "../../packages/ty-context/dist/lib/composite-campaign-graph.js";
import { bindThreadGoalV5, bindThreadIdentityV5, markPacketValidationV5, markWorktreeReadyV5 } from "../../packages/ty-context/dist/lib/composite-campaign-thread-state.js";
import { applyCampaignScopeV4 } from "../../packages/ty-context/dist/lib/composite-campaign-v4.js";
import { createCampaignV5, mutateCampaignV5 } from "../../packages/ty-context/dist/lib/composite-campaign-v5.js";

const SHA="a".repeat(64);

test("same-outcome controls stay in one maximal coherent SFC",()=>{
  const scope=base([unit("SRCU-001","same","outcome"),unit("SRCU-002","same","outcome")],[slice("SFC-001",["SRCU-001","SRCU-002"],[])]);
  assert.deepEqual(validateScopeFitGraphV4(scope).topological_slice_ids,["SFC-001"]);
});

test("independent outcomes split and semantic dependencies split without parallelism deciding scope",()=>{
  const independent=base([unit("SRCU-001","one","outcome-a"),unit("SRCU-002","two","outcome-b")],[slice("SFC-001",["SRCU-001"],["independent_acceptance_outcome"]),slice("SFC-002",["SRCU-002"],["independent_acceptance_outcome"])]);
  assert.equal(validateScopeFitGraphV4(independent).topological_slice_ids.length,2);
  const dependent=base([unit("SRCU-001","same","outcome"),unit("SRCU-002","same","outcome")],[slice("SFC-001",["SRCU-001"],["semantic_dependency"]),{...slice("SFC-002",["SRCU-002"],["semantic_dependency"]),depends_on:["SFC-001"]}]);
  assert.deepEqual(validateScopeFitGraphV4(dependent).topological_slice_ids,["SFC-001","SFC-002"]);
});

test("same cohesion over-splitting and non-contract split reasons are rejected",()=>{
  const over=base([unit("SRCU-001","same","outcome"),unit("SRCU-002","same","outcome")],[slice("SFC-001",["SRCU-001"],["independent_acceptance_outcome"]),slice("SFC-002",["SRCU-002"],["independent_acceptance_outcome"])]);
  assert.throws(()=>validateScopeFitGraphV4(over),/over_split_sfc/);
  const invalid=structuredClone(over);invalid.slices[0].separation_reasons=["can_parallelize"];
  assert.throws(()=>assertScopeFitResultV4(invalid),/separation_reasons.*unsupported/);
});

test("control-level fields are required",()=>{const scope=base([unit("SRCU-001","same","outcome")],[slice("SFC-001",["SRCU-001"],[])]);delete scope.source_units[0].details.failure_state;assert.throws(()=>assertScopeFitResultV4(scope),/failure_state/);});

test("authoring_capacity_can_split_before_goal only with factual evidence and appended stable ids",()=>{
  const units=[unit("SRCU-001","same","outcome"),unit("SRCU-002","same","outcome"),unit("SRCU-003","same","outcome")];
  const previous=base(units,[slice("SFC-001",units.map(row=>row.unit_id),[])]);const reason=["authoring_capacity_exceeded"];
  const next=base(units,[capacitySlice("SFC-001",["SRCU-001","SRCU-002"],reason),capacitySlice("SFC-002",["SRCU-003"],reason)]);
  assert.equal(validateScopeFitGraphV4(next,previous).topological_slice_ids.length,2);
  const missing=structuredClone(next);delete missing.slices[1].authoring_capacity_evidence;assert.throws(()=>validateScopeFitGraphV4(missing,previous),/capacity_evidence_missing/);
  const renumbered=structuredClone(next);renumbered.slices[1].slice_id="SFC-000";renumbered.slices[1].stable_key="sfc-000";assert.throws(()=>validateScopeFitGraphV4(renumbered,previous),/new_slice_id_not_appended/);
});

test("graph_cannot_change_after_first_goal",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"scope-v4-freeze-"));git(root,["init","-b","main"]);git(root,["config","user.email","test@example.com"]);git(root,["config","user.name","Test"]);const plan="SRC-001: one outcome\n";await writeFile(path.join(root,"plan.md"),plan);git(root,["add","plan.md"]);git(root,["commit","-m","fixture"]);const created=await createCampaignV5(root,"freeze","plan.md");const request_sha256=createHash("sha256").update(plan).digest("hex");const units=[unit("SRCU-001","same","outcome"),unit("SRCU-002","same","outcome"),unit("SRCU-003","same","outcome")];
  const first={...base(units,[slice("SFC-001",units.map(row=>row.unit_id),[])]),request_sha256};const second={...base(units,[capacitySlice("SFC-001",["SRCU-001","SRCU-002"],["authoring_capacity_exceeded"]),capacitySlice("SFC-002",["SRCU-003"],["authoring_capacity_exceeded"])]),request_sha256};const third={...base(units,[capacitySlice("SFC-001",["SRCU-001"],["authoring_capacity_exceeded"]),capacitySlice("SFC-002",["SRCU-002"],["authoring_capacity_exceeded"]),capacitySlice("SFC-003",["SRCU-003"],["authoring_capacity_exceeded"])]),request_sha256};
  await publish(root,created.campaign_path,first,"first");await publish(root,created.campaign_path,second,"second");await mutateCampaignV5(root,created.campaign_path,"test_goal_started",async(_campaignRoot,campaign)=>{let state=bindThreadIdentityV5(campaign.slices["SFC-001"].thread,"thr-freeze","thr-freeze");state=markPacketValidationV5(state);state=markWorktreeReadyV5(state);campaign.slices["SFC-001"].thread=bindThreadGoalV5(state,"a".repeat(64),"goal-launch");return campaign;});await assert.rejects(()=>publish(root,created.campaign_path,third,"third"),/frozen after the first Campaign Goal/);
});

function base(source_units,slices){return{schema_version:"scope-fit-result-v4",request_sha256:SHA,decision:slices.length===1?"fit_for_three_inputs":"split_required",campaign_goal:"goal",granularity_contract:{unit:"control_or_capability_unit",slice_policy:"maximal_coherent_authorable_scope",parallelism_must_not_force_split:true},source_units,global_constraints:[],slices,decision_required:null};}
function unit(unit_id,cohesion_key,acceptance_outcome){return{unit_id,kind:"ui_control",statement:unit_id,cohesion_key,owner_boundary:"surface",acceptance_outcome,source_refs:[`SRC-${unit_id.slice(-3)}`],details:{owner_surface:"surface",route_or_location:"/route",control:"button",trigger_or_action:"click",input:"none",loading_state:"loading",empty_state:"empty",success_state:"success",failure_state:"failure",state_transition:"idle to done",observable_feedback:"message",api_or_data_dependency:"api",permission_boundary:"user",acceptance_evidence:"browser assertion"}};}
function slice(slice_id,source_unit_refs,separation_reasons){const source_refs=source_unit_refs.map(id=>`SRC-${id.slice(-3)}`);return{slice_id,stable_key:slice_id.toLowerCase(),title:slice_id,objective:slice_id,depends_on:[],priority:1,source_refs,source_unit_refs,scope_summary:[slice_id],out_of_scope:[],separation_reasons,produces_contracts:[],consumes_contracts:[],conflict_domains:[slice_id.toLowerCase()],resource_locks:[]};}
function capacitySlice(slice_id,source_unit_refs,separation_reasons){return{...slice(slice_id,source_unit_refs,separation_reasons),authoring_capacity_evidence:[{kind:"two_repairs_failed",attempts:3,evidence:"Initial structured output plus two repair turns could not preserve every Source Unit mapping."}]};}
async function publish(root,campaignPath,scope,label){const scopeFile=`${label}-scope.json`;const coverageFile=`${label}-coverage.json`;const owners=new Map();for(const slice of scope.slices)for(const sourceRef of slice.source_refs)owners.set(sourceRef,[...(owners.get(sourceRef)??[]),slice.slice_id]);const coverage={schema_version:"composite-source-coverage-v1",source_plan_sha256:scope.request_sha256,items:[...owners].map(([source_item_id,slice_refs])=>({source_item_id,statement:"outcome",disposition:"slice",slice_refs,global_constraint_refs:[],rationale:"all capacity partitions preserve the source item"})),global_constraint_bindings:[]};await writeFile(path.join(root,scopeFile),JSON.stringify(scope));await writeFile(path.join(root,coverageFile),JSON.stringify(coverage));return applyCampaignScopeV4(root,campaignPath,scopeFile,coverageFile);}
function git(root,args){const result=spawnSync("git",args,{cwd:root,encoding:"utf8"});assert.equal(result.status,0,result.stderr);}
