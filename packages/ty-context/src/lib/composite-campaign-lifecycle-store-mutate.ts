import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  compositeCampaignTransactionId,
  findCommittedCompositeOperation,
  validateCompositeCampaignOperationId
} from "./composite-campaign-events.js";
import {
  bindCompositeCampaignGoalTransition,
  projectCompositeCampaignResultTransition,
  publishCompositeCampaignHandoffTransition,
  type CompositeCampaignLifecycleTransition
} from "./composite-campaign-lifecycle-transitions.js";
import { acquireCompositeCampaignLock, releaseCompositeCampaignLock } from "./composite-campaign-lock.js";
import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-paths.js";
import { validateCompositeCampaignBindingV1 } from "./composite-campaign-schema.js";
import { commitCompositeCampaignTransaction } from "./composite-campaign-atomic.js";
import { assertNoPendingCompositeCampaignCreate } from "./composite-campaign-create-marker.js";
import { recoverCompositeCampaignTransaction } from "./composite-campaign-recovery.js";
import { resolveCompositeCampaignBasePaths } from "./composite-campaign-paths.js";
import type { CompositeCampaignStoreDependencies } from "./composite-campaign-store-create.js";
import { loadVerifiedCompositeCampaignSnapshot, type VerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import type {
  CompositeCampaignBindingResultV1,
  CompositeCampaignBindingV1,
  CompositeCampaignEventKindV1,
  CompositeSfcIdV1
} from "./composite-campaign-types.js";

interface LifecycleCasBase {
  campaign_id: string;
  slice_id: string;
  expected_etag: string;
  operation_id: string;
}

export interface PublishHandoffCasInput extends LifecycleCasBase { binding: unknown }
export interface BindGoalCasInput extends LifecycleCasBase { goal_id: string }
export interface ProjectResultCasInput extends LifecycleCasBase { result: CompositeCampaignBindingResultV1 }

export async function publishCompositeCampaignHandoffCas(
  projectRoot: string, input: PublishHandoffCasInput, dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "slice_id", "binding", "expected_etag", "operation_id"]);
  const binding = validateCompositeCampaignBindingV1(input.binding);
  return mutateLifecycle(projectRoot, input, "handoff_published", canonicalPayload({
    binding_id: binding.binding_id,
    task_id: binding.task.task_id,
    task_attempt_id: binding.task.task_attempt_id
  }), dependencies, (snapshot, operationId) => publishCompositeCampaignHandoffTransition(
    snapshot.campaign,
    binding,
    operationId,
    latestTimestamp(snapshot.campaign.updated_at, binding.handed_off_at, binding.goal?.started_at, dependencies.now())
  ));
}

export async function bindCompositeCampaignGoalCas(
  projectRoot: string, input: BindGoalCasInput, dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "slice_id", "goal_id", "expected_etag", "operation_id"]);
  const goalId = oneLine(input.goal_id, "goal_id");
  return mutateLifecycle(projectRoot, input, "goal_bound", canonicalPayloadFromSnapshot(
    (snapshot) => ({ binding_id: requiredBindingId(snapshot, input.slice_id), goal_id: goalId })
  ), dependencies, (snapshot, operationId) => bindCompositeCampaignGoalTransition(
    snapshot.campaign,
    input.slice_id,
    goalId,
    operationId,
    latestTimestamp(snapshot.campaign.updated_at, dependencies.now())
  ));
}

export async function projectCompositeCampaignResultCas(
  projectRoot: string, input: ProjectResultCasInput, dependencies: CompositeCampaignStoreDependencies
): Promise<VerifiedCompositeCampaignSnapshot> {
  exactOptions(input, ["campaign_id", "slice_id", "result", "expected_etag", "operation_id"]);
  if (!input.result || typeof input.result !== "object") throw new Error("Composite campaign result must be an object");
  return mutateLifecycle(projectRoot, input, "result_projected", canonicalPayloadFromSnapshot(
    (snapshot) => ({
      binding_id: requiredBindingId(snapshot, input.slice_id),
      status: input.result.status,
      final_gate_event_sha256: input.result.final_gate_event_sha256
    })
  ), dependencies, (snapshot, operationId) => projectCompositeCampaignResultTransition(
    snapshot.campaign, input.slice_id, input.result, operationId, input.result.recorded_at
  ));
}

