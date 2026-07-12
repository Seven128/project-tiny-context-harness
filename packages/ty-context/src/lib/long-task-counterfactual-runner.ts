import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CompiledContractV3, CounterfactualControlV3 } from "./long-task-contract-schema.js";
import type { CounterfactualResultV3, LongTaskFindingV2, VerificationRunResultV2 } from "./long-task-run-result.js";
import { applyCounterfactualMutation, hashCounterfactualTree } from "./long-task-counterfactual-mutation.js";
import { executeFrozenVerificationSpecs } from "./long-task-verifier.js";

export interface CounterfactualEvaluationV3 {
  counterfactual_results: Record<string,CounterfactualResultV3>;
  findings: LongTaskFindingV2[];
}

export async function runLongTaskCounterfactuals(contract:CompiledContractV3,snapshotRoot:string,workdir:string,realRun:VerificationRunResultV2):Promise<CounterfactualEvaluationV3>{
  const counterfactual_results:Record<string,CounterfactualResultV3>={};const findings:LongTaskFindingV2[]=[];const sourceHash=await hashCounterfactualTree(snapshotRoot);
  for(const control of contract.counterfactual_controls){
    const result=await runControl(contract,control,snapshotRoot,sourceHash,workdir,realRun);
    counterfactual_results[control.id]=result;
    for(const code of result.finding_codes)findings.push(counterfactualFinding(code,result,realRun.run_id,workdir));
  }
  return {counterfactual_results,findings};
}

async function runControl(contract:CompiledContractV3,control:CounterfactualControlV3,snapshotRoot:string,sourceHash:string,workdir:string,realRun:VerificationRunResultV2):Promise<CounterfactualResultV3>{
  const obligationId=control.obligation_ids[0];const realAssertions=assertionMap(realRun);const calibration=control.expected_failed_assertion_ids.every((id)=>realAssertions[id]===true);
  if(!calibration)return result(control,obligationId,[],control.expected_failed_assertion_ids.map((id)=>({assertion_id:id,real:realAssertions[id]===true,counterfactual:false})),["counterfactual_not_calibrated"]);
  const temporary=await mkdtemp(path.join(os.tmpdir(),`ty-context-counterfactual-${safe(control.id)}-`));const counterRoot=path.join(temporary,"snapshot");
  try{
    await cp(snapshotRoot,counterRoot,{recursive:true});
    if(await hashCounterfactualTree(counterRoot)!==sourceHash)return result(control,obligationId,[],[],["counterfactual_copy_mismatch"]);
    const mutation=await applyCounterfactualMutation(contract,control,counterRoot);
    if(await hashCounterfactualTree(snapshotRoot)!==sourceHash)return result(control,obligationId,mutation.mutation_effects,[],["counterfactual_source_snapshot_changed"]);
    if(mutation.finding_codes.length)return result(control,obligationId,mutation.mutation_effects,[],mutation.finding_codes);
    const specs=contract.verification_specs.filter((spec)=>spec.claims.obligation_ids.includes(obligationId)&&control.expected_failed_assertion_ids.some((id)=>[...spec.positive_assertions,...spec.negative_assertions].some((assertion)=>assertion.id===id)));
    const owned=new Set(specs.flatMap((spec)=>[...spec.positive_assertions,...spec.negative_assertions].map((assertion)=>assertion.id)));
    if(control.expected_failed_assertion_ids.some((id)=>!owned.has(id)))return result(control,obligationId,mutation.mutation_effects,[],["counterfactual_wrong_binding_target"]);
    const runRoot=path.join(workdir,"runs",realRun.run_id,"counterfactuals",control.id);await mkdir(runRoot,{recursive:true});
    const rerun=await executeFrozenVerificationSpecs({contract,source_root:counterRoot,workdir,run_root:runRoot,spec_ids:specs.map((spec)=>spec.id)});const counterAssertions=Object.assign({},...rerun.map((spec)=>spec.assertion_results));
    const missing=control.expected_failed_assertion_ids.some((id)=>!Object.prototype.hasOwnProperty.call(counterAssertions,id));
    const flips=control.expected_failed_assertion_ids.map((id)=>({assertion_id:id,real:true,counterfactual:counterAssertions[id]===true})).sort((a,b)=>a.assertion_id.localeCompare(b.assertion_id));
    if(missing)return result(control,obligationId,mutation.mutation_effects,flips,["counterfactual_verifier_infrastructure_failed"]);
    if(flips.some((flip)=>flip.counterfactual))return result(control,obligationId,mutation.mutation_effects,flips,["verifier_not_sensitive_to_obligation"]);
    return result(control,obligationId,mutation.mutation_effects,flips,[]);
  }catch(error){return result(control,obligationId,[],[],[`counterfactual_execution_failed:${message(error)}`]);}
  finally{await rm(temporary,{recursive:true,force:true});}
}

function assertionMap(run:VerificationRunResultV2):Record<string,boolean>{return Object.assign({},...run.spec_results.map((spec)=>spec.assertion_results));}
function result(control:CounterfactualControlV3,obligationId:string,effects:CounterfactualResultV3["mutation_effects"],flips:CounterfactualResultV3["assertion_flips"],codes:string[]):CounterfactualResultV3{return {control_id:control.id,obligation_id:obligationId,status:codes.length?"failed":"passed",mutation_effects:effects,assertion_flips:flips,finding_codes:[...new Set(codes)].sort()};}
function counterfactualFinding(code:string,value:CounterfactualResultV3,runId:string,workdir:string):LongTaskFindingV2{return {category:code.split(":",1)[0],obligation_id:value.obligation_id,expected:{control_id:value.control_id,assertion_flips:"true -> false"},actual:value,evidence_path:`runs/${runId}/counterfactuals/${value.control_id}`,next_action:`Make ${value.obligation_id} verification sensitive to its declared implementation mutation`,reverify_command:`ty-context composite-long-task final-gate ${quote(workdir)}`};}
function safe(value:string):string{return value.replace(/[^A-Za-z0-9._-]/g,"-").slice(0,80);}
function quote(value:string):string{return /\s/.test(value)?JSON.stringify(value):value;}
function message(error:unknown):string{return error instanceof Error?error.message:String(error);}
