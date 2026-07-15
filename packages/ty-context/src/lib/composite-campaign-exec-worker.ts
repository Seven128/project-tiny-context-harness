import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodexExecArgv,
  runCodexExec,
  type CodexExecResult,
} from "./codex-exec-client.js";
import {
  canonicalJson,
  canonicalValueJson,
  parseStrictJson,
  sha256Hex,
} from "./composite-campaign-codec.js";
import { compositeAuthoringPacketOutputSchemaV3 } from "./composite-campaign-packet-schema.js";
import { isCodexTargetUnavailable } from "./composite-campaign-exec-policy.js";
import {
  type CampaignV6,
  type CampaignWorkerRunV6,
} from "./composite-campaign-schema-v6.js";
import { transitionSliceStatusV6 } from "./composite-campaign-state-transition-v6.js";
import { CampaignMutationQueue } from "./composite-campaign-mutation-queue.js";
import {
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  recordSliceExecutionReceiptV3,
  type SliceExecutionReceiptV3,
} from "./composite-campaign-receipt.js";
import {
  validateChangeEnvelopeV1,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";
import { assertDetachedManagedWorktreeV1 } from "./composite-campaign-worktree-budget.js";
import {
  applyCampaignPacketV6,
  applyCampaignScopeV6,
  preflightCampaignPacketV6,
} from "./composite-runtime-v6/campaign-packet-store.js";
import {
  currentPacketRevisionPathV6,
  parseCurrentScopeV6,
} from "./composite-runtime-v6/campaign-packet-io.js";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { LONG_TASK_SOURCE_FILES } from "./long-task-contract-schema.js";
import { clearAcceptedLongTaskBinding } from "./long-task-active-task.js";
import type { ModelProfile } from "./codex-model-profile.js";
import type { ScopeFitResultV4 } from "./scope-fit-v4.js";
import {
  assertCampaignDispatchAllowedV6,
  CampaignWorkerInterruptedError,
} from "./composite-campaign-dispatch-v6.js";
import type { CampaignRunMetricsV6 } from "./composite-campaign-run-metrics-v6.js";
export { CampaignWorkerInterruptedError } from "./composite-campaign-dispatch-v6.js";

export interface CampaignWorkerRuntimeV6 {
  projectRoot: string;
  campaignPath: string;
  campaignRoot: string;
  integrationWorktree: string;
  lock: CampaignLockHandleV6;
  queue: CampaignMutationQueue;
  signal?: AbortSignal;
  codexExecutable?: string;
  repairAttemptBaseline?: number;
  runGeneration: number;
  metrics?: CampaignRunMetricsV6;
}

export interface PacketAuthoringResultV6 {
  authored_slice_ids: string[];
  scope_revised: boolean;
}

export async function authorCampaignPacketsV6(
  runtime: CampaignWorkerRuntimeV6,
  sliceIds: string[],
): Promise<PacketAuthoringResultV6> {
  await assertWorkerDispatch(runtime);
  const campaign = (
    await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath)
  ).campaign;
  const profile = requireProfile(
    campaign.execution_engine.authoring_profile,
    "authoring_profile",
  );
  const results = await boundedMap(
    sliceIds,
    campaign.execution_engine.max_parallelism.authoring,
    (sliceId) => authorPacketForSlice(runtime, sliceId, profile),
  );
  return {
    authored_slice_ids: sliceIds.filter(
      (_sliceId, index) => results[index] === "authored",
    ),
    scope_revised: results.includes("scope_revised"),
  };
}

export async function materializeSliceContractV6(options: {
  campaignRoot: string;
  campaign: CampaignV6;
  sliceId: string;
  worktree: string;
}): Promise<{
  packetRevisionPath: string;
  contractWorkdir: string;
  changeEnvelope: ChangeEnvelopeV1;
  changeEnvelopePath: string;
}> {
  const slice = options.campaign.slices[options.sliceId];
  if (!slice?.packet_revision || !slice.packet_sha256)
    throw new Error(`slice_packet_not_frozen:${options.sliceId}`);
  const revision = currentPacketRevisionPathV6(
    options.campaignRoot,
    options.campaign,
    options.sliceId,
  );
  const contractWorkdir = path.join(
    path.resolve(options.worktree),
    "tmp",
    "ty-context",
    "plan-acceptance",
    options.campaign.campaign_id,
    `${options.sliceId}-r${slice.packet_revision}`,
  );
  await rm(contractWorkdir, { recursive: true, force: true });
  await mkdir(contractWorkdir, { recursive: true });
  for (const file of Object.values(LONG_TASK_SOURCE_FILES))
    await cp(path.join(revision, file), path.join(contractWorkdir, file));
  const changeEnvelopePath = path.join(revision, "change-envelope.json");
  const changeEnvelope = validateChangeEnvelopeV1(
    parseStrictJson(
      await readFile(changeEnvelopePath, "utf8"),
    ) as ChangeEnvelopeV1,
  );
  return {
    packetRevisionPath: revision,
    contractWorkdir,
    changeEnvelope,
    changeEnvelopePath,
  };
}

