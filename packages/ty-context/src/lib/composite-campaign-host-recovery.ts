import { readFile } from "node:fs/promises";
import path from "node:path";
import { AmbiguousThreadLaunchError } from "./codex-app-server-client.js";
import type {
  CodexAppServerClient,
  CodexThread,
  CodexTurn,
} from "./codex-app-server-protocol.js";
import { sha256Hex } from "./composite-campaign-codec.js";
import { CampaignMutationQueue } from "./composite-campaign-mutation-queue.js";
import {
  readSliceGoalManifest,
  renderSliceGoalObjectiveV2,
} from "./composite-campaign-goal-manifest.js";
import {
  bindCampaignGoalV4,
  bindCampaignRepairGoalV4,
} from "./composite-campaign-orchestrator.js";
import {
  bindThreadGoalV5,
  reconcileThreadTurnV5,
  recordAuthoringTurnV5,
  recordExecutionTurnV5,
} from "./composite-campaign-thread-state.js";
import {
  loadCampaignV5,
  mutateCampaignV5,
  updateSliceThreadV5,
} from "./composite-campaign-v5.js";

export interface HostRecoveryResult {
  resumed_thread_ids: string[];
  reconciled_turn_ids: string[];
  reconciled_goal_slice_ids: string[];
  reconciled_goal_repair_ids: string[];
}

