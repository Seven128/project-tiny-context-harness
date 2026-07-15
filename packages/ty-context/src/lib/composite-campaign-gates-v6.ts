import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictJson } from "./composite-campaign-codec.js";
import type { ConflictProfileV4 } from "./composite-campaign-conflicts.js";
import {
  validateChangeEnvelopeV1,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";
import { currentHead, runGit } from "./composite-campaign-git-baseline.js";
import type {
  CampaignFinalSliceInput,
  CampaignGlobalConstraintBindingV1,
} from "./composite-campaign-final-gate.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import {
  assertGlobalConstraintPacketCoverageV2,
  parseSourceCoverageV2,
  type CampaignPacketEntityIndexV1,
  type SourceCoverageV2,
} from "./composite-campaign-source-coverage.js";
import { parseLongTaskSources } from "./long-task-contract-parser.js";
import {
  decideWaveImpactV2,
  waveSpecId,
  type WaveImpactDecisionV2,
  type WaveVerificationSpecProfileV2,
} from "./composite-campaign-wave-impact.js";
import { atomic } from "./long-task-status.js";
import type { ScopeFitResultV4 } from "./scope-fit-v4.js";
import {
  currentPacketRevisionPathV6,
  parseCurrentScopeV6,
} from "./composite-runtime-v6/campaign-packet-io.js";

export interface CampaignGateAuthorityV6 {
  scope: ScopeFitResultV4;
  coverage: SourceCoverageV2;
  source_coverage_complete: true;
  global_constraints: CampaignGlobalConstraintBindingV1[];
  slice_inputs: CampaignFinalSliceInput[];
}

export async function loadCampaignScopeCoverageV6(
  campaignRoot: string,
): Promise<{ scope: ScopeFitResultV4; coverage: SourceCoverageV2 }> {
  return {
    scope: parseCurrentScopeV6(
      await readFile(path.join(campaignRoot, "scope-fit.json"), "utf8"),
    ),
    coverage: parseSourceCoverageV2(
      await readFile(path.join(campaignRoot, "source-coverage.json"), "utf8"),
    ),
  };
}

export async function loadCampaignGateAuthorityV6(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceIds = Object.keys(campaign.slices),
): Promise<CampaignGateAuthorityV6> {
  const { scope, coverage } = await loadCampaignScopeCoverageV6(campaignRoot);
  const indexes = await Promise.all(
    Object.keys(campaign.slices).map((sliceId) =>
      readPacketIndex(campaignRoot, campaign, sliceId),
    ),
  );
  assertGlobalConstraintPacketCoverageV2(scope, coverage, indexes);
  return {
    scope,
    coverage,
    source_coverage_complete: true,
    global_constraints: aggregateGlobalConstraints(scope, coverage),
    slice_inputs: stable(sliceIds).map((sliceId) =>
      campaignFinalInputV6(campaignRoot, campaign, sliceId),
    ),
  };
}

function aggregateGlobalConstraints(
  scope: ScopeFitResultV4,
  coverage: SourceCoverageV2,
): CampaignGlobalConstraintBindingV1[] {
  return scope.global_constraints.map((constraint) => {
    const bindings = coverage.global_constraint_bindings.filter(
      (binding) => binding.constraint_id === constraint.constraint_id,
    );
    return {
      constraint_id: constraint.constraint_id,
      applies_to: [...constraint.applies_to],
      requirement_ids: stable(
        bindings.flatMap((binding) => binding.requirement_ids),
      ),
      acceptance_criterion_ids: stable(
        bindings.flatMap((binding) => binding.acceptance_criterion_ids),
      ),
      verification_spec_ids: stable(
        bindings.flatMap((binding) => binding.verification_spec_ids),
      ),
    };
  });
}

export async function analyzeWaveImpactV6(options: {
  campaignRoot: string;
  campaign: CampaignV6;
  integrationWorktree: string;
  waveId: string;
  scope: ScopeFitResultV4;
  coverage: SourceCoverageV2;
}): Promise<WaveImpactDecisionV2> {
  const wave = options.campaign.waves[options.waveId];
  if (!wave) throw new Error(`campaign_wave_unknown:${options.waveId}`);
  const candidateIds = stable(
    Object.entries(options.campaign.slices)
      .filter(
        ([sliceId, slice]) =>
          wave.slice_ids.includes(sliceId) ||
          slice.status === "merged" ||
          slice.status === "integration_verified",
      )
      .map(([sliceId]) => sliceId),
  );
  const profileEntries = await Promise.all(
    candidateIds.map(
      async (sliceId) =>
        [
          sliceId,
          await readConflictProfile(
            options.campaignRoot,
            options.campaign,
            sliceId,
          ),
        ] as const,
    ),
  );
  const envelopeEntries = await Promise.all(
    candidateIds.map(
      async (sliceId) =>
        [
          sliceId,
          await readChangeEnvelope(
            options.campaignRoot,
            options.campaign,
            sliceId,
          ),
        ] as const,
    ),
  );
  const specEntries = await Promise.all(
    candidateIds.map(
      async (sliceId) =>
        [
          sliceId,
          await readWaveSpecProfiles(
            options.campaignRoot,
            options.campaign,
            sliceId,
          ),
        ] as const,
    ),
  );
  const integrationHead = await currentHead(options.integrationWorktree);
  const changedPaths = splitLines(
    (
      await runGit(options.integrationWorktree, [
        "diff",
        "--name-only",
        "--no-renames",
        wave.base_commit,
        integrationHead,
      ])
    ).stdout,
  );
  const declared = new Set(
    options.scope.global_constraints.map(
      (constraint) => constraint.constraint_id,
    ),
  );
  const globalSpecIds = stable(
    options.coverage.global_constraint_bindings
      .filter(
        (binding) =>
          declared.has(binding.constraint_id) &&
          candidateIds.includes(binding.slice_id),
      )
      .flatMap((binding) =>
        binding.verification_spec_ids.map((specId) =>
          waveSpecId(binding.slice_id, specId),
        ),
      ),
  );
  const decision = decideWaveImpactV2({
    wave_slice_ids: wave.slice_ids,
    candidate_slice_ids: candidateIds,
    changed_paths: changedPaths,
    profiles: Object.fromEntries(profileEntries),
    envelopes: Object.fromEntries(envelopeEntries),
    spec_profiles: Object.fromEntries(specEntries),
    global_constraint_spec_ids: globalSpecIds,
  });
  await atomic(
    path.join(
      options.campaignRoot,
      "waves",
      options.waveId,
      "impact-analysis.json",
    ),
    decision,
  );
  return decision;
}

