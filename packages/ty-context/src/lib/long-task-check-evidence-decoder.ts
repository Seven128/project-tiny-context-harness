import type {
  CompiledCheckV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";

export function decodeCheckEvidence(
  check: CompiledCheckV2,
  exitCode: number,
  stdout: Buffer,
  stderr: Buffer,
): Pick<
  RawCommandExecutionV2,
  "execution_status" | "exit_code" | "observations" | "error"
> {
  if (check.runner.type === "playwright_test")
    return decodePlaywright(exitCode, stdout, stderr);
  const lines = stdout
    .toString("utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  try {
    const payload = JSON.parse(lines.at(-1) ?? "") as Record<string, unknown>;
    if (payload.schema_version !== "long-task-check-result-v2")
      return invalidEvidence(exitCode, "check_evidence_schema_invalid");
    if (payload.execution_status === "blocked_external")
      return {
        execution_status: "blocked_external",
        exit_code: exitCode,
        observations: {},
        error: `blocked_external:${String(payload.reason ?? "unspecified")}`,
      };
    if (payload.execution_status !== "completed")
      return invalidEvidence(
        exitCode,
        "check_evidence_execution_status_invalid",
      );
    if (
      !payload.observations ||
      typeof payload.observations !== "object" ||
      Array.isArray(payload.observations)
    )
      return invalidEvidence(
        exitCode,
        "check_evidence_observations_invalid",
      );
    return {
      execution_status: "completed",
      exit_code: exitCode,
      observations: payload.observations as Record<string, unknown>,
      error: null,
    };
  } catch (error) {
    return invalidEvidence(
      exitCode,
      `check_evidence_json_invalid:${message(error)}`,
    );
  }
}

export function invalidEvidence(
  exitCode: number,
  error: string,
): Pick<
  RawCommandExecutionV2,
  "execution_status" | "exit_code" | "observations" | "error"
> {
  return {
    execution_status: "invalid_evidence",
    exit_code: exitCode,
    observations: {},
    error,
  };
}

function decodePlaywright(
  exitCode: number,
  stdout: Buffer,
  stderr: Buffer,
): Pick<
  RawCommandExecutionV2,
  "execution_status" | "exit_code" | "observations" | "error"
> {
  try {
    const report = JSON.parse(stdout.toString("utf8")) as Record<
      string,
      unknown
    >;
    const stats =
      report.stats && typeof report.stats === "object"
        ? (report.stats as Record<string, unknown>)
        : null;
    if (!stats)
      return invalidEvidence(exitCode, "playwright_report_invalid:stats");
    const expected = integer(stats.expected);
    const unexpected = integer(stats.unexpected);
    const skipped = integer(stats.skipped);
    const flaky = integer(stats.flaky);
    if ([expected, unexpected, skipped, flaky].some((value) => value === null))
      return invalidEvidence(exitCode, "playwright_report_invalid:counts");
    const total = expected! + unexpected! + skipped! + flaky!;
    return {
      execution_status: "completed",
      exit_code: exitCode,
      observations: {
        "playwright.passed": exitCode === 0,
        "playwright.expected": expected,
        "playwright.unexpected": unexpected,
        "playwright.skipped": skipped,
        "playwright.flaky": flaky,
        "playwright.total": total,
        "playwright.zero_or_all_skipped": total === 0 || skipped === total,
      },
      error: null,
    };
  } catch (error) {
    const combined = `${stdout.toString("utf8")}\n${stderr.toString("utf8")}`;
    if (
      exitCode !== 0 &&
      /Cannot find module|command not found|not recognized|Executable doesn't exist|browserType\.launch/iu.test(
        combined,
      )
    )
      return {
        execution_status: "infrastructure_error",
        exit_code: exitCode,
        observations: {},
        error: `playwright_startup_failed:${message(error)}`,
      };
    return invalidEvidence(
      exitCode,
      `playwright_report_invalid:${message(error)}`,
    );
  }
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
