import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { collectFrozenArtifacts } from "./long-task-artifact-collector.js";
import { runLongTaskCommandSteps } from "./long-task-command-step-runner.js";
import type { CompiledContractV3, FrozenEnvironmentProbeV3, FrozenVerificationSpecV3 } from "./long-task-contract-schema.js";
import { attachDependencyLayer } from "./long-task-dependency-layer.js";
import { buildLongTaskEnvironment } from "./long-task-environment.js";
import type { LongTaskExecutionResourcesV3 } from "./long-task-execution-resources.js";
import type { OracleSandboxLaunchOptionsV3 } from "./long-task-oracle-runner.js";
import { runHostEnvironmentProbeAdapter, type RawEnvironmentProbeOutcomeV3 } from "./long-task-probe-adapters.js";
import { LongTaskRedactorV3, sanitizeLongTaskArtifacts } from "./long-task-redaction.js";
import type { EnvironmentProbeAttemptV3, EnvironmentProbeResultV3, EnvironmentProbeRunV3, LongTaskFindingV2 } from "./long-task-run-result.js";
import { resolveLongTaskSecrets } from "./long-task-secret-provider.js";

export interface EnvironmentProbeRequestV3 { contract:CompiledContractV3;source_root:string;workdir:string;run_root:string;run_id:string;snapshot_sha256:string;environment_manifest_sha256:string;resources:LongTaskExecutionResourcesV3;oracle_sandbox?:OracleSandboxLaunchOptionsV3 }

export async function runLongTaskEnvironmentProbes(request:EnvironmentProbeRequestV3):Promise<EnvironmentProbeRunV3>{
  const results:Record<string,EnvironmentProbeResultV3>={};const findings:LongTaskFindingV2[]=[];const probes=new Map(request.contract.environment_probes.map((probe)=>[probe.id,probe]));
  for(const spec of request.contract.verification_specs)for(const requirement of spec.environment_requirements){
    const deadline=Date.now()+300_000;const primary=probes.get(requirement.probe_spec_id);
    if(!primary){findings.push(finding("environment_probe_failed",request,spec.id,requirement.id,"compiled primary probe exists",requirement.probe_spec_id));continue;}
    const offsets=requirement.reason_code==="external_service_persistently_unavailable"?[0,5_000,20_000]:[0];
    const primaryResult=await executeResult(request,spec,requirement.id,requirement.reason_code,primary,"primary",offsets,deadline,findings);results[primaryResult.result_id]=primaryResult;
    for(const id of requirement.local_alternative_probe_ids){const alternative=probes.get(id);if(!alternative){findings.push(finding("external_blocker_alternatives_not_run",request,spec.id,requirement.id,"compiled alternative probe exists",id));continue;}const value=await executeResult(request,spec,requirement.id,requirement.reason_code,alternative,"alternative",[0],deadline,findings);results[value.result_id]=value;}
  }
  const report:EnvironmentProbeRunV3={schema_version:"long-task-environment-probe-run-v3",run_id:request.run_id,snapshot_sha256:request.snapshot_sha256,environment_manifest_sha256:request.environment_manifest_sha256,results:Object.fromEntries(Object.entries(results).sort(([left],[right])=>left.localeCompare(right))),findings};
  await writeFile(path.join(request.run_root,"environment-probes.json"),canonicalJson(report));return report;
}

async function executeResult(request:EnvironmentProbeRequestV3,spec:FrozenVerificationSpecV3,requirementId:string,reasonCode:string,probe:FrozenEnvironmentProbeV3,role:"primary"|"alternative",offsets:number[],deadline:number,findings:LongTaskFindingV2[]):Promise<EnvironmentProbeResultV3>{
  const resultId=`${spec.id}:${requirementId}:${role}:${probe.id}`;const base=Date.now();
  const attempts=await Promise.all(offsets.map(async(offset,index)=>{await delay(Math.max(0,base+offset-Date.now()));if(Date.now()>=deadline){findings.push(finding("environment_probe_failed",request,spec.id,requirementId,"probe within five-minute requirement budget","budget_exhausted"));return null;}return executeAttempt(request,spec,requirementId,probe,resultId,index+1,offset,Math.min(probe.timeout_ms,deadline-Date.now()),findings);}));
  const complete=attempts.filter((value):value is EnvironmentProbeAttemptV3=>value!==null).sort((left,right)=>left.attempt-right.attempt);return {result_id:resultId,probe_id:probe.id,verification_spec_id:spec.id,environment_requirement_id:requirementId,role,reason_code:reasonCode,satisfied:complete.some((attempt)=>attempt.satisfied),attempts:complete};
}

