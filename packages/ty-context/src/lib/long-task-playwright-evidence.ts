import type { CompiledCheckV2 } from "./long-task-delivery-types.js";

export interface PlaywrightEvidence {
  observations: Record<string, unknown>;
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
  const observations: Record<string, unknown> = {
    "playwright.passed": exitCode === 0,
    "playwright.expected": expected,
    "playwright.unexpected": unexpected,
    "playwright.skipped": skipped,
    "playwright.flaky": flaky,
    "playwright.total": total,
    "playwright.zero_or_all_skipped": total === 0 || skipped === total,
  };

  const cases = collectCases(report);
  const duplicate = duplicateCaseId(cases.map((item) => item.id));
  if (duplicate) return invalid(`playwright_ac_id_duplicate:${duplicate}`);
  for (const item of cases) {
    const prefix = `playwright.case.${item.id}`;
    observations[`${prefix}.executed`] = !item.skipped;
    observations[`${prefix}.passed`] = item.passed;
    observations[`${prefix}.skipped`] = item.skipped;
    observations[`${prefix}.status`] = item.status;
  }
  for (const id of declaredCaseIds(check)) {
    const prefix = `playwright.case.${id}`;
    if (!Object.hasOwn(observations, `${prefix}.status`)) {
      observations[`${prefix}.executed`] = false;
      observations[`${prefix}.passed`] = false;
      observations[`${prefix}.skipped`] = false;
      observations[`${prefix}.status`] = "missing";
    }
  }
  observations["playwright.case_ids"] = cases.map((item) => item.id).sort();
  return { observations, error: null };
}

interface PlaywrightCase {
  id: string;
  passed: boolean;
  skipped: boolean;
  status: string;
}

function collectCases(report: Record<string, unknown>): PlaywrightCase[] {
  const cases: PlaywrightCase[] = [];
  visitSuites(report.suites, cases);
  return cases;
}

function visitSuites(value: unknown, cases: PlaywrightCase[]): void {
  if (!Array.isArray(value)) return;
  for (const suiteValue of value) {
    const suite = record(suiteValue);
    if (!suite) continue;
    visitSuites(suite.suites, cases);
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
        const ids = [...title.matchAll(/\[([a-z0-9][a-z0-9-]*)\]/gu)].map(
          (match) => match[1],
        );
        for (const id of ids) cases.push(playwrightCase(id, test));
      }
    }
  }
}

function playwrightCase(
  id: string,
  test: Record<string, unknown>,
): PlaywrightCase {
  const status = typeof test.status === "string" ? test.status : "invalid";
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
  const passed =
    !skipped &&
    status === "expected" &&
    resultStatuses.length > 0 &&
    resultStatuses.at(-1) === "passed";
  return { id, passed, skipped, status };
}

function declaredCaseIds(check: CompiledCheckV2): Set<string> {
  const result = new Set<string>();
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    const match =
      /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.(?:passed|skipped)$/u.exec(
        assertion.observation,
      );
    if (match) result.add(match[1]);
  }
  return result;
}

function duplicateCaseId(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function invalid(error: string): PlaywrightEvidence {
  return { observations: {}, error };
}