export async function executeCampaignSliceV6(options: {
  runtime: CampaignWorkerRuntimeV6;
  sliceId: string;
  waveId: string;
  worktree: string;
  baseCommit: string;
  packetRevisionPath: string;
  contractWorkdir: string;
  changeEnvelope: ChangeEnvelopeV1;
  changeEnvelopePath: string;
}): Promise<SliceExecutionReceiptV3> {
  const loaded = await loadCampaignStoreV6(
    options.runtime.projectRoot,
    options.runtime.campaignPath,
  );
  const campaign = loaded.campaign;
  const authoringProfile = requireProfile(
    campaign.execution_engine.authoring_profile,
    "authoring_profile",
  );
  const routedProfile = requireProfile(
    campaign.execution_engine.execution_profile,
    "execution_profile",
  );
  let fallbackUsed = campaign.execution_engine.fallback_reason !== null;
  let profile = fallbackUsed ? authoringProfile : routedProfile;
  let findings: unknown[] = [];
  const limit = campaign.campaign_policy.max_execution_attempts_per_run;
  for (let runAttempt = 1; runAttempt <= limit; runAttempt += 1) {
    await assertWorkerDispatch(options.runtime);
    const current = (
      await loadCampaignStoreV6(
        options.runtime.projectRoot,
        options.runtime.campaignPath,
      )
    ).campaign;
    const slice = current.slices[options.sliceId];
    if (!slice) throw new Error(`campaign_slice_unknown:${options.sliceId}`);
    const prompt = executionPrompt({
      campaign: current,
      sliceId: options.sliceId,
      waveId: options.waveId,
      worktree: options.worktree,
      baseCommit: options.baseCommit,
      packetRevisionPath: options.packetRevisionPath,
      contractWorkdir: options.contractWorkdir,
      changeEnvelope: options.changeEnvelope,
      changeEnvelopePath: options.changeEnvelopePath,
      profile,
      findings,
      repairAttempt: runAttempt > 1,
    });
    const result = await runTrackedWorker({
      runtime: options.runtime,
      sliceId: options.sliceId,
      kind: "execution",
      profile,
      cwd: options.worktree,
      prompt,
    });
    if (result.interrupted) throw new CampaignWorkerInterruptedError();
    await assertDetachedManagedWorktreeV1({
      repositoryRoot: options.runtime.projectRoot,
      campaignId: current.campaign_id,
      worktreePath: options.worktree,
      baseCommit: options.baseCommit,
    });
    const head = await currentHead(options.worktree);
    const descendant = await runGit(
      options.worktree,
      ["merge-base", "--is-ancestor", options.baseCommit, head],
      { throwOnError: false },
    );
    if (descendant.exitCode !== 0)
      findings = [finding("worker_head_not_descendant", options.baseCommit)];
    else {
      const machine = await readMachineResult(options.contractWorkdir);
      findings = machine.findings;
      if (machine.workflow_status === "accepted") {
        try {
          const recorded = await recordSliceExecutionReceiptV3({
            campaignRoot: options.runtime.campaignRoot,
            campaignId: current.campaign_id,
            sliceId: options.sliceId,
            waveId: options.waveId,
            worktree: options.worktree,
            contractWorkdir: options.contractWorkdir,
            baseCommit: options.baseCommit,
            packetSha256: slice.packet_sha256!,
            forbiddenChangedPaths: [
              "project_context",
              ".codex/composite-long-task",
            ],
            changeEnvelope: options.changeEnvelope,
          });
          await clearAcceptedLongTaskBinding(
            options.worktree,
            path.resolve(options.contractWorkdir),
          );
          await queuedMutation(
            options.runtime,
            "slice_receipt_bound",
            async (_root, value) => {
              const target = value.slices[options.sliceId];
              transitionSliceStatusV6(target, "accepted");
              target.head_commit = recorded.receipt.head_commit;
              target.final_receipt_sha256 = recorded.receipt.receipt_sha256;
              target.last_error_code = null;
              value.campaign_status = "executing";
              return value;
            },
          );
          return recorded.receipt;
        } catch (error) {
          findings = [finding("receipt_recording_failed", errorText(error))];
        }
      }
    }
    if (
      !fallbackUsed &&
      (profile.model !== authoringProfile.model ||
        profile.effort !== authoringProfile.effort) &&
      isCodexTargetUnavailable(
        `${result.stderr}\n${canonicalValueJson(result.events).slice(0, 100_000)}`,
      )
    ) {
      fallbackUsed = true;
      profile = authoringProfile;
      await queuedMutation(
        options.runtime,
        "execution_target_unavailable_passthrough",
        async (_root, value) => {
          value.execution_engine.fallback_reason =
            "target_unavailable_passthrough";
          const target = value.slices[options.sliceId];
          transitionSliceStatusV6(target, "needs_work");
          target.last_error_code = "target_unavailable_passthrough";
          return value;
        },
      );
      await assertWorkerDispatch(options.runtime);
      continue;
    }
    await queuedMutation(
      options.runtime,
      "slice_needs_work",
      async (_root, value) => {
        const target = value.slices[options.sliceId];
        transitionSliceStatusV6(
          target,
          runAttempt === limit ? "needs_attention" : "needs_work",
        );
        target.head_commit = head;
        target.last_error_code = boundedError(findings);
        return value;
      },
    );
  }
  await queuedMutation(
    options.runtime,
    "slice_worker_attempt_limit_exceeded",
    async (_root, value) => {
      value.slices[options.sliceId].last_error_code =
        "worker_attempt_limit_exceeded";
      value.campaign_status = "blocked";
      value.block_reason = "worker_attempt_limit_exceeded";
      return value;
    },
  );
  throw new Error(`worker_attempt_limit_exceeded:${options.sliceId}`);
}

