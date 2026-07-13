import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CodexAppServerClient, CodexTurn, TurnCompletion } from "./codex-app-server-protocol.js";
import { canonicalValueJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { CampaignMutationQueue } from "./composite-campaign-mutation-queue.js";
import { readSliceGoalManifest, renderSliceGoalObjectiveV2, type SliceGoalManifestV2 } from "./composite-campaign-goal-manifest.js";
import { bindCampaignGoalV4, recordCampaignResultV4, type CampaignAdvanceActionV4 } from "./composite-campaign-orchestrator.js";
import { completeThreadTurnV5, recordExecutionTurnV5 } from "./composite-campaign-thread-state.js";
import { loadCampaignV5, updateSliceThreadV5 } from "./composite-campaign-v5.js";

export interface GoalRunnerInput {
  client: CodexAppServerClient;
  projectRoot: string;
  campaignPath: string;
}

type LaunchWaveAction = Extract<CampaignAdvanceActionV4, { action: "launch_wave" }>;

export async function launchCampaignWaveV5(input: GoalRunnerInput, action: LaunchWaveAction): Promise<{ wave_id: string; turn_ids: string[] }> {
  const queue = new CampaignMutationQueue();
  const started = await Promise.all(action.goals.map((goal) => launchSlice(input, action.wave_id, goal.slice_id, queue)));
  return { wave_id: action.wave_id, turn_ids: started };
}

export async function waitCampaignGoalsV5(input: GoalRunnerInput): Promise<{ accepted_slice_ids: string[] }> {
  const campaign = (await loadCampaignV5(input.projectRoot, input.campaignPath)).campaign;
  const sliceIds = Object.entries(campaign.slices).filter(([, slice]) => slice.status === "goal_running").map(([sliceId]) => sliceId).sort(ascii);
  const queue = new CampaignMutationQueue();
  await Promise.all(sliceIds.map((sliceId) => runSliceUntilAccepted(input, sliceId, queue)));
  return { accepted_slice_ids: sliceIds };
}

async function launchSlice(input: GoalRunnerInput, waveId: string, sliceId: string, queue: CampaignMutationQueue): Promise<string> {
  let loaded = await loadCampaignV5(input.projectRoot, input.campaignPath); let slice = loaded.campaign.slices[sliceId];
  if (!slice || slice.status !== "worktree_ready" || slice.thread.phase !== "worktree_ready" || !slice.thread.thread_id || !slice.thread.execution_profile || slice.packet_revision === null) throw new Error(`campaign_slice_not_launchable:${sliceId}`);
  const manifest = requireV2(await readSliceGoalManifest(path.join(loaded.root, "waves", waveId, "goals", sliceId, "goal-manifest.json"))); const objective = await readFile(path.join(manifest.contract_workdir, "goal-objective.txt"), "utf8");
  if (objective.length > 4000) throw new Error("goal_objective_too_long:maximum_4000_characters");if(objective!==renderSliceGoalObjectiveV2(manifest))throw new Error("goal_objective_manifest_mismatch"); if (manifest.thread_id !== slice.thread.thread_id) throw new Error("goal_manifest_thread_mismatch");
  await input.client.resumeThread(manifest.thread_id);
  const existing = await input.client.getGoal(manifest.thread_id);
  if (existing && existing.objective !== objective) throw new Error("app_server_goal_objective_mismatch");
  if (!existing) await input.client.setGoal({ threadId: manifest.thread_id, objective, status: "active" });
  await queue.run(() => bindCampaignGoalV4(input.projectRoot, input.campaignPath, sliceId, manifest.thread_id, manifest.launch_token));
  loaded = await loadCampaignV5(input.projectRoot, input.campaignPath); slice = loaded.campaign.slices[sliceId];
  if (slice.thread.active_turn_id) return slice.thread.active_turn_id;
  return startExecutionTurn(input, sliceId, objective, queue);
}

async function runSliceUntilAccepted(input: GoalRunnerInput, sliceId: string, queue: CampaignMutationQueue): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let loaded = await loadCampaignV5(input.projectRoot, input.campaignPath); let slice = loaded.campaign.slices[sliceId];
    if (slice.status === "accepted") return;
    const manifest = await manifestFor(loaded.root, sliceId, slice.wave_id); let turnId = slice.thread.active_turn_id;
    if (!turnId) turnId = await startExecutionTurn(input, sliceId, attempt === 0 ? await readFile(path.join(manifest.contract_workdir, "goal-objective.txt"), "utf8") : "Resume this Goal after host recovery. Re-read the Goal and current worktree, then continue the required verify/repair/commit/final-gate loop.", queue);
    const completion = await currentOrWait(input.client, manifest.thread_id, turnId);
    const outcome=terminalOutcome(completion.status);await queue.run(() => updateSliceThreadV5(input.projectRoot, input.campaignPath, sliceId, "execution_turn_completed", (state) => completeThreadTurnV5(state, outcome)));
    if (completion.status === "interrupted") { await input.client.resumeThread(manifest.thread_id); await startExecutionTurn(input, sliceId, "The prior Execution Turn was interrupted. Resume the same Goal from the current worktree without resetting or duplicating work. Re-run required verification and finish with a fresh final-gate.", queue); continue; }
    if (outcome !== "completed") throw new Error(`app_server_execution_turn_failed:${sliceId}:${completion.status}:${errorText(completion.turn.error)}`);
    loaded = await loadCampaignV5(input.projectRoot, input.campaignPath); slice = loaded.campaign.slices[sliceId];
    const result = await readResult(manifest.contract_workdir);
    if (result.workflow_status === "accepted") {
      try { await queue.run(() => recordCampaignResultV4(input.projectRoot, input.campaignPath, sliceId, manifest.thread_id, manifest.contract_workdir)); }
      catch (error) { await startExecutionTurn(input, sliceId, continuationPrompt(sliceId,{ workflow_status: "needs_work", findings: [{ category: "receipt_recording_failed", next_action: errorText(error) }] }), queue); continue; }
      await input.client.setGoal({ threadId: manifest.thread_id, objective: await readFile(path.join(manifest.contract_workdir, "goal-objective.txt"), "utf8"), status: "complete" });
      return;
    }
    await startExecutionTurn(input, sliceId, continuationPrompt(sliceId,result), queue);
  }
  throw new Error(`execution_turn_limit_exceeded:${sliceId}`);
}

