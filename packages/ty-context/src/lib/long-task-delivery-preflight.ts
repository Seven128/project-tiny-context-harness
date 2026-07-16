import { readFile, stat } from "node:fs/promises";
import { validateCounterfactualBindingClaims } from "./long-task-counterfactual-claim-policy.js";
import type {
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  assertRepositoryPattern,
  matchesRepoPattern,
  proveRepositoryPatternSubset,
  repositoryPatternsMayOverlap,
} from "./long-task-paths.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";
import {
  repoRelative,
  resolveInsideRepository,
} from "./long-task-workspace.js";

export function validateVerificationInputSeparation(
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
      if (
        implementation.some((pattern) =>
          repositoryPatternsMayOverlap(pattern, source),
        )
      )
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
          repositoryPatternsMayOverlap(artifact, source),
        )
      )
        throw new Error(`verification_input_protected:${check.key}:${source}`);
    }
}

export function validateTechnicalPaths(
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
      if (repositoryPatternsMayOverlap(pattern, workdirRelative))
        throw new Error(`protected_path_declared:long_task_workdir:${pattern}`);
      if (
        forbidden.some((blocked) =>
          repositoryPatternsMayOverlap(pattern, blocked),
        )
      )
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
        if (
          !allowed.some(
            (pattern) =>
              proveRepositoryPatternSubset(carrier, pattern).status ===
              "proven_subset",
          )
        )
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

export async function validateCounterfactualPaths(
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
    for (const control of outcome.acceptance.counterfactual_controls) {
      const binding = outcome.technical.bindings.find(
        (item) => item.key === control.binding_key,
      );
      if (!binding)
        throw new Error(
          `counterfactual_binding_unknown:${outcome.key}:${control.key}:${control.binding_key}`,
        );
      validateCounterfactualBindingClaims(outcome, control, binding);
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
          !binding.carrier_paths.some(
            (pattern) =>
              proveRepositoryPatternSubset(normalized, pattern).status ===
              "proven_subset",
          )
        )
          throw new Error(
            `counterfactual_path_outside_binding:${outcome.key}:${control.key}:${relative}`,
          );
        if (!(await stat(target).catch(() => null)))
          throw new Error(
            `counterfactual_path_not_found:${outcome.key}:${relative}`,
          );
      }
      if (control.mutation.type === "replace_file") {
        const fixtureTarget = resolveInsideRepository(
          repository,
          control.mutation.fixture_path,
          `${outcome.key}.counterfactual.fixture`,
        );
        const fixture = repoRelative(
          repository,
          await assertProtectedRepositoryFile(
            repository,
            fixtureTarget,
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

export async function hashDeclaredFiles(
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
    const protectedTarget = await assertProtectedRepositoryFile(
      repository,
      target,
      `${label}[${index}]`,
    );
    result[repoRelative(repository, protectedTarget)] = sha256Hex(
      await readFile(protectedTarget),
    );
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}
