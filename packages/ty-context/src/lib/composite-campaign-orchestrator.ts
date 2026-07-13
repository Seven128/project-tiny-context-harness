import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { analyzeConflictV4, type ConflictProfileV4 } from "./composite-campaign-conflicts.js";
import { runCampaignFinalGate, runWaveIntegrationGate, markCampaignTargetAccepted, type CampaignFinalSliceInput, type CampaignGlobalConstraintBindingV1 } from "./composite-campaign-final-gate.js";
import { prepareGitBaseline, currentHead, gitStatus, runGit } from "./composite-campaign-git-baseline.js";
import { createSliceGoalManifestV2, readSliceGoalManifest, type SliceGoalManifestV2 } from "./composite-campaign-goal-manifest.js";
import { finalizeCampaignTarget, mergeWaveIntoIntegration } from "./composite-campaign-integration.js";
import { recordSliceExecutionReceipt, readSliceExecutionReceipt } from "./composite-campaign-receipt.js";
import { selectDeterministicWaveV4 } from "./composite-campaign-scheduler.js";
import { type CampaignV4, type CampaignWaveV4 } from "./composite-campaign-schema-v4.js";
import { assertCampaignV5 } from "./composite-campaign-schema-v5.js";
import { assertGlobalConstraintPacketCoverageV1, parseSourceCoverageV1, validateSourceCoverageAgainstScopeV4, type SourceCoverageV1 } from "./composite-campaign-source-coverage.js";
import { currentPacketRevisionPathV4, loadCampaignV4, mutateCampaignV4, verifyCampaignPacketV4 } from "./composite-campaign-v4.js";
import { computeReadyFrontierV4, validateScopeFitGraphV4 } from "./composite-campaign-graph.js";
import { createIntegrationWorktree, createRepairWorktree, createSliceWorktree, listCampaignWorktrees } from "./composite-campaign-worktree.js";
import { LONG_TASK_SOURCE_FILES } from "./long-task-contract-schema.js";
import { clearAcceptedLongTaskBinding } from "./long-task-active-task.js";
import { removeAllCampaignWorktrees } from "./composite-campaign-worktree.js";
import { atomic } from "./long-task-status.js";
import { acceptThreadV5, bindThreadGoalV5, markWorktreeReadyV5 } from "./composite-campaign-thread-state.js";
import { parseScopeFitResultV4, type ScopeFitResultV4 } from "./scope-fit-v4.js";

export type CampaignAdvanceActionV4 =
  | { action: "author_packets"; slice_ids: string[] }
  | { action: "launch_wave"; wave_id: string; goals: GoalLaunchV4[] }
  | { action: "wait_goals"; goal_ids: string[] }
  | { action: "repair_integration"; wave_id: string; repair_id: string; worktree: string; objective_path: string; launch_token: string; goal_id: string | null; reason: string }
  | { action: "decision_required"; decision: unknown }
  | { action: "wait_external"; reason: string }
  | { action: "finished"; campaign_status: "accepted"; target_commit: string };

export interface GoalLaunchV4 { slice_id: string; thread_id: string; worktree: string; objective_path: string; launch_token: string }
interface RepairStateV1 { schema_version: "campaign-repair-state-v1"; repair_id: string; wave_id: string; kind: "merge_conflict" | "integration_regression" | "campaign_final_regression"; worktree: string; branch: string; base_commit: string; objective_path: string; replay_branch: string | null; launch_token: string; goal_id: string | null; applied: boolean }

