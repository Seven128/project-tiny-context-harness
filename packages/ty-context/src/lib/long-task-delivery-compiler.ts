import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import {
  DELIVERY_CONTRACT_FILE,
  parseDeliveryContractBundle,
} from "./long-task-delivery-parser.js";
import type {
  AuthorityHashesV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  InitialTaskBaseV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import { freezeDeliveryCheck } from "./long-task-runner-freeze.js";
import { classifyLongTaskRisk, validateRiskProof } from "./long-task-risk.js";
import {
  assertRepositoryPattern,
  matchesRepoPattern,
  patternsOverlap,
} from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  acceptanceSemanticsChanged,
  changedAuthoritySections,
  computeAuthorityHashes,
  isMonotonicAcceptanceStrengthening,
} from "./long-task-authority.js";
import {
  authorityRevisionApproved,
  readCompiledDeliveryContract,
  readProgressRecords,
  writePendingAuthorityRevision,
} from "./long-task-state.js";
import { validateActualRiskSurfaces } from "./long-task-risk-surfaces.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import {
  captureWorkspaceManifest,
  changedWorkspacePaths,
  currentGitTree,
  repoRelative,
  repositoryRoot,
  resolveInsideRepository,
} from "./long-task-workspace.js";

export interface CompileDeliveryOptionsV2 {
  require_completion_gate?: boolean;
  revise?: boolean;
  live_gate?: boolean;
  initial_task_base?: InitialTaskBaseV2;
  authority_revision?: number;
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
  const parsed = await parseDeliveryContractBundle(workdir);
  const contract = parsed.contract;
  const claims = compileProductClaimCoverage(contract);
  const risk = classifyLongTaskRisk(contract);
  validateRiskProof(contract, risk);
  if (
    (risk.effective_level === "strict" || parsed.outcome_files.length > 0) &&
    !contract.source_claims.length
  )
    throw new Error("source_claims_required_for_strict_or_bundle");
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
  const previous = options.live_gate
    ? null
    : await readPreviousCompiled(workdir);
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
    if ((changes.length || contractChanged) && !options.revise)
      throw new Error("authority_revision_requires_revise_flag");
    if (options.revise && (changes.length || contractChanged)) {
      assertRiskNotDowngraded(previous, risk.effective_level, risk.reasons);
      authorityRevision = previous.authority_revision + 1;
      await enforceAuthorityRevision(
        previous,
        contract,
        authorityHashes,
        current,
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

function assertRiskNotDowngraded(
  previous: CompiledDeliveryContractV2,
  nextLevel: "standard" | "strict",
  nextReasons: string[],
): void {
  if (previous.effective_risk === "strict" && nextLevel !== "strict")
    throw new Error("authority_risk_downgrade_rejected:strict_to_standard");
  const next = new Set(nextReasons);
  const removed = previous.risk_reasons.filter((reason) => !next.has(reason));
  if (removed.length)
    throw new Error(`authority_risk_downgrade_rejected:${removed.join(",")}`);
}

async function enforceAuthorityRevision(
  previous: CompiledDeliveryContractV2,
  nextContract: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
  current: WorkspaceManifestV2,
  workdir: string,
  riskFloor: "standard" | "strict",
): Promise<void> {
  const progress = await readProgressRecords(workdir);
  const gateExists = Boolean(
    (
      await stat(path.join(workdir, ".ty-context", "final-receipt.json")).catch(
        () => null,
      )
    )?.isFile(),
  );
  const executionStarted =
    changedWorkspacePaths(
      previous.initial_task_base.workspace_manifest,
      current,
    ).length > 0 ||
    Object.keys(progress).length > 0 ||
    gateExists;
  if (!executionStarted) return;
  const diff = authorityRevisionDiff(previous, nextContract, nextHashes);
  if (!diff.reduction_reasons.length) return;
  const unsignedRevision = {
    previous_hashes: previous.authority_hashes,
    next_hashes: nextHashes,
    changed_authority_sections: changedAuthoritySections(
      previous.authority_hashes,
      nextHashes,
    ),
    revision_diff: diff,
    new_risk_floor: riskFloor,
    affected_outcomes_or_contracts: nextContract.outcomes.map(
      (outcome) => outcome.key,
    ),
  };
  const revisionIdentity = sha256Hex(canonicalValueJson(unsignedRevision));
  if (!(await authorityRevisionApproved(workdir, revisionIdentity))) {
    await writePendingAuthorityRevision(workdir, {
      schema_version: "long-task-authority-revision-pending-v2",
      ...unsignedRevision,
      revision_identity: revisionIdentity,
      created_at: new Date().toISOString(),
    });
    throw new Error(
      `authority_change_requires_user_decision:${revisionIdentity}`,
    );
  }
}

function authorityRevisionDiff(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
): {
  product_claims_added: string[];
  product_claims_removed: string[];
  checks_added: string[];
  checks_removed: string[];
  negative_assertions_removed: string[];
  proof_surfaces_changed: string[];
  source_claims_changed: boolean;
  risk_changed: boolean;
  owner_or_path_boundary_changed: boolean;
  runner_or_verification_inputs_changed: boolean;
  technical_obligations_changed: boolean;
  reduction_reasons: string[];
} {
  const nextClaims = compileProductClaimCoverage(next).by_outcome;
  const beforeClaimIds = new Set(
    previous.outcomes.flatMap((outcome) =>
      outcome.generated_claims.map((claim) => claim.id),
    ),
  );
  const afterClaimIds = new Set(
    Object.values(nextClaims)
      .flat()
      .map((claim) => claim.id),
  );
  const beforeChecks = checkIndex(previous.outcomes);
  const afterChecks = checkIndex(next.outcomes);
  const productClaimsRemoved = [...beforeClaimIds].filter(
    (claim) => !afterClaimIds.has(claim),
  );
  const checksRemoved = [...beforeChecks.keys()].filter(
    (check) => !afterChecks.has(check),
  );
  const negativeRemoved: string[] = [];
  const surfacesChanged: string[] = [];
  for (const [identity, before] of beforeChecks) {
    const after = afterChecks.get(identity);
    if (!after) continue;
    const nextNegative = new Set(
      after.negative_assertions.map((assertion) => assertion.key),
    );
    for (const assertion of before.negative_assertions)
      if (!nextNegative.has(assertion.key))
        negativeRemoved.push(`${identity}:${assertion.key}`);
    if (before.proof_surface !== after.proof_surface)
      surfacesChanged.push(
        `${identity}:${before.proof_surface}->${after.proof_surface}`,
      );
  }
  const riskChanged =
    previous.authority_hashes.risk_authority_hash !==
    nextHashes.risk_authority_hash;
  const acceptanceChanged = acceptanceSemanticsChanged(previous, next);
  const monotonic = isMonotonicAcceptanceStrengthening(previous, next);
  const reductionReasons = [
    ...(productClaimsRemoved.length ? ["product_claim_removed"] : []),
    ...(checksRemoved.length ? ["check_removed"] : []),
    ...(negativeRemoved.length ? ["negative_assertion_removed"] : []),
    ...(surfacesChanged.length ? ["proof_surface_changed"] : []),
    ...(riskChanged ? ["risk_changed_requires_review"] : []),
    ...(acceptanceChanged && !monotonic ? ["acceptance_not_monotonic"] : []),
  ];
  return {
    product_claims_added: [...afterClaimIds].filter(
      (claim) => !beforeClaimIds.has(claim),
    ),
    product_claims_removed: productClaimsRemoved,
    checks_added: [...afterChecks.keys()].filter(
      (check) => !beforeChecks.has(check),
    ),
    checks_removed: checksRemoved,
    negative_assertions_removed: negativeRemoved,
    proof_surfaces_changed: surfacesChanged,
    source_claims_changed:
      previous.authority_hashes.source_authority_hash !==
      nextHashes.source_authority_hash,
    risk_changed: riskChanged,
    owner_or_path_boundary_changed:
      previous.authority_hashes.product_authority_hash !==
        nextHashes.product_authority_hash ||
      previous.authority_hashes.technical_authority_hash !==
        nextHashes.technical_authority_hash,
    runner_or_verification_inputs_changed:
      previous.authority_hashes.acceptance_authority_hash !==
      nextHashes.acceptance_authority_hash,
    technical_obligations_changed:
      previous.authority_hashes.technical_authority_hash !==
      nextHashes.technical_authority_hash,
    reduction_reasons: reductionReasons,
  };
}

function checkIndex(
  outcomes: Array<{
    key: string;
    acceptance: {
      checks: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"];
    };
  }>,
): Map<
  string,
  DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number]
> {
  return new Map(
    outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map(
        (check) => [`${outcome.key}.${check.key}`, check] as const,
      ),
    ),
  );
}

async function readPreviousCompiled(
  workdir: string,
): Promise<CompiledDeliveryContractV2 | null> {
  try {
    return await readCompiledDeliveryContract(workdir);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("ENOENT") ||
        error.message.includes("no such file"))
    )
      return null;
    throw error;
  }
}

