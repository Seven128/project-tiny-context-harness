import { AppServerUnavailableError, AmbiguousThreadLaunchError, createCodexAppServerClientFromEnvironment } from "./codex-app-server-client.js";
import type { CodexAppServerClient } from "./codex-app-server-protocol.js";
import { buildModelCatalog, type CodexModelCatalog } from "./codex-model-catalog.js";
import { routeCodexModel, type ModelProfile } from "./codex-model-router.js";
import { advanceCampaignV4 } from "./composite-campaign-orchestrator.js";
import { authorCampaignPacketsV5 } from "./composite-campaign-packet-author.js";
import { launchCampaignWaveV5, waitCampaignGoalsV5 } from "./composite-campaign-goal-runner.js";
import { runCampaignRepairV5 } from "./composite-campaign-repair-runner.js";
import { recoverCampaignHostV5 } from "./composite-campaign-host-recovery.js";
import { completeThreadTurnV5 } from "./composite-campaign-thread-state.js";
import { configureCampaignHostV5, loadCampaignV5, setHostFailureV5, updateSliceThreadV5 } from "./composite-campaign-v5.js";
import { createIntegrationWorktree } from "./composite-campaign-worktree.js";
import type { ControllerProfileV5 } from "./composite-campaign-schema-v5.js";

export interface CampaignRunOptions {
  projectRoot: string;
  campaignPath: string;
  controllerProfile?: ModelProfile | null;
  controllerThreadId?: string | null;
  clientFactory?: () => CodexAppServerClient;
  env?: NodeJS.ProcessEnv;
}

export type CampaignRunResult =
  | { status: "accepted"; target_commit: string }
  | { status: "decision_required"; decision: unknown }
  | { status: "wait_external"; reason: string };

export async function runCampaignV5(options: CampaignRunOptions): Promise<CampaignRunResult> {
  const factory = options.clientFactory ?? (() => createCodexAppServerClientFromEnvironment(options.env)); let client: CodexAppServerClient | null = null; let catalog: CodexModelCatalog | null = null;
  const controller = await resolveController(options); const persistedProfile = controller.profile ? { model: controller.profile.model, effort: controller.profile.effort, source: controller.source } satisfies ControllerProfileV5 : { model: null, effort: null, source: "unknown" as const };
  try {
    try { ({ client, catalog } = await connect(factory)); }
    catch (error) { await setHostFailureV5(options.projectRoot, options.campaignPath, "app_server_unavailable", true); return { status: "wait_external", reason: "app_server_unavailable" }; }
    await configureCampaignHostV5(options.projectRoot, options.campaignPath, { controller_thread_id: options.controllerThreadId ?? null, controller_profile: persistedProfile, model_catalog_sha256: catalog.sha256, app_server_version: serverVersion(client) });
    await recoverCampaignHostV5(client, options.projectRoot, options.campaignPath);
    for (let step = 0; step < 10_000; step += 1) {
      try {
        const action = await advanceCampaignV4(options.projectRoot, options.campaignPath);
        if (action.action === "finished") return { status: "accepted", target_commit: action.target_commit };
        if (action.action === "decision_required") return { status: "decision_required", decision: action.decision };
        if (action.action === "wait_external") return { status: "wait_external", reason: action.reason };
        if (action.action === "author_packets") {
          const campaign = (await loadCampaignV5(options.projectRoot, options.campaignPath)).campaign; if (!campaign.base_commit) throw new Error("campaign_base_commit_missing");
          const integration = await createIntegrationWorktree({ repositoryRoot: options.projectRoot, campaignId: campaign.campaign_id, baseCommit: campaign.base_commit, branchName: campaign.integration_branch });
          await authorCampaignPacketsV5({ client, projectRoot: options.projectRoot, campaignPath: options.campaignPath, sliceIds: action.slice_ids, authoringCwd: integration.path, controllerProfile: controller.profile, catalog });
        } else if (action.action === "launch_wave") await launchCampaignWaveV5({ client, projectRoot: options.projectRoot, campaignPath: options.campaignPath }, action);
        else if (action.action === "wait_goals") await waitCampaignGoalsV5({ client, projectRoot: options.projectRoot, campaignPath: options.campaignPath });
        else if (action.action === "repair_integration") await runCampaignRepairV5({ client, projectRoot: options.projectRoot, campaignPath: options.campaignPath, routing: routeCodexModel(controller.profile, catalog) }, action);
      } catch (error) {
        if (error instanceof AmbiguousThreadLaunchError || /ambiguous_host_thread_launch/u.test(errorText(error))) { await setHostFailureV5(options.projectRoot, options.campaignPath, "ambiguous_host_thread_launch", true); throw error; }
        if (!hostFailure(error)) throw error;
        const state = (await loadCampaignV5(options.projectRoot, options.campaignPath)).campaign.execution_host;
        if (state.restart_count >= 1) { await setHostFailureV5(options.projectRoot, options.campaignPath, "app_server_unavailable", true); return { status: "wait_external", reason: "app_server_unavailable" }; }
        await setHostFailureV5(options.projectRoot, options.campaignPath, "app_server_disconnected", false); await client.close();
        try {
          const reconnected = await connect(factory); client = reconnected.client;
          if (reconnected.catalog.sha256 !== catalog.sha256) throw new Error("model_catalog_changed_during_recovery");
          await configureCampaignHostV5(options.projectRoot, options.campaignPath, { controller_thread_id: options.controllerThreadId ?? null, controller_profile: persistedProfile, model_catalog_sha256: catalog.sha256, app_server_version: serverVersion(client) });
          await recoverCampaignHostV5(client, options.projectRoot, options.campaignPath);
        } catch { await setHostFailureV5(options.projectRoot, options.campaignPath, "app_server_unavailable", true); return { status: "wait_external", reason: "app_server_unavailable" }; }
      }
    }
    throw new Error("campaign_run_step_limit_exceeded");
  } finally { await client?.close().catch(() => undefined); }
}

