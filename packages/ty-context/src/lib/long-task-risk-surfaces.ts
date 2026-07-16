import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DeliveryContractV2,
  RiskFactName,
} from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { parseStrictYaml } from "./strict-codec.js";

interface RiskSurfaceV1 {
  risk: RiskFactName | "classification_required";
  paths: string[];
}

export async function validateActualRiskSurfaces(
  repository: string,
  changedPaths: string[],
  contract: DeliveryContractV2,
): Promise<void> {
  const inferred = new Set<RiskFactName>();
  const surfaces = await readRiskSurfaces(repository);
  for (const surface of surfaces)
    if (
      changedPaths.some((changed) =>
        surface.paths.some((pattern) => matchesRepoPattern(changed, pattern)),
      )
    ) {
      if (surface.risk === "classification_required")
        throw new Error("risk_classification_required");
      inferred.add(surface.risk);
    }
  for (const fact of inferred)
    if (contract.risk.facts[fact].length === 0)
      throw new Error(`risk_fact_underdeclared:${fact}`);
}

async function readRiskSurfaces(repository: string): Promise<RiskSurfaceV1[]> {
  const file = path.join(repository, "project_context", "risk-surfaces.yaml");
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const value = parseStrictYaml(raw);
  if (!Array.isArray(value)) throw new Error("risk_surfaces_invalid:root");
  const facts = new Set<string>([
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
    "classification_required",
  ]);
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error(`risk_surfaces_invalid:${index}`);
    const row = item as Record<string, unknown>;
    if (
      Object.keys(row).some((key) => !["risk", "paths"].includes(key)) ||
      typeof row.risk !== "string" ||
      !facts.has(row.risk) ||
      !Array.isArray(row.paths) ||
      row.paths.some((value) => typeof value !== "string" || !value)
    )
      throw new Error(`risk_surfaces_invalid:${index}`);
    return {
      risk: row.risk as RiskSurfaceV1["risk"],
      paths: row.paths as string[],
    };
  });
}
