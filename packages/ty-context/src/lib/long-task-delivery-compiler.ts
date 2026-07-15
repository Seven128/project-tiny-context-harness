import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import {
  DELIVERY_CONTRACT_FILE,
  parseDeliveryContractBundle,
} from "./long-task-delivery-parser.js";
import type {
  CompiledDeliveryContractV1,
  CompiledOutcomeV1,
  DeliveryContractV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
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
  protectedAuthorityChanged,
} from "./long-task-authority.js";
import {
  authorityRevisionApproved,
  readCompiledDeliveryContract,
  readActiveLongTaskBinding,
  readProgressRecords,
  writePendingAuthorityRevision,
} from "./long-task-state.js";
import {
  computeContractInterfaceIdentity,
  readChildGateReceipt,
  readCompiledDeliverySet,
} from "./long-task-delivery-set-state.js";
import type { CompiledDeliverySetV1 } from "./long-task-delivery-set-types.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
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

export interface CompileDeliveryOptionsV1 {
  require_completion_gate?: boolean;
  amendment_reason?: string;
}

export async function compileDeliveryContract(
  workdirInput: string,
  projectRootInput = process.cwd(),
  options: CompileDeliveryOptionsV1 = {},
): Promise<CompiledDeliveryContractV1> {
  const repository = await repositoryRoot(projectRootInput);
  const workdir = path.resolve(workdirInput);
  const workdirRelative = repoRelative(repository, workdir);
  if (!workdirRelative)
    throw new Error("long_task_workdir_must_not_be_repository_root");
  const contractFile = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const parsed = await parseDeliveryContractBundle(workdir);
  const contract = parsed.contract;
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
  const active = await readActiveLongTaskBinding(repository);
  const compiledSet =
    active?.mode === "delivery_set"
      ? await readCompiledDeliverySet(active.set_workdir)
      : null;
  if (
    active?.mode === "delivery_set" &&
    active.compiled_set_identity !== compiledSet?.compiled_set_identity
  )
    throw new Error("active_delivery_set_identity_mismatch");
  const previous = await readPreviousCompiled(workdir);
  const excludedWorkdirs = compiledSet
    ? [
        compiledSet.set_workdir,
        ...compiledSet.contracts.map((contract) => contract.resolved_workdir),
      ].filter((item) => item !== workdir)
    : [];
  const current = await captureWorkspaceManifest(
    repository,
    workdir,
    undefined,
    excludedWorkdirs,
  );
  const initialTaskBase = previous?.initial_task_base ?? {
    git_commit: current.git_head,
    git_tree: await currentGitTree(repository),
    workspace_manifest: current,
  };
  const baseline = initialTaskBase.workspace_manifest;
  await validateActualRiskSurfaces(
    repository,
    changedWorkspacePaths(baseline, current),
    contract,
  );
  validateTechnicalPaths(contract, repository, workdirRelative, current);
  await validateCounterfactualPaths(contract, repository, workdirRelative);
  const verifier = await captureVerifierIdentity(
    repository,
    options.require_completion_gate !== false,
  );
  const globalChecks = await Promise.all(
    contract.global.acceptance.checks.map((check) =>
      freezeDeliveryCheck(check, null, repository, current),
    ),
  );
  const outcomes: CompiledOutcomeV1[] = await Promise.all(
    contract.outcomes.map(async (outcome) => ({
      ...outcome,
      internal_id: `OUT.${outcome.key}`,
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
  validateVerificationSourceSeparation(contract);
  const authorityHashes = computeAuthorityHashes(contract);
  authorityHashes.acceptance_authority_hash = sha256Hex(
    canonicalValueJson({
      declared: authorityHashes.acceptance_authority_hash,
      frozen_verification_sources: [
        ...globalChecks,
        ...outcomes.flatMap((outcome) => outcome.acceptance.checks),
      ].map((check) => ({
        internal_id: check.internal_id,
        runner_definition: check.runner.definition_sha256,
        frozen_files: check.runner.frozen_files,
        verification_sources: check.verification_source_hashes,
      })),
    }),
  );
  const monotonicAcceptanceStrengthening = previous
    ? isMonotonicAcceptanceStrengthening(previous, contract)
    : false;
  if (previous && monotonicAcceptanceStrengthening) {
    const strengthenedAcceptanceHash =
      authorityHashes.acceptance_authority_hash;
    authorityHashes.acceptance_authority_hash =
      previous.authority_hashes.acceptance_authority_hash;
    authorityHashes.technical_authority_hash = sha256Hex(
      canonicalValueJson({
        technical: authorityHashes.technical_authority_hash,
        acceptance_strengthening: strengthenedAcceptanceHash,
      }),
    );
  }
  const deliverySetBinding = compiledSet
    ? await compileDeliverySetChildBinding(
        compiledSet,
        workdir,
        contract,
        risk.effective_level,
        current,
      )
    : null;
  if (previous) {
    const progress = await readProgressRecords(workdir);
    const gateExists = Boolean(
      (
        await stat(
          path.join(workdir, ".ty-context", "contract-gate-receipt.json"),
        ).catch(() => null)
      )?.isFile() ||
      (
        await stat(
          path.join(workdir, ".ty-context", "final-receipt.json"),
        ).catch(() => null)
      )?.isFile(),
    );
    const executionStarted =
      changedWorkspacePaths(initialTaskBase.workspace_manifest, current)
        .length > 0 ||
      Object.keys(progress).length > 0 ||
      gateExists;
    const protectedChanges = protectedAuthorityChanged(
      previous,
      authorityHashes,
    );
    if (
      acceptanceSemanticsChanged(previous, contract) &&
      !monotonicAcceptanceStrengthening &&
      !protectedChanges.includes("acceptance")
    )
      protectedChanges.push("acceptance");
    const allChanges = changedAuthoritySections(
      previous.authority_hashes,
      authorityHashes,
    );
    if (executionStarted && protectedChanges.length) {
      const unsignedRevision = {
        previous_hashes: previous.authority_hashes,
        next_hashes: authorityHashes,
        changed_authority_sections: protectedChanges,
        reason:
          options.amendment_reason ?? "Protected delivery authority changed.",
        new_risk_floor: risk.minimum_level,
        affected_outcomes_or_contracts: contract.outcomes.map(
          (outcome) => outcome.key,
        ),
      };
      const revisionIdentity = sha256Hex(canonicalValueJson(unsignedRevision));
      if (!(await authorityRevisionApproved(workdir, revisionIdentity))) {
        await writePendingAuthorityRevision(workdir, {
          schema_version: "long-task-authority-revision-pending-v1",
          ...unsignedRevision,
          revision_identity: revisionIdentity,
          created_at: new Date().toISOString(),
        });
        throw new Error(
          `authority_change_requires_user_decision:${revisionIdentity}`,
        );
      }
    } else if (
      executionStarted &&
      allChanges.includes("technical") &&
      !options.amendment_reason?.trim()
    ) {
      throw new Error("technical_amendment_reason_required");
    }
  }
  const unsigned = {
    schema_version: "compiled-long-task-delivery-v1" as const,
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
    baseline_workspace: baseline,
    initial_task_base: initialTaskBase,
    authority_hashes: authorityHashes,
    delivery_set: deliverySetBinding,
    task: contract.task,
    risk: contract.risk,
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

async function compileDeliverySetChildBinding(
  set: CompiledDeliverySetV1,
  workdir: string,
  contract: DeliveryContractV1,
  effectiveRisk: "standard" | "strict",
  manifest: WorkspaceManifestV1,
): Promise<CompiledDeliveryContractV1["delivery_set"]> {
  const entry = set.contracts.find(
    (candidate) => candidate.resolved_workdir === workdir,
  );
  if (!entry) throw new Error("delivery_set_child_not_registered");
  if (contract.task.id !== entry.key)
    throw new Error(
      `delivery_set_child_task_id_mismatch:${entry.key}:${contract.task.id}`,
    );
  if (set.definition.set.risk_floor === "strict" && effectiveRisk !== "strict")
    throw new Error(`delivery_set_child_risk_below_floor:${entry.key}`);
  for (const value of set.definition.global.product.non_goals)
    if (!contract.global.product.non_goals.includes(value))
      throw new Error(
        `delivery_set_child_non_goal_conflict:${entry.key}:${value}`,
      );
  for (const value of set.definition.global.product.owner_boundaries)
    if (!contract.global.product.owner_boundaries.includes(value))
      throw new Error(
        `delivery_set_child_owner_boundary_conflict:${entry.key}:${value}`,
      );
  const unresolvedDecision = set.definition.source_claims.filter(
    (claim) =>
      claim.disposition.type === "decision_required" &&
      entry.source_claim_refs.includes(claim.key),
  );
  if (unresolvedDecision.length)
    throw new Error(
      `source_claim_decision_required:${unresolvedDecision.map((claim) => claim.key).join(",")}`,
    );
  const dependencyContractIdentities: Record<string, string> = {};
  const dependencyReceiptIdentities: Record<string, string> = {};
  const dependencyInterfaceIdentities: Record<string, string> = {};
  for (const dependencyKey of entry.depends_on) {
    const dependencyEntry = set.contracts.find(
      (candidate) => candidate.key === dependencyKey,
    )!;
    const dependency = await readCompiledDeliveryContract(
      dependencyEntry.resolved_workdir,
    ).catch(() => null);
    const receipt = await readChildGateReceipt(
      dependencyEntry.resolved_workdir,
    );
    if (
      !dependency ||
      !receipt ||
      receipt.set_identity !== set.compiled_set_identity ||
      receipt.contract_key !== dependencyKey ||
      receipt.contract_identity !== dependency.compiled_identity ||
      (await deliveryCompileFreshness(dependency)).length > 0
    )
      throw new Error(
        `delivery_set_dependency_not_ready:${entry.key}:${dependencyKey}`,
      );
    const currentInterface = computeContractInterfaceIdentity(
      dependency,
      manifest,
    );
    if (receipt.interface_identity !== currentInterface)
      throw new Error(
        `delivery_set_dependency_interface_stale:${entry.key}:${dependencyKey}`,
      );
    dependencyContractIdentities[dependencyKey] = dependency.compiled_identity;
    dependencyReceiptIdentities[dependencyKey] = receipt.receipt_sha256;
    dependencyInterfaceIdentities[dependencyKey] = currentInterface;
  }
  return {
    set_workdir: set.set_workdir,
    set_identity: set.compiled_set_identity,
    contract_key: entry.key,
    dependency_contract_identities: dependencyContractIdentities,
    dependency_receipt_identities: dependencyReceiptIdentities,
    dependency_interface_identities: dependencyInterfaceIdentities,
  };
}

async function readPreviousCompiled(
  workdir: string,
): Promise<CompiledDeliveryContractV1 | null> {
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

function validateVerificationSourceSeparation(
  contract: Awaited<ReturnType<typeof parseDeliveryContractBundle>>["contract"],
): void {
  const implementation = contract.outcomes.flatMap((outcome) => [
    ...outcome.technical.expected_change_paths,
    ...outcome.technical.allowed_support_paths,
  ]);
  const checks = [
    ...contract.global.acceptance.checks,
    ...contract.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  for (const check of checks)
    for (const source of check.verification_sources)
      if (implementation.some((pattern) => patternsOverlap(pattern, source)))
        throw new Error(
          `verification_source_overlaps_implementation:${check.key}:${source}`,
        );
}

function validateTechnicalPaths(
  contract: DeliveryContractV1,
  repository: string,
  workdirRelative: string,
  baseline: WorkspaceManifestV1,
): void {
  const forbidden = [
    ...contract.global.technical.forbidden_paths,
    ...contract.outcomes.flatMap(
      (outcome) => outcome.technical.forbidden_paths,
    ),
  ].map((pattern, index) =>
    assertRepositoryPattern(repository, pattern, `forbidden_paths[${index}]`),
  );
  const allowed = contract.outcomes
    .flatMap((outcome) => [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ])
    .map((pattern, index) =>
      assertRepositoryPattern(repository, pattern, `allowed_paths[${index}]`),
    );
  for (const pattern of allowed) {
    if (patternsOverlap(pattern, workdirRelative))
      throw new Error(`protected_path_declared:long_task_workdir:${pattern}`);
    if (forbidden.some((blocked) => patternsOverlap(pattern, blocked)))
      throw new Error(`allowed_forbidden_path_overlap:${pattern}`);
  }
  for (const outcome of contract.outcomes)
    for (const binding of outcome.technical.bindings)
      for (const carrier of binding.carrier_paths) {
        const normalized = assertRepositoryPattern(
          repository,
          carrier,
          `${outcome.key}.binding.carrier_path`,
        );
        if (
          binding.existence === "existing" &&
          !baseline.files.some((file) =>
            matchesRepoPattern(file.path, normalized),
          )
        )
          throw new Error(
            `binding_carrier_path_not_found:${outcome.key}:${carrier}`,
          );
        if (!allowed.some((pattern) => patternsOverlap(pattern, normalized)))
          throw new Error(
            `binding_carrier_outside_change_paths:${outcome.key}:${carrier}`,
          );
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
  return sortRecord(result);
}

async function validateCounterfactualPaths(
  contract: DeliveryContractV1,
  repository: string,
  workdirRelative: string,
): Promise<void> {
  for (const outcome of contract.outcomes) {
    for (const control of outcome.acceptance.counterfactual_controls) {
      const paths =
        control.mutation.type === "remove_paths"
          ? control.mutation.paths
          : [control.mutation.path, control.mutation.fixture_path];
      for (const relative of paths) {
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
        if (!(await stat(target).catch(() => null)))
          throw new Error(
            `counterfactual_path_not_found:${outcome.key}:${relative}`,
          );
      }
    }
  }
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}
