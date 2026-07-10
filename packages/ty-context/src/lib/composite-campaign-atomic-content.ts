import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  isCompositeCampaignProjectionMarkerContent,
  type CompositeCampaignProjectionMarkerContent,
  type CompositeCampaignTransactionMarker
} from "./composite-campaign-marker.js";
import { assertCompositeCampaignPathSafe } from "./composite-campaign-paths.js";
import {
  directoryEntries,
  ensureCompositeDirectories,
  removeDirectoryIfExists,
  syncCompositeDirectory,
  writeExclusiveSynced
} from "./composite-campaign-atomic-io.js";
import { removeOwnedCompositeSingleFileDirectory } from "./composite-campaign-owned-removal.js";
import type { CompositeSfcIdV1 } from "./composite-campaign-types.js";

export interface CompositeCampaignAtomicPacketContent {
  content_kind: "packet";
  slice_id: CompositeSfcIdV1;
  revision: number;
  packet_content: string;
  packet_sha256: string;
}

export interface CompositeCampaignAtomicProjectionContent {
  content_kind: "projection";
  slice_id: CompositeSfcIdV1;
  revision: number;
  packet_sha256: string;
  packet_bytes: number;
  bundle_sha256: string;
  documents: {
    product_architecture_source: { file: string; content: string; sha256: string };
    technical_realization_plan: { file: string; content: string; sha256: string };
    acceptance_checklist: { file: string; content: string; sha256: string };
  };
}

export type CompositeCampaignAtomicContent =
  | CompositeCampaignAtomicPacketContent
  | CompositeCampaignAtomicProjectionContent;

export function compositeCampaignMarkerContent(
  content: CompositeCampaignAtomicContent | null,
  token: string
): CompositeCampaignTransactionMarker["content"] {
  if (!content) return null;
  const revisionName = String(content.revision).padStart(4, "0");
  const finalDirectory = `slices/${content.slice_id}/revisions/${revisionName}`;
  if (content.content_kind === "packet") return {
    slice_id: content.slice_id,
    revision: content.revision,
    final_directory: finalDirectory,
    staged_directory: `slices/${content.slice_id}/revisions/.${revisionName}.${token}.stage`,
    packet_file: `${finalDirectory}/authoring-packet.json`,
    packet_sha256: content.packet_sha256,
    packet_bytes: Buffer.byteLength(content.packet_content)
  };
  const projectionFiles = Object.fromEntries(Object.entries(content.documents).map(([id, document]) => [id, {
    file: document.file,
    staged_directory: `slices/${content.slice_id}/revisions/.${revisionName}.${token}.${id}.stage`,
    sha256: document.sha256,
    bytes: Buffer.byteLength(document.content)
  }])) as unknown as CompositeCampaignProjectionMarkerContent["projection_files"];
  return {
    slice_id: content.slice_id,
    revision: content.revision,
    final_directory: finalDirectory,
    packet_sha256: content.packet_sha256,
    packet_bytes: content.packet_bytes,
    bundle_sha256: content.bundle_sha256,
    projection_files: projectionFiles
  };
}

export async function stageCompositeCampaignContent(
  campaignRoot: string,
  content: CompositeCampaignAtomicContent | null,
  marker: CompositeCampaignTransactionMarker,
  projectRoot: string
): Promise<void> {
  if (!content || !marker.content) return;
  if (content.content_kind === "packet") {
    if (isCompositeCampaignProjectionMarkerContent(marker.content)) throw new Error("Packet marker content is invalid");
    const stage = path.join(campaignRoot, ...marker.content.staged_directory.split("/"));
    await stageFile(projectRoot, campaignRoot, stage, "authoring-packet.json", content.packet_content);
    return;
  }
  const projection = marker.content;
  if (!isCompositeCampaignProjectionMarkerContent(projection)) throw new Error("Projection marker content is missing");
  const entries = Object.entries(content.documents).map(([id, document]) => ({
    document,
    claim: projection.projection_files[id as keyof typeof projection.projection_files]
  }));
  for (const { claim } of entries) {
    const stage = path.join(campaignRoot, ...claim.staged_directory.split("/"));
    await assertCompositeCampaignPathSafe(projectRoot, stage);
    if (await directoryEntries(stage) !== null) throw new Error("Composite campaign projection stage conflicts with an existing path");
  }
  const completed: typeof entries = [];
  try {
    for (const entry of entries) {
      const stage = path.join(campaignRoot, ...entry.claim.staged_directory.split("/"));
      await stageFile(projectRoot, campaignRoot, stage, entry.claim.file, entry.document.content);
      completed.push(entry);
    }
  } catch (error) {
    for (const { claim } of completed.reverse()) {
      const removed = await removeOwnedCompositeSingleFileDirectory({
        project_root: projectRoot,
        target: path.join(campaignRoot, ...claim.staged_directory.split("/")),
        file_name: claim.file,
        sha256: claim.sha256,
        bytes: claim.bytes,
        token: marker.token,
        purpose: "staging-failure"
      });
      if (!removed) throw new Error("Composite campaign projection staging cleanup lost ownership", { cause: error });
    }
    throw error;
  }
}

export function compositeCampaignStagedDirectories(marker: CompositeCampaignTransactionMarker): string[] {
  const content = marker.content;
  if (!content) return [];
  return isCompositeCampaignProjectionMarkerContent(content)
    ? Object.values(content.projection_files).map((claim) => claim.staged_directory)
    : [content.staged_directory];
}

async function stageFile(projectRoot: string, campaignRoot: string, stage: string, file: string, value: string): Promise<void> {
  await ensureCompositeDirectories(projectRoot, campaignRoot, path.dirname(stage));
  await assertCompositeCampaignPathSafe(projectRoot, stage);
  await mkdir(stage);
  try {
    await writeExclusiveSynced(projectRoot, path.join(stage, file), value);
    await syncCompositeDirectory(stage);
    await syncCompositeDirectory(path.dirname(stage));
  } catch (error) {
    await assertCompositeCampaignPathSafe(projectRoot, stage);
    await removeDirectoryIfExists(stage);
    throw error;
  }
}
