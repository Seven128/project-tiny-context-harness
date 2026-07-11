import path from "node:path";
import type { CompiledContractV3, ImplementationBindingV3 } from "./long-task-contract-schema.js";
import type { BindingResultV3, LongTaskFindingV2, SnapshotManifestV2, VerificationRunResultV2 } from "./long-task-run-result.js";

export interface BindingEvaluationV3 {
  binding_results: Record<string,BindingResultV3>;
  findings: LongTaskFindingV2[];
}

export function evaluateLongTaskBindings(contract:CompiledContractV3,snapshot:SnapshotManifestV2,run:VerificationRunResultV2,workdir:string):BindingEvaluationV3{
  const binding_results:Record<string,BindingResultV3>={};const findings:LongTaskFindingV2[]=[];
  for(const binding of contract.bindings){
    const result=isStatic(binding)?evaluateStatic(binding,snapshot):evaluateObserved(binding,contract,run);
    binding_results[binding.id]=result;
    for(const code of result.finding_codes)findings.push(bindingFinding(code,binding,contract,result,run.run_id,workdir));
  }
  return {binding_results,findings};
}

function evaluateStatic(binding:ImplementationBindingV3,snapshot:SnapshotManifestV2):BindingResultV3{
  const target=normalize(binding.target);const matches=binding.kind==="file"
    ? snapshot.files.filter((file)=>file.path===target)
    : snapshot.files.filter((file)=>path.matchesGlob(file.path,target));
  if(matches.length===0)return result(binding,"failed",[],["binding_target_missing"]);
  const evidence=matches.sort((a,b)=>a.path.localeCompare(b.path)).map((file)=>`snapshot:path:${file.path};mode:${file.mode};size:${file.size};sha256:${file.sha256}`);
  return result(binding,"passed",evidence,[]);
}

function evaluateObserved(binding:ImplementationBindingV3,contract:CompiledContractV3,run:VerificationRunResultV2):BindingResultV3{
  if(binding.verification.mode!=="oracle_observation")return result(binding,"unobservable",[],["binding_unobservable"]);
  const declaration=binding.verification;const spec=contract.verification_specs.find((item)=>item.id===declaration.spec_id);const executed=run.spec_results.find((item)=>item.spec_id===declaration.spec_id);const observation=executed?.observations[declaration.observation_id];
  const evidence=[`run:${run.run_id}:spec:${declaration.spec_id}:observation:${declaration.observation_id}`];
  if(!spec||!executed||!observation)return result(binding,"unobservable",evidence,["binding_unobservable"]);
  const actual=asRecord(observation.actual);const positivePassed=spec.positive_assertions.some((assertion)=>assertion.observation_id===declaration.observation_id&&executed.assertion_results[assertion.id]===true);
  if(binding.kind==="symbol"||binding.kind==="schema"){
    const base=observation.kind==="implementation_structure"&&actual?.binding_id===binding.id&&actual.target===binding.target&&actual.observed===true&&positivePassed;
    const schemaOkay=binding.kind!=="schema"||schemaDescriptorMatches(binding.target,actual?.descriptor);
    return base&&schemaOkay?result(binding,"passed",evidence,[]):result(binding,"failed",evidence,["binding_observation_mismatch"]);
  }
  if(binding.kind==="runtime_capability"){
    const passed=observation.kind==="runtime_behavior"&&actual?.binding_id===binding.id&&actual.capability===binding.target&&positivePassed;
    return passed?result(binding,"passed",evidence,[]):result(binding,"failed",evidence,["binding_observation_mismatch"]);
  }
  if(binding.kind==="route")return evaluateRoute(binding,contract,observation.kind,actual,positivePassed,evidence);
  return result(binding,"unobservable",evidence,["binding_unobservable"]);
}

function evaluateRoute(binding:ImplementationBindingV3,contract:CompiledContractV3,kind:string,actual:Record<string,unknown>|undefined,positivePassed:boolean,evidence:string[]):BindingResultV3{
  if(kind!=="browser_interaction"||actual?.binding_id!==binding.id||actual.route!==binding.target||!positivePassed)return result(binding,"failed",evidence,["binding_observation_mismatch"]);
  const obligationIds=contract.obligations.filter((item)=>item.implementation_bindings.some((candidate)=>candidate.id===binding.id)).map((item)=>item.id);
  const requirementIds=new Set(obligationIds.flatMap((id)=>contract.graphs.obligations[id]?.requirement_ids??[]));
  const surfaceIds=new Set(contract.requirements.filter((item)=>requirementIds.has(item.id)).flatMap((item)=>item.owner_surface_refs));
  const surfaces=contract.owner_surfaces.filter((surface)=>surfaceIds.has(surface.id)&&surface.location===binding.target);
  const matched=surfaces.some((surface)=>actual.owner_surface_id===surface.id&&actual.action===surface.primary_action&&actual.feedback===surface.expected_feedback);
  return matched?result(binding,"passed",evidence,[]):result(binding,"failed",evidence,["binding_owner_surface_mismatch"]);
}

function schemaDescriptorMatches(target:string,descriptor:unknown):boolean{
  const pointer=target.includes("#")?target.slice(target.indexOf("#")+1):"";if(!pointer)return descriptor!==undefined;
  const row=asRecord(descriptor);return !!row&&row.pointer===pointer&&Object.prototype.hasOwnProperty.call(row,"value");
}
function result(binding:ImplementationBindingV3,status:BindingResultV3["status"],evidence_refs:string[],finding_codes:string[]):BindingResultV3{return {binding_id:binding.id,status,evidence_refs:[...new Set(evidence_refs)].sort(),finding_codes:[...new Set(finding_codes)].sort()};}
function bindingFinding(code:string,binding:ImplementationBindingV3,contract:CompiledContractV3,resultValue:BindingResultV3,runId:string,workdir:string):LongTaskFindingV2{const obligation=contract.obligations.find((item)=>item.implementation_bindings.some((candidate)=>candidate.id===binding.id));return {category:code,requirement_id:obligation?.source_requirement_ids[0],obligation_id:obligation?.id,expected:{binding_id:binding.id,kind:binding.kind,target:binding.target,status:"passed"},actual:resultValue,evidence_path:`runs/${runId}/verification-result.json`,next_action:`Make ${binding.id} observable at its exact implementation target`,reverify_command:`ty-context composite-long-task final-gate ${quote(workdir)}`};}
function isStatic(binding:ImplementationBindingV3):boolean{return binding.kind==="file"||binding.kind==="path_glob";}
function asRecord(value:unknown):Record<string,unknown>|undefined{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:undefined;}
function normalize(value:string):string{return value.replace(/\\/g,"/").replace(/^\.\//,"");}
function quote(value:string):string{return /\s/.test(value)?JSON.stringify(value):value;}
