import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceScope(
  handoff: DesignResourceHandoffV1,
): void {
  const surfaceStableKeys = new Set(
    handoff.subjects
      .filter((subject) => subject.kind === "surface")
      .flatMap((subject) => subject.stable_keys),
  );
  for (const surfaceKey of handoff.scope.surface_keys)
    if (!surfaceStableKeys.has(surfaceKey))
      invalidDesignResourceHandoff(
        "scope_surface_subject_missing",
        surfaceKey,
      );
}

export function validateDesignResourceConditions(
  handoff: DesignResourceHandoffV1,
): void {
  for (const condition of handoff.conditions) {
    for (const [name, values] of [
      ["modes", condition.modes],
      ["states", condition.states],
      ["content_cases", condition.content_cases],
      ["input_methods", condition.input_methods],
    ] as const) {
      requireNonemptyDesignResourceValues(
        values,
        `condition_${name}_required:${condition.key}`,
      );
      requireUniqueDesignResourceValues(
        values,
        `condition_${name}_duplicate:${condition.key}`,
      );
    }
  }
}

export function validateDesignResourceSubjects(
  handoff: DesignResourceHandoffV1,
): void {
  const stableKeys = new Set<string>();
  for (const subject of handoff.subjects) {
    requireNonemptyDesignResourceValues(
      subject.stable_keys,
      `subject_stable_keys_required:${subject.key}`,
    );
    requireUniqueDesignResourceValues(
      subject.stable_keys,
      `subject_stable_key_duplicate:${subject.key}`,
    );
    for (const stableKey of subject.stable_keys) {
      if (stableKeys.has(stableKey))
        invalidDesignResourceHandoff(
          "subject_stable_key_ambiguous",
          stableKey,
        );
      stableKeys.add(stableKey);
    }
  }
}

export function validateDesignResourceTargets(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
): void {
  for (const target of handoff.targets) {
    requireNonemptyDesignResourceValues(
      target.resource_refs,
      `target_resource_refs_required:${target.key}`,
    );
    requireNonemptyDesignResourceValues(
      target.condition_refs,
      `target_condition_refs_required:${target.key}`,
    );
    requireUniqueDesignResourceValues(
      target.resource_refs,
      `target_resource_ref_duplicate:${target.key}`,
    );
    requireUniqueDesignResourceValues(
      target.condition_refs,
      `target_condition_ref_duplicate:${target.key}`,
    );
    for (const ref of target.resource_refs)
      requireKnownDesignResourceRef(resources, ref, "resource");
    for (const ref of target.condition_refs)
      requireKnownDesignResourceRef(conditions, ref, "condition");
    const expectedRole =
      target.interpretation === "exact_target" ? "exact_target" : "constraint";
    if (
      !target.resource_refs.some(
        (ref) => resources.get(ref)?.role === expectedRole,
      )
    )
      invalidDesignResourceHandoff(
        "target_interpretation_resource_role_missing",
        `${target.key}:${expectedRole}`,
      );
  }
}

export function validateDesignResourceEvidence(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, unknown>,
  conditions: Map<string, unknown>,
): void {
  for (const item of handoff.evidence) {
    requireKnownDesignResourceRef(resources, item.resource_ref, "resource");
    requireNonemptyDesignResourceValues(
      item.condition_refs,
      `evidence_condition_refs_required:${item.key}`,
    );
    requireUniqueDesignResourceValues(
      item.condition_refs,
      `evidence_condition_ref_duplicate:${item.key}`,
    );
    for (const ref of item.condition_refs)
      requireKnownDesignResourceRef(conditions, ref, "condition");
  }
}
