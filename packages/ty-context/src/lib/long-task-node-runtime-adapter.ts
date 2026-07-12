export function longTaskNodeRuntimeAdapterSourceV1(): string {
  return String.raw`"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const marker=Symbol.for("ty-context.node-runtime-adapter.v1");
if(!globalThis[marker]){
  const requested=process.env.TY_CONTEXT_TEMP_DIR;
  if(typeof requested!=="string"||!path.isAbsolute(requested))throw new Error("node_runtime_temp_invalid");
  const sandboxTemp=fs.realpathSync(requested);
  if(process.platform==="win32"){
    const nativeRealpath=fs.realpathSync.native;
    Object.defineProperty(fs.realpathSync,"native",{configurable:true,value(value,options){
      try{return nativeRealpath(value,options);}catch(error){
        if(error?.code!=="EPERM")throw error;
        const resolved=path.resolve(String(value));
        const encoding=typeof options==="string"?options:options?.encoding;
        return encoding==="buffer"?Buffer.from(resolved):resolved;
      }
    }});
    Object.defineProperty(os,"tmpdir",{configurable:true,value:()=>sandboxTemp});
  }
  require("node:module").syncBuiltinESMExports();
  Object.defineProperty(globalThis,marker,{value:true});
}
`;
}
