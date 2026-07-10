import { randomUUID } from "node:crypto";
import { lstat, mkdir } from "node:fs/promises";
import path from "node:path";
import { canonicalYaml, sha256Hex } from "./composite-campaign-codec.js";
import { assertCompositeCampaignPathSafe, resolveCompositeCampaignBasePaths } from "./composite-campaign-paths.js";
import { sanitizeCompositeCampaignRequest } from "./composite-campaign-security.js";
import {
  acquireCompositeCampaignLock,
  releaseCompositeCampaignLock,
  type CompositeCampaignLockOptions
} from "./composite-campaign-lock.js";
import {
  cleanupCommittedCompositeCampaignCreate,
  pendingCompositeCampaignCreateTimestamp,
  publishCompositeCampaignCreate,
  type CompositeCampaignCreatePublication
} from "./composite-campaign-create-atomic.js";
import { syncCompositeDirectory } from "./composite-campaign-atomic-io.js";
import { loadVerifiedCompositeCampaignSnapshot, type VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import { createCompositeCampaignInitialTransition } from "./composite-campaign-store-transitions.js";

export type CompositeCampaignCheckpoint =
  | "before_create_publish"
  | "after_create_manifest"
  | "after_marker_fsync"
  | "after_content_install"
  | "after_event_fsync"
  | "after_manifest_replace"
  | "after_directory_sync";

export interface CompositeCampaignStoreDependencies {
  now(): string;
  token(): string;
  checkpoint(name: CompositeCampaignCheckpoint): Promise<void>;
  lock_timeout_ms?: number;
}

export const defaultCompositeCampaignStoreDependencies: CompositeCampaignStoreDependencies = {
  now: () => new Date().toISOString(),
  token: () => randomUUID(),
  checkpoint: async () => undefined
};

export async function createCompositeCampaign(
  projectRoot: string,
  input: { campaign_id: string; request: string; operation_id: string },
  dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  const sanitizedRequest = sanitizeCompositeCampaignRequest(input.request);
  const provisionalCreatedAt = dependencies.now();
  let transition = createCompositeCampaignInitialTransition({
    campaign_id: input.campaign_id,
    sanitized_request: sanitizedRequest,
    operation_id: input.operation_id,
    created_at: provisionalCreatedAt
  });
  const base = await ensureCompositeCampaignStorageRoot(projectRoot);
  const lockOptions: CompositeCampaignLockOptions = {
    token: dependencies.token,
    now: dependencies.now,
    timeout_ms: dependencies.lock_timeout_ms
  };
  const lock = await acquireCompositeCampaignLock(base.project_root, base.campaigns_root, input.campaign_id, lockOptions);
  try {
    const pendingCreatedAt = await pendingCompositeCampaignCreateTimestamp(
      base.project_root, base.campaigns_root, input.campaign_id
    );
    if (pendingCreatedAt !== null && pendingCreatedAt !== provisionalCreatedAt) {
      transition = createCompositeCampaignInitialTransition({
        campaign_id: input.campaign_id,
        sanitized_request: sanitizedRequest,
        operation_id: input.operation_id,
        created_at: pendingCreatedAt
      });
    }
    const campaignRoot = path.join(base.campaigns_root, input.campaign_id);
    const createMarker = path.join(base.campaigns_root, `.${input.campaign_id}.create.json`);
    await assertCompositeCampaignPathSafe(base.project_root, campaignRoot);
    const manifestContent = canonicalYaml(transition.campaign);
    const publication: CompositeCampaignCreatePublication = {
      campaign_id: transition.campaign.campaign_id,
      transaction_id: transition.transaction_id,
      operation_id: input.operation_id,
      created_at: transition.campaign.created_at,
      request: {
        content: transition.request_content,
        sha256: transition.campaign.request.sha256,
        bytes: transition.campaign.request.bytes
      },
      event: {
        content: transition.event_line,
        sha256: transition.event_line_sha256,
        bytes: Buffer.byteLength(transition.event_line)
      },
      manifest: {
        content: manifestContent,
        sha256: sha256Hex(manifestContent),
        bytes: Buffer.byteLength(manifestContent)
      }
    };
    if (await exists(path.join(campaignRoot, "campaign.yaml"))) {
      const existing = await loadVerifiedCompositeCampaignSnapshot(base.project_root, input.campaign_id);
      const created = existing.events[0];
      if (created?.operation_id === input.operation_id && created.transaction_id === transition.transaction_id) {
        await cleanupCommittedCompositeCampaignCreate(base.project_root, base.campaigns_root, publication, lock);
        return existing;
      }
      throw new Error("Composite campaign already exists with a different creation operation payload");
    }
    if (await exists(campaignRoot) && !await exists(createMarker)) {
      throw new Error("Composite campaign live root exists without an owned create marker");
    }
    await publishCompositeCampaignCreate(base.project_root, base.campaigns_root, publication, lock, dependencies);
    return await loadVerifiedCompositeCampaignSnapshot(base.project_root, input.campaign_id);
  } finally {
    await releaseCompositeCampaignLock(lock);
  }
}

export async function ensureCompositeCampaignStorageRoot(projectRoot: string) {
  let base = await resolveCompositeCampaignBasePaths(projectRoot);
  const relative = path.relative(base.project_root, base.campaigns_root).split(path.sep).filter(Boolean);
  let current = base.project_root;
  for (const component of relative) {
    current = path.join(current, component);
    try {
      await mkdir(current);
      await syncCompositeDirectory(path.dirname(current));
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      const metadata = await lstat(current);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        throw new Error(`Composite campaign storage component is not a safe directory: ${current}`);
      }
    }
    base = await resolveCompositeCampaignBasePaths(base.project_root);
  }
  return base;
}

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}

function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
