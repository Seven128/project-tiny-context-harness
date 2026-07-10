import { link } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { validateCompositeCampaignOperationId } from "./composite-campaign-events.js";
import { validateCompositeCampaignId } from "./composite-campaign-paths.js";
import { assertCompositeCampaignTrackedFileSize } from "./composite-campaign-security.js";
import {
  hasCode,
  syncCompositeDirectory,
  writeExclusiveSynced
} from "./composite-campaign-atomic-io.js";
import { removeOwnedCompositeRegularFile } from "./composite-campaign-owned-removal.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";

export interface CompositeCampaignCreateFile {
  content: string;
  sha256: string;
  bytes: number;
}

export interface CompositeCampaignCreatePublication {
  campaign_id: string;
  transaction_id: string;
  operation_id: string;
  created_at: string;
  request: CompositeCampaignCreateFile;
  event: CompositeCampaignCreateFile;
  manifest: CompositeCampaignCreateFile;
}

export interface CompositeCampaignCreateMarker {
  schema_version: "composite-campaign-create-v1";
  campaign_id: string;
  transaction_id: string;
  operation_id: string;
  created_at: string;
  token: string;
  request: Omit<CompositeCampaignCreateFile, "content">;
  event: Omit<CompositeCampaignCreateFile, "content">;
  manifest: Omit<CompositeCampaignCreateFile, "content">;
}

export interface CompositeCampaignCreateMarkerOwnership {
  marker: CompositeCampaignCreateMarker;
  raw: string;
  marker_path: string;
  preexisting: boolean;
}

export async function ensureCompositeCampaignCreateMarker(
  projectRoot: string,
  campaignsRoot: string,
  publication: CompositeCampaignCreatePublication,
  tokenFactory: () => string
): Promise<CompositeCampaignCreateMarkerOwnership> {
  const markerPath = compositeCampaignCreateMarkerPath(campaignsRoot, publication.campaign_id);
  const existing = await readMarkerIfExists(projectRoot, markerPath);
  if (existing !== null) return ownedExisting(existing, markerPath, publication);
  const marker = createMarker(publication, tokenFactory());
  const raw = canonicalJson(marker);
  assertCompositeCampaignTrackedFileSize(raw);
  const temp = compositeCampaignCreateMarkerTempPath(campaignsRoot, marker);
  await writeExclusiveSynced(projectRoot, temp, raw);
  await syncCompositeDirectory(campaignsRoot);
  let preexisting = false;
  try {
    await link(temp, markerPath);
    await syncCompositeDirectory(campaignsRoot);
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
    preexisting = true;
  }
  const authoritative = await readMarkerIfExists(projectRoot, markerPath);
  if (authoritative === null) throw new Error("Composite campaign create marker disappeared during publication");
  const owned = ownedExisting(authoritative, markerPath, publication, preexisting);
  if (!await removeCreateMarkerFile(projectRoot, temp, raw, marker.token, "create-marker-temp")) {
    throw new Error("Composite campaign create marker temp ownership changed during cleanup");
  }
  await syncCompositeDirectory(campaignsRoot);
  return owned;
}

export async function readCompositeCampaignCreateMarker(
  projectRoot: string,
  campaignsRoot: string,
  campaignId: string
): Promise<CompositeCampaignCreateMarkerOwnership | null> {
  const markerPath = compositeCampaignCreateMarkerPath(campaignsRoot, campaignId);
  const raw = await readMarkerIfExists(projectRoot, markerPath);
  if (raw === null) return null;
  const marker = parseCompositeCampaignCreateMarker(raw);
  if (marker.campaign_id !== campaignId) throw new Error("Composite campaign create marker identity mismatch");
  return { marker, raw, marker_path: markerPath, preexisting: true };
}

export async function pendingCompositeCampaignCreateTimestamp(
  projectRoot: string,
  campaignsRoot: string,
  campaignId: string
): Promise<string | null> {
  return (await readCompositeCampaignCreateMarker(projectRoot, campaignsRoot, campaignId))?.marker.created_at ?? null;
}

export async function assertNoPendingCompositeCampaignCreate(
  projectRoot: string,
  campaignsRoot: string,
  campaignId: string
): Promise<void> {
  if (await readCompositeCampaignCreateMarker(projectRoot, campaignsRoot, campaignId)) {
    throw new Error("Composite campaign has a pending create publication; retry createCampaign before mutation");
  }
}

