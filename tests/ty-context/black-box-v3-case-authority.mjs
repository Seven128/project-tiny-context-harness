import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { createBlackBoxRuntime, findingCodes, parseFinal } from "./black-box-v3-runtime.mjs";

export const authorityCaseHandlers = new Map();

authorityCaseHandlers.set("oracle_transitive_helper_changed",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await value.write("tests/acceptance/oracle-helper.mjs",`export const value="good";\n`);await value.write("tests/acceptance/oracle.mjs",`import {value} from "./oracle-helper.mjs";export async function observe(){return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}};}\n`);await value.commit();}});
  const compiled=await runtime.cli("compile");if(compiled.status!==0)return failed(compiled);await writeFile(runtime.path("tests/acceptance/oracle-helper.mjs"),`export const value="wrong";\n`);return finalOutcome(row,runtime);
});

authorityCaseHandlers.set("oracle_transitive_dependency_changed",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{
    const dependency="black-box-oracle-dep";
    await value.write("package.json",`${JSON.stringify({name:"black-box-oracle-consumer",version:"1.0.0",private:true,type:"module",dependencies:{[dependency]:"1.0.0"}},null,2)}\n`);
    await value.write("package-lock.json",`${JSON.stringify({name:"black-box-oracle-consumer",version:"1.0.0",lockfileVersion:3,requires:true,packages:{"":{name:"black-box-oracle-consumer",version:"1.0.0",dependencies:{[dependency]:"1.0.0"}},[`node_modules/${dependency}`]:{version:"1.0.0"}}},null,2)}\n`);
    await value.write(`node_modules/${dependency}/package.json`,`${JSON.stringify({name:dependency,version:"1.0.0",type:"module",exports:"./index.js"},null,2)}\n`);
    await value.write(`node_modules/${dependency}/index.js`,`export const value="good";\n`);
    await value.write("tests/acceptance/oracle.mjs",`import {value} from "${dependency}";export async function observe(){return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}};}\n`);
    await value.commit();
  }});
  const compiled=await runtime.cli("compile");if(compiled.status!==0)return failed(compiled);await writeFile(runtime.path("node_modules/black-box-oracle-dep/index.js"),`export const value="wrong";\n`);return finalOutcome(row,runtime);
});

authorityCaseHandlers.set("repo_relative_executable_helper_changed",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const compiled=await runtime.cli("compile");if(compiled.status!==0)return failed(compiled);await writeFile(runtime.path("tests/acceptance/command.mjs"),`process.stdout.write("changed\\n");\n`);return finalOutcome(row,runtime);
});

authorityCaseHandlers.set("weaken_sources_then_recompile",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const first=await runtime.cli("compile");if(first.status!==0)return failed(first);const file=runtime.taskPath("product-architecture-source.yaml");const value=YAML.parse(await runtime.read("task/product-architecture-source.yaml"));value.requirements[0].observable_outcome="weakened after seal";await writeFile(file,YAML.stringify(value));return rejected(row,await runtime.cli("compile"));
});

authorityCaseHandlers.set("replace_oracle_then_recompile",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const first=await runtime.cli("compile");if(first.status!==0)return failed(first);await writeFile(runtime.path("tests/acceptance/oracle.mjs"),`export async function observe(){return {schema_version:"ty-context-observation-v2",observations:{}};}\n`);return rejected(row,await runtime.cli("compile"));
});

authorityCaseHandlers.set("compile_second_workdir",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const first=await runtime.cli("compile");if(first.status!==0)return failed(first);const second=runtime.path("task-second");await cp(runtime.workdir,second,{recursive:true});return rejected(row,await runtime.cli("compile",[],{workdir:second}));
});

for(const id of ["delete_repo_pointer_but_host_registry_exists","rewrite_both_repo_pointers","both_repo_pointers_deleted"]){authorityCaseHandlers.set(id,async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const first=await runtime.cli("compile");if(first.status!==0)return failed(first);const repoMirror=runtime.path(".codex/ty-context-active-long-task.json");const gitMirror=runtime.path(".git/ty-context-active-long-task.json");if(id==="delete_repo_pointer_but_host_registry_exists")await rm(repoMirror,{force:true});else if(id==="both_repo_pointers_deleted")await Promise.all([rm(repoMirror,{force:true}),rm(gitMirror,{force:true})]);else{const forged=JSON.stringify({schema_version:"ty-context-host-active-registry-mirror-v1",authoritative:false,registry_id:"forged",contract_sha256:"0".repeat(64)});await mkdir(path.dirname(repoMirror),{recursive:true});await Promise.all([writeFile(repoMirror,forged),writeFile(gitMirror,forged)]);}return finalOutcome(row,runtime);
});}

authorityCaseHandlers.set("same_contract_idempotent_compile",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t);const first=await runtime.cli("compile");if(first.status!==0)return failed(first);const second=await runtime.cli("compile");return {status:second.status===0?"accepted":"compile_rejected",code:second.status===0?"ok":firstCode(`${second.stdout}\n${second.stderr}`),command_status:second.status,raw:`${second.stdout}\n${second.stderr}`};
});

async function finalOutcome(row,runtime){const command=await runtime.cli("final-gate",[],{timeout_ms:240_000});const payload=await parseFinal(runtime);const codes=findingCodes(payload);return {status:payload.workflow_status==="externally_blocked"?"blocked":payload.workflow_status,code:codes.has(row.expected_code)?row.expected_code:[...codes][0]??(payload.workflow_status==="accepted"?"ok":"missing_finding"),command_status:command.status,raw:JSON.stringify(payload)};}
function rejected(row,result){const text=`${result.stdout}\n${result.stderr}`;return {status:result.status===0?"accepted":"compile_rejected",code:text.includes(row.expected_code)?row.expected_code:firstCode(text),command_status:result.status,raw:text};}
function failed(value){const text=`${value.stdout}\n${value.stderr}`;return {status:"compile_rejected",code:firstCode(text),command_status:value.status,raw:text};}
function firstCode(text){return text.match(/\b[a-z][a-z0-9_]{2,}\b/u)?.[0]??"unknown_error";}
