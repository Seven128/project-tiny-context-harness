import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";

export interface DurableJsonWriteV3 { bytes:Buffer;sha256:string }
export interface DurableJsonWriteOptionsV3 { fault?:(point:"after_file_sync"|"after_rename"|"after_parent_sync")=>void; mode?:0o600|0o644 }

export async function writeDurableCanonicalJsonV3(file:string,value:unknown,options:DurableJsonWriteOptionsV3={}):Promise<DurableJsonWriteV3>{
  const bytes=Buffer.from(canonicalJson(value),"utf8");await mkdir(path.dirname(file),{recursive:true});const temporary=path.join(path.dirname(file),`.${path.basename(file)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);const handle=await open(temporary,"wx",0o600);
  try{await handle.writeFile(bytes);await handle.sync();await handle.chmod(options.mode??0o644);await handle.sync();}finally{await handle.close();}
  options.fault?.("after_file_sync");
  try{await rename(temporary,file);}catch(error){await rm(temporary,{force:true});throw error;}
  options.fault?.("after_rename");await syncDirectory(path.dirname(file));options.fault?.("after_parent_sync");const reread=await readFile(file);if(!reread.equals(bytes))throw new Error("final_result_hash_mismatch:durable_reread");return {bytes:reread,sha256:sha256Hex(reread)};
}

export async function readCanonicalJsonV3<T>(file:string,maximumBytes=64*1024*1024):Promise<{value:T;bytes:Buffer;sha256:string}>{const bytes=await readFile(file);if(bytes.length===0||bytes.length>maximumBytes)throw new Error("final_result_incomplete:size");const text=bytes.toString("utf8");let value:T;try{value=parseStrictJson(text) as T;}catch{throw new Error("final_result_incomplete:json");}if(canonicalJson(value)!==text)throw new Error("final_result_incomplete:noncanonical");return {value,bytes,sha256:sha256Hex(bytes)};}

async function syncDirectory(directory:string):Promise<void>{try{const handle=await open(directory,"r");try{await handle.sync();}finally{await handle.close();}}catch(error){if(!["EINVAL","EISDIR","EPERM","EACCES"].includes((error as NodeJS.ErrnoException).code??""))throw error;}}
