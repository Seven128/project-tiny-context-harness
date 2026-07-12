import { access, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { EnvironmentProbeDescriptorV3, FrozenEnvironmentProbeV3, LongTaskSourceBundleV3 } from "./long-task-contract-schema.js";

export async function freezeLongTaskEnvironmentProbes(root:string,bundle:LongTaskSourceBundleV3):Promise<FrozenEnvironmentProbeV3[]>{
  const uses=new Map<string,Set<string>>();
  for(const spec of bundle.checklist.verification_specs)for(const requirement of spec.environment_requirements)for(const id of [requirement.probe_spec_id,...requirement.local_alternative_probe_ids]){
    const values=uses.get(id)??new Set<string>();values.add(spec.id);uses.set(id,values);
  }
  const result:FrozenEnvironmentProbeV3[]=[];
  for(const probe of bundle.checklist.environment_probes){
    const descriptor=await descriptorFor(root,bundle,probe.id,probe.adapter,probe.target,[...(uses.get(probe.id)??[])].sort());
    result.push({...probe,normalized_sha256:sha256Hex(canonicalJson(probe)),descriptor});
  }
  return result.sort((left,right)=>left.id.localeCompare(right.id));
}

async function descriptorFor(root:string,bundle:LongTaskSourceBundleV3,id:string,adapter:string,target:string,specIds:string[]):Promise<EnvironmentProbeDescriptorV3>{
  if(adapter==="cli_auth"){
    if(target!=="gh")throw new Error(`environment_probe_target_invalid:${id}`);
    const executable=await findExecutable(process.platform==="win32"?["gh.exe"]:["gh"]);
    return {adapter,executable_path:executable,executable_sha256:sha256Hex(await readFile(executable)),argv:["auth","status"]};
  }
  if(adapter==="credential_store")return {adapter,provider:process.platform==="win32"?"windows-credential-manager":process.platform==="darwin"?"macos-keychain":"secret-service",secret_ref:target};
  if(adapter==="filesystem_permission"){
    const separator=target.indexOf(":");const mode=target.slice(0,separator);const raw=target.slice(separator+1);
    if(!["read","write"].includes(mode)||!raw)throw new Error(`environment_probe_target_invalid:${id}`);
    return {adapter,access:mode as "read"|"write",path:path.resolve(root,raw)};
  }
  if(adapter==="tcp_endpoint"){
    const value=new URL(`tcp://${target}`);const port=Number(value.port);
    if(!value.hostname||!Number.isInteger(port)||port<1||port>65535||value.username||value.password||!["","/"].includes(value.pathname))throw new Error(`environment_probe_target_invalid:${id}`);
    return {adapter,host:value.hostname,port};
  }
  if(adapter==="http_endpoint"){
    const value=new URL(target);
    if(!["http:","https:"].includes(value.protocol)||!value.hostname||value.username||value.password||value.hash)throw new Error(`environment_probe_target_invalid:${id}`);
    return {adapter,url:value.toString()};
  }
  if(adapter==="frozen_command_step"){
    const command_steps=specIds.map((specId)=>{const spec=bundle.checklist.verification_specs.find((item)=>item.id===specId);const step=spec?.command_steps.find((item)=>item.id===target);if(!step)throw new Error(`environment_probe_command_missing:${id}:${specId}:${target}`);return {spec_id:specId,command_step_id:target,command_step_sha256:sha256Hex(canonicalJson(step))};});
    return {adapter,command_steps};
  }
  throw new Error(`environment_probe_adapter_invalid:${id}`);
}

async function findExecutable(names:string[]):Promise<string>{
  for(const directory of (process.env.PATH??process.env.Path??"").split(path.delimiter))for(const name of names){const candidate=path.resolve(directory||".",name);try{await access(candidate);const canonical=await realpath(candidate);if((await stat(canonical)).isFile())return canonical;}catch{}}
  throw new Error(`environment_probe_cli_unavailable:${names[0]}`);
}
