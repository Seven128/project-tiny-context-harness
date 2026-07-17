export type RequestedRiskLevel = "auto" | "standard" | "strict";
export type EffectiveRiskLevel = "standard" | "strict";

export const RISK_FACT_NAMES = [
  "public_api_or_schema_change",
  "persistent_data_change",
  "data_migration",
  "security_boundary_change",
  "permission_boundary_change",
  "irreversible_external_effect",
  "critical_user_path",
  "full_population_operation",
  "multi_repository_change",
  "weak_observability",
] as const;

export type RiskFactName = (typeof RISK_FACT_NAMES)[number];

export type LongTaskRiskFacts = Record<RiskFactName, string[]>;
