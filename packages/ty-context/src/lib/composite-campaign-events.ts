import { open } from "node:fs/promises";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { validateCompositeCampaignId } from "./composite-campaign-paths.js";
import { validateCompositeCampaignEventV1 } from "./composite-campaign-schema.js";
import {
  assertCompositeCampaignEventLineSize,
  findCompositeCampaignPacketSecrets
} from "./composite-campaign-security.js";
import { decodeCompositeCampaignUtf8 } from "./composite-campaign-store-file-io.js";
import type {
  CompositeCampaignEventKindV1,
  CompositeCampaignEventV1
} from "./composite-campaign-types.js";

const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const EVENT_KINDS = new Set<CompositeCampaignEventKindV1>([
  "campaign_created", "scope_fit_applied", "packet_revision_created", "projection_published",
  "handoff_published", "goal_bound", "result_projected"
]);

export interface EncodedCompositeCampaignEvent {
  event: CompositeCampaignEventV1;
  line: string;
  sha256: string;
  bytes: number;
}

export interface CommittedCompositeCampaignEvents {
  events: CompositeCampaignEventV1[];
  raw_prefix: string;
  committed_bytes: number;
  file_bytes: number;
}

export function validateCompositeCampaignOperationId(value: string): string {
  if (typeof value !== "string" || !OPERATION_ID.test(value)) {
    throw new Error("Composite campaign operation_id must be one safe printable identifier of at most 128 characters");
  }
  if (findCompositeCampaignPacketSecrets(value).length > 0) {
    throw new Error("Composite campaign operation_id must not contain secret or credential material");
  }
  return value;
}

export function compositeCampaignTransactionId(
  campaignId: string,
  kind: CompositeCampaignEventKindV1,
  operationId: string,
  payloadSha256: string
): string {
  validateCompositeCampaignId(campaignId);
  validateCompositeCampaignOperationId(operationId);
  if (!EVENT_KINDS.has(kind)) throw new Error(`Unsupported composite campaign event kind: ${kind}`);
  if (!HASH.test(payloadSha256)) throw new Error("Composite campaign operation payload hash must be lowercase SHA-256 hex");
  return sha256Hex(`composite-campaign-transaction-v1\0${campaignId}\0${kind}\0${operationId}\0${payloadSha256}`);
}

export function compositeCampaignEventId(transactionId: string, sequence: number): string {
  if (!HASH.test(transactionId)) throw new Error("Composite campaign transaction ID must be lowercase SHA-256 hex");
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Composite campaign event sequence must be a positive integer");
  return sha256Hex(`composite-campaign-event-v1\0${transactionId}\0${sequence}`);
}

export function encodeCompositeCampaignEventLine(value: unknown): EncodedCompositeCampaignEvent {
  const event = validateCompositeCampaignEventV1(value);
  validateCompositeCampaignOperationId(event.operation_id);
  assertCompositeCampaignEventTransactionFingerprint(event);
  const line = `${JSON.stringify(event)}\n`;
  const bytes = assertCompositeCampaignEventLineSize(line);
  return { event, line, sha256: sha256Hex(line), bytes };
}

export async function readCommittedCompositeCampaignEvents(
  eventsPath: string,
  cursor: { sequence: number; last_event_sha256: string },
  campaignId: string
): Promise<CommittedCompositeCampaignEvents> {
  validateCompositeCampaignId(campaignId);
  if (!Number.isSafeInteger(cursor.sequence) || cursor.sequence < 1 || !HASH.test(cursor.last_event_sha256)) {
    throw new Error("Composite campaign event cursor is invalid");
  }
  const handle = await open(eventsPath, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) throw new Error("Composite campaign events path must be a regular file");
    const events: CompositeCampaignEventV1[] = [];
    const lines: Buffer[] = [];
    let pending = Buffer.alloc(0);
    let position = 0;
    while (events.length < cursor.sequence) {
      const nextLf = pending.indexOf(0x0a);
      if (nextLf >= 0) {
        const line = pending.subarray(0, nextLf + 1);
        pending = pending.subarray(nextLf + 1);
        assertCompositeCampaignEventLineSize(line);
        lines.push(Buffer.from(line));
        events.push(decodeCommittedLine(line, events, campaignId));
        continue;
      }
      if (pending.byteLength >= 64 * 1024) {
        throw new Error("Composite campaign event line exceeds the 64 KiB byte limit");
      }
      const buffer = Buffer.alloc(Math.min(16 * 1024, 64 * 1024 - pending.byteLength));
      const result = await handle.read(buffer, 0, buffer.byteLength, position);
      if (result.bytesRead === 0) {
        if (pending.byteLength > 0) throw new Error("Composite campaign events contain a partial line without final LF");
        throw new Error(`Composite campaign events ended before committed cursor sequence ${cursor.sequence}`);
      }
      position += result.bytesRead;
      pending = Buffer.concat([pending, buffer.subarray(0, result.bytesRead)]);
    }
    const lastLine = lines.at(-1)!;
    if (sha256Hex(lastLine) !== cursor.last_event_sha256) {
      throw new Error("Composite campaign event cursor hash does not match the committed exact line");
    }
    const raw = Buffer.concat(lines);
    return {
      events,
      raw_prefix: decodeCompositeCampaignUtf8(raw, "Composite campaign committed event prefix"),
      committed_bytes: raw.byteLength,
      file_bytes: metadata.size
    };
  } finally {
    await handle.close();
  }
}