export async function advanceCampaignV4(projectRoot: string, campaignPath: string): Promise<CampaignAdvanceActionV4> {
  let { root, campaign } = await loadCampaignV4(projectRoot, campaignPath);
  assertCampaignV5(campaign);
  const scope = await readScope(root); const coverage = await readCoverage(root);
  const graph = validateScopeFitGraphV4(scope);
  if (graph.graph_sha256 !== campaign.graph.graph_sha256) throw new Error("Immutable Scope Fit graph hash mismatch");
  validateSourceCoverageAgainstScopeV4(scope, coverage);
  if (scope.decision === "blocked_for_decision" || campaign.campaign_status === "decision_blocked") return { action: "decision_required", decision: scope.decision_required };
  if (!campaign.base_commit) {
    const baseline = await prepareGitBaseline({ repositoryRoot: projectRoot, campaignId: campaign.campaign_id, targetBranch: campaign.target_branch });
    const integration = await createIntegrationWorktree({ repositoryRoot: projectRoot, campaignId: campaign.campaign_id, baseCommit: baseline.baseCommit, branchName: campaign.integration_branch });
    campaign = await mutateCampaignV4(projectRoot, root, "git_baseline_ready", async (_root, value) => { value.base_commit = baseline.baseCommit; value.integration_head = integration.headCommit; value.campaign_status = "authoring"; return value; });
  }
  const integration = await createIntegrationWorktree({ repositoryRoot: projectRoot, campaignId: campaign.campaign_id, baseCommit: campaign.base_commit!, branchName: campaign.integration_branch });
  const repair = await resumeRepairIfReady(projectRoot, root, campaign, integration.path);
  if (repair?.action) return repair.action;
  if (repair?.applied) ({ campaign } = await loadCampaignV4(projectRoot, root));
  const activeWave = activeWaveEntry(campaign);
  if (activeWave) {
    const [waveId, wave] = activeWave;
    const launch = await launchAction(root, campaign, waveId, wave);
    if (launch) return launch;
    const waiting = wave.slice_ids.filter((sliceId) => campaign.slices[sliceId].status === "goal_running");
    if (waiting.length) return { action: "wait_goals", goal_ids: waiting.map((sliceId) => campaign.slices[sliceId].goal_id!).sort(asciiCompare) };
    if (wave.slice_ids.every((sliceId) => campaign.slices[sliceId].status === "accepted" || campaign.slices[sliceId].status === "merged")) {
      const merged = await mergeAcceptedWave(projectRoot, root, campaign, integration.path, waveId, wave);
      if (merged.action) return merged.action;
      ({ campaign } = await loadCampaignV4(projectRoot, root));
      const affected = await affectedSlices(root, campaign, wave.slice_ids);
      for (const sliceId of affected) await verifyCampaignPacketV4(projectRoot, root, sliceId);
      const integrationResult = await runWaveIntegrationGate({ campaignRoot: root, campaignId: campaign.campaign_id, waveId, integrationWorktree: integration.path, slices: affected.map((sliceId) => packetInput(root, campaign, sliceId)) });
      if (integrationResult.workflow_status !== "integration_verified") return prepareRepairAction(projectRoot, root, campaign, integration.path, waveId, "integration_regression", path.join(root, "waves", waveId, "integration-result.json"), null);
      await mutateCampaignV4(projectRoot, root, "wave_integration_verified", async (_root, value) => { const current = value.waves[waveId]; current.status = "integration_verified"; current.integration_result_sha256 = integrationResult.result_sha256; value.integration_head = integrationResult.integration_head; for (const sliceId of current.slice_ids) value.slices[sliceId].status = "integration_verified"; value.campaign_status = "authoring"; return value; });
      return advanceCampaignV4(projectRoot, root);
    }
  }
  ({ campaign } = await loadCampaignV4(projectRoot, root));
  const integrated = Object.entries(campaign.slices).filter(([, slice]) => slice.status === "integration_verified").map(([sliceId]) => sliceId);
  if (integrated.length === Object.keys(campaign.slices).length && integrated.length) return finalizeCompletedGraph(projectRoot, root, campaign, scope, coverage, integration.path);
   const frontier = computeReadyFrontierV4(scope, integrated);
  const v5=assertCampaignV5(campaign);const packetPending = frontier.filter((slice) => campaign.slices[slice.slice_id].status !== "packet_ready"||!v5.slices[slice.slice_id].thread.thread_id||v5.slices[slice.slice_id].thread.phase!=="packet_validation").map((slice) => slice.slice_id);
  if (packetPending.length) return { action: "author_packets", slice_ids: packetPending };
  for (const slice of frontier) await verifyCampaignPacketV4(projectRoot, root, slice.slice_id);
  const profiles = await Promise.all(frontier.map((slice) => readProfile(root, campaign, slice.slice_id)));
  const schedule = selectDeterministicWaveV4(profiles, { max_concurrency: 4 });
  if (!schedule.slice_ids.length) throw new Error("Campaign scheduler produced an empty ready wave");
  const waveId = nextWaveId(campaign); const base = await currentHead(integration.path);
  const launches: GoalLaunchV4[] = [];
  for (const sliceId of schedule.slice_ids) launches.push(await materializeSliceLaunch(projectRoot, root, campaign, integration.path, waveId, base, sliceId));
  const scheduleHash = sha256Hex(canonicalJson({ wave_id: waveId, base_commit: base, schedule }));
  await mutateCampaignV4(projectRoot, root, "wave_scheduled", async (_root, value) => {
    value.waves[waveId] = { base_commit: base, slice_ids: schedule.slice_ids, status: "scheduled", schedule_sha256: scheduleHash, integration_result_sha256: null };
    for (const launch of launches) { const slice = value.slices[launch.slice_id]; const manifest = requireGoalManifestV2(await readSliceGoalManifest(path.join(root, "waves", waveId, "goals", launch.slice_id, "goal-manifest.json"))); slice.wave_id = waveId; slice.branch = manifest.branch; slice.worktree = manifest.worktree; slice.base_commit = base; slice.status = "worktree_ready"; const current=assertCampaignV5(value); current.slices[launch.slice_id].thread=markWorktreeReadyV5(current.slices[launch.slice_id].thread); }
    value.campaign_status = "executing"; return value;
  });
  return { action: "launch_wave", wave_id: waveId, goals: launches };
}

