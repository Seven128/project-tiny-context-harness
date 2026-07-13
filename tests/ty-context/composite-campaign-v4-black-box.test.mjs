import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const cliPath=path.join(repoRoot,"packages","ty-context","dist","cli.js");
const suiteStarted=Date.now();

test("two independent SFCs launch in one real concurrent worktree wave",{timeout:120_000},async()=>{
  const fixture=await setup("parallel",[
    slice("SFC-001","slice-a","src/a.txt","value.a","standard"),
    slice("SFC-002","slice-b","src/b.txt","value.b","standard")
  ]);
  const launch=advance(fixture);assert.equal(launch.action,"launch_wave");assert.deepEqual(launch.goals.map((goal)=>goal.slice_id).sort(),["SFC-001","SFC-002"]);
  const concurrency={active:0,max:0};await Promise.all(launch.goals.map((goal)=>executeGoal(fixture,launch.wave_id,goal,async(root)=>{await writeFile(path.join(root,goal.slice_id==="SFC-001"?"src/a.txt":"src/b.txt"),"good\n");},concurrency)));
  assert.equal(concurrency.max,2,"Fake Goal adapter must overlap the complete wave before waiting");
  const finished=advance(fixture,120_000);assert.equal(finished.action,"finished");assert.equal(finished.campaign_status,"accepted");assert.match(await readFile(path.join(fixture.root,"src/a.txt"),"utf8"),/good/);assert.match(await readFile(path.join(fixture.root,"src/b.txt"),"utf8"),/good/);
});

test("overlapping package state serializes and the next worktree uses the integration head",{timeout:120_000},async()=>{
  const fixture=await setup("serial",[
    slice("SFC-001","package-a","package.json","package.a","package-a"),
    slice("SFC-002","package-b","package.json","package.b","package-b")
  ],{"package.json":"{}\n"});
  const first=advance(fixture);assert.equal(first.action,"launch_wave");assert.equal(first.goals.length,1);const firstManifest=await manifest(fixture,first.wave_id,first.goals[0].slice_id);
  await executeGoal(fixture,first.wave_id,first.goals[0],async(root)=>writeFile(path.join(root,"package.json"),'{"a":true}\n'));
  const second=advance(fixture,120_000);assert.equal(second.action,"launch_wave");assert.equal(second.goals.length,1);assert.notEqual(second.goals[0].slice_id,first.goals[0].slice_id);const secondManifest=await manifest(fixture,second.wave_id,second.goals[0].slice_id);assert.notEqual(secondManifest.base_commit,firstManifest.base_commit);
  await executeGoal(fixture,second.wave_id,second.goals[0],async(root)=>writeFile(path.join(root,"package.json"),'{"a":true,"b":true}\n'));
  const finished=advance(fixture,120_000);assert.equal(finished.action,"finished");assert.deepEqual(JSON.parse(await readFile(path.join(fixture.root,"package.json"),"utf8")),{a:true,b:true});
});

test("a real parallel merge conflict creates a repair worktree and finishes without a user decision",{timeout:120_000},async()=>{
  const fixture=await setup("merge-repair",[
    slice("SFC-001","merge-a","src/a.txt","value.a","standard"),
    slice("SFC-002","merge-b","src/b.txt","value.b","standard")
  ],{"shared.txt":"base\n"});
  const launch=advance(fixture);assert.equal(launch.goals.length,2);
  await Promise.all(launch.goals.map((goal)=>executeGoal(fixture,launch.wave_id,goal,async(root)=>{await writeFile(path.join(root,goal.slice_id==="SFC-001"?"src/a.txt":"src/b.txt"),"good\n");await writeFile(path.join(root,"shared.txt"),`${goal.slice_id}\n`);})));
  const repair=advance(fixture,120_000);assert.equal(repair.action,"repair_integration");assert.equal(repair.reason,"merge_conflict");
  runCli(fixture.root,["composite-campaign","bind-repair-goal","--campaign",fixture.campaignPath,"--repair-id",repair.repair_id,"--goal-id","goal-merge-repair","--launch-token",repair.launch_token,"--json"]);
  await writeFile(path.join(repair.worktree,"shared.txt"),"SFC-001 + SFC-002\n");git(repair.worktree,["add","-A"]);git(repair.worktree,["commit","--no-gpg-sign","-m","fix: repair wave merge"]);
  const finished=advance(fixture,120_000);assert.equal(finished.action,"finished");assert.match(await readFile(path.join(fixture.root,"shared.txt"),"utf8"),/SFC-001 \+ SFC-002/);
});

