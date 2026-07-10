import { lstat } from "node:fs/promises";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { parseStrictJson } from "./composite-campaign-codec.js";
import {
  compositeCampaignTransactionId,
  findCommittedCompositeOperation,
  validateCompositeCampaignOperationId
} from "./composite-campaign-events.js";
import {
  acquireCompositeCampaignLock,
  releaseCompositeCampaignLock,
  type CompositeCampaignLockOptions
} from "./composite-campaign-lock.js";
import {
  assertCompositeCampaignPathSafe,
  formatCompositeCampaignRevision,
  resolveCompositeCampaignBasePaths,
  validateCompositeCampaignId,
  validateCompositeSfcId
} from "./composite-campaign-paths.js";
import { validateCompositeAuthoringPacketV1 } from "./composite-campaign-schema.js";
import {
  assertCompositeCampaignPacketSafe,
  assertCompositeCampaignScopeFitSafe,
  assertCompositeCampaignTrackedFileSize
} from "./composite-campaign-security.js";
import { preflightCompositeCampaignPacket } from "./composite-campaign-preflight.js";
import { commitCompositeCampaignTransaction } from "./composite-campaign-atomic.js";
import { assertNoPendingCompositeCampaignCreate } from "./composite-campaign-create-marker.js";
import { recoverCompositeCampaignTransaction } from "./composite-campaign-recovery.js";
import type { CompositeCampaignStoreDependencies } from "./composite-campaign-store-create.js";
import { loadVerifiedCompositeCampaignSnapshot, type VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import {
  applyCompositeScopeFitTransition,
  createCompositePacketRevisionTransition,
  publishCompositeProjectionTransition,
  normalizeCompositeScopeFitForFingerprint
} from "./composite-campaign-store-transitions.js";
import type { CompositeAuthoringPacketV1 } from "./composite-campaign-types.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";

export interface ApplyScopeFitCasInput {
  campaign_id: string;
  scope_fit: unknown;
  expected_etag: string;
  operation_id: string;
}

export interface CreatePacketRevisionCasInput {
  campaign_id: string;
  packet: unknown;
  expected_etag: string;
  operation_id: string;
}

export interface PublishProjectionCasInput {
  campaign_id: string;
  slice_id: string;
  revision: number;
  expected_etag: string;
  operation_id: string;
}

export async function applyCompositeScopeFitCas(
  projectRoot: string,
  input: ApplyScopeFitCasInput,
  dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "scope_fit", "expected_etag", "operation_id"]);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const operationId = validateCompositeCampaignOperationId(input.operation_id);
  const expectedEtag = etag(input.expected_etag);
  const scope = normalizeCompositeScopeFitForFingerprint(input.scope_fit);
  assertCompositeCampaignScopeFitSafe(scope);
  const scopeContent = canonicalJson(scope);
  assertCompositeCampaignTrackedFileSize(scopeContent);
  const payloadSha = sha256Hex(scopeContent);
  const transactionId = compositeCampaignTransactionId(campaignId, "scope_fit_applied", operationId, payloadSha);
  return mutateUnderLock(projectRoot, campaignId, expectedEtag, operationId, transactionId, "scope_fit_applied", dependencies,
    async (snapshot, lock) => {
      const transition = applyCompositeScopeFitTransition(snapshot.campaign, scope, operationId, dependencies.now());
      await commitCompositeCampaignTransaction({
        snapshot,
        next_campaign: transition.campaign,
        event_line: transition.event_line,
        event_sha256: transition.event_line_sha256,
        transaction_id: transition.transaction_id,
        operation_id: operationId,
        kind: "scope_fit_applied",
        content: null
      }, lock, dependencies);
    });
}

export async function createCompositePacketRevisionCas(
  projectRoot: string,
  input: CreatePacketRevisionCasInput,
  dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "packet", "expected_etag", "operation_id"]);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const operationId = validateCompositeCampaignOperationId(input.operation_id);
  const expectedEtag = etag(input.expected_etag);
  assertCompositeCampaignPacketSafe(input.packet);
  const packet: CompositeAuthoringPacketV1 = validateCompositeAuthoringPacketV1(input.packet);
  const packetContent = canonicalJson(packet);
  assertCompositeCampaignTrackedFileSize(packetContent);
  const payloadSha = sha256Hex(packetContent);
  const transactionId = compositeCampaignTransactionId(campaignId, "packet_revision_created", operationId, payloadSha);
  return mutateUnderLock(projectRoot, campaignId, expectedEtag, operationId, transactionId, "packet_revision_created", dependencies,
    async (snapshot, lock) => {
      const transition = createCompositePacketRevisionTransition(snapshot.campaign, packet, operationId, dependencies.now());
      await commitCompositeCampaignTransaction({
        snapshot,
        next_campaign: transition.campaign,
        event_line: transition.event_line,
        event_sha256: transition.event_line_sha256,
        transaction_id: transition.transaction_id,
        operation_id: operationId,
        kind: "packet_revision_created",
        content: {
          content_kind: "packet",
          slice_id: packet.slice_id,
          revision: packet.revision,
          packet_content: transition.packet_content,
          packet_sha256: transition.packet_sha256
        }
      }, lock, dependencies);
    });
}