export async function runRepairExecWorkerV6(options: {
  runtime: CampaignWorkerRuntimeV6;
  profile: ModelProfile;
  worktree: string;
  prompt: string;
}): Promise<CodexExecResult> {
  return runTrackedWorker({
    runtime: options.runtime,
    kind: "repair",
    profile: options.profile,
    cwd: options.worktree,
    prompt: options.prompt,
  });
}

async function authorPacketForSlice(
  runtime: CampaignWorkerRuntimeV6,
  sliceId: string,
  profile: ModelProfile,
): Promise<"authored" | "scope_revised"> {
  const errors: string[] = [];
  const loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  if (loaded.campaign.slices[sliceId]?.status === "packet_ready")
    return "authored";
  const limit =
    loaded.campaign.campaign_policy.max_authoring_attempts_per_slice;
  for (let runAttempt = 1; runAttempt <= limit; runAttempt += 1) {
    await assertWorkerDispatch(runtime);
    const current = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    const slice = current.campaign.slices[sliceId];
    if (!slice) throw new Error(`campaign_slice_unknown:${sliceId}`);
    const scope = parseCurrentScopeV6(
      await readFile(path.join(current.root, "scope-fit.json"), "utf8"),
    );
    const scopeSlice = scope.slices.find((item) => item.slice_id === sliceId);
    if (!scopeSlice) throw new Error(`scope_slice_missing:${sliceId}`);
    const revision = (slice.packet_revision ?? 0) + 1;
    const runtimeFiles = authoringRuntimeFiles(
      runtime.projectRoot,
      current.campaign.campaign_id,
      sliceId,
      revision,
      runAttempt,
    );
    await mkdir(path.dirname(runtimeFiles.schema), { recursive: true });
    await writeFile(
      runtimeFiles.schema,
      canonicalJson(
        compositeAuthoringPacketOutputSchemaV3({
          campaignId: current.campaign.campaign_id,
          sliceId,
          revision,
          previousPacketSha256: slice.packet_sha256,
          sourceUnitIds: scopeSlice.source_unit_refs,
        }),
      ),
      "utf8",
    );
    const prompt = authoringPrompt({
      campaignRoot: current.root,
      integrationWorktree: runtime.integrationWorktree,
      sliceId,
      scopeSlice,
      attempt: runAttempt,
      errors,
    });
    let result: CodexExecResult;
    try {
      result = await runTrackedWorker({
        runtime,
        sliceId,
        kind: "authoring",
        profile,
        cwd: runtime.integrationWorktree,
        prompt,
        outputSchemaFile: runtimeFiles.schema,
        outputLastMessageFile: runtimeFiles.output,
      });
      if (result.interrupted) throw new CampaignWorkerInterruptedError();
      const output = parseStrictJson(
        await readFile(runtimeFiles.output, "utf8"),
      );
      await writeFile(runtimeFiles.packet, canonicalJson(output), "utf8");
      try {
        await runtime.queue.run(async () => {
          await applyCampaignPacketV6(
            runtime.projectRoot,
            runtime.campaignPath,
            sliceId,
            repositoryRelative(runtime.projectRoot, runtimeFiles.packet),
            runtime.lock,
          );
          await preflightCampaignPacketV6(
            runtime.projectRoot,
            runtime.campaignPath,
            sliceId,
            runtime.lock,
          );
        });
      } catch (error) {
        throw new Error(
          `packet_structured_or_preflight_failed:${errorText(error)}`,
        );
      }
      return "authored";
    } catch (error) {
      if (error instanceof CampaignWorkerInterruptedError) throw error;
      const message = errorText(error);
      errors.push(message);
      await queuedMutation(
        runtime,
        "packet_authoring_repair_required",
        async (_root, campaign) => {
          const target = campaign.slices[sliceId];
          transitionSliceStatusV6(target, "packet_pending");
          target.last_error_code = boundedCode(message);
          campaign.campaign_status = "authoring";
          return campaign;
        },
      );
    } finally {
      await Promise.all([
        rm(runtimeFiles.schema, { force: true }),
        rm(runtimeFiles.output, { force: true }),
        rm(runtimeFiles.packet, { force: true }),
      ]);
    }
  }
  if (capacityEligible(errors)) {
    await assertWorkerDispatch(runtime);
    const revised = await reviseScopeForCapacityV6(
      runtime,
      sliceId,
      profile,
      errors,
    );
    if (revised) return "scope_revised";
  }
  await queuedMutation(
    runtime,
    "packet_authoring_attempt_limit_exceeded",
    async (_root, campaign) => {
      transitionSliceStatusV6(campaign.slices[sliceId], "packet_pending");
      campaign.slices[sliceId].last_error_code =
        "packet_authoring_attempt_limit_exceeded";
      campaign.campaign_status = "blocked";
      campaign.block_reason = "packet_authoring_attempt_limit_exceeded";
      return campaign;
    },
  );
  throw new Error(
    `packet_authoring_attempt_limit_exceeded:${sliceId}:${errors.at(-1) ?? "unknown"}`,
  );
}

