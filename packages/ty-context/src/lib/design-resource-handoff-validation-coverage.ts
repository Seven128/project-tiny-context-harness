import {
  DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION,
  DESIGN_RESOURCE_METHODS_BY_DIMENSION,
} from "./design-resource-handoff-policy.js";
import {
  DESIGN_RESOURCE_DIMENSIONS,
  type DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireDesignSourceItemKind,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceCoverage(
  handoff: DesignResourceHandoffV1,
  subjects: Map<string, unknown>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  conditions: Map<string, unknown>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  sourceItems: Map<string, string>,
): void {
  const pairs = new Set<string>();
  const unresolved: string[] = [];
  for (const row of handoff.coverage) {
    requireNonemptyDesignResourceValues(
      row.subject_refs,
      `coverage_subject_refs_required:${row.key}`,
    );
    requireNonemptyDesignResourceValues(
      row.source_item_refs,
      `coverage_source_item_refs_required:${row.key}`,
    );
    for (const [name, values] of [
      ["subject_ref", row.subject_refs],
      ["target_ref", row.target_refs],
      ["condition_ref", row.condition_refs],
      ["evidence_ref", row.evidence_refs],
      ["source_item_ref", row.source_item_refs],
      ["verification_method", row.verification_methods],
    ] as const)
      requireUniqueDesignResourceValues(
        values,
        `coverage_${name}_duplicate:${row.key}`,
      );
    for (const ref of row.subject_refs) {
      requireKnownDesignResourceRef(subjects, ref, "subject");
      const pair = `${ref}\0${row.dimension}`;
      if (pairs.has(pair))
        invalidDesignResourceHandoff(
          "coverage_pair_duplicate",
          `${ref}:${row.dimension}`,
        );
      pairs.add(pair);
    }
    for (const ref of row.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, ref, "source_item");
      requireDesignSourceItemKind(sourceItems, ref);
    }
    if (row.disposition === "covered")
      validateCoveredRow(row, targets, conditions, evidence);
    else validateNoncoveredRow(row);
    if (
      row.disposition === "decision_required" ||
      row.disposition === "unavailable"
    )
      unresolved.push(row.key);
  }
  for (const subject of handoff.subjects)
    for (const dimension of DESIGN_RESOURCE_DIMENSIONS)
      if (!pairs.has(`${subject.key}\0${dimension}`))
        invalidDesignResourceHandoff(
          "coverage_pair_missing",
          `${subject.key}:${dimension}`,
        );
  if (unresolved.length)
    invalidDesignResourceHandoff(
      "unresolved_coverage",
      unresolved.sort().join(","),
    );
}

export function validateDesignResourceBlockers(
  handoff: DesignResourceHandoffV1,
  subjects: Map<string, unknown>,
  targets: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  for (const blocker of handoff.acceptance_blockers) {
    for (const [name, values] of [
      ["target_refs", blocker.target_refs],
      ["subject_refs", blocker.subject_refs],
      ["dimensions", blocker.dimensions],
      ["source_item_refs", blocker.source_item_refs],
      ["verification_methods", blocker.verification_methods],
    ] as const) {
      requireNonemptyDesignResourceValues(
        values,
        `acceptance_blocker_${name}_required:${blocker.key}`,
      );
      requireUniqueDesignResourceValues(
        values,
        `acceptance_blocker_${name}_duplicate:${blocker.key}`,
      );
    }
    for (const ref of blocker.target_refs)
      requireKnownDesignResourceRef(targets, ref, "target");
    for (const ref of blocker.subject_refs)
      requireKnownDesignResourceRef(subjects, ref, "subject");
    for (const ref of blocker.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, ref, "source_item");
      requireDesignSourceItemKind(sourceItems, ref);
    }
    for (const dimension of blocker.dimensions)
      if (
        !blocker.verification_methods.some((method) =>
          DESIGN_RESOURCE_METHODS_BY_DIMENSION[dimension].includes(method),
        )
      )
        invalidDesignResourceHandoff(
          "acceptance_blocker_dimension_method_missing",
          `${blocker.key}:${dimension}`,
        );
  }
}

