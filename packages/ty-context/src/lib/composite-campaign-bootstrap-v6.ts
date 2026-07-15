import { checkCodexExecV1 } from "./codex-exec-client.js";
import {
  MODEL_ROUTING_POLICY,
  MODEL_ROUTING_POLICY_SHA256,
} from "./codex-model-routing-policy.js";
import { routeCodexExecProfileV1 } from "./composite-campaign-exec-policy.js";
import {
  currentHead,
  prepareGitBaseline,
} from "./composite-campaign-git-baseline.js";
import type { RunCampaignV6Options } from "./composite-campaign-runner-types-v6.js";
import {
  createManagedIntegrationWorktreeV1,
  managedCampaignWorktreePathsV1,
} from "./composite-campaign-worktree-budget.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";

export async function freezeOrValidateExecutionEngineV6(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
): Promise<void> {
  const loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  const executable =
    options.codexExecutable ?? process.env.TY_CONTEXT_CODEX_EXECUTABLE;
  const check = await checkCodexExecV1({
    projectRoot: options.projectRoot,
    executable,
  });
  if (!check.passed)
    throw new Error(`codex_exec_check_failed:${check.error_codes.join(",")}`);
  const engine = loaded.campaign.execution_engine;
  if (engine.frozen) {
    if (
      engine.codex_cli_version !== check.version ||
      engine.model_routing_policy_id !== MODEL_ROUTING_POLICY.policy_id ||
      engine.model_routing_policy_sha256 !== MODEL_ROUTING_POLICY_SHA256 ||
      (options.controllerProfile &&
        (engine.authoring_profile?.model !== options.controllerProfile.model ||
          engine.authoring_profile?.effort !==
            options.controllerProfile.effort))
    )
      throw new Error("campaign_execution_engine_frozen_authority_drift");
    return;
  }
  if (!options.controllerProfile)
    throw new Error("controller_profile_required_to_freeze_campaign_v6");
  const decision = routeCodexExecProfileV1(options.controllerProfile);
  if (
    decision.authoring_profile.model === "unknown" ||
    decision.authoring_profile.effort === "unknown"
  )
    throw new Error("controller_profile_unknown");
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    "execution_engine_frozen",
    async (_root, campaign) => {
      if (campaign.execution_engine.frozen)
        throw new Error("execution_engine_already_frozen");
      campaign.execution_engine.frozen = true;
      campaign.execution_engine.codex_cli_version = check.version;
      campaign.execution_engine.authoring_profile = decision.authoring_profile;
      campaign.execution_engine.execution_profile = decision.execution_profile;
      campaign.execution_engine.routing_decision_sha256 =
        decision.decision_sha256;
      campaign.execution_engine.routing_reason = decision.reason;
      return campaign;
    },
    lock,
  );
}

export async function ensureIntegrationWorktreeV6(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
): Promise<string> {
  let loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  if (!loaded.campaign.base_commit) {
    const baseline = await prepareGitBaseline({
      repositoryRoot: options.projectRoot,
      campaignId: loaded.campaign.campaign_id,
      targetBranch: loaded.campaign.target_branch,
    });
    await mutateCampaignV6(
      options.projectRoot,
      options.campaignPath,
      "integration_worktree_intent",
      async (_root, campaign) => {
        campaign.base_commit = baseline.baseCommit;
        campaign.integration_head = baseline.baseCommit;
        return campaign;
      },
      lock,
    );
    loaded = await loadCampaignStoreV6(
      options.projectRoot,
      options.campaignPath,
    );
  }
  const paths = managedCampaignWorktreePathsV1(
    options.projectRoot,
    loaded.campaign.campaign_id,
  );
  await createManagedIntegrationWorktreeV1({
    repositoryRoot: options.projectRoot,
    campaignId: loaded.campaign.campaign_id,
    baseCommit: loaded.campaign.base_commit!,
    integrationRef: loaded.campaign.integration_ref,
    expectedWorktrees: [paths.integration],
  });
  const head = await currentHead(paths.integration);
  if (loaded.campaign.integration_head !== head)
    await mutateCampaignV6(
      options.projectRoot,
      options.campaignPath,
      "integration_worktree_ready",
      async (_root, campaign) => {
        campaign.integration_head = head;
        return campaign;
      },
      lock,
    );
  return paths.integration;
}
