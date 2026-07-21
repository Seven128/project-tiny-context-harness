import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";

export interface PlaywrightEvidence {
  observations: Record<string, unknown>;
  evidence_records: EvidenceCapabilityRecordV2[];
  error: string | null;
}

export function extractPlaywrightEvidence(
  check: CompiledCheckV2,
  report: Record<string, unknown>,
  exitCode: number,
): PlaywrightEvidence {
  const stats = record(report.stats);
  if (!stats) return invalid("playwright_report_invalid:stats");
  const expected = integer(stats.expected);
  const unexpected = integer(stats.unexpected);
  const skipped = integer(stats.skipped);
  const flaky = integer(stats.flaky);
  if ([expected, unexpected, skipped, flaky].some((value) => value === null))
    return invalid("playwright_report_invalid:counts");
  const total = expected! + unexpected! + skipped! + flaky!;
  const reportErrors = report.errors;
  if (reportErrors !== undefined && !Array.isArray(reportErrors))
    return invalid("playwright_report_invalid:errors");
  const observations: Record<string, unknown> = {
    "playwright.passed": exitCode === 0,
    "playwright.expected": expected,
    "playwright.unexpected": unexpected,
    "playwright.skipped": skipped,
    "playwright.flaky": flaky,
    "playwright.total": total,
    "playwright.zero_or_all_skipped": total === 0 || skipped === total,
    "playwright.report_error_count": Array.isArray(reportErrors)
      ? reportErrors.length
      : 0,
  };

  const collected = collectCases(report, declaredCaseIds(check));
  if (collected.error) return invalid(collected.error);
  const instances = collected.cases;
  observations["playwright.declared_unexpected_instances"] = instances.filter(
    (item) => item.unexpected,
  ).length;
  observations["playwright.unbound_unexpected_instances"] =
    collected.unbound_unexpected_instances;
  const duplicate = duplicateCaseInstance(instances);
  if (duplicate)
    return invalid(
      `playwright_ac_id_duplicate:${duplicate.id}:${duplicate.project_id}`,
    );
  const cases = aggregateCases(instances);
  for (const item of cases) {
    const prefix = `playwright.case.${item.id}`;
    observations[`${prefix}.executed`] = item.executed;
    observations[`${prefix}.passed`] = item.passed;
    observations[`${prefix}.skipped`] = item.skipped;
    observations[`${prefix}.flaky`] = item.flaky;
    observations[`${prefix}.unexpected`] = item.unexpected;
    observations[`${prefix}.status`] = item.status;
    observations[`${prefix}.project_ids`] = item.project_ids;
    observations[`${prefix}.executed_instances`] = item.executed_instances;
    observations[`${prefix}.failed_instances`] = item.failed_instances;
    observations[`${prefix}.skipped_instances`] = item.skipped_instances;
    observations[`${prefix}.flaky_instances`] = item.flaky_instances;
    observations[`${prefix}.unexpected_instances`] = item.unexpected_instances;
    observations[`${prefix}.timed_out_instances`] = item.timed_out_instances;
    observations[`${prefix}.interrupted_instances`] =
      item.interrupted_instances;
  }
  for (const id of declaredCaseIds(check)) {
    const prefix = `playwright.case.${id}`;
    if (!Object.hasOwn(observations, `${prefix}.status`)) {
      observations[`${prefix}.executed`] = false;
      observations[`${prefix}.status`] = "missing";
    }
  }
  observations["playwright.case_ids"] = cases.map((item) => item.id).sort();
  const evidenceRecords: EvidenceCapabilityRecordV2[] = [];
  for (const item of cases) {
    const assertion = [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ].find((candidate) => candidate.key === item.id);
    if (
      assertion?.evidence_capabilities.includes("interaction_trace") &&
      item.executed
    )
      evidenceRecords.push({
        assertion_key: assertion.key,
        capability: "interaction_trace",
        target_ref: check.execution_target.target_ref,
        given_keys: item.given_keys,
        action_keys: item.action_keys,
      });
    if (
      assertion?.evidence_capabilities.includes("target_runtime") &&
      item.executed
    )
      evidenceRecords.push({
        assertion_key: assertion.key,
        capability: "target_runtime",
        target_ref: check.execution_target.target_ref,
        root_entrypoint: check.execution_target_definition.root_entrypoint,
        session_id: `playwright:${item.id}:${item.project_ids.join(",")}`,
        cold_start: check.execution_target.entrypoint === "root",
      });
  }
  return { observations, evidence_records: evidenceRecords, error: null };
}

