import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import { currentBranch, runGit } from "./composite-campaign-git-baseline.js";
import {
  EXECUTION_ENGINE_V1,
  WORKER_COMMAND_TEMPLATE_V1,
  CAMPAIGN_SCHEMA_V6,
  type CampaignPolicyV6,
  type CampaignV6,
} from "./composite-campaign-schema-v6.js";
import { parseSourceCoverageV2 } from "./composite-campaign-source-coverage.js";
import { captureCampaignContextBaseline } from "./context-graph-snapshot.js";
import { resolveInside } from "./long-task-path-policy.js";
import { portablePathSlug } from "./composite-campaign-worktree.js";
import {
  managedCampaignWorktreePathsV1,
  repositoryRelativeWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import {
  MODEL_ROUTING_POLICY,
  MODEL_ROUTING_POLICY_SHA256,
} from "./codex-model-routing-policy.js";
import {
  loadCampaignStoreV6,
  mutateCampaignStoreV6,
  writeInitialCampaignStoreV6,
  type CampaignLockHandleV6,
  type CampaignMutationArtifactsV6,
} from "./composite-runtime-v6/campaign-store.js";

const MAX_PLAN_BYTES = 1024 * 1024;

export async function createCampaignV6(
  projectRoot: string,
  id: string,
  planFile: string,
  targetBranch?: string,
  policy: Partial<CampaignPolicyV6> = {},
): Promise<{ campaign: CampaignV6; campaign_path: string }> {
  portableId(id, "campaign");
  const root = await realpath(path.resolve(projectRoot));
  const sourcePath = await realpath(resolveInside(root, planFile, "plan-file"));
  if (!inside(root, sourcePath))
    throw new Error("plan_file_escapes_repository_through_symlink");
  const info = await stat(sourcePath);
  if (!info.isFile() || info.size > MAX_PLAN_BYTES)
    throw new Error(`plan_file_must_be_no_larger_than_${MAX_PLAN_BYTES}_bytes`);
  const source = await readFile(sourcePath, "utf8");
  if (!source.trim()) throw new Error("composite_campaign_plan_empty");
  assertNoSecret(source);
  const target = targetBranch ?? (await currentBranch(root));
  await runGit(root, ["check-ref-format", "--branch", target]);
  const contextBaseline = await captureCampaignContextBaseline(root, []);
  const campaignPath = path.join(
    root,
    ".codex",
    "composite-long-task",
    "campaigns",
    id,
  );
  const managed = managedCampaignWorktreePathsV1(root, id);
  const createdAt = new Date().toISOString();
  const campaign: CampaignV6 = {
    schema_version: CAMPAIGN_SCHEMA_V6,
    campaign_id: id,
    source_plan_sha256: sha256Hex(source),
    source_kind: "discussed_plan",
    created_at: createdAt,
    target_branch: target,
    base_commit: null,
    integration_ref: `tyctx/campaign/${portablePathSlug(id)}/integration`,
    integration_head: null,
    graph: {
      graph_revision: 0,
      graph_sha256: sha256Hex(canonicalValueJson({ slices: [] })),
      slices: {},
    },
    slices: {},
    waves: {},
    context_baseline: contextBaseline,
    campaign_policy: {
      auto_push: policy.auto_push ?? true,
      protected_branch_mode: "pull_request",
      preserve_primary_worktree: true,
      max_authoring_attempts_per_slice: 3,
      max_execution_attempts_per_run: 4,
      max_repair_attempts_per_run: 4,
      worker_timeout_ms: policy.worker_timeout_ms ?? 2 * 60 * 60 * 1000,
      worker_termination_grace_ms: policy.worker_termination_grace_ms ?? 5_000,
    },
    execution_engine: {
      execution_engine_id: EXECUTION_ENGINE_V1,
      frozen: false,
      codex_cli_version: null,
      model_routing_policy_id: MODEL_ROUTING_POLICY.policy_id,
      model_routing_policy_sha256: MODEL_ROUTING_POLICY_SHA256,
      routing_decision_sha256: null,
      routing_reason: null,
      fallback_reason: null,
      authoring_profile: null,
      execution_profile: null,
      worker_command_template_version: WORKER_COMMAND_TEMPLATE_V1,
      max_parallelism: { authoring: 4, sfc: 4 },
      process_sandbox_policy: {
        authoring: "read-only",
        execution: "workspace-write",
        repair: "workspace-write",
      },
    },
    active_wave: null,
    repair: {
      status: "idle",
      kind: null,
      attempt_count: 0,
      worktree_path: repositoryRelativeWorktreePathV1(root, managed.repair),
      base_commit: null,
      head_commit: null,
      affected_slice_ids: [],
      manifest_path: null,
      manifest_sha256: null,
      current_worker_run: null,
      last_error_code: null,
    },
    finalization: null,
    generation: 1,
    run_generation: 0,
    campaign_status: "planning",
    block_reason: null,
  };
  await writeInitialCampaignStoreV6({
    campaignPath,
    campaign,
    sourcePlan: source,
    sourceCoverageDraft: canonicalJson({
      schema_version: "composite-source-coverage-draft-v2",
      source_plan_sha256: campaign.source_plan_sha256,
      status: "authoring_required",
      items: [],
      global_constraint_bindings: [],
    }),
  });
  return { campaign, campaign_path: campaignPath };
}

export async function loadCampaignV6(
  projectRoot: string,
  campaignPath: string,
): Promise<{ root: string; campaign: CampaignV6 }> {
  return loadCampaignStoreV6(projectRoot, campaignPath);
}

export async function mutateCampaignV6(
  projectRoot: string,
  campaignPath: string,
  eventType: string,
  mutate: (
    root: string,
    campaign: CampaignV6,
    artifacts: CampaignMutationArtifactsV6,
  ) => Promise<CampaignV6>,
  lock?: CampaignLockHandleV6,
): Promise<CampaignV6> {
  return mutateCampaignStoreV6(
    projectRoot,
    campaignPath,
    eventType,
    mutate,
    lock,
  );
}

export async function applyCampaignCoverageV6(
  projectRoot: string,
  campaignPath: string,
  inputFile: string,
  lock?: CampaignLockHandleV6,
): Promise<CampaignV6> {
  const project = await realpath(path.resolve(projectRoot));
  const file = await realpath(
    resolveInside(project, inputFile, "source-coverage-input"),
  );
  if (!inside(project, file))
    throw new Error("source_coverage_input_escapes_repository");
  const coverage = parseSourceCoverageV2(await readFile(file, "utf8"));
  return mutateCampaignV6(
    projectRoot,
    campaignPath,
    "source_coverage_applied",
    async (_root, campaign, artifacts) => {
      if (coverage.source_plan_sha256 !== campaign.source_plan_sha256)
        throw new Error("campaign_source_coverage_plan_hash_mismatch");
      artifacts.stageFile("source-coverage.json", canonicalJson(coverage));
      return campaign;
    },
    lock,
  );
}

function portableId(value: string, label: string): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) ||
    /[. ]$/u.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value)
  )
    throw new Error(`${label}_id_not_portable`);
}
function assertNoSecret(value: string): void {
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(
      value,
    )
  )
    throw new Error("plan_contains_raw_credential_or_private_key");
}
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
