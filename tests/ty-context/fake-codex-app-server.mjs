import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const stateFile=process.env.FAKE_APP_SERVER_STATE_FILE;
const script=process.env.FAKE_APP_SERVER_SCRIPT_FILE?JSON.parse(readFileSync(process.env.FAKE_APP_SERVER_SCRIPT_FILE,"utf8")):process.env.FAKE_APP_SERVER_SCRIPT_JSON?JSON.parse(process.env.FAKE_APP_SERVER_SCRIPT_JSON):{};
const initial={nextThread:1,nextTurn:1,nextOutput:0,threads:{},goals:{},executionCounts:{}};
const state=stateFile&&existsSync(stateFile)?JSON.parse(readFileSync(stateFile,"utf8")):initial;
state.executionCounts??={};
const catalog=script.models??[
  model("gpt-5.6-sol",["low","medium","high","xhigh","max"]),
  model("gpt-5.6-terra",["low","medium","high","xhigh","max"]),
  model("gpt-5.6-luna",["low","medium","high","xhigh","max"])
];

createInterface({input:process.stdin,crlfDelay:Infinity}).on("line",async(line)=>{
  let message;try{message=JSON.parse(line);}catch{return;}
  log({direction:"in",message});
  if(!Object.hasOwn(message,"id")){if(message.method==="initialized")persist();return;}
  try{await handle(message);}catch(error){send({id:message.id,error:{code:-32000,message:error instanceof Error?error.message:String(error)}});}
});

async function handle({id,method,params={}}){
  if(method==="initialize")return respond(id,{userAgent:"fake-codex-app-server/0.4.0",codexHome:process.cwd(),platformFamily:process.platform==="win32"?"windows":"unix",platformOs:process.platform});
  if(method==="model/list")return respond(id,{data:catalog,nextCursor:null});
  if(method==="thread/start"){
    if(script.disconnectOnThreadStart){process.exit(71);return;}
    if(script.hangOnThreadStart)return;
    const threadId=`thr-${state.nextThread++}`;const thread=makeThread(threadId,params.cwd??process.cwd());state.threads[threadId]=thread;persist();return respond(id,{thread,model:params.model??"gpt-5.6-sol",modelProvider:"openai",serviceTier:null,cwd:thread.cwd,runtimeWorkspaceRoots:[thread.cwd],instructionSources:[],approvalPolicy:"never",approvalsReviewer:"app",sandbox:{type:"readOnly",networkAccess:false},activePermissionProfile:null,reasoningEffort:null,multiAgentMode:"explicitRequestOnly"});
  }
  if(method==="thread/resume"){const thread=requiredThread(params.threadId);return respond(id,{thread,model:"gpt-5.6-sol",modelProvider:"openai",serviceTier:null,cwd:thread.cwd,runtimeWorkspaceRoots:[thread.cwd],instructionSources:[],approvalPolicy:"never",approvalsReviewer:"app",sandbox:{type:"readOnly",networkAccess:false},activePermissionProfile:null,reasoningEffort:null,multiAgentMode:"explicitRequestOnly",initialTurnsPage:null});}
  if(method==="thread/read")return respond(id,{thread:requiredThread(params.threadId)});
  if(method==="thread/goal/set"){
    const thread=requiredThread(params.threadId);const goal={threadId:thread.id,objective:params.objective??state.goals[thread.id]?.objective??"",status:params.status??"active",tokenBudget:params.tokenBudget??null,tokensUsed:0,timeUsedSeconds:0,createdAt:Date.now()/1000,updatedAt:Date.now()/1000};state.goals[thread.id]=goal;persist();return respond(id,{goal});
  }
  if(method==="thread/goal/get")return respond(id,{goal:state.goals[params.threadId]??null});
  if(method==="turn/start"){
    const thread=requiredThread(params.threadId);const turnId=`turn-${state.nextTurn++}`;const running=turn(turnId,"inProgress",[]);thread.turns.push(running);thread.status={type:"active",activeFlags:[]};thread.cwd=params.cwd??thread.cwd;persist();respond(id,{turn:running});notify("turn/started",{threadId:thread.id,turn:running});
    const prompt=params.input?.find?.(item=>item.type==="text")?.text??"";const sliceId=/\bSFC-[0-9]{3,}\b/u.exec(prompt)?.[0];const repairId=/^Repair: (.+)$/mu.exec(prompt)?.[1]?.trim();
    let output;
    if(prompt.startsWith("Author CompositeAuthoringPacketV3")&&sliceId&&script.authorPackets?.[sliceId])output={status:"completed",outputText:script.authorPackets[sliceId]};
    else if(repairId&&script.repairEffects?.[repairId])output={status:"completed",outputText:"repair complete",sideEffect:script.repairEffects[repairId]};
    else if(sliceId&&script.executionEffects?.[sliceId]){const effect=script.executionEffects[sliceId];const count=(state.executionCounts[sliceId]??0)+1;state.executionCounts[sliceId]=count;output=count>=(effect.afterAttempts??1)?{status:"completed",outputText:"execution complete",sideEffect:effect}:{status:"completed",outputText:"needs work"};}
    else output=(script.turns??[])[state.nextOutput++]??{status:"completed",outputText:"{}",delayMs:0};persist();
    setTimeout(()=>{let selected=output;try{if(output.sideEffect)runSideEffect(output.sideEffect,params,prompt,state.goals[thread.id]?.objective??"",sliceId);}catch(error){selected={status:"failed",outputText:error instanceof Error?error.stack??error.message:String(error)};}const finished=turn(turnId,selected.status??"completed",selected.outputText===null?[]:[{type:"agentMessage",id:`item-${turnId}`,text:selected.outputText??"{}",phase:null,memoryCitation:null}]);const index=thread.turns.findIndex((item)=>item.id===turnId);thread.turns[index]=finished;thread.status={type:"idle"};persist();notify("turn/completed",{threadId:thread.id,turn:finished});},output.delayMs??0);return;
  }
  if(method==="turn/interrupt"){
    const thread=requiredThread(params.threadId);const index=thread.turns.findIndex((item)=>item.id===params.turnId);if(index<0)throw new Error("turn missing");thread.turns[index]=turn(params.turnId,"interrupted",thread.turns[index].items);thread.status={type:"idle"};persist();respond(id,{});notify("turn/completed",{threadId:thread.id,turn:thread.turns[index]});return;
  }
  throw new Error(`unsupported method ${method}`);
}