interface PlaywrightCaseInstance {
  id: string;
  project_id: string;
  executed: boolean;
  passed: boolean;
  skipped: boolean;
  flaky: boolean;
  unexpected: boolean;
  timed_out: boolean;
  interrupted: boolean;
  status: string;
  given_keys: string[];
  action_keys: string[];
}

interface PlaywrightCase {
  id: string;
  executed: boolean;
  passed: boolean;
  skipped: boolean;
  flaky: boolean;
  unexpected: boolean;
  status: string;
  project_ids: string[];
  executed_instances: number;
  failed_instances: number;
  skipped_instances: number;
  flaky_instances: number;
  unexpected_instances: number;
  timed_out_instances: number;
  interrupted_instances: number;
  given_keys: string[];
  action_keys: string[];
}

function collectCases(
  report: Record<string, unknown>,
  declaredIds: Set<string>,
): {
  cases: PlaywrightCaseInstance[];
  unbound_unexpected_instances: number;
  error: string | null;
} {
  const cases: PlaywrightCaseInstance[] = [];
  const collection = { unbound_unexpected_instances: 0 };
  const error = visitSuites(report.suites, cases, declaredIds, collection);
  return { cases, error, ...collection };
}

function visitSuites(
  value: unknown,
  cases: PlaywrightCaseInstance[],
  declaredIds: Set<string>,
  collection: { unbound_unexpected_instances: number },
): string | null {
  if (!Array.isArray(value)) return null;
  for (const suiteValue of value) {
    const suite = record(suiteValue);
    if (!suite) continue;
    const nestedError = visitSuites(
      suite.suites,
      cases,
      declaredIds,
      collection,
    );
    if (nestedError) return nestedError;
    if (!Array.isArray(suite.specs)) continue;
    for (const specValue of suite.specs) {
      const spec = record(specValue);
      if (!spec || !Array.isArray(spec.tests)) continue;
      for (const testValue of spec.tests) {
        const test = record(testValue);
        if (!test) continue;
        const title = [spec.title, test.title]
          .filter((item): item is string => typeof item === "string")
          .join(" ");
        const ids = declaredIdsInTitle(title, declaredIds);
        if (ids.length > 1)
          return `playwright_test_multiple_ac_ids:${ids.join(",")}`;
        const instance = playwrightCase(ids[0] ?? "unbound", test);
        if (ids.length === 1) cases.push(instance);
        else if (instance.unexpected)
          collection.unbound_unexpected_instances += 1;
      }
    }
  }
  return null;
}

function declaredIdsInTitle(title: string, declared: Set<string>): string[] {
  const explicit = [...title.matchAll(/\[ac:([a-z0-9][a-z0-9-]*)\]/gu)].map(
    (match) => match[1],
  );
  const legacy = [...title.matchAll(/\[([a-z0-9][a-z0-9-]*)\]/gu)].map(
    (match) => match[1],
  );
  return [
    ...new Set([...explicit, ...legacy].filter((id) => declared.has(id))),
  ].sort();
}

function playwrightCase(
  id: string,
  test: Record<string, unknown>,
): PlaywrightCaseInstance {
  const status = typeof test.status === "string" ? test.status : "invalid";
  const projectId =
    typeof test.projectId === "string"
      ? test.projectId
      : typeof test.projectName === "string"
        ? test.projectName
        : "default";
  const results = Array.isArray(test.results)
    ? test.results.map(record).filter(Boolean)
    : [];
  const resultStatuses = results
    .map((result) => result!.status)
    .filter((value): value is string => typeof value === "string");
  const skipped =
    status === "skipped" ||
    (resultStatuses.length > 0 &&
      resultStatuses.every((value) => value === "skipped"));
  const executed = !skipped && resultStatuses.length > 0;
  const flaky = status === "flaky";
  const unexpected = status === "unexpected";
  const timedOut = resultStatuses.includes("timedOut");
  const interrupted = resultStatuses.includes("interrupted");
  const passed =
    executed &&
    !flaky &&
    !unexpected &&
    status === "expected" &&
    resultStatuses.length > 0 &&
    resultStatuses.at(-1) === "passed";
  const traces = results.map((result) => scenarioTrace(result!));
  const givenKeys = traces[0]?.given_keys ?? [];
  const actionKeys = traces[0]?.action_keys ?? [];
  const traceConsistent = traces.every(
    (trace) =>
      same(trace.given_keys, givenKeys) && same(trace.action_keys, actionKeys),
  );
  return {
    id,
    project_id: projectId,
    executed,
    passed,
    skipped,
    flaky,
    unexpected,
    timed_out: timedOut,
    interrupted,
    status,
    given_keys: traceConsistent ? givenKeys : [],
    action_keys: traceConsistent ? actionKeys : [],
  };
}

