import { canonicalYaml, parseStrictYaml, sha256Hex } from "./composite-campaign-codec.js";
import { readCommittedCompositeCampaignEvents } from "./composite-campaign-events.js";
import { assertCompositeCampaignPathSafe, resolveCompositeCampaignPaths, type CompositeCampaignPaths } from "./composite-campaign-paths.js";
import { validateCompositeCampaignV1 } from "./composite-campaign-schema.js";
import { assertCompositeCampaignScopeFitSafe, sanitizeCompositeCampaignRequest } from "./composite-campaign-security.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import { verifyCompositeCampaignEventProjection, verifyCompositeCampaignReferences } from "./composite-campaign-store-verify.js";
import type {
  CompositeCampaignEventV1,
  CompositeCampaignLoadedSnapshotV1
} from "./composite-campaign-types.js";

export interface VerifiedCompositeCampaignSnapshot extends CompositeCampaignLoadedSnapshotV1 {
  paths: CompositeCampaignPaths;
  events: CompositeCampaignEventV1[];
  committed_event_bytes: number;
  event_file_bytes: number;
}

export async function loadVerifiedCompositeCampaignSnapshot(
  projectRoot: string,
  campaignId: string,
  suppliedCampaignPath?: string
): Promise<VerifiedCompositeCampaignSnapshot> {
  const paths = await resolveCompositeCampaignPaths(projectRoot, campaignId, suppliedCampaignPath);
  await Promise.all([
    assertCompositeCampaignPathSafe(projectRoot, paths.manifest_path),
    assertCompositeCampaignPathSafe(projectRoot, paths.request_path),
    assertCompositeCampaignPathSafe(projectRoot, paths.events_path)
  ]);
  const manifestFile = await readCompositeCampaignRegularFile(
    projectRoot, paths.manifest_path, "Composite campaign manifest"
  );
  const campaign = validateCompositeCampaignV1(parseStrictYaml(manifestFile.content));
  if (campaign.campaign_id !== campaignId) throw new Error("Composite campaign manifest identity does not match requested campaign");
  const canonicalManifest = canonicalYaml(campaign);
  if (canonicalManifest !== manifestFile.content) {
    throw new Error("Composite campaign manifest campaign.yaml is not exact canonical YAML");
  }
  if (campaign.scope_fit) assertCompositeCampaignScopeFitSafe(campaign.scope_fit);
  const request = await readCompositeCampaignRegularFile(
    projectRoot, paths.request_path, "Composite campaign immutable request"
  );
  if (request.bytes !== campaign.request.bytes || sha256Hex(request.raw) !== campaign.request.sha256) {
    throw new Error("Composite campaign immutable request bytes/hash do not match manifest");
  }
  if (sanitizeCompositeCampaignRequest(request.content).content !== request.content) {
    throw new Error("Composite campaign immutable request contains unsanitized credential material");
  }
  if (request.content.replace(/\[REDACTED\]/g, "").trim().length === 0) {
    throw new Error("Composite campaign immutable request must not be semantically blank");
  }
  const committed = await readCommittedCompositeCampaignEvents(
    paths.events_path, campaign.event_cursor, campaign.campaign_id
  );
  verifyCompositeCampaignEventProjection(campaign, committed.events);
  await verifyCompositeCampaignReferences(projectRoot, paths, campaign);
  return {
    campaign,
    raw_manifest: manifestFile.content,
    manifest_etag_sha256: sha256Hex(manifestFile.raw),
    generation: campaign.generation,
    paths,
    events: committed.events,
    committed_event_bytes: committed.committed_bytes,
    event_file_bytes: committed.file_bytes
  };
}
