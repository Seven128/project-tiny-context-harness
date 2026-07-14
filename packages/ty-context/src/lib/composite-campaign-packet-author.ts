import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AmbiguousThreadLaunchError } from "./codex-app-server-client.js";
import type {
  CodexAppServerClient,
  CodexThread,
  JsonValue,
  TurnCompletion,
} from "./codex-app-server-protocol.js";
import {
  canonicalJson,
  canonicalValueJson,
  parseStrictJson,
} from "./composite-campaign-codec.js";
import { CampaignMutationQueue } from "./composite-campaign-mutation-queue.js";
import { compositeAuthoringPacketOutputSchemaV3 } from "./composite-campaign-packet-schema.js";
import {
  bindThreadIdentityV5,
  bindThreadRoutingV5,
  completeThreadTurnV5,
  markPacketValidationV5,
  recordAuthoringTurnV5,
  transitionThreadPhaseV5,
} from "./composite-campaign-thread-state.js";
import {
  applyCampaignPacketV4,
  applyCampaignScopeV4,
  preflightCampaignPacketV4,
} from "./composite-campaign-v4.js";
import {
  loadCampaignV5,
  updateSliceThreadV5,
} from "./composite-campaign-v5.js";
import { routeCodexModel, type ModelProfile } from "./codex-model-router.js";
import type { CodexModelCatalog } from "./codex-model-catalog.js";
import { parseScopeFitResultV4 } from "./scope-fit-v4.js";

export interface PacketAuthoringInput {
  client: CodexAppServerClient;
  projectRoot: string;
  campaignPath: string;
  sliceIds: string[];
  authoringCwd: string;
  controllerProfile: Partial<ModelProfile> | null;
  catalog: CodexModelCatalog;
}

export interface PacketAuthoringResult {
  authored_slice_ids: string[];
  scope_revised: boolean;
}

export async function authorCampaignPacketsV5(
  input: PacketAuthoringInput,
): Promise<PacketAuthoringResult> {
  const queue = new CampaignMutationQueue();
  const settled = await Promise.allSettled(
    input.sliceIds.map((sliceId) => authorSlice(input, sliceId, queue)),
  );
  const rejected = settled.filter(
    (item): item is PromiseRejectedResult => item.status === "rejected",
  );
  if (rejected.length)
    throw new AggregateError(
      rejected.map((item) => item.reason),
      "campaign_packet_authoring_failed_after_all_slices_settled",
    );
  const results = settled.map(
    (item) =>
      (item as PromiseFulfilledResult<"authored" | "scope_revised">).value,
  );
  return {
    authored_slice_ids: input.sliceIds.filter(
      (_id, index) => results[index] === "authored",
    ),
    scope_revised: results.includes("scope_revised"),
  };
}