test("combined regression stays unaccepted until an integration repair passes",{timeout:120_000},async()=>{
  const fixture=await setup("integration-repair",[
    slice("SFC-001","regression-a","src/a.txt","value.a","regression-a"),
    slice("SFC-002","regression-b","src/b.txt","value.b","regression-b")
  ],{"src/a.txt":"good\n","src/b.txt":"safe\n"});
  const launch=advance(fixture);assert.equal(launch.goals.length,2);
  await Promise.all(launch.goals.map((goal)=>executeGoal(fixture,launch.wave_id,goal,async(root)=>writeFile(path.join(root,goal.slice_id==="SFC-001"?"src/a.txt":"src/b.txt"),goal.slice_id==="SFC-001"?"good\n":"break-a\n"))));
  const repair=advance(fixture,120_000);assert.equal(repair.action,"repair_integration");assert.equal(repair.reason,"integration_regression");
  runCli(fixture.root,["composite-campaign","bind-repair-goal","--campaign",fixture.campaignPath,"--repair-id",repair.repair_id,"--goal-id","goal-integration-repair","--launch-token",repair.launch_token,"--json"]);
  const interim=runCli(fixture.root,["composite-campaign","status","--campaign",fixture.campaignPath,"--json"]);assert.notEqual(interim.derived_status,"accepted");
  await writeFile(path.join(repair.worktree,"src/a.txt"),"compatible\n");git(repair.worktree,["add","-A"]);git(repair.worktree,["commit","--no-gpg-sign","-m","fix: repair combined regression"]);
  const finished=advance(fixture,120_000);assert.equal(finished.action,"finished");assert.equal(finished.campaign_status,"accepted");
});

test("Campaign V4 black-box suite remains below five minutes",()=>{assert.ok(Date.now()-suiteStarted<300_000);});

