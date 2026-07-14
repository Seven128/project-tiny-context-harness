import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml } from "./composite-campaign-codec.js";
import {
  COMPOSITE_V3_SCHEMAS,
  requiredRootFields,
} from "./long-task-contract-schema-registry.js";
import { assertCompositeSourceSchema } from "./long-task-json-schema-validator.js";
import {
  LONG_TASK_SOURCE_FILES,
  type AcceptanceChecklistV3,
  type CounterfactualMutationV3,
  type LongTaskSourceBundleV3,
  type ProductSourceV3,
  type TechnicalPlanV3,
} from "./long-task-contract-schema.js";

type Shape = Record<string, unknown>;
const PROOF_SURFACES = [
  "ui_browser",
  "runtime_behavior",
  "api_contract",
  "data_state",
  "security_boundary",
  "population_coverage",
  "implementation_structure",
] as const;
const PRODUCT_KEYS = requiredRootFields("product-source-v3");
const PLAN_KEYS = requiredRootFields("technical-plan-v3");
const CHECKLIST_KEYS = requiredRootFields("acceptance-checklist-v3");

export async function parseLongTaskSources(
  workdir: string,
): Promise<LongTaskSourceBundleV3> {
  const source_paths = Object.fromEntries(
    Object.entries(LONG_TASK_SOURCE_FILES).map(([key, file]) => [
      key,
      path.join(workdir, file),
    ]),
  ) as LongTaskSourceBundleV3["source_paths"];
  const [product, plan, checklist] = await Promise.all([
    parseFile(source_paths.product, parseProduct),
    parseFile(source_paths.plan, parsePlan),
    parseFile(source_paths.checklist, parseChecklist),
  ]);
  return { product, plan, checklist, source_paths };
}

