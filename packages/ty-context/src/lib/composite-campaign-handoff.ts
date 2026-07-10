import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  compositeCampaignExecutionDirectoryExists,
  compositeCampaignExecutionChildFile,
  createCompositeCampaignExecutionStage,
  publishCompositeCampaignExecutionStage,
  removeOwnedCompositeCampaignExecutionWorkdir,
  removeCompositeCampaignExecutionStage,
  resolveCompositeCampaignExecutionPath
} from "./composite-campaign-execution-path.js";
import {
  assertCompositeCampaignHandoffWorkdir,
  buildCompositeCampaignBinding,
  compositeCampaignBindingId,
  writeCompositeCampaignHandoffArtifacts
} from "./composite-campaign-handoff-artifacts.js";
import {
  assertOwnedCompositeCampaignHandoffInstall,
  isOwnedCompositeCampaignHandoffInstall,
  readCompositeCampaignHandoffInstallOwner,
  readOwnedCompositeCampaignHandoffBinding,
  writeCompositeCampaignHandoffInstallMarker
} from "./composite-campaign-handoff-install.js";
import { publishHandoffCas } from "./composite-campaign-lifecycle-store.js";
import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import { loadVerifiedCompositeCampaignSnapshot } from "./composite-campaign-store-read.js";
import { readCompositeCampaignRegularFile } from "./composite-campaign-store-file-io.js";
import { initializeSuperpowersTask, loadSuperpowersState } from "./superpowers-task-state.js";
import { compileSuperpowersTask } from "./superpowers-task-compile.js";
import { startAndSaveSuperpowersAttempt } from "./superpowers-task-attempt.js";
import { renderCompositeLongTaskGoal } from "./composite-long-task-renderer.js";
import type { CompositeCampaignBindingV1 } from "./composite-campaign-types.js";

export interface CompositeCampaignHandoffInput {
  campaign_id: string;
  slice_id: string;
}

export interface CompositeCampaignHandoffResult {
  binding: CompositeCampaignBindingV1;
  workdir: string;
  reused: boolean;
}

export interface CompositeCampaignHandoffDependencies {
  publishHandoffCas: typeof publishHandoffCas;
}

const DEFAULT_HANDOFF_DEPENDENCIES: CompositeCampaignHandoffDependencies = { publishHandoffCas };

