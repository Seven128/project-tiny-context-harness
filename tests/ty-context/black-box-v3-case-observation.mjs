import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createBlackBoxRuntime, findingCodes, parseFinal, parseStatus } from "./black-box-v3-runtime.mjs";

export const observationCaseHandlers = new Map();

observationCaseHandlers.set("observation_v1_rejected",async(row,t)=>{
  const runtime=await fixture(row,t,{oracle:`export async function observe(){return {schema_version:"ty-context-observation-v1",checks:{works:{passed:true,actual:"wrong"}}};}\n`});
  const compiled=await runtime.cli("compile");if(compiled.status!==0)return commandFailure(compiled);
  const command=await runtime.cli("verify");const status=await parseStatus(runtime);return {status:"needs_work",code:pick(row,findingCodes(status)),command_status:command.status,raw:JSON.stringify(status)};
});

for(const id of ["implementation_missing_oracle_constant_success","implementation_binding_missing"]){observationCaseHandlers.set(id,async(row,t)=>{
  const runtime=await fixture(row,t,{mutate:id==="implementation_binding_missing"?(data)=>{data.plan.plan_items[0].obligations[0].implementation_bindings[0].target="src/missing.txt";}:undefined,prepare:id==="implementation_missing_oracle_constant_success"?async(value)=>{await rm(value.path("src/value.txt"));}:undefined,oracle:oracle(observations("good"))});
  return finalOutcome(row,runtime);
});}

for(const id of ["binding_present_but_behavior_noop","counterfactual_removed_implementation_still_passes","counterfactual_still_passes"]){observationCaseHandlers.set(id,async(row,t)=>{
  const runtime=await fixture(row,t,{prepare:id==="binding_present_but_behavior_noop"?async(value)=>{await writeFile(value.path("src/value.txt"),"noop\n");}:undefined,oracle:oracle(observations("good"))});
  return finalOutcome(row,runtime);
});}

observationCaseHandlers.set("oracle_actual_mismatch",async(row,t)=>finalOutcome(row,await fixture(row,t,{oracle:oracle(observations("wrong"))})));
observationCaseHandlers.set("oracle_forbidden_actual_present",async(row,t)=>{const value=observations("good");value.observations.forbidden.actual="forbidden";return finalOutcome(row,await fixture(row,t,{oracle:oracle(value)}));});
observationCaseHandlers.set("negative_assertion_actual_is_forbidden",observationCaseHandlers.get("oracle_forbidden_actual_present"));
observationCaseHandlers.set("oracle_self_signed_passed",async(row,t)=>{const value=observations("good");value.observations.forbidden.actual={passed:true};return finalOutcome(row,await fixture(row,t,{oracle:oracle(value)}));});
observationCaseHandlers.set("oracle_passed_true_actual_wrong",async(row,t)=>{const value=observations("wrong");value.observations.works.passed=true;return finalOutcome(row,await fixture(row,t,{oracle:oracle(value)}));});
observationCaseHandlers.set("oracle_contains_passed_field",async(row,t)=>{const value=observations("good");value.observations.works.actual={binding_id:"IB-002",capability:"value.read",value:"good",nested:{passed:true}};return finalOutcome(row,await fixture(row,t,{oracle:oracle(value)}));});

for(const [id,population] of Object.entries({
  population_partial_claimed_complete:{enumerated_ids:["a","b"],validated_ids:["a"],exclusions:[]},
  population_one_of_one_hundred:{enumerated_ids:Array.from({length:100},(_,index)=>`id-${index+1}`),validated_ids:["id-1"],exclusions:[]},
  population_unknown_exclusion:{enumerated_ids:["a"],validated_ids:[],exclusions:[{id:"missing",rule_id:"EXCLUSION-001"}]},
  population_duplicate_ids:{enumerated_ids:["a","a"],validated_ids:["a"],exclusions:[]}
})) observationCaseHandlers.set(id,async(row,t)=>{
  const value=observations("good");value.observations.population={kind:"population_coverage",actual:population,artifact_refs:[]};
  return finalOutcome(row,await fixture(row,t,{mutate:populationContract,oracle:oracle(value)}));
});

observationCaseHandlers.set("counterfactual_wrong_binding_target",async(row,t)=>{
  const runtime=await fixture(row,t,{mutate(data){const obligation=data.plan.plan_items[0].obligations[0];obligation.implementation_bindings.push({id:"IB-DECOY",kind:"file",target:"src/decoy.txt",verification:{mode:"harness_static"}});data.checklist.verification_specs[0].claims.binding_ids.push("IB-DECOY");data.plan.counterfactual_controls[0].mutation.binding_ids=["IB-DECOY"];},prepare:async(value)=>{await value.write("src/decoy.txt","decoy\n");}});
  return finalOutcome(row,runtime);
});

async function fixture(row,t,options={}){return createBlackBoxRuntime(row,t,{mutate:options.mutate,prepare:async(runtime)=>{if(options.prepare)await options.prepare(runtime);if(options.oracle)await writeFile(path.join(runtime.repository,"tests","acceptance","oracle.mjs"),options.oracle);await runtime.commit();}});}
async function finalOutcome(row,runtime){const compiled=await runtime.cli("compile");if(compiled.status!==0)return commandFailure(compiled);const command=await runtime.cli("final-gate",[],{timeout_ms:240_000});const payload=await parseFinal(runtime);const codes=findingCodes(payload);return {status:payload.workflow_status==="externally_blocked"?"blocked":payload.workflow_status,code:pick(row,codes),command_status:command.status,raw:JSON.stringify(payload)};}
function pick(row,codes){return codes.has(row.expected_code)?row.expected_code:[...codes][0]??(row.expected_status==="accepted"?"ok":"missing_finding");}
function commandFailure(value){return {status:"compile_rejected",code:firstCode(`${value.stdout}\n${value.stderr}`),command_status:value.status,raw:`${value.stdout}\n${value.stderr}`};}
function firstCode(text){return text.match(/\b[a-z][a-z0-9_]{2,}\b/u)?.[0]??"unknown_error";}
function oracle(value){return `export async function observe(){return ${JSON.stringify(value)};}\n`;}
function observations(value){return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}};}
function populationContract(data){data.product.full_population_required=true;data.product.delivery_scope="full_population_operation";data.product.requirements[0].population_policy="full_population";data.product.population_exclusion_rules=[{id:"EXCLUSION-001",rule:"Exclude unavailable object",requirement_refs:["PR-001"]}];const spec=data.checklist.verification_specs[0];spec.proof_capabilities.push("population_coverage");spec.positive_assertions.push({id:"PA-POP-001",observation_id:"population",observation_kind:"population_coverage",operator:"exists"});spec.population_enumerator={observation_id:"population",exclusion_rule_ids:["EXCLUSION-001"],required_coverage_percent:100};spec.claims.proof_requirement_ids.push("PRF-AC-001-POP");data.checklist.proof_requirements.push({id:"PRF-AC-001-POP",proof_surface:"population_coverage",obligation_refs:["PI-001-OB-001"],owner_surface_refs:["OS-RUNTIME"],verification_spec_ids:["VS-AC-001"]});data.checklist.acceptance_criteria[0].proof_requirement_refs.push("PRF-AC-001-POP");}