export async function recoverCampaignHostV5(
  client: CodexAppServerClient,
  projectRoot: string,
  campaignPath: string,
): Promise<HostRecoveryResult> {
  let loaded = await loadCampaignV5(projectRoot, campaignPath);
  const queue = new CampaignMutationQueue();
  const resumed: string[] = [];
  const turns: string[] = [];
  const goals: string[] = [];
  const repairGoals: string[] = [];
  for (const [sliceId, original] of Object.entries(loaded.campaign.slices).sort(
    ([left], [right]) => ascii(left, right),
  )) {
    if (!original.thread.thread_id) {
      if (original.thread.launch_token) throw new AmbiguousThreadLaunchError();
      continue;
    }
    await client.resumeThread(original.thread.thread_id);
    const server = await client.readThread(original.thread.thread_id);
    resumed.push(server.id);
    if (isSystemError(server.status))
      throw new Error(`app_server_thread_system_error:${sliceId}`);
    loaded = await loadCampaignV5(projectRoot, campaignPath);
    let slice = loaded.campaign.slices[sliceId];
    const serverGoal = await client.getGoal(server.id);
    let objective: string | null = null;
    if (serverGoal || slice.thread.goal.status !== "not_set") {
      if (!slice.wave_id)
        throw new Error(`ambiguous_goal_without_wave:${sliceId}`);
      const manifest = await readSliceGoalManifest(
        path.join(
          loaded.root,
          "waves",
          slice.wave_id,
          "goals",
          sliceId,
          "goal-manifest.json",
        ),
      );
      if (
        manifest.schema_version !== "slice-goal-manifest-v2" ||
        manifest.thread_id !== server.id
      )
        throw new Error(`goal_manifest_recovery_mismatch:${sliceId}`);
      objective = await readFile(
        path.join(manifest.contract_workdir, "goal-objective.txt"),
        "utf8",
      );
      if (objective !== renderSliceGoalObjectiveV2(manifest))
        throw new Error(`goal_objective_manifest_mismatch:${sliceId}`);
      if (serverGoal && objective !== serverGoal.objective)
        throw new Error(`goal_objective_recovery_mismatch:${sliceId}`);
      if (
        slice.thread.goal.objective_sha256 &&
        slice.thread.goal.objective_sha256 !== sha256Hex(objective)
      )
        throw new Error(`goal_hash_recovery_mismatch:${sliceId}`);
    }
    if (serverGoal && slice.thread.goal.status === "not_set") {
      const manifest = await readSliceGoalManifest(
        path.join(
          loaded.root,
          "waves",
          slice.wave_id!,
          "goals",
          sliceId,
          "goal-manifest.json",
        ),
      );
      if (manifest.schema_version !== "slice-goal-manifest-v2")
        throw new Error(`goal_manifest_recovery_mismatch:${sliceId}`);
      await queue.run(() =>
        bindCampaignGoalV4(
          projectRoot,
          campaignPath,
          sliceId,
          server.id,
          manifest.launch_token,
        ),
      );
      goals.push(sliceId);
      loaded = await loadCampaignV5(projectRoot, campaignPath);
      slice = loaded.campaign.slices[sliceId];
    } else if (!serverGoal && slice.thread.goal.status !== "not_set")
      throw new Error(`persisted_goal_missing_on_server:${sliceId}`);
    if (
      serverGoal &&
      slice.thread.goal.status === "complete" &&
      serverGoal.status !== "complete"
    )
      await client.setGoal({
        threadId: server.id,
        objective: objective!,
        status: "complete",
      });
    if (
      serverGoal?.status === "complete" &&
      slice.thread.goal.status !== "complete"
    )
      throw new Error(
        `server_goal_complete_before_local_acceptance:${sliceId}`,
      );
    if (slice.thread.active_turn_id) {
      const active = requiredTurn(sliceId, slice.thread.active_turn_id, server);
      await queue.run(() =>
        updateSliceThreadV5(
          projectRoot,
          campaignPath,
          sliceId,
          "active_turn_observed",
          (state) =>
            reconcileThreadTurnV5(state, active.id, turnStatus(active)),
        ),
      );
      turns.push(active.id);
      loaded = await loadCampaignV5(projectRoot, campaignPath);
      slice = loaded.campaign.slices[sliceId];
    }
    if (!slice.thread.active_turn_id) {
      const known = new Set([
        ...slice.thread.authoring_turn_ids,
        ...slice.thread.execution_turn_ids,
      ]);
      const unknown = server.turns.filter(
        (turn) => !known.has(turn.id) && recoverable(turn),
      );
      if (unknown.length > 1)
        throw new Error(`ambiguous_host_turn_launch:${sliceId}`);
      if (unknown.length === 1) {
        const turn = unknown[0];
        await queue.run(() =>
          updateSliceThreadV5(
            projectRoot,
            campaignPath,
            sliceId,
            "turn_launch_reconciled",
            (state) =>
              reconcileThreadTurnV5(
                state.goal.status === "not_set"
                  ? recordAuthoringTurnV5(state, turn.id)
                  : recordExecutionTurnV5(state, turn.id),
                turn.id,
                turnStatus(turn),
              ),
          ),
        );
        turns.push(turn.id);
      }
    }
  }
  loaded = await loadCampaignV5(projectRoot, campaignPath);
  for (const [repairId, original] of Object.entries(
    loaded.campaign.repair_threads,
  ).sort(([left], [right]) => ascii(left, right))) {
    if (!original.thread.thread_id) {
      if (original.thread.launch_token) throw new AmbiguousThreadLaunchError();
      continue;
    }
    const threadId = original.thread.thread_id;
    await client.resumeThread(threadId);
    const server = await client.readThread(threadId);
    resumed.push(server.id);
    if (isSystemError(server.status))
      throw new Error(`app_server_repair_thread_system_error:${repairId}`);
    loaded = await loadCampaignV5(projectRoot, campaignPath);
    let repair = loaded.campaign.repair_threads[repairId];
    const objectivePath = path.join(
      loaded.root,
      "repairs",
      repairId,
      "repair-objective.txt",
    );
    const objective = await readFile(objectivePath, "utf8");
    const disk = JSON.parse(
      await readFile(
        path.join(loaded.root, "repairs", repairId, "repair-state.json"),
        "utf8",
      ),
    ) as { goal_id?: unknown; launch_token?: unknown };
    const serverGoal = await client.getGoal(threadId);
    if (serverGoal && serverGoal.objective !== objective)
      throw new Error(`repair_goal_objective_recovery_mismatch:${repairId}`);
    if (
      repair.thread.goal.objective_sha256 &&
      repair.thread.goal.objective_sha256 !== sha256Hex(objective)
    )
      throw new Error(`repair_goal_hash_recovery_mismatch:${repairId}`);
    if (serverGoal && repair.thread.goal.status === "not_set") {
      if (typeof disk.launch_token !== "string")
        throw new Error(`repair_launch_token_missing:${repairId}`);
      await queue.run(() =>
        bindCampaignRepairGoalV4(
          projectRoot,
          campaignPath,
          repairId,
          threadId,
          disk.launch_token as string,
        ),
      );
      await queue.run(() =>
        mutateCampaignV5(
          projectRoot,
          campaignPath,
          "repair_goal_reconciled",
          async (_root, campaign) => {
            const current = campaign.repair_threads[repairId];
            current.thread = bindThreadGoalV5(
              current.thread,
              sha256Hex(objective),
              disk.launch_token as string,
            );
            return campaign;
          },
        ),
      );
      repairGoals.push(repairId);
      loaded = await loadCampaignV5(projectRoot, campaignPath);
      repair = loaded.campaign.repair_threads[repairId];
    } else if (
      !serverGoal &&
      (repair.thread.goal.status !== "not_set" || disk.goal_id)
    )
      throw new Error(`persisted_repair_goal_missing_on_server:${repairId}`);
    if (
      serverGoal &&
      repair.thread.goal.status === "complete" &&
      serverGoal.status !== "complete"
    )
      await client.setGoal({ threadId, objective, status: "complete" });
    if (
      serverGoal?.status === "complete" &&
      repair.thread.goal.status !== "complete"
    )
      throw new Error(
        `server_repair_goal_complete_before_local_acceptance:${repairId}`,
      );
    if (repair.thread.active_turn_id) {
      const active = requiredTurn(
        `repair:${repairId}`,
        repair.thread.active_turn_id,
        server,
      );
      await queue.run(() =>
        mutateCampaignV5(
          projectRoot,
          campaignPath,
          "repair_active_turn_observed",
          async (_root, campaign) => {
            const current = campaign.repair_threads[repairId];
            current.thread = reconcileThreadTurnV5(
              current.thread,
              active.id,
              turnStatus(active),
            );
            return campaign;
          },
        ),
      );
      turns.push(active.id);
      loaded = await loadCampaignV5(projectRoot, campaignPath);
      repair = loaded.campaign.repair_threads[repairId];
    }
    if (!repair.thread.active_turn_id) {
      const known = new Set(repair.thread.execution_turn_ids);
      const unknown = server.turns.filter(
        (turn) => !known.has(turn.id) && recoverable(turn),
      );
      if (unknown.length > 1)
        throw new Error(`ambiguous_host_turn_launch:repair:${repairId}`);
      if (unknown.length === 1) {
        if (repair.thread.goal.status === "not_set")
          throw new Error(`repair_turn_without_goal:${repairId}`);
        const turn = unknown[0];
        await queue.run(() =>
          mutateCampaignV5(
            projectRoot,
            campaignPath,
            "repair_turn_launch_reconciled",
            async (_root, campaign) => {
              const current = campaign.repair_threads[repairId];
              current.thread = reconcileThreadTurnV5(
                recordExecutionTurnV5(current.thread, turn.id),
                turn.id,
                turnStatus(turn),
              );
              return campaign;
            },
          ),
        );
        turns.push(turn.id);
      }
    }
  }
  return {
    resumed_thread_ids: resumed,
    reconciled_turn_ids: turns,
    reconciled_goal_slice_ids: goals,
    reconciled_goal_repair_ids: repairGoals,
  };
}

function requiredTurn(
  sliceId: string,
  turnId: string,
  thread: CodexThread,
): CodexTurn {
  const turn = thread.turns.find((item) => item.id === turnId);
  if (!turn)
    throw new Error(`persisted_active_turn_missing:${sliceId}:${turnId}`);
  return turn;
}
function turnStatus(
  turn: CodexTurn,
): "inProgress" | "completed" | "interrupted" | "failed" | "system_error" {
  return turn.status === "inProgress" ||
    turn.status === "completed" ||
    turn.status === "interrupted" ||
    turn.status === "failed"
    ? turn.status
    : "system_error";
}
function recoverable(turn: CodexTurn): boolean {
  return (
    turn.status === "inProgress" ||
    turn.status === "completed" ||
    turn.status === "interrupted" ||
    turn.status === "failed"
  );
}
function isSystemError(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === "systemError",
  );
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