async function executeAttempt(request:EnvironmentProbeRequestV3,spec:FrozenVerificationSpecV3,requirementId:string,probe:FrozenEnvironmentProbeV3,resultId:string,attempt:number,offset:number,timeout:number,findings:LongTaskFindingV2[]):Promise<EnvironmentProbeAttemptV3>{
  const root=path.join(request.run_root,"environment-probes",safe(resultId),`attempt-${attempt}`);await mkdir(root,{recursive:true});const started=Date.now();let raw:RawEnvironmentProbeOutcomeV3;let artifacts:Array<{path:string;sha256:string;size:number}>=[];
  try{if(probe.adapter==="frozen_command_step"){const outcome=await commandAttempt(request,spec,probe,root,timeout);raw=outcome.raw;artifacts=outcome.artifacts;}else raw=await runHostEnvironmentProbeAdapter(probe,request.contract.repository_root,timeout,`${request.run_id}\0${probe.id}\0${attempt}`);}
  catch(error){raw={exit_code:null,signal:null,error_code:"environment_probe_failed",stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};findings.push(finding("environment_probe_failed",request,spec.id,requirementId,"trusted probe adapter completes",message(error)));}
  const secrets=probe.environment_refs.length?await resolveLongTaskSecrets(request.contract.repository_root,probe.environment_refs,`${request.run_id}\0probe-redaction`).catch(()=>({values:{},refs:[]})):{values:{},refs:[]};const redactor=new LongTaskRedactorV3(secrets.values);const stdout=redactor.redactBuffer(raw.stdout);const stderr=redactor.redactBuffer(raw.stderr);const marker=probe.adapter==="frozen_command_step"?probeErrorCode(stderr):null;const errorCode=marker??raw.error_code;const stdoutFile=path.join(root,"stdout.txt");const stderrFile=path.join(root,"stderr.txt");await Promise.all([writeFile(stdoutFile,stdout),writeFile(stderrFile,stderr)]);
  if(probe.artifact_globs.length>0&&artifacts.length===0)findings.push(finding("environment_probe_artifact_missing",request,spec.id,requirementId,probe.artifact_globs,"no current probe artifact"));
  const artifactValid=probe.artifact_globs.length===0||artifacts.length>0;const satisfied=artifactValid&&((raw.exit_code!==null&&probe.expected.exit_codes.includes(raw.exit_code))||(errorCode!==null&&probe.expected.error_codes.includes(errorCode)));
  const completed=Date.now();const relative=(file:string)=>path.relative(request.workdir,file).replace(/\\/gu,"/");const record:EnvironmentProbeAttemptV3={probe_id:probe.id,descriptor:probe.descriptor,attempt,scheduled_offset_ms:offset,started_at:new Date(started).toISOString(),completed_at:new Date(completed).toISOString(),duration_ms:completed-started,exit_code:raw.exit_code,signal:raw.signal,error_code:errorCode,stdout_path:relative(stdoutFile),stdout_sha256:sha256Hex(stdout),stderr_path:relative(stderrFile),stderr_sha256:sha256Hex(stderr),artifact_refs:artifacts,satisfied,run_id:request.run_id,snapshot_sha256:request.snapshot_sha256,environment_manifest_sha256:request.environment_manifest_sha256,descriptor_sha256:sha256Hex(canonicalJson(probe.descriptor))};await writeFile(path.join(root,"attempt.json"),canonicalJson(record));return record;
}