export async function bindCampaignGoalV4(projectRoot: string, campaignPath: string, sliceId: string, goalId: string, launchToken: string): Promise<CampaignV4> {
  return mutateCampaignV4(projectRoot, campaignPath, "goal_bound", async (root, campaign) => {
    const slice = campaign.slices[sliceId]; if (!slice?.wave_id) throw new Error("Slice has no scheduled Goal manifest");
    const manifest = requireGoalManifestV2(await readSliceGoalManifest(path.join(root, "waves", slice.wave_id, "goals", sliceId, "goal-manifest.json")));
    if (manifest.launch_token !== launchToken) throw new Error("Goal launch token mismatch");
    if (slice.goal_id && slice.goal_id !== goalId) throw new Error("Slice is already bound to a different Goal");
    const current=assertCampaignV5(campaign);const thread=current.slices[sliceId].thread;if(thread.thread_id!==manifest.thread_id||goalId!==manifest.thread_id)throw new Error("Goal must bind to the persisted SFC App Server thread");
    const objective=await readFile(path.join(manifest.contract_workdir,"goal-objective.txt"),"utf8");current.slices[sliceId].thread=bindThreadGoalV5(thread,sha256Hex(objective),launchToken);
    slice.goal_id = goalId; slice.status = "goal_running"; campaign.waves[slice.wave_id].status = "running"; campaign.campaign_status = "executing"; return campaign;
  });
}

export async function bindCampaignRepairGoalV4(projectRoot: string, campaignPath: string, repairId: string, goalId: string, launchToken: string): Promise<RepairStateV1> {
  assertPortableId(repairId,"repair");assertPortableId(goalId,"goal");const { root,campaign } = await loadCampaignV4(projectRoot, campaignPath); const file=path.join(root,"repairs",repairId,"repair-state.json"); const state=assertRepairState(parseStrictJson(await readFile(file,"utf8")),root,repairId);
  await assertOwnedRepairWorktree(projectRoot,campaign.campaign_id,state);if(state.launch_token!==launchToken)throw new Error("Repair Goal launch identity mismatch");
  if(state.goal_id&&state.goal_id!==goalId)throw new Error("Repair is already bound to a different Goal");state.goal_id=goalId;await atomic(file,state);return state;
}

export async function recordCampaignResultV4(projectRoot: string, campaignPath: string, sliceId: string, goalId: string, workdir: string): Promise<unknown> {
  const { root, campaign } = await loadCampaignV4(projectRoot, campaignPath); const slice = campaign.slices[sliceId];
  if (!slice?.wave_id || !slice.worktree || !slice.branch || !slice.base_commit || slice.goal_id !== goalId) throw new Error("Slice Goal/result identity mismatch");
  const manifest=requireGoalManifestV2(await readSliceGoalManifest(path.join(root,"waves",slice.wave_id,"goals",sliceId,"goal-manifest.json")));
  const recorded = await recordSliceExecutionReceipt({ campaignRoot: root, campaignId: campaign.campaign_id, sliceId, waveId: slice.wave_id, goalId, worktree: slice.worktree, contractWorkdir: workdir, branch: slice.branch, baseCommit: slice.base_commit, forbiddenChangedPaths:manifest.forbidden_campaign_state_paths });
  await clearAcceptedLongTaskBinding(slice.worktree, path.resolve(workdir));
  await mutateCampaignV4(projectRoot, root, "slice_result_recorded", async (_root, value) => { const current = value.slices[sliceId]; current.status = "accepted"; current.head_commit = recorded.receipt.head_commit; current.final_receipt_sha256 = recorded.receipt.receipt_sha256; const v5=assertCampaignV5(value);v5.slices[sliceId].thread=acceptThreadV5(v5.slices[sliceId].thread);return value; });
  return recorded;
}