function declaredCaseIds(check: CompiledCheckV2): Set<string> {
  const result = new Set<string>();
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    if (!assertion.claims.length) continue;
    const match = /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.passed$/u.exec(
      assertion.observation,
    );
    if (match) result.add(assertion.key);
  }
  return result;
}

function duplicateCaseInstance(
  values: PlaywrightCaseInstance[],
): PlaywrightCaseInstance | null {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = `${value.id}\0${value.project_id}`;
    if (seen.has(identity)) return value;
    seen.add(identity);
  }
  return null;
}

function aggregateCases(instances: PlaywrightCaseInstance[]): PlaywrightCase[] {
  const grouped = new Map<string, PlaywrightCaseInstance[]>();
  for (const instance of instances) {
    const rows = grouped.get(instance.id) ?? [];
    rows.push(instance);
    grouped.set(instance.id, rows);
  }
  return [...grouped.entries()]
    .map(([id, rows]) => {
      const executedInstances = rows.filter((item) => item.executed).length;
      const skippedInstances = rows.filter((item) => item.skipped).length;
      const flakyInstances = rows.filter((item) => item.flaky).length;
      const unexpectedInstances = rows.filter((item) => item.unexpected).length;
      const timedOutInstances = rows.filter((item) => item.timed_out).length;
      const interruptedInstances = rows.filter(
        (item) => item.interrupted,
      ).length;
      const failedInstances = rows.filter(
        (item) => !item.passed && !item.skipped,
      ).length;
      const executed = rows.length > 0 && rows.every((item) => item.executed);
      const passed =
        executed &&
        skippedInstances === 0 &&
        flakyInstances === 0 &&
        unexpectedInstances === 0 &&
        rows.every((item) => item.passed);
      const status = passed
        ? "passed"
        : skippedInstances
          ? "skipped"
          : flakyInstances
            ? "flaky"
            : timedOutInstances
              ? "timed_out"
              : interruptedInstances
                ? "interrupted"
                : unexpectedInstances
                  ? "unexpected"
                  : "failed";
      return {
        id,
        executed,
        passed,
        skipped: skippedInstances > 0,
        flaky: flakyInstances > 0,
        unexpected: unexpectedInstances > 0,
        status,
        project_ids: rows.map((item) => item.project_id).sort(),
        executed_instances: executedInstances,
        failed_instances: failedInstances,
        skipped_instances: skippedInstances,
        flaky_instances: flakyInstances,
        unexpected_instances: unexpectedInstances,
        timed_out_instances: timedOutInstances,
        interrupted_instances: interruptedInstances,
        given_keys:
          rows.length &&
          rows.every((row) => same(row.given_keys, rows[0].given_keys))
            ? rows[0].given_keys
            : [],
        action_keys:
          rows.length &&
          rows.every((row) => same(row.action_keys, rows[0].action_keys))
            ? rows[0].action_keys
            : [],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function scenarioTrace(result: Record<string, unknown>): {
  given_keys: string[];
  action_keys: string[];
} {
  const givenKeys: string[] = [];
  const actionKeys: string[] = [];
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      const step = record(item);
      if (!step) continue;
      if (typeof step.title === "string") {
        const given = /^\[given:([a-z0-9][a-z0-9-]*)\]$/u.exec(step.title);
        const action = /^\[action:([a-z0-9][a-z0-9-]*)\]$/u.exec(step.title);
        if (given) givenKeys.push(given[1]);
        if (action) actionKeys.push(action[1]);
      }
      visit(step.steps);
    }
  };
  visit(result.steps);
  return { given_keys: givenKeys, action_keys: actionKeys };
}

function same(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function invalid(error: string): PlaywrightEvidence {
  return { observations: {}, evidence_records: [], error };
}
