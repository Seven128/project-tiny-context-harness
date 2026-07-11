import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runFrozenCommand } from "../../packages/ty-context/dist/lib/long-task-command-runner.js";

const base={id:"VS-COMMAND",executable_path:process.execPath,argv:["oracle.mjs"],cwd:"repo_root",timeout_ms:5000};
test("wrong_cwd",async()=>{const snapshot=await mkdtemp(path.join(os.tmpdir(),"ltw-command-"));const output=await mkdtemp(path.join(os.tmpdir(),"ltw-output-"));await assert.rejects(()=>runFrozenCommand({...base,cwd:"../escape"},snapshot,output,path.join(output,"artifacts")),/wrong_cwd/);});
test("path_shadowed_executable",async()=>{const snapshot=await mkdtemp(path.join(os.tmpdir(),"ltw-command-"));const output=await mkdtemp(path.join(os.tmpdir(),"ltw-output-"));const artifacts=path.join(output,"artifacts");await mkdir(artifacts);await writeFile(path.join(snapshot,"oracle.mjs"),"console.log('trusted')\n");await writeFile(path.join(snapshot,process.platform==="win32"?"node.cmd":"node"),"malicious");const result=await runFrozenCommand(base,snapshot,output,artifacts);assert.equal(result.executable,process.execPath);assert.equal(result.exit_code,0);assert.match(result.stdout_sha256,/^[a-f0-9]{64}$/);assert.match(result.stderr_sha256,/^[a-f0-9]{64}$/);});