function model(name,efforts,upgrade=null){return{id:name,model:name,upgrade,upgradeInfo:upgrade?{model:upgrade}:null,availabilityNux:null,displayName:name,description:name,hidden:false,supportedReasoningEfforts:efforts.map(reasoningEffort=>({reasoningEffort,description:reasoningEffort})),defaultReasoningEffort:"medium",inputModalities:["text"],supportsPersonality:false,additionalSpeedTiers:[],serviceTiers:[],defaultServiceTier:null,isDefault:name==="gpt-5.6-sol"};}
function makeThread(id,cwd){return{id,sessionId:id,extra:null,forkedFromId:null,parentThreadId:null,preview:"",ephemeral:false,historyMode:"full",modelProvider:"openai",createdAt:Date.now()/1000,updatedAt:Date.now()/1000,recencyAt:null,status:{type:"idle"},path:null,cwd,cliVersion:"fake",source:"appServer",threadSource:null,agentNickname:null,agentRole:null,gitInfo:null,name:null,turns:[]};}
function turn(id,status,items){return{id,items,itemsView:{type:"full"},status,error:status==="failed"?{message:"scripted failure"}:null,startedAt:Date.now()/1000,completedAt:status==="inProgress"?null:Date.now()/1000,durationMs:status==="inProgress"?null:1};}
function requiredThread(id){const thread=state.threads[id];if(!thread)throw new Error(`thread missing ${id}`);return thread;}
function respond(id,result){send({id,result});}
function notify(method,params){send({method,params});}
function send(value){const line=JSON.stringify(value);log({direction:"out",message:value});process.stdout.write(`${line}\n`);}
function persist(){if(stateFile)writeFileSync(stateFile,JSON.stringify(state));}
function log(value){if(process.env.FAKE_APP_SERVER_LOG_FILE)appendFileSync(process.env.FAKE_APP_SERVER_LOG_FILE,`${JSON.stringify(value)}\n`);}

function runSideEffect(effect,params,prompt,goalObjective,sliceId){
  const cwd=params.cwd;if(effect.type==="git_repair"){if(!cwd)throw new Error("repair cwd missing");for(const file of effect.files??[]){const target=path.join(cwd,file.path);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,file.content);}run("git",["add","-A"],cwd);run("git",["-c","commit.gpgSign=false","commit","-m","fix: repair Campaign integration"],cwd);return;}
  if(effect.type!=="contract_v3")throw new Error(`unsupported side effect ${effect.type}`);const identity=`${prompt}\n${goalObjective}`;const workdir=/^Contract workdir: (.+)$/mu.exec(identity)?.[1]?.trim();const campaign=/^Campaign: (.+)$/mu.exec(identity)?.[1]?.trim();if(!cwd||!workdir||!campaign||!sliceId)throw new Error("execution prompt identities missing");
  run(process.execPath,[process.env.FAKE_TY_CONTEXT_CLI,"composite-long-task","compile",workdir,"--campaign-id",campaign,"--slice-id",sliceId],cwd);
  for(const file of effect.files??[]){const target=path.join(cwd,file.path);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,file.content);}
  run("git",["add","-A"],cwd);run("git",["-c","commit.gpgSign=false","commit","-m",`feat: implement ${sliceId}`],cwd);
  run(process.execPath,[process.env.FAKE_TY_CONTEXT_CLI,"composite-long-task","final-gate",workdir],cwd);
}
function run(command,args,cwd){const result=spawnSync(command,args,{cwd,encoding:"utf8",windowsHide:true,env:{...process.env,NO_COLOR:"1"}});if(result.status!==0)throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}\n${result.stdout}`);}