export function campaignFinalInputV6(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): CampaignFinalSliceInput {
  const slice = campaign.slices[sliceId];
  if (!slice?.wave_id || !slice.head_commit || !slice.final_receipt_sha256)
    throw new Error(`campaign_slice_receipt_identity_missing:${sliceId}`);
  return {
    slice_id: sliceId,
    packet_revision_path: currentPacketRevisionPathV6(
      campaignRoot,
      campaign,
      sliceId,
    ),
    receipt_path: path.join(
      campaignRoot,
      "slices",
      sliceId,
      "receipts",
      `${slice.wave_id}-${slice.head_commit.slice(0, 12)}.json`,
    ),
  };
}

export async function readConflictProfile(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<ConflictProfileV4> {
  return parseStrictJson(
    await readFile(
      path.join(
        currentPacketRevisionPathV6(campaignRoot, campaign, sliceId),
        "conflict-profile.json",
      ),
      "utf8",
    ),
  ) as ConflictProfileV4;
}

export async function readChangeEnvelope(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<ChangeEnvelopeV1> {
  return validateChangeEnvelopeV1(
    parseStrictJson(
      await readFile(
        path.join(
          currentPacketRevisionPathV6(campaignRoot, campaign, sliceId),
          "change-envelope.json",
        ),
        "utf8",
      ),
    ) as ChangeEnvelopeV1,
  );
}

async function readPacketIndex(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<CampaignPacketEntityIndexV1> {
  return parseStrictJson(
    await readFile(
      path.join(
        currentPacketRevisionPathV6(campaignRoot, campaign, sliceId),
        "packet-index.json",
      ),
      "utf8",
    ),
  ) as CampaignPacketEntityIndexV1;
}

async function readWaveSpecProfiles(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<WaveVerificationSpecProfileV2[]> {
  const bundle = await parseLongTaskSources(
    currentPacketRevisionPathV6(campaignRoot, campaign, sliceId),
  );
  const bindings = new Map(
    bundle.plan.plan_items.flatMap((item) =>
      item.obligations.flatMap((obligation) =>
        obligation.implementation_bindings.map(
          (binding) => [binding.id, binding] as const,
        ),
      ),
    ),
  );
  const requirements = new Map(
    bundle.product.requirements.map(
      (requirement) => [requirement.id, requirement] as const,
    ),
  );
  const fixtures = new Map(
    bundle.checklist.counterexample_fixtures.map(
      (fixture) => [fixture.id, fixture] as const,
    ),
  );
  return bundle.checklist.verification_specs.map((spec) => {
    const claimed = spec.claims.binding_ids.map((bindingId) => {
      const binding = bindings.get(bindingId);
      if (!binding)
        throw new Error(
          `wave_spec_binding_missing:${sliceId}:${spec.id}:${bindingId}`,
        );
      return binding;
    });
    const controls = bundle.plan.counterfactual_controls.filter((control) =>
      control.obligation_ids.some((obligationId) =>
        spec.claims.obligation_ids.includes(obligationId),
      ),
    );
    const counterfactualPaths = controls.flatMap((control) => {
      if (control.mutation.type === "remove_binding_targets") return [];
      const fixture = fixtures.get(control.mutation.fixture_id);
      if (!fixture)
        throw new Error(
          `wave_spec_fixture_missing:${sliceId}:${spec.id}:${control.mutation.fixture_id}`,
        );
      return [control.mutation.target_path, fixture.path];
    });
    return {
      slice_id: sliceId,
      spec_id: spec.id,
      binding_paths: stable(
        claimed
          .filter(
            (binding) =>
              binding.kind === "file" || binding.kind === "path_glob",
          )
          .map((binding) => normalizeImpactPath(binding.target)),
      ),
      verification_paths: stable(
        [
          ...spec.input_paths,
          spec.oracle.entrypoint,
          ...spec.command_steps.map((step) => step.target),
          ...counterfactualPaths,
        ].map(normalizeImpactPath),
      ),
      contract_keys: stable(
        claimed
          .filter(
            (binding) =>
              binding.kind !== "file" && binding.kind !== "path_glob",
          )
          .map((binding) => `${binding.kind}:${binding.target}`),
      ),
      context_refs: stable(
        spec.claims.requirement_ids.flatMap((requirementId) => {
          const requirement = requirements.get(requirementId);
          if (!requirement)
            throw new Error(
              `wave_spec_requirement_missing:${sliceId}:${spec.id}:${requirementId}`,
            );
          return (requirement.context_refs ?? []).map(normalizeImpactPath);
        }),
      ),
    };
  });
}

function normalizeImpactPath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}
function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}
function stable(values: string[]): string[] {
  return [...new Set(values)].sort(ascii);
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
