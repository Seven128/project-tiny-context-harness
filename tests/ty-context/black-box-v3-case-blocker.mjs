import { createServer } from "node:http";
import { createBlackBoxRuntime, findingCodes, parseFinal } from "./black-box-v3-runtime.mjs";

const action="Complete the frozen MFA approval and rerun final-gate.";
export const blockerCaseHandlers=new Map();

blockerCaseHandlers.set("oracle_lists_unexecuted_alternatives",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await value.write("tests/acceptance/oracle.mjs",`export async function observe(){return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value:"good"},artifact_refs:[]},forbidden:{kind:"scalar",actual:"good",artifact_refs:[]}},external_blocker:{attempted_local_alternatives:["ENV-PROBE-ALT"]}};}\n`);await value.commit();}});return final(row,runtime);
});

blockerCaseHandlers.set("external_blocker_not_probed",blockerCaseHandlers.get("oracle_lists_unexecuted_alternatives"));

for(const id of ["wrong_blocker_reason","implementation_failure_plus_blocker","local_alternative_succeeds","trusted_mfa_blocker"]){blockerCaseHandlers.set(id,async(row,t)=>withProbeServer(id==="wrong_blocker_reason"?{"/primary":[403,"permission_denied"],"/alternative":[503,"external_service_persistently_unavailable"]}:id==="local_alternative_succeeds"?{"/primary":[401,"mfa_required"],"/alternative":[204,null]}:{"/primary":[401,"mfa_required"],"/alternative":[503,"external_service_persistently_unavailable"]},async(url)=>{
  const runtime=await createBlackBoxRuntime(row,t,{mutate:(data)=>configure(data,"mfa_required",[httpProbe("ENV-PROBE-PRIMARY",`${url}/primary`),httpProbe("ENV-PROBE-ALT",`${url}/alternative`)], ["ENV-PROBE-ALT"]),prepare:id==="implementation_failure_plus_blocker"?async(value)=>{await value.write("src/value.txt","wrong\n");await value.commit();}:undefined});return final(row,runtime);
}));}

blockerCaseHandlers.set("missing_probe_artifact",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{mutate(data){data.checklist.verification_specs[0].command_steps.push({id:"CMD-PROBE-PRIMARY",tool:"node_script",target:"tests/acceptance/probe.mjs",argv:[],cwd:".",timeout_ms:10000,environment_refs:[],output_artifact_ids:[]});configure(data,"mfa_required",[commandProbe("ENV-PROBE-PRIMARY","CMD-PROBE-PRIMARY",["probe-proof.json"])],[]);},prepare:async(value)=>{await value.write("tests/acceptance/probe.mjs",`console.error("TY_CONTEXT_PROBE_ERROR_CODE=mfa_required");process.exitCode=1;\n`);await value.commit();}});return final(row,runtime);
});

async function final(row,runtime){const compiled=await runtime.cli("compile");if(compiled.status!==0)return failed(compiled);const command=await runtime.cli("final-gate",[],{timeout_ms:240_000});const payload=await parseFinal(runtime);const codes=findingCodes(payload);return {status:payload.workflow_status==="externally_blocked"?"blocked":payload.workflow_status,code:payload.workflow_status==="externally_blocked"?"externally_blocked":codes.has(row.expected_code)?row.expected_code:[...codes][0]??(payload.workflow_status==="accepted"?"ok":"missing_finding"),command_status:command.status,raw:JSON.stringify(payload)};}
function configure(data,reason,probes,alternatives){data.checklist.environment_probes=probes;data.checklist.verification_specs[0].environment_requirements=[{id:"ER-PRIMARY",reason_code:reason,probe_spec_id:"ENV-PROBE-PRIMARY",local_alternative_probe_ids:alternatives,minimal_user_action:action}];}
function httpProbe(id,target){return{id,kind:"network_endpoint",adapter:"http_endpoint",target,timeout_ms:2000,expected:{exit_codes:[0],error_codes:[]},artifact_globs:[],environment_refs:[]};}
function commandProbe(id,target,artifact_globs){return{id,kind:"command_step",adapter:"frozen_command_step",target,timeout_ms:10000,expected:{exit_codes:[0],error_codes:[]},artifact_globs,environment_refs:[]};}
function failed(value){const raw=`${value.stdout}\n${value.stderr}`;return{status:"compile_rejected",code:raw.match(/\b[a-z][a-z0-9_]{2,}\b/u)?.[0]??"unknown_error",command_status:value.status,raw};}
async function withProbeServer(routes,body){const server=createServer((request,response)=>{const [status,code]=routes[request.url??"/"]??[404,"not_found"];response.statusCode=status;if(code)response.setHeader("x-ty-context-error-code",code);response.end(code??"available");});await new Promise((resolve)=>server.listen(0,"127.0.0.1",resolve));const address=server.address();try{return await body(`http://127.0.0.1:${address.port}`);}finally{await new Promise((resolve,reject)=>server.close((error)=>error?reject(error):resolve()));}}
