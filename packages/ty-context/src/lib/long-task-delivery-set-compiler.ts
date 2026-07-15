import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import { parseDeliveryContract } from "./long-task-delivery-parser.js";
import {
  DELIVERY_SET_FILE,
  parseDeliverySet,
} from "./long-task-delivery-set-parser.js";
import type {
  CompileDeliverySetOptionsV1,
  CompiledDeliverySetV1,
  DeliverySetV1,
} from "./long-task-delivery-set-types.js";
import { freezeDeliveryCheck } from "./long-task-runner-freeze.js";
import { patternsOverlap } from "./long-task-paths.js";
import { classifyLongTaskRisk } from "./long-task-risk.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import {
  captureWorkspaceManifest,
  changedWorkspacePaths,
  currentGitTree,
  repoRelative,
  repositoryRoot,
  resolveInsideRepository,
} from "./long-task-workspace.js";
import {
  readOptionalCompiledDeliverySet,
  setRevisionApproved,
  writeSetPendingRevision,
} from "./long-task-delivery-set-state.js";

export async function compileDeliverySet(
  setdirInput: string,
  projectRootInput = process.cwd(),
  options: CompileDeliverySetOptionsV1 = {},
): Promise<CompiledDeliverySetV1> {
  const repository = await repositoryRoot(projectRootInput);
  const setdir = path.resolve(setdirInput);
  const setdirRelative = repoRelative(repository, setdir);
  if (!setdirRelative)
    throw new Error("delivery_set_workdir_must_not_be_repository_root");
  const definition = await parseDeliverySet(setdir);
  const setFile = path.join(setdir, DELIVERY_SET_FILE);
  const sourceHashes = await hashDeclaredFiles(
    repository,
    definition.set.source_paths,
    "delivery_set_source",
  );
  if (!definition.source_claims.length)
    throw new Error("delivery_set_source_claims_required");
  validateClaimCoverage(definition);
  const context = await captureContextGraphSnapshot(
    repository,
    definition.set.context_refs,
    definition.set.context_snapshot_mode,
  );
  const resolvedEntries = definition.contracts.map((entry) => {
    const resolved = resolveInsideRepository(
      repository,
      entry.workdir,
      `delivery_set.contracts.${entry.key}.workdir`,
    );
    if (resolved === repository || resolved === setdir)
      throw new Error(`delivery_set_contract_workdir_invalid:${entry.key}`);
    return { ...entry, resolved_workdir: resolved };
  });
  const previous = await readOptionalCompiledDeliverySet(setdir);
  const current = await captureWorkspaceManifest(
    repository,
    setdir,
    undefined,
    resolvedEntries.map((entry) => entry.resolved_workdir),
  );
  const initialTaskBase = previous?.initial_task_base ?? {
    git_commit: current.git_head,
    git_tree: await currentGitTree(repository),
    workspace_manifest: current,
  };
  const contracts = [];
  const implementationPatterns: string[] = [];
  for (const entry of resolvedEntries) {
    const resolved = entry.resolved_workdir;
    const contractFile = path.join(resolved, "delivery-contract.yaml");
    if (!(await stat(contractFile).catch(() => null))?.isFile())
      throw new Error(`delivery_set_child_contract_missing:${entry.key}`);
    const contract = await parseDeliveryContract(resolved);
    validateChildContract(definition, entry.key, contract);
    implementationPatterns.push(
      ...contract.outcomes.flatMap((outcome) => [
        ...outcome.technical.expected_change_paths,
        ...outcome.technical.allowed_support_paths,
      ]),
    );
    contracts.push(entry);
  }
  for (const check of definition.global.acceptance.integration_checks)
    for (const source of check.verification_sources)
      if (
        implementationPatterns.some((pattern) =>
          patternsOverlap(pattern, source),
        )
      )
        throw new Error(
          `verification_source_overlaps_implementation:${check.key}:${source}`,
        );
  const verifier = await captureVerifierIdentity(
    repository,
    options.require_completion_gate !== false,
  );
  const integrationChecks = await Promise.all(
    definition.global.acceptance.integration_checks.map(async (check) => {
      const compiled = await freezeDeliveryCheck(
        check,
        null,
        repository,
        current,
      );
      return { ...compiled, internal_id: `CHECK.SET.${check.key}` };
    }),
  );
  const setAuthorityHashes = computeSetAuthorityHashes(definition);
  if (previous) {
    const executionStarted =
      changedWorkspacePaths(initialTaskBase.workspace_manifest, current)
        .length > 0 ||
      (await anyChildState(
        contracts.map((contract) => contract.resolved_workdir),
      ));
    const changed = Object.keys(setAuthorityHashes).filter(
      (key) =>
        previous.set_authority_hashes[
          key as keyof typeof setAuthorityHashes
        ] !== setAuthorityHashes[key as keyof typeof setAuthorityHashes],
    );
    if (executionStarted && changed.length) {
      const unsignedRevision = {
        previous_hashes: previous.set_authority_hashes,
        next_hashes: setAuthorityHashes,
        changed_authority_sections: changed,
        reason: options.amendment_reason ?? "Delivery Set authority changed.",
        new_risk_floor: definition.set.risk_floor,
        affected_outcomes_or_contracts: definition.contracts.map(
          (contract) => contract.key,
        ),
      };
      const revisionIdentity = sha256Hex(canonicalValueJson(unsignedRevision));
      if (!(await setRevisionApproved(setdir, revisionIdentity))) {
        await writeSetPendingRevision(setdir, {
          schema_version: "long-task-authority-revision-pending-v1",
          ...unsignedRevision,
          revision_identity: revisionIdentity,
          created_at: new Date().toISOString(),
        });
        throw new Error(
          `authority_change_requires_user_decision:${revisionIdentity}`,
        );
      }
    }
  }
  const unsigned = {
    schema_version: "compiled-long-task-delivery-set-v1" as const,
    repository_root: repository,
    set_workdir: setdir,
    set_file: repoRelative(repository, setFile),
    set_sha256: sha256Hex(canonicalValueJson(definition)),
    source_hashes: sourceHashes,
    context_snapshot: {
      mode: context.mode,
      topology_sha256: context.topology_sha256,
      files: context.files,
      sha256: context.sha256,
    },
    verifier_identity: verifier,
    initial_task_base: initialTaskBase,
    set_authority_hashes: setAuthorityHashes,
    definition,
    integration_checks: integrationChecks,
    contracts,
  };
  return {
    ...unsigned,
    compiled_set_identity: sha256Hex(canonicalValueJson(unsigned)),
  };
}

