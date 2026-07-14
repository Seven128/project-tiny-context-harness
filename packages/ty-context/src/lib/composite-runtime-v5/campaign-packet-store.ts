import { canonicalJson, sha256Hex } from "../composite-campaign-codec.js";
import { validateScopeFitGraphV4 } from "../composite-campaign-graph.js";
import {
  campaignHasGoalV5,
  emptyThreadStateV5,
  type CampaignSliceV5,
  type CampaignV5,
} from "../composite-campaign-schema-v5.js";
import {
  parseSourceCoverageV2,
  validateSourceCoverageAgainstScopeV4,
} from "../composite-campaign-source-coverage.js";
import { captureCampaignContextBaseline } from "../context-graph-snapshot.js";
import type { ChangeEnvelopeV1 } from "../composite-campaign-change-envelope.js";
import type { CampaignPacketEntityIndexV1 } from "../composite-campaign-source-coverage.js";
import { mutateCampaignStoreV5 } from "./campaign-store.js";
import {
  optionalScopeV4,
  packetAuthorityFilesV5,
  parseCurrentScopeV4,
  readPacketInputV5,
  readSafeFile,
  relativeCampaignPath,
  revisionRootV5,
  validatePacketV5,
  validatePortableId,
} from "./campaign-packet-io.js";
import {
  renderCampaignPacketV5,
  verifyCampaignPacketV5,
} from "./campaign-packet-verifier.js";

export { renderCampaignPacketV5, verifyCampaignPacketV5 };

export async function applyCampaignScopeV5(
  projectRoot: string,
  campaignPath: string,
  scopeFile: string,
  coverageFile: string,
): Promise<CampaignV5> {
  const scope = parseCurrentScopeV4(
    (await readSafeFile(projectRoot, scopeFile, "scope-input")).text,
  );
  const coverage = parseSourceCoverageV2(
    (await readSafeFile(projectRoot, coverageFile, "source-coverage-input"))
      .text,
  );
  const graph = validateScopeFitGraphV4(scope);
  validateSourceCoverageAgainstScopeV4(scope, coverage);
  const contextBaseline = await captureCampaignContextBaseline(
    projectRoot,
    coverage.items.flatMap(
      (item) => item.context_resolution?.context_refs ?? [],
    ),
  );
  return mutateCampaignStoreV5(
    projectRoot,
    campaignPath,
    "scope_applied",
    async (root, campaign, transaction) => {
      if (
        scope.request_sha256 !== campaign.source_plan_sha256 ||
        coverage.source_plan_sha256 !== campaign.source_plan_sha256
      )
        throw new Error("Campaign scope/source plan hash mismatch");
      if (campaignHasGoalV5(campaign))
        throw new Error(
          "Scope Fit graph is frozen after the first Campaign Goal is set",
        );
      const prior = await optionalScopeV4(root);
      if (prior) validateScopeFitGraphV4(scope, prior);
      const slices: Record<string, CampaignSliceV5> = {};
      for (const slice of scope.slices)
        slices[slice.slice_id] =
          campaign.slices[slice.slice_id] ?? emptyCampaignSlice();
      campaign.graph = {
        graph_revision: campaign.graph.graph_revision + 1,
        graph_sha256: graph.graph_sha256,
        slices: Object.fromEntries(
          scope.slices.map((slice) => [
            slice.slice_id,
            {
              stable_key: slice.stable_key,
              depends_on: [...slice.depends_on],
              priority: slice.priority,
            },
          ]),
        ),
      };
      campaign.slices = slices;
      campaign.campaign_status =
        scope.decision === "blocked_for_decision"
          ? "decision_blocked"
          : "authoring";
      campaign.context_baseline = contextBaseline;
      await transaction.stageFile("scope-fit.json", canonicalJson(scope));
      await transaction.stageFile(
        "source-coverage.json",
        canonicalJson(coverage),
      );
      return campaign;
    },
  );
}