async function setup(name,slices,extraFiles={}){
  const root=await mkdtemp(path.join(os.tmpdir(),`campaign-v4-${name}-`));const authored=await writeHappyV3Contract(root);const base=await authorities(authored);
  for(const [file,content] of Object.entries(extraFiles)){await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),content);}
  for(let index=0;index<slices.length;index++){const item=slices[index];await mkdir(path.dirname(path.join(root,item.bindingPath)),{recursive:true});if(!(item.bindingPath in extraFiles))await writeFile(path.join(root,item.bindingPath),item.mode.startsWith("package-")?"{}\n":item.mode==="regression-b"?"safe\n":"old\n");const contextPath=`project_context/${item.stableKey}.md`;await writeFile(path.join(root,contextPath),`# ${item.stableKey}\n`);item.contextPath=contextPath;item.oraclePath=`tests/acceptance/oracle-${index+1}.mjs`;await writeFile(path.join(root,item.oraclePath),oracle(item,index));}
  const plan=slices.map((item,index)=>`SRC-${String(index+1).padStart(3,"0")}: ${item.stableKey}`).join("\n")+"\n";await writeFile(path.join(root,"plan.md"),plan);const campaignId=`campaign-${name}`;const created=runCli(root,["composite-campaign","create","--id",campaignId,"--plan-file","plan.md","--json"]);const campaignPath=path.relative(root,created.campaign_path);const sourceHash=sha(plan);
  const scope={schema_version:"scope-fit-result-v3",request_sha256:sourceHash,decision:slices.length===1?"fit_for_three_inputs":"split_required",campaign_goal:name,global_constraints:[],slices:slices.map((item,index)=>({slice_id:item.sliceId,stable_key:item.stableKey,title:item.stableKey,objective:item.stableKey,depends_on:[],priority:1,source_refs:[`SRC-${String(index+1).padStart(3,"0")}`],scope_summary:[item.stableKey],out_of_scope:[],produces_contracts:[],consumes_contracts:[],conflict_domains:[item.stableKey],resource_locks:[]})),decision_required:null};
  const coverage={schema_version:"composite-source-coverage-v1",source_plan_sha256:sourceHash,items:slices.map((item,index)=>({source_item_id:`SRC-${String(index+1).padStart(3,"0")}`,statement:item.stableKey,disposition:"slice",slice_refs:[item.sliceId],global_constraint_refs:[],rationale:"owned by one Slice"})),global_constraint_bindings:[]};await writeFile(path.join(root,"scope.json"),JSON.stringify(scope));await writeFile(path.join(root,"coverage.json"),JSON.stringify(coverage));runCli(root,["composite-campaign","apply-scope","--campaign",campaignPath,"--input","scope.json","--coverage","coverage.json","--json"]);
  for(let index=0;index<slices.length;index++){const packet=makePacket(base,campaignId,slices[index],index);const file=`packet-${index+1}.json`;await writeFile(path.join(root,file),JSON.stringify(packet));runCli(root,["composite-campaign","apply-packet","--campaign",campaignPath,"--slice",slices[index].sliceId,"--input",file,"--json"]);runCli(root,["composite-campaign","preflight","--campaign",campaignPath,"--slice",slices[index].sliceId,"--json"]);}
  return{root,campaignId,campaignPath,campaignRoot:created.campaign_path,slices};
}

function slice(sliceId,stableKey,bindingPath,capability,mode){return{sliceId,stableKey,bindingPath,capability,mode,contextPath:"",oraclePath:""};}
async function authorities(task){return{product_architecture_source:YAML.parse(await readFile(path.join(task,"product-architecture-source.yaml"),"utf8")),technical_realization_plan:YAML.parse(await readFile(path.join(task,"technical-realization-plan.yaml"),"utf8")),acceptance_checklist:YAML.parse(await readFile(path.join(task,"acceptance-checklist.yaml"),"utf8"))};}
function makePacket(base,campaignId,item,index){const code=String((index+1)*100+1);const replacements={"CF-PI-001-OB-001":`CF-PI-${code}-OB-001`,"PI-001-OB-001":`PI-${code}-OB-001`,"PRF-AC-001-RUNTIME":`PRF-AC-${code}-RUNTIME`,"OS-RUNTIME":`OS-${code}`,"PR-001":`PR-${code}`,"PB-001":`PB-${code}`,"NCO-001":`NCO-${code}`,"PI-001":`PI-${code}`,"IB-001":`IB-${code}`,"IB-002":`IB-${Number(code)+1}`,"FS-001":`FS-${code}`,"AC-001":`AC-${code}`,"VS-AC-001":`VS-AC-${code}`,"CMD-001":`CMD-${code}`,"PA-001":`PA-${code}`,"NA-001":`NA-${code}`};let text=JSON.stringify(base);for(const [from,to] of Object.entries(replacements).sort((a,b)=>b[0].length-a[0].length))text=text.replaceAll(from,to);const value=JSON.parse(text);const product=value.product_architecture_source,plan=value.technical_realization_plan,checklist=value.acceptance_checklist;product.requirements[0].context_refs=[item.contextPath];plan.plan_items[0].obligations[0].implementation_bindings[0].target=item.bindingPath;plan.plan_items[0].obligations[0].implementation_bindings[1].target=item.capability;const spec=checklist.verification_specs[0];spec.oracle.entrypoint=item.oraclePath;spec.input_paths=[item.bindingPath];spec.command_steps[0].target=item.oraclePath;spec.positive_assertions[0].expected={binding_id:`IB-${Number(code)+1}`,capability:item.capability,value:"good"};return{schema_version:"composite-authoring-packet-v3",campaign_id:campaignId,slice_id:item.sliceId,revision:1,previous_packet_sha256:null,authorities:value};}

