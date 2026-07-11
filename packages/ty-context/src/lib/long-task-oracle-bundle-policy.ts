import path from "node:path";
import type { BuildResult, Metafile } from "esbuild";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

export const ORACLE_BUNDLER_VERSION="0.28.1" as const;
export const ORACLE_BUNDLER_INTEGRITY="sha512-HrJrvZv5ayxBzPfwphOoNzkzOIIlifzk0KJrGK2c8R4+LKpMtpYLQeUdjnwjWv/LZlkH2laZk+4w78pi99D4Vw==";
export const ORACLE_WRAPPER_SOURCE="ty-context-trusted-wrapper.mjs";
export const ORACLE_BUILD_POLICY={bundle:true,platform:"node",format:"esm",target:"node24",write:false,metafile:true,treeShaking:false,sourcemap:false,legalComments:"none",charset:"utf8",packages:"bundle",conditions:["node","import","default"],mainFields:["module","main"],logLevel:"silent",logOverride:{"unsupported-dynamic-import":"error","unsupported-require-call":"error"}} as const;
const ALLOWED_BUILTINS=new Set(["assert","assert/strict","buffer","crypto","events","fs","fs/promises","os","path","querystring","stream","string_decoder","url","util"]);
const FORBIDDEN_BUILTINS=new Set(["child_process","cluster","worker_threads","vm","module","inspector","net","tls","dgram","dns","http","https","http2"]);
export const ORACLE_POLICY_SHA256=sha256Hex(canonicalJson({build:ORACLE_BUILD_POLICY,allowed_builtins:[...ALLOWED_BUILTINS].sort(),forbidden_builtins:[...FORBIDDEN_BUILTINS].sort(),native_addons:false,wasm:false,dynamic_import:false,non_literal_require:false}));

export function validateOracleBundlePolicy(result:BuildResult,root:string):Metafile{
  for(const warning of result.warnings){if(warning.id==="unsupported-dynamic-import"||warning.id==="unsupported-require-call")throw new Error(`oracle_dynamic_import_escape:${warning.id}`);throw new Error(`oracle_bundle_failed:${warning.id||warning.text}`);}
  if(!result.metafile)throw new Error("oracle_bundle_failed:metafile_missing");const metafile=result.metafile;
  for(const [input,value] of Object.entries(metafile.inputs)){
    validateLogicalPath(input,root);
    if(/\.(node|wasm)$/iu.test(input))throw new Error(`oracle_native_addon_forbidden:${input}`);
    for(const imported of value.imports){
      if(imported.kind==="dynamic-import")throw new Error(`oracle_dynamic_import_escape:${input}:${imported.path}`);
      if(imported.path.startsWith("http:")||imported.path.startsWith("https:")||imported.path.startsWith("data:"))throw new Error(`oracle_dynamic_import_escape:${imported.path}`);
      if(!imported.external)continue;const builtin=imported.path.replace(/^node:/u,"");
      if(FORBIDDEN_BUILTINS.has(builtin))throw new Error(`oracle_forbidden_builtin:${builtin}`);
      if(!ALLOWED_BUILTINS.has(builtin))throw new Error(`oracle_external_dependency:${imported.path}`);
    }
  }
  rejectAbsoluteStrings(metafile,"metafile",root);return metafile;
}
function validateLogicalPath(value:string,root:string):void{if(value===ORACLE_WRAPPER_SOURCE)return;if(path.isAbsolute(value))throw new Error(`oracle_bundle_path_leak:${value}`);const resolved=path.resolve(root,...value.replace(/\\/g,"/").split("/"));if(resolved!==path.resolve(root)&&!resolved.startsWith(`${path.resolve(root)}${path.sep}`))throw new Error(`oracle_dependency_outside_layer:${value}`);if(value.startsWith("<")||value.includes("\0"))throw new Error(`oracle_virtual_module_forbidden:${value}`);}
function rejectAbsoluteStrings(value:unknown,label:string,root:string):void{if(typeof value==="string"){if(path.isAbsolute(value)||value.includes(path.resolve(root)))throw new Error(`oracle_bundle_path_leak:${label}`);return;}if(Array.isArray(value)){value.forEach((item,index)=>rejectAbsoluteStrings(item,`${label}[${index}]`,root));return;}if(value&&typeof value==="object")for(const [key,item] of Object.entries(value)){rejectAbsoluteStrings(key,`${label}.key`,root);rejectAbsoluteStrings(item,`${label}.${key}`,root);}}
