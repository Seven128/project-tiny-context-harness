import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import {
  DELIVERY_CONTRACT_FILE,
  parseDeliveryContractBundle,
} from "./long-task-delivery-parser.js";
import type {
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  InitialTaskBaseV2,
} from "./long-task-delivery-types.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import { freezeDeliveryCheck } from "./long-task-runner-freeze.js";
import { classifyLongTaskRisk, validateRiskProof } from "./long-task-risk.js";
import {
  hashDeclaredFiles,
  validateCounterfactualPaths,
  validateTechnicalPaths,
  validateVerificationInputSeparation,
} from "./long-task-delivery-preflight.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  changedAuthoritySections,
  computeAuthorityHashes,
} from "./long-task-authority.js";
import {
  authorityMaterialsChanged,
  compiledAuthorityMaterials,
  computeAuthorityMaterials,
} from "./long-task-authority-materials.js";
import {
  assertRiskNotDowngraded,
  enforceAuthorityRevision,
} from "./long-task-authority-revision-enforcement.js";
import { validateActualRiskSurfaces } from "./long-task-risk-surfaces.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import { validateSourceAnchors } from "./long-task-source-validation.js";
import {
  captureWorkspaceManifest,
  changedWorkspacePaths,
  currentGitTree,
  repoRelative,
  repositoryRoot,
} from "./long-task-workspace.js";

export interface CompileDeliveryOptionsV2 {
  require_completion_gate?: boolean;
  revise?: boolean;
  live_gate?: boolean;
  initial_task_base?: InitialTaskBaseV2;
  authority_revision?: number;
  previous_authority?: CompiledDeliveryContractV2 | null;
}

