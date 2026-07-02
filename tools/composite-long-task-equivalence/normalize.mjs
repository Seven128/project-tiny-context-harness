import path from "node:path";

export const EQUIVALENCE_FIXTURE_IDS = [
  "happy-path",
  "full-population-sample-only",
  "scope-conflict",
  "strict-parse-list-style",
  "strict-parse-duplicate-heading",
  "strict-parse-table-field",
  "strict-parse-field-heading",
  "multi-slice"
];

export const DERIVED_FILES = [
  "plan-conformance-matrix.json",
  "final-acceptance-verdict.json",
  "progress-ledger.json",
  "evidence-index.md",
  "context-alignment.md",
  "final-summary.md"
];

export function normalizeTaskState(state) {
  return sortJson({
    meta: pick(state?.meta, ["schema_version", "goal_type", "product_goal_complete", "acceptance_target_status", "audit_task_complete"]),
    sources: normalizeSources(state?.sources ?? {}),
    context: state?.context ?? {},
    delivery: state?.delivery ?? {},
    graph: state?.graph ?? {},
    slices: normalizeList(state?.slices ?? []),
    evidence: normalizeList(state?.evidence ?? []),
    gates: state?.gates ?? {},
    progress: state?.progress ?? {},
    blockers: state?.blockers ?? [],
    final: state?.final ?? {}
  });
}

export function compareNormalizedRuns(baseline, current) {
  const allDiffs = diffValues(baseline, current);
  const allowedDiffs = [];
  const rejectedDiffs = [];
  for (const diff of allDiffs) {
    if (isAllowedDiffPath(diff.path)) {
      allowedDiffs.push({ ...diff, reason: "allowed volatile workflow metadata or renamed public surface" });
    } else {
      rejectedDiffs.push(diff);
    }
  }
  return {
    semanticDiffs: rejectedDiffs,
    allowedDiffs,
    rejectedDiffs
  };
}

export function buildEquivalenceReport(input) {
  return `## Equivalence Result
- Verdict: ${input.verdict}
- Baseline commit: ${input.baselineCommit}
- Current commit: ${input.currentCommit}
- Fixture count: ${input.fixtureCount}
- Semantic diff count: ${input.semanticDiffCount}
- Allowed diff count: ${input.allowedDiffCount}
- Rejected diff count: ${input.rejectedDiffCount}

${baselineSemanticsSection(input)}

## State Kernel Parity
- task-state graph: ${input.checks.taskStateGraph}
- evidence semantics: ${input.checks.evidenceSemantics}
- derived views: ${input.checks.derivedViews}
- gates: ${input.checks.gates}
- product_goal_complete: ${input.checks.productGoalComplete}

## Negative Case Parity
- strict PI/AC parser: ${input.checks.strictParser}
- scope conflict blocker: ${input.checks.scopeConflictBlocker}
- sample-only full population blocker: ${input.checks.sampleOnlyFullPopulationBlocker}
- hand-set completion blocker: ${input.checks.handSetCompletionBlocker}

## Goal / Protocol Runtime
- thin goal not weakened: ${input.checks.thinGoal}
- workflow-protocol snapshot: ${input.checks.workflowProtocol}
- execution-binding: ${input.checks.executionBinding}
- Codex fresh-session smoke: ${input.checks.codexFreshSessionSmoke}

## Conclusion
${input.conclusion}
`;
}

function baselineSemanticsSection(input) {
  const fixedFullPopulationBaseline = /^df03307c6ee4a3740def6e32c1c6b958bf59acf7\b/i.test(input.baselineCommit ?? "");
  if (fixedFullPopulationBaseline) {
    return `## Baseline Semantics
- Baseline type: fixed Superpowers Long-Task baseline.
- Semantic correction: df03307c6ee4a3740def6e32c1c6b958bf59acf7 fixed a pre-existing semantic hole where sample-only evidence could incorrectly satisfy full_population final completion.
- Equivalence meaning: Composite Long-Task Workflow is equivalent to this fixed baseline, not to the pre-fix buggy baseline.`;
  }
  return `## Baseline Semantics
- Baseline type: comparison baseline.
- Semantic correction: none declared by this report.
- Equivalence meaning: this report compares current behavior to the specified baseline commit only. If that baseline includes semantic corrections, do not describe the result as pure verification or as equivalence to earlier pre-baseline behavior.`;
}

