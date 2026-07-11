import test from "node:test";
import assert from "node:assert/strict";
import { link, mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { collectFrozenArtifacts } from "../../packages/ty-context/dist/lib/long-task-artifact-collector.js";

const spec={id:"VS-ATTACK",artifact_globs:["allowed/**"]};
async function root(){return mkdtemp(path.join(os.tmpdir(),"ltw-artifact-"));}
test("undeclared_artifact_path",async()=>{const r=await root();await writeFile(path.join(r,"evil.json"),"{}");await assert.rejects(()=>collectFrozenArtifacts(spec,r,new Date(0).toISOString()),/undeclared_artifact_path/);});
test("artifact_predates_command",async()=>{const r=await root();await mkdir(path.join(r,"allowed"));await writeFile(path.join(r,"allowed/a.json"),"{}");await assert.rejects(()=>collectFrozenArtifacts(spec,r,new Date(Date.now()+10000).toISOString()),/artifact_predates_command/);});
test("artifact_symlink_escape",async(t)=>{const r=await root();await mkdir(path.join(r,"allowed"));try{await symlink(path.join(os.tmpdir(),"outside"),path.join(r,"allowed/link"));}catch(e){t.skip(`symlink unavailable: ${e.code}`);return;}await assert.rejects(()=>collectFrozenArtifacts(spec,r,new Date(0).toISOString()),/artifact_symlink_escape/);});
test("artifact_hardlink_escape",async()=>{const r=await root();await mkdir(path.join(r,"allowed"));const outside=path.join(r,"outside");await writeFile(outside,"x");await link(outside,path.join(r,"allowed/a"));await assert.rejects(()=>collectFrozenArtifacts(spec,r,new Date(0).toISOString()),/artifact_hardlink_escape/);});
test("artifact_junction_escape_windows",async(t)=>{if(process.platform!=="win32"){t.skip("Windows junction case");return;}const r=await root();await mkdir(path.join(r,"allowed"));const outside=await root();try{await symlink(outside,path.join(r,"allowed/junction"),"junction");}catch(e){t.skip(`junction unavailable: ${e.code}`);return;}await assert.rejects(()=>collectFrozenArtifacts(spec,r,new Date(0).toISOString()),/artifact_symlink_escape/);});
