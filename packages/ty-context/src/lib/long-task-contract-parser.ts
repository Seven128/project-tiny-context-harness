import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml } from "./composite-campaign-codec.js";
import { LONG_TASK_SOURCE_FILES, type AcceptanceChecklistV2, type LongTaskSourceBundleV2, type ProductSourceV2, type TechnicalPlanV2 } from "./long-task-contract-schema.js";

type Shape = Record<string, unknown>;
const PRODUCT_KEYS = ["schema_version", "product_goal", "delivery_scope", "full_population_required", "requirements", "boundaries", "non_completing_outcomes", "representative_samples_validate", "representative_samples_do_not_validate", "out_of_scope_backlog"];
const PLAN_KEYS = ["schema_version", "plan_items"];
const CHECKLIST_KEYS = ["schema_version", "acceptance_criteria"];

export async function parseLongTaskSources(workdir: string): Promise<LongTaskSourceBundleV2> {
  const source_paths = Object.fromEntries(Object.entries(LONG_TASK_SOURCE_FILES).map(([key, file]) => [key, path.join(workdir, file)])) as LongTaskSourceBundleV2["source_paths"];
  const [product, plan, checklist] = await Promise.all([
    parseFile(source_paths.product, parseProduct), parseFile(source_paths.plan, parsePlan), parseFile(source_paths.checklist, parseChecklist)
  ]);
  return { product, plan, checklist, source_paths };
}