function validateVerificationInputSeparation(
  contract: DeliveryContractV2,
  checks: CompiledDeliveryContractV2["outcomes"][number]["acceptance"]["checks"],
  workdirRelative: string,
): void {
  const implementation = contract.outcomes.flatMap((outcome) => [
    ...outcome.technical.expected_change_paths,
    ...outcome.technical.allowed_support_paths,
  ]);
  for (const check of checks)
    for (const source of Object.keys(check.verification_input_hashes)) {
      if (implementation.some((pattern) => patternsOverlap(pattern, source)))
        throw new Error(
          `verification_input_overlaps_implementation:${check.key}:${source}`,
        );
      if (
        source === workdirRelative ||
        source.startsWith(`${workdirRelative}/`) ||
        source === ".git" ||
        source.startsWith(".git/") ||
        source.split("/").includes("node_modules") ||
        check.artifact_globs.some((artifact) =>
          patternsOverlap(artifact, source),
        )
      )
        throw new Error(`verification_input_protected:${check.key}:${source}`);
    }
}

function validateTechnicalPaths(
  contract: DeliveryContractV2,
  repository: string,
  workdirRelative: string,
  baseline: WorkspaceManifestV2,
): void {
  const forbidden = [
    ...contract.global.technical.forbidden_paths.map((entry) => entry.path),
    ...contract.outcomes.flatMap(
      (outcome) => outcome.technical.forbidden_paths,
    ),
  ].map((pattern, index) =>
    assertRepositoryPattern(repository, pattern, `forbidden_paths[${index}]`),
  );
  for (const outcome of contract.outcomes) {
    const allowed = [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ].map((pattern, index) =>
      assertRepositoryPattern(
        repository,
        pattern,
        `${outcome.key}.allowed_paths[${index}]`,
      ),
    );
    for (const pattern of allowed) {
      if (patternsOverlap(pattern, workdirRelative))
        throw new Error(`protected_path_declared:long_task_workdir:${pattern}`);
      if (forbidden.some((blocked) => patternsOverlap(pattern, blocked)))
        throw new Error(`allowed_forbidden_path_overlap:${pattern}`);
    }
    for (const binding of outcome.technical.bindings) {
      const carriers = binding.carrier_paths.map((carrier) =>
        assertRepositoryPattern(
          repository,
          carrier,
          `${outcome.key}.${binding.key}.carrier_path`,
        ),
      );
      for (const carrier of carriers) {
        if (
          binding.existence === "existing" &&
          !baseline.files.some((file) => matchesRepoPattern(file.path, carrier))
        )
          throw new Error(
            `binding_carrier_path_not_found:${outcome.key}:${carrier}`,
          );
        if (!allowed.some((pattern) => patternsOverlap(pattern, carrier)))
          throw new Error(
            `binding_carrier_outside_change_paths:${outcome.key}:${carrier}`,
          );
      }
      if (binding.kind === "file") {
        const target = assertRepositoryPattern(
          repository,
          binding.target,
          `${outcome.key}.${binding.key}.target`,
        );
        if (!carriers.some((carrier) => matchesRepoPattern(target, carrier)))
          throw new Error(
            `binding_target_outside_carrier:${outcome.key}:${binding.key}`,
          );
      }
      if (binding.kind === "path_glob") {
        const target = assertRepositoryPattern(
          repository,
          binding.target,
          `${outcome.key}.${binding.key}.target`,
        );
        if (
          binding.existence === "existing" &&
          !baseline.files.some((file) => matchesRepoPattern(file.path, target))
        )
          throw new Error(
            `binding_target_not_found:${outcome.key}:${binding.key}`,
          );
      }
    }
  }
}