export function assertCompositeCampaignCreateMarkerMatches(
  marker: CompositeCampaignCreateMarker,
  publication: CompositeCampaignCreatePublication
): void {
  const expected = { request: spec(publication.request), event: spec(publication.event), manifest: spec(publication.manifest) };
  if (marker.campaign_id !== publication.campaign_id || marker.transaction_id !== publication.transaction_id ||
    marker.operation_id !== publication.operation_id || marker.created_at !== publication.created_at ||
    JSON.stringify({ request: marker.request, event: marker.event, manifest: marker.manifest }) !== JSON.stringify(expected)) {
    throw new Error("Composite campaign create marker conflicts with requested operation payload");
  }
}

export async function removeCompositeCampaignCreateMarker(
  projectRoot: string,
  campaignsRoot: string,
  ownership: CompositeCampaignCreateMarkerOwnership
): Promise<void> {
  const temp = compositeCampaignCreateMarkerTempPath(campaignsRoot, ownership.marker);
  if (!await removeCreateMarkerFile(projectRoot, temp, ownership.raw,
    ownership.marker.token, "create-marker-temp") ||
    !await removeCreateMarkerFile(projectRoot, ownership.marker_path, ownership.raw,
      ownership.marker.token, "create-marker")) {
    throw new Error("Composite campaign create marker ownership changed during cleanup");
  }
}

export function compositeCampaignCreateMarkerTempPath(
  campaignsRoot: string,
  marker: CompositeCampaignCreateMarker
): string {
  return path.join(campaignsRoot, `.${marker.campaign_id}.create.${marker.token}.tmp`);
}

function compositeCampaignCreateMarkerPath(campaignsRoot: string, campaignId: string): string {
  return path.join(campaignsRoot, `.${validateCompositeCampaignId(campaignId)}.create.json`);
}

function ownedExisting(
  raw: string,
  markerPath: string,
  publication: CompositeCampaignCreatePublication,
  preexisting = true
): CompositeCampaignCreateMarkerOwnership {
  const marker = parseCompositeCampaignCreateMarker(raw);
  assertCompositeCampaignCreateMarkerMatches(marker, publication);
  return { marker, raw, marker_path: markerPath, preexisting };
}

function createMarker(publication: CompositeCampaignCreatePublication, token: string): CompositeCampaignCreateMarker {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(token)) throw new Error("Composite campaign create token is unsafe");
  return {
    schema_version: "composite-campaign-create-v1",
    campaign_id: validateCompositeCampaignId(publication.campaign_id),
    transaction_id: hash(publication.transaction_id, "create transaction"),
    operation_id: validateCompositeCampaignOperationId(publication.operation_id),
    created_at: timestamp(publication.created_at),
    token,
    request: spec(publication.request), event: spec(publication.event), manifest: spec(publication.manifest)
  };
}

function parseCompositeCampaignCreateMarker(raw: string): CompositeCampaignCreateMarker {
  const value = parseStrictJson(raw) as Record<string, unknown>;
  const keys = ["schema_version", "campaign_id", "transaction_id", "operation_id", "created_at", "token", "request", "event", "manifest"];
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))) throw new Error("Composite campaign create marker shape is invalid");
  const marker = createMarker({
    campaign_id: String(value.campaign_id), transaction_id: String(value.transaction_id),
    operation_id: String(value.operation_id), created_at: String(value.created_at),
    request: markerFile(value.request), event: markerFile(value.event), manifest: markerFile(value.manifest)
  }, String(value.token));
  if (value.schema_version !== marker.schema_version || canonicalJson(marker) !== raw) {
    throw new Error("Composite campaign create marker is not canonical");
  }
  return marker;
}

function markerFile(value: unknown): CompositeCampaignCreateFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Composite campaign create file marker is invalid");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 2 || !Object.hasOwn(input, "sha256") || !Object.hasOwn(input, "bytes") ||
    !Number.isSafeInteger(input.bytes) || (input.bytes as number) < 0) throw new Error("Composite campaign create file marker is invalid");
  return { content: "", sha256: hash(input.sha256, "create file"), bytes: input.bytes as number };
}

function spec(file: CompositeCampaignCreateFile) { return { sha256: hash(file.sha256, "create file"), bytes: file.bytes }; }
function hash(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be SHA-256 hex`);
  return value;
}
function timestamp(value: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error("Composite campaign create timestamp must be canonical UTC ISO-8601");
  }
  return value;
}
async function readMarkerIfExists(projectRoot: string, target: string): Promise<string | null> {
  try { return (await readCompositeCampaignRegularFile(projectRoot, target, "Composite campaign create marker")).content; }
  catch (error) { if (hasCode(error, "ENOENT")) return null; throw error; }
}
async function removeCreateMarkerFile(
  projectRoot: string,
  target: string,
  raw: string,
  token: string,
  purpose: string
): Promise<boolean> {
  return await removeOwnedCompositeRegularFile({
    project_root: projectRoot, target, sha256: sha256Hex(raw),
    bytes: Buffer.byteLength(raw), token, purpose
  });
}