async function parseFile<T>(file: string, validate: (value: unknown) => T): Promise<T> {
  const content = await readFile(file, "utf8");
  if (/^\s*#/m.test(content) && !/^\s*(?:schema_version|---)/m.test(content)) throw new Error(`${path.basename(file)} must be YAML, not Markdown`);
  return validate(parseStrictYaml(content));
}

function parseProduct(value: unknown): ProductSourceV2 {
  const root = object(value, "$product", PRODUCT_KEYS);
  literal(root.schema_version, "product-source-v2", "schema_version");
  string(root.product_goal, "product_goal");
  oneOf(root.delivery_scope, ["system_capability_build", "representative_sample_validation", "full_population_operation"], "delivery_scope");
  boolean(root.full_population_required, "full_population_required");
  array(root.requirements, "requirements").forEach((item, index) => {
    const row = object(item, `requirements[${index}]`, ["id", "statement", "observable_outcome", "owner_boundary", "owner_surfaces", "context_refs", "population_policy"]);
    stable(row.id, /^PR-[A-Z0-9][A-Z0-9-]*$/, `${index}.id`); strings(row, ["statement", "observable_outcome", "owner_boundary"]); stringArray(row.owner_surfaces, "owner_surfaces"); stringArray(row.context_refs, "context_refs"); oneOf(row.population_policy, ["not_applicable", "representative_sample", "full_population"], "population_policy");
  });
  array(root.boundaries, "boundaries").forEach((item, index) => { const row = object(item, `boundaries[${index}]`, ["id", "rule"]); stable(row.id, /^PB-[A-Z0-9][A-Z0-9-]*$/, "boundary.id"); string(row.rule, "boundary.rule"); });
  array(root.non_completing_outcomes, "non_completing_outcomes").forEach((item, index) => { const row = object(item, `non_completing_outcomes[${index}]`, ["id", "forbidden_outcome"]); stable(row.id, /^NC-[A-Z0-9][A-Z0-9-]*$/, "outcome.id"); string(row.forbidden_outcome, "outcome.forbidden_outcome"); });
  for (const key of ["representative_samples_validate", "representative_samples_do_not_validate", "out_of_scope_backlog"] as const) stringArray(root[key], key);
  return root as unknown as ProductSourceV2;
}

function parsePlan(value: unknown): TechnicalPlanV2 {
  const root = object(value, "$plan", PLAN_KEYS); literal(root.schema_version, "technical-plan-v2", "schema_version");
  array(root.plan_items, "plan_items").forEach((item, pi) => {
    const row = object(item, `plan_items[${pi}]`, ["id", "title", "obligations", "implementation_notes"]); stable(row.id, /^PI-[A-Z0-9][A-Z0-9-]*$/, "pi.id"); string(row.title, "pi.title"); stringArray(row.implementation_notes, "implementation_notes");
    array(row.obligations, "obligations").forEach((item2, oi) => { const ob = object(item2, `obligations[${oi}]`, ["id", "statement", "source_requirement_ids", "implementation_bindings", "forbidden_shortcuts", "related_ac_ids"]); stable(ob.id, /^PI-[A-Z0-9][A-Z0-9-]*-OB-[A-Z0-9][A-Z0-9-]*$/, "obligation.id"); string(ob.statement, "obligation.statement"); stringArray(ob.source_requirement_ids, "source_requirement_ids"); stringArray(ob.related_ac_ids, "related_ac_ids"); const bindings = object(ob.implementation_bindings, "implementation_bindings", ["paths", "symbols", "schemas", "routes"]); for (const key of ["paths", "symbols", "schemas", "routes"] as const) stringArray(bindings[key], key); array(ob.forbidden_shortcuts, "forbidden_shortcuts").forEach((shortcut) => { const s = object(shortcut, "forbidden_shortcut", ["id", "statement", "source_boundary_ids"]); stable(s.id, /^FS-[A-Z0-9][A-Z0-9-]*$/, "shortcut.id"); string(s.statement, "shortcut.statement"); stringArray(s.source_boundary_ids, "source_boundary_ids"); }); });
  }); return root as unknown as TechnicalPlanV2;
}

function parseChecklist(value: unknown): AcceptanceChecklistV2 {
  const root = object(value, "$checklist", CHECKLIST_KEYS); literal(root.schema_version, "acceptance-checklist-v2", "schema_version");
  array(root.acceptance_criteria, "acceptance_criteria").forEach((item, ai) => { const ac = object(item, `acceptance_criteria[${ai}]`, ["id", "title", "obligation_refs", "validates", "does_not_validate", "proof_surfaces", "verification_specs"]); stable(ac.id, /^AC-[A-Z0-9][A-Z0-9-]*$/, "ac.id"); string(ac.title, "ac.title"); for (const key of ["obligation_refs", "validates", "does_not_validate"] as const) stringArray(ac[key], key); array(ac.proof_surfaces, "proof_surfaces").forEach((v) => oneOf(v, ["ui_browser", "runtime_behavior", "api_contract", "data_state", "security_boundary", "population_coverage", "implementation_structure"], "proof_surface")); array(ac.verification_specs, "verification_specs").forEach((spec) => parseSpec(spec)); });
  return root as unknown as AcceptanceChecklistV2;
}

function parseSpec(value: unknown): void {
  const keys = ["id", "runner_type", "executable", "argv", "cwd", "timeout_ms", "oracle_protocol", "oracle_paths", "implementation_test_paths", "input_paths", "artifact_globs", "positive_assertions", "negative_assertions", "invalid_completion_signals", "environment_requirements", "population_enumerator"];
  const s = object(value, "verification_spec", keys, ["population_enumerator"]); stable(s.id, /^VS-[A-Z0-9][A-Z0-9-]*$/, "spec.id"); oneOf(s.runner_type, ["process", "browser", "api", "data", "static"], "runner_type"); string(s.executable, "executable"); string(s.cwd, "cwd"); integer(s.timeout_ms, "timeout_ms"); literal(s.oracle_protocol, "ty-context-observation-v1", "oracle_protocol"); for (const key of ["argv", "oracle_paths", "implementation_test_paths", "input_paths", "artifact_globs", "invalid_completion_signals"] as const) stringArray(s[key], key);
  array(s.positive_assertions, "positive_assertions").forEach((v) => { const a = object(v, "positive_assertion", ["id", "oracle_check_id", "expected"]); stable(a.id, /^PA-[A-Z0-9][A-Z0-9-]*$/, "positive.id"); string(a.oracle_check_id, "oracle_check_id"); });
  array(s.negative_assertions, "negative_assertions").forEach((v) => { const a = object(v, "negative_assertion", ["id", "oracle_check_id", "forbidden", "source_boundary_ids", "source_non_completing_ids", "source_forbidden_shortcut_ids"]); stable(a.id, /^NA-[A-Z0-9][A-Z0-9-]*$/, "negative.id"); string(a.oracle_check_id, "oracle_check_id"); for (const key of ["source_boundary_ids", "source_non_completing_ids", "source_forbidden_shortcut_ids"] as const) stringArray(a[key], key); });
  array(s.environment_requirements, "environment_requirements").forEach((v) => { const e = object(v, "environment_requirement", ["id", "kind", "required", "reason_code", "minimal_user_action", "local_alternatives"]); stable(e.id, /^ER-[A-Z0-9][A-Z0-9-]*$/, "environment.id"); oneOf(e.kind, ["runtime", "browser", "credential", "permission", "external_service", "user_decision", "external_approval", "platform_restriction"], "environment.kind"); boolean(e.required, "environment.required"); oneOf(e.reason_code, ["mfa_required", "credential_unavailable", "permission_denied", "user_contract_decision_required", "external_approval_required", "platform_or_legal_restriction", "external_service_persistently_unavailable"], "environment.reason_code"); string(e.minimal_user_action, "environment.minimal_user_action"); stringArray(e.local_alternatives, "environment.local_alternatives"); });
  if (s.population_enumerator !== undefined) { const p = object(s.population_enumerator, "population_enumerator", ["oracle_check_id", "exclusion_rule_ids", "required_coverage_percent"]); string(p.oracle_check_id, "population.oracle_check_id"); stringArray(p.exclusion_rule_ids, "population.exclusion_rule_ids"); literal(p.required_coverage_percent, 100, "required_coverage_percent"); }
}

function object(value: unknown, label: string, allowed: string[], optional: string[] = []): Shape { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`); const row = value as Shape; for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${label} has unknown field ${key}`); for (const key of allowed) if (!optional.includes(key) && !(key in row)) throw new Error(`${label} is missing ${key}`); return row; }
function array(value: unknown, label: string): unknown[] { if (!Array.isArray(value)) throw new Error(`${label} must be an array`); return value; }
function string(value: unknown, label: string): asserts value is string { if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`); }
function strings(row: Shape, keys: string[]): void { keys.forEach((key) => string(row[key], key)); }
function stringArray(value: unknown, label: string): asserts value is string[] { array(value, label).forEach((v) => string(v, label)); }
function boolean(value: unknown, label: string): asserts value is boolean { if (typeof value !== "boolean") throw new Error(`${label} must be boolean`); }
function integer(value: unknown, label: string): asserts value is number { if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${label} must be a positive integer`); }
function literal(value: unknown, expected: unknown, label: string): void { if (value !== expected) throw new Error(`${label} must equal ${String(expected)}`); }
function oneOf(value: unknown, values: readonly string[], label: string): void { if (typeof value !== "string" || !values.includes(value)) throw new Error(`${label} must be one of ${values.join(", ")}`); }
function stable(value: unknown, pattern: RegExp, label: string): void { string(value, label); if (!pattern.test(value)) throw new Error(`${label} has invalid stable ID ${value}`); }
