import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonical, listFiles, normalize, sha256 } from "./shared.mjs";

export async function authoringMetrics(runDir, task, gold, agentResult) {
  const workdir = path.join(runDir, ...normalize(task.workdir).split("/"));
  const contractPath = path.join(workdir, "delivery-contract.yaml");
  const contractText = existsSync(contractPath) ? await readFile(contractPath, "utf8") : "";
  const compiled = await findCompiledContract(workdir);
  const events = await readNdjson(path.join(runDir, ".benchmark", "ty-context-events.ndjson"));
  const evidence = collectEvidence(events, agentResult, compiled);
  const goldResult = evaluateGold(compiled, gold);
  const authorityProjection = projectAuthority(compiled);
  return {
    contract_present: Boolean(contractText),
    contract_path: normalize(path.relative(runDir, contractPath)),
    ...measureContract(contractText),
    ...evidence,
    canonical_authority_fingerprint: authorityProjection ? sha256(authorityProjection) : null,
    authority_projection: authorityProjection,
    proof_surfaces: [...goldResult.proofSurfaces].sort(),
    risk_facts: goldResult.riskFacts,
    gold_compliance: goldResult.compliance,
    gold_compliance_passed: Object.values(goldResult.compliance).every(Boolean)
  };
}

function collectEvidence(events, agentResult, compiled) {
  const observedPreflights = events.filter((event) => event.command === "long-task preflight");
  const observedCompiles = events.filter((event) => event.command === "long-task compile");
  const recordedPreflights = Array.isArray(agentResult.preflight_reports) ? agentResult.preflight_reports : [];
  const preflights = observedPreflights.length ? observedPreflights.map(preflightResult) : recordedPreflights;
  const lastPreflight = preflights.at(-1) ?? null;
  const lastCompile = observedCompiles.at(-1) ?? null;
  return {
    preflight_rounds: preflights.length,
    preflight_evidence_source: observedPreflights.length ? "runner_observed_cli" : "agent_recorded_json",
    last_preflight_status: lastPreflight?.status ?? null,
    preflight_ready: lastPreflight?.status === "ready",
    compile_invocations: observedCompiles.length,
    compile_evidence_source: observedCompiles.length ? "runner_observed_cli_plus_compiled_file" : "compiled_file_only",
    compile_success: Boolean(compiled) && (!lastCompile || lastCompile.status === 0),
    compiled_file: compiled?._file ?? null
  };
}

function preflightResult(event) {
  if (event.parsed_result) return event.parsed_result;
  return { status: event.status === 0 ? "ready" : "not_ready" };
}

function evaluateGold(compiled, gold) {
  const sourceItems = compiled?.source_items ?? [];
  const sourceKeys = new Set(sourceItems.map((item) => item.key));
  const expectedKeys = new Set(gold.source_keys);
  const proofSurfaces = collectProofSurfaces(compiled);
  const externalItems = compiled?.global?.acceptance?.external_confirmations ?? [];
  const externalKeys = new Set(externalItems.map((item) => item.key));
  const riskFacts = compiled?.risk?.facts ?? deriveRiskFacts(sourceItems);
  const expectedRiskFacts = fillRiskFacts(gold.risk_facts, riskFacts);
  const compliance = {
    source_keys_exact: sourceItems.length === expectedKeys.size && sameSet(sourceKeys, expectedKeys),
    source_kinds_exact: sourceItems.length === Object.keys(gold.source_kinds).length
      && sourceItems.every((item) => gold.source_kinds[item.key] === item.kind),
    risk_facts_exact: JSON.stringify(canonical(riskFacts)) === JSON.stringify(canonical(expectedRiskFacts)),
    required_proof_surfaces_present: gold.required_proof_surfaces.every((surface) => proofSurfaces.has(surface)),
    external_confirmations_present: gold.external_confirmations.every((key) => externalKeys.has(key))
  };
  return { compliance, proofSurfaces, riskFacts };
}

function collectProofSurfaces(compiled) {
  const globalChecks = compiled?.global?.acceptance?.checks ?? [];
  const outcomeChecks = (compiled?.outcomes ?? []).flatMap((outcome) => outcome.acceptance?.checks ?? []);
  return new Set([...globalChecks, ...outcomeChecks].map((check) => check.proof_surface));
}

function projectAuthority(compiled) {
  if (!compiled) return null;
  return {
    authority_hashes: compiled.authority_hashes ?? null,
    authority_materials: compiled.authority_materials ?? null,
    effective_risk: compiled.effective_risk ?? null,
    risk_reasons: compiled.risk_reasons ?? [],
    claim_coverage: compiled.claim_coverage ?? null,
    source_items: compiled.source_items ?? [],
    risk: compiled.risk ?? null,
    external_confirmations: compiled.global?.acceptance?.external_confirmations ?? []
  };
}

function measureContract(text) {
  return {
    yaml_bytes: Buffer.byteLength(text, "utf8"),
    effective_yaml_lines: text.split(/\r?\n/u).filter((line) => line.trim() && !line.trim().startsWith("#")).length,
    manual_source_ref_count: countSourceClaimField(text, "source_ref"),
    manual_source_statement_count: countSourceClaimField(text, "statement"),
    manual_risk_fact_rows: countRiskRows(text)
  };
}

async function readNdjson(file) {
  if (!existsSync(file)) return [];
  const rows = [];
  for (const line of (await readFile(file, "utf8")).split(/\r?\n/u).filter(Boolean)) {
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

async function findCompiledContract(workdir) {
  if (!existsSync(workdir)) return null;
  for (const file of await listFiles(workdir)) {
    if (!file.endsWith(".json")) continue;
    let value;
    try { value = JSON.parse(await readFile(file, "utf8")); } catch { continue; }
    if (value?.schema_version === "compiled-long-task-delivery-v2") {
      return { ...value, _file: normalize(path.relative(workdir, file)) };
    }
  }
  return null;
}

function deriveRiskFacts(items) {
  const result = {};
  for (const item of items) {
    if (!item.risk_semantics) continue;
    (result[item.risk_semantics.fact] ??= []).push(item.risk_semantics.affected_outcome);
  }
  for (const values of Object.values(result)) values.sort();
  return result;
}

function fillRiskFacts(expected, actual) {
  const result = {};
  for (const key of new Set([...Object.keys(actual ?? {}), ...Object.keys(expected ?? {})])) {
    result[key] = [...(expected?.[key] ?? [])].sort();
  }
  return result;
}

function countSourceClaimField(text, field) {
  const block = topLevelBlock(text, "source_claims");
  return (block.match(new RegExp(`^\\s{4}${field}\\s*:`, "gmu")) ?? []).length;
}

function topLevelBlock(text, key) {
  const match = new RegExp(`(?:^|\\n)${key}:\\s*\\n([\\s\\S]*?)(?=\\n[^ \\t\\n][^:\n]*:|$)`, "u").exec(text);
  return match?.[1] ?? "";
}

function countRiskRows(text) {
  const match = /\nrisk:\s*\n([\s\S]*?)(?=\n\S|$)/u.exec(`\n${text}`)?.[1] ?? "";
  return (match.match(/^\s{4}[a-z_]+\s*:/gmu) ?? []).length;
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}