async function reviseScopeForCapacityV6(
  runtime: CampaignWorkerRuntimeV6,
  sliceId: string,
  profile: ModelProfile,
  errors: string[],
): Promise<boolean> {
  const loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  if (
    Object.values(loaded.campaign.slices).some(
      (slice) => slice.attempt_count.execution > 0,
    )
  )
    throw new Error("scope_graph_frozen_after_first_execution_worker");
  const currentScope = parseCurrentScopeV6(
    await readFile(path.join(loaded.root, "scope-fit.json"), "utf8"),
  );
  const files = authoringRuntimeFiles(
    runtime.projectRoot,
    loaded.campaign.campaign_id,
    sliceId,
    0,
    4,
  );
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["scope_json", "coverage_json"],
    properties: {
      scope_json: { type: "string", minLength: 2 },
      coverage_json: { type: "string", minLength: 2 },
    },
  };
  await mkdir(path.dirname(files.schema), { recursive: true });
  await writeFile(files.schema, canonicalJson(schema), "utf8");
  const prompt = `The maximal Packet for ${sliceId} failed after one initial and two repair attempts with capacity evidence:\n${errors
    .map((item) => `- ${item}`)
    .join(
      "\n",
    )}\nRead ${path.join(loaded.root, "scope-fit.json")} and ${path.join(loaded.root, "source-coverage.json")}. Return a revised complete Scope Fit V4 and Source Coverage V2 as JSON strings. Keep existing SFC ids and stable_key values, narrow only the affected SFC as required, append new never-renumbered SFC ids, preserve every Source Unit and Context Resolution, and use authoring_capacity_exceeded with factual evidence. Do not edit product code, Context, Packets, or Campaign state. Do not start subagents or invoke any Long-Task Workflow command.`;
  try {
    await assertWorkerDispatch(runtime);
    const result = await runTrackedWorker({
      runtime,
      sliceId,
      kind: "authoring",
      profile,
      cwd: runtime.integrationWorktree,
      prompt,
      outputSchemaFile: files.schema,
      outputLastMessageFile: files.output,
    });
    if (result.interrupted) throw new CampaignWorkerInterruptedError();
    const parsed = parseStrictJson(await readFile(files.output, "utf8")) as {
      scope_json?: unknown;
      coverage_json?: unknown;
    };
    if (
      typeof parsed.scope_json !== "string" ||
      typeof parsed.coverage_json !== "string"
    )
      return false;
    const nextScope = parseCurrentScopeV6(parsed.scope_json);
    parseStrictJson(parsed.coverage_json);
    assertCapacityRevision(currentScope, nextScope, sliceId, errors);
    await writeFile(files.packet, parsed.scope_json, "utf8");
    const coverageFile = `${files.packet}.coverage.json`;
    await writeFile(coverageFile, parsed.coverage_json, "utf8");
    try {
      await runtime.queue.run(() =>
        applyCampaignScopeV6(
          runtime.projectRoot,
          runtime.campaignPath,
          repositoryRelative(runtime.projectRoot, files.packet),
          repositoryRelative(runtime.projectRoot, coverageFile),
          runtime.lock,
        ),
      );
    } finally {
      await rm(coverageFile, { force: true });
    }
    return true;
  } finally {
    await Promise.all([
      rm(files.schema, { force: true }),
      rm(files.output, { force: true }),
      rm(files.packet, { force: true }),
    ]);
  }
}

