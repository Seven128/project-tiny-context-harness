import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StdioCodexAppServerClient, AmbiguousThreadLaunchError } from "../../packages/ty-context/dist/lib/codex-app-server-client.js";

const fake=path.join(path.dirname(fileURLToPath(import.meta.url)),"fake-codex-app-server.mjs");

test("JSONL App Server client correlates model, thread, Goal, Turn, completion, and interrupt",async()=>{
  const client=make({turns:[{outputText:'{"packet":true}'},{outputText:"done"},{outputText:"late",delayMs:1000}]});
  try{
    await client.initialize();assert.equal((await client.listModels()).length,3);
    const thread=await client.startThread({cwd:process.cwd(),model:"gpt-5.6-sol"});
    const author=await client.startTurn({threadId:thread.id,input:"author",model:"gpt-5.6-sol",effort:"xhigh",sandboxPolicy:{type:"readOnly",networkAccess:false},outputSchema:{type:"object"}});
    assert.equal((await client.waitForTurn(thread.id,author.id)).outputText,'{"packet":true}');
    const goal=await client.setGoal({threadId:thread.id,objective:"execute",status:"active"});assert.equal(goal.objective,"execute");
    const execution=await client.startTurn({threadId:thread.id,input:"execute",cwd:process.cwd(),model:"gpt-5.6-sol",effort:"medium",sandboxPolicy:{type:"workspaceWrite",writableRoots:[process.cwd()],networkAccess:false,excludeTmpdirEnvVar:false,excludeSlashTmp:false}});
    assert.equal((await client.waitForTurn(thread.id,execution.id)).status,"completed");
    const late=await client.startTurn({threadId:thread.id,input:"interrupt",sandboxPolicy:{type:"readOnly",networkAccess:false}});await client.interruptTurn(thread.id,late.id);assert.equal((await client.waitForTurn(thread.id,late.id)).status,"interrupted");
  }finally{await client.close();}
});

test("thread/start disconnect is fail-closed as ambiguous_host_thread_launch",async()=>{
  const client=make({disconnectOnThreadStart:true});
  try{await client.initialize();await assert.rejects(()=>client.startThread({cwd:process.cwd()}),AmbiguousThreadLaunchError);}finally{await client.close();}
});

test("thread/start timeout is also fail-closed as ambiguous_host_thread_launch",async()=>{
  const client=new StdioCodexAppServerClient({command:process.execPath,args:[fake],env:{FAKE_APP_SERVER_SCRIPT_JSON:JSON.stringify({hangOnThreadStart:true})},requestTimeoutMs:100,turnTimeoutMs:3000});
  try{await client.initialize();await assert.rejects(()=>client.startThread({cwd:process.cwd()}),AmbiguousThreadLaunchError);}finally{await client.close();}
});

function make(script){return new StdioCodexAppServerClient({command:process.execPath,args:[fake],env:{FAKE_APP_SERVER_SCRIPT_JSON:JSON.stringify(script)},requestTimeoutMs:3000,turnTimeoutMs:3000});}
