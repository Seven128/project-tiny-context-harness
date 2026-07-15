import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  parseStrictJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import {
  assertChangedPathsWithinEnvelopeV1,
  unionChangeEnvelopesV1,
  validateChangeEnvelopeV1,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";
import {
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  managedCampaignWorktreePathsV1,
  removeManagedWorktreeV1,
  resetManagedRepairWorktreeV1,
} from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
import {
  runRepairExecWorkerV6,
  CampaignWorkerInterruptedError,
  type CampaignWorkerRuntimeV6,
} from "./composite-campaign-exec-worker.js";
import { isCodexTargetUnavailable } from "./composite-campaign-exec-policy.js";
import type {
  CampaignRepairV6,
  CampaignV6,
} from "./composite-campaign-schema-v6.js";
import { currentPacketRevisionPathV6 } from "./composite-runtime-v6/campaign-packet-io.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { assertCampaignDispatchAllowedV6 } from "./composite-campaign-dispatch-v6.js";

export interface SerializedRepairRequestV6 {
  kind: Exclude<CampaignRepairV6["kind"], null>;
  affectedSliceIds: string[];
  findingsFile?: string;
  mergeTarget?: string;
  explicitConflictPaths?: string[];
  maxAttempts?: number;
}

export interface SerializedRepairResultV6 {
  schema_version: "campaign-repair-result-v6";
  kind: Exclude<CampaignRepairV6["kind"], null>;
  base_commit: string;
  repair_head: string;
  integration_head: string;
  changed_paths: string[];
  attempts_this_run: number;
  result_sha256: string;
}

export async function runSerializedRepairV6(
  runtime: CampaignWorkerRuntimeV6,
  request: SerializedRepairRequestV6,
): Promise<SerializedRepairResultV6> {
  let loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  assertNoActiveSliceWorkers(loaded.campaign);
  const integrationHead = await currentHead(runtime.integrationWorktree);
  if (
    loaded.campaign.integration_head &&
    loaded.campaign.integration_head !== integrationHead
  )
    throw new Error("repair_integration_head_state_drift");
  const paths = managedCampaignWorktreePathsV1(
    runtime.projectRoot,
    loaded.campaign.campaign_id,
  );
  const canonicalExpected = deriveExpectedManagedWorktreesV6({
    repositoryRoot: runtime.projectRoot,
    campaign: loaded.campaign,
  });
  const repair = await resetManagedRepairWorktreeV1({
    repositoryRoot: runtime.projectRoot,
    campaignId: loaded.campaign.campaign_id,
    baseCommit: integrationHead,
    expectedWorktrees: [...canonicalExpected.all, paths.repair],
  });
  if (!repair.resumed) runtime.metrics?.increment("worktree_create_count");
  const envelopes = await loadAffectedEnvelopes(
    loaded.root,
    loaded.campaign,
    request.affectedSliceIds,
  );
  const union = unionChangeEnvelopesV1(
    envelopes,
    request.explicitConflictPaths ?? [],
  );
  const manifestIdentity = {
    schema_version: "campaign-repair-manifest-v6" as const,
    campaign_id: loaded.campaign.campaign_id,
    run_generation: loaded.campaign.run_generation,
    kind: request.kind,
    base_commit: integrationHead,
    affected_slice_ids: stable(request.affectedSliceIds),
    change_envelope_sha256: union.envelope_sha256,
    merge_target: request.mergeTarget ?? null,
    findings_file: request.findingsFile ?? null,
    created_at: new Date().toISOString(),
  };
  const manifest = {
    ...manifestIdentity,
    manifest_sha256: sha256Hex(canonicalJson(manifestIdentity)),
  };
  const manifestRelative = `repairs/run-${loaded.campaign.run_generation}-${request.kind}.json`;
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "repair_intent_recorded",
    async (_root, campaign, artifacts) => {
      artifacts.stageFile(manifestRelative, canonicalJson(manifest));
      campaign.repair.status = "needs_work";
      campaign.repair.kind = request.kind;
      campaign.repair.base_commit = integrationHead;
      campaign.repair.head_commit = integrationHead;
      campaign.repair.affected_slice_ids = stable(request.affectedSliceIds);
      campaign.repair.manifest_path = manifestRelative;
      campaign.repair.manifest_sha256 = manifest.manifest_sha256;
      campaign.repair.last_error_code = null;
      campaign.campaign_status = "integrating";
      return campaign;
    },
    runtime.lock,
  );
  if (request.mergeTarget) {
    const merge = await runGit(
      repair.path,
      [
        "-c",
        "commit.gpgSign=false",
        "merge",
        "--no-ff",
        "--no-commit",
        request.mergeTarget,
      ],
      { throwOnError: false, timeoutMs: 120_000 },
    );
    if (merge.exitCode !== 0) {
      const actual = await conflictedPaths(repair.path);
      const declared = new Set(request.explicitConflictPaths ?? []);
      if (actual.some((item) => !declared.has(item)))
        throw new Error(
          `repair_conflict_path_not_declared:${actual.join(",")}`,
        );
    }
  }

  const frozen = (
    await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath)
  ).campaign;
  const authoring = requireProfile(frozen.execution_engine.authoring_profile);
  const routed = requireProfile(frozen.execution_engine.execution_profile);
  let fallbackUsed = frozen.execution_engine.fallback_reason !== null;
  let profile = fallbackUsed ? authoring : routed;
  let priorFinding =
    "Resolve the manifest and leave one or more verified clean commits.";
  const limit = Math.min(
    frozen.campaign_policy.max_repair_attempts_per_run,
    request.maxAttempts ?? frozen.campaign_policy.max_repair_attempts_per_run,
  );
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("repair_attempt_limit_exceeded");
  for (let attempt = 1; attempt <= limit; attempt += 1) {
    await assertRepairDispatch(runtime);
    const prompt = repairPrompt({
      campaign: frozen,
      request,
      worktree: repair.path,
      manifestPath: path.join(loaded.root, manifestRelative),
      envelope: union,
      profile,
      attempt,
      priorFinding,
    });
    const result = await runRepairExecWorkerV6({
      runtime,
      profile,
      worktree: repair.path,
      prompt,
    });
    if (result.interrupted) throw new CampaignWorkerInterruptedError();
    await assertRepairDispatch(runtime);
    if (
      !fallbackUsed &&
      (profile.model !== authoring.model ||
        profile.effort !== authoring.effort) &&
      isCodexTargetUnavailable(
        `${result.stderr}\n${canonicalJson(result.events).slice(0, 100_000)}`,
      )
    ) {
      fallbackUsed = true;
      profile = authoring;
      await mutateCampaignV6(
        runtime.projectRoot,
        runtime.campaignPath,
        "repair_target_unavailable_passthrough",
        async (_root, campaign) => {
          campaign.execution_engine.fallback_reason =
            "target_unavailable_passthrough";
          campaign.repair.last_error_code = "target_unavailable_passthrough";
          return campaign;
        },
        runtime.lock,
      );
      await assertRepairDispatch(runtime);
      continue;
    }
    try {
      const status = await gitStatus(repair.path);
      if (!status.clean) throw new Error("repair_worktree_not_clean");
      const head = await currentHead(repair.path);
      if (head === integrationHead) throw new Error("repair_commit_missing");
      const descendant = await runGit(
        repair.path,
        ["merge-base", "--is-ancestor", integrationHead, head],
        { throwOnError: false },
      );
      if (descendant.exitCode !== 0)
        throw new Error("repair_head_not_descendant");
      const changedPaths = await diffPaths(repair.path, integrationHead, head);
      assertChangedPathsWithinEnvelopeV1(changedPaths, union);
      if ((await currentHead(runtime.integrationWorktree)) !== integrationHead)
        throw new Error("repair_base_changed_during_worker");
      await runGit(
        runtime.integrationWorktree,
        [
          "-c",
          "commit.gpgSign=false",
          "merge",
          "--no-ff",
          "--no-edit",
          "-m",
          `repair(ty-context): campaign ${frozen.campaign_id} ${request.kind}`,
          head,
        ],
        { timeoutMs: 120_000 },
      );
      const newIntegrationHead = await currentHead(runtime.integrationWorktree);
      const identity = {
        schema_version: "campaign-repair-result-v6" as const,
        kind: request.kind,
        base_commit: integrationHead,
        repair_head: head,
        integration_head: newIntegrationHead,
        changed_paths: changedPaths,
        attempts_this_run: attempt,
      };
      const repairResult = {
        ...identity,
        result_sha256: sha256Hex(canonicalJson(identity)),
      };
      await mutateCampaignV6(
        runtime.projectRoot,
        runtime.campaignPath,
        "repair_integrated",
        async (_root, campaign, artifacts) => {
          artifacts.stageFile(
            `repairs/run-${campaign.run_generation}-${request.kind}-result.json`,
            canonicalJson(repairResult),
          );
          campaign.integration_head = newIntegrationHead;
          campaign.repair.status = "idle";
          campaign.repair.kind = null;
          campaign.repair.base_commit = null;
          campaign.repair.head_commit = null;
          campaign.repair.affected_slice_ids = [];
          campaign.repair.manifest_path = null;
          campaign.repair.manifest_sha256 = null;
          campaign.repair.current_worker_run = null;
          campaign.repair.last_error_code = null;
          return campaign;
        },
        runtime.lock,
      );
      await removeManagedWorktreeV1({
        repositoryRoot: runtime.projectRoot,
        campaignId: frozen.campaign_id,
        worktreePath: repair.path,
      });
      runtime.metrics?.increment("worktree_remove_count");
      await mutateCampaignV6(
        runtime.projectRoot,
        runtime.campaignPath,
        "repair_worktree_removed",
        async (_root, campaign) => campaign,
        runtime.lock,
      );
      return repairResult;
    } catch (error) {
      priorFinding = errorText(error);
      await mutateCampaignV6(
        runtime.projectRoot,
        runtime.campaignPath,
        "repair_needs_work",
        async (_root, campaign) => {
          campaign.repair.status = "needs_work";
          campaign.repair.last_error_code = bounded(priorFinding);
          return campaign;
        },
        runtime.lock,
      );
    }
  }
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "repair_attempt_limit_exceeded",
    async (_root, campaign) => {
      campaign.repair.status = "blocked";
      campaign.repair.last_error_code = "repair_attempt_limit_exceeded";
      campaign.campaign_status = "blocked";
      campaign.block_reason = "repair_attempt_limit_exceeded";
      return campaign;
    },
    runtime.lock,
  );
  throw new Error(`repair_attempt_limit_exceeded:${request.kind}`);
}

