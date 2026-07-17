import type {
  CompiledDeliveryContractV2,
  FinalReceiptV2,
  LongTaskFindingV2,
  OutcomeStatusV2,
  ProgressRecordV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { progressRecordFresh } from "./long-task-progress.js";

interface StatusProjectionInputV2 {
  compiled: CompiledDeliveryContractV2;
  manifest: WorkspaceManifestV2;
  stale: string[];
  progress: Record<string, ProgressRecordV2>;
  receipt: FinalReceiptV2 | null;
  receiptError: string | null;
}

export type AuditGateStatusV2 =
  | "no_final_gate"
  | "last_gate_passed"
  | "last_gate_failed"
  | "last_gate_blocked"
  | "last_gate_inputs_stale";

export function projectDeliveryStatus(input: StatusProjectionInputV2): {
  finalResult: AuditGateStatusV2;
  finalWorkflowStatus: FinalReceiptV2["workflow_status"] | null;
  outcomes: Record<string, OutcomeStatusV2>;
  readyOutcomes: string[];
  needsReverify: string[];
  progressPassing: string[];
  progressFailing: string[];
  findings: LongTaskFindingV2[];
} {
  const outcomes = projectOutcomes(input);
  return {
    finalResult: projectFinalResult(input),
    finalWorkflowStatus: receiptFresh(input)
      ? input.receipt!.workflow_status
      : null,
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

function projectOutcomes(
  input: StatusProjectionInputV2,
): Record<string, OutcomeStatusV2> {
  const outcomes: Record<string, OutcomeStatusV2> = {};
  for (const outcome of input.compiled.outcomes) {
    const states = outcome.acceptance.checks.map((check) => {
      const record = input.progress[check.internal_id];
      if (!record) return "unverified" as const;
      if (
        input.stale.length ||
        !progressRecordFresh(record, input.compiled, input.manifest, check)
      )
        return "progress_stale" as const;
      if (record.result === "passed") return "progress_passing" as const;
      if (record.result === "blocked_external")
        return "blocked_external" as const;
      return "progress_failing" as const;
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

function projectFindings(input: StatusProjectionInputV2): LongTaskFindingV2[] {
  const findings: LongTaskFindingV2[] = input.stale.map((code) => ({
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
      message:
        "The last audit Receipt is invalid; it has no acceptance authority.",
      next_action: "Run a new Live Final Gate.",
    });
  const checks = [
    ...input.compiled.global.acceptance.checks,
    ...input.compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  for (const record of Object.values(input.progress)) {
    const check = checks.find(
      (candidate) => candidate.internal_id === record.check_internal_id,
    );
    if (!check) continue;
    if (progressRecordFresh(record, input.compiled, input.manifest, check)) {
      findings.push(...record.findings);
      continue;
    }
    if (check.outcome_key === null)
      findings.push({
        code: "global_progress_stale",
        outcome_key: null,
        check_key: check.key,
        message: `Targeted progress for Global Check ${check.key} is stale.`,
        next_action:
          "Rerun the Global Check against the current carrier snapshot.",
      });
  }
  return findings;
}

function readyOutcomes(
  compiled: CompiledDeliveryContractV2,
  outcomes: Record<string, OutcomeStatusV2>,
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

function projectFinalResult(input: StatusProjectionInputV2): AuditGateStatusV2 {
  if (!input.receipt) return "no_final_gate";
  if (!receiptFresh(input)) return "last_gate_inputs_stale";
  if (input.receipt.workflow_status === "blocked_external")
    return "last_gate_blocked";
  if (input.receipt.workflow_status === "needs_work") return "last_gate_failed";
  return "last_gate_passed";
}

function receiptFresh(input: StatusProjectionInputV2): boolean {
  return Boolean(
    input.receipt &&
    !input.receiptError &&
    !input.stale.length &&
    input.receipt.compiled_identity === input.compiled.compiled_identity &&
    input.receipt.snapshot_sha256 === input.manifest.snapshot_sha256 &&
    input.receipt.git_head === input.manifest.git_head &&
    input.receipt.git_tree === input.manifest.fingerprint.head_tree,
  );
}