export async function applyCampaignPacketV5(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
  packetFile: string,
): Promise<{
  campaign: CampaignV5;
  packet_sha256: string;
  revision_path: string;
}> {
  validatePortableId(sliceId, "slice");
  const packet = await readPacketInputV5(projectRoot, packetFile);
  let result!: {
    campaign: CampaignV5;
    packet_sha256: string;
    revision_path: string;
  };
  await mutateCampaignStoreV5(
    projectRoot,
    campaignPath,
    "packet_applied",
    async (root, campaign, transaction) => {
      validatePacketV5(packet, campaign, sliceId);
      const slice = campaign.slices[sliceId];
      if (
        !slice ||
        !["planned", "packet_pending", "packet_ready"].includes(slice.status)
      )
        throw new Error(
          "Campaign Slice cannot accept a Packet in its current state",
        );
      const expected = (slice.packet_revision ?? 0) + 1;
      if (packet.revision !== expected)
        throw new Error(`Packet revision must be ${expected}`);
      if (expected === 1 && packet.previous_packet_sha256 !== null)
        throw new Error("First Packet requires previous_packet_sha256=null");
      if (expected > 1 && packet.previous_packet_sha256 !== slice.packet_sha256)
        throw new Error("Packet previous hash mismatch");
      const packetSha = sha256Hex(canonicalJson(packet));
      const revisionPath = revisionRootV5(root, sliceId, packet.revision);
      const revisionRelative = relativeCampaignPath(root, revisionPath);
      await transaction.stageFile(
        `${revisionRelative}/authoring-packet.json`,
        canonicalJson(packet),
      );
      for (const [file, content] of packetAuthorityFilesV5(packet))
        await transaction.stageFile(`${revisionRelative}/${file}`, content);
      slice.packet_revision = packet.revision;
      slice.packet_sha256 = packetSha;
      slice.status = "packet_pending";
      result = {
        campaign,
        packet_sha256: packetSha,
        revision_path: revisionPath,
      };
      return campaign;
    },
  );
  return result;
}

export async function preflightCampaignPacketV5(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
): Promise<{
  packet_ready: true;
  coverage: unknown;
  revision_path: string;
  packet_index: CampaignPacketEntityIndexV1;
  conflict_profile: unknown;
  context_baseline: Awaited<ReturnType<typeof captureCampaignContextBaseline>>;
  change_envelope: ChangeEnvelopeV1;
}> {
  const verified = await verifyCampaignPacketV5(
    projectRoot,
    campaignPath,
    sliceId,
  );
  await mutateCampaignStoreV5(
    projectRoot,
    campaignPath,
    "packet_preflight_passed",
    async (campaignRoot, campaign, transaction) => {
      const slice = campaign.slices[sliceId];
      if (!slice) throw new Error("Unknown Campaign Slice");
      const revisionRelative = relativeCampaignPath(
        campaignRoot,
        verified.revision_path,
      );
      for (const [file, value] of [
        ["packet-index.json", verified.packet_index],
        ["conflict-profile.json", verified.conflict_profile],
        ["context-baseline.json", verified.context_baseline],
        ["change-envelope.json", verified.change_envelope],
      ] as const)
        await transaction.stageFile(
          `${revisionRelative}/${file}`,
          canonicalJson(value),
        );
      slice.status = "packet_ready";
      campaign.context_baseline = verified.context_baseline;
      return campaign;
    },
  );
  return { packet_ready: true, ...verified };
}

function emptyCampaignSlice(): CampaignSliceV5 {
  return {
    status: "planned",
    packet_revision: null,
    packet_sha256: null,
    wave_id: null,
    branch: null,
    worktree: null,
    goal_id: null,
    base_commit: null,
    head_commit: null,
    final_receipt_sha256: null,
    merge_commit: null,
    thread: emptyThreadStateV5(),
  };
}