export async function statusCampaignV4(projectRoot: string, campaignPath: string): Promise<unknown> {
  const { root, campaign } = await loadCampaignV4(projectRoot, campaignPath);
  return { campaign, campaign_path: root, derived_status: deriveCampaignStatus(campaign), next_action: await previewNextAction(root, campaign) };
}

async function mergeAcceptedWave(projectRoot:string,root:string,campaign:CampaignV4,integration:string,waveId:string,wave:CampaignWaveV4):Promise<{action?:CampaignAdvanceActionV4}>{
  const inputs=[]; for(const sliceId of wave.slice_ids){const slice=campaign.slices[sliceId];const receiptPath=path.join(root,"slices",sliceId,"receipts",`${waveId}-${slice.head_commit!.slice(0,12)}.json`);inputs.push({receipt:await readSliceExecutionReceipt(receiptPath),worktree:slice.worktree!,contract_workdir:contractWorkdir(campaign,sliceId)});}
  const result=await mergeWaveIntoIntegration({campaignRoot:root,campaignId:campaign.campaign_id,waveId,integrationWorktree:integration,slices:inputs});
  if(result.status==="repair_required")return{action:await prepareRepairAction(projectRoot,root,campaign,integration,waveId,"merge_conflict",result.conflict_manifest_path,result.conflict_manifest.failed_slice_branch)};
  await mutateCampaignV4(projectRoot,root,"wave_merged",async(_root,value)=>{value.waves[waveId].status="merged";value.integration_head=result.integration_head;for(const record of result.merges){value.slices[record.slice_id].status="merged";value.slices[record.slice_id].merge_commit=record.merge_commit;}value.campaign_status="integrating";return value;});return{};
}

async function materializeSliceLaunch(projectRoot:string,root:string,campaign:CampaignV4,_integration:string,waveId:string,base:string,sliceId:string):Promise<GoalLaunchV4>{
  const v5=assertCampaignV5(campaign);const thread=v5.slices[sliceId]?.thread;
  if(!thread?.thread_id||!thread.authoring_profile||!thread.execution_profile||!thread.routing_reason||thread.phase!=="packet_validation")throw new Error(`campaign_thread_not_ready_for_worktree:${sliceId}`);
  const worktree=await createSliceWorktree({repositoryRoot:projectRoot,campaignId:campaign.campaign_id,sliceId,baseCommit:base});
  const revision=currentPacketRevisionPathV4(root,campaign,sliceId);const task=path.join(worktree.path,"tmp","ty-context","plan-acceptance",campaign.campaign_id,`${sliceId}-r${campaign.slices[sliceId].packet_revision}`);
  await rm(task,{recursive:true,force:true});await mkdir(task,{recursive:true});for(const file of Object.values(LONG_TASK_SOURCE_FILES))await cp(path.join(revision,file),path.join(task,file));
  const profile=await readProfile(root,campaign,sliceId);
  const created=await createSliceGoalManifestV2(root,{campaign_id:campaign.campaign_id,slice_id:sliceId,wave_id:waveId,worktree:worktree.path,branch:worktree.branch,base_commit:base,packet_revision:campaign.slices[sliceId].packet_revision!,packet_sha256:campaign.slices[sliceId].packet_sha256!,contract_workdir:task,integration_branch:campaign.integration_branch,allowed_implementation_bindings:[...profile.write_paths,...profile.contract_keys],forbidden_campaign_state_paths:[path.join(".codex","composite-long-task","campaigns",campaign.campaign_id)],thread_id:thread.thread_id,authoring_model:thread.authoring_profile.model,authoring_effort:thread.authoring_profile.effort,execution_model:thread.execution_profile.model,execution_effort:thread.execution_profile.effort,routing_reason:thread.routing_reason});
  return{slice_id:sliceId,thread_id:thread.thread_id,worktree:worktree.path,objective_path:created.objective_path,launch_token:created.manifest.launch_token};
}

