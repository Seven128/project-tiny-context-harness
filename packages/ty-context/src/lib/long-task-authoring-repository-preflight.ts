import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import type { CompiledClaimsV2 } from "./long-task-claims.js";
import {
  captureDiagnostic,
  addDiagnosticError,
} from "./long-task-authoring-preflight-diagnostics.js";
import type { AuthoringPreflightDiagnosticV1 } from "./long-task-authoring-preflight-types.js";
import {
  hashDeclaredFiles,
  validateCounterfactualPaths,
  validateTechnicalPaths,
  validateVerificationInputSeparation,
} from "./long-task-delivery-preflight.js";
import type {
  CompiledCheckV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import type { RiskDecisionV2 } from "./long-task-risk.js";
import { freezeDeliveryCheck } from "./long-task-runner-freeze.js";
import { validateSourceAnchors } from "./long-task-source-validation.js";
import {
  captureWorkspaceManifest,
  repoRelative,
} from "./long-task-workspace.js";

export interface AuthoringRepositoryPreflight {
  source_hashes: Record<string, string> | null;
  context_snapshot: Awaited<
    ReturnType<typeof captureContextGraphSnapshot>
  > | null;
}

export async function runAuthoringRepositoryPreflight(options: {
  repository: string;
  workdir: string;
  contract: DeliveryContractV2;
  claims: CompiledClaimsV2 | null;
  risk: RiskDecisionV2 | null;
  diagnostics: AuthoringPreflightDiagnosticV1[];
}): Promise<AuthoringRepositoryPreflight> {
  const { repository, workdir, contract, claims, risk, diagnostics } = options;
  let sourceHashes: Record<string, string> | null = null;
  await captureDiagnostic(diagnostics, async () => {
    sourceHashes = await hashDeclaredFiles(
      repository,
      contract.task.source_paths,
      "source",
    );
  });
  await captureDiagnostic(diagnostics, () =>
    validateSourceAnchors(repository, contract.source_claims),
  );

  let context: Awaited<ReturnType<typeof captureContextGraphSnapshot>> | null =
    null;
  await captureDiagnostic(diagnostics, async () => {
    context = await captureContextGraphSnapshot(
      repository,
      contract.task.context_refs,
      contract.task.context_snapshot_mode,
    );
  });

  const workdirRelative = repoRelative(repository, workdir);
  let workspace: Awaited<ReturnType<typeof captureWorkspaceManifest>> | null =
    null;
  await captureDiagnostic(diagnostics, async () => {
    workspace = await captureWorkspaceManifest(repository, workdir);
    validateTechnicalPaths(contract, repository, workdirRelative, workspace);
  });
  if (!workspace)
    return { source_hashes: sourceHashes, context_snapshot: context };

  const globalChecks: CompiledCheckV2[] = [];
  const compiledOutcomes: CompiledOutcomeV2[] = [];
  for (const check of contract.global.acceptance.checks)
    await freezeOne(
      check,
      null,
      repository,
      workspace,
      diagnostics,
      globalChecks,
    );
  for (const outcome of contract.outcomes) {
    const checks: CompiledCheckV2[] = [];
    for (const check of outcome.acceptance.checks)
      await freezeOne(
        check,
        outcome.key,
        repository,
        workspace,
        diagnostics,
        checks,
      );
    compiledOutcomes.push({
      ...outcome,
      internal_id: `OUT.${outcome.key}`,
      generated_claims: claims?.by_outcome[outcome.key] ?? [],
      risk_reasons: risk?.reasons_by_outcome[outcome.key] ?? [],
      acceptance: { ...outcome.acceptance, checks },
    });
  }
  const checks = [
    ...globalChecks,
    ...compiledOutcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  await captureDiagnostic(diagnostics, async () =>
    validateVerificationInputSeparation(contract, checks, workdirRelative),
  );
  if (allChecksFrozen(contract, compiledOutcomes))
    await captureDiagnostic(diagnostics, () =>
      validateCounterfactualPaths(
        contract,
        compiledOutcomes,
        repository,
        workdirRelative,
      ),
    );
  return { source_hashes: sourceHashes, context_snapshot: context };
}

async function freezeOne(
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  outcomeKey: string | null,
  repository: string,
  workspace: Awaited<ReturnType<typeof captureWorkspaceManifest>>,
  diagnostics: AuthoringPreflightDiagnosticV1[],
  target: CompiledCheckV2[],
): Promise<void> {
  try {
    target.push(
      await freezeDeliveryCheck(check, outcomeKey, repository, workspace),
    );
  } catch (error) {
    addDiagnosticError(diagnostics, error, outcomeKey, check.key);
  }
}

function allChecksFrozen(
  contract: DeliveryContractV2,
  compiledOutcomes: CompiledOutcomeV2[],
): boolean {
  return compiledOutcomes.every(
    (outcome) =>
      outcome.acceptance.checks.length ===
      contract.outcomes.find((item) => item.key === outcome.key)!.acceptance
        .checks.length,
  );
}