export function normalizeGates(gates) {
  return sortJson(
    Object.fromEntries(
      Object.entries(gates).map(([name, result]) => [
        name,
        {
          exit_code: result.status,
          product_goal_complete: parseProductGoalComplete(`${result.stdout}\n${result.stderr}`),
          category: categorizeCommandOutput(`${result.stdout}\n${result.stderr}`)
        }
      ])
    )
  );
}

export function toComparable(side) {
  return {
    fixtures: sortJson(
      Object.fromEntries(
        Object.entries(side.fixtures).map(([fixtureId, fixture]) => [
          fixtureId,
          {
            task_state: fixture.task_state,
            derived: fixture.derived,
            gates: fixture.gates
          }
        ])
      )
    )
  };
}

export function normalizeText(value) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[A-Za-z]:[\\/][^\s)"']+/g, "<absolute-path>")
    .replace(/\\/g, "/")
    .replace(/ty-context superpowers/g, "ty-context <workflow-command>")
    .replace(/ty-context composite-long-task/g, "ty-context <workflow-command>")
    .trimEnd();
}

export function categorizeCommandOutput(text) {
  if (/list-style definition is not allowed/i.test(text)) return "strict_parse_list_style";
  if (/duplicate definition/i.test(text)) return "strict_parse_duplicate_heading";
  if (/table fields are not supported/i.test(text)) return "strict_parse_table_field";
  if (/field headings are not supported/i.test(text)) return "strict_parse_field_heading";
  if (/scope_conflict_requires_decision/i.test(text)) return "scope_conflict_requires_decision";
  if (/product_goal_complete=true but required plan items|completion conditions require/i.test(text)) return "hand_set_completion_blocker";
  if (/full[-_ ]?population.*does not prove|sample[-_ ]?(only )?evidence|sample_only_full_population/i.test(text)) return "sample_only_full_population";
  if (/product_goal_complete=false/i.test(text)) return "product_goal_incomplete";
  if (/product_goal_complete=true/i.test(text)) return "product_goal_complete";
  return "none";
}

export function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function slash(value) {
  return value.replace(/\\/g, "/");
}

function normalizeSources(sources) {
  return sortJson(
    Object.fromEntries(
      Object.entries(sources).map(([key, source]) => [
        key,
        {
          path: source.path,
          authority: source.authority
        }
      ])
    )
  );
}

function normalizeList(values) {
  return values.map((value) => normalizeValue(value));
}

function normalizeValue(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, key));
  }
  if (!isRecord(value)) {
    return typeof value === "string" ? normalizeStringValue(value, key) : value;
  }
  const output = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (["created_at", "updated_at", "task_id", "sha256"].includes(childKey)) {
      continue;
    }
    output[childKey] = normalizeValue(childValue, childKey);
  }
  return sortJson(output);
}

function normalizeStringValue(value, key) {
  if (key === "artifact_paths" || /(^[A-Za-z]:[\\/])|tmp[\\/]ty-context[\\/]plan-acceptance/.test(value)) {
    return `<normalized-path>/${path.basename(value.replace(/\\/g, "/"))}`;
  }
  return normalizeText(value);
}

function parseProductGoalComplete(text) {
  if (/product_goal_complete=false/i.test(text)) return false;
  if (/product_goal_complete=true/i.test(text)) return true;
  return null;
}

function isAllowedDiffPath(pathValue) {
  return /generated_at|protocol_|goal-objective|workflow-protocol|execution-binding|command name|Skill name|\/gates\/render_goal\b/i.test(pathValue);
}

function diffValues(left, right, currentPath = "") {
  if (Object.is(left, right)) {
    return [];
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return [{ path: currentPath || "/", baseline: left, current: right }];
    }
    return left.flatMap((item, index) => diffValues(item, right[index], `${currentPath}/${index}`));
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return [{ path: currentPath || "/", baseline: left, current: right }];
    }
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return keys.flatMap((key) => diffValues(left[key], right[key], `${currentPath}/${key}`));
  }
  return [{ path: currentPath || "/", baseline: left, current: right }];
}

function pick(value, keys) {
  const record = isRecord(value) ? value : {};
  return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
}
