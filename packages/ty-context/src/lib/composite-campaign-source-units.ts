import type { LongTaskSourceBundleV3 } from "./long-task-contract-schema.js";
import type { ScopeFitResultV4 } from "./scope-fit-v4.js";

export interface SourceUnitPacketBindingV4 {
  source_unit_id: string;
  requirement_ids: string[];
  obligation_ids: string[];
  acceptance_criterion_ids: string[];
  verification_spec_ids: string[];
}

export function assertSourceUnitPacketBindingsV4(
  scope: ScopeFitResultV4,
  sliceId: string,
  bindingsValue: unknown,
  bundle: LongTaskSourceBundleV3
): SourceUnitPacketBindingV4[] {
  if (!Array.isArray(bindingsValue)) invalid("bindings_not_array");
  const bindings = bindingsValue.map((value, index) => binding(value, index));
  const slice = scope.slices.find((item) => item.slice_id === sliceId); if (!slice) invalid(`slice_missing:${sliceId}`);
  const expected = new Set(slice.source_unit_refs); const seen = new Set<string>();
  const requirements = new Map(bundle.product.requirements.map((item) => [item.id, item]));
  const obligations = new Map(bundle.plan.plan_items.flatMap((item) => item.obligations).map((item) => [item.id, item]));
  const criteria = new Map(bundle.checklist.acceptance_criteria.map((item) => [item.id, item]));
  const specs = new Map(bundle.checklist.verification_specs.map((item) => [item.id, item]));
  for (const row of bindings) {
    if (!expected.has(row.source_unit_id)) invalid(`unexpected_unit:${row.source_unit_id}`);
    if (seen.has(row.source_unit_id)) invalid(`duplicate_unit:${row.source_unit_id}`); seen.add(row.source_unit_id);
    requireKnown(row.requirement_ids, requirements, row.source_unit_id, "requirement");
    requireKnown(row.obligation_ids, obligations, row.source_unit_id, "obligation");
    requireKnown(row.acceptance_criterion_ids, criteria, row.source_unit_id, "acceptance_criterion");
    requireKnown(row.verification_spec_ids, specs, row.source_unit_id, "verification_spec");
    for (const requirementId of row.requirement_ids) if (!row.obligation_ids.some((id) => obligations.get(id)!.source_requirement_ids.includes(requirementId))) invalid(`requirement_chain_missing:${row.source_unit_id}:${requirementId}`);
    for (const obligationId of row.obligation_ids) {
      const obligation = obligations.get(obligationId)!;
      if (!obligation.source_requirement_ids.some((id) => row.requirement_ids.includes(id))) invalid(`obligation_requirement_missing:${row.source_unit_id}:${obligationId}`);
      if (!row.acceptance_criterion_ids.some((id) => criteria.get(id)!.obligation_refs.includes(obligationId))) invalid(`obligation_ac_missing:${row.source_unit_id}:${obligationId}`);
    }
    for (const criterionId of row.acceptance_criterion_ids) {
      const criterion = criteria.get(criterionId)!;
      if (!criterion.obligation_refs.some((id) => row.obligation_ids.includes(id))) invalid(`ac_obligation_missing:${row.source_unit_id}:${criterionId}`);
      if (!row.verification_spec_ids.some((id) => criterion.verification_spec_ids.includes(id) && specs.get(id)!.claims.ac_ids.includes(criterionId))) invalid(`ac_verification_missing:${row.source_unit_id}:${criterionId}`);
    }
    for (const specId of row.verification_spec_ids) {
      const claims = specs.get(specId)!.claims;
      if (!claims.requirement_ids.some((id) => row.requirement_ids.includes(id)) || !claims.obligation_ids.some((id) => row.obligation_ids.includes(id)) || !claims.ac_ids.some((id) => row.acceptance_criterion_ids.includes(id))) invalid(`verification_chain_incomplete:${row.source_unit_id}:${specId}`);
    }
  }
  for (const unitId of expected) if (!seen.has(unitId)) invalid(`unit_binding_missing:${unitId}`);
  return bindings;
}

function binding(value: unknown, index: number): SourceUnitPacketBindingV4 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`binding_not_object:${index}`);
  const row = value as Record<string, unknown>; const keys = ["source_unit_id", "requirement_ids", "obligation_ids", "acceptance_criterion_ids", "verification_spec_ids"];
  for (const key of keys) if (!Object.hasOwn(row, key)) invalid(`binding_field_missing:${index}:${key}`);
  for (const key of Object.keys(row)) if (!keys.includes(key)) invalid(`binding_field_unknown:${index}:${key}`);
  if (typeof row.source_unit_id !== "string" || !/^SRCU-[0-9]{3,}$/u.test(row.source_unit_id)) invalid(`binding_unit_invalid:${index}`);
  for (const key of keys.slice(1)) idList(row[key], `${index}:${key}`);
  return row as unknown as SourceUnitPacketBindingV4;
}

function idList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(item)) || new Set(value).size !== value.length) invalid(`binding_ids_invalid:${label}`);
  return value as string[];
}

function requireKnown<T>(ids: string[], values: Map<string, T>, unitId: string, label: string): void {
  for (const id of ids) if (!values.has(id)) invalid(`${label}_unknown:${unitId}:${id}`);
}

function invalid(reason: string): never { throw new Error(`source_unit_packet_mapping_invalid:${reason}`); }