function oracle(item,index){const binding=`IB-${(index+1)*100+2}`;const own=`../../${item.bindingPath}`.replaceAll("\\","/");let body=`const own=await read(${JSON.stringify(own)});let value=own?.trim()??null;`;if(item.mode==="package-a")body=`const own=await read("../../package.json");let value=own&&JSON.parse(own).a===true?"good":"bad";`;if(item.mode==="package-b")body=`const own=await read("../../package.json");let value=own&&JSON.parse(own).b===true?"good":"bad";`;if(item.mode==="regression-a")body=`const own=await read("../../src/a.txt");const peer=await read("../../src/b.txt");let value=!own?"missing":(own.trim()==="compatible"||peer?.trim()==="safe")?"good":"regressed";`;if(item.mode==="regression-b")body=`const own=await read("../../src/b.txt");let value=own?.trim()==="break-a"?"good":"bad";`;return`import {readFile} from "node:fs/promises";\nconst read=(file)=>readFile(new URL(file,import.meta.url),"utf8").catch(()=>null);\n${body}\nconsole.log(JSON.stringify({schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:${JSON.stringify(binding)},capability:${JSON.stringify(item.capability)},value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}}));\n`;}

async function executeGoal(fixture,waveId,goal,mutate,concurrency={active:0,max:0}){runCli(fixture.root,["composite-campaign","bind-goal","--campaign",fixture.campaignPath,"--slice",goal.slice_id,"--goal-id",`goal-${waveId}-${goal.slice_id}`,"--launch-token",goal.launch_token,"--json"]);concurrency.active++;concurrency.max=Math.max(concurrency.max,concurrency.active);try{await new Promise((resolve)=>setTimeout(resolve,30));await mutate(goal.worktree);git(goal.worktree,["add","-A"]);git(goal.worktree,["commit","--no-gpg-sign","-m",`feat: ${goal.slice_id}`]);const data=await manifest(fixture,waveId,goal.slice_id);runCli(goal.worktree,["composite-long-task","compile",data.contract_workdir,"--campaign-id",fixture.campaignId,"--slice-id",goal.slice_id]);const final=runCli(goal.worktree,["composite-long-task","final-gate",data.contract_workdir],120_000);assert.equal(final.workflow_status,"accepted");runCli(fixture.root,["composite-campaign","record-result","--campaign",fixture.campaignPath,"--slice",goal.slice_id,"--goal-id",`goal-${waveId}-${goal.slice_id}`,"--workdir",data.contract_workdir,"--json"],120_000);}finally{concurrency.active--;}}
async function manifest(fixture,waveId,sliceId){return JSON.parse(await readFile(path.join(fixture.campaignRoot,"waves",waveId,"goals",sliceId,"goal-manifest.json"),"utf8"));}
function advance(fixture,timeout=30_000){return runCli(fixture.root,["composite-campaign","advance","--campaign",fixture.campaignPath,"--json"],timeout);}
function runCli(root,args,timeout=30_000){const result=spawnSync(process.execPath,[cliPath,...args],{cwd:root,encoding:"utf8",timeout,env:{...process.env,NO_COLOR:"1"}});assert.equal(result.status,0,`CLI failed: ${result.stderr}\n${result.stdout}`);const line=result.stdout.trim().split(/\r?\n/u).at(-1);return line?.startsWith("{")||line?.startsWith("[")?JSON.parse(line):result.stdout.trim();}
function git(root,args){const result=spawnSync("git",args,{cwd:root,encoding:"utf8",windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
function sha(value){return createHash("sha256").update(value).digest("hex");}
