import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodexExecArgv,
  redactedCodexExecArgv,
} from "./codex-exec-client.js";
import { routeCodexExecProfileV1 } from "./composite-campaign-exec-policy.js";
import { readConflictProfile } from "./composite-campaign-gates-v6.js";
import { planCampaignNextActionV6 } from "./composite-campaign-planner-v6.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import {
  inspectManagedWorktreeBudgetV1,
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  repositoryRelativeWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";
import { parseCurrentScopeV6 } from "./composite-runtime-v6/campaign-packet-io.js";
import type { ModelProfile } from "./codex-model-profile.js";
import type { CampaignDryRunV6 } from "./composite-campaign-runner-types-v6.js";

export async function dryRunCampaignV6(options: {
  projectRoot: string;
  campaignPath: string;
  controllerProfile: ModelProfile | null;
}): Promise<CampaignDryRunV6> {
  const loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  const campaign = loaded.campaign;
  const profiles = resolveDryRunProfiles(campaign, options.controllerProfile);
  const scope = parseCurrentScopeV6(
    await readFile(path.join(loaded.root, "scope-fit.json"), "utf8"),
  );
  const preliminary = planCampaignNextActionV6({ campaign, scope });
  let readyWave: string[] = [];
  let authoring: string[] = [];
  if (preliminary.action === "resume_wave")
    readyWave = campaign.waves[preliminary.wave_id].slice_ids;
  else if (preliminary.action === "author_packets")
    authoring = preliminary.slice_ids;
  else if (
    preliminary.action === "inconsistent_state" &&
    preliminary.reason === "ready_conflict_profiles_required"
  )
    readyWave = await dryRunReadyWave(loaded.root, campaign, scope);
  const paths = managedCampaignWorktreePathsV1(
    options.projectRoot,
    campaign.campaign_id,
  );
  const slicePaths = Object.fromEntries(
    readyWave.map((sliceId) => [
      sliceId,
      repositoryRelativeWorktreePathV1(
        options.projectRoot,
        managedSliceWorktreePathV1(
          options.projectRoot,
          campaign.campaign_id,
          sliceId,
        ),
      ),
    ]),
  );
  const budget = await inspectManagedWorktreeBudgetV1({
    repositoryRoot: options.projectRoot,
    campaignId: campaign.campaign_id,
    expectedWorktrees: [
      paths.integration,
      ...readyWave.map((sliceId) =>
        managedSliceWorktreePathV1(
          options.projectRoot,
          campaign.campaign_id,
          sliceId,
        ),
      ),
    ],
  });
  const runtimeRoot = path.join(
    options.projectRoot,
    "tmp",
    "ty-context",
    "dry-run",
  );
  return {
    schema_version: "composite-campaign-dry-run-v6",
    campaign_id: campaign.campaign_id,
    execution_engine: "codex-exec-v1",
    ready_wave: readyWave,
    packet_authoring_slice_ids: authoring,
    fixed_worktrees: {
      integration: repositoryRelativeWorktreePathV1(
        options.projectRoot,
        paths.integration,
      ),
      sfc: slicePaths,
      repair: repositoryRelativeWorktreePathV1(
        options.projectRoot,
        paths.repair,
      ),
    },
    worker_profiles: {
      authoring: profiles.authoring,
      execution: profiles.execution,
      repair: profiles.execution,
    },
    redacted_exec_argv: {
      authoring: redactedCodexExecArgv(
        buildCodexExecArgv({
          kind: "authoring",
          cwd: paths.integration,
          profile: profiles.authoring,
          outputSchemaFile: path.join(runtimeRoot, "packet.schema.json"),
          outputLastMessageFile: path.join(runtimeRoot, "packet.output.json"),
        }),
      ),
      execution: redactedCodexExecArgv(
        buildCodexExecArgv({
          kind: "execution",
          cwd: readyWave.length
            ? managedSliceWorktreePathV1(
                options.projectRoot,
                campaign.campaign_id,
                readyWave[0],
              )
            : path.join(paths.sfcRoot, "<sfc-id>"),
          profile: profiles.execution,
        }),
      ),
      repair: redactedCodexExecArgv(
        buildCodexExecArgv({
          kind: "repair",
          cwd: paths.repair,
          profile: profiles.execution,
        }),
      ),
    },
    worktree_budget: budget,
    codex_invoked: false,
  };
}

async function dryRunReadyWave(
  campaignRoot: string,
  campaign: CampaignV6,
  scope: ReturnType<typeof parseCurrentScopeV6>,
): Promise<string[]> {
  const integrated = new Set(
    Object.entries(campaign.slices)
      .filter(([, slice]) => slice.status === "integration_verified")
      .map(([sliceId]) => sliceId),
  );
  const candidates = scope.slices.filter(
    (slice) =>
      !integrated.has(slice.slice_id) &&
      slice.depends_on.every((dependency) => integrated.has(dependency)) &&
      campaign.slices[slice.slice_id]?.status === "packet_ready",
  );
  const profiles = await Promise.all(
    candidates.map(
      async (slice) =>
        [
          slice.slice_id,
          await readConflictProfile(campaignRoot, campaign, slice.slice_id),
        ] as const,
    ),
  );
  const action = planCampaignNextActionV6({
    campaign,
    scope,
    readyConflictProfiles: Object.fromEntries(profiles),
  });
  return action.action === "launch_wave" ? action.schedule.slice_ids : [];
}

function resolveDryRunProfiles(
  campaign: CampaignV6,
  controller: ModelProfile | null,
): { authoring: ModelProfile; execution: ModelProfile } {
  if (campaign.execution_engine.frozen) {
    const authoring = campaign.execution_engine.authoring_profile;
    const execution = campaign.execution_engine.execution_profile;
    if (!authoring || !execution)
      throw new Error("campaign_frozen_profiles_missing");
    if (
      controller &&
      (controller.model !== authoring.model ||
        controller.effort !== authoring.effort)
    )
      throw new Error("campaign_controller_profile_drift");
    return { authoring, execution };
  }
  if (!controller) throw new Error("controller_profile_required_for_dry_run");
  const decision = routeCodexExecProfileV1(controller);
  return {
    authoring: decision.authoring_profile,
    execution: decision.execution_profile,
  };
}
