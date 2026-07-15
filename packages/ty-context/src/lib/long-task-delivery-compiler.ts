import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import {
  DELIVERY_CONTRACT_FILE,
  parseDeliveryContract,
} from "./long-task-delivery-parser.js";
import type {
  CompiledDeliveryContractV1,
  CompiledOutcomeV1,
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
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import {
  captureWorkspaceManifest,
  repoRelative,
  repositoryRoot,
  resolveInsideRepository,
} from "./long-task-workspace.js";

export interface CompileDeliveryOptionsV1 {
  require_completion_gate?: boolean;
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
  const contract = await parseDeliveryContract(workdir);
  const risk = classifyLongTaskRisk(contract);
  validateRiskProof(contract, risk);
  const contractBytes = await readFile(contractFile);
  const contractHash = sha256Hex(contractBytes);
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
  const baseline = await captureWorkspaceManifest(repository, workdir);
  validateTechnicalPaths(contract, repository, workdirRelative, baseline);
  await validateCounterfactualPaths(contract, repository, workdirRelative);
  const verifier = await captureVerifierIdentity(
    repository,
    options.require_completion_gate !== false,
  );
  const globalChecks = await Promise.all(
    contract.global.acceptance.checks.map((check) =>
      freezeDeliveryCheck(check, null, repository, baseline),
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
            freezeDeliveryCheck(check, outcome.key, repository, baseline),
          ),
        ),
      },
    })),
  );
  const unsigned = {
    schema_version: "compiled-long-task-delivery-v1" as const,
    repository_root: repository,
    workdir,
    contract_file: repoRelative(repository, contractFile),
    contract_sha256: contractHash,
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
    task: contract.task,
    risk: contract.risk,
    global: {
      product: contract.global.product,
      technical: contract.global.technical,
      acceptance: { checks: globalChecks },
    },
    outcomes,
  };
  return {
    ...unsigned,
    compiled_identity: sha256Hex(canonicalValueJson(unsigned)),
  };
}

function validateTechnicalPaths(
  contract: Awaited<ReturnType<typeof parseDeliveryContract>>,
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
  contract: Awaited<ReturnType<typeof parseDeliveryContract>>,
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
