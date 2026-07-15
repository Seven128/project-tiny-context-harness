import { randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalYaml,
  parseStrictJson,
  parseStrictYaml,
  sha256Hex,
} from "../composite-campaign-codec.js";
import {
  assertCampaignV6,
  type CampaignV6,
} from "../composite-campaign-schema-v6.js";
import {
  getProcessStartIdentity,
  isProcessAlive,
  matchesRecordedProcessIdentity,
} from "../process-identity.js";

const MAX_CAMPAIGN_FILE_BYTES = 1024 * 1024;
const LOCK_FILE = ".campaign.lock";

export interface CampaignLockV6 {
  schema_version: "campaign-lock-v1";
  pid: number;
  process_start_identity: string;
  operation_id: string;
  started_at: string;
}

export interface CampaignLockHandleV6 {
  root: string;
  lock: CampaignLockV6;
  assertOwned(): Promise<void>;
  close(): Promise<void>;
}

export interface CampaignMutationArtifactsV6 {
  stageFile(
    relativePath: string,
    content: string,
    options?: { immutable?: boolean },
  ): void;
}

interface StagedArtifactV6 {
  relativePath: string;
  content: string;
  immutable: boolean;
}

export async function loadCampaignStoreV6(
  projectRoot: string,
  supplied: string,
): Promise<{ root: string; campaign: CampaignV6 }> {
  const root = await resolveCampaignRootV6(projectRoot, supplied);
  const campaign = assertCampaignV6(
    parseStrictYaml(
      await readBounded(path.join(root, "campaign.yaml"), "campaign.yaml"),
    ),
  );
  const source = await readBounded(
    path.join(root, "source-plan.md"),
    "source-plan.md",
  );
  if (sha256Hex(source) !== campaign.source_plan_sha256)
    throw new Error("immutable_source_plan_hash_mismatch");
  return { root, campaign };
}

export async function resolveCampaignRootV6(
  projectRoot: string,
  supplied: string,
): Promise<string> {
  const project = path.resolve(projectRoot);
  const base = path.join(project, ".codex", "composite-long-task", "campaigns");
  const root = path.resolve(project, supplied);
  if (!inside(base, root) || samePath(base, root))
    throw new Error("campaign_path_escapes_campaign_root");
  const [baseReal, rootReal] = await Promise.all([
    realpath(base),
    realpath(root),
  ]);
  if (!inside(baseReal, rootReal) || samePath(baseReal, rootReal))
    throw new Error("campaign_realpath_escapes_campaign_root");
  return rootReal;
}

export async function acquireCampaignLockV6(
  campaignRoot: string,
  operation: string,
): Promise<CampaignLockHandleV6> {
  if (!operation.trim()) throw new Error("campaign_lock_operation_empty");
  const root = path.resolve(campaignRoot);
  const lockPath = path.join(root, LOCK_FILE);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prior = await optionalCampaignLockV6(root);
    if (prior) {
      if (await campaignLockOwnerMatchesV6(prior))
        throw new Error(`campaign_lock_active:${prior.operation_id}`);
      await rm(lockPath, { force: true });
    }
    const lock: CampaignLockV6 = {
      schema_version: "campaign-lock-v1",
      pid: process.pid,
      process_start_identity:
        (await getProcessStartIdentity(process.pid)) ??
        (() => {
          throw new Error("campaign_lock_process_identity_unavailable");
        })(),
      operation_id: randomUUID(),
      started_at: new Date().toISOString(),
    };
    try {
      await writeDurable(lockPath, canonicalJson(lock), "wx");
      return lockHandle(root, lock);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt === 2)
        throw error;
    }
  }
  throw new Error("campaign_lock_acquisition_failed");
}

