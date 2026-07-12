import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { sha256Hex } from "./composite-campaign-codec.js";
import type { FrozenEnvironmentProbeV3 } from "./long-task-contract-schema.js";
import { resolveLongTaskSecrets } from "./long-task-secret-provider.js";

export interface RawEnvironmentProbeOutcomeV3 { exit_code:number|null;signal:string|null;error_code:string|null;stdout:Buffer;stderr:Buffer }

export async function runHostEnvironmentProbeAdapter(probe:FrozenEnvironmentProbeV3,repositoryRoot:string,timeoutMs:number,salt:string):Promise<RawEnvironmentProbeOutcomeV3>{
  const descriptor=probe.descriptor;
  if(descriptor.adapter!==probe.adapter)throw new Error(`environment_probe_descriptor_mismatch:${probe.id}`);
  if(descriptor.adapter==="cli_auth"){
    if(sha256Hex(await readFile(descriptor.executable_path))!==descriptor.executable_sha256)throw new Error(`command_identity_changed:${probe.id}`);
    const result=await processResult(descriptor.executable_path,descriptor.argv,timeoutMs);
    return {...result,error_code:result.exit_code===0?null:cliError(result.stderr)};
  }
  if(descriptor.adapter==="credential_store"){
    try{const resolved=await resolveLongTaskSecrets(repositoryRoot,[descriptor.secret_ref],salt);const present=resolved.refs[0]?.present===true;return {exit_code:present?0:1,signal:null,error_code:present?null:"credential_unavailable",stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};}
    catch(error){return {exit_code:1,signal:null,error_code:stableCode(error),stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};}
  }
  if(descriptor.adapter==="filesystem_permission"){
    try{await access(descriptor.path,descriptor.access==="read"?constants.R_OK:constants.W_OK);return empty(0,null);}
    catch(error){return empty(1,stableCode(error));}
  }
  if(descriptor.adapter==="tcp_endpoint")return tcpResult(descriptor.host,descriptor.port,timeoutMs);
  if(descriptor.adapter==="http_endpoint")return httpResult(descriptor.url,timeoutMs);
  throw new Error(`environment_probe_adapter_requires_command_runner:${probe.id}`);
}

function processResult(executable:string,argv:string[],timeoutMs:number):Promise<RawEnvironmentProbeOutcomeV3>{return new Promise((resolve)=>{
  const child=spawn(executable,argv,{shell:false,windowsHide:true,env:minimalHostEnvironment(),stdio:["ignore","pipe","pipe"]});const stdout:Buffer[]=[];const stderr:Buffer[]=[];let size=0;let settled=false;let timer:NodeJS.Timeout;
  const finish=(value:RawEnvironmentProbeOutcomeV3)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const capture=(target:Buffer[])=>(chunk:Buffer)=>{size+=chunk.length;if(size>1024*1024){child.kill();finish({exit_code:1,signal:null,error_code:"environment_probe_output_limit",stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)});return;}target.push(Buffer.from(chunk));};
  child.stdout.on("data",capture(stdout));child.stderr.on("data",capture(stderr));child.once("error",(error:NodeJS.ErrnoException)=>finish({exit_code:null,signal:null,error_code:error.code??"process_spawn_failed",stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr)}));child.once("close",(code,signal)=>finish({exit_code:code,signal,error_code:null,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr)}));
  timer=setTimeout(()=>{child.kill();finish({exit_code:null,signal:"SIGKILL",error_code:"ETIMEDOUT",stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr)});},timeoutMs);timer.unref();
});}

function tcpResult(host:string,port:number,timeoutMs:number):Promise<RawEnvironmentProbeOutcomeV3>{return new Promise((resolve)=>{const socket=net.createConnection({host,port});let settled=false;const finish=(value:RawEnvironmentProbeOutcomeV3)=>{if(settled)return;settled=true;clearTimeout(timer);socket.destroy();resolve(value);};socket.once("connect",()=>finish(empty(0,null)));socket.once("error",(error:NodeJS.ErrnoException)=>finish(empty(1,error.code??"network_error")));const timer=setTimeout(()=>finish(empty(1,"ETIMEDOUT")),timeoutMs);timer.unref();});}

function httpResult(target:string,timeoutMs:number):Promise<RawEnvironmentProbeOutcomeV3>{return new Promise((resolve)=>{const url=new URL(target);const client=url.protocol==="https:"?https:http;let size=0;let settled=false;let timer:NodeJS.Timeout;const finish=(value:RawEnvironmentProbeOutcomeV3)=>{if(settled)return;settled=true;clearTimeout(timer);request.destroy();resolve(value);};const request=client.request(url,{method:"GET",agent:false,headers:{accept:"application/json, text/plain;q=0.5","user-agent":"ty-context-host-probe/1"}},(response)=>{response.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>1024*1024)finish(empty(1,"environment_probe_output_limit"));});response.once("end",()=>{const status=response.statusCode??0;const header=Array.isArray(response.headers["x-ty-context-error-code"])?response.headers["x-ty-context-error-code"][0]:response.headers["x-ty-context-error-code"];const code=stableToken(header)??(status>=200&&status<400?null:`HTTP_${status||"INVALID"}`);finish({exit_code:status>=200&&status<400?0:1,signal:null,error_code:code,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)});});});request.once("error",(error:NodeJS.ErrnoException)=>finish(empty(1,error.code??"network_error")));request.end();timer=setTimeout(()=>finish(empty(1,"ETIMEDOUT")),timeoutMs);timer.unref();});}

function cliError(stderr:Buffer):string{const text=stderr.toString("utf8");if(/\b(?:mfa|2fa|two[- ]factor)\b/iu.test(text))return "mfa_required";if(/not logged|auth(?:enticate|entication| login)|credential/iu.test(text))return "credential_unavailable";if(/permission|forbidden|denied/iu.test(text))return "permission_denied";return "cli_auth_failed";}
function stableCode(error:unknown):string{const candidate=error&&typeof error==="object"&&"code" in error?String((error as {code:unknown}).code):error instanceof Error?error.message.split(":",1)[0]:String(error);return stableToken(candidate)??"environment_probe_failed";}
function stableToken(value:unknown):string|null{return typeof value==="string"&&/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/u.test(value)?value:null;}
function empty(exit_code:number|null,error_code:string|null):RawEnvironmentProbeOutcomeV3{return {exit_code,signal:null,error_code,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};}
function minimalHostEnvironment():NodeJS.ProcessEnv{return {SYSTEMROOT:process.env.SYSTEMROOT,WINDIR:process.env.WINDIR,ComSpec:process.env.ComSpec,HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,APPDATA:process.env.APPDATA,LOCALAPPDATA:process.env.LOCALAPPDATA,XDG_CONFIG_HOME:process.env.XDG_CONFIG_HOME,LANG:process.env.LANG,LC_ALL:process.env.LC_ALL};}
