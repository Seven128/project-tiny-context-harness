import test from "node:test";
import assert from "node:assert/strict";
import { chmod, rm, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { oracleBundleStorePath, sealOracleBundle, verifyStoredOracleBundle } from "../../packages/ty-context/dist/lib/long-task-oracle-bundle-store.js";

const hash=(value)=>createHash("sha256").update(value).digest("hex");
function identity(bytes){const sha=hash(bytes);return {spec_id:`VS-${randomUUID()}`,entrypoint:"tests/oracle.mjs",bundle_store_key:sha,bundle_sha256:sha,bundle_size:bytes.length,metafile_sha256:sha,input_dependencies:[],bundler:{package_version:"0.28.1",package_integrity:"test",js_entry_sha256:sha,native_binary_sha256:sha},wrapper_sha256:sha,policy_sha256:sha};}
test("bundle store is create-only and verifies bytes again before runtime",async()=>{const bytes=Buffer.from(`// ${randomUUID()}\n`);const value=identity(bytes);const file=await sealOracleBundle(value,bytes);assert.equal(file,await verifyStoredOracleBundle(value));await sealOracleBundle(value,bytes);await chmod(file,0o666);await writeFile(file,Buffer.alloc(bytes.length,0x78));await assert.rejects(()=>verifyStoredOracleBundle(value),/oracle_bundle_store_corrupt/);await chmod(file,0o666);await rm(file,{force:true});assert.equal(file,oracleBundleStorePath(value.bundle_store_key));});
