import { chmod, lstat, mkdir, open, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";
import type { OracleBundleV3 } from "./long-task-contract-schema.js";

const STORE_ROOT=path.join(os.tmpdir(),"project-tiny-context-harness-host-v3","bundles");
export function oracleBundleStorePath(key:string):string{if(!/^[a-f0-9]{64}$/u.test(key))throw new Error(`oracle_bundle_key_invalid:${key}`);return path.join(STORE_ROOT,`${key}.mjs`);}
export async function sealOracleBundle(identity:OracleBundleV3,bytes:Uint8Array):Promise<string>{
  if(sha256Hex(bytes)!==identity.bundle_sha256||bytes.byteLength!==identity.bundle_size)throw new Error(`oracle_bundle_identity_mismatch:${identity.spec_id}`);
  await mkdir(STORE_ROOT,{recursive:true});const file=oracleBundleStorePath(identity.bundle_store_key);
  try{const handle=await open(file,"wx",0o444);try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}await chmod(file,0o444);}catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;}
  await verifyStoredOracleBundle(identity);return file;
}
export async function verifyStoredOracleBundle(identity:OracleBundleV3):Promise<string>{const file=oracleBundleStorePath(identity.bundle_store_key);const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size!==identity.bundle_size)throw new Error(`oracle_bundle_store_corrupt:${identity.spec_id}`);const bytes=await readFile(file);if(sha256Hex(bytes)!==identity.bundle_sha256)throw new Error(`oracle_bundle_store_corrupt:${identity.spec_id}`);return file;}