export async function publishCompositeProjectionCas(
  projectRoot: string,
  input: PublishProjectionCasInput,
  dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "slice_id", "revision", "expected_etag", "operation_id"]);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const sliceId = validateCompositeSfcId(input.slice_id);
  formatCompositeCampaignRevision(input.revision);
  const operationId = validateCompositeCampaignOperationId(input.operation_id);
  const expectedEtag = etag(input.expected_etag);
  const base = await resolveCompositeCampaignBasePaths(projectRoot);
  const lock = await acquireCompositeCampaignLock(base.project_root, base.campaigns_root, campaignId, {
    token: dependencies.token, now: dependencies.now, timeout_ms: dependencies.lock_timeout_ms
  });
  try {
    await assertNoPendingCompositeCampaignCreate(base.project_root, base.campaigns_root, campaignId);
    let snapshot = await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
    if (await recoverCompositeCampaignTransaction(snapshot, lock, dependencies)) {
      snapshot = await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
    }
    const existing = findCommittedCompositeOperation(snapshot.events, operationId);
    if (existing) {
      if (existing.kind === "projection_published" && existing.slice_id === sliceId && existing.revision === input.revision) return snapshot;
      throw new Error("Composite campaign operation_id conflicts with a different committed kind or payload");
    }
    if (snapshot.manifest_etag_sha256 !== expectedEtag) throw new Error("Composite campaign snapshot etag is stale");
    const packetFile = snapshot.paths.revision_files(sliceId, input.revision).authoring_packet;
    const packetRecord = await readCompositeCampaignRegularFile(
      base.project_root, packetFile, "Composite campaign projection authoring packet"
    );
    const packet = parseStrictJson(packetRecord.content);
    const preflight = preflightCompositeCampaignPacket(packet);
    if (!preflight.ok || !preflight.rendered_bundle) {
      throw new Error(`Composite campaign strict projection preflight failed: ${preflight.error_message}`);
    }
    for (const document of Object.values(preflight.rendered_bundle.documents)) {
      assertCompositeCampaignTrackedFileSize(document.content);
    }
    await assertProjectionTargetsAbsent(base.project_root, snapshot, sliceId, input.revision);
    const transition = publishCompositeProjectionTransition(
      snapshot.campaign, sliceId, input.revision, preflight.rendered_bundle, operationId, dependencies.now()
    );
    await commitCompositeCampaignTransaction({
      snapshot,
      next_campaign: transition.campaign,
      event_line: transition.event_line,
      event_sha256: transition.event_line_sha256,
      transaction_id: transition.transaction_id,
      operation_id: operationId,
      kind: "projection_published",
      content: {
        content_kind: "projection",
        slice_id: sliceId,
        revision: input.revision,
        packet_sha256: preflight.rendered_bundle.packet_sha256,
        packet_bytes: packetRecord.bytes,
        bundle_sha256: preflight.rendered_bundle.bundle_sha256,
        documents: preflight.rendered_bundle.documents
      }
    }, lock, dependencies);
    return await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
  } finally {
    await releaseCompositeCampaignLock(lock);
  }
}

async function mutateUnderLock(
  projectRoot: string,
  campaignId: string,
  expectedEtag: string,
  operationId: string,
  transactionId: string,
  kind: "scope_fit_applied" | "packet_revision_created",
  dependencies: CompositeCampaignStoreDependencies,
  apply: (snapshot: VerifiedCompositeCampaignSnapshot, lock: Awaited<ReturnType<typeof acquireCompositeCampaignLock>>) => Promise<void>
): Promise<VerifiedCompositeCampaignSnapshot> {
  const base = await resolveCompositeCampaignBasePaths(projectRoot);
  const lockOptions: CompositeCampaignLockOptions = {
    token: dependencies.token,
    now: dependencies.now,
    timeout_ms: dependencies.lock_timeout_ms
  };
  const lock = await acquireCompositeCampaignLock(base.project_root, base.campaigns_root, campaignId, lockOptions);
  try {
    await assertNoPendingCompositeCampaignCreate(base.project_root, base.campaigns_root, campaignId);
    let snapshot = await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
    if (await recoverCompositeCampaignTransaction(snapshot, lock, dependencies)) {
      snapshot = await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
    }
    const existing = findCommittedCompositeOperation(snapshot.events, operationId);
    if (existing) {
      if (existing.kind === kind && existing.transaction_id === transactionId) return snapshot;
      throw new Error("Composite campaign operation_id conflicts with a different committed kind or payload");
    }
    if (snapshot.manifest_etag_sha256 !== expectedEtag) {
      throw new Error("Composite campaign snapshot etag is stale");
    }
    await apply(snapshot, lock);
    return await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
  } finally {
    await releaseCompositeCampaignLock(lock);
  }
}

async function assertProjectionTargetsAbsent(
  projectRoot: string,
  snapshot: VerifiedCompositeCampaignSnapshot,
  sliceId: ReturnType<typeof validateCompositeSfcId>,
  revision: number
): Promise<void> {
  const files = snapshot.paths.revision_files(sliceId, revision);
  for (const target of [
    files.product_architecture_source,
    files.technical_realization_plan,
    files.acceptance_checklist
  ]) {
    await assertCompositeCampaignPathSafe(projectRoot, target);
    try {
      await lstat(target);
      throw new Error("Composite campaign projection target already exists; manual drift or partial publication is not writable");
    } catch (error) {
      if (hasCode(error, "ENOENT")) continue;
      throw error;
    }
  }
}

function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}

function exactOptions(value: object, expected: string[]): void {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) {
    throw new Error("Composite campaign CAS options contain unknown or missing keys");
  }
}

function etag(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("expected_etag must be lowercase SHA-256 hex");
  return value;
}