async function loadAffectedEnvelopes(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceIds: string[],
): Promise<ChangeEnvelopeV1[]> {
  return Promise.all(
    stable(sliceIds).map(async (sliceId) => {
      const revision = currentPacketRevisionPathV6(
        campaignRoot,
        campaign,
        sliceId,
      );
      return validateChangeEnvelopeV1(
        parseStrictJson(
          await readFile(path.join(revision, "change-envelope.json"), "utf8"),
        ) as ChangeEnvelopeV1,
      );
    }),
  );
}

function repairPrompt(options: {
  campaign: CampaignV6;
  request: SerializedRepairRequestV6;
  worktree: string;
  manifestPath: string;
  envelope: ChangeEnvelopeV1;
  profile: { model: string; effort: string };
  attempt: number;
  priorFinding: string;
}): string {
  return `Composite Campaign V6 bounded serialized repair Worker attempt ${options.attempt}.

Campaign ID: ${options.campaign.campaign_id}
Repair kind: ${options.request.kind}
Affected SFCs: ${stable(options.request.affectedSliceIds).join(", ")}
Detached repair worktree: ${options.worktree}
Repair manifest: ${options.manifestPath}
Union Change Envelope SHA-256: ${options.envelope.envelope_sha256}
Execution profile: ${options.profile.model} / ${options.profile.effort}
Current machine finding: ${options.priorFinding}

Read the manifest, affected frozen Packets/Contract V3 authorities, current worktree and any referenced gate result. Preserve all legal existing changes, resolve only this repair inside the union Change Envelope, run focused verification, and create one or more clean commits. Do not change Scope Fit, Packet, Context, Campaign state or Integration; do not create branches/worktrees, start subagents, invoke any Long-Task campaign command, lower proof, or claim acceptance. The foreground scheduler will independently validate the repair commit and rerun the controlling Integration/Campaign Gate.`;
}

