import type {
  CompiledDeliveryContractV1,
  FinalReceiptV1,
  LongTaskFindingV1,
  OutcomeStatusV1,
  VerificationCacheV1,
} from "./long-task-delivery-types.js";

interface StatusProjectionInput {
  compiled: CompiledDeliveryContractV1;
  snapshotSha256: string;
  stale: string[];
  cache: VerificationCacheV1 | null;
  receipt: FinalReceiptV1 | null;
  receiptError: string | null;
}

export function projectDeliveryStatus(input: StatusProjectionInput): {
  finalResult: "none" | "accepted_fresh" | "accepted_stale" | "needs_work";
  outcomes: Record<string, OutcomeStatusV1>;
  readyOutcomes: string[];
  findings: LongTaskFindingV1[];
} {
  const finalFresh = isFinalFresh(input);
  const cacheFresh = isCacheFresh(input);
  const outcomes = projectOutcomes(input, finalFresh, cacheFresh);
  return {
    finalResult: projectFinalResult(input, finalFresh),
    outcomes,
    readyOutcomes: readyOutcomes(input.compiled, outcomes),
    findings: projectFindings(input, cacheFresh),
  };
}

function isFinalFresh(input: StatusProjectionInput): boolean {
  const { receipt, compiled, snapshotSha256, stale, receiptError } = input;
  return Boolean(
    receipt &&
    receipt.workflow_status === "accepted" &&
    receipt.compiled_identity === compiled.compiled_identity &&
    receipt.snapshot_sha256 === snapshotSha256 &&
    stale.length === 0 &&
    !receiptError,
  );
}

function isCacheFresh(input: StatusProjectionInput): boolean {
  const { cache, compiled, snapshotSha256, stale } = input;
  return Boolean(
    cache &&
    cache.compiled_identity === compiled.compiled_identity &&
    cache.snapshot_sha256 === snapshotSha256 &&
    stale.length === 0,
  );
}

function projectOutcomes(
  input: StatusProjectionInput,
  finalFresh: boolean,
  cacheFresh: boolean,
): Record<string, OutcomeStatusV1> {
  const outcomes: Record<string, OutcomeStatusV1> = {};
  for (const outcome of input.compiled.outcomes) {
    if (finalFresh) {
      outcomes[outcome.key] = "passing_current_snapshot";
      continue;
    }
    if (
      (input.receipt || input.cache) &&
      (!cacheFresh || input.stale.length || input.receiptError)
    ) {
      outcomes[outcome.key] = "stale";
      continue;
    }
    const owned =
      input.cache?.check_results.filter(
        (check) => check.outcome_key === outcome.key,
      ) ?? [];
    outcomes[outcome.key] = outcomeStatus(
      owned,
      outcome.acceptance.checks.length,
    );
  }
  return outcomes;
}

function outcomeStatus(
  checks: VerificationCacheV1["check_results"],
  expectedCount: number,
): OutcomeStatusV1 {
  if (checks.some((check) => check.status === "failed"))
    return "failing_current_snapshot";
  if (checks.some((check) => check.status === "blocked_external"))
    return "blocked_external";
  if (
    checks.length === expectedCount &&
    checks.every((check) => check.status === "passed")
  )
    return "passing_current_snapshot";
  return "unverified";
}

function projectFindings(
  input: StatusProjectionInput,
  cacheFresh: boolean,
): LongTaskFindingV1[] {
  const findings: LongTaskFindingV1[] = input.stale.map((code) => ({
    code,
    outcome_key: null,
    check_key: null,
    message: "A compiled identity input changed.",
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
  if (cacheFresh && input.cache) findings.push(...input.cache.findings);
  return findings;
}

function readyOutcomes(
  compiled: CompiledDeliveryContractV1,
  outcomes: Record<string, OutcomeStatusV1>,
): string[] {
  return compiled.outcomes
    .filter(
      (outcome) =>
        outcomes[outcome.key] !== "passing_current_snapshot" &&
        outcome.depends_on.every(
          (dependency) => outcomes[dependency] === "passing_current_snapshot",
        ),
    )
    .map((outcome) => outcome.key);
}

function projectFinalResult(
  input: StatusProjectionInput,
  finalFresh: boolean,
): "none" | "accepted_fresh" | "accepted_stale" | "needs_work" {
  if (finalFresh) return "accepted_fresh";
  if (input.receipt) return "accepted_stale";
  if (input.cache) return "needs_work";
  return "none";
}