async function finalizeCompletedGraph(projectRoot:string,root:string,campaign:CampaignV4,scope:ScopeFitResultV4,coverage:SourceCoverageV1,integration:string):Promise<CampaignAdvanceActionV4>{
  const analysis=validateSourceCoverageAgainstScopeV4(scope,coverage);const verified=await Promise.all(Object.keys(campaign.slices).sort(asciiCompare).map((sliceId)=>verifyCampaignPacketV4(projectRoot,root,sliceId)));const indexes=verified.map((result)=>result.packet_index);assertGlobalConstraintPacketCoverageV1(scope,coverage,indexes);
  const constraints=scope.global_constraints.map((constraint):CampaignGlobalConstraintBindingV1=>{const rows=coverage.global_constraint_bindings.filter((item)=>item.constraint_id===constraint.constraint_id);return{constraint_id:constraint.constraint_id,applies_to:constraint.applies_to,requirement_ids:unique(rows.flatMap((item)=>item.requirement_ids)),acceptance_criterion_ids:unique(rows.flatMap((item)=>item.acceptance_criterion_ids)),verification_spec_ids:unique(rows.flatMap((item)=>item.verification_spec_ids))};});
  const final=await runCampaignFinalGate({campaignRoot:root,campaignId:campaign.campaign_id,integrationWorktree:integration,integrationBranch:campaign.integration_branch,sourcePlanSha256:campaign.source_plan_sha256,sourceCoverageFile:path.join(root,"source-coverage.json"),sourceCoverageComplete:analysis.pending_global_constraint_binding_pairs.length===0,slices:Object.keys(campaign.slices).map((sliceId)=>packetInput(root,campaign,sliceId)),globalConstraints:constraints});
  if(final.workflow_status!=="ready_to_merge")return prepareRepairAction(projectRoot,root,campaign,integration,"CAMPAIGN-FINAL","campaign_final_regression",path.join(root,"campaign-final-result.json"),null);
  const target=await finalizeCampaignTarget({repositoryRoot:projectRoot,campaignId:campaign.campaign_id,campaignRoot:root,integrationWorktree:integration,integrationBranch:campaign.integration_branch,targetBranch:campaign.target_branch,campaignFinalResultFile:path.join(root,"campaign-final-result.json")});
  if(target.status==="repair_required")return prepareRepairAction(projectRoot,root,campaign,integration,"CAMPAIGN-FINAL","campaign_final_regression",path.join(root,"campaign-final-result.json"),campaign.target_branch);
  if(target.status==="external_approval_required")return{action:"wait_external",reason:target.reason};
  if(target.status==="revalidation_required"){await mutateCampaignV4(projectRoot,root,"target_resync_requires_revalidation",async(_root,value)=>{value.integration_head=target.integration_head;value.campaign_status="finalizing";return value;});return advanceCampaignV4(projectRoot,root);}
  await markCampaignTargetAccepted(path.join(root,"campaign-final-result.json"),target.target_commit);await removeAllCampaignWorktrees({repositoryRoot:projectRoot,campaignId:campaign.campaign_id,deleteBranches:true});await mutateCampaignV4(projectRoot,root,"campaign_accepted",async(_root,value)=>{value.campaign_status="accepted";value.integration_head=target.target_commit;for(const slice of Object.values(value.slices)){slice.worktree=null;}return value;});return{action:"finished",campaign_status:"accepted",target_commit:target.target_commit};
}