async function startExecutionTurn(input: GoalRunnerInput, sliceId: string, message: string, queue: CampaignMutationQueue): Promise<string> {
  const campaign = (await loadCampaignV5(input.projectRoot, input.campaignPath)).campaign; const slice = campaign.slices[sliceId];
  if (!slice?.thread.thread_id || !slice.thread.execution_profile || !slice.worktree) throw new Error(`execution_thread_not_ready:${sliceId}`);
  const profile = slice.thread.execution_profile; const explicit = profile.model !== "unknown" && profile.effort !== "unknown";
  const turn = await input.client.startTurn({ threadId: slice.thread.thread_id, input: message, cwd: slice.worktree, ...(explicit ? { model: profile.model, effort: profile.effort } : {}), sandboxPolicy: { type: "workspaceWrite", writableRoots: [slice.worktree], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false } });
  await queue.run(() => updateSliceThreadV5(input.projectRoot, input.campaignPath, sliceId, "execution_turn_started", (state) => recordExecutionTurnV5(state, turn.id)));
  return turn.id;
}

async function currentOrWait(client: CodexAppServerClient, threadId: string, turnId: string): Promise<TurnCompletion> {
  const thread = await client.readThread(threadId); const current = thread.turns.find((turn) => turn.id === turnId);
  if (!current) throw new Error(`active_execution_turn_missing:${threadId}:${turnId}`);
  if (current.status === "inProgress") return client.waitForTurn(threadId, turnId);
  return { threadId, turn: current, status: current.status, outputText: finalText(current) };
}

async function manifestFor(root:string,sliceId:string,waveId:string|null):Promise<SliceGoalManifestV2>{if(!waveId)throw new Error(`slice_wave_missing:${sliceId}`);return requireV2(await readSliceGoalManifest(path.join(root,"waves",waveId,"goals",sliceId,"goal-manifest.json")));}
async function readResult(workdir:string):Promise<{workflow_status:string;findings:unknown[]}>{for(const file of ["final-result.json","current-status.json"]){try{const row=parseStrictJson(await readFile(path.join(workdir,file),"utf8")) as {workflow_status?:unknown;findings?:unknown};if(typeof row.workflow_status==="string")return{workflow_status:row.workflow_status,findings:Array.isArray(row.findings)?row.findings:[]};}catch{}}return{workflow_status:"needs_work",findings:[{category:"final_result_missing",next_action:"Complete implementation, commit cleanly, and run a fresh Contract V3 final-gate."}]};}
function continuationPrompt(sliceId:string,result:{workflow_status:string;findings:unknown[]}):string{const findings=canonicalValueJson(result.findings).slice(0,20000);return `Contract V3 for ${sliceId} still reports needs_work. Continue this same Goal and thread in the existing worktree. Repair every machine finding, commit intended changes, leave the worktree clean, and rerun final-gate. Findings: ${findings}`;}
function requireV2(value:Awaited<ReturnType<typeof readSliceGoalManifest>>):SliceGoalManifestV2{if(value.schema_version!=="slice-goal-manifest-v2")throw new Error("slice_goal_manifest_v2_required");return value;}
function finalText(turn:CodexTurn):string|null{for(let index=turn.items.length-1;index>=0;index-=1){const item=turn.items[index];if(item.type==="agentMessage"&&typeof item.text==="string")return item.text;}return null;}
function errorText(value:unknown):string{return value instanceof Error?value.message:typeof value==="string"?value:JSON.stringify(value);}
function terminalOutcome(status:string):"completed"|"interrupted"|"failed"|"system_error"{return status==="completed"||status==="interrupted"||status==="failed"?status:"system_error";}
function ascii(left:string,right:string):number{return left<right?-1:left>right?1:0;}
