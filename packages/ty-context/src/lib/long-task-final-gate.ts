import path from "node:path";
import { readCompiledLongTaskContract, assertLongTaskContractFresh } from "./long-task-contract-compiler.js";
import { createLongTaskSnapshot, hashLongTaskWorkspace } from "./long-task-snapshot.js";
import { verifyLongTask } from "./long-task-verifier.js";
import { evaluateLongTaskBindings } from "./long-task-binding-evaluator.js";
import { runLongTaskCounterfactuals } from "./long-task-counterfactual-runner.js";
import { projectLongTaskEntities } from "./long-task-entity-projector.js";
import { atomic } from "./long-task-status.js";
import type { FinalResultV2, LongTaskEntityResultV3, LongTaskFindingV2 } from "./long-task-run-result.js";
import { classifyExternalBlocker } from "./long-task-external-blocker.js";

export async function runLongTaskFinalGate(workdir:string):Promise<FinalResultV2>{
  const contract=await readCompiledLongTaskContract(workdir);await assertLongTaskContractFresh(contract);
  const runId=`FINAL-${new Date().toISOString().replace(/[-:.TZ]/g,"")}-${process.pid}-${contract.contract_sha256.slice(0,8)}`;
  const snapshot=await createLongTaskSnapshot(contract.repository_root,contract,runId);const before=snapshot.manifest.snapshot_sha256;
  try{
    const run=await verifyLongTask(workdir,contract.verification_specs.map((spec)=>spec.id),{contract,snapshot,run_id:runId});
    const binding= evaluateLongTaskBindings(contract,snapshot.manifest,run,workdir);
    const counterfactual=await runLongTaskCounterfactuals(contract,snapshot.root,workdir,run);
    const after=await hashLongTaskWorkspace(contract.repository_root,contract);const blocker=classifyExternalBlocker(run,contract);const findings:LongTaskFindingV2[]=[...blocker.findings,...binding.findings,...counterfactual.findings];
    if(before!==after||after!==run.snapshot.snapshot_sha256)findings.push(workspaceFinding(workdir,run.run_id,run.snapshot.snapshot_sha256,after));
    const globalCodes=findings.filter((item)=>!item.requirement_id&&!item.obligation_id&&!item.ac_id&&!item.verification_spec_id).map((item)=>item.category);
    const projection=projectLongTaskEntities(contract,run,binding.binding_results,counterfactual.counterfactual_results,globalCodes);
    const everyEntityPassed=[projection.requirement_results,projection.plan_item_results,projection.obligation_results,projection.acceptance_results,projection.proof_requirement_results].every(allPassed)&&Object.values(projection.binding_results).every((item)=>item.status==="passed")&&Object.values(projection.counterfactual_results).every((item)=>item.status==="passed")&&run.spec_results.every((item)=>item.status==="passed");
    const accepted=findings.length===0&&everyEntityPassed;const externallyBlocked=blocker.externally_blocked&&findings.length===0&&!accepted;
    const result:FinalResultV2={
      schema_version:"long-task-final-result-v2",workflow_status:accepted?"accepted":externallyBlocked?"externally_blocked":"needs_work",contract_sha256:contract.contract_sha256,run_id:run.run_id,final_snapshot_sha256:run.snapshot.snapshot_sha256,
      source_hashes:Object.fromEntries(Object.entries(contract.sources).map(([key,value])=>[key,value.sha256])),context_hashes:contract.context_snapshot.sha256,oracle_hashes:Object.fromEntries(contract.oracle_bundles.map((bundle)=>[bundle.spec_id,bundle.bundle_sha256])),verifier_identity:contract.verifier_identity,
      ...projection,spec_results:Object.fromEntries(run.spec_results.map((value)=>[value.spec_id,value.status])),workspace_hash_before:before,workspace_hash_after:after,findings,
      ...(externallyBlocked?{external_blocker:{minimal_user_action:blocker.minimal_user_action??"Complete the required external action"}}:{}),started_at:run.started_at,completed_at:new Date().toISOString(),atomic_write_complete:true
    };
    await atomic(path.join(workdir,"final-result.json"),result);return result;
  }finally{await snapshot.dispose();}
}
function allPassed(values:Record<string,LongTaskEntityResultV3>):boolean{return Object.values(values).every((item)=>item.status==="passed");}
function workspaceFinding(workdir:string,runId:string,expected:string,actual:string):LongTaskFindingV2{return {category:"workspace_changed_during_or_after_final",expected,actual,evidence_path:`runs/${runId}/snapshot-manifest.json`,next_action:"Restore a stable workspace and rerun final-gate",reverify_command:`ty-context composite-long-task final-gate ${quote(workdir)}`};}
function quote(value:string):string{return /\s/.test(value)?JSON.stringify(value):value;}
