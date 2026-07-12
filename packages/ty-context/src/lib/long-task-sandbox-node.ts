import path from "node:path";
import { LONG_TASK_SANDBOX_POLICY_SHA256 } from "./long-task-sandbox-policy.js";

export interface NodePermissionProfileV3 { read_paths:string[]; write_paths:string[]; allow_child_process?:boolean; allow_worker?:boolean; allow_addons?:boolean }
export const NODE_MODULE_ENTRYPOINT_SOURCE_V1='import {pathToFileURL as toUrl} from "node:url";await import(toUrl(process.argv[1]).href);';
export function assertNodePermissionCapability():void{for(const flag of ["--permission","--allow-fs-read","--allow-fs-write"])if(!process.allowedNodeEnvironmentFlags.has(flag))throw new Error(`sandbox_capability_unavailable:${flag}`);}
export function nodePermissionArgv(profile:NodePermissionProfileV3):string[]{assertNodePermissionCapability();const args=["--permission",...unique(profile.read_paths).map((item)=>`--allow-fs-read=${path.resolve(item)}`),...unique(profile.write_paths).map((item)=>`--allow-fs-write=${path.resolve(item)}`)];if(profile.allow_child_process)args.push("--allow-child-process");if(profile.allow_worker)args.push("--allow-worker");if(profile.allow_addons)args.push("--allow-addons");return args;}
export function nodePermissionOptions(profile:NodePermissionProfileV3):string{return nodePermissionArgv(profile).map(quoteNodeOption).join(" ");}
export function nodeModuleEntrypointArgv(target:string,argv:string[]=[],platform:NodeJS.Platform=process.platform):string[]{return platform==="win32"?["--input-type=module","--eval",NODE_MODULE_ENTRYPOINT_SOURCE_V1,target,...argv]:[target,...argv];}
export function nodePermissionPathVariants(value:string,platform:NodeJS.Platform=process.platform):string[]{const resolved=platform==="win32"?path.win32.resolve(value):path.posix.resolve(value);if(platform!=="darwin")return [resolved];for(const root of ["/var","/tmp","/etc"]){if(resolved===root||resolved.startsWith(`${root}/`))return [resolved,`/private${resolved}`].sort();const privateRoot=`/private${root}`;if(resolved===privateRoot||resolved.startsWith(`${privateRoot}/`))return [resolved,resolved.slice("/private".length)].sort();}return [resolved];}
export function isSandboxAccessError(stderr:Buffer|string):boolean{const value=Buffer.isBuffer(stderr)?stderr.toString("utf8"):stderr;return value.includes("ERR_ACCESS_DENIED")||value.includes("Access to this API has been restricted");}
export { LONG_TASK_SANDBOX_POLICY_SHA256 };
function unique(values:string[]):string[]{return [...new Set(values.flatMap((item)=>nodePermissionPathVariants(item)))].sort();}
function quoteNodeOption(value:string):string{return /\s/u.test(value)?JSON.stringify(value):value;}