async function prepareRepairAction(projectRoot:string,root:string,campaign:CampaignV4,integration:string,waveId:string,kind:RepairStateV1["kind"],manifest:string,replayBranch:string|null):Promise<CampaignAdvanceActionV4>{const repairId=`${waveId}-${kind}`;const worktree=await createRepairWorktree({repositoryRoot:projectRoot,campaignId:campaign.campaign_id,repairId,baseCommit:await currentHead(integration)});if(replayBranch&&(await gitStatus(worktree.path)).clean&&await currentHead(worktree.path)===worktree.baseCommit)await runGit(worktree.path,["-c","commit.gpgSign=false","merge","--no-ff","--no-edit",replayBranch],{throwOnError:false});const objective=path.join(root,"repairs",repairId,"repair-objective.txt");await mkdir(path.dirname(objective),{recursive:true});await writeFile(objective,`Campaign V5 repair Goal\nCampaign: ${campaign.campaign_id}\nWave: ${waveId}\nKind: ${kind}\nWorktree: ${worktree.path}\nBranch: ${worktree.branch}\nBase: ${worktree.baseCommit}\nManifest/result: ${manifest}\nPreserve every affected Packet, requirement and AC. Resolve the conflict or regression, verify, commit, and leave the worktree clean. Do not weaken contracts or modify Scope Fit, Packets, or Campaign state.\n`);const launchToken=sha256Hex(canonicalJson({campaign_id:campaign.campaign_id,repair_id:repairId,base_commit:worktree.baseCommit,kind})).slice(0,32);const state:RepairStateV1={schema_version:"campaign-repair-state-v1",repair_id:repairId,wave_id:waveId,kind,worktree:worktree.path,branch:worktree.branch,base_commit:worktree.baseCommit,objective_path:objective,replay_branch:replayBranch,launch_token:launchToken,goal_id:null,applied:false};await atomic(path.join(path.dirname(objective),"repair-state.json"),state);if(campaign.waves[waveId])await mutateCampaignV4(projectRoot,root,"repair_required",async(_root,value)=>{value.waves[waveId].status="repair_required";value.campaign_status="integrating";return value;});return{action:"repair_integration",wave_id:waveId,repair_id:repairId,worktree:worktree.path,objective_path:objective,launch_token:launchToken,goal_id:null,reason:kind};}

