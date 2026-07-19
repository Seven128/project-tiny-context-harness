import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_GOLD_SET_PATH,
  DEFAULT_PLAN_PATH,
  DEFAULT_SCENARIOS_ROOT,
  VALID_STAGES,
  VALID_TRACK_STATUSES,
  assertUnique,
  isCommitSha,
  isKey,
  isRecord,
  nonEmpty,
  parseJson,
  readJson,
  sha256,
  validateReadyTrackEpisodeCoverage,
} from "./agent-benchmark-shared.mjs";

export async function loadAgentBenchmarkAssets(options = {}) {
  const planPath = path.resolve(options.planPath ?? DEFAULT_PLAN_PATH);
  const goldSetPath = path.resolve(
    options.goldSetPath ?? DEFAULT_GOLD_SET_PATH,
  );
  const scenariosRoot = path.resolve(
    options.scenariosRoot ?? DEFAULT_SCENARIOS_ROOT,
  );
  const [planText, goldSetText] = await Promise.all([
    readFile(planPath, "utf8"),
    readFile(goldSetPath, "utf8"),
  ]);
  const plan = parseJson(planText, planPath);
  const goldSet = parseJson(goldSetText, goldSetPath);
  const validation = await validateAgentBenchmarkAssets(plan, goldSet, {
    scenariosRoot,
  });
  if (validation.errors.length > 0)
    throw new Error(
      `agent_benchmark_assets_invalid:\n${validation.errors.join("\n")}`,
    );
  return {
    plan,
    goldSet,
    planPath,
    goldSetPath,
    scenariosRoot,
    planSha256: sha256(planText),
    goldSetSha256: sha256(goldSetText),
    warnings: validation.warnings,
  };
}

export async function validateAgentBenchmarkAssets(
  plan,
  goldSet,
  options = {},
) {
  const errors = [];
  const warnings = [];
  const scenariosRoot = path.resolve(
    options.scenariosRoot ?? DEFAULT_SCENARIOS_ROOT,
  );
  if (!isRecord(plan)) return { errors: ["plan must be an object"], warnings };
  if (!isRecord(goldSet))
    return { errors: ["gold set must be an object"], warnings };
  validateHeaders(plan, goldSet, errors);
  validateFixedConditions(plan.fixed_conditions, errors);

  const availableScenarios = new Set(
    existsSync(scenariosRoot)
      ? (await readdir(scenariosRoot, { withFileTypes: true }))
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [],
  );
  if (availableScenarios.size === 0)
    errors.push(`no scenarios found under ${scenariosRoot}`);
  validateTracks(plan.tracks, availableScenarios, errors);
  await validateEpisodes(
    goldSet.episodes,
    scenariosRoot,
    availableScenarios,
    errors,
  );
  validateReadyTrackEpisodeCoverage(plan.tracks, goldSet.episodes, errors);
  validateCoverage(goldSet.coverage, goldSet.episodes, errors, warnings);
  return { errors, warnings };
}

function validateHeaders(plan, goldSet, errors) {
  if (plan.schema_version !== "tiny-context-agent-benchmark-plan-v1")
    errors.push(
      "plan.schema_version must be tiny-context-agent-benchmark-plan-v1",
    );
  if (goldSet.schema_version !== "tiny-context-agent-gold-set-v1")
    errors.push(
      "goldSet.schema_version must be tiny-context-agent-gold-set-v1",
    );
  if (!isCommitSha(plan.baseline_commit))
    errors.push("plan.baseline_commit must be a 40-character Git commit SHA");
  if (goldSet.baseline_commit !== plan.baseline_commit)
    errors.push("goldSet.baseline_commit must equal plan.baseline_commit");
  if (goldSet.operator_only !== true)
    errors.push("goldSet.operator_only must be true");
}

function validateFixedConditions(fixed, errors) {
  if (!isRecord(fixed)) {
    errors.push("plan.fixed_conditions must be an object");
    return;
  }
  for (const flag of [
    "fresh_session_per_run",
    "fresh_session_per_stage",
    "same_model_within_pair",
    "same_reasoning_within_pair",
    "same_prompt_scope_within_pair",
    "same_quality_bar_within_pair",
    "gold_set_operator_only",
  ])
    if (fixed[flag] !== true)
      errors.push(`plan.fixed_conditions.${flag} must be true`);
  if (
    !Number.isInteger(fixed.minimum_paired_runs) ||
    fixed.minimum_paired_runs < 3
  )
    errors.push(
      "plan.fixed_conditions.minimum_paired_runs must be an integer >= 3",
    );
}

function validateTracks(tracksValue, availableScenarios, errors) {
  const tracks = Array.isArray(tracksValue) ? tracksValue : [];
  if (tracks.length === 0) errors.push("plan.tracks must be non-empty");
  assertUnique(tracks, "id", "plan track", errors);
  for (const track of tracks) {
    if (!isRecord(track)) {
      errors.push("every plan track must be an object");
      continue;
    }
    if (!isKey(track.id)) errors.push(`invalid plan track id: ${track.id}`);
    if (!VALID_TRACK_STATUSES.has(track.status))
      errors.push(`invalid status for track ${track.id}: ${track.status}`);
    const scenarios = Array.isArray(track.scenarios) ? track.scenarios : [];
    if (!Array.isArray(track.scenarios))
      errors.push(`track ${track.id} scenarios must be an array`);
    for (const scenario of scenarios)
      if (!availableScenarios.has(scenario))
        errors.push(`track ${track.id} references unknown scenario ${scenario}`);
    if (track.status === "agent_run_ready" && scenarios.length === 0)
      errors.push(`agent-run-ready track ${track.id} must name scenarios`);
    if (!isRecord(track.admission))
      errors.push(`track ${track.id} admission must be an object`);
  }
}

