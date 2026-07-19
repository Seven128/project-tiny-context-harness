import {
  SESSION_STAGES,
  VALID_ROLES,
  isCommitSha,
  isKey,
  isRecord,
  isSha256,
  nonEmpty,
  sha256,
} from "./agent-benchmark-shared.mjs";
export function validateRunAgainstAssets(metadata, assets, errors) {
  if (!isRecord(metadata)) return;
  if (metadata.plan_sha256 !== assets.planSha256)
    errors.push("agent-run plan_sha256 does not match operator plan");
  if (metadata.gold_set_sha256 !== assets.goldSetSha256)
    errors.push("agent-run gold_set_sha256 does not match operator gold set");
  const track = assets.plan.tracks.find(
    (candidate) => candidate.id === metadata.track_id,
  );
  if (!track || track.status !== "agent_run_ready")
    errors.push("agent-run track is not agent-run-ready in the operator plan");
  else if (!track.scenarios.includes(metadata.scenario))
    errors.push("agent-run scenario is not covered by its operator-plan track");
  if (
    metadata.role === "control" &&
    metadata.harness_commit !== assets.plan.baseline_commit
  )
    errors.push("control run does not use the fixed operator baseline commit");
  const episodes = assets.goldSet.episodes
    .filter((episode) => episode.scenario === metadata.scenario)
    .map((episode) => episode.id);
  if (JSON.stringify(metadata.gold_set_episode_ids) !== JSON.stringify(episodes))
    errors.push("agent-run gold-set episode ids do not match operator assets");
  if (metadata.quality_bar_id !== `${metadata.scenario}:${assets.goldSetSha256}`)
    errors.push("agent-run quality_bar_id does not match operator assets");
}

export function validateRunMetadata(metadata, errors) {
  if (!isRecord(metadata)) {
    errors.push("agent-run.json must be an object");
    return;
  }
  if (metadata.schema_version !== "tiny-context-agent-run-v1")
    errors.push("agent-run.json has unsupported schema_version");
  if (!isKey(metadata.track_id)) errors.push("agent-run track_id is invalid");
  if (!VALID_ROLES.has(metadata.role)) errors.push("agent-run role is invalid");
  if (!isKey(metadata.variant_id)) errors.push("agent-run variant_id is invalid");
  if (!isKey(metadata.scenario)) errors.push("agent-run scenario is invalid");
  if (!Number.isInteger(metadata.run_index) || metadata.run_index < 1)
    errors.push("agent-run run_index must be a positive integer");
  for (const field of [
    "harness_commit",
    "prepared_repository_commit",
    "prepared_repository_tree",
  ])
    if (!isCommitSha(metadata[field])) errors.push(`agent-run ${field} is invalid`);
  if (metadata.harness_checkout_clean !== true)
    errors.push("agent-run Harness checkout must be clean");
  for (const field of ["harness_cli_path", "model", "reasoning"])
    if (!nonEmpty(metadata[field])) errors.push(`agent-run ${field} is required`);
  for (const field of [
    "prompt_sha256",
    "plan_sha256",
    "gold_set_sha256",
    "harness_cli_sha256",
    "agent_benchmark_tool_sha256",
    "operator_assets_sha256",
  ])
    if (!isSha256(metadata[field])) errors.push(`agent-run ${field} is invalid`);
  validateHashProjection(
    metadata.agent_benchmark_tool_hashes,
    metadata.agent_benchmark_tool_sha256,
    "agent benchmark tool",
    false,
    errors,
  );
  validateHashProjection(
    metadata.operator_asset_hashes,
    metadata.operator_assets_sha256,
    "operator asset",
    true,
    errors,
  );
  validateStageMetadata(metadata, errors);
  if (metadata.session_requirement !== "fresh_independent_session_per_stage")
    errors.push("agent-run must require a fresh independent session per stage");
}

function validateHashProjection(hashes, expected, label, allowNull, errors) {
  if (!isRecord(hashes)) {
    errors.push(`agent-run ${label} hashes must be an object`);
    return;
  }
  for (const [file, hash] of Object.entries(hashes))
    if (!nonEmpty(file) || (!isSha256(hash) && !(allowNull && hash === null)))
      errors.push(`agent-run ${label} hash is invalid: ${file}`);
  if (sha256(JSON.stringify(hashes)) !== expected)
    errors.push(`agent-run ${label} hash projection is inconsistent`);
}

function validateStageMetadata(metadata, errors) {
  if (
    !Array.isArray(metadata.expected_stages) ||
    metadata.expected_stages.length === 0 ||
    metadata.expected_stages[0] !== "INITIAL_DELIVERY" ||
    metadata.expected_stages.some((stage) => !SESSION_STAGES.includes(stage)) ||
    new Set(metadata.expected_stages).size !== metadata.expected_stages.length
  )
    errors.push("agent-run expected_stages are invalid");
  if (
    !Array.isArray(metadata.gold_set_episode_ids) ||
    metadata.gold_set_episode_ids.some((id) => !isKey(id)) ||
    new Set(metadata.gold_set_episode_ids).size !==
      metadata.gold_set_episode_ids.length ||
    metadata.gold_set_episode_count !== metadata.gold_set_episode_ids.length
  )
    errors.push("agent-run gold-set episode projection is invalid");
}