function assertNoActiveSliceWorkers(campaign: CampaignV6): void {
  for (const [sliceId, slice] of Object.entries(campaign.slices)) {
    const run = slice.current_worker_run;
    if (run?.status === "running" && run.pid && alive(run.pid))
      throw new Error(`repair_forbidden_while_slice_worker_active:${sliceId}`);
  }
}
async function conflictedPaths(root: string): Promise<string[]> {
  const result = await runGit(
    root,
    ["diff", "--name-only", "--diff-filter=U", "-z"],
    {
      throwOnError: false,
    },
  );
  return result.stdout
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort(ascii);
}
async function diffPaths(
  root: string,
  base: string,
  head: string,
): Promise<string[]> {
  const result = await runGit(root, [
    "diff",
    "--name-only",
    "--no-renames",
    base,
    head,
  ]);
  return result.stdout
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort(ascii);
}
function requireProfile(profile: { model: string; effort: string } | null) {
  if (!profile || profile.model === "unknown" || profile.effort === "unknown")
    throw new Error("repair_execution_profile_required");
  return profile;
}
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
function stable(values: string[]): string[] {
  return [...new Set(values)].sort(ascii);
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function bounded(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").slice(0, 500) || "repair_needs_work";
}

async function assertRepairDispatch(
  runtime: CampaignWorkerRuntimeV6,
): Promise<void> {
  await assertCampaignDispatchAllowedV6({
    projectRoot: runtime.projectRoot,
    campaignPath: runtime.campaignPath,
    campaignRoot: runtime.campaignRoot,
    lock: runtime.lock,
    expectedRunGeneration: runtime.runGeneration,
    signal: runtime.signal,
  });
}
