import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

interface RedactionPatternV3 { bytes:Buffer; replacement:Buffer; ref:string }
export interface ArtifactRedactionResultV3 { redacted_text_files:string[]; binary_rejections:Array<{path:string;sha256:string;size:number;disposition:"destroyed_after_detection"}> }

export class LongTaskRedactorV3 {
  readonly patterns:RedactionPatternV3[];
  readonly maximum_pattern_bytes:number;
  constructor(secrets:Readonly<Record<string,string>>){
    const patterns=new Map<string,RedactionPatternV3>();
    for(const [ref,value] of Object.entries(secrets).sort(([a],[b])=>a.localeCompare(b))){
      if(Buffer.byteLength(value,"utf8")<4)throw new Error(`secret_value_too_short:${ref}`);
      const raw=Buffer.from(value,"utf8");const variants=new Set([value,encodeURIComponent(value),encodeURIComponent(value).replace(/%20/gu,"+"),JSON.stringify(value).slice(1,-1),raw.toString("base64"),raw.toString("base64url"),raw.toString("hex"),`${ref}=${value}`,`${ref.toLowerCase()}=${value}`]);
      for(const variant of variants){if(!variant)continue;const bytes=Buffer.from(variant,"utf8");const key=bytes.toString("base64");const current=patterns.get(key);if(!current||ref.localeCompare(current.ref)<0)patterns.set(key,{bytes,replacement:Buffer.from(`[REDACTED:${ref}]`),ref});}
    }
    this.patterns=[...patterns.values()].sort((a,b)=>b.bytes.length-a.bytes.length||a.ref.localeCompare(b.ref)||Buffer.compare(a.bytes,b.bytes));this.maximum_pattern_bytes=Math.max(1,...this.patterns.map((item)=>item.bytes.length));
  }
  redactBuffer(value:Buffer):Buffer{return this.transform(value).buffer;}
  redactText(value:string):string{return this.redactBuffer(Buffer.from(value,"utf8")).toString("utf8");}
  containsSecret(value:Buffer):boolean{return this.patterns.some((pattern)=>value.indexOf(pattern.bytes)!==-1);}
  stream():StreamingLongTaskRedactorV3{return new StreamingLongTaskRedactorV3(this);}
  transform(value:Buffer):{buffer:Buffer;matches:number}{const chunks:Buffer[]=[];let matches=0;for(let offset=0;offset<value.length;){const pattern=this.patterns.find((item)=>value.subarray(offset,offset+item.bytes.length).equals(item.bytes));if(pattern){chunks.push(pattern.replacement);offset+=pattern.bytes.length;matches++;}else{chunks.push(value.subarray(offset,offset+1));offset++;}}return {buffer:Buffer.concat(chunks),matches};}
}

export class StreamingLongTaskRedactorV3 {
  private pending=Buffer.alloc(0);
  constructor(private readonly redactor:LongTaskRedactorV3){}
  push(chunk:Buffer):Buffer{const combined=Buffer.concat([this.pending,Buffer.from(chunk)]);const safe=Math.max(0,combined.length-(this.redactor.maximum_pattern_bytes-1));const chunks:Buffer[]=[];let offset=0;while(offset<safe){const pattern=this.redactor.patterns.find((item)=>combined.subarray(offset,offset+item.bytes.length).equals(item.bytes));if(pattern){chunks.push(pattern.replacement);offset+=pattern.bytes.length;}else{chunks.push(combined.subarray(offset,offset+1));offset++;}}this.pending=combined.subarray(offset);return Buffer.concat(chunks);}
  finish():Buffer{const value=this.redactor.redactBuffer(this.pending);this.pending=Buffer.alloc(0);return value;}
}

export async function sanitizeLongTaskArtifacts(artifactRoot:string,quarantineRoot:string,redactor:LongTaskRedactorV3):Promise<ArtifactRedactionResultV3>{const result:ArtifactRedactionResultV3={redacted_text_files:[],binary_rejections:[]};async function visit(directory:string,relative=""):Promise<void>{for(const entry of await readdir(directory,{withFileTypes:true})){const rel=relative?`${relative}/${entry.name}`:entry.name;const file=path.join(directory,entry.name);const info=await lstat(file);if(info.isSymbolicLink()||(!entry.isDirectory()&&!entry.isFile()))continue;if(entry.isDirectory()){await visit(file,rel);continue;}const bytes=await readFile(file);if(!redactor.containsSecret(bytes))continue;if(isText(bytes)){const transformed=redactor.redactBuffer(bytes);await writeFile(file,transformed);result.redacted_text_files.push(rel);}else{result.binary_rejections.push({path:rel,sha256:sha256Hex(bytes),size:bytes.length,disposition:"destroyed_after_detection"});await rm(file,{force:true});}}}await visit(artifactRoot);result.redacted_text_files.sort();result.binary_rejections.sort((a,b)=>a.path.localeCompare(b.path));if(result.redacted_text_files.length||result.binary_rejections.length){await mkdir(quarantineRoot,{recursive:true});await writeFile(path.join(quarantineRoot,"redaction-manifest.json"),canonicalJson(result));}if(result.binary_rejections.length)throw new Error(`secret_leak_detected:binary:${result.binary_rejections.map((item)=>item.path).join(",")}`);return result;}
function isText(value:Buffer):boolean{for(const byte of value)if(byte===0||(byte<9)||(byte>13&&byte<32))return false;try{new TextDecoder("utf-8",{fatal:true}).decode(value);return true;}catch{return false;}}
