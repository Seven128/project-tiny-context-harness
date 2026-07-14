import {
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  canonicalYaml,
  sha256Hex,
} from "./composite-campaign-codec.js";
import { currentBranch, runGit } from "./composite-campaign-git-baseline.js";
import {
  loadCampaignStoreV5,
  mutateCampaignStoreV5,
} from "./composite-runtime-v5/campaign-store.js";
import {
  CAMPAIGN_SCHEMA_V5,
  assertCampaignV5,
  campaignHasGoalV5,
  emptyExecutionHostV5,
  type CampaignPolicyV5,
  type CampaignThreadStateV5,
  type CampaignV5,
  type ControllerProfileV5,
} from "./composite-campaign-schema-v5.js";
import { portablePathSlug } from "./composite-campaign-worktree.js";
import { resolveInside } from "./long-task-path-policy.js";
import { parseSourceCoverageV2 } from "./composite-campaign-source-coverage.js";
import {
  assertCampaignContextBaselineFresh,
  captureCampaignContextBaseline,
} from "./context-graph-snapshot.js";
import {
  buildInitialCampaignEventV1,
  type CampaignMutationTransactionV1,
} from "./composite-campaign-transaction-store.js";

const MAX_PLAN_BYTES = 1024 * 1024;

export async function createCampaignV5(
  projectRoot: string,
  id: string,
  planFile: string,
  targetBranch?: string,
  policy: Partial<CampaignPolicyV5> = {},
): Promise<{ campaign: CampaignV5; campaign_path: string }> {
  portableId(id, "campaign");
  const root = await realpath(path.resolve(projectRoot));
  const sourcePath = await realpath(resolveInside(root, planFile, "plan-file"));
  if (!inside(root, sourcePath))
    throw new Error("plan-file escapes the repository through a symlink");
  const info = await stat(sourcePath);
  if (!info.isFile() || info.size > MAX_PLAN_BYTES)
    throw new Error(`plan-file must be no larger than ${MAX_PLAN_BYTES} bytes`);
  const source = await readFile(sourcePath, "utf8");
  if (!source.trim())
    throw new Error("Composite campaign plan must not be empty");
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
  await mkdir(path.dirname(campaignPath), { recursive: true });
  const campaign: CampaignV5 = {
    schema_version: CAMPAIGN_SCHEMA_V5,
    campaign_id: id,
    source_plan_sha256: sha256Hex(source),
    source_kind: "discussed_plan",
    created_at: new Date().toISOString(),
    target_branch: target,
    base_commit: null,
    integration_branch: `tyctx/campaign/${portablePathSlug(id)}/integration`,
    integration_head: null,
    graph: {
      graph_revision: 0,
      graph_sha256: sha256Hex(canonicalValueJson({ slices: [] })),
      slices: {},
    },
    slices: {},
    waves: {},
    generation: 1,
    campaign_status: "planning",
    context_baseline: contextBaseline,
    campaign_policy: {
      auto_push: policy.auto_push ?? true,
      protected_branch_mode: "pull_request",
      preserve_primary_worktree: true,
    },
    execution_host: emptyExecutionHostV5(),
    repair_threads: {},
  };
  assertCampaignV5(campaign);
  const staging = `${campaignPath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: false });
  try {
    await writeFile(path.join(staging, "source-plan.md"), source, {
      flag: "wx",
    });
    await writeFile(
      path.join(staging, "source-coverage.json"),
      canonicalJson({
        schema_version: "composite-source-coverage-draft-v2",
        source_plan_sha256: campaign.source_plan_sha256,
        status: "authoring_required",
        items: [],
        global_constraint_bindings: [],
      }),
      { flag: "wx" },
    );
    await writeFile(
      path.join(staging, "campaign.yaml"),
      canonicalYaml(campaign),
      { flag: "wx" },
    );
    await writeFile(
      path.join(staging, "events.ndjson"),
      `${buildInitialCampaignEventV1({ type: "campaign_v5_created", campaign_id: id, generation: 1, campaign_status: "planning", occurred_at: campaign.created_at })}\n`,
      { flag: "wx" },
    );
    await rename(staging, campaignPath);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { campaign, campaign_path: campaignPath };
}

export async function loadCampaignV5(
  projectRoot: string,
  campaignPath: string,
): Promise<{ root: string; campaign: CampaignV5 }> {
  const loaded = await loadCampaignStoreV5(projectRoot, campaignPath);
  if (campaignHasGoalV5(loaded.campaign))
    await assertFrozenCampaignContextFresh(projectRoot, loaded.campaign);
  return loaded;
}

export async function mutateCampaignV5(
  projectRoot: string,
  campaignPath: string,
  eventType: string,
  mutate: (
    root: string,
    campaign: CampaignV5,
    transaction: CampaignMutationTransactionV1,
  ) => Promise<CampaignV5>,
): Promise<CampaignV5> {
  const updated = await mutateCampaignStoreV5(
    projectRoot,
    campaignPath,
    eventType,
    async (root, campaign, transaction) => {
      const current = assertCampaignV5(campaign);
      if (campaignHasGoalV5(current))
        await assertFrozenCampaignContextFresh(projectRoot, current);
      return mutate(root, current, transaction);
    },
  );
  return assertCampaignV5(updated);
}

async function assertFrozenCampaignContextFresh(
  projectRoot: string,
  campaign: CampaignV5,
): Promise<void> {
  try {
    await assertCampaignContextBaselineFresh(
      projectRoot,
      campaign.context_baseline,
      Object.keys(campaign.context_baseline.files),
    );
  } catch (error) {
    throw new Error(
      `context_changed_after_campaign_goal:${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function configureCampaignHostV5(
  projectRoot: string,
  campaignPath: string,
  input: {
    controller_thread_id?: string | null;
    controller_profile: ControllerProfileV5;
    model_catalog_sha256: string;
    app_server_version: string;
  },
): Promise<CampaignV5> {
  return mutateCampaignV5(
    projectRoot,
    campaignPath,
    "execution_host_connected",
    async (_root, campaign) => {
      campaign.execution_host = {
        ...campaign.execution_host,
        controller_thread_id: input.controller_thread_id ?? null,
        controller_profile: input.controller_profile,
        model_catalog_sha256: input.model_catalog_sha256,
        app_server_version: input.app_server_version,
        status: "connected",
        last_error_code: null,
      };
      return campaign;
    },
  );
}

export async function updateSliceThreadV5(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
  eventType: string,
  update: (state: CampaignThreadStateV5) => CampaignThreadStateV5,
): Promise<CampaignV5> {
  return mutateCampaignV5(
    projectRoot,
    campaignPath,
    eventType,
    async (_root, campaign) => {
      const slice = campaign.slices[sliceId];
      if (!slice) throw new Error(`campaign_slice_unknown:${sliceId}`);
      slice.thread = update(slice.thread);
      return campaign;
    },
  );
}

export async function setHostFailureV5(
  projectRoot: string,
  campaignPath: string,
  code: string,
  waitExternal: boolean,
): Promise<CampaignV5> {
  return mutateCampaignV5(
    projectRoot,
    campaignPath,
    "execution_host_failure",
    async (_root, campaign) => {
      campaign.execution_host.status = waitExternal
        ? "wait_external"
        : "reconnecting";
      campaign.execution_host.last_error_code = code;
      if (!waitExternal) campaign.execution_host.restart_count = 1;
      else campaign.campaign_status = "externally_blocked";
      return campaign;
    },
  );
}

export async function applyCampaignCoverageV5(
  projectRoot: string,
  campaignPath: string,
  inputFile: string,
): Promise<CampaignV5> {
  const root = await realpath(path.resolve(projectRoot));
  const file = await realpath(
    resolveInside(root, inputFile, "source-coverage-input"),
  );
  if (!inside(root, file))
    throw new Error(
      "source-coverage-input escapes the repository through a symlink",
    );
  const coverage = parseSourceCoverageV2(await readFile(file, "utf8"));
  return mutateCampaignV5(
    projectRoot,
    campaignPath,
    "source_coverage_applied",
    async (_campaignRoot, campaign, transaction) => {
      if (coverage.source_plan_sha256 !== campaign.source_plan_sha256)
        throw new Error("Campaign source coverage/plan hash mismatch");
      await transaction.stageFile(
        "source-coverage.json",
        canonicalJson(coverage),
      );
      return campaign;
    },
  );
}

function portableId(value: string, label: string): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) ||
    /[. ]$/u.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value)
  )
    throw new Error(`${label} id is not portable`);
}
function assertNoSecret(value: string): void {
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(
      value,
    )
  )
    throw new Error("plan contains a raw credential or private key");
}
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