export function validateDesignResourceReachability(
  handoff: DesignResourceHandoffV1,
): void {
  const targetResources = new Set(
    handoff.targets.flatMap((target) => target.resource_refs),
  );
  const targetConditions = new Set(
    handoff.targets.flatMap((target) => target.condition_refs),
  );
  const coverageTargets = new Set(
    handoff.coverage.flatMap((row) => row.target_refs),
  );
  const coverageEvidence = new Set(
    handoff.coverage.flatMap((row) => row.evidence_refs),
  );
  for (const resource of handoff.resources)
    if (!targetResources.has(resource.key))
      invalidDesignResourceHandoff("resource_unreferenced", resource.key);
  for (const condition of handoff.conditions)
    if (!targetConditions.has(condition.key))
      invalidDesignResourceHandoff("condition_unreferenced", condition.key);
  for (const target of handoff.targets)
    if (!coverageTargets.has(target.key))
      invalidDesignResourceHandoff(
        "target_without_covered_dimension",
        target.key,
      );
  for (const item of handoff.evidence)
    if (!coverageEvidence.has(item.key))
      invalidDesignResourceHandoff("evidence_unreferenced", item.key);
}

function validateCoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  conditions: Map<string, unknown>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  for (const [name, values] of [
    ["target_refs", row.target_refs],
    ["condition_refs", row.condition_refs],
    ["evidence_refs", row.evidence_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    requireNonemptyDesignResourceValues(
      values,
      `coverage_${name}_required:${row.key}`,
    );
  for (const ref of row.target_refs)
    requireKnownDesignResourceRef(targets, ref, "target");
  for (const ref of row.condition_refs)
    requireKnownDesignResourceRef(conditions, ref, "condition");
  for (const ref of row.evidence_refs)
    requireKnownDesignResourceRef(evidence, ref, "evidence");

  const allowedEvidence = new Set(
    DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION[row.dimension],
  );
  const allowedMethods = new Set(
    DESIGN_RESOURCE_METHODS_BY_DIMENSION[row.dimension],
  );
  for (const ref of row.evidence_refs) {
    const item = evidence.get(ref)!;
    if (!allowedEvidence.has(item.kind))
      invalidDesignResourceHandoff(
        "coverage_evidence_kind_incompatible",
        `${row.key}:${row.dimension}:${item.key}:${item.kind}`,
      );
    if (
      !row.target_refs.some((targetRef) =>
        targets.get(targetRef)!.resource_refs.includes(item.resource_ref),
      )
    )
      invalidDesignResourceHandoff(
        "coverage_evidence_outside_target",
        `${row.key}:${item.key}`,
      );
  }
  for (const method of row.verification_methods)
    if (!allowedMethods.has(method))
      invalidDesignResourceHandoff(
        "coverage_verification_method_incompatible",
        `${row.key}:${row.dimension}:${method}`,
      );
  for (const conditionRef of row.condition_refs) {
    if (
      !row.target_refs.some((targetRef) =>
        targets.get(targetRef)!.condition_refs.includes(conditionRef),
      )
    )
      invalidDesignResourceHandoff(
        "coverage_condition_outside_target",
        `${row.key}:${conditionRef}`,
      );
    if (
      !row.evidence_refs.some((evidenceRef) =>
        evidence.get(evidenceRef)!.condition_refs.includes(conditionRef),
      )
    )
      invalidDesignResourceHandoff(
        "coverage_condition_without_evidence",
        `${row.key}:${conditionRef}`,
      );
  }
}

function validateNoncoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
): void {
  for (const [name, values] of [
    ["target_refs", row.target_refs],
    ["condition_refs", row.condition_refs],
    ["evidence_refs", row.evidence_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    if (values.length)
      invalidDesignResourceHandoff(
        "noncovered_binding_forbidden",
        `${row.key}:${row.disposition}:${name}`,
      );
}