export function findCommittedCompositeOperation(
  events: readonly CompositeCampaignEventV1[],
  operationId: string
): CompositeCampaignEventV1 | undefined {
  validateCompositeCampaignOperationId(operationId);
  return events.find((event) => event.operation_id === operationId);
}

export function assertCompositeCampaignEventTransactionFingerprint(event: CompositeCampaignEventV1): void {
  const payloadHash = event.kind === "scope_fit_applied" ? event.payload.scope_fit_sha256
    : event.kind === "packet_revision_created" ? event.payload.packet_sha256
      : event.kind === "projection_published" ? event.payload.bundle_sha256
        : ["handoff_published", "goal_bound", "result_projected"].includes(event.kind)
          ? sha256Hex(canonicalJson(event.payload)) : null;
  if (!payloadHash) return;
  const current = compositeCampaignTransactionId(event.campaign_id, event.kind, event.operation_id, payloadHash);
  const compatibleV1 = event.kind === "projection_published"
    ? compositeCampaignTransactionId(
      event.campaign_id, event.kind, event.operation_id, sha256Hex(canonicalJson(event.payload))
    )
    : current;
  if (event.transaction_id !== current && event.transaction_id !== compatibleV1) {
    throw new Error("Composite campaign transaction_id does not match its deterministic payload fingerprint");
  }
}

function decodeCommittedLine(
  rawLine: Buffer,
  prior: readonly CompositeCampaignEventV1[],
  campaignId: string
): CompositeCampaignEventV1 {
  if (rawLine.at(-1) !== 0x0a) throw new Error("Composite campaign event line must end in LF");
  if (rawLine.at(-2) === 0x0d) throw new Error("Composite campaign event line must use LF, not CRLF");
  const text = decodeCompositeCampaignUtf8(rawLine, "Composite campaign event line");
  const event = validateCompositeCampaignEventV1(parseStrictJson(text.slice(0, -1)));
  const canonical = `${JSON.stringify(event)}\n`;
  if (canonical !== text) throw new Error("Composite campaign event line is not exact compact canonical LF NDJSON");
  const expectedSequence = prior.length + 1;
  if (event.sequence !== expectedSequence || event.manifest_generation !== expectedSequence) {
    throw new Error("Composite campaign event sequence is not contiguous with the committed prefix");
  }
  if (event.campaign_id !== campaignId) throw new Error("Composite campaign event campaign_id does not match the campaign");
  const previousHash = prior.length === 0 ? null : sha256Hex(`${JSON.stringify(prior.at(-1))}\n`);
  if (event.previous_event_sha256 !== previousHash) throw new Error("Composite campaign event previous_event_sha256 chain mismatch");
  validateCompositeCampaignOperationId(event.operation_id);
  if (!HASH.test(event.transaction_id) || event.event_id !== compositeCampaignEventId(event.transaction_id, event.sequence)) {
    throw new Error("Composite campaign event_id does not match its deterministic transaction identity");
  }
  assertCompositeCampaignEventTransactionFingerprint(event);
  if (prior.some((candidate) => candidate.operation_id === event.operation_id)) {
    throw new Error(`Composite campaign operation_id ${event.operation_id} is duplicated in committed events`);
  }
  return event;
}
