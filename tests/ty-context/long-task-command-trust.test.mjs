import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runFrozenCommand } from "../../packages/ty-context/dist/lib/long-task-command-runner.js";
import { sealOracleBundle } from "../../packages/ty-context/dist/lib/long-task-oracle-bundle-store.js";
import { createHash } from "node:crypto";
import { LongTaskRedactorV3 } from "../../packages/ty-context/dist/lib/long-task-redaction.js";

const base={id:"VS-COMMAND",executable_path:process.execPath,argv:[],cwd:"repo_root",timeout_ms:5000,environment_refs:[],command_steps:[]};
const plan={required:false};
const redactor=new LongTaskRedactorV3({});
async function bundle(){const bytes=Buffer.from(`import {writeFileSync} from "node:fs";writeFileSync(3,JSON.stringify({schema_version:"ty-context-observation-v2",observations:{}}));`);const sha=createHash("sha256").update(bytes).digest("hex");const identity={spec_id:"VS-COMMAND",entrypoint:"oracle.mjs",bundle_store_key:sha,bundle_sha256:sha,bundle_size:bytes.length,metafile_sha256:sha,input_dependencies:[],bundler:{package_version:"0.28.1",package_integrity:"test",js_entry_sha256:sha,native_binary_sha256:sha},wrapper_sha256:sha,policy_sha256:sha};await sealOracleBundle(identity,bytes);return identity;}
test("wrong_cwd",async()=>{const snapshot=await mkdtemp(path.join(os.tmpdir(),"ltw-command-"));const output=await mkdtemp(path.join(os.tmpdir(),"ltw-output-"));await assert.rejects(()=>runFrozenCommand({...base,cwd:"../escape"},{},{},snapshot,output,path.join(output,"artifacts"),{},plan,null,null,{},redactor),/wrong_cwd/);});
test("path_shadowed_executable",async()=>{const snapshot=await mkdtemp(path.join(os.tmpdir(),"ltw-command-"));const output=await mkdtemp(path.join(os.tmpdir(),"ltw-output-"));const artifacts=path.join(output,"artifacts");await mkdir(artifacts);await writeFile(path.join(snapshot,process.platform==="win32"?"node.cmd":"node"),"malicious");const result=await runFrozenCommand(base,await bundle(),{},snapshot,output,artifacts,{},plan,null,null,{},redactor);assert.equal(result.executable,process.execPath);assert.equal(result.exit_code,0);assert.match(result.stdout_sha256,/^[a-f0-9]{64}$/);assert.match(result.stderr_sha256,/^[a-f0-9]{64}$/);});