async function authorSlice(
  input: PacketAuthoringInput,
  sliceId: string,
  queue: CampaignMutationQueue,
): Promise<"authored" | "scope_revised"> {
  let loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
  let slice = loaded.campaign.slices[sliceId];
  if (!slice) throw new Error(`campaign_slice_unknown:${sliceId}`);
  if (slice.status === "packet_ready") return "authored";
  const decision = routeCodexModel(input.controllerProfile, input.catalog);
  let thread: CodexThread;
  if (!slice.thread.thread_id) {
    if (slice.thread.launch_token) throw new AmbiguousThreadLaunchError();
    const intent = randomUUID();
    await queue.run(() =>
      updateSliceThreadV5(
        input.projectRoot,
        input.campaignPath,
        sliceId,
        "thread_launch_intent",
        (state) => {
          const next = bindThreadRoutingV5(state, decision);
          next.launch_token = intent;
          return next;
        },
      ),
    );
    try {
      thread = await input.client.startThread({
        cwd: input.authoringCwd,
        model: known(decision.authoring_profile)
          ? decision.authoring_profile.model
          : undefined,
      });
    } catch (error) {
      await queue.run(() =>
        updateSliceThreadV5(
          input.projectRoot,
          input.campaignPath,
          sliceId,
          "thread_launch_failed",
          (state) => failed(state, error),
        ),
      );
      throw error;
    }
    await queue.run(() =>
      updateSliceThreadV5(
        input.projectRoot,
        input.campaignPath,
        sliceId,
        "thread_started",
        (state) =>
          bindThreadIdentityV5(state, thread.id, thread.sessionId || thread.id),
      ),
    );
  } else {
    thread = await input.client.resumeThread(slice.thread.thread_id);
    if (
      !slice.thread.authoring_profile ||
      !slice.thread.execution_profile ||
      !slice.thread.routing_reason
    )
      await queue.run(() =>
        updateSliceThreadV5(
          input.projectRoot,
          input.campaignPath,
          sliceId,
          "thread_routing_recovered",
          (state) => bindThreadRoutingV5(state, decision),
        ),
      );
  }
  const errors: string[] = [];
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
    slice = loaded.campaign.slices[sliceId];
    const scope = parseScopeFitResultV4(
      await readFile(path.join(loaded.root, "scope-fit.json"), "utf8"),
    );
    const scopeSlice = scope.slices.find((item) => item.slice_id === sliceId);
    if (!scopeSlice) throw new Error(`scope_slice_missing:${sliceId}`);
    const revision = (slice.packet_revision ?? 0) + 1;
    const previous = slice.packet_sha256;
    let completion: TurnCompletion;
    try {
      completion = await authorTurn(
        input,
        sliceId,
        thread,
        prompt(input, loaded.root, sliceId, scopeSlice, attempt, errors.at(-1)),
        compositeAuthoringPacketOutputSchemaV3({
          campaignId: loaded.campaign.campaign_id,
          sliceId,
          revision,
          previousPacketSha256: previous,
          sourceUnitIds: scopeSlice.source_unit_refs,
        }),
        queue,
        slice.thread.active_turn_id,
      );
      if (completion.status !== "completed" || !completion.outputText)
        throw new Error(`authoring_turn_${completion.status}`);
      await queue.run(() =>
        updateSliceThreadV5(
          input.projectRoot,
          input.campaignPath,
          sliceId,
          "packet_validation_started",
          markPacketValidationV5,
        ),
      );
      const packet = parseStrictJson(completion.outputText);
      const file = await writeRuntimeJson(
        input.projectRoot,
        loaded.campaign.campaign_id,
        `${sliceId}-packet-${revision}.json`,
        packet,
      );
      try {
        await queue.run(async () => {
          await applyCampaignPacketV4(
            input.projectRoot,
            input.campaignPath,
            sliceId,
            file.relative,
          );
          await preflightCampaignPacketV4(
            input.projectRoot,
            input.campaignPath,
            sliceId,
          );
        });
      } finally {
        await rm(file.absolute, { force: true });
      }
      return "authored";
    } catch (error) {
      const message = errorMessage(error);
      errors.push(message);
      await queue.run(() =>
        updateSliceThreadV5(
          input.projectRoot,
          input.campaignPath,
          sliceId,
          "packet_authoring_repair_required",
          (state) => authoringRetry(state, message),
        ),
      );
      if (attempt < 2) continue;
    }
  }
  if (capacityEligible(errors)) {
    const revised = await reviseScopeForCapacity(
      input,
      sliceId,
      thread,
      queue,
      errors,
    );
    if (revised) return "scope_revised";
  }
  await queue.run(() =>
    updateSliceThreadV5(
      input.projectRoot,
      input.campaignPath,
      sliceId,
      "packet_authoring_failed",
      (state) =>
        failed(state, new Error(errors.at(-1) ?? "packet_authoring_failed")),
    ),
  );
  throw new Error(
    `packet_authoring_failed:${sliceId}:${errors.at(-1) ?? "unknown"}`,
  );
}

