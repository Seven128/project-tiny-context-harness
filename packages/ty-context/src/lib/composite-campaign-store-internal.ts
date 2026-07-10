import { resolveCompositeCampaignBasePaths } from "./composite-campaign-paths.js";
import {
  createCompositeCampaign,
  defaultCompositeCampaignStoreDependencies,
  type CompositeCampaignStoreDependencies
} from "./composite-campaign-store-create.js";
import { loadVerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import {
  applyCompositeScopeFitCas,
  createCompositePacketRevisionCas,
  publishCompositeProjectionCas
} from "./composite-campaign-store-mutate.js";
import type { CompositeCampaignLoadedSnapshotV1 } from "./composite-campaign-types.js";
import {
  bindCompositeCampaignGoalCas,
  projectCompositeCampaignResultCas,
  publishCompositeCampaignHandoffCas
} from "./composite-campaign-lifecycle-store-mutate.js";

type Dependencies = Partial<CompositeCampaignStoreDependencies>;

export function createCompositeCampaignStore(overrides: Dependencies = {}) {
  const dependencies: CompositeCampaignStoreDependencies = {
    ...defaultCompositeCampaignStoreDependencies,
    ...overrides
  };
  return {
    campaignsRoot: async (projectRoot: string): Promise<string> =>
      (await resolveCompositeCampaignBasePaths(projectRoot)).campaigns_root,
    createCampaign: async (
      projectRoot: string,
      input: { campaign_id: string; request: string; operation_id: string }
    ): Promise<CompositeCampaignLoadedSnapshotV1> => publicSnapshot(await createCompositeCampaign(projectRoot, input, dependencies)),
    loadCampaignSnapshot: async (
      projectRoot: string,
      campaignId: string,
      suppliedCampaignPath?: string
    ): Promise<CompositeCampaignLoadedSnapshotV1> =>
      publicSnapshot(await loadVerifiedCompositeCampaignSnapshot(projectRoot, campaignId, suppliedCampaignPath)),
    applyScopeFitCas: async (projectRoot: string, input: Parameters<typeof applyCompositeScopeFitCas>[1]) =>
      publicSnapshot(await applyCompositeScopeFitCas(projectRoot, input, dependencies)),
    createPacketRevisionCas: async (projectRoot: string, input: Parameters<typeof createCompositePacketRevisionCas>[1]) =>
      publicSnapshot(await createCompositePacketRevisionCas(projectRoot, input, dependencies)),
    publishProjectionCas: async (projectRoot: string, input: Parameters<typeof publishCompositeProjectionCas>[1]) =>
      publicSnapshot(await publishCompositeProjectionCas(projectRoot, input, dependencies)),
    publishHandoffCas: async (projectRoot: string, input: Parameters<typeof publishCompositeCampaignHandoffCas>[1]) =>
      publicSnapshot(await publishCompositeCampaignHandoffCas(projectRoot, input, dependencies)),
    bindGoalCas: async (projectRoot: string, input: Parameters<typeof bindCompositeCampaignGoalCas>[1]) =>
      publicSnapshot(await bindCompositeCampaignGoalCas(projectRoot, input, dependencies)),
    projectResultCas: async (projectRoot: string, input: Parameters<typeof projectCompositeCampaignResultCas>[1]) =>
      publicSnapshot(await projectCompositeCampaignResultCas(projectRoot, input, dependencies))
  };
}

function publicSnapshot(snapshot: CompositeCampaignLoadedSnapshotV1): CompositeCampaignLoadedSnapshotV1 {
  return {
    campaign: snapshot.campaign,
    raw_manifest: snapshot.raw_manifest,
    manifest_etag_sha256: snapshot.manifest_etag_sha256,
    generation: snapshot.generation
  };
}