async function runTrackedWorker(options: {
  runtime: CampaignWorkerRuntimeV6;
  sliceId?: string;
  kind: "authoring" | "execution" | "repair";
  profile: ModelProfile;
  cwd: string;
  prompt: string;
  outputSchemaFile?: string;
  outputLastMessageFile?: string;
}): Promise<CodexExecResult> {
  await assertWorkerDispatch(options.runtime);
  const runId = randomUUID();
  const loaded = await loadCampaignStoreV6(
    options.runtime.projectRoot,
    options.runtime.campaignPath,
  );
  const campaign = loaded.campaign;
  const attempt =
    options.kind === "repair"
      ? campaign.repair.attempt_count + 1
      : campaign.slices[options.sliceId!]!.attempt_count[
          options.kind === "authoring" ? "authoring" : "execution"
        ] + 1;
  const run: CampaignWorkerRunV6 = {
    run_id: runId,
    kind: options.kind,
    attempt,
    run_generation: campaign.run_generation,
    pid: null,
    process_start_identity: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    profile: options.profile,
    cwd: path.resolve(options.cwd),
    prompt_sha256: sha256Hex(options.prompt),
    status: "starting",
    exit_code: null,
  };
  await queuedMutation(
    options.runtime,
    `${options.kind}_worker_starting`,
    async (_root, value) => {
      if (options.kind === "repair") {
        value.repair.attempt_count += 1;
        value.repair.current_worker_run = run;
        value.repair.status = "running";
      } else {
        const slice = value.slices[options.sliceId!];
        slice.attempt_count[
          options.kind === "authoring" ? "authoring" : "execution"
        ] += 1;
        slice.current_worker_run = run;
        if (options.kind === "authoring")
          transitionSliceStatusV6(slice, "packet_pending");
        else {
          if (
            slice.status === "needs_work" ||
            slice.status === "needs_attention" ||
            slice.status === "interrupted"
          )
            transitionSliceStatusV6(slice, "scheduled");
          transitionSliceStatusV6(slice, "worker_running");
        }
      }
      return value;
    },
  );
  const argv = buildCodexExecArgv({
    kind: options.kind,
    cwd: options.cwd,
    profile: options.profile,
    outputSchemaFile: options.outputSchemaFile,
    outputLastMessageFile: options.outputLastMessageFile,
  });
  const stderrFile = path.join(
    options.runtime.projectRoot,
    "tmp",
    "ty-context",
    "composite-runtime",
    campaign.campaign_id,
    `${runId}.stderr.log`,
  );
  let result: CodexExecResult;
  try {
    await assertWorkerDispatch(options.runtime);
    options.runtime.metrics?.increment("worker_attempt_count");
    const invoke = () =>
      runCodexExec({
        runId,
        executable: options.runtime.codexExecutable,
        args: argv,
        cwd: options.cwd,
        prompt: options.prompt,
        timeoutMs: campaign.campaign_policy.worker_timeout_ms,
        gracefulTerminationMs:
          campaign.campaign_policy.worker_termination_grace_ms,
        stderrFile,
        signal: options.runtime.signal,
        onSpawn: async (pid, processStartIdentity) => {
          await queuedMutation(
            options.runtime,
            `${options.kind}_worker_running`,
            async (_root, value) => {
              const current =
                options.kind === "repair"
                  ? value.repair.current_worker_run
                  : value.slices[options.sliceId!].current_worker_run;
              if (!current || current.run_id !== runId)
                throw new Error("campaign_worker_run_identity_changed");
              current.pid = pid;
              current.process_start_identity = processStartIdentity;
              current.status = "running";
              return value;
            },
          );
          await assertWorkerDispatch(options.runtime);
        },
      });
    result = options.runtime.metrics
      ? await options.runtime.metrics.measure("worker_wait_wall_ms", invoke)
      : await invoke();
  } catch (error) {
    await finishTrackedRun(
      options,
      runId,
      null,
      error instanceof CampaignWorkerInterruptedError,
    );
    throw error;
  }
  await finishTrackedRun(options, runId, result.exit_code, result.interrupted);
  await assertWorkerDispatch(options.runtime);
  return result;
}