async function authorTurn(
  input: PacketAuthoringInput,
  sliceId: string,
  thread: CodexThread,
  message: string,
  outputSchema: Parameters<
    CodexAppServerClient["startTurn"]
  >[0]["outputSchema"],
  queue: CampaignMutationQueue,
  activeTurnId: string | null,
): Promise<TurnCompletion> {
  if (activeTurnId) {
    const current = await input.client.readThread(thread.id);
    const turn = current.turns.find((item) => item.id === activeTurnId);
    if (!turn) throw new Error(`active_authoring_turn_missing:${activeTurnId}`);
    if (turn.status !== "inProgress")
      return {
        threadId: thread.id,
        turn,
        status: turn.status,
        outputText: finalText(turn.items),
      };
    return input.client.waitForTurn(thread.id, turn.id);
  }
  const campaign = (await loadCampaignV5(input.projectRoot, input.campaignPath))
    .campaign;
  const profile = campaign.slices[sliceId].thread.authoring_profile;
  const turn = await input.client.startTurn({
    threadId: thread.id,
    input: message,
    cwd: input.authoringCwd,
    ...(profile && known(profile)
      ? { model: profile.model, effort: profile.effort }
      : {}),
    sandboxPolicy: { type: "readOnly", networkAccess: false },
    outputSchema,
  });
  await queue.run(() =>
    updateSliceThreadV5(
      input.projectRoot,
      input.campaignPath,
      sliceId,
      "authoring_turn_started",
      (state) => recordAuthoringTurnV5(state, turn.id),
    ),
  );
  return input.client.waitForTurn(thread.id, turn.id);
}

async function reviseScopeForCapacity(
  input: PacketAuthoringInput,
  sliceId: string,
  thread: CodexThread,
  queue: CampaignMutationQueue,
  errors: string[],
): Promise<boolean> {
  const loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
  if (
    Object.values(loaded.campaign.slices).some(
      (slice) => slice.thread.goal.status !== "not_set",
    )
  )
    throw new Error("scope_graph_frozen_after_goal");
  const currentScope = parseScopeFitResultV4(
    await readFile(path.join(loaded.root, "scope-fit.json"), "utf8"),
  );
  const profile = loaded.campaign.slices[sliceId].thread.authoring_profile;
  const schema: JsonValue = {
    type: "object",
    additionalProperties: false,
    required: ["scope_json", "coverage_json"],
    properties: {
      scope_json: { type: "string", minLength: 2 },
      coverage_json: { type: "string", minLength: 2 },
    },
  };
  const message = `The maximal Packet for ${sliceId} failed after the initial attempt and two repair turns with capacity evidence:\n${errors.map((item) => `- ${item}`).join("\n")}\nRead ${path.join(loaded.root, "scope-fit.json")} and ${path.join(loaded.root, "source-coverage.json")}. Return a revised full Scope Fit V4 and source coverage as JSON strings. Keep every existing SFC id and stable_key, narrow the affected SFC only as needed, append new never-renumbered SFC ids, preserve all Source Units, and use authoring_capacity_exceeded with factual evidence. Do not set a Goal or edit product code.`;
  const turn = await input.client.startTurn({
    threadId: thread.id,
    input: message,
    cwd: input.authoringCwd,
    ...(profile && known(profile)
      ? { model: profile.model, effort: profile.effort }
      : {}),
    sandboxPolicy: { type: "readOnly", networkAccess: false },
    outputSchema: schema,
  });
  await queue.run(() =>
    updateSliceThreadV5(
      input.projectRoot,
      input.campaignPath,
      sliceId,
      "capacity_revision_turn_started",
      (state) => recordAuthoringTurnV5(state, turn.id),
    ),
  );
  const completed = await input.client.waitForTurn(thread.id, turn.id);
  await queue.run(() =>
    updateSliceThreadV5(
      input.projectRoot,
      input.campaignPath,
      sliceId,
      "capacity_revision_turn_completed",
      (state) =>
        completeThreadTurnV5(state, terminalTurnStatus(completed.status)),
    ),
  );
  if (completed.status !== "completed" || !completed.outputText) return false;
  const result = parseStrictJson(completed.outputText) as {
    scope_json?: unknown;
    coverage_json?: unknown;
  };
  if (
    typeof result.scope_json !== "string" ||
    typeof result.coverage_json !== "string"
  )
    return false;
  const revisedScope = parseScopeFitResultV4(result.scope_json);
  parseStrictJson(result.coverage_json);
  assertCapacityRevision(currentScope, revisedScope, sliceId, errors);
  const dir = path.join(
    input.projectRoot,
    "tmp",
    "ty-context",
    "campaign-runtime",
    loaded.campaign.campaign_id,
  );
  await mkdir(dir, { recursive: true });
  const scopeFile = path.join(dir, `${sliceId}-capacity-scope.json`);
  const coverageFile = path.join(dir, `${sliceId}-capacity-coverage.json`);
  await writeFile(scopeFile, result.scope_json, { flag: "wx" });
  await writeFile(coverageFile, result.coverage_json, { flag: "wx" });
  try {
    await queue.run(() =>
      applyCampaignScopeV4(
        input.projectRoot,
        input.campaignPath,
        repositoryRelative(input.projectRoot, scopeFile),
        repositoryRelative(input.projectRoot, coverageFile),
      ),
    );
  } finally {
    await Promise.all([
      rm(scopeFile, { force: true }),
      rm(coverageFile, { force: true }),
    ]);
  }
  return true;
}

