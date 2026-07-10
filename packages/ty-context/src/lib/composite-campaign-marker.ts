import path from "node:path";
import { canonicalJson, parseStrictJson } from "./composite-campaign-codec.js";
import { validateCompositeCampaignOperationId } from "./composite-campaign-events.js";
import { formatCompositeCampaignRevision, validateCompositeSfcId } from "./composite-campaign-paths.js";
import {
  assertCompositeCampaignTrackedFileSize,
  COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES,
  COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES
} from "./composite-campaign-security.js";
import type { CompositeSfcIdV1 } from "./composite-campaign-types.js";

export type CompositeCampaignMutationKind =
  | "scope_fit_applied"
  | "packet_revision_created"
  | "projection_published"
  | "handoff_published"
  | "goal_bound"
  | "result_projected";

export interface CompositeCampaignPacketMarkerContent {
  slice_id: CompositeSfcIdV1;
  revision: number;
  final_directory: string;
  staged_directory: string;
  packet_file: string;
  packet_sha256: string;
  packet_bytes: number;
}

export interface CompositeCampaignProjectionFileClaim {
  file: string;
  staged_directory: string;
  sha256: string;
  bytes: number;
}

export interface CompositeCampaignProjectionMarkerContent {
  slice_id: CompositeSfcIdV1;
  revision: number;
  final_directory: string;
  packet_sha256: string;
  packet_bytes: number;
  bundle_sha256: string;
  projection_files: {
    product_architecture_source: CompositeCampaignProjectionFileClaim;
    technical_realization_plan: CompositeCampaignProjectionFileClaim;
    acceptance_checklist: CompositeCampaignProjectionFileClaim;
  };
}

export type CompositeCampaignMarkerContent =
  | CompositeCampaignPacketMarkerContent
  | CompositeCampaignProjectionMarkerContent;

export interface CompositeCampaignTransactionMarker {
  schema_version: "composite-campaign-transaction-v1";
  transaction_id: string;
  operation_id: string;
  kind: CompositeCampaignMutationKind;
  token: string;
  old: {
    manifest_etag_sha256: string;
    generation: number;
    event_sequence: number;
    event_sha256: string;
    event_prefix_bytes: number;
  };
  next: {
    manifest_temp: string;
    manifest_sha256: string;
    event_temp: string;
    event_sha256: string;
    event_bytes: number;
  };
  content: CompositeCampaignMarkerContent | null;
}

export function buildCompositeCampaignTransactionMarker(input: Omit<CompositeCampaignTransactionMarker, "schema_version">): CompositeCampaignTransactionMarker {
  const marker = { schema_version: "composite-campaign-transaction-v1" as const, ...input };
  return validateCompositeCampaignTransactionMarker(marker);
}

export function encodeCompositeCampaignTransactionMarker(marker: CompositeCampaignTransactionMarker): string {
  const raw = canonicalJson(validateCompositeCampaignTransactionMarker(marker));
  assertCompositeCampaignTrackedFileSize(raw);
  return raw;
}

export function parseCompositeCampaignTransactionMarker(raw: string): CompositeCampaignTransactionMarker {
  assertCompositeCampaignTrackedFileSize(raw);
  const marker = validateCompositeCampaignTransactionMarker(parseStrictJson(raw));
  if (canonicalJson(marker) !== raw) throw new Error("Composite campaign transaction marker is not canonical JSON");
  return marker;
}

