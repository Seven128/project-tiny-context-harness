import path from "node:path";
import { ensureDir, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { stableJson, loadSuperpowersState } from "./superpowers-task-state.js";
import { evaluateProofLayerAssertions, type AssertionStatus } from "./superpowers-task-assertions.js";
import { type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface DerivedSuperpowersArtifacts {
  matrix: Record<string, unknown>;
  verdict: Record<string, unknown>;
  files: string[];
}

export async function deriveSuperpowersArtifacts(workdir: string): Promise<DerivedSuperpowersArtifacts> {
  const state = await loadSuperpowersState(workdir);
  const derived = deriveObjects(state);
  const derivedDir = path.join(workdir, "derived");
  await ensureDir(derivedDir);
  const files: string[] = [];
  await writeDerived(files, path.join(derivedDir, "plan-conformance-matrix.json"), stableJson(derived.matrix));
  await writeDerived(files, path.join(derivedDir, "final-acceptance-verdict.json"), stableJson(derived.verdict));
  await writeDerived(files, path.join(derivedDir, "progress-ledger.json"), stableJson(derived.progress));
  await writeDerived(files, path.join(derivedDir, "evidence-index.json"), stableJson(deriveEvidenceIndex(state)));
  await writeDerived(files, path.join(derivedDir, "plan-conformance-matrix.md"), matrixMarkdown(derived.matrix));
  await writeDerived(files, path.join(derivedDir, "final-acceptance-verdict.md"), verdictMarkdown(derived.verdict));
  await writeDerived(files, path.join(derivedDir, "local-audit.md"), localAuditMarkdown(state));
  await writeDerived(files, path.join(derivedDir, "progress-ledger.md"), progressMarkdown(derived.progress));
  await writeDerived(files, path.join(derivedDir, "evidence-index.md"), evidenceMarkdown(state));
  await writeDerived(files, path.join(derivedDir, "context-alignment.md"), contextMarkdown(state));
  await writeDerived(files, path.join(derivedDir, "final-summary.md"), finalSummaryMarkdown(state, derived.verdict));
  return { matrix: derived.matrix, verdict: derived.verdict, files };
}

export function deriveObjects(state: SuperpowersTaskState): {
  matrix: Record<string, unknown>;
  verdict: Record<string, unknown>;
  progress: Record<string, unknown>;
} {
  const matrixRows = Object.entries(state.graph.plan_items).map(([planItemId, item]) => {
    const relatedAcs = item.related_acs;
    const requiredLayers = item.required_proof_layers;
    const assertionSummary = assertionSummaryForLayers(state, requiredLayers);
    const missingLayers = requiredLayers.filter((layerId) => state.graph.proof_layers[layerId]?.status !== "satisfied" || evaluateProofLayerAssertions(state, layerId).assertion_status === "failed" || evaluateProofLayerAssertions(state, layerId).assertion_status === "missing" || evaluateProofLayerAssertions(state, layerId).assertion_status === "stale");
    const evidenceIds = evidenceForLayers(state, requiredLayers);
    const invalidEvidence = invalidEvidenceSignals(assertionSummary);
    return {
      plan_item_id: planItemId,
      plan_requirement: item.requirement,
      acceptance_ids: relatedAcs,
      status: missingLayers.length === 0 && requiredLayers.length > 0 ? "complete" : evidenceIds.length > 0 ? "partial" : item.status,
      delivery_scope: item.delivery_scope,
      capability_target: item.capability_target,
      representative_samples: item.representative_samples,
      full_population_boundary: item.full_population_boundary,
      non_required_population: item.non_required_population,
      owner_boundary: item.owner_boundary,
      primary_capability_path: item.primary_capability_path,
      trigger_contract: item.trigger_contract,
      state_transition_contract: item.state_transition_contract,
      observable_result_contract: item.observable_result_contract,
      assertion_support: item.assertion_support,
      required_assertion_commands: item.required_assertion_commands,
      invalid_implementation_shortcuts: item.invalid_implementation_shortcuts,
      blockers: item.blockers ?? [],
      conformance_type: item.owner_surfaces.length > 0 ? "product_surface" : "implementation",
      owner_surface: item.owner_surfaces[0] ?? "",
      forbidden_primary_surfaces: item.forbidden_surfaces,
      negative_surface_checks: item.forbidden_surfaces.map((surface) => `confirmed ${surface} is not the owner surface`),
      default_visibility_required: item.owner_surfaces.length > 0,
      real_page_evidence: evidenceText(state, evidenceIds, "browser"),
      context_fact_refs: [],
      expected_surfaces: item.owner_surfaces.length > 0 ? ["ui", "runtime"] : ["code"],
      implemented_paths: item.implementation_paths,
      missing_paths: [],
      tests: item.required_tests,
      runtime_evidence: evidenceText(state, evidenceIds, "runtime"),
      artifact_evidence: evidenceText(state, evidenceIds, "artifact"),
      required_proof_layers: requiredLayers,
      satisfied_proof_layers: requiredLayers.filter((layerId) => state.graph.proof_layers[layerId]?.status === "satisfied"),
      missing_required_layers: missingLayers,
      assertion_status: assertionSummary.assertion_status,
      blocking_assertion_failures: assertionSummary.blocking_assertion_failures,
      negative_evidence_findings: assertionSummary.negative_evidence_findings,
      invalid_evidence: invalidEvidence,
      forbidden_shortcuts_hit: invalidEvidence.filter((item) => /forbidden shortcut|cannot satisfy/i.test(item)),
      evidence_ids: evidenceIds,
      scope_assessment: missingLayers.length === 0 ? "full" : "partial",
      drift: missingLayers.length === 0 ? "no drift detected" : "missing required proof layers",
      decision: missingLayers.length === 0 ? "accept" : "continue"
    };
  });
  const verdictRows = Object.entries(state.graph.acceptance_criteria).map(([acId, ac]) => {
    const requiredLayers = ac.required_proof_layers.map((layer) => `${acId}.${layer}`);
    const assertionSummary = assertionSummaryForLayers(state, requiredLayers);
    const missingLayers = requiredLayers.filter((layerId) => state.graph.proof_layers[layerId]?.status !== "satisfied" || evaluateProofLayerAssertions(state, layerId).assertion_status === "failed" || evaluateProofLayerAssertions(state, layerId).assertion_status === "missing" || evaluateProofLayerAssertions(state, layerId).assertion_status === "stale");
    const evidenceIds = evidenceForLayers(state, requiredLayers);
    const status = missingLayers.length === 0 && requiredLayers.length > 0 ? "complete" : evidenceIds.length > 0 ? "partial" : ac.status;
    const invalidCompletionSignals = invalidEvidenceSignals(assertionSummary);
    return {
      ac_id: acId,
      related_plan_item_ids: ac.related_plan_items,
      status,
      acceptance_scope: ac.acceptance_scope,
      ac_validates: ac.ac_validates,
      ac_does_not_validate: ac.ac_does_not_validate,
      sample_boundary: ac.sample_boundary,
      full_population_required: ac.full_population_required,
      full_population_status: ac.full_population_required === true || ac.acceptance_scope === "full_population_operation" ? status : "not_in_scope",
      assertion_command: ac.assertion_command ?? "",
      assertion_artifacts: ac.assertion_artifacts ?? [],
      positive_assertions: ac.positive_assertions ?? [],
      negative_assertions: ac.negative_assertions ?? [],
      machine_blocking: ac.machine_blocking ?? false,
      invalid_completion_signals: ac.invalid_completion_signals ?? [],
      assertion_result_required: ac.assertion_result_required ?? false,
      required_evidence: requiredLayers,
      required_proof_chain: requiredLayers,
      fresh_evidence: evidenceText(state, evidenceIds),
      missing_evidence: [],
      missing_required_layers: missingLayers,
      assertion_status: assertionSummary.assertion_status,
      blocking_assertion_failures: assertionSummary.blocking_assertion_failures,
      negative_evidence_findings: assertionSummary.negative_evidence_findings,
      invalid_evidence_findings: invalidCompletionSignals,
      required_next_evidence: requiredNextEvidence(missingLayers, assertionSummary),
      contradictions: [],
      context_fact_refs: [],
      evidence_ids: evidenceIds,
      drift_severity: "none",
      sibling_substitution_used: false,
      auditor_status: auditorStatus(state),
      decision: status === "complete" ? "accept" : "continue"
    };
  });
  const allComplete = verdictRows.length > 0 && verdictRows.every((row) => row.status === "complete");
  const progress = {
    ...state.progress,
    acceptance_progress: {
      status: allComplete ? "complete" : "partial",
      complete_count: verdictRows.filter((row) => row.status === "complete").length,
      required_count: verdictRows.filter((row) => row.status !== "out_of_scope_NA").length
    },
    engineering_implementation_progress: progressStatus(Object.values(state.graph.plan_items).map((item) => item.status)),
    runtime_proof_progress: progressStatus(Object.values(state.graph.proof_layers).map((layer) => layer.status)),
    proof_layer_milestones: Object.entries(state.graph.proof_layers).map(([layerId, layer]) => ({ layer_id: layerId, status: layer.status, evidence_ids: layer.evidence_ids })),
    artifact_budget: { evidence_records: state.evidence.length, artifact_count: state.evidence.reduce((sum, item) => sum + item.artifact_paths.length, 0) },
    workflow_overhead: { slices: state.slices.length, blockers: state.blockers.length },
    complete_count: verdictRows.filter((row) => row.status === "complete").length,
    partial_count: verdictRows.filter((row) => row.status === "partial").length,
    acceptance_required_count: verdictRows.filter((row) => row.status !== "out_of_scope_NA").length,
    missing_layer_count: verdictRows.reduce((sum, row) => sum + (row.missing_required_layers as string[]).length, 0),
    next_clusters: Object.entries(state.graph.proof_layers)
      .filter(([, layer]) => layer.status !== "satisfied")
      .slice(0, 5)
      .map(([layerId]) => layerId)
  };
  return {
    matrix: { overall_status: allComplete ? "complete" : "partial", items: matrixRows },
    verdict: { overall_status: allComplete ? "complete" : "partial", acceptance_items: verdictRows },
    progress
  };
}

function invalidEvidenceSignals(summary: { blocking_assertion_failures: string[]; negative_evidence_findings: string[] }): string[] {
  return [...summary.blocking_assertion_failures, ...summary.negative_evidence_findings].filter((item) =>
    /invalid evidence|forbidden shortcut|cannot satisfy|negative evidence|forbidden text/i.test(item)
  );
}

function requiredNextEvidence(missingLayers: string[], summary: { blocking_assertion_failures: string[]; negative_evidence_findings: string[] }): string[] {
  return [...missingLayers.map((layerId) => `fresh assertion-backed evidence for ${layerId}`), ...summary.blocking_assertion_failures, ...summary.negative_evidence_findings];
}

function progressStatus(statuses: string[]): Record<string, unknown> {
  const complete = statuses.filter((status) => status === "complete" || status === "satisfied").length;
  return { status: statuses.length > 0 && complete === statuses.length ? "complete" : complete > 0 ? "partial" : "not_started", complete, total: statuses.length };
}

export async function derivedMatchesState(workdir: string, state: SuperpowersTaskState): Promise<string[]> {
  const errors: string[] = [];
  const expected = deriveObjects(state);
  await assertDerivedJson(workdir, "plan-conformance-matrix", expected.matrix, errors);
  await assertDerivedJson(workdir, "final-acceptance-verdict", expected.verdict, errors);
  await assertDerivedJson(workdir, "evidence-index", deriveEvidenceIndex(state), errors);
  return errors;
}

export function deriveEvidenceIndex(state: SuperpowersTaskState): Record<string, unknown> {
  const evidenceById = Object.fromEntries(
    (state.evidence ?? []).map((evidence) => [
      evidence.evidence_id,
      {
        evidence_id: evidence.evidence_id,
        schema_version: evidence.schema_version ?? "",
        task_attempt_id: evidence.task_attempt_id ?? "",
        source_bundle_hash: evidence.source_bundle_hash ?? "",
        product_source_hash: evidence.product_source_hash ?? "",
        technical_plan_hash: evidence.technical_plan_hash ?? "",
        acceptance_checklist_hash: evidence.acceptance_checklist_hash ?? "",
        type: evidence.type,
        command_spec_id: evidence.command_spec_id ?? "",
        command_run_id: evidence.command_run_id ?? "",
        command: evidence.command ?? "",
        command_exit_code: evidence.command_exit_code,
        artifact_path: evidence.artifact_path ?? "",
        artifact_sha256: evidence.artifact_sha256 ?? "",
        artifact_mtime: evidence.artifact_mtime ?? "",
        artifact_paths: evidence.artifact_paths,
        target_ac_ids: evidence.target_ac_ids ?? evidence.assertion_result?.target_ac_ids ?? [],
        target_pi_ids: evidence.target_pi_ids ?? evidence.assertion_result?.target_pi_ids ?? [],
        target_proof_layers: evidence.target_proof_layers ?? evidence.assertion_result?.target_proof_layers ?? [],
        proves: evidence.proves,
        does_not_prove: evidence.does_not_prove,
        assertion_result: evidence.assertion_result ?? null,
        negative_evidence_scan: evidence.negative_evidence_scan ?? null,
        freshness: evidence.freshness,
        reviewability: evidence.reviewability,
        redaction: evidence.redaction
      }
    ])
  );
  const proofLayers = Object.fromEntries(
    Object.entries(state.graph.proof_layers ?? {}).map(([layerId, layer]) => {
      const evaluation = evaluateProofLayerAssertions(state, layerId);
      return [
        layerId,
        {
          layer_id: layerId,
          status: layer.status,
          required: layer.required,
          evidence_ids: layer.evidence_ids,
          assertion_status: evaluation.assertion_status,
          blocking_assertion_failures: evaluation.blocking_assertion_failures,
          negative_evidence_findings: evaluation.negative_evidence_findings,
          evidence: layer.evidence_ids.map((evidenceId) => evidenceById[evidenceId]).filter(Boolean)
        }
      ];
    })
  );
  return { proof_layers: proofLayers, evidence: evidenceById };
}

async function assertDerivedJson(workdir: string, basename: string, expected: unknown, errors: string[]): Promise<void> {
  const file = path.join(workdir, "derived", `${basename}.json`);
  if (!(await pathExists(file))) {
    return;
  }
  const actual = JSON.parse(await readText(file));
  if (stableJson(actual) !== stableJson(expected)) {
    errors.push(`derived/${basename}.json does not match task-state.json; rerun ty-context composite-long-task derive`);
  }
}

function evidenceForLayers(state: SuperpowersTaskState, layerIds: string[]): string[] {
  return [...new Set(layerIds.flatMap((layerId) => state.graph.proof_layers[layerId]?.evidence_ids ?? []))];
}

function assertionSummaryForLayers(
  state: SuperpowersTaskState,
  layerIds: string[]
): { assertion_status: AssertionStatus; blocking_assertion_failures: string[]; negative_evidence_findings: string[] } {
  const evaluations = layerIds.map((layerId) => evaluateProofLayerAssertions(state, layerId));
  const applicable = evaluations.filter((item) => item.assertion_status !== "not_applicable");
  const blocking_assertion_failures = applicable.flatMap((item) => item.blocking_assertion_failures);
  const negative_evidence_findings = applicable.flatMap((item) => item.negative_evidence_findings);
  const statuses = applicable.map((item) => item.assertion_status);
  const assertion_status: AssertionStatus =
    applicable.length === 0
      ? "not_applicable"
      : statuses.includes("failed")
        ? "failed"
        : statuses.includes("stale")
          ? "stale"
          : statuses.includes("missing")
            ? "missing"
            : "passed";
  return { assertion_status, blocking_assertion_failures, negative_evidence_findings };
}

function evidenceText(state: SuperpowersTaskState, evidenceIds: string[], type?: string): string[] {
  return evidenceIds
    .map((evidenceId) => state.evidence.find((item) => item.evidence_id === evidenceId))
    .filter((item) => item && (!type || evidenceTypeMatches(item.type, type) || (type === "artifact" && item.artifact_paths.length > 0)))
    .map((item) => {
      const artifacts = item?.artifact_paths.join(", ");
      return `${item?.type} ${item?.command ?? ""} ${artifacts}`.trim();
    });
}

function evidenceTypeMatches(actual: string, expected: string): boolean {
  return actual === expected || actual.includes(expected) || (expected === "browser" && /\b(playwright|ui_browser|browser)_assertion\b/.test(actual));
}

function auditorStatus(state: SuperpowersTaskState): string {
  const auditor = state.gates.auditor;
  if (auditor && typeof auditor === "object" && !Array.isArray(auditor) && typeof (auditor as Record<string, unknown>).auditor_status === "string") {
    return String((auditor as Record<string, unknown>).auditor_status);
  }
  return "not_run";
}

async function writeDerived(files: string[], file: string, content: string): Promise<void> {
  await writeTextIfChanged(file, `${content.trimEnd()}\n`);
  files.push(file.split(path.sep).join("/"));
}

function matrixMarkdown(matrix: Record<string, unknown>): string {
  const rows = (matrix.items as Record<string, unknown>[] | undefined) ?? [];
  return ["# Plan Conformance Matrix", "", ...rows.map((row) => `- ${row.plan_item_id}: ${row.status}`)].join("\n");
}

function verdictMarkdown(verdict: Record<string, unknown>): string {
  const rows = (verdict.acceptance_items as Record<string, unknown>[] | undefined) ?? [];
  const complete = rows.filter((row) => row.status === "complete").length;
  const partial = rows.filter((row) => row.status === "partial").length;
  const required = rows.filter((row) => row.status !== "out_of_scope_NA").length;
  const missing = rows.reduce((sum, row) => sum + (((row.missing_required_layers as unknown[]) ?? []).length), 0);
  return `# Final Acceptance Verdict

<!-- generated:active-counts:start -->
complete_count: ${complete}
partial_count: ${partial}
acceptance_required_count: ${required}
missing_layer_count: ${missing}
<!-- generated:active-counts:end -->

${rows.map((row) => `- ${row.ac_id}: ${row.status}`).join("\n")}
`;
}

function localAuditMarkdown(state: SuperpowersTaskState): string {
  return `# Local Audit

audit_task_complete: ${state.final.audit_task_complete}
acceptance_target_status: ${state.final.acceptance_target_status}
product_goal_complete: ${state.final.product_goal_complete}
`;
}

function progressMarkdown(progress: Record<string, unknown>): string {
  return `# Progress Ledger

\`\`\`json
${stableJson(progress)}
\`\`\`
`;
}

function evidenceMarkdown(state: SuperpowersTaskState): string {
  const index = deriveEvidenceIndex(state);
  const layers = Object.values(index.proof_layers as Record<string, Record<string, unknown>>);
  return [
    "# Evidence Index",
    "",
    ...layers.map((item) => {
      const evidenceIds = (item.evidence_ids as string[] | undefined) ?? [];
      return `- ${item.layer_id}: ${item.assertion_status}; evidence ${evidenceIds.join(", ") || "(none)"}`;
    }),
    "",
    ...state.evidence.map((item) => `- ${item.evidence_id}: proves ${item.proves.join(", ")}; does_not_prove ${item.does_not_prove.join(", ")}`)
  ].join("\n");
}

function contextMarkdown(state: SuperpowersTaskState): string {
  return `# Context Alignment

Product Context Delta: ${state.context.product_context_delta}
Technical Context Delta: ${state.context.technical_context_delta}
`;
}

function finalSummaryMarkdown(state: SuperpowersTaskState, verdict: Record<string, unknown>): string {
  return `# Final Summary

overall_status: ${verdict.overall_status}
product_goal_complete: ${state.final.product_goal_complete}
`;
}