async function finishTrackedRun(
  options: {
    runtime: CampaignWorkerRuntimeV6;
    sliceId?: string;
    kind: "authoring" | "execution" | "repair";
  },
  runId: string,
  exitCode: number | null,
  interrupted: boolean,
): Promise<void> {
  await queuedMutation(
    options.runtime,
    `${options.kind}_worker_${interrupted ? "interrupted" : "exited"}`,
    async (_root, value) => {
      const current =
        options.kind === "repair"
          ? value.repair.current_worker_run
          : value.slices[options.sliceId!].current_worker_run;
      if (!current || current.run_id !== runId)
        throw new Error("campaign_worker_run_identity_changed");
      current.status = interrupted ? "interrupted" : "exited";
      current.exit_code = exitCode;
      current.completed_at = new Date().toISOString();
      if (interrupted) {
        if (options.kind === "repair") value.repair.status = "interrupted";
        else
          transitionSliceStatusV6(
            value.slices[options.sliceId!],
            "interrupted",
          );
      }
      return value;
    },
  );
}

async function queuedMutation(
  runtime: CampaignWorkerRuntimeV6,
  event: string,
  mutate: (root: string, campaign: CampaignV6) => Promise<CampaignV6>,
): Promise<CampaignV6> {
  return runtime.queue.run(() =>
    mutateCampaignV6(
      runtime.projectRoot,
      runtime.campaignPath,
      event,
      async (root, campaign) => mutate(root, campaign),
      runtime.lock,
    ),
  );
}

function authoringPrompt(options: {
  campaignRoot: string;
  integrationWorktree: string;
  sliceId: string;
  scopeSlice: unknown;
  attempt: number;
  errors: string[];
}): string {
  return `Author CompositeAuthoringPacketV3 for ${options.sliceId}. This is bounded read-only Packet Authoring Worker attempt ${options.attempt}; product implementation must not change. Read immutable source plan ${path.join(options.campaignRoot, "source-plan.md")}, Scope Fit ${path.join(options.campaignRoot, "scope-fit.json")}, Source Coverage ${path.join(options.campaignRoot, "source-coverage.json")}, current Context and code in ${options.integrationWorktree}. Preserve every Source Unit -> Requirement -> PI Obligation -> AC -> Verification Spec mapping and every Contract V3 field. Slice: ${canonicalValueJson(options.scopeSlice)}${
    options.errors.length
      ? `\nRepair all prior structured-output and preflight errors without dropping scope:\n${options.errors.map((item) => `- ${item}`).join("\n")}`
      : ""
  }\nDo not edit files, start subagents, invoke /prepare-composite-long-task or /composite-long-task-workflow, call composite-campaign run, or claim acceptance. Return only the schema-conforming Packet.`;
}

