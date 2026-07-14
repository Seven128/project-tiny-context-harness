import {
  assertThreadStateV5,
  type CampaignThreadStateV5,
  type ThreadPhaseV5,
} from "./composite-campaign-schema-v5.js";
import type { ModelRoutingDecision } from "./codex-model-router.js";

const ALLOWED: Record<ThreadPhaseV5, ThreadPhaseV5[]> = {
  thread_pending: ["authoring", "failed"],
  authoring: ["packet_validation", "interrupted", "failed"],
  packet_validation: ["authoring", "worktree_ready", "failed"],
  worktree_ready: ["goal_active", "failed"],
  goal_active: ["executing", "interrupted", "failed"],
  executing: ["executing", "accepted", "interrupted", "failed"],
  accepted: [],
  failed: ["authoring", "executing"],
  interrupted: ["authoring", "executing", "failed"],
};

export function transitionThreadPhaseV5(
  state: CampaignThreadStateV5,
  phase: ThreadPhaseV5,
): CampaignThreadStateV5 {
  const current = clone(state);
  if (phase !== current.phase && !ALLOWED[current.phase].includes(phase))
    throw new Error(
      `campaign_thread_transition_invalid:${current.phase}->${phase}`,
    );
  current.phase = phase;
  return assertThreadStateV5(current);
}

export function bindThreadIdentityV5(
  state: CampaignThreadStateV5,
  threadId: string,
  sessionId: string,
): CampaignThreadStateV5 {
  if (state.thread_id && state.thread_id !== threadId)
    throw new Error("campaign_thread_identity_immutable");
  const next = clone(state);
  next.thread_id = nonempty(threadId, "thread_id");
  next.session_id = nonempty(sessionId, "session_id");
  next.phase = "authoring";
  next.last_error_code = null;
  return assertThreadStateV5(next);
}

export function bindThreadRoutingV5(
  state: CampaignThreadStateV5,
  decision: ModelRoutingDecision,
): CampaignThreadStateV5 {
  const next = clone(state);
  next.authoring_profile = { ...decision.authoring_profile };
  next.execution_profile = { ...decision.execution_profile };
  next.routing_reason = decision.reason;
  next.routing_freeze = {
    policy_id: decision.policy_id,
    policy_sha256: decision.policy_sha256,
    catalog_sha256: decision.catalog_sha256,
    routing_decision: {
      authoring_profile: { ...decision.authoring_profile },
      execution_profile: { ...decision.execution_profile },
      switched: decision.switched,
      reason: decision.reason,
    },
    decision_sha256: decision.decision_sha256,
  };
  return assertThreadStateV5(next);
}

export function recordAuthoringTurnV5(
  state: CampaignThreadStateV5,
  turnId: string,
): CampaignThreadStateV5 {
  const next = transitionThreadPhaseV5(state, "authoring");
  appendUnique(next.authoring_turn_ids, nonempty(turnId, "turn_id"));
  observe(next, turnId, "authoring", "running", true);
  next.active_turn_id = turnId;
  next.last_turn_status = "inProgress";
  return assertThreadStateV5(next);
}

export function markPacketValidationV5(
  state: CampaignThreadStateV5,
): CampaignThreadStateV5 {
  const next = transitionThreadPhaseV5(state, "packet_validation");
  if (next.active_turn_id) settle(next, next.active_turn_id, "completed");
  next.active_turn_id = null;
  next.last_turn_status = "completed";
  return assertThreadStateV5(next);
}

export function markWorktreeReadyV5(
  state: CampaignThreadStateV5,
): CampaignThreadStateV5 {
  return transitionThreadPhaseV5(state, "worktree_ready");
}

export function bindThreadGoalV5(
  state: CampaignThreadStateV5,
  objectiveSha256: string,
  launchToken: string,
): CampaignThreadStateV5 {
  if (state.goal.status !== "not_set")
    throw new Error("campaign_thread_goal_already_set");
  if (!/^[a-f0-9]{64}$/u.test(objectiveSha256))
    throw new Error("campaign_thread_goal_hash_invalid");
  const staged = clone(state);
  staged.goal = { status: "active", objective_sha256: objectiveSha256 };
  const next = transitionThreadPhaseV5(staged, "goal_active");
  next.launch_token = nonempty(launchToken, "launch_token");
  return assertThreadStateV5(next);
}