async function resumeRepairIfReady(projectRoot:string,root:string,campaign:CampaignV4,integration:string):Promise<{action?:CampaignAdvanceActionV4;applied?:boolean}|null>{const candidates=[...Object.entries(campaign.waves).filter(([,wave])=>wave.status==="repair_required").map(([id])=>`${id}-merge_conflict`),...Object.entries(campaign.waves).filter(([,wave])=>wave.status==="repair_required").map(([id])=>`${id}-integration_regression`),"CAMPAIGN-FINAL-campaign_final_regression"];for(const repairId of candidates){const file=path.join(root,"repairs",repairId,"repair-state.json");let state:RepairStateV1;try{state=assertRepairState(parseStrictJson(await readFile(file,"utf8")),root,repairId);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")continue;throw error;}if(state.applied)continue;await assertOwnedRepairWorktree(projectRoot,campaign.campaign_id,state);const action:CampaignAdvanceActionV4={action:"repair_integration",wave_id:state.wave_id,repair_id:state.repair_id,worktree:state.worktree,objective_path:state.objective_path,launch_token:state.launch_token,goal_id:state.goal_id,reason:state.kind};if(!state.goal_id)return{action};const status=await gitStatus(state.worktree);const head=await currentHead(state.worktree);if(!status.clean||head===state.base_commit)return{action};if(await currentHead(integration)!==state.base_commit)throw new Error("Integration head changed while repair was running");await runGit(integration,["merge","--ff-only",state.branch]);state.applied=true;await atomic(file,state);await mutateCampaignV4(projectRoot,root,"repair_applied",async(_root,value)=>{value.integration_head=await currentHead(integration);if(value.waves[state.wave_id])value.waves[state.wave_id].status="accepted";return value;});return{applied:true};}return null;}

async function affectedSlices(root:string,campaign:CampaignV4,waveSliceIds:string[]):Promise<string[]>{const selected=new Set(waveSliceIds);const waveProfiles=await Promise.all(waveSliceIds.map((id)=>readProfile(root,campaign,id)));for(const [sliceId,slice] of Object.entries(campaign.slices)){if(slice.status!=="integration_verified"||selected.has(sliceId))continue;const prior=await readProfile(root,campaign,sliceId);if(waveProfiles.some((profile)=>!analyzeConflictV4(prior,profile).can_parallel))selected.add(sliceId);}return[...selected].sort(asciiCompare);}
async function readProfile(root:string,campaign:CampaignV4,sliceId:string):Promise<ConflictProfileV4>{return JSON.parse(await readFile(path.join(currentPacketRevisionPathV4(root,campaign,sliceId),"conflict-profile.json"),"utf8")) as ConflictProfileV4;}
function packetInput(root:string,campaign:CampaignV4,sliceId:string):CampaignFinalSliceInput{return{slice_id:sliceId,packet_revision_path:currentPacketRevisionPathV4(root,campaign,sliceId)};}
function contractWorkdir(campaign:CampaignV4,sliceId:string):string{const slice=campaign.slices[sliceId];return path.join(slice.worktree!,"tmp","ty-context","plan-acceptance",campaign.campaign_id,`${sliceId}-r${slice.packet_revision}`);}
async function launchAction(root:string,campaign:CampaignV4,waveId:string,wave:CampaignWaveV4):Promise<CampaignAdvanceActionV4|null>{const goals:GoalLaunchV4[]=[];for(const sliceId of wave.slice_ids){const slice=campaign.slices[sliceId];if(slice.status!=="worktree_ready")continue;const manifest=requireGoalManifestV2(await readSliceGoalManifest(path.join(root,"waves",waveId,"goals",sliceId,"goal-manifest.json")));goals.push({slice_id:sliceId,thread_id:manifest.thread_id,worktree:manifest.worktree,objective_path:path.join(manifest.contract_workdir,"goal-objective.txt"),launch_token:manifest.launch_token});}return goals.length?{action:"launch_wave",wave_id:waveId,goals}:null;}
function activeWaveEntry(campaign:CampaignV4):[string,CampaignWaveV4]|null{return Object.entries(campaign.waves).sort(([a],[b])=>asciiCompare(a,b)).find(([,wave])=>wave.status!=="integration_verified")??null;}
function nextWaveId(campaign:CampaignV4):string{return`WAVE-${String(Object.keys(campaign.waves).length+1).padStart(3,"0")}`;}
async function readScope(root:string):Promise<ScopeFitResultV4>{return parseScopeFitResultV4(await readFile(path.join(root,"scope-fit.json"),"utf8"));}
async function readCoverage(root:string):Promise<SourceCoverageV1>{return parseSourceCoverageV1(await readFile(path.join(root,"source-coverage.json"),"utf8"));}
function unique(values:string[]):string[]{return[...new Set(values)].sort(asciiCompare);}
function deriveCampaignStatus(campaign:CampaignV4):string{if(campaign.campaign_status==="accepted")return"accepted";if(Object.values(campaign.slices).every((slice)=>slice.status==="integration_verified"))return"finalizing";if(Object.values(campaign.slices).some((slice)=>slice.status==="goal_running"))return"executing";return campaign.campaign_status;}
async function previewNextAction(root:string,campaign:CampaignV4):Promise<string>{if(campaign.campaign_status==="accepted")return"finished";if(activeWaveEntry(campaign))return"advance";return await readFile(path.join(root,"scope-fit.json"),"utf8").then(()=>"advance",()=>"apply_scope");}
function asciiCompare(left:string,right:string):number{return left<right?-1:left>right?1:0;}
function assertPortableId(value:string,label:string):void{if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value))throw new Error(`Invalid ${label} id`);}
function assertRepairState(value:unknown,root:string,repairId:string):RepairStateV1{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Repair state must be an object");
  const state=value as RepairStateV1;assertPortableId(repairId,"repair");
  if(state.schema_version!=="campaign-repair-state-v1"||state.repair_id!==repairId||!/(?:^WAVE-[0-9]{3}$|^CAMPAIGN-FINAL$)/u.test(state.wave_id)||!["merge_conflict","integration_regression","campaign_final_regression"].includes(state.kind)||!/^[a-f0-9]{40,64}$/u.test(state.base_commit)||!/^[a-f0-9]{32}$/u.test(state.launch_token)||typeof state.applied!=="boolean"||(state.goal_id!==null&&typeof state.goal_id!=="string"))throw new Error("Campaign repair state is invalid");
  const expected=path.join(root,"repairs",repairId,"repair-objective.txt");
  if(path.resolve(state.objective_path)!==path.resolve(expected)||typeof state.worktree!=="string"||typeof state.branch!=="string"||(state.replay_branch!==null&&typeof state.replay_branch!=="string"))throw new Error("Campaign repair state path or branch is invalid");
  return state;
}
async function assertOwnedRepairWorktree(projectRoot:string,campaignId:string,state:RepairStateV1):Promise<void>{const registered=(await listCampaignWorktrees({repositoryRoot:projectRoot,campaignId})).find((item)=>samePath(item.path,state.worktree));if(!registered||registered.branch!==state.branch)throw new Error("Campaign repair worktree is not registered and owned");}
function samePath(left:string,right:string):boolean{const normalize=(value:string)=>process.platform==="win32"?path.resolve(value).toLowerCase():path.resolve(value);return normalize(left)===normalize(right);}
function requireGoalManifestV2(value:Awaited<ReturnType<typeof readSliceGoalManifest>>):SliceGoalManifestV2{if(value.schema_version!=="slice-goal-manifest-v2")throw new Error("campaign_v4_goal_manifest_audit_only");return value;}