async function validateEpisodes(
  episodesValue,
  scenariosRoot,
  availableScenarios,
  errors,
) {
  const episodes = Array.isArray(episodesValue) ? episodesValue : [];
  if (episodes.length === 0) errors.push("goldSet.episodes must be non-empty");
  assertUnique(episodes, "id", "gold-set episode", errors);
  const rubricIdsByScenario = new Map();
  const validatedStageAssets = new Set();
  for (const episode of episodes) {
    if (!isRecord(episode)) {
      errors.push("every gold-set episode must be an object");
      continue;
    }
    if (!isKey(episode.id)) errors.push(`invalid episode id: ${episode.id}`);
    if (!availableScenarios.has(episode.scenario)) {
      errors.push(
        `episode ${episode.id} references unknown scenario ${episode.scenario}`,
      );
      continue;
    }
    validateEpisodeShape(episode, errors);
    validateScenarioStageAssets(
      scenariosRoot,
      episode,
      validatedStageAssets,
      errors,
    );
    let rubricIds = rubricIdsByScenario.get(episode.scenario);
    if (!rubricIds) {
      rubricIds = await readScenarioRubricIds(
        scenariosRoot,
        episode.scenario,
        errors,
      );
      rubricIdsByScenario.set(episode.scenario, rubricIds);
    }
    for (const rubricId of episode.required_rubric_ids ?? [])
      if (!rubricIds.has(rubricId))
        errors.push(
          `episode ${episode.id} references unknown rubric id ${rubricId}`,
        );
  }
}

function validateScenarioStageAssets(
  scenariosRoot,
  episode,
  validated,
  errors,
) {
  const scenarioRoot = path.join(scenariosRoot, episode.scenario);
  const required = [
    "requirements.md",
    "acceptance_criteria.md",
    "quality_probe.mjs",
    ...(episode.stage === "recovery"
      ? ["recovery_checkpoint.md", "recovery_answer_key.json"]
      : episode.stage === "rfc"
        ? ["rfc_change.md"]
        : episode.stage === "debug"
          ? ["debug_fix.md"]
          : []),
  ];
  for (const name of required) {
    const key = `${episode.scenario}:${name}`;
    if (validated.has(key)) continue;
    validated.add(key);
    if (!existsSync(path.join(scenarioRoot, name)))
      errors.push(
        `episode ${episode.id} requires missing scenario asset ${name}`,
      );
  }
}

function validateEpisodeShape(episode, errors) {
  if (!VALID_STAGES.has(episode.stage))
    errors.push(`episode ${episode.id} has invalid stage ${episode.stage}`);
  if (!Array.isArray(episode.task_tags) || episode.task_tags.length === 0)
    errors.push(`episode ${episode.id} task_tags must be non-empty`);
  if (!["none", "required"].includes(episode.expected_context_delta))
    errors.push(
      `episode ${episode.id} expected_context_delta must be none or required`,
    );
  for (const field of [
    "required_rubric_ids",
    "controlling_fact_topics",
    "required_verification_topics",
  ])
    if (!Array.isArray(episode[field]) || episode[field].length === 0)
      errors.push(`episode ${episode.id} ${field} must be non-empty`);
}

function validateCoverage(coverage, episodesValue, errors, warnings) {
  if (!isRecord(coverage)) {
    errors.push("goldSet.coverage must be an object");
    return;
  }
  if (!Array.isArray(coverage.covered_task_tags))
    errors.push("goldSet.coverage.covered_task_tags must be an array");
  if (!Array.isArray(coverage.known_gaps))
    errors.push("goldSet.coverage.known_gaps must be an array");
  assertUnique(coverage.known_gaps ?? [], "id", "gold-set coverage gap", errors);
  for (const gap of coverage.known_gaps ?? [])
    if (!isRecord(gap) || !isKey(gap.id) || !nonEmpty(gap.reason))
      errors.push("every gold-set coverage gap needs id and reason");
  const episodes = Array.isArray(episodesValue) ? episodesValue : [];
  const coveredTags = new Set(
    episodes.flatMap((episode) => episode.task_tags ?? []),
  );
  for (const tag of coverage.covered_task_tags ?? [])
    if (!coveredTags.has(tag))
      warnings.push(
        `coverage tag ${tag} is declared but not used by a gold-set episode`,
      );
}

async function readScenarioRubricIds(scenariosRoot, scenario, errors) {
  const rubricPath = path.join(scenariosRoot, scenario, "rubric.json");
  try {
    const rubric = await readJson(rubricPath);
    const ids = new Set();
    for (const checks of Object.values(rubric.sections ?? {}))
      if (Array.isArray(checks))
        for (const check of checks)
          if (isRecord(check) && nonEmpty(check.id)) ids.add(check.id);
    return ids;
  } catch (error) {
    errors.push(
      `cannot read rubric for scenario ${scenario}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return new Set();
  }
}
