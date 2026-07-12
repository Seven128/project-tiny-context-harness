import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createBlackBoxRuntime, findingCodes, parseFinal } from "./black-box-v3-runtime.mjs";

export const finalHookCaseHandlers=new Map();

finalHookCaseHandlers.set("historical_final_result",async(row,t)=>{
  const runtime=await compiled(row,t);if(runtime.outcome)return runtime.outcome;await runtime.cli("final-gate",[],{timeout_ms:240_000});const file=runtime.taskPath("final-result.json");const first=await readFile(file);await runtime.cli("final-gate",[],{timeout_ms:240_000});await replaceMirror(file,first);return stopped(row,await runtime.hook("Stop",{stop_hook_active:true,last_assistant_message:"done"}));
});

finalHookCaseHandlers.set("copied_final_result",async(row,t)=>{
  const source=await compiled(row,t);if(source.outcome)return source.outcome;await source.cli("final-gate",[],{timeout_ms:240_000});const envelope=await readFile(source.taskPath("final-result.json"));const payload=JSON.parse(envelope).payload;const trace=await readFile(source.taskPath(`runs/${payload.run_id}/final-trace.json`));const target=await compiled(row,t);if(target.outcome)return target.outcome;await mkdir(target.taskPath(`runs/${payload.run_id}`),{recursive:true});await writeFile(target.taskPath("final-result.json"),envelope);await writeFile(target.taskPath(`runs/${payload.run_id}/final-trace.json`),trace);return stopped(row,await target.hook("Stop",{stop_hook_active:true,last_assistant_message:"done"}));
});

finalHookCaseHandlers.set("final_result_forged",async(row,t)=>{
  const runtime=await compiled(row,t);if(runtime.outcome)return runtime.outcome;await runtime.cli("final-gate",[],{timeout_ms:240_000});const file=runtime.taskPath("final-result.json");const value=JSON.parse(await readFile(file,"utf8"));value.payload.workflow_status=value.payload.workflow_status==="accepted"?"needs_work":"accepted";await replaceMirror(file,`${JSON.stringify(value,null,2)}\n`);return stopped(row,await runtime.hook("Stop",{stop_hook_active:true,last_assistant_message:"done"}));
});

finalHookCaseHandlers.set("workspace_changed_after_final",async(row,t)=>{
  const runtime=await compiled(row,t);if(runtime.outcome)return runtime.outcome;await runtime.cli("final-gate",[],{timeout_ms:240_000});await writeFile(runtime.path("src/value.txt"),"changed after final\n");return stopped(row,await runtime.hook("Stop",{stop_hook_active:true,last_assistant_message:"done"}));
});

finalHookCaseHandlers.set("workspace_changed_during_final",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await value.write("tests/acceptance/oracle.mjs",`export async function observe(){await new Promise(resolve=>setTimeout(resolve,4000));return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value:"good"},artifact_refs:[]},forbidden:{kind:"scalar",actual:"good",artifact_refs:[]}}};}\n`);await value.commit();}});const first=await runtime.cli("compile");if(first.status!==0)return failed(first);const pending=runtime.cli("final-gate",[],{timeout_ms:240_000});await new Promise((resolve)=>setTimeout(resolve,2000));await writeFile(runtime.path("src/live-drift.txt"),"changed during final\n");await pending;const payload=await parseFinal(runtime);const codes=findingCodes(payload);return{status:payload.workflow_status,code:codes.has(row.expected_code)?row.expected_code:[...codes][0]??"missing_finding",raw:JSON.stringify(payload)};
});

for(const id of ["host_hooks_disabled","non_managed_hook"]){finalHookCaseHandlers.set(id,async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);if(id==="non_managed_hook"){await runtime.write(".codex/hooks/stop.mjs",`process.stdout.write(JSON.stringify({continue:false}));\n`);await runtime.commit();}try{await runtime.hostControl(id==="host_hooks_disabled"?"remove-hook":"replace-hook");const command=await runtime.cli("compile",[],{heartbeat:false});const raw=`${command.stdout}\n${command.stderr}`;return{status:command.status===0?"accepted":"blocked",code:raw.includes(row.expected_code)?row.expected_code:raw.includes("host_completion_gate_unavailable")?"host_completion_gate_unavailable":"managed_hook_identity_changed",raw};}finally{await runtime.hostControl("restore-hook");}
});}

finalHookCaseHandlers.set("conflicting_continue_false_hook",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await value.write(".codex/hooks/stop.mjs",`process.stdout.write(JSON.stringify({continue:false}));\n`);await value.write("src/value.txt","wrong\n");await value.commit();}});const compiledResult=await runtime.cli("compile");if(compiledResult.status!==0)return failed(compiledResult);const result=await runtime.hook("Stop",{last_assistant_message:"done"});return{status:result.decision==="block"?"blocked":"accepted",code:result.decision==="block"?"managed_stop_block":"ok",raw:JSON.stringify(result)};
});

finalHookCaseHandlers.set("ordinary_question_no_active_task",async(row,t)=>{const runtime=await createBlackBoxRuntime(row,t);const result=await runtime.hook("Stop",{last_assistant_message:"ordinary answer"});return{status:Object.keys(result).length===0?"noop":"blocked",code:Object.keys(result).length===0?"ok":"managed_stop_block",raw:JSON.stringify(result)};});

finalHookCaseHandlers.set("happy_path",async(row,t)=>{const runtime=await compiled(row,t);if(runtime.outcome)return runtime.outcome;const command=await runtime.cli("final-gate",[],{timeout_ms:240_000});const payload=await parseFinal(runtime);const control=Object.values(payload.counterfactual_results)[0];if(command.status!==0||payload.workflow_status!=="accepted"||!control?.assertion_flips?.some((flip)=>flip.real===true&&flip.counterfactual===false))return{status:"needs_work",code:"happy_counterfactual_missing",raw:JSON.stringify(payload)};const stopped=await runtime.hook("Stop",{stop_hook_active:true,last_assistant_message:"done"});const restored=await runtime.hook("SessionStart",{source:"resume"});return{status:Object.keys(stopped).length===0&&Object.keys(restored).length===0?"accepted":"blocked",code:Object.keys(stopped).length===0&&Object.keys(restored).length===0?"ok":"terminal_cleanup_failed",raw:JSON.stringify({payload,stopped,restored})};});

async function compiled(row,t){const runtime=await createBlackBoxRuntime(row,t);const result=await runtime.cli("compile");return result.status===0?runtime:{outcome:failed(result)};}
function stopped(row,result){const raw=JSON.stringify(result);const reason=String(result.reason??"");return{status:result.decision==="block"?"blocked":"accepted",code:reason.includes(row.expected_code)?row.expected_code:reason.split(":",1)[0]||"ok",raw};}
function failed(value){const raw=`${value.stdout}\n${value.stderr}`;return{status:"compile_rejected",code:raw.match(/\b[a-z][a-z0-9_]{2,}\b/u)?.[0]??"unknown_error",raw};}
async function replaceMirror(file,value){await rm(file,{force:true});await writeFile(file,value);}
