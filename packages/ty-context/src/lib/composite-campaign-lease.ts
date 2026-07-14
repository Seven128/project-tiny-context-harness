import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { open, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson } from "./composite-campaign-codec.js";
import {
  optionalJson,
  writeDurable,
} from "./composite-campaign-transaction-io.js";

const LEASE_MS = 5 * 60 * 1000;
export const CAMPAIGN_LOCK_FILE = ".campaign.lock";

export interface CampaignLeaseV1 {
  schema_version: "campaign-lock-v1";
  operation_id: string;
  pid: number;
  host: string;
  started_at: string;
  lease_expires_at: string;
}

export interface CampaignTransactionHandleV1 {
  lease: CampaignLeaseV1;
  operation: string;
  renew(): Promise<void>;
  assertOwned(): Promise<void>;
  close(): Promise<void>;
}

export async function acquireCampaignLeaseV1(
  root: string,
  operation: string,
): Promise<CampaignTransactionHandleV1> {
  if (!operation.trim()) throw new Error("campaign_lock_operation_empty");
  const campaignRoot = path.resolve(root);
  const { recoverCampaignStoreV1 } =
    await import("./composite-campaign-transaction-store.js");
  await recoverCampaignStoreV1(campaignRoot);
  const lockPath = path.join(campaignRoot, CAMPAIGN_LOCK_FILE);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prior = await optionalJson<CampaignLeaseV1>(lockPath);
    if (prior) {
      assertCampaignLockV1(prior);
      if (campaignLeaseBlocksRecovery(prior))
        throw new Error(`campaign_lease_active:${prior.operation_id}`);
      await rm(lockPath, { force: true });
    }
    const now = new Date();
    const lease: CampaignLeaseV1 = {
      schema_version: "campaign-lock-v1",
      operation_id: randomUUID(),
      pid: process.pid,
      host: hostname(),
      started_at: now.toISOString(),
      lease_expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
    };
    try {
      await writeDurable(lockPath, canonicalJson(lease), "wx");
      return campaignLeaseHandle(lockPath, lease, operation);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt === 2)
        throw error;
    }
  }
  throw new Error("campaign_lease_acquisition_failed");
}

export function campaignLeaseBlocksRecovery(lease: CampaignLeaseV1): boolean {
  return lease.host === hostname()
    ? localLeaseOwnerIsAlive(lease)
    : Date.parse(lease.lease_expires_at) > Date.now();
}

export function assertCampaignLockV1(lock: CampaignLeaseV1): void {
  const expected = [
    "schema_version",
    "operation_id",
    "pid",
    "host",
    "started_at",
    "lease_expires_at",
  ];
  if (
    lock.schema_version !== "campaign-lock-v1" ||
    !/^[a-f0-9-]{32,36}$/iu.test(lock.operation_id) ||
    !Number.isInteger(lock.pid) ||
    lock.pid < 1 ||
    !lock.host ||
    !Number.isFinite(Date.parse(lock.started_at)) ||
    !Number.isFinite(Date.parse(lock.lease_expires_at)) ||
    Object.keys(lock).some((key) => !expected.includes(key)) ||
    expected.some((key) => !Object.hasOwn(lock, key))
  )
    throw new Error("campaign_lock_invalid");
}

function localLeaseOwnerIsAlive(lease: CampaignLeaseV1): boolean {
  if (lease.pid === process.pid) return true;
  try {
    process.kill(lease.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function campaignLeaseHandle(
  lockPath: string,
  lease: CampaignLeaseV1,
  operation: string,
): CampaignTransactionHandleV1 {
  let closed = false;
  let heartbeatFailure: Error | null = null;
  let heartbeat: Promise<void> = Promise.resolve();
  const renewInternal = async (heartbeatMode: boolean): Promise<void> => {
    if (closed) throw new Error("campaign_lease_closed");
    if (!heartbeatMode && heartbeatFailure)
      throw new Error("campaign_lease_heartbeat_failed", {
        cause: heartbeatFailure,
      });
    lease.lease_expires_at = await renewOwnedLease(lockPath, lease);
  };
  const timer = setInterval(
    () => {
      heartbeat = renewInternal(true).catch((error) => {
        heartbeatFailure =
          error instanceof Error ? error : new Error(String(error));
        clearInterval(timer);
      });
    },
    Math.min(60_000, Math.floor(LEASE_MS / 3)),
  );
  timer.unref();
  return {
    lease,
    operation,
    async renew() {
      await renewInternal(false);
    },
    async assertOwned() {
      if (heartbeatFailure)
        throw new Error("campaign_lease_heartbeat_failed", {
          cause: heartbeatFailure,
        });
      await ownedLease(lockPath, lease);
    },
    async close() {
      if (closed) return;
      clearInterval(timer);
      await heartbeat.catch(() => undefined);
      closed = true;
      const current = await optionalJson<CampaignLeaseV1>(lockPath);
      if (current?.operation_id === lease.operation_id)
        await rm(lockPath, { force: true });
    },
  };
}

async function renewOwnedLease(
  lockPath: string,
  lease: CampaignLeaseV1,
): Promise<string> {
  const handle = await open(lockPath, "r+");
  let expiresAt: string;
  try {
    const current = parseStrictJson(
      await handle.readFile("utf8"),
    ) as CampaignLeaseV1;
    assertOwnedLease(current, lease);
    expiresAt = new Date(Date.now() + LEASE_MS).toISOString();
    const content = canonicalJson({
      ...current,
      lease_expires_at: expiresAt,
    });
    await handle.write(content, 0, "utf8");
    await handle.truncate(Buffer.byteLength(content));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await ownedLease(lockPath, lease);
  return expiresAt;
}

async function ownedLease(
  lockPath: string,
  lease: CampaignLeaseV1,
): Promise<CampaignLeaseV1> {
  const current = await optionalJson<CampaignLeaseV1>(lockPath);
  if (!current) throw new Error("campaign_lease_not_owned");
  assertOwnedLease(current, lease);
  return current;
}

function assertOwnedLease(
  current: CampaignLeaseV1,
  lease: CampaignLeaseV1,
): void {
  assertCampaignLockV1(current);
  if (
    current.operation_id !== lease.operation_id ||
    current.pid !== lease.pid ||
    current.host !== lease.host
  )
    throw new Error("campaign_lease_not_owned");
}
