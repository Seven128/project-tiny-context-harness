import type { CampaignWorkerRunV6 } from "./composite-campaign-schema-v6.js";
import {
  isProcessAlive,
  matchesRecordedProcessIdentity,
} from "./process-identity.js";

export type WorkerProcessIdentityStateV6 =
  | "not_started"
  | "not_alive"
  | "identity_match"
  | "identity_mismatch"
  | "identity_unavailable";

export interface WorkerProcessObservationV6 {
  state: WorkerProcessIdentityStateV6;
  alive: boolean;
  identity_matches: boolean | null;
  safely_terminable: boolean;
}

export async function inspectWorkerProcessV6(
  run: Pick<CampaignWorkerRunV6, "pid" | "process_start_identity">,
): Promise<WorkerProcessObservationV6> {
  if (!run.pid) return observation("not_started", false, null, false);
  if (!isProcessAlive(run.pid))
    return observation("not_alive", false, false, false);
  if (!run.process_start_identity)
    return observation("identity_unavailable", true, null, false);
  const matches = await matchesRecordedProcessIdentity(
    run.pid,
    run.process_start_identity,
  );
  return matches
    ? observation("identity_match", true, true, true)
    : observation("identity_mismatch", true, false, false);
}

function observation(
  state: WorkerProcessIdentityStateV6,
  alive: boolean,
  identityMatches: boolean | null,
  safelyTerminable: boolean,
): WorkerProcessObservationV6 {
  return {
    state,
    alive,
    identity_matches: identityMatches,
    safely_terminable: safelyTerminable,
  };
}