export function expectedCompositeCampaignMarkerPaths(marker: CompositeCampaignTransactionMarker) {
  const manifestTemp = `.campaign.${marker.token}.tmp`;
  const eventTemp = `.event.${marker.token}.tmp`;
  if (marker.next.manifest_temp !== manifestTemp || marker.next.event_temp !== eventTemp) {
    throw new Error("Composite campaign transaction marker temp paths do not match their derived token identity");
  }
  if (!marker.content) return { manifestTemp, eventTemp, content: null };
  const slice = validateCompositeSfcId(marker.content.slice_id);
  const revision = formatCompositeCampaignRevision(marker.content.revision);
  const finalDirectory = posix("slices", slice, "revisions", revision);
  if (marker.content.final_directory !== finalDirectory) {
    throw new Error("Composite campaign transaction marker content path does not match derived revision identity");
  }
  if (isCompositeCampaignProjectionMarkerContent(marker.content)) {
    for (const [id, claim] of Object.entries(marker.content.projection_files)) {
      const stagedDirectory = posix("slices", slice, "revisions", `.${revision}.${marker.token}.${id}.stage`);
      if (claim.staged_directory !== stagedDirectory || claim.file !== projectionFile(id)) {
        throw new Error("Composite campaign transaction marker projection paths do not match derived identity");
      }
    }
    return { manifestTemp, eventTemp, content: { finalDirectory } };
  }
  const stagedDirectory = posix("slices", slice, "revisions", `.${revision}.${marker.token}.stage`);
  const packetFile = posix(finalDirectory, "authoring-packet.json");
  if (marker.content.staged_directory !== stagedDirectory || marker.content.packet_file !== packetFile) {
    throw new Error("Composite campaign transaction marker content paths do not match derived packet identity");
  }
  return { manifestTemp, eventTemp, content: { finalDirectory, stagedDirectory, packetFile } };
}

function validateCompositeCampaignTransactionMarker(value: unknown): CompositeCampaignTransactionMarker {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Composite campaign transaction marker must be an object");
  const marker = value as Record<string, unknown>;
  exact(marker, ["schema_version", "transaction_id", "operation_id", "kind", "token", "old", "next", "content"]);
  if (marker.schema_version !== "composite-campaign-transaction-v1") throw new Error("Unsupported composite campaign transaction marker schema");
  const old = record(marker.old, "marker.old");
  const next = record(marker.next, "marker.next");
  exact(old, ["manifest_etag_sha256", "generation", "event_sequence", "event_sha256", "event_prefix_bytes"]);
  exact(next, ["manifest_temp", "manifest_sha256", "event_temp", "event_sha256", "event_bytes"]);
  const kind = mutationKind(marker.kind);
  const content = marker.content === null ? null : contentRecord(marker.content, kind);
  const result = {
    schema_version: "composite-campaign-transaction-v1" as const,
    transaction_id: hash(marker.transaction_id, "transaction_id"),
    operation_id: validateCompositeCampaignOperationId(text(marker.operation_id, "operation_id")),
    kind,
    token: token(marker.token),
    old: {
      manifest_etag_sha256: hash(old.manifest_etag_sha256, "old manifest etag"),
      generation: integer(old.generation, "old generation", 1),
      event_sequence: integer(old.event_sequence, "old event sequence", 1),
      event_sha256: hash(old.event_sha256, "old event hash"),
      event_prefix_bytes: integer(old.event_prefix_bytes, "old event bytes", 1)
    },
    next: {
      manifest_temp: relative(next.manifest_temp, "manifest temp"),
      manifest_sha256: hash(next.manifest_sha256, "next manifest hash"),
      event_temp: relative(next.event_temp, "event temp"),
      event_sha256: hash(next.event_sha256, "next event hash"),
      event_bytes: integer(next.event_bytes, "next event bytes", 1)
    },
    content
  };
  if (result.old.generation !== result.old.event_sequence) throw new Error("Marker old generation/event sequence mismatch");
  if (result.next.event_bytes > COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES) {
    throw new Error("Transaction marker event byte claim exceeds the 64 KiB limit");
  }
  if (result.content && isCompositeCampaignProjectionMarkerContent(result.content)) {
    if (result.content.packet_bytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) {
      throw new Error("Transaction marker packet byte claim exceeds the 1 MiB limit");
    }
    for (const claim of Object.values(result.content.projection_files)) {
      if (claim.bytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) {
        throw new Error("Transaction marker projection byte claim exceeds the 1 MiB limit");
      }
    }
  } else if (result.content && result.content.packet_bytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) {
    throw new Error("Transaction marker packet byte claim exceeds the 1 MiB limit");
  }
  if (result.kind === "scope_fit_applied" && content !== null) throw new Error("Marker content is inconsistent with mutation kind");
  if (["handoff_published", "goal_bound", "result_projected"].includes(result.kind) && content !== null) {
    throw new Error("Lifecycle marker content is inconsistent with mutation kind");
  }
  if (result.kind === "packet_revision_created" && (!content || isCompositeCampaignProjectionMarkerContent(content))) {
    throw new Error("Marker packet content is inconsistent with mutation kind");
  }
  if (result.kind === "projection_published" && (!content || !isCompositeCampaignProjectionMarkerContent(content))) {
    throw new Error("Marker projection content is inconsistent with mutation kind");
  }
  expectedCompositeCampaignMarkerPaths(result);
  return result;
}

