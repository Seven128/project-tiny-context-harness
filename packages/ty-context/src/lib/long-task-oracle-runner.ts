import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import { nodePermissionArgv, type NodePermissionProfileV3 } from "./long-task-sandbox-node.js";
import type { LongTaskRedactorV3 } from "./long-task-redaction.js";

const DIAGNOSTIC_LIMIT=2*1024*1024;const PROTOCOL_LIMIT=16*1024*1024;
export interface OracleProcessResultV3 { exit_code:number; argv:string[]; protocol:Buffer; stdout:Buffer; stderr:Buffer; started_at:string; completed_at:string }
export async function runSealedOracle(executable:string,bundlePath:string,cwd:string,timeoutMs:number,environment:NodeJS.ProcessEnv,profile:NodePermissionProfileV3,redactor:LongTaskRedactorV3):Promise<OracleProcessResultV3>{
  const started_at=new Date().toISOString();const result=await new Promise<{exit_code:number;protocol:Buffer;stdout:Buffer;stderr:Buffer}>((resolve,reject)=>{
    const child=spawn(executable,[...nodePermissionArgv(profile),bundlePath],{cwd,shell:false,env:environment,windowsHide:true,stdio:["ignore","pipe","pipe","pipe"]});const protocol:Buffer[]=[];const stdout:Buffer[]=[];const stderr:Buffer[]=[];const protocolRedactor=redactor.stream();const stdoutRedactor=redactor.stream();const stderrRedactor=redactor.stream();let protocolSize=0;let diagnosticSize=0;let settled=false;
    const fail=(error:Error)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();reject(error);};
    const capture=(target:Buffer[],kind:"protocol"|"diagnostic",stream:ReturnType<LongTaskRedactorV3["stream"]>)=>(chunk:Buffer)=>{const raw=Buffer.from(chunk);if(kind==="protocol"){protocolSize+=raw.length;if(protocolSize>PROTOCOL_LIMIT){fail(new Error("oracle_protocol_output_limit_exceeded"));return;}}else{diagnosticSize+=raw.length;if(diagnosticSize>DIAGNOSTIC_LIMIT){fail(new Error("command_output_limit_exceeded"));return;}}const value=stream.push(raw);if(value.length)target.push(value);};
    child.stdout!.on("data",capture(stdout,"diagnostic",stdoutRedactor));child.stderr!.on("data",capture(stderr,"diagnostic",stderrRedactor));(child.stdio[3] as Readable).on("data",capture(protocol,"protocol",protocolRedactor));child.on("error",(error)=>fail(error));const timer=setTimeout(()=>fail(new Error("command_timeout")),timeoutMs);
    child.on("close",(code)=>{if(settled)return;settled=true;clearTimeout(timer);protocol.push(protocolRedactor.finish());stdout.push(stdoutRedactor.finish());stderr.push(stderrRedactor.finish());resolve({exit_code:code??-1,protocol:Buffer.concat(protocol),stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr)});});
  });return {...result,argv:[...nodePermissionArgv(profile),bundlePath],started_at,completed_at:new Date().toISOString()};
}