export async function checkAppServerV5(factory:()=>CodexAppServerClient=()=>createCodexAppServerClientFromEnvironment()):Promise<unknown>{const {client,catalog}=await connect(factory);try{return{status:"available",server:serverInfo(client),model_count:catalog.models.length,model_catalog_sha256:catalog.sha256};}finally{await client.close();}}
export async function inspectModelRoutingV5(profile:ModelProfile|null,factory:()=>CodexAppServerClient=()=>createCodexAppServerClientFromEnvironment()):Promise<unknown>{const {client,catalog}=await connect(factory);try{return{controller_profile:profile,decision:routeCodexModel(profile,catalog),model_catalog_sha256:catalog.sha256};}finally{await client.close();}}
export async function listCampaignThreadsV5(projectRoot:string,campaignPath:string):Promise<unknown>{const {campaign}=await loadCampaignV5(projectRoot,campaignPath);return{campaign_id:campaign.campaign_id,execution_host:campaign.execution_host,slices:Object.fromEntries(Object.entries(campaign.slices).map(([id,slice])=>[id,slice.thread])),repairs:campaign.repair_threads};}
export async function interruptCampaignSliceV5(projectRoot:string,campaignPath:string,sliceId:string,factory:()=>CodexAppServerClient=()=>createCodexAppServerClientFromEnvironment()):Promise<unknown>{const loaded=await loadCampaignV5(projectRoot,campaignPath);const thread=loaded.campaign.slices[sliceId]?.thread;if(!thread?.thread_id||!thread.active_turn_id)throw new Error(`campaign_slice_has_no_active_turn:${sliceId}`);const client=factory();try{await client.initialize();await client.resumeThread(thread.thread_id);await client.interruptTurn(thread.thread_id,thread.active_turn_id);await updateSliceThreadV5(projectRoot,campaignPath,sliceId,"turn_interrupted_by_user",(state)=>completeThreadTurnV5(state,"interrupted"));return{slice_id:sliceId,thread_id:thread.thread_id,turn_id:thread.active_turn_id,status:"interrupted"};}finally{await client.close();}}

async function connect(factory:()=>CodexAppServerClient):Promise<{client:CodexAppServerClient;catalog:CodexModelCatalog}>{const client=factory();try{await client.initialize();return{client,catalog:buildModelCatalog(await client.listModels())};}catch(error){await client.close().catch(()=>undefined);throw error;}}
async function resolveController(options:CampaignRunOptions):Promise<{profile:ModelProfile|null;source:"controller_thread"|"host_explicit"|"unknown"}>{if(options.controllerProfile?.model&&options.controllerProfile.effort)return{profile:options.controllerProfile,source:options.controllerThreadId?"controller_thread":"host_explicit"};const current=(await loadCampaignV5(options.projectRoot,options.campaignPath)).campaign.execution_host.controller_profile;if(current.source!=="unknown"&&current.model&&current.effort)return{profile:{model:current.model,effort:current.effort},source:current.source};const env=options.env??process.env;if(env.TY_CONTEXT_CONTROLLER_MODEL&&env.TY_CONTEXT_CONTROLLER_EFFORT)return{profile:{model:env.TY_CONTEXT_CONTROLLER_MODEL,effort:env.TY_CONTEXT_CONTROLLER_EFFORT},source:"host_explicit"};return{profile:null,source:"unknown"};}
function hostFailure(error:unknown):boolean{return error instanceof AppServerUnavailableError||/app_server_(?:unavailable|request_disconnected|request_timeout|turn_timeout|thread_system_error|repair_thread_system_error|execution_turn_failed)|repair_turn_failed/u.test(errorText(error));}
function serverInfo(client:CodexAppServerClient):Record<string,unknown>|null{const method=(client as CodexAppServerClient&{getServerInfo?:()=>Record<string,unknown>|null}).getServerInfo;return method?method.call(client):null;}
function serverVersion(client:CodexAppServerClient):string{const info=serverInfo(client);return typeof info?.userAgent==="string"?info.userAgent:"unknown";}
function errorText(error:unknown):string{return error instanceof Error?error.message:String(error);}