export async function compileDeliveryContract(
  workdirInput: string,
  projectRootInput = process.cwd(),
  options: CompileDeliveryOptionsV2 = {},
): Promise<CompiledDeliveryContractV2> {
  const repository = await repositoryRoot(projectRootInput);
  const workdir = path.resolve(workdirInput);
  const workdirRelative = repoRelative(repository, workdir);
  if (!workdirRelative)
    throw new Error("long_task_workdir_must_not_be_repository_root");
  const contractFile = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const parsed = await parseDeliveryContractBundle(workdir, repository);
  const contract = parsed.contract;
  await validateSourceAnchors(repository, contract.source_claims);
  const claims = compileProductClaimCoverage(contract);
  const risk = classifyLongTaskRisk(contract);
  validateRiskProof(contract, risk);
  const decisionClaims = contract.source_claims.filter(
    (claim) => claim.disposition.type === "decision_required",
  );
  if (decisionClaims.length)
    throw new Error(
      `source_claim_decision_required:${decisionClaims.map((claim) => claim.key).join(",")}`,
    );

  const contractHash = sha256Hex(canonicalValueJson(contract));
  const sourceHashes = await hashDeclaredFiles(
    repository,
    contract.task.source_paths,
    "source",
  );
  const context = await captureContextGraphSnapshot(
    repository,
    contract.task.context_refs,
    contract.task.context_snapshot_mode,
  );
  const authorityMaterials = computeAuthorityMaterials(
    contract,
    sourceHashes,
    context,
  );
  const previous = options.live_gate
    ? null
    : (options.previous_authority ?? null);
  const current = await captureWorkspaceManifest(repository, workdir);
  const initialTaskBase = options.initial_task_base ??
    previous?.initial_task_base ?? {
      git_commit: current.git_head,
      git_tree: await currentGitTree(repository),
      workspace_manifest: current,
    };
  await validateActualRiskSurfaces(
    repository,
    changedWorkspacePaths(initialTaskBase.workspace_manifest, current),
    contract,
  );
  validateTechnicalPaths(contract, repository, workdirRelative, current);

  const verifier = await captureVerifierIdentity(
    repository,
    options.require_completion_gate !== false,
  );
  const globalChecks = await Promise.all(
    contract.global.acceptance.checks.map((check) =>
      freezeDeliveryCheck(check, null, repository, current),
    ),
  );
  const outcomes: CompiledOutcomeV2[] = await Promise.all(
    contract.outcomes.map(async (outcome) => ({
      ...outcome,
      internal_id: `OUT.${outcome.key}`,
      generated_claims: claims.by_outcome[outcome.key],
      risk_reasons: risk.reasons_by_outcome[outcome.key],
      acceptance: {
        ...outcome.acceptance,
        checks: await Promise.all(
          outcome.acceptance.checks.map((check) =>
            freezeDeliveryCheck(check, outcome.key, repository, current),
          ),
        ),
      },
    })),
  );
  const allChecks = [
    ...globalChecks,
    ...outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  validateVerificationInputSeparation(contract, allChecks, workdirRelative);
  await validateCounterfactualPaths(
    contract,
    outcomes,
    repository,
    workdirRelative,
  );

  const authorityHashes = computeAuthorityHashes(contract);
  authorityHashes.acceptance_authority_hash = sha256Hex(
    canonicalValueJson({
      declared: authorityHashes.acceptance_authority_hash,
      claim_coverage: claims.summary,
      frozen_checks: allChecks.map((check) => ({
        internal_id: check.internal_id,
        runner_definition: check.runner.definition_sha256,
        resolved_cwd: check.runner.resolved_cwd,
        resolved_target: check.runner.resolved_target,
        package_script: check.runner.package_script,
        verification_inputs: check.verification_input_hashes,
        raw_execution_identity: check.raw_execution_identity,
      })),
    }),
  );

  let authorityRevision =
    options.authority_revision ?? previous?.authority_revision ?? 1;
  if (previous) {
    const changes = changedAuthoritySections(
      previous.authority_hashes,
      authorityHashes,
    );
    const contractChanged = previous.contract_sha256 !== contractHash;
    const materialsChanged = authorityMaterialsChanged(
      compiledAuthorityMaterials(previous),
      authorityMaterials,
    );
    const verifierChanged = verifierAuthorityDiff(
      previous.verifier_identity,
      verifier,
    );
    const authorityChanged =
      changes.length > 0 ||
      contractChanged ||
      materialsChanged ||
      verifierChanged.verifier_content_changed ||
      verifierChanged.verifier_runtime_locator_changed;
    if (authorityChanged && !options.revise)
      throw new Error("authority_revision_requires_revise_flag");
    if (options.revise && authorityChanged) {
      assertRiskNotDowngraded(previous, risk.effective_level, risk.reasons);
      authorityRevision = previous.authority_revision + 1;
      await enforceAuthorityRevision(
        previous,
        contract,
        authorityHashes,
        authorityMaterials,
        globalChecks,
        outcomes,
        verifier,
        workdir,
        risk.minimum_level,
      );
    }
  }

  const unsigned = {
    schema_version: "compiled-long-task-delivery-v2" as const,
    repository_root: repository,
    workdir,
    contract_file: repoRelative(repository, contractFile),
    contract_sha256: contractHash,
    contract_files: Object.fromEntries(
      Object.entries(parsed.contract_files).map(([relative, hash]) => [
        repoRelative(repository, path.join(workdir, ...relative.split("/"))),
        hash,
      ]),
    ),
    source_hashes: sourceHashes,
    context_snapshot: {
      mode: context.mode,
      topology_sha256: context.topology_sha256,
      files: context.files,
      sha256: context.sha256,
    },
    verifier_identity: verifier,
    effective_risk: risk.effective_level,
    risk_reasons: risk.reasons,
    baseline_workspace: initialTaskBase.workspace_manifest,
    initial_task_base: initialTaskBase,
    authority_hashes: authorityHashes,
    authority_materials: authorityMaterials,
    authority_revision: authorityRevision,
    claim_coverage: claims.summary,
    task: contract.task,
    risk: contract.risk,
    source_claims: contract.source_claims,
    global: {
      product: contract.global.product,
      technical: contract.global.technical,
      acceptance: {
        checks: globalChecks,
        external_confirmations:
          contract.global.acceptance.external_confirmations,
      },
    },
    outcomes,
  };
  return {
    ...unsigned,
    compiled_identity: sha256Hex(canonicalValueJson(unsigned)),
  };
}
