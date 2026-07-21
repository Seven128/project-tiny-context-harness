type Row = Record<string, unknown>;

export function semanticDriftMigrationFields(value: unknown): string[] {
  const root = row(value);
  if (!root || root.schema_version !== "long-task-delivery-v2") return [];
  const missing: string[] = [];
  required(root, "$", ["stages"], missing);
  const task = row(root.task);
  if (task) {
    required(task, "task", ["target_profile", "execution_targets"], missing);
    const profile = row(task.target_profile);
    if (profile)
      required(
        profile,
        "task.target_profile",
        ["required_target_refs"],
        missing,
      );
  }
  for (const [index, outcome] of rows(root.outcomes).entries())
    collectOutcome(outcome, `outcomes[${index}]`, missing);
  const global = row(root.global);
  const globalAcceptance = row(global?.acceptance);
  collectChecks(globalAcceptance?.checks, "global.acceptance.checks", missing);
  for (const [index, confirmation] of rows(
    globalAcceptance?.external_confirmations,
  ).entries())
    required(
      confirmation,
      `global.acceptance.external_confirmations[${index}]`,
      ["kind", "impact_claims", "blocks_target"],
      missing,
    );
  return [...new Set(missing)].sort();
}

export function semanticDriftOutcomeMigrationFields(
  value: unknown,
  label: string,
): string[] {
  const missing: string[] = [];
  const outcome = row(value);
  if (outcome) collectOutcome(outcome, label, missing);
  return [...new Set(missing)].sort();
}

export function assertNoSemanticDriftMigration(fields: string[]): void {
  if (!fields.length) return;
  const detail = fields.slice(0, 24).join(",");
  const suffix = fields.length > 24 ? `,+${fields.length - 24}-more` : "";
  throw new Error(
    `long_task_delivery_v2_semantic_drift_migration_required:${detail}${suffix}`,
  );
}

function collectOutcome(outcome: Row, label: string, missing: string[]): void {
  required(outcome, label, ["stage"], missing);
  const product = row(outcome.product);
  if (product)
    required(
      product,
      `${label}.product`,
      ["success_path_required", "degradation_path_required"],
      missing,
    );
  const acceptance = row(outcome.acceptance);
  collectChecks(acceptance?.checks, `${label}.acceptance.checks`, missing);
}

function collectChecks(value: unknown, label: string, missing: string[]): void {
  for (const [index, check] of rows(value).entries()) {
    const checkLabel = `${label}[${index}]`;
    required(
      check,
      checkLabel,
      ["journey_roles", "execution_target", "scenario"],
      missing,
    );
    for (const polarity of ["positive_assertions", "negative_assertions"])
      for (const [assertionIndex, assertion] of rows(check[polarity]).entries())
        required(
          assertion,
          `${checkLabel}.${polarity}[${assertionIndex}]`,
          ["evidence_capabilities"],
          missing,
        );
  }
}

function required(
  value: Row,
  label: string,
  keys: string[],
  missing: string[],
): void {
  for (const key of keys)
    if (!Object.hasOwn(value, key)) missing.push(`${label}.${key}`);
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.map(row).filter((item): item is Row => item !== null)
    : [];
}

function row(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : null;
}