type PayloadResolver = string | ((snapshot: VerifiedCompositeCampaignSnapshot) => string);

async function mutateLifecycle(
  projectRoot: string,
  input: LifecycleCasBase,
  kind: Extract<CompositeCampaignEventKindV1, "handoff_published" | "goal_bound" | "result_projected">,
  payloadResolver: PayloadResolver,
  dependencies: CompositeCampaignStoreDependencies,
  transitionFor: (snapshot: VerifiedCompositeCampaignSnapshot, operationId: string) => CompositeCampaignLifecycleTransition
): Promise<VerifiedCompositeCampaignSnapshot> {
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const sliceId = validateCompositeSfcId(input.slice_id);
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
    const payloadSha = resolvePayload(payloadResolver, snapshot);
    const transactionId = compositeCampaignTransactionId(campaignId, kind, operationId, payloadSha);
    const existing = findCommittedCompositeOperation(snapshot.events, operationId);
    if (existing) {
      if (existing.kind === kind && existing.slice_id === sliceId && existing.transaction_id === transactionId) return snapshot;
      throw new Error("Composite campaign operation_id conflicts with a different lifecycle payload");
    }
    if (snapshot.manifest_etag_sha256 !== expectedEtag) throw new Error("Composite campaign snapshot etag is stale");
    const transition = transitionFor(snapshot, operationId);
    if (transition.payload_sha256 !== payloadSha || transition.transaction_id !== transactionId) {
      throw new Error("Composite campaign lifecycle payload fingerprint changed during transition");
    }
    await commitCompositeCampaignTransaction({
      snapshot,
      next_campaign: transition.campaign,
      event_line: transition.event_line,
      event_sha256: transition.event_line_sha256,
      transaction_id: transition.transaction_id,
      operation_id: operationId,
      kind,
      content: null
    }, lock, dependencies);
    return await loadVerifiedCompositeCampaignSnapshot(base.project_root, campaignId);
  } finally {
    await releaseCompositeCampaignLock(lock);
  }
}

function canonicalPayload(value: Record<string, unknown>): string { return sha256Hex(canonicalJson(value)); }
function canonicalPayloadFromSnapshot(build: (snapshot: VerifiedCompositeCampaignSnapshot) => Record<string, unknown>) {
  return (snapshot: VerifiedCompositeCampaignSnapshot) => canonicalPayload(build(snapshot));
}
function resolvePayload(value: PayloadResolver, snapshot: VerifiedCompositeCampaignSnapshot): string {
  return typeof value === "string" ? value : value(snapshot);
}
function requiredBindingId(snapshot: VerifiedCompositeCampaignSnapshot, sliceId: string): string {
  const id = snapshot.campaign.slices[validateCompositeSfcId(sliceId)]?.binding?.binding_id;
  if (!id) throw new Error("Composite campaign lifecycle mutation requires an existing binding");
  return id;
}
function exactOptions(value: object, expected: string[]): void {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) {
    throw new Error("Composite campaign lifecycle CAS options contain unknown or missing keys");
  }
}
function etag(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("expected_etag must be lowercase SHA-256 hex");
  return value;
}
function oneLine(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\r\n\0]/.test(value)) throw new Error(`${label} must be one non-empty line`);
  return value;
}
function latestTimestamp(...values: Array<string | undefined>): string {
  return values.filter((value): value is string => value !== undefined)
    .sort((left, right) => Date.parse(left) - Date.parse(right)).at(-1)!;
}