export async function handoffCompositeCampaign(
  projectRoot: string,
  input: CompositeCampaignHandoffInput,
  dependencies: CompositeCampaignHandoffDependencies = DEFAULT_HANDOFF_DEPENDENCIES
): Promise<CompositeCampaignHandoffResult> {
  exactInput(input);
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const sliceId = validateCompositeSfcId(input.slice_id);
  let snapshot = await loadVerifiedCompositeCampaignSnapshot(projectRoot, campaignId);
  const slice = snapshot.campaign.slices[sliceId];
  if (!slice || slice.selection_status !== "selected" || slice.authoring_status !== "ready" || !slice.current_revision) {
    throw new Error("Composite campaign handoff requires the current selected ready SFC revision");
  }
  const paths = await executionPaths(projectRoot, campaignId, sliceId, slice.current_revision);
  const exists = await compositeCampaignExecutionDirectoryExists(paths.project_root, paths.final_path);
  let priorInstallAttemptId: string | null = null;
  if (slice.handoff_status === "started" || slice.binding?.goal) {
    if (slice.binding?.result) throw new Error("A completed composite campaign binding cannot be handed off again");
    if (exists) {
      let startedValid = false;
      try {
        await assertStartedWorkdir(paths.project_root, paths.final_path, slice.binding!);
        startedValid = true;
      } catch {
        // A pristine owned replacement may be installed before its handoff CAS commits.
      }
      if (startedValid) {
        let installed: CompositeCampaignBindingV1;
        try {
          installed = await readOwnedCompositeCampaignHandoffBinding(paths.final_path, slice.binding!.binding_id);
          assertSameGoalRecovery(slice.binding!, installed);
        } catch {
          return { binding: slice.binding!, workdir: paths.final_path, reused: true };
        }
        return publishBinding(projectRoot, snapshot, installed, paths.final_path, true, dependencies);
      }
      const replacement = await readOwnedCompositeCampaignHandoffBinding(
        paths.final_path, slice.binding!.binding_id
      );
      assertSameGoalRecovery(slice.binding!, replacement);
      return publishBinding(projectRoot, snapshot, replacement, paths.final_path, true, dependencies);
    }
  } else if (exists) {
    if (slice.binding) {
      try {
        await assertCompositeCampaignHandoffWorkdir(paths.final_path, slice.binding);
        await assertOwnedCompositeCampaignHandoffInstall(paths.final_path, slice.binding);
        return { binding: slice.binding, workdir: paths.final_path, reused: true };
      } catch {
        if (!await isOwnedCompositeCampaignHandoffInstall(paths.final_path, slice.binding.binding_id)) {
          throw new Error("Existing composite campaign handoff workdir is not an owned recoverable install");
        }
        priorInstallAttemptId = (await readCompositeCampaignHandoffInstallOwner(
          paths.final_path, slice.binding.binding_id
        )).task.task_attempt_id;
      }
    } else if (!await isOwnedCompositeCampaignHandoffInstall(
      paths.final_path, compositeCampaignBindingId(snapshot.campaign, sliceId)
    )) {
      throw new Error("Existing composite campaign handoff workdir is not an owned recoverable install");
    } else {
      priorInstallAttemptId = (await readCompositeCampaignHandoffInstallOwner(
        paths.final_path, compositeCampaignBindingId(snapshot.campaign, sliceId)
      )).task.task_attempt_id;
    }
    await removeOwnedCompositeCampaignExecutionWorkdir(paths.final_path, paths.project_root);
  }
  const stage = await createCompositeCampaignExecutionStage(paths, `${sliceId}-r${slice.current_revision}`);
  let published = false;
  try {
    await materializeFrozenSources(projectRoot, snapshot, sliceId, slice.current_revision, stage);
    await initializeSuperpowersTask(stage, { planSlug: `${campaignId}-${sliceId}-r${slice.current_revision}` });
    let state = await compileSuperpowersTask(stage, { mode: "product_task" });
    if ((slice.binding && state.current_attempt_id === slice.binding.task.task_attempt_id) ||
      state.current_attempt_id === priorInstallAttemptId) {
      await startAndSaveSuperpowersAttempt(stage, "product_task");
      state = await loadSuperpowersState(stage);
    }
    const freshBinding = buildCompositeCampaignBinding(snapshot.campaign, sliceId, state);
    const binding: CompositeCampaignBindingV1 = slice.binding?.goal ? {
      ...freshBinding,
      handed_off_at: slice.binding.handed_off_at,
      goal: slice.binding.goal
    } : freshBinding;
    await renderCompositeLongTaskGoal(stage, { displayWorkdir: paths.final_path });
    await writeCompositeCampaignHandoffArtifacts(stage, binding, campaignManifestPath(snapshot, paths.project_root));
    await writeCompositeCampaignHandoffInstallMarker(stage, binding);
    await assertCompositeCampaignHandoffWorkdir(stage, binding);
    await assertOwnedCompositeCampaignHandoffInstall(stage, binding);
    await publishCompositeCampaignExecutionStage(stage, paths.final_path, paths.project_root);
    published = true;
    await assertCompositeCampaignHandoffWorkdir(paths.final_path, binding);
    await assertOwnedCompositeCampaignHandoffInstall(paths.final_path, binding);
    return await publishBinding(projectRoot, snapshot, binding, paths.final_path, false, dependencies);
  } finally {
    if (!published) await removeCompositeCampaignExecutionStage(stage, paths.project_root);
  }
}