function validateClaimCoverage(definition: DeliverySetV1): void {
  const entries = new Map(
    definition.contracts.map((contract) => [contract.key, contract]),
  );
  for (const claim of definition.source_claims) {
    if (claim.disposition.type === "contract")
      for (const reference of claim.disposition.refs) {
        const entry = entries.get(reference)!;
        if (!entry.source_claim_refs.includes(claim.key))
          throw new Error(
            `delivery_set_source_claim_not_registered:${claim.key}:${reference}`,
          );
      }
  }
  for (const entry of definition.contracts)
    for (const claimKey of entry.source_claim_refs) {
      const claim = definition.source_claims.find(
        (item) => item.key === claimKey,
      )!;
      if (
        claim.disposition.type === "contract" &&
        !claim.disposition.refs.includes(entry.key)
      )
        throw new Error(
          `delivery_set_source_claim_disposition_mismatch:${claimKey}:${entry.key}`,
        );
    }
}

function validateChildContract(
  definition: DeliverySetV1,
  key: string,
  contract: Awaited<ReturnType<typeof parseDeliveryContract>>,
): void {
  if (contract.task.id !== key)
    throw new Error(
      `delivery_set_child_task_id_mismatch:${key}:${contract.task.id}`,
    );
  for (const item of definition.global.product.non_goals)
    if (!contract.global.product.non_goals.includes(item))
      throw new Error(`delivery_set_child_non_goal_conflict:${key}:${item}`);
  for (const item of definition.global.product.owner_boundaries)
    if (!contract.global.product.owner_boundaries.includes(item))
      throw new Error(
        `delivery_set_child_owner_boundary_conflict:${key}:${item}`,
      );
  const risk = classifyLongTaskRisk(contract);
  if (
    definition.set.risk_floor === "strict" &&
    risk.effective_level !== "strict"
  )
    throw new Error(`delivery_set_child_risk_below_floor:${key}`);
}

function computeSetAuthorityHashes(definition: DeliverySetV1) {
  const hash = (value: unknown) => sha256Hex(canonicalValueJson(value));
  return {
    source: hash({
      source_paths: definition.set.source_paths,
      source_claims: definition.source_claims,
    }),
    product: hash({
      goal: definition.set.goal,
      global: definition.global.product,
    }),
    acceptance: hash(definition.global.acceptance),
    risk: hash({ risk_floor: definition.set.risk_floor }),
    technical: hash(definition.global.technical),
    boundaries: hash(
      definition.contracts.map((contract) => ({
        key: contract.key,
        depends_on: contract.depends_on,
        boundary: contract.boundary,
      })),
    ),
  };
}

async function anyChildState(workdirs: string[]): Promise<boolean> {
  for (const workdir of workdirs)
    if (
      (
        await stat(path.join(workdir, ".ty-context")).catch(() => null)
      )?.isDirectory()
    )
      return true;
  return false;
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
    if (!(await stat(target).catch(() => null))?.isFile())
      throw new Error(`${label}_path_not_found:${file}`);
    result[repoRelative(repository, target)] = sha256Hex(
      await readFile(target),
    );
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}