async function validateCounterfactualPaths(
  contract: DeliveryContractV2,
  compiledOutcomes: CompiledOutcomeV2[],
  repository: string,
  workdirRelative: string,
): Promise<void> {
  for (const outcome of contract.outcomes) {
    const compiled = compiledOutcomes.find((item) => item.key === outcome.key)!;
    const protectedInputs = new Set(
      compiled.acceptance.checks.flatMap((check) => [
        ...Object.keys(check.verification_input_hashes),
        check.runner.resolved_target,
      ]),
    );
    const mutationEnvelope = [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.bindings.flatMap((binding) => binding.carrier_paths),
      ...outcome.acceptance.checks.flatMap((check) => check.input_paths),
    ];
    for (const control of outcome.acceptance.counterfactual_controls) {
      const mutated =
        control.mutation.type === "remove_paths"
          ? control.mutation.paths
          : [control.mutation.path];
      for (const relative of mutated) {
        const target = resolveInsideRepository(
          repository,
          relative,
          `${outcome.key}.counterfactual`,
        );
        const normalized = repoRelative(repository, target);
        if (
          normalized === workdirRelative ||
          normalized.startsWith(`${workdirRelative}/`)
        )
          throw new Error(
            `counterfactual_path_protected:${outcome.key}:${relative}`,
          );
        if (
          protectedInputs.has(normalized) ||
          protectedInputs.has(relative.replace(/\\/gu, "/"))
        )
          throw new Error(
            `counterfactual_verification_input_protected:${outcome.key}:${relative}`,
          );
        if (
          !mutationEnvelope.some((pattern) =>
            matchesRepoPattern(normalized, pattern),
          )
        )
          throw new Error(
            `counterfactual_path_outside_carrier:${outcome.key}:${relative}`,
          );
        if (!(await stat(target).catch(() => null)))
          throw new Error(
            `counterfactual_path_not_found:${outcome.key}:${relative}`,
          );
      }
      if (control.mutation.type === "replace_file") {
        const fixture = repoRelative(
          repository,
          resolveInsideRepository(
            repository,
            control.mutation.fixture_path,
            `${outcome.key}.counterfactual.fixture`,
          ),
        );
        if (!protectedInputs.has(fixture))
          throw new Error(
            `counterfactual_fixture_must_be_verification_input:${outcome.key}:${fixture}`,
          );
      }
    }
  }
}

async function hashDeclaredFiles(
  repository: string,
  files: string[],
  label: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [index, file] of files.entries()) {
    const target = resolveInsideRepository(
      repository,
      file,
      `${label}[${index}]`,
    );
    const info = await stat(target).catch(() => null);
    if (!info?.isFile()) throw new Error(`${label}_path_not_found:${file}`);
    result[repoRelative(repository, target)] = sha256Hex(
      await readFile(target),
    );
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}