export function recordExecutionTurnV5(
  state: CampaignThreadStateV5,
  turnId: string,
): CampaignThreadStateV5 {
  const next = transitionThreadPhaseV5(state, "executing");
  appendUnique(next.execution_turn_ids, nonempty(turnId, "turn_id"));
  observe(next, turnId, "execution", "running", true);
  next.active_turn_id = turnId;
  next.last_turn_status = "inProgress";
  return assertThreadStateV5(next);
}

export function completeThreadTurnV5(
  state: CampaignThreadStateV5,
  status: "completed" | "interrupted" | "failed" | "system_error",
): CampaignThreadStateV5 {
  const next = clone(state);
  if (next.active_turn_id) settle(next, next.active_turn_id, status);
  next.active_turn_id = null;
  next.last_turn_status = status;
  if (status === "interrupted") next.phase = "interrupted";
  if (status === "failed" || status === "system_error") next.phase = "failed";
  return assertThreadStateV5(next);
}

export function reconcileThreadTurnV5(
  state: CampaignThreadStateV5,
  turnId: string,
  status:
    "inProgress" | "completed" | "interrupted" | "failed" | "system_error",
): CampaignThreadStateV5 {
  const next = clone(state);
  if (
    !next.authoring_turn_ids.includes(turnId) &&
    !next.execution_turn_ids.includes(turnId)
  )
    throw new Error(`campaign_thread_turn_untracked:${turnId}`);
  settle(next, turnId, status);
  if (status !== "inProgress" && next.active_turn_id === turnId) {
    next.active_turn_id = null;
    next.last_turn_status = status;
    if (status === "interrupted") next.phase = "interrupted";
    if (status === "failed" || status === "system_error") next.phase = "failed";
  }
  return assertThreadStateV5(next);
}

export function acceptThreadV5(
  state: CampaignThreadStateV5,
): CampaignThreadStateV5 {
  const staged = clone(state);
  staged.goal.status = "complete";
  const next = transitionThreadPhaseV5(staged, "accepted");
  next.active_turn_id = null;
  next.last_turn_status = "completed";
  return assertThreadStateV5(next);
}

function clone(state: CampaignThreadStateV5): CampaignThreadStateV5 {
  return {
    ...state,
    authoring_profile: state.authoring_profile && {
      ...state.authoring_profile,
    },
    execution_profile: state.execution_profile && {
      ...state.execution_profile,
    },
    routing_freeze: state.routing_freeze && {
      ...state.routing_freeze,
      routing_decision: {
        ...state.routing_freeze.routing_decision,
        authoring_profile: {
          ...state.routing_freeze.routing_decision.authoring_profile,
        },
        execution_profile: {
          ...state.routing_freeze.routing_decision.execution_profile,
        },
      },
    },
    authoring_turn_ids: [...state.authoring_turn_ids],
    goal: { ...state.goal },
    execution_turn_ids: [...state.execution_turn_ids],
    turn_observations: Object.fromEntries(
      Object.entries(state.turn_observations).map(([id, value]) => [
        id,
        { ...value },
      ]),
    ),
  };
}
function observe(
  state: CampaignThreadStateV5,
  turnId: string,
  kind: "authoring" | "execution",
  status: "running" | "completed" | "failed" | "interrupted" | "unknown",
  reconciliationRequired: boolean,
): void {
  state.turn_observations[turnId] = {
    turn_id: turnId,
    kind,
    status,
    observed_at: new Date().toISOString(),
    reconciliation_required: reconciliationRequired,
  };
}
function settle(
  state: CampaignThreadStateV5,
  turnId: string,
  status:
    "inProgress" | "completed" | "interrupted" | "failed" | "system_error",
): void {
  const prior = state.turn_observations[turnId];
  if (!prior)
    throw new Error(`campaign_thread_turn_observation_missing:${turnId}`);
  observe(
    state,
    turnId,
    prior.kind,
    status === "inProgress"
      ? "running"
      : status === "system_error"
        ? "unknown"
        : status,
    status === "system_error",
  );
}
function appendUnique(values: string[], value: string): void {
  if (values.includes(value))
    throw new Error(`campaign_thread_turn_duplicate:${value}`);
  values.push(value);
}
function nonempty(value: string, label: string): string {
  if (!value.trim()) throw new Error(`campaign_thread_${label}_empty`);
  return value;
}