function executionPrompt(options: {
  campaign: CampaignV6;
  sliceId: string;
  waveId: string;
  worktree: string;
  baseCommit: string;
  packetRevisionPath: string;
  contractWorkdir: string;
  changeEnvelope: ChangeEnvelopeV1;
  changeEnvelopePath: string;
  profile: ModelProfile;
  findings: unknown[];
  repairAttempt: boolean;
}): string {
  const slice = options.campaign.slices[options.sliceId];
  const authorities = Object.values(LONG_TASK_SOURCE_FILES).map((file) =>
    path.join(options.contractWorkdir, file),
  );
  return `Composite Campaign V6 bounded SFC Exec Worker${
    options.repairAttempt ? " repair attempt" : " initial attempt"
  }.

Campaign ID: ${options.campaign.campaign_id}
SFC ID: ${options.sliceId}
Wave ID: ${options.waveId}
Frozen Packet: ${path.join(options.packetRevisionPath, "authoring-packet.json")}
Frozen Packet SHA-256: ${slice.packet_sha256}
Contract V3 authorities: ${authorities.join(", ")}
Change Envelope: ${options.changeEnvelopePath}
Change Envelope SHA-256: ${options.changeEnvelope.envelope_sha256}
Worktree: ${options.worktree}
Wave base commit: ${options.baseCommit}
Execution profile: ${options.profile.model} / ${options.profile.effort}
Contract workdir: ${options.contractWorkdir}
Forbidden paths: project_context/**, .codex/composite-long-task/**, all Scope Fit, Packet and Campaign state paths.

Required complete loop:
1. Verify cwd, detached worktree, base, Packet, three authorities and Change Envelope identities.
2. Run ty-context composite-long-task compile ${quote(options.contractWorkdir)} --campaign-id ${quote(options.campaign.campaign_id)} --slice-id ${quote(options.sliceId)}.
3. Implement only this SFC inside the frozen Change Envelope; run project-focused verification and repair every machine finding.
4. Stage only intended implementation changes, create at least one clean commit, and keep HEAD descended from the frozen wave base.
5. Run the Contract V3 Slice final-gate after the commit. If it reports needs_work, repair, recommit and rerun until accepted or this Worker exits.
6. After a fresh accepted final-gate, modify nothing further. Scheduler-side Gate/Receipt checks, not this Worker text or exit code, decide acceptance.

Do not modify Scope Fit, Packet, Context, Campaign state or Integration; do not switch branches, merge, create worktrees, start subagents, invoke /prepare-composite-long-task, invoke composite-campaign run, lower proof, or claim Campaign completion.${
    options.findings.length
      ? `\nPreserve all existing legal changes and repair these current machine findings:\n${canonicalValueJson(options.findings).slice(0, 20_000)}`
      : ""
  }`;
}

async function readMachineResult(
  contractWorkdir: string,
): Promise<{ workflow_status: string; findings: unknown[] }> {
  for (const file of ["final-result.json", "current-status.json"]) {
    try {
      const row = parseStrictJson(
        await readFile(path.join(contractWorkdir, file), "utf8"),
      ) as { workflow_status?: unknown; findings?: unknown };
      if (typeof row.workflow_status === "string")
        return {
          workflow_status: row.workflow_status,
          findings: Array.isArray(row.findings) ? row.findings : [],
        };
    } catch {}
  }
  return {
    workflow_status: "needs_work",
    findings: [
      finding(
        "final_result_missing",
        "Complete implementation, commit cleanly, and run a fresh Contract V3 final-gate.",
      ),
    ],
  };
}

function authoringRuntimeFiles(
  projectRoot: string,
  campaignId: string,
  sliceId: string,
  revision: number,
  attempt: number,
): { schema: string; output: string; packet: string } {
  const root = path.join(
    path.resolve(projectRoot),
    "tmp",
    "ty-context",
    "composite-runtime",
    campaignId,
    "authoring",
  );
  const key = `${sliceId}-r${revision}-a${attempt}-${randomUUID()}`;
  return {
    schema: path.join(root, `${key}.schema.json`),
    output: path.join(root, `${key}.output.json`),
    packet: path.join(root, `${key}.packet.json`),
  };
}