async function publishBinding(
  projectRoot: string,
  snapshot: Awaited<ReturnType<typeof loadVerifiedCompositeCampaignSnapshot>>,
  binding: CompositeCampaignBindingV1,
  workdir: string,
  reused: boolean,
  dependencies: CompositeCampaignHandoffDependencies
): Promise<CompositeCampaignHandoffResult> {
  const operationId = `handoff:${sha256Hex(canonicalJson({
    binding_id: binding.binding_id,
    task_id: binding.task.task_id,
    task_attempt_id: binding.task.task_attempt_id
  })).slice(0, 48)}`;
  const loaded = await dependencies.publishHandoffCas(projectRoot, {
    campaign_id: binding.campaign_id,
    slice_id: binding.slice_id,
    binding,
    expected_etag: snapshot.manifest_etag_sha256,
    operation_id: operationId
  });
  const frozen = loaded.campaign.slices[binding.slice_id]?.binding;
  if (!frozen) throw new Error("Composite campaign handoff CAS did not publish its binding");
  await assertCompositeCampaignHandoffWorkdir(workdir, frozen);
  await assertOwnedCompositeCampaignHandoffInstall(workdir, frozen);
  return { binding: frozen, workdir, reused };
}

function assertSameGoalRecovery(current: CompositeCampaignBindingV1, replacement: CompositeCampaignBindingV1): void {
  if (!current.goal || !replacement.goal || canonicalJson(current.goal) !== canonicalJson(replacement.goal) ||
    current.binding_id !== replacement.binding_id || current.handed_off_at !== replacement.handed_off_at ||
    current.campaign_id !== replacement.campaign_id || current.slice_id !== replacement.slice_id ||
    current.revision !== replacement.revision || canonicalJson(current.source_hashes) !== canonicalJson(replacement.source_hashes)) {
    throw new Error("Started composite campaign recovery install does not preserve the same Goal and frozen binding");
  }
}

async function assertStartedWorkdir(projectRoot: string, workdir: string, binding: CompositeCampaignBindingV1): Promise<void> {
  const state = await loadSuperpowersState(workdir);
  if (state.meta.task_id !== binding.task.task_id) {
    throw new Error("Started composite campaign workdir task_id differs from its Goal binding");
  }
  const files = {
    product_architecture_source: "product-architecture-source.md",
    technical_realization_plan: "technical-realization-plan.md",
    acceptance_checklist: "acceptance-checklist.md"
  } as const;
  for (const [key, expected] of Object.entries(binding.source_hashes)) {
    const sourcePath = await compositeCampaignExecutionChildFile(projectRoot, workdir, files[key as keyof typeof files]);
    if (state.sources[key]?.sha256 !== expected || sha256Hex(await readFile(sourcePath)) !== expected) {
      throw new Error(`Started composite campaign workdir source hash differs for ${key}`);
    }
  }
}

async function materializeFrozenSources(
  projectRoot: string,
  snapshot: Awaited<ReturnType<typeof loadVerifiedCompositeCampaignSnapshot>>,
  sliceId: ReturnType<typeof validateCompositeSfcId>,
  revision: number,
  stage: string
): Promise<void> {
  const files = snapshot.paths.revision_files(sliceId, revision);
  for (const [key, file] of Object.entries({
    "product-architecture-source.md": files.product_architecture_source,
    "technical-realization-plan.md": files.technical_realization_plan,
    "acceptance-checklist.md": files.acceptance_checklist
  })) {
    const source = await readCompositeCampaignRegularFile(projectRoot, file, `Composite campaign handoff ${key}`);
    await writeFile(path.join(stage, key), source.raw, { flag: "wx" });
  }
}

async function executionPaths(projectRoot: string, campaignId: string, sliceId: string, revision: number) {
  return resolveCompositeCampaignExecutionPath(projectRoot,
    `tmp/ty-context/plan-acceptance/${campaignId}/${sliceId}-r${revision}/`);
}

function campaignManifestPath(
  snapshot: Awaited<ReturnType<typeof loadVerifiedCompositeCampaignSnapshot>>,
  projectRoot: string
): string {
  return path.relative(projectRoot, snapshot.paths.manifest_path).replaceAll("\\", "/");
}

function exactInput(input: CompositeCampaignHandoffInput): void {
  if (Object.keys(input).length !== 2 || !Object.hasOwn(input, "campaign_id") || !Object.hasOwn(input, "slice_id")) {
    throw new Error("Composite campaign handoff input contains unknown or missing keys");
  }
}