async function commandAttempt(request:EnvironmentProbeRequestV3,spec:FrozenVerificationSpecV3,probe:FrozenEnvironmentProbeV3,attemptRoot:string,timeout:number):Promise<{raw:RawEnvironmentProbeOutcomeV3;artifacts:Array<{path:string;sha256:string;size:number}>}>{
  if(probe.descriptor.adapter!=="frozen_command_step")throw new Error(`environment_probe_descriptor_mismatch:${probe.id}`);const frozen=probe.descriptor.command_steps.find((item)=>item.spec_id===spec.id);const step=spec.command_steps.find((item)=>item.id===probe.target);if(!frozen||!step||frozen.command_step_sha256!==sha256Hex(canonicalJson(step)))throw new Error(`command_identity_changed:${probe.id}`);
  const source=await mkdtemp(path.join(os.tmpdir(),`ty-context-probe-${probe.id}-`));const artifactRoot=path.join(attemptRoot,"artifacts");const commandRoot=path.join(attemptRoot,"command");const tempRoot=path.join(attemptRoot,"temp");await Promise.all([cp(request.source_root,source,{recursive:true}),mkdir(artifactRoot,{recursive:true}),mkdir(commandRoot,{recursive:true}),mkdir(tempRoot,{recursive:true})]);
  try{if(request.resources.dependency_layer)await attachDependencyLayer(request.resources.dependency_layer,source);const resolved=probe.environment_refs.length?await resolveLongTaskSecrets(request.contract.repository_root,probe.environment_refs,`${request.run_id}\0${probe.id}`):{values:{},refs:[]};const redactor=new LongTaskRedactorV3(resolved.values);const browserRoot=request.resources.browser_layer?.payload_root??null;const environment=buildLongTaskEnvironment(source,artifactRoot,tempRoot,request.resources.dependency_layer,browserRoot);const probeSpec={...spec,timeout_ms:Math.min(spec.timeout_ms,timeout),command_steps:[{...step,timeout_ms:Math.min(step.timeout_ms,timeout)}]};const run=await runLongTaskCommandSteps(probeSpec,source,artifactRoot,commandRoot,tempRoot,request.contract.dependency_plan,request.resources.dependency_layer,browserRoot,environment.values,resolved.values,redactor,{...request.oracle_sandbox,control_root:tempRoot});const executed=run.steps[0];if(!executed)throw new Error(`environment_probe_command_not_run:${probe.id}`);await sanitizeLongTaskArtifacts(artifactRoot,path.join(commandRoot,"quarantine"),redactor);const manifest=await collectFrozenArtifacts({...spec,artifact_globs:probe.artifact_globs},artifactRoot,executed.started_at);const relative=(file:string)=>path.relative(request.workdir,file).replace(/\\/gu,"/");return {raw:{exit_code:executed.exit_code,signal:null,error_code:null,stdout:await readFile(executed.stdout_path),stderr:await readFile(executed.stderr_path)},artifacts:manifest.artifacts.map((item)=>({path:relative(path.join(artifactRoot,item.path)),sha256:item.sha256,size:item.size}))};}finally{await rm(source,{recursive:true,force:true});}
}

function finding(category:string,request:EnvironmentProbeRequestV3,specId:string,requirementId:string,expected:unknown,actual:unknown):LongTaskFindingV2{return {category,verification_spec_id:specId,expected,actual,evidence_path:`runs/${request.run_id}/environment-probes.json`,next_action:`Repair ${requirementId} probe evidence and rerun final-gate`,reverify_command:`ty-context composite-long-task final-gate ${quote(request.workdir)}`};}
function probeErrorCode(stderr:Buffer):string|null{const matches=stderr.toString("utf8").split(/\r?\n/u).flatMap((line)=>/^TY_CONTEXT_PROBE_ERROR_CODE=([A-Za-z][A-Za-z0-9_.-]{0,127})$/u.exec(line.trim())?.[1]??[]);return matches.length===1?matches[0]:null;}
function safe(value:string):string{return value.replace(/[^A-Za-z0-9_.-]/gu,"_").slice(0,220);}
function delay(ms:number):Promise<void>{return ms<=0?Promise.resolve():new Promise((resolve)=>setTimeout(resolve,ms));}
function quote(value:string):string{return /\s/u.test(value)?JSON.stringify(value):value;}
function message(error:unknown):string{return error instanceof Error?error.message:String(error);}
