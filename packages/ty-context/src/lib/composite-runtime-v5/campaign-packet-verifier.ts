import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveConflictProfileV4 } from "../composite-campaign-conflicts.js";
import {
  parseSourceCoverageV2,
  type CampaignPacketEntityIndexV1,
  type SourceCoverageV2,
} from "../composite-campaign-source-coverage.js";
import {
  assertPacketContextResolutionV2,
  assertSourceUnitPacketBindingsV4,
} from "../composite-campaign-source-units.js";
import { parseLongTaskSources } from "../long-task-contract-parser.js";
import { validateLongTaskCoverage } from "../long-task-contract-coverage.js";
import {
  LONG_TASK_SOURCE_FILES,
  type LongTaskSourceBundleV3,
} from "../long-task-contract-schema.js";
import { resolveInside } from "../long-task-path-policy.js";
import type { SourceUnitV4 } from "../scope-fit-v4.js";
import {
  assertCampaignContextBaselineFresh,
  captureCampaignContextBaseline,
  type CampaignContextBaseline,
} from "../context-graph-snapshot.js";
import {
  deriveChangeEnvelopeV1,
  type ChangeEnvelopeV1,
} from "../composite-campaign-change-envelope.js";
import {
  currentPacketRevisionPathV5,
  loadCampaignStoreV5,
} from "./campaign-store.js";
import {
  assertPacketProjectionsV5,
  optionalPacketContextBaselineV5,
  parseCurrentScopeV4,
  readPacketRevisionV5,
} from "./campaign-packet-io.js";

export async function renderCampaignPacketV5(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
): Promise<{ revision_path: string; files: string[] }> {
  const { root, campaign } = await loadCampaignStoreV5(
    projectRoot,
    campaignPath,
  );
  const revisionPath = currentPacketRevisionPathV5(root, campaign, sliceId);
  const packet = await readPacketRevisionV5(revisionPath, campaign, sliceId);
  await assertPacketProjectionsV5(revisionPath, packet);
  return {
    revision_path: revisionPath,
    files: Object.values(LONG_TASK_SOURCE_FILES),
  };
}

export async function verifyCampaignPacketV5(
  projectRoot: string,
  campaignPath: string,
  sliceId: string,
): Promise<{
  coverage: unknown;
  revision_path: string;
  packet_index: CampaignPacketEntityIndexV1;
  conflict_profile: unknown;
  context_baseline: CampaignContextBaseline;
  change_envelope: ChangeEnvelopeV1;
}> {
  const rendered = await renderCampaignPacketV5(
    projectRoot,
    campaignPath,
    sliceId,
  );
  const previousBaseline = await optionalPacketContextBaselineV5(
    rendered.revision_path,
  );
  if (previousBaseline)
    await assertCampaignContextBaselineFresh(
      projectRoot,
      previousBaseline,
      Object.keys(previousBaseline.files),
    );
  const bundle = await parseLongTaskSources(rendered.revision_path);
  const coverage = validateLongTaskCoverage(bundle);
  if (!coverage.passed) throw new Error(coverage.errors.join("\n"));
  for (const spec of bundle.checklist.verification_specs)
    await readFile(
      resolveInside(projectRoot, spec.oracle.entrypoint, `${spec.id}.oracle`),
    );
  const index = packetEntityIndex(sliceId, bundle);
  const { root, campaign } = await loadCampaignStoreV5(
    projectRoot,
    campaignPath,
  );
  const scope = parseCurrentScopeV4(
    await readFile(path.join(root, "scope-fit.json"), "utf8"),
  );
  const sourceCoverage = parseSourceCoverageV2(
    await readFile(path.join(root, "source-coverage.json"), "utf8"),
  );
  validateSliceGlobalBindings(sourceCoverage, index);
  const scopeSlice = scope.slices.find((slice) => slice.slice_id === sliceId);
  if (!scopeSlice) throw new Error("Packet Slice is absent from Scope Fit");
  const packet = await readPacketRevisionV5(
    rendered.revision_path,
    campaign,
    sliceId,
  );
  const sourceUnitBindings = assertSourceUnitPacketBindingsV4(
    scope,
    sliceId,
    packet.source_unit_bindings,
    bundle,
  );
  assertPacketContextResolutionV2(
    scope,
    sliceId,
    sourceCoverage,
    sourceUnitBindings,
    bundle,
  );
  const selected = new Set(scopeSlice.source_unit_refs);
  const sourceUnits: SourceUnitV4[] = scope.source_units.filter((unit) =>
    selected.has(unit.unit_id),
  );
  const profile = deriveConflictProfileV4(scopeSlice, bundle, sourceUnits);
  const contextBaseline = await captureCampaignContextBaseline(projectRoot, [
    ...sourceCoverage.items.flatMap(
      (item) => item.context_resolution?.context_refs ?? [],
    ),
    ...bundle.product.requirements.flatMap(
      (requirement) => requirement.context_refs ?? [],
    ),
  ]);
  const changeEnvelope = deriveChangeEnvelopeV1(bundle, {
    allowedSupportingPaths: [
      ...profile.generated_artifacts,
      ...profile.package_manager_manifests,
    ],
  });
  return {
    coverage,
    revision_path: rendered.revision_path,
    packet_index: index,
    conflict_profile: profile,
    context_baseline: contextBaseline,
    change_envelope: changeEnvelope,
  };
}

function packetEntityIndex(
  sliceId: string,
  bundle: LongTaskSourceBundleV3,
): CampaignPacketEntityIndexV1 {
  return {
    slice_id: sliceId,
    requirement_ids: bundle.product.requirements.map((item) => item.id),
    acceptance_criterion_ids: bundle.checklist.acceptance_criteria.map(
      (item) => item.id,
    ),
    verification_spec_ids: bundle.checklist.verification_specs.map(
      (item) => item.id,
    ),
    global_invariant_spec_ids: bundle.checklist.verification_specs
      .filter(
        (item) =>
          item.input_paths.includes("**") ||
          item.proof_capabilities.includes("security_boundary") ||
          item.proof_capabilities.includes("population_coverage"),
      )
      .map((item) => item.id),
  };
}

function validateSliceGlobalBindings(
  coverage: SourceCoverageV2,
  index: CampaignPacketEntityIndexV1,
): void {
  const requirements = new Set(index.requirement_ids);
  const criteria = new Set(index.acceptance_criterion_ids);
  const globals = new Set(index.global_invariant_spec_ids);
  for (const binding of coverage.global_constraint_bindings.filter(
    (item) => item.slice_id === index.slice_id,
  )) {
    for (const id of binding.requirement_ids)
      if (!requirements.has(id))
        throw new Error(
          `Global constraint binding references unknown requirement: ${id}`,
        );
    for (const id of binding.acceptance_criterion_ids)
      if (!criteria.has(id))
        throw new Error(
          `Global constraint binding references unknown AC: ${id}`,
        );
    for (const id of binding.verification_spec_ids)
      if (!globals.has(id))
        throw new Error(
          `Global constraint binding requires a global-invariant spec: ${id}`,
        );
  }
}
