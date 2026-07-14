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
  parseStrictYaml,
  sha256Hex,
} from "../composite-campaign-codec.js";
import { currentBranch, runGit } from "../composite-campaign-git-baseline.js";
import {
  CAMPAIGN_SCHEMA_V4,
  assertCampaignV4,
  type CampaignV4,
} from "../composite-campaign-schema-v4.js";
import { buildInitialCampaignEventV1 } from "../composite-campaign-transaction-store.js";
import { portablePathSlug } from "../composite-campaign-worktree.js";
import { resolveInside } from "../long-task-path-policy.js";

const MAX_AUDIT_FILE_BYTES = 1024 * 1024;

export async function createCampaignV4(
  projectRoot: string,
  id: string,
  planFile: string,
  targetBranch?: string,
): Promise<{ campaign: CampaignV4; campaign_path: string }> {
  validatePortableId(id, "campaign");
  const root = path.resolve(projectRoot);
  const source = await readSafeFile(root, planFile, "plan-file");
  if (!source.text.trim())
    throw new Error("Composite campaign plan must not be empty");
  assertNoRawSecret(source.text, "plan");
  const target = targetBranch ?? (await currentBranch(root));
  await runGit(root, ["check-ref-format", "--branch", target]);
  const campaignPath = campaignAuditRootV4(root, id);
  await mkdir(path.dirname(campaignPath), { recursive: true });
  const campaign: CampaignV4 = {
    schema_version: CAMPAIGN_SCHEMA_V4,
    campaign_id: id,
    source_plan_sha256: sha256Hex(source.text),
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
  };
  const staging = `${campaignPath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: false });
  try {
    await writeFile(path.join(staging, "source-plan.md"), source.text, {
      flag: "wx",
    });
    await writeFile(
      path.join(staging, "source-coverage.json"),
      canonicalJson({
        schema_version: "composite-source-coverage-draft-v1",
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
      `${buildInitialCampaignEventV1(event("campaign_v4_audit_created", campaign))}\n`,
      { flag: "wx" },
    );
    await rename(staging, campaignPath);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { campaign, campaign_path: campaignPath };
}

export async function loadCampaignAuditV4(
  projectRoot: string,
  supplied: string,
): Promise<{ root: string; campaign: CampaignV4 }> {
  const project = path.resolve(projectRoot);
  const base = path.join(project, ".codex", "composite-long-task", "campaigns");
  const root = path.resolve(project, supplied);
  if (!inside(base, root) || root === base)
    throw new Error("Campaign path escapes the V4 audit root");
  const [baseReal, rootReal] = await Promise.all([
    realpath(base),
    realpath(root),
  ]);
  if (!inside(baseReal, rootReal) || rootReal === baseReal)
    throw new Error("Campaign realpath escapes the V4 audit root");
  const campaign = assertCampaignV4(
    parseStrictYaml(
      await readBounded(path.join(rootReal, "campaign.yaml"), "campaign.yaml"),
    ),
  );
  const source = await readBounded(
    path.join(rootReal, "source-plan.md"),
    "source-plan.md",
  );
  if (sha256Hex(source) !== campaign.source_plan_sha256)
    throw new Error("Immutable V4 audit source-plan.md hash mismatch");
  return { root: rootReal, campaign };
}

export function campaignAuditRootV4(projectRoot: string, id: string): string {
  return path.join(
    path.resolve(projectRoot),
    ".codex",
    "composite-long-task",
    "campaigns",
    id,
  );
}

async function readSafeFile(
  projectRoot: string,
  supplied: string,
  label: string,
): Promise<{ path: string; text: string }> {
  const project = await realpath(path.resolve(projectRoot));
  const actual = await realpath(resolveInside(project, supplied, label));
  if (!inside(project, actual))
    throw new Error(`${label} escapes the repository through a symlink`);
  return { path: actual, text: await readBounded(actual, label) };
}

async function readBounded(file: string, label: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_AUDIT_FILE_BYTES)
    throw new Error(
      `${label} must be a regular file no larger than ${MAX_AUDIT_FILE_BYTES} bytes`,
    );
  return readFile(file, "utf8");
}

function event(type: string, campaign: CampaignV4): Record<string, unknown> {
  return {
    type,
    campaign_id: campaign.campaign_id,
    generation: campaign.generation,
    campaign_status: campaign.campaign_status,
    occurred_at: new Date().toISOString(),
  };
}

function validatePortableId(value: string, label: string): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) ||
    /[. ]$/u.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value)
  )
    throw new Error(`${label} id is not portable`);
}

function assertNoRawSecret(value: string, label: string): void {
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(
      value,
    )
  )
    throw new Error(`${label} contains a raw credential or private key`);
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