async function parseFile<T>(
  file: string,
  validate: (value: unknown) => T,
): Promise<T> {
  const content = await readFile(file, "utf8");
  if (/^\s*#/m.test(content) && !/^\s*(?:schema_version|---)/m.test(content))
    throw new Error(`${path.basename(file)} must be YAML, not Markdown`);
  return validate(parseStrictYaml(content));
}

function parseProduct(value: unknown): ProductSourceV3 {
  const root = object(
    value,
    "$product",
    [...PRODUCT_KEYS, "context_snapshot_mode"],
    ["context_snapshot_mode"],
  );
  literal(
    root.schema_version,
    "product-source-v3",
    "source_schema_unsupported:product",
  );
  if (root.context_snapshot_mode !== undefined) {
    oneOf(
      root.context_snapshot_mode,
      ["referenced", "full"],
      "context_snapshot_mode",
    );
  }
  string(root.product_goal, "product_goal");
  oneOf(
    root.delivery_scope,
    [
      "system_capability_build",
      "representative_sample_validation",
      "full_population_operation",
    ],
    "delivery_scope",
  );
  boolean(root.full_population_required, "full_population_required");
  array(root.owner_surfaces, "owner_surfaces").forEach((value, index) => {
    const row = object(value, `owner_surfaces[${index}]`, [
      "id",
      "kind",
      "location",
      "primary_action",
      "expected_feedback",
    ]);
    stable(row.id, /^OS-[A-Z0-9][A-Z0-9-]*$/, "owner_surface.id");
    oneOf(
      row.kind,
      ["web", "cli", "api", "runtime", "data", "security"],
      "owner_surface.kind",
    );
    strings(row, ["location", "primary_action", "expected_feedback"]);
  });
  array(root.requirements, "requirements").forEach((value, index) => {
    const row = object(
      value,
      `requirements[${index}]`,
      [
        "id",
        "statement",
        "observable_outcome",
        "owner_boundary",
        "owner_surface_refs",
        "context_refs",
        "task_local_reason",
        "population_policy",
      ],
      ["context_refs", "task_local_reason"],
    );
    stable(row.id, /^PR-[A-Z0-9][A-Z0-9-]*$/, "requirement.id");
    strings(row, ["statement", "observable_outcome", "owner_boundary"]);
    stringArray(row.owner_surface_refs, "owner_surface_refs");
    const hasContext = row.context_refs !== undefined;
    const hasReason = row.task_local_reason !== undefined;
    if (hasContext === hasReason)
      throw new Error(`requirement_context_source_invalid:${String(row.id)}`);
    if (hasContext) stringArray(row.context_refs, "context_refs");
    else string(row.task_local_reason, "task_local_reason");
    oneOf(
      row.population_policy,
      ["not_applicable", "representative_sample", "full_population"],
      "population_policy",
    );
  });
  parseProductRules(
    root.boundaries,
    "boundaries",
    "rule",
    /^PB-[A-Z0-9][A-Z0-9-]*$/,
  );
  parseProductRules(
    root.non_completing_outcomes,
    "non_completing_outcomes",
    "forbidden_outcome",
    /^NCO-[A-Z0-9][A-Z0-9-]*$/,
  );
  parseProductRules(
    root.population_exclusion_rules,
    "population_exclusion_rules",
    "rule",
    /^EXCLUSION-[A-Z0-9][A-Z0-9-]*$/,
  );
  for (const key of [
    "representative_samples_validate",
    "representative_samples_do_not_validate",
    "out_of_scope_backlog",
  ] as const)
    stringArray(root[key], key);
  assertCompositeSourceSchema(
    root,
    COMPOSITE_V3_SCHEMAS["product-source-v3"],
    "$product",
  );
  return root as unknown as ProductSourceV3;
}

function parseProductRules(
  value: unknown,
  label: string,
  textKey: string,
  pattern: RegExp,
): void {
  array(value, label).forEach((item, index) => {
    const row = object(item, `${label}[${index}]`, [
      "id",
      textKey,
      "requirement_refs",
    ]);
    stable(row.id, pattern, `${label}.id`);
    string(row[textKey], `${label}.${textKey}`);
    stringArray(row.requirement_refs, `${label}.requirement_refs`);
  });
}

function parsePlan(value: unknown): TechnicalPlanV3 {
  const root = object(
    value,
    "$plan",
    [...PLAN_KEYS, "supporting_paths", "forbidden_paths"],
    ["supporting_paths", "forbidden_paths"],
  );
  literal(
    root.schema_version,
    "technical-plan-v3",
    "source_schema_unsupported:plan",
  );
  if (root.supporting_paths !== undefined)
    stringArray(root.supporting_paths, "supporting_paths");
  if (root.forbidden_paths !== undefined)
    stringArray(root.forbidden_paths, "forbidden_paths");
  array(root.plan_items, "plan_items").forEach((value, piIndex) => {
    const pi = object(value, `plan_items[${piIndex}]`, [
      "id",
      "title",
      "implementation_notes",
      "obligations",
    ]);
    stable(pi.id, /^PI-[A-Z0-9][A-Z0-9-]*$/, "plan_item.id");
    string(pi.title, "plan_item.title");
    stringArray(pi.implementation_notes, "implementation_notes");
    array(pi.obligations, "obligations").forEach((value, obligationIndex) =>
      parseObligation(value, String(pi.id), obligationIndex),
    );
  });
  array(root.counterfactual_controls, "counterfactual_controls").forEach(
    (value, index) => {
      const row = object(value, `counterfactual_controls[${index}]`, [
        "id",
        "obligation_ids",
        "mutation",
        "expected_failed_assertion_ids",
      ]);
      stable(row.id, /^CF-[A-Z0-9][A-Z0-9-]*$/, "counterfactual.id");
      stringArray(row.obligation_ids, "counterfactual.obligation_ids");
      if ((row.obligation_ids as string[]).length !== 1)
        throw new Error(
          `counterfactual_requires_one_obligation:${String(row.id)}`,
        );
      stringArray(
        row.expected_failed_assertion_ids,
        "counterfactual.expected_failed_assertion_ids",
      );
      parseMutation(row.mutation);
    },
  );
  assertCompositeSourceSchema(
    root,
    COMPOSITE_V3_SCHEMAS["technical-plan-v3"],
    "$plan",
  );
  return root as unknown as TechnicalPlanV3;
}

function parseObligation(
  value: unknown,
  planItemId: string,
  index: number,
): void {
  const row = object(value, `obligations[${index}]`, [
    "id",
    "statement",
    "source_requirement_ids",
    "implementation_bindings",
    "forbidden_shortcuts",
    "related_ac_ids",
    "counterfactual_control_ids",
  ]);
  stable(
    row.id,
    new RegExp(`^${escapeRegExp(planItemId)}-OB-[A-Z0-9][A-Z0-9-]*$`),
    "obligation.id",
  );
  string(row.statement, "obligation.statement");
  for (const key of [
    "source_requirement_ids",
    "related_ac_ids",
    "counterfactual_control_ids",
  ] as const)
    stringArray(row[key], key);
  array(row.implementation_bindings, "implementation_bindings").forEach(
    (value, bindingIndex) => {
      const binding = object(
        value,
        `implementation_bindings[${bindingIndex}]`,
        ["id", "kind", "target", "carrier_paths", "verification"],
        ["carrier_paths"],
      );
      stable(binding.id, /^IB-[A-Z0-9][A-Z0-9-]*$/, "binding.id");
      oneOf(
        binding.kind,
        [
          "path_glob",
          "file",
          "symbol",
          "schema",
          "route",
          "runtime_capability",
        ],
        "binding.kind",
      );
      string(binding.target, "binding.target");
      const fileBinding =
        binding.kind === "path_glob" || binding.kind === "file";
      if (binding.carrier_paths !== undefined)
        stringArray(binding.carrier_paths, "binding.carrier_paths");
      if (
        !fileBinding &&
        (!Array.isArray(binding.carrier_paths) ||
          binding.carrier_paths.length === 0)
      ) {
        throw new Error(`binding_carrier_paths_required:${String(binding.id)}`);
      }
      const verification = object(
        binding.verification,
        "binding.verification",
        ["mode", "spec_id", "observation_id"],
        ["spec_id", "observation_id"],
      );
      oneOf(
        verification.mode,
        ["harness_static", "oracle_observation"],
        "binding.verification.mode",
      );
      if (
        verification.mode === "harness_static" &&
        (verification.spec_id !== undefined ||
          verification.observation_id !== undefined)
      )
        throw new Error(
          `binding_static_observer_forbidden:${String(binding.id)}`,
        );
      if (
        verification.mode === "oracle_observation" &&
        (typeof verification.spec_id !== "string" ||
          typeof verification.observation_id !== "string" ||
          verification.spec_id.trim() === "" ||
          verification.observation_id.trim() === "")
      )
        throw new Error(`binding_without_observer:${String(binding.id)}`);
    },
  );
  array(row.forbidden_shortcuts, "forbidden_shortcuts").forEach(
    (value, shortcutIndex) => {
      const shortcut = object(value, `forbidden_shortcuts[${shortcutIndex}]`, [
        "id",
        "statement",
        "source_boundary_ids",
        "source_non_completing_ids",
      ]);
      stable(shortcut.id, /^FS-[A-Z0-9][A-Z0-9-]*$/, "shortcut.id");
      string(shortcut.statement, "shortcut.statement");
      stringArray(shortcut.source_boundary_ids, "source_boundary_ids");
      stringArray(
        shortcut.source_non_completing_ids,
        "source_non_completing_ids",
      );
    },
  );
}

function parseMutation(value: unknown): CounterfactualMutationV3 {
  const base = object(
    value,
    "counterfactual.mutation",
    [
      "type",
      "binding_ids",
      "binding_id",
      "target_path",
      "fixture_id",
      "from_route",
      "to_route",
      "environment_ref",
    ],
    [
      "binding_ids",
      "binding_id",
      "target_path",
      "fixture_id",
      "from_route",
      "to_route",
      "environment_ref",
    ],
  );
  oneOf(
    base.type,
    [
      "remove_binding_targets",
      "replace_file_with_fixture",
      "rename_route_fixture",
      "use_declared_counterexample_fixture",
    ],
    "counterfactual.mutation.type",
  );
  const required: Record<string, string[]> = {
    remove_binding_targets: ["binding_ids"],
    replace_file_with_fixture: ["binding_id", "target_path", "fixture_id"],
    rename_route_fixture: [
      "binding_id",
      "target_path",
      "fixture_id",
      "from_route",
      "to_route",
    ],
    use_declared_counterexample_fixture: [
      "binding_id",
      "target_path",
      "fixture_id",
    ],
  };
  for (const key of required[String(base.type)])
    key === "binding_ids"
      ? stringArray(base[key], key)
      : string(base[key], key);
  for (const key of Object.keys(base))
    if (key !== "type" && !required[String(base.type)].includes(key))
      throw new Error(`counterfactual_mutation_unknown_field:${key}`);
  return base as unknown as CounterfactualMutationV3;
}

function parseChecklist(value: unknown): AcceptanceChecklistV3 {
  const root = object(value, "$checklist", CHECKLIST_KEYS);
  literal(
    root.schema_version,
    "acceptance-checklist-v3",
    "source_schema_unsupported:checklist",
  );
  array(root.counterexample_fixtures, "counterexample_fixtures").forEach(
    (value, index) => {
      const row = object(value, `counterexample_fixtures[${index}]`, [
        "id",
        "path",
        "purpose",
        "non_secret",
      ]);
      stable(row.id, /^FX-[A-Z0-9][A-Z0-9-]*$/, "fixture.id");
      strings(row, ["path", "purpose"]);
      boolean(row.non_secret, "fixture.non_secret");
    },
  );
  array(root.proof_requirements, "proof_requirements").forEach(
    (value, index) => {
      const row = object(value, `proof_requirements[${index}]`, [
        "id",
        "proof_surface",
        "obligation_refs",
        "owner_surface_refs",
        "verification_spec_ids",
      ]);
      stable(row.id, /^PRF-[A-Z0-9][A-Z0-9-]*$/, "proof.id");
      oneOf(row.proof_surface, PROOF_SURFACES, "proof_surface");
      for (const key of [
        "obligation_refs",
        "owner_surface_refs",
        "verification_spec_ids",
      ] as const)
        stringArray(row[key], key);
    },
  );
  array(root.acceptance_criteria, "acceptance_criteria").forEach(
    (value, index) => {
      const row = object(value, `acceptance_criteria[${index}]`, [
        "id",
        "title",
        "obligation_refs",
        "validates",
        "does_not_validate",
        "proof_requirement_refs",
        "verification_spec_ids",
      ]);
      stable(row.id, /^AC-[A-Z0-9][A-Z0-9-]*$/, "ac.id");
      string(row.title, "ac.title");
      for (const key of [
        "obligation_refs",
        "validates",
        "does_not_validate",
        "proof_requirement_refs",
        "verification_spec_ids",
      ] as const)
        stringArray(row[key], key);
    },
  );
  array(root.verification_specs, "verification_specs").forEach(parseSpec);
  array(root.environment_probes, "environment_probes").forEach(parseProbe);
  assertCompositeSourceSchema(
    root,
    COMPOSITE_V3_SCHEMAS["acceptance-checklist-v3"],
    "$checklist",
  );
  return root as unknown as AcceptanceChecklistV3;
}

function parseSpec(value: unknown): void {
  const keys = [
    "id",
    "runner_type",
    "proof_capabilities",
    "claims",
    "oracle",
    "cwd",
    "timeout_ms",
    "input_paths",
    "artifact_globs",
    "network_policy",
    "command_steps",
    "environment_refs",
    "environment_requirements",
    "positive_assertions",
    "negative_assertions",
    "population_enumerator",
  ];
  const row = object(value, "verification_spec", keys, [
    "population_enumerator",
  ]);
  stable(row.id, /^VS-[A-Z0-9][A-Z0-9-]*$/, "spec.id");
  literal(row.runner_type, "node_oracle", "runner_type");
  array(row.proof_capabilities, "proof_capabilities").forEach((item) =>
    oneOf(item, PROOF_SURFACES, "proof_capability"),
  );
  const claims = object(row.claims, "claims", [
    "requirement_ids",
    "plan_item_ids",
    "obligation_ids",
    "binding_ids",
    "ac_ids",
    "proof_requirement_ids",
  ]);
  for (const key of Object.keys(claims))
    stringArray(claims[key], `claims.${key}`);
  const oracle = object(row.oracle, "oracle", ["entrypoint"]);
  string(oracle.entrypoint, "oracle.entrypoint");
  if (!/\.(?:[cm]?[jt]s)$/.test(oracle.entrypoint as string))
    throw new Error("oracle_entrypoint_extension_invalid");
  string(row.cwd, "cwd");
  integer(row.timeout_ms, "timeout_ms");
  if (
    (row.timeout_ms as number) < 100 ||
    (row.timeout_ms as number) > 3_600_000
  )
    throw new Error("timeout_ms_out_of_range");
  for (const key of [
    "input_paths",
    "artifact_globs",
    "environment_refs",
  ] as const)
    stringArray(row[key], key);
  const network = object(row.network_policy, "network_policy", [
    "mode",
    "allowed_hosts",
  ]);
  oneOf(
    network.mode,
    ["none", "loopback", "declared_hosts"],
    "network_policy.mode",
  );
  stringArray(network.allowed_hosts, "network_policy.allowed_hosts");
  if (
    network.mode !== "declared_hosts" &&
    (network.allowed_hosts as string[]).length
  )
    throw new Error("network_policy_allowed_hosts_forbidden");
  if (
    network.mode === "declared_hosts" &&
    !(network.allowed_hosts as string[]).length
  )
    throw new Error("network_policy_allowed_hosts_required");
  array(row.command_steps, "command_steps").forEach(parseCommandStep);
  array(row.positive_assertions, "positive_assertions").forEach((value) =>
    parseAssertion(value, false),
  );
  array(row.negative_assertions, "negative_assertions").forEach((value) =>
    parseAssertion(value, true),
  );
  array(row.environment_requirements, "environment_requirements").forEach(
    parseEnvironmentRequirement,
  );
  if (row.population_enumerator !== undefined) {
    const population = object(
      row.population_enumerator,
      "population_enumerator",
      ["observation_id", "exclusion_rule_ids", "required_coverage_percent"],
    );
    string(population.observation_id, "population.observation_id");
    stringArray(population.exclusion_rule_ids, "population.exclusion_rule_ids");
    literal(
      population.required_coverage_percent,
      100,
      "required_coverage_percent",
    );
  }
}

function parseCommandStep(value: unknown): void {
  const row = object(value, "command_step", [
    "id",
    "tool",
    "target",
    "argv",
    "cwd",
    "timeout_ms",
    "environment_refs",
    "output_artifact_ids",
  ]);
  stable(row.id, /^CMD-[A-Z0-9][A-Z0-9-]*$/, "command.id");
  oneOf(
    row.tool,
    ["package_script", "project_binary", "node_script", "playwright_test"],
    "command.tool",
  );
  string(row.target, "command.target");
  stringArray(row.argv, "command.argv");
  string(row.cwd, "command.cwd");
  integer(row.timeout_ms, "command.timeout_ms");
  stringArray(row.environment_refs, "command.environment_refs");
  stringArray(row.output_artifact_ids, "command.output_artifact_ids");
}
function parseAssertion(value: unknown, negative: boolean): void {
  const common = [
    "id",
    "observation_id",
    "observation_kind",
    "operator",
    "expected",
  ];
  const sources = [
    "source_boundary_ids",
    "source_non_completing_ids",
    "source_forbidden_shortcut_ids",
  ];
  const row = object(
    value,
    negative ? "negative_assertion" : "positive_assertion",
    negative ? [...common, ...sources] : common,
    ["expected"],
  );
  stable(
    row.id,
    negative ? /^NA-[A-Z0-9][A-Z0-9-]*$/ : /^PA-[A-Z0-9][A-Z0-9-]*$/,
    negative ? "negative.id" : "positive.id",
  );
  string(row.observation_id, "observation_id");
  oneOf(
    row.observation_kind,
    [
      "scalar",
      "implementation_structure",
      "browser_interaction",
      "runtime_behavior",
      "api_contract",
      "data_state",
      "security_boundary",
      "population_coverage",
    ],
    "observation_kind",
  );
  oneOf(
    row.operator,
    [
      "equals",
      "not_equals",
      "contains",
      "not_contains",
      "matches",
      "not_matches",
      "greater_than",
      "greater_or_equal",
      "less_than",
      "less_or_equal",
      "truthy",
      "falsy",
      "exists",
      "not_exists",
      "set_equals",
      "subset_of",
      "superset_of",
    ],
    "operator",
  );
  const noExpected = ["truthy", "falsy", "exists", "not_exists"].includes(
    String(row.operator),
  );
  if (noExpected && row.expected !== undefined)
    throw new Error(`assertion_expected_forbidden:${String(row.id)}`);
  if (!noExpected && row.expected === undefined)
    throw new Error(`assertion_expected_required:${String(row.id)}`);
  if (negative) {
    for (const key of sources) stringArray(row[key], key);
    if (sources.every((key) => (row[key] as string[]).length === 0))
      throw new Error(`negative_assertion_without_source:${String(row.id)}`);
  }
}
function parseEnvironmentRequirement(value: unknown): void {
  const row = object(value, "environment_requirement", [
    "id",
    "reason_code",
    "probe_spec_id",
    "local_alternative_probe_ids",
    "minimal_user_action",
  ]);
  stable(row.id, /^ER-[A-Z0-9][A-Z0-9-]*$/, "environment.id");
  oneOf(
    row.reason_code,
    [
      "mfa_required",
      "credential_unavailable",
      "permission_denied",
      "user_contract_decision_required",
      "external_approval_required",
      "platform_or_legal_restriction",
      "external_service_persistently_unavailable",
    ],
    "environment.reason_code",
  );
  string(row.probe_spec_id, "environment.probe_spec_id");
  stringArray(
    row.local_alternative_probe_ids,
    "environment.local_alternative_probe_ids",
  );
  string(row.minimal_user_action, "environment.minimal_user_action");
}
function parseProbe(value: unknown): void {
  const row = object(value, "environment_probe", [
    "id",
    "kind",
    "adapter",
    "target",
    "timeout_ms",
    "expected",
    "artifact_globs",
    "environment_refs",
  ]);
  stable(row.id, /^ENV-PROBE-[A-Z0-9][A-Z0-9-]*$/, "probe.id");
  oneOf(
    row.kind,
    [
      "host_capability",
      "secret_ref",
      "permission",
      "network_endpoint",
      "command_step",
    ],
    "probe.kind",
  );
  oneOf(
    row.adapter,
    [
      "cli_auth",
      "credential_store",
      "filesystem_permission",
      "tcp_endpoint",
      "http_endpoint",
      "frozen_command_step",
    ],
    "probe.adapter",
  );
  string(row.target, "probe.target");
  integer(row.timeout_ms, "probe.timeout_ms");
  const expected = object(row.expected, "probe.expected", [
    "exit_codes",
    "error_codes",
  ]);
  numberArray(expected.exit_codes, "probe.exit_codes");
  stringArray(expected.error_codes, "probe.error_codes");
  stringArray(row.artifact_globs, "probe.artifact_globs");
  stringArray(row.environment_refs, "probe.environment_refs");
}

function object(
  value: unknown,
  label: string,
  allowed: string[],
  optional: string[] = [],
): Shape {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const row = value as Shape;
  for (const key of Object.keys(row))
    if (!allowed.includes(key))
      throw new Error(`${label} has unknown field ${key}`);
  for (const key of allowed)
    if (!optional.includes(key) && !(key in row))
      throw new Error(`${label} is missing ${key}`);
  return row;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}
function string(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} must be a non-empty string`);
}
function strings(row: Shape, keys: string[]): void {
  keys.forEach((key) => string(row[key], key));
}
function stringArray(value: unknown, label: string): asserts value is string[] {
  array(value, label).forEach((item) => string(item, label));
}
function numberArray(value: unknown, label: string): asserts value is number[] {
  array(value, label).forEach((item) => {
    if (!Number.isInteger(item))
      throw new Error(`${label} must contain integers`);
  });
}
function boolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
}
function integer(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0)
    throw new Error(`${label} must be a positive integer`);
}
function literal(value: unknown, expected: unknown, label: string): void {
  if (value !== expected)
    throw new Error(`${label}: expected ${String(expected)}`);
}
function oneOf(value: unknown, values: readonly string[], label: string): void {
  if (typeof value !== "string" || !values.includes(value))
    throw new Error(`${label} must be one of ${values.join(", ")}`);
}
function stable(value: unknown, pattern: RegExp, label: string): void {
  string(value, label);
  if (!pattern.test(value))
    throw new Error(`${label} has invalid stable ID ${value}`);
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
