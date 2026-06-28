export function buildWorkflowDiagnostics(options = {}) {
  const workflowOverheadRatio = finiteOrNull(options.workflowOverheadRatio);
  const workflowArtifactCount = finiteOrNull(options.workflowArtifactCount);
  const totalArtifactCount = finiteOrNull(options.totalArtifactCount);
  const workflowArtifactRatio =
    workflowArtifactCount !== null && totalArtifactCount !== null && totalArtifactCount > 0
      ? round(workflowArtifactCount / totalArtifactCount)
      : null;
  const productDefectCount = finiteOrNull(options.productDefectCount);
  const hygieneIssueCount = finiteOrNull(options.hygieneIssueCount);
  const acProgressVisibleCount = finiteOrNull(options.acProgressVisibleCount);
  const acProgressTotal = finiteOrNull(options.acProgressTotal);
  return {
    data_source: "score_inputs_and_report_derived",
    conclusion_eligible: false,
    workflow_overhead_ratio: workflowOverheadRatio,
    workflow_artifact_count: workflowArtifactCount,
    total_artifact_count: totalArtifactCount,
    workflow_artifact_ratio: workflowArtifactRatio,
    gate_true_product_defect_count: productDefectCount,
    gate_hygiene_issue_count: hygieneIssueCount,
    ac_progress_visibility: {
      visible_count: acProgressVisibleCount,
      total_count: acProgressTotal,
      ratio:
        acProgressVisibleCount !== null && acProgressTotal !== null && acProgressTotal > 0
          ? round(acProgressVisibleCount / acProgressTotal)
          : null
    },
    interpretation:
      "Workflow diagnostics expose overhead, artifact volume, gate issue mix and AC progress visibility. They are diagnostic only and not conclusion-grade benchmark claims."
  };
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
