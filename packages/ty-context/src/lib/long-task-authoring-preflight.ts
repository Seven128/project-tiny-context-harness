import path from "node:path";
import {
  authoringRevisionPreview,
  loadAuthoringActiveAuthority,
} from "./long-task-authoring-authority-preview.js";
import {
  addAuthoringDiagnostics,
  addDiagnosticError,
  sourceCoverage,
} from "./long-task-authoring-preflight-diagnostics.js";
import {
  emptyClaimCoverage,
  emptyPreflightResult,
  type AuthoringPreflightDiagnosticV1,
  type AuthoringPreflightResultV1,
} from "./long-task-authoring-preflight-types.js";
import { runAuthoringRepositoryPreflight } from "./long-task-authoring-repository-preflight.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import { parseDeliveryContractBundle } from "./long-task-delivery-parser.js";
import { deliveryContractStructureDiagnostics } from "./long-task-delivery-validation.js";
import { classifyLongTaskRisk, validateRiskProof } from "./long-task-risk.js";
import { repositoryRoot } from "./long-task-workspace.js";

export type {
  AuthoringPreflightDiagnosticV1,
  AuthoringPreflightResultV1,
  SourceCoverageV1,
} from "./long-task-authoring-preflight-types.js";

export async function preflightDeliveryContract(
  workdirInput: string,
  projectRootInput = process.cwd(),
): Promise<AuthoringPreflightResultV1> {
  const diagnostics: AuthoringPreflightDiagnosticV1[] = [];
  const repository = await repositoryRoot(projectRootInput);
  const workdir = path.resolve(workdirInput);
  let parsed;
  try {
    parsed = await parseDeliveryContractBundle(workdir, repository, {
      validate_structure: false,
    });
  } catch (error) {
    addDiagnosticError(diagnostics, error);
    return emptyPreflightResult(diagnostics);
  }
  const contract = parsed.contract;
  for (const error of deliveryContractStructureDiagnostics(contract))
    addDiagnosticError(diagnostics, error);
  addAuthoringDiagnostics(contract, parsed, diagnostics);

  let claims: ReturnType<typeof compileProductClaimCoverage> | null = null;
  try {
    claims = compileProductClaimCoverage(contract, { allow_uncovered: true });
  } catch (error) {
    addDiagnosticError(diagnostics, error);
  }

  let risk: ReturnType<typeof classifyLongTaskRisk> | null = null;
  try {
    risk = classifyLongTaskRisk(contract);
    validateRiskProof(contract, risk);
  } catch (error) {
    addDiagnosticError(diagnostics, error);
  }

  const repositoryResult = await runAuthoringRepositoryPreflight({
    repository,
    workdir,
    contract,
    claims,
    risk,
    diagnostics,
  });
  const active = await loadAuthoringActiveAuthority(
    repository,
    workdir,
    diagnostics,
  );
  const ready = !diagnostics.some(
    (item) => item.level === "error" || item.level === "decision_required",
  );
  return {
    schema_version: "long-task-authoring-preflight-v1",
    status: ready ? "ready" : "not_ready",
    would_create_authority_lock: active === null,
    outcomes: contract.outcomes.map((outcome) => outcome.key),
    source_coverage: sourceCoverage(contract),
    claim_coverage: claims?.summary ?? emptyClaimCoverage(),
    revision_preview: authoringRevisionPreview(
      contract,
      repositoryResult.source_hashes,
      repositoryResult.context_snapshot,
      active,
    ),
    diagnostics,
  };
}
