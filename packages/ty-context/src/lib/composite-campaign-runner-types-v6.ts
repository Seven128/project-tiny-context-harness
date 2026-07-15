import type { ModelProfile } from "./codex-model-profile.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import type { inspectManagedWorktreeBudgetV1 } from "./composite-campaign-worktree-budget.js";

export interface RunCampaignV6Options {
  projectRoot: string;
  campaignPath: string;
  controllerProfile: ModelProfile | null;
  codexExecutable?: string;
  signal?: AbortSignal;
}

export interface RunCampaignResultV6 {
  schema_version: "composite-campaign-run-result-v6";
  execution_engine: "codex-exec-v1";
  campaign_id: string;
  campaign_status: CampaignV6["campaign_status"];
  run_generation: number;
  integration_head: string | null;
  target_commit: string | null;
  cleanup_status: "pending" | "complete" | null;
  block_reason: string | null;
}

export interface CampaignDryRunV6 {
  schema_version: "composite-campaign-dry-run-v6";
  campaign_id: string;
  execution_engine: "codex-exec-v1";
  ready_wave: string[];
  packet_authoring_slice_ids: string[];
  fixed_worktrees: {
    integration: string;
    sfc: Record<string, string>;
    repair: string;
  };
  worker_profiles: {
    authoring: ModelProfile;
    execution: ModelProfile;
    repair: ModelProfile;
  };
  redacted_exec_argv: {
    authoring: string[];
    execution: string[];
    repair: string[];
  };
  worktree_budget: Awaited<ReturnType<typeof inspectManagedWorktreeBudgetV1>>;
  codex_invoked: false;
}

export function campaignRunResultV6(
  campaign: CampaignV6,
  targetCommit: string | null,
): RunCampaignResultV6 {
  return {
    schema_version: "composite-campaign-run-result-v6",
    execution_engine: "codex-exec-v1",
    campaign_id: campaign.campaign_id,
    campaign_status: campaign.campaign_status,
    run_generation: campaign.run_generation,
    integration_head: campaign.integration_head,
    target_commit: targetCommit ?? campaign.finalization?.target_commit ?? null,
    cleanup_status: campaign.finalization?.cleanup_status ?? null,
    block_reason: campaign.block_reason,
  };
}
