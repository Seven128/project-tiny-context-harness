import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  CodexAppServerClient,
  CodexTurn,
  TurnCompletion,
} from "./codex-app-server-protocol.js";
import { currentHead, gitStatus } from "./composite-campaign-git-baseline.js";
import type { CampaignAdvanceActionV5 } from "./composite-campaign-orchestrator.js";
import { bindCampaignRepairGoalV5 } from "./composite-campaign-orchestrator.js";
import {
  acceptThreadV5,
  bindThreadGoalV5,
  bindThreadIdentityV5,
  bindThreadRoutingV5,
  completeThreadTurnV5,
  recordExecutionTurnV5,
} from "./composite-campaign-thread-state.js";
import { emptyThreadStateV5 } from "./composite-campaign-schema-v5.js";
import { loadCampaignV5, mutateCampaignV5 } from "./composite-campaign-v5.js";
import { sha256Hex } from "./composite-campaign-codec.js";
import type { ModelRoutingDecision } from "./codex-model-router.js";

type RepairAction = Extract<
  CampaignAdvanceActionV5,
  { action: "repair_integration" }
>;
interface RepairState {
  repair_id: string;
  wave_id: string;
  worktree: string;
  base_commit: string;
  objective_path: string;
  launch_token: string;
  goal_id: string | null;
}

export async function runCampaignRepairV5(
  input: {
    client: CodexAppServerClient;
    projectRoot: string;
    campaignPath: string;
    routing: ModelRoutingDecision;
  },
  action: RepairAction,
): Promise<{ repair_id: string; head_commit: string }> {
  let loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
  let repair = loaded.campaign.repair_threads[action.repair_id];
  let fresh = false;
  if (!repair) {
    fresh = true;
    await mutateCampaignV5(
      input.projectRoot,
      input.campaignPath,
      "repair_thread_intent",
      async (_root, campaign) => {
        const thread = bindThreadRoutingV5(emptyThreadStateV5(), input.routing);
        thread.launch_token = randomUUID();
        campaign.repair_threads[action.repair_id] = {
          repair_id: action.repair_id,
          wave_id: action.wave_id,
          thread,
        };
        return campaign;
      },
    );
    loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
    repair = loaded.campaign.repair_threads[action.repair_id];
  }
  let threadId = repair.thread.thread_id;
  if (!threadId) {
    if (!fresh)
      throw new Error(`ambiguous_host_thread_launch:${action.repair_id}`);
    const profile = repair.thread.execution_profile!;
    const thread = await input.client.startThread({
      cwd: action.worktree,
      model: known(profile.model, profile.effort) ? profile.model : undefined,
    });
    threadId = thread.id;
    await update(input, action.repair_id, "repair_thread_started", (state) => {
      const next = bindThreadIdentityV5(
        state,
        thread.id,
        thread.sessionId || thread.id,
      );
      next.phase = "worktree_ready";
      return next;
    });
  }
  await input.client.resumeThread(threadId);
  const objective = await readFile(action.objective_path, "utf8");
  if (objective.length > 4000)
    throw new Error("goal_objective_too_long:maximum_4000_characters");
  const serverGoal = await input.client.getGoal(threadId);
  if (serverGoal && serverGoal.objective !== objective)
    throw new Error("repair_goal_objective_mismatch");
  if (!serverGoal)
    await input.client.setGoal({ threadId, objective, status: "active" });
  const stateFile = path.join(
    path.dirname(action.objective_path),
    "repair-state.json",
  );
  const disk = JSON.parse(await readFile(stateFile, "utf8")) as RepairState;
  if (!disk.goal_id)
    await bindCampaignRepairGoalV5(
      input.projectRoot,
      input.campaignPath,
      action.repair_id,
      threadId,
      disk.launch_token,
    );
  loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
  repair = loaded.campaign.repair_threads[action.repair_id];
  if (repair.thread.goal.status === "not_set")
    await update(input, action.repair_id, "repair_goal_bound", (state) =>
      bindThreadGoalV5(state, sha256Hex(objective), disk.launch_token),
    );
  for (let attempt = 0; attempt < 50; attempt += 1) {
    loaded = await loadCampaignV5(input.projectRoot, input.campaignPath);
    repair = loaded.campaign.repair_threads[action.repair_id];
    let turnId = repair.thread.active_turn_id;
    if (!turnId)
      turnId = await startTurn(
        input,
        action.repair_id,
        threadId,
        action.worktree,
        attempt === 0
          ? objective
          : "The repair worktree is not yet clean with a new commit. Continue the same repair, preserve all contracts, verify, commit, and leave the worktree clean. Do not modify Scope Fit, Packets, or Campaign state.",
      );
    const completion = await currentOrWait(input.client, threadId, turnId);
    const outcome = terminalOutcome(completion.status);
    await update(input, action.repair_id, "repair_turn_completed", (state) =>
      completeThreadTurnV5(state, outcome),
    );
    if (outcome !== "completed" && outcome !== "interrupted")
      throw new Error(
        `repair_turn_failed:${action.repair_id}:${completion.status}`,
      );
    if (outcome === "interrupted") {
      await input.client.resumeThread(threadId);
      continue;
    }
    const status = await gitStatus(action.worktree);
    const head = await currentHead(action.worktree);
    if (status.clean && head !== disk.base_commit) {
      await update(
        input,
        action.repair_id,
        "repair_thread_accepted",
        acceptThreadV5,
      );
      await input.client.setGoal({ threadId, objective, status: "complete" });
      return { repair_id: action.repair_id, head_commit: head };
    }
  }
  throw new Error(`repair_turn_limit_exceeded:${action.repair_id}`);
}

