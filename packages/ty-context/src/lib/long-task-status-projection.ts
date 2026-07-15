import type {
  CompiledDeliveryContractV1,
  FinalReceiptV1,
  LongTaskFindingV1,
  OutcomeStatusV1,
  ProgressRecordV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
import { progressRecordFresh } from "./long-task-progress.js";

interface StatusProjectionInput {
  compiled: CompiledDeliveryContractV1;
  manifest: WorkspaceManifestV1;
  stale: string[];
  progress: Record<string, ProgressRecordV1>;
  receipt: FinalReceiptV1 | null;
  receiptError: string | null;
}

export function projectDeliveryStatus(input: StatusProjectionInput): {
  finalResult:
    | "none"
    | "machine_accepted_fresh"
    | "machine_accepted_external_pending_fresh"
    | "accepted_stale"
    | "needs_work";
  outcomes: Record<string, OutcomeStatusV1>;
  readyOutcomes: string[];
  needsReverify: string[];
  progressPassing: string[];
  progressFailing: string[];
  findings: LongTaskFindingV1[];
} {
  const finalFresh = isFinalFresh(input);
  const outcomes = projectOutcomes(input, finalFresh);
  return {
    finalResult: projectFinalResult(input, finalFresh),
    outcomes,
    readyOutcomes: readyOutcomes(input.compiled, outcomes),
    needsReverify: Object.entries(outcomes)
      .filter(([, status]) =>
        ["unverified", "progress_stale", "progress_failing"].includes(status),
      )
      .map(([key]) => key),
    progressPassing: Object.entries(outcomes)
      .filter(([, status]) => status === "progress_passing")
      .map(([key]) => key),
    progressFailing: Object.entries(outcomes)
      .filter(([, status]) => status === "progress_failing")
      .map(([key]) => key),
    findings: projectFindings(input),
  };
}

function isFinalFresh(input: StatusProjectionInput): boolean {
  const { receipt, compiled, manifest, stale, receiptError } = input;
  return Boolean(
    receipt &&
    (receipt.workflow_status === "machine_accepted" ||
      receipt.workflow_status === "machine_accepted_external_pending") &&
    receipt.compiled_identity === compiled.compiled_identity &&
    receipt.snapshot_sha256 === manifest.snapshot_sha256 &&
    receipt.git_head === manifest.git_head &&
    stale.length === 0 &&
    !receiptError,
  );
}

function projectOutcomes(
  input: StatusProjectionInput,
  finalFresh: boolean,
): Record<string, OutcomeStatusV1> {
  const outcomes: Record<string, OutcomeStatusV1> = {};
  for (const outcome of input.compiled.outcomes) {
    if (finalFresh) {
      outcomes[outcome.key] = "progress_passing";
      continue;
    }
    const states = outcome.acceptance.checks.map((check) => {
      const record = input.progress[check.internal_id];
      if (!record) return "unverified" as const;
      if (
        input.stale.length ||
        !progressRecordFresh(record, input.compiled, input.manifest, check)
      )
        return "progress_stale" as const;
      return record.result === "passed"
        ? ("progress_passing" as const)
        : record.result === "failed"
          ? ("progress_failing" as const)
          : ("blocked_external" as const);
    });
    outcomes[outcome.key] = states.includes("progress_failing")
      ? "progress_failing"
      : states.includes("blocked_external")
        ? "blocked_external"
        : states.includes("progress_stale")
          ? "progress_stale"
          : states.length > 0 &&
              states.every((state) => state === "progress_passing")
            ? "progress_passing"
            : "unverified";
  }
  return outcomes;
}

function projectFindings(input: StatusProjectionInput): LongTaskFindingV1[] {
  const findings: LongTaskFindingV1[] = input.stale.map((code) => ({
    code,
    outcome_key: null,
    check_key: null,
    message: "A compiled authority input changed.",
    next_action: "Review the change and recompile the Delivery Contract.",
  }));
  if (input.receiptError)
    findings.push({
      code: input.receiptError,
      outcome_key: null,
      check_key: null,
      message: "Final authority is missing or mismatched.",
      next_action:
        "Run the complete Final Gate; handwritten state is not accepted.",
    });
  for (const record of Object.values(input.progress))
    if (
      input.compiled.outcomes.some((outcome) =>
        outcome.acceptance.checks.some(
          (check) =>
            check.internal_id === record.check_internal_id &&
            progressRecordFresh(record, input.compiled, input.manifest, check),
        ),
      )
    )
      findings.push(...record.findings);
  return findings;
}

function readyOutcomes(
  compiled: CompiledDeliveryContractV1,
  outcomes: Record<string, OutcomeStatusV1>,
): string[] {
  return compiled.outcomes
    .filter(
      (outcome) =>
        outcomes[outcome.key] !== "progress_passing" &&
        outcome.depends_on.every(
          (dependency) => outcomes[dependency] === "progress_passing",
        ),
    )
    .map((outcome) => outcome.key);
}

function projectFinalResult(
  input: StatusProjectionInput,
  finalFresh: boolean,
):
  | "none"
  | "machine_accepted_fresh"
  | "machine_accepted_external_pending_fresh"
  | "accepted_stale"
  | "needs_work" {
  if (finalFresh)
    return input.receipt?.workflow_status ===
      "machine_accepted_external_pending"
      ? "machine_accepted_external_pending_fresh"
      : "machine_accepted_fresh";
  if (input.receipt) return "accepted_stale";
  if (Object.keys(input.progress).length) return "needs_work";
  return "none";
}
