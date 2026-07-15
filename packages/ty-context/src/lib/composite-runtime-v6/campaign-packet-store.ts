import { canonicalJson, sha256Hex } from "../composite-campaign-codec.js";
import { validateScopeFitGraphV4 } from "../composite-campaign-graph.js";
import {
  emptyCampaignSliceV6,
  type CampaignSliceV6,
  type CampaignV6,
} from "../composite-campaign-schema-v6.js";
import {
  parseSourceCoverageV2,
  validateSourceCoverageAgainstScopeV4,
} from "../composite-campaign-source-coverage.js";
import { captureCampaignContextBaseline } from "../context-graph-snapshot.js";
import type { ChangeEnvelopeV1 } from "../composite-campaign-change-envelope.js";
import type { CampaignPacketEntityIndexV1 } from "../composite-campaign-source-coverage.js";
import type { CampaignLockHandleV6 } from "./campaign-store.js";
import { mutateCampaignStoreV6 } from "./campaign-store.js";
import {
  optionalScopeV6,
  packetAuthorityFilesV6,
  parseCurrentScopeV6,
  readPacketInputV6,
  readSafeFileV6,
  relativeCampaignPathV6,
  revisionRootV6,
  validatePacketV6,
  validatePortableIdV6,
} from "./campaign-packet-io.js";
import {
  renderCampaignPacketV6,
  verifyCampaignPacketV6,
} from "./campaign-packet-verifier.js";

export { renderCampaignPacketV6, verifyCampaignPacketV6 };

export async function applyCampaignScopeV6(
  projectRoot: string,
  campaignPath: string,
  scopeFile: string,
  coverageFile: string,
  lock?: CampaignLockHandleV6,
): Promise<CampaignV6> {
  const scope = parseCurrentScopeV6(
    (await readSafeFileV6(projectRoot, scopeFile, "scope-input")).text,
  );
  const coverage = parseSourceCoverageV2(
    (await readSafeFileV6(projectRoot, coverageFile, "source-coverage-input"))
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
  return mutateCampaignStoreV6(
    projectRoot,
    campaignPath,
    "scope_applied",
    async (root, campaign, artifacts) => {
      if (
        scope.request_sha256 !== campaign.source_plan_sha256 ||
        coverage.source_plan_sha256 !== campaign.source_plan_sha256
      )
        throw new Error("campaign_scope_source_plan_hash_mismatch");
      if (
        Object.values(campaign.slices).some(
          (slice) => slice.attempt_count.execution > 0,
        )
      )
        throw new Error("scope_fit_graph_frozen_after_first_execution_worker");
      const prior = await optionalScopeV6(root);
      if (prior) validateScopeFitGraphV4(scope, prior);
      const slices: Record<string, CampaignSliceV6> = {};
      for (const slice of scope.slices)
        slices[slice.slice_id] =
          campaign.slices[slice.slice_id] ?? emptyCampaignSliceV6();
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
      campaign.block_reason =
        scope.decision === "blocked_for_decision"
          ? "scope_decision_required"
          : null;
      campaign.context_baseline = contextBaseline;
      artifacts.stageFile("scope-fit.json", canonicalJson(scope));
      artifacts.stageFile("source-coverage.json", canonicalJson(coverage));
      return campaign;
    },
    lock,
  );
}

export async function applyCampaignPacketV6(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
  packetFile: string,
  lock?: CampaignLockHandleV6,
): Promise<{
  campaign: CampaignV6;
  packet_sha256: string;
  revision_path: string;
}> {
  validatePortableIdV6(sliceId, "slice");
  const packet = await readPacketInputV6(projectRoot, packetFile);
  let packetSha256 = "";
  let revisionPath = "";
  const campaign = await mutateCampaignStoreV6(
    projectRoot,
    campaignPath,
    "packet_applied",
    async (root, value, artifacts) => {
      validatePacketV6(packet, value, sliceId);
      const slice = value.slices[sliceId];
      if (
        !slice ||
        ![
          "planned",
          "packet_pending",
          "packet_ready",
          "needs_work",
          "interrupted",
        ].includes(slice.status)
      )
        throw new Error("campaign_slice_cannot_accept_packet_in_current_state");
      if (slice.attempt_count.execution > 0)
        throw new Error("packet_frozen_after_first_execution_worker");
      const expected = (slice.packet_revision ?? 0) + 1;
      if (packet.revision !== expected)
        throw new Error(`packet_revision_must_be_${expected}`);
      if (expected === 1 && packet.previous_packet_sha256 !== null)
        throw new Error("first_packet_requires_null_previous_hash");
      if (expected > 1 && packet.previous_packet_sha256 !== slice.packet_sha256)
        throw new Error("packet_previous_hash_mismatch");
      packetSha256 = sha256Hex(canonicalJson(packet));
      revisionPath = revisionRootV6(root, sliceId, packet.revision);
      const revisionRelative = relativeCampaignPathV6(root, revisionPath);
      artifacts.stageFile(
        `${revisionRelative}/authoring-packet.json`,
        canonicalJson(packet),
        { immutable: true },
      );
      for (const [file, content] of packetAuthorityFilesV6(packet))
        artifacts.stageFile(`${revisionRelative}/${file}`, content, {
          immutable: true,
        });
      slice.packet_revision = packet.revision;
      slice.packet_sha256 = packetSha256;
      slice.status = "packet_pending";
      slice.last_error_code = null;
      return value;
    },
    lock,
  );
  return { campaign, packet_sha256: packetSha256, revision_path: revisionPath };
}

export async function preflightCampaignPacketV6(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
  lock?: CampaignLockHandleV6,
): Promise<{
  packet_ready: true;
  coverage: unknown;
  revision_path: string;
  packet_index: CampaignPacketEntityIndexV1;
  conflict_profile: unknown;
  context_baseline: Awaited<ReturnType<typeof captureCampaignContextBaseline>>;
  change_envelope: ChangeEnvelopeV1;
}> {
  const verified = await verifyCampaignPacketV6(
    projectRoot,
    campaignPath,
    sliceId,
  );
  await mutateCampaignStoreV6(
    projectRoot,
    campaignPath,
    "packet_preflight_passed",
    async (campaignRoot, campaign, artifacts) => {
      const slice = campaign.slices[sliceId];
      if (!slice) throw new Error("campaign_slice_unknown");
      const revisionRelative = relativeCampaignPathV6(
        campaignRoot,
        verified.revision_path,
      );
      for (const [file, value] of [
        ["packet-index.json", verified.packet_index],
        ["conflict-profile.json", verified.conflict_profile],
        ["context-baseline.json", verified.context_baseline],
        ["change-envelope.json", verified.change_envelope],
      ] as const)
        artifacts.stageFile(
          `${revisionRelative}/${file}`,
          canonicalJson(value),
          { immutable: true },
        );
      slice.status = "packet_ready";
      slice.last_error_code = null;
      campaign.context_baseline = verified.context_baseline;
      campaign.campaign_status = "authoring";
      return campaign;
    },
    lock,
  );
  return { packet_ready: true, ...verified };
}
