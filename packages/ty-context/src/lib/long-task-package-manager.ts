import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { sha256Hex } from "./composite-campaign-codec.js";
import type { DependencyManagerNameV3, DependencyManagerV3 } from "./long-task-contract-schema.js";

const INSTALL:Record<DependencyManagerNameV3,string[]>={pnpm:["install","--frozen-lockfile"],yarn:["install","--immutable"],npm:["ci"],bun:["install","--frozen-lockfile"]};
export function dependencyInstallArgv(name:DependencyManagerNameV3):string[]{return [...INSTALL[name]];}
export async function resolveDependencyManager(name:DependencyManagerNameV3):Promise<DependencyManagerV3>{
  if(name==="npm"){const cli=path.join(path.dirname(process.execPath),"node_modules","npm","bin","npm-cli.js");const pkg=JSON.parse(await readFile(path.join(path.dirname(process.execPath),"node_modules","npm","package.json"),"utf8")) as {version:string};return descriptor(name,pkg.version,cli,process.execPath,[cli]);}
  if(name==="pnpm"||name==="yarn"){const cli=path.join(path.dirname(process.execPath),"node_modules","corepack","dist","corepack.js");const version=(await output(process.execPath,[cli,name,"--version"])).trim();return descriptor(name,version,cli,process.execPath,[cli,name]);}
  const executable=await findExecutable(process.platform==="win32"?["bun.exe"]:["bun"]);const version=(await output(executable,["--version"])).trim();return descriptor(name,version,executable,executable,[]);
}
async function descriptor(name:DependencyManagerNameV3,version:string,identityPath:string,invocationExecutable:string,prefix:string[]):Promise<DependencyManagerV3>{const info=await stat(identityPath);if(!info.isFile()||!version)throw new Error(`dependency_manager_unavailable:${name}`);return {name,version,executable_path:identityPath,executable_sha256:sha256Hex(await readFile(identityPath)),invocation_executable:invocationExecutable,invocation_prefix:prefix,install_argv:dependencyInstallArgv(name)};}
async function findExecutable(names:string[]):Promise<string>{for(const directory of (process.env.PATH??"").split(path.delimiter))for(const name of names){const candidate=path.resolve(directory||".",name);try{await access(candidate);return candidate;}catch{}}throw new Error(`dependency_manager_unavailable:${names[0]}`);}
async function output(executable:string,argv:string[]):Promise<string>{return new Promise((resolve,reject)=>{const child=spawn(executable,argv,{shell:false,windowsHide:true,env:{PATH:process.env.PATH,Path:process.env.Path,PATHEXT:process.env.PATHEXT,SYSTEMROOT:process.env.SYSTEMROOT,WINDIR:process.env.WINDIR,HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE}});const chunks:Buffer[]=[];const errors:Buffer[]=[];child.stdout.on("data",(item:Buffer)=>chunks.push(item));child.stderr.on("data",(item:Buffer)=>errors.push(item));child.on("error",reject);child.on("close",(code)=>code===0?resolve(Buffer.concat(chunks).toString("utf8")):reject(new Error(`dependency_manager_unavailable:${Buffer.concat(errors).toString("utf8")}`)));});}