async function boundedMap<T, R>(
  values: T[],
  limit: number,
  operation: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, values.length) },
    async () => {
      while (true) {
        const index = cursor++;
        if (index >= values.length) return;
        results[index] = await operation(values[index]);
      }
    },
  );
  const settled = await Promise.allSettled(workers);
  const failures = settled.filter(
    (item): item is PromiseRejectedResult => item.status === "rejected",
  );
  if (failures.length)
    throw new AggregateError(
      failures.map((item) => item.reason),
      "campaign_bounded_worker_group_failed",
    );
  return results;
}

function capacityEligible(errors: string[]): boolean {
  return (
    errors.length >= 3 &&
    errors.some((value) =>
      /truncat|unexpected end|invalid json|json syntax|no larger|too large|file.limit|source.unit.*(?:missing|mapping)|mapping.*(?:missing|incomplete)|structured.output/iu.test(
        value,
      ),
    )
  );
}

function assertCapacityRevision(
  previous: ScopeFitResultV4,
  next: ScopeFitResultV4,
  sliceId: string,
  errors: string[],
): void {
  const prior = previous.slices.find((slice) => slice.slice_id === sliceId);
  if (!prior) throw new Error(`capacity_revision_slice_missing:${sliceId}`);
  const selected = new Set(prior.source_unit_refs);
  const owners = next.slices.filter((slice) =>
    slice.source_unit_refs.some((unit) => selected.has(unit)),
  );
  if (owners.length < 2)
    throw new Error(`capacity_revision_did_not_split:${sliceId}`);
  const observed = observedCapacityKinds(errors);
  for (const owner of owners) {
    if (!owner.separation_reasons.includes("authoring_capacity_exceeded"))
      throw new Error(`capacity_revision_reason_missing:${owner.slice_id}`);
    const evidence = owner.authoring_capacity_evidence ?? [];
    if (!evidence.some((row) => observed.has(row.kind)))
      throw new Error(`capacity_revision_evidence_unproven:${owner.slice_id}`);
  }
  const previousOwners = new Map(
    previous.slices.flatMap((slice) =>
      slice.source_unit_refs.map((unit) => [unit, slice.slice_id] as const),
    ),
  );
  const nextOwners = new Map(
    next.slices.flatMap((slice) =>
      slice.source_unit_refs.map((unit) => [unit, slice.slice_id] as const),
    ),
  );
  for (const [unit, owner] of previousOwners)
    if (!selected.has(unit) && nextOwners.get(unit) !== owner)
      throw new Error(`capacity_revision_unrelated_unit_moved:${unit}`);
}

function observedCapacityKinds(errors: string[]): Set<string> {
  const values = new Set<string>();
  const joined = errors.join("\n");
  if (/truncat|unexpected end/iu.test(joined)) values.add("output_truncated");
  if (/invalid json|json syntax|structured.output/iu.test(joined))
    values.add("structured_output_failed");
  if (/no larger|too large|file.limit/iu.test(joined))
    values.add("file_limit_exceeded");
  if (
    /source.unit.*(?:missing|mapping)|mapping.*(?:missing|incomplete)/iu.test(
      joined,
    )
  )
    values.add("incomplete_unit_mapping");
  if (errors.length >= 3) values.add("two_repairs_failed");
  return values;
}

function requireProfile(
  profile: ModelProfile | null,
  label: string,
): ModelProfile {
  if (!profile || profile.model === "unknown" || profile.effort === "unknown")
    throw new Error(`${label}_required`);
  return profile;
}
async function assertWorkerDispatch(
  runtime: CampaignWorkerRuntimeV6,
): Promise<void> {
  await assertCampaignDispatchAllowedV6({
    projectRoot: runtime.projectRoot,
    campaignPath: runtime.campaignPath,
    campaignRoot: runtime.campaignRoot,
    lock: runtime.lock,
    expectedRunGeneration: runtime.runGeneration,
    signal: runtime.signal,
  });
}
function repositoryRelative(root: string, file: string): string {
  return path
    .relative(path.resolve(root), path.resolve(file))
    .split(path.sep)
    .join("/");
}
function quote(value: string): string {
  return JSON.stringify(value);
}
function finding(category: string, nextAction: string): Record<string, string> {
  return { category, next_action: nextAction };
}
function boundedError(findings: unknown[]): string {
  return boundedCode(canonicalValueJson(findings));
}
function boundedCode(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").slice(0, 500) || "worker_needs_work";
}
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