function contentRecord(value: unknown, kind: CompositeCampaignMutationKind): CompositeCampaignMarkerContent {
  const object = record(value, "marker.content");
  if (kind === "projection_published") return projectionContentRecord(object);
  exact(object, ["slice_id", "revision", "final_directory", "staged_directory", "packet_file", "packet_sha256", "packet_bytes"]);
  return {
    slice_id: validateCompositeSfcId(text(object.slice_id, "content slice")),
    revision: integer(object.revision, "content revision", 1),
    final_directory: relative(object.final_directory, "content final directory"),
    staged_directory: relative(object.staged_directory, "content staged directory"),
    packet_file: relative(object.packet_file, "content packet file"),
    packet_sha256: hash(object.packet_sha256, "content packet hash"),
    packet_bytes: integer(object.packet_bytes, "content packet bytes", 1)
  };
}

function projectionContentRecord(object: Record<string, unknown>): CompositeCampaignProjectionMarkerContent {
  exact(object, [
    "slice_id", "revision", "final_directory", "packet_sha256", "packet_bytes", "bundle_sha256", "projection_files"
  ]);
  const files = record(object.projection_files, "marker.content.projection_files");
  const ids = ["product_architecture_source", "technical_realization_plan", "acceptance_checklist"] as const;
  exact(files, [...ids]);
  const claims = Object.fromEntries(ids.map((id) => {
    const claim = record(files[id], `marker.content.projection_files.${id}`);
    exact(claim, ["file", "staged_directory", "sha256", "bytes"]);
    return [id, {
      file: relative(claim.file, `${id} file`),
      staged_directory: relative(claim.staged_directory, `${id} staged directory`),
      sha256: hash(claim.sha256, `${id} hash`),
      bytes: integer(claim.bytes, `${id} bytes`, 1)
    }];
  })) as unknown as CompositeCampaignProjectionMarkerContent["projection_files"];
  return {
    slice_id: validateCompositeSfcId(text(object.slice_id, "content slice")),
    revision: integer(object.revision, "content revision", 1),
    final_directory: relative(object.final_directory, "content final directory"),
    packet_sha256: hash(object.packet_sha256, "content packet hash"),
    packet_bytes: integer(object.packet_bytes, "content packet bytes", 1),
    bundle_sha256: hash(object.bundle_sha256, "content bundle hash"),
    projection_files: claims
  };
}

export function isCompositeCampaignProjectionMarkerContent(
  content: CompositeCampaignMarkerContent
): content is CompositeCampaignProjectionMarkerContent {
  return "projection_files" in content;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) throw new Error("Transaction marker has unknown or missing keys");
}
function hash(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be SHA-256 hex`);
  return value;
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be non-empty text`);
  return value;
}
function integer(value: unknown, label: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new Error(`${label} must be a safe integer`);
  return value as number;
}
function token(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error("Marker token is unsafe");
  return value;
}
function relative(value: unknown, label: string): string {
  const candidate = text(value, label);
  if (path.posix.isAbsolute(candidate) || candidate.includes("\\") || candidate.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`${label} must be one canonical POSIX relative path`);
  }
  return candidate;
}
function mutationKind(value: unknown): CompositeCampaignMutationKind {
  if (!["scope_fit_applied", "packet_revision_created", "projection_published", "handoff_published", "goal_bound", "result_projected"].includes(String(value))) {
    throw new Error("Marker mutation kind is invalid");
  }
  return value as CompositeCampaignMutationKind;
}
function posix(...parts: string[]): string { return parts.join("/"); }
function projectionFile(id: string): string {
  if (id === "product_architecture_source") return "product-architecture-source.md";
  if (id === "technical_realization_plan") return "technical-realization-plan.md";
  if (id === "acceptance_checklist") return "acceptance-checklist.md";
  throw new Error("Unknown projection document id");
}