export async function optionalCampaignLockV6(
  campaignRoot: string,
): Promise<CampaignLockV6 | null> {
  try {
    const value = parseStrictJson(
      await readFile(path.join(path.resolve(campaignRoot), LOCK_FILE), "utf8"),
    );
    return assertCampaignLockV6(value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function campaignLockOwnerAliveV6(lock: CampaignLockV6): boolean {
  return isProcessAlive(lock.pid);
}

export async function campaignLockOwnerMatchesV6(
  lock: CampaignLockV6,
): Promise<boolean> {
  return matchesRecordedProcessIdentity(lock.pid, lock.process_start_identity);
}

export async function mutateCampaignStoreV6(
  projectRoot: string,
  campaignPath: string,
  eventType: string,
  mutate: (
    root: string,
    campaign: CampaignV6,
    artifacts: CampaignMutationArtifactsV6,
  ) => Promise<CampaignV6>,
  suppliedLock?: CampaignLockHandleV6,
): Promise<CampaignV6> {
  const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
  const owned =
    suppliedLock ?? (await acquireCampaignLockV6(loaded.root, eventType));
  if (!samePath(owned.root, loaded.root))
    throw new Error("campaign_lock_root_mismatch");
  try {
    await owned.assertOwned();
    const current = (await loadCampaignStoreV6(projectRoot, loaded.root))
      .campaign;
    const expectedGeneration = current.generation;
    const staged: StagedArtifactV6[] = [];
    const artifacts: CampaignMutationArtifactsV6 = {
      stageFile(relativePath, content, options = {}) {
        validateArtifactPath(relativePath);
        if (staged.some((item) => item.relativePath === relativePath))
          throw new Error(`campaign_artifact_staged_twice:${relativePath}`);
        staged.push({
          relativePath,
          content,
          immutable: options.immutable ?? false,
        });
      },
    };
    const next = await mutate(loaded.root, structuredClone(current), artifacts);
    next.generation = expectedGeneration + 1;
    assertCampaignV6(next);
    await owned.assertOwned();
    await commitArtifacts(loaded.root, staged, owned);
    await owned.assertOwned();
    await writeAtomic(
      path.join(loaded.root, "campaign.yaml"),
      canonicalYaml(next),
    );
    await appendCampaignEventV6(
      loaded.root,
      {
        type: eventType,
        campaign_id: next.campaign_id,
        generation: next.generation,
        run_generation: next.run_generation,
        campaign_status: next.campaign_status,
        occurred_at: new Date().toISOString(),
      },
      owned,
    );
    return next;
  } finally {
    if (!suppliedLock) await owned.close();
  }
}

export async function appendCampaignEventV6(
  campaignRoot: string,
  event: Record<string, unknown>,
  lock: CampaignLockHandleV6,
): Promise<void> {
  const root = path.resolve(campaignRoot);
  if (!samePath(root, lock.root))
    throw new Error("campaign_event_lock_mismatch");
  await lock.assertOwned();
  await appendFile(
    path.join(root, "events.ndjson"),
    `${canonicalJson(event).trimEnd()}\n`,
    {
      encoding: "utf8",
      flag: "a",
    },
  );
}

export async function writeInitialCampaignStoreV6(options: {
  campaignPath: string;
  campaign: CampaignV6;
  sourcePlan: string;
  sourceCoverageDraft: string;
}): Promise<void> {
  const campaignPath = path.resolve(options.campaignPath);
  const staging = `${campaignPath}.tmp-${process.pid}-${Date.now()}`;
  assertCampaignV6(options.campaign);
  await mkdir(path.dirname(campaignPath), { recursive: true });
  await mkdir(staging, { recursive: false });
  try {
    await writeDurable(
      path.join(staging, "source-plan.md"),
      options.sourcePlan,
      "wx",
    );
    await writeDurable(
      path.join(staging, "source-coverage.json"),
      options.sourceCoverageDraft,
      "wx",
    );
    await writeDurable(
      path.join(staging, "campaign.yaml"),
      canonicalYaml(options.campaign),
      "wx",
    );
    await writeDurable(
      path.join(staging, "events.ndjson"),
      `${canonicalJson({
        type: "campaign_v6_created",
        campaign_id: options.campaign.campaign_id,
        generation: options.campaign.generation,
        run_generation: options.campaign.run_generation,
        campaign_status: options.campaign.campaign_status,
        occurred_at: options.campaign.created_at,
      }).trimEnd()}\n`,
      "wx",
    );
    await rename(staging, campaignPath);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

function lockHandle(root: string, lock: CampaignLockV6): CampaignLockHandleV6 {
  let closed = false;
  return {
    root,
    lock,
    async assertOwned() {
      if (closed) throw new Error("campaign_lock_closed");
      const current = await optionalCampaignLockV6(root);
      if (!current || canonicalJson(current) !== canonicalJson(lock))
        throw new Error("campaign_lock_ownership_lost");
    },
    async close() {
      if (closed) return;
      closed = true;
      const current = await optionalCampaignLockV6(root);
      if (current && canonicalJson(current) === canonicalJson(lock))
        await rm(path.join(root, LOCK_FILE), { force: true });
    },
  };
}

function assertCampaignLockV6(value: unknown): CampaignLockV6 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("campaign_lock_invalid");
  const row = value as Record<string, unknown>;
  const keys = [
    "schema_version",
    "pid",
    "process_start_identity",
    "operation_id",
    "started_at",
  ];
  if (
    row.schema_version !== "campaign-lock-v1" ||
    !Number.isInteger(row.pid) ||
    (row.pid as number) < 1 ||
    typeof row.process_start_identity !== "string" ||
    !row.process_start_identity ||
    typeof row.operation_id !== "string" ||
    !/^[a-f0-9-]{32,36}$/iu.test(row.operation_id) ||
    typeof row.started_at !== "string" ||
    !Number.isFinite(Date.parse(row.started_at)) ||
    keys.some((key) => !Object.hasOwn(row, key)) ||
    Object.keys(row).some((key) => !keys.includes(key))
  )
    throw new Error("campaign_lock_invalid");
  return row as unknown as CampaignLockV6;
}

async function commitArtifacts(
  root: string,
  staged: StagedArtifactV6[],
  lock: CampaignLockHandleV6,
): Promise<void> {
  for (const artifact of staged.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : 1,
  )) {
    await lock.assertOwned();
    const target = path.resolve(root, artifact.relativePath);
    if (!inside(root, target) || samePath(root, target))
      throw new Error("campaign_artifact_target_escapes_root");
    if (artifact.immutable) {
      try {
        const current = await readFile(target, "utf8");
        if (current === artifact.content) continue;
        throw new Error(
          `immutable_campaign_artifact_conflict:${artifact.relativePath}`,
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    await writeAtomic(target, artifact.content);
  }
}

async function writeAtomic(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeDurable(temporary, content, "wx");
  await rename(temporary, file);
}

async function writeDurable(
  file: string,
  content: string,
  flag: "w" | "wx",
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(file, flag);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function readBounded(file: string, label: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_CAMPAIGN_FILE_BYTES)
    throw new Error(
      `${label}_must_be_regular_file_no_larger_than_${MAX_CAMPAIGN_FILE_BYTES}`,
    );
  return readFile(file, "utf8");
}

function validateArtifactPath(value: string): void {
  if (
    !value ||
    path.isAbsolute(value) ||
    value.split(/[\\/]/u).some((segment) => !segment || segment === "..")
  )
    throw new Error("campaign_artifact_relative_path_invalid");
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