function prompt(
  input: PacketAuthoringInput,
  root: string,
  sliceId: string,
  scopeSlice: unknown,
  attempt: number,
  error?: string,
): string {
  return `Author CompositeAuthoringPacketV3 for ${sliceId}. This is read-only Authoring Turn ${attempt + 1}; no Goal exists and product implementation must not change. Read immutable source plan ${path.join(root, "source-plan.md")}, Scope Fit ${path.join(root, "scope-fit.json")}, source coverage ${path.join(root, "source-coverage.json")}, current Context and code in ${input.authoringCwd}. Preserve complete Source Unit -> Requirement -> PI Obligation -> AC -> Verification Spec mappings and all Contract V3 fields. Slice: ${canonicalValueJson(scopeSlice)}${error ? `\nRepair the previous structured/preflight failure without dropping scope: ${error}` : ""}`;
}
function authoringRetry(
  state: Parameters<typeof transitionThreadPhaseV5>[0],
  message: string,
) {
  let next = state.active_turn_id
    ? completeThreadTurnV5(state, "failed")
    : state;
  try {
    next = transitionThreadPhaseV5(next, "authoring");
  } catch {
    next = { ...next, phase: "authoring" };
  }
  next.active_turn_id = null;
  next.last_turn_status = "completed";
  next.last_error_code = boundedCode(message);
  return next;
}
function failed(
  state: Parameters<typeof transitionThreadPhaseV5>[0],
  error: unknown,
) {
  const settled = state.active_turn_id
    ? completeThreadTurnV5(state, "failed")
    : state;
  const next = {
    ...settled,
    phase: "failed" as const,
    active_turn_id: null,
    last_turn_status: "failed" as const,
    last_error_code: boundedCode(errorMessage(error)),
  };
  return next;
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
function known(profile: ModelProfile): boolean {
  return profile.model !== "unknown" && profile.effort !== "unknown";
}
function finalText(items: Array<Record<string, unknown>>): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.type === "agentMessage" && typeof item.text === "string")
      return item.text;
  }
  return null;
}
async function writeRuntimeJson(
  root: string,
  campaignId: string,
  name: string,
  value: unknown,
): Promise<{ absolute: string; relative: string }> {
  const dir = path.join(
    root,
    "tmp",
    "ty-context",
    "campaign-runtime",
    campaignId,
  );
  await mkdir(dir, { recursive: true });
  const absolute = path.join(dir, `${randomUUID()}-${name}`);
  await writeFile(absolute, canonicalJson(value), { flag: "wx" });
  return { absolute, relative: repositoryRelative(root, absolute) };
}
function repositoryRelative(root: string, file: string): string {
  return path
    .relative(path.resolve(root), path.resolve(file))
    .split(path.sep)
    .join("/");
}
function terminalTurnStatus(
  status: string,
): "completed" | "interrupted" | "failed" | "system_error" {
  return status === "completed" ||
    status === "interrupted" ||
    status === "failed"
    ? status
    : "system_error";
}
function assertCapacityRevision(
  previous: ReturnType<typeof parseScopeFitResultV4>,
  next: ReturnType<typeof parseScopeFitResultV4>,
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
function observedCapacityKinds(
  errors: string[],
): Set<
  | "output_truncated"
  | "structured_output_failed"
  | "two_repairs_failed"
  | "file_limit_exceeded"
  | "incomplete_unit_mapping"
> {
  const values = new Set<
    | "output_truncated"
    | "structured_output_failed"
    | "two_repairs_failed"
    | "file_limit_exceeded"
    | "incomplete_unit_mapping"
  >();
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
  if (
    errors.length >= 3 &&
    /scope|range|undefined|too (?:broad|large)|capacity/iu.test(joined)
  )
    values.add("two_repairs_failed");
  return values;
}
function boundedCode(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").slice(0, 500);
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