async function startTurn(
  input: {
    client: CodexAppServerClient;
    projectRoot: string;
    campaignPath: string;
  },
  repairId: string,
  threadId: string,
  worktree: string,
  message: string,
): Promise<string> {
  const campaign = (await loadCampaignV5(input.projectRoot, input.campaignPath))
    .campaign;
  const profile = campaign.repair_threads[repairId].thread.execution_profile!;
  const turn = await input.client.startTurn({
    threadId,
    input: message,
    cwd: worktree,
    ...(known(profile.model, profile.effort)
      ? { model: profile.model, effort: profile.effort }
      : {}),
    sandboxPolicy: {
      type: "workspaceWrite",
      writableRoots: [worktree],
      networkAccess: false,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    },
  });
  await update(input, repairId, "repair_turn_started", (state) =>
    recordExecutionTurnV5(state, turn.id),
  );
  return turn.id;
}
async function update(
  input: { projectRoot: string; campaignPath: string },
  repairId: string,
  event: string,
  mutate: (
    state: ReturnType<typeof emptyThreadStateV5>,
  ) => ReturnType<typeof emptyThreadStateV5>,
): Promise<void> {
  await mutateCampaignV5(
    input.projectRoot,
    input.campaignPath,
    event,
    async (_root, campaign) => {
      const repair = campaign.repair_threads[repairId];
      if (!repair) throw new Error(`repair_thread_missing:${repairId}`);
      repair.thread = mutate(repair.thread);
      return campaign;
    },
  );
}
async function currentOrWait(
  client: CodexAppServerClient,
  threadId: string,
  turnId: string,
): Promise<TurnCompletion> {
  const thread = await client.readThread(threadId);
  const turn = thread.turns.find((item) => item.id === turnId);
  if (!turn) throw new Error(`repair_active_turn_missing:${turnId}`);
  if (turn.status === "inProgress") return client.waitForTurn(threadId, turnId);
  return { threadId, turn, status: turn.status, outputText: finalText(turn) };
}
function finalText(turn: CodexTurn): string | null {
  for (let i = turn.items.length - 1; i >= 0; i -= 1) {
    const item = turn.items[i];
    if (item.type === "agentMessage" && typeof item.text === "string")
      return item.text;
  }
  return null;
}
function known(model: string, effort: string): boolean {
  return model !== "unknown" && effort !== "unknown";
}
function terminalOutcome(
  status: string,
): "completed" | "interrupted" | "failed" | "system_error" {
  return status === "completed" ||
    status === "interrupted" ||
    status === "failed"
    ? status
    : "system_error";
}
