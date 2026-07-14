import { cp, mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { collectFrozenArtifacts } from "./long-task-artifact-collector.js";
import { evaluateFrozenAssertions } from "./long-task-assertion-evaluator.js";
import { runFrozenCommand } from "./long-task-command-runner.js";
import {
  assertLongTaskContractFresh,
  readCompiledLongTaskContract,
} from "./long-task-contract-compiler.js";
import {
  createLongTaskSnapshot,
  hashLongTaskWorkspace,
} from "./long-task-snapshot.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type {
  EnvironmentManifestV2,
  LongTaskFindingV2,
  SnapshotHandle,
  VerificationRunResultV2,
  VerificationSpecResultV2,
} from "./long-task-run-result.js";
import { decideLongTaskImpact } from "./long-task-impact.js";
import { scanLongTaskNegativeEvidence } from "./long-task-negative-evidence.js";

export interface VerifyLongTaskOptions {
  contract?: CompiledContractV3;
  snapshot?: SnapshotHandle;
  run_id?: string;
  acceptanceGate?: boolean;
  specResultCache?: VerificationSpecResultCache;
  repairScope?: "targeted_repair" | "impact_repair";
}

export interface VerificationSpecResultCacheEntry {
  identity_sha256: string;
  result: VerificationSpecResultV2;
  run_root: string;
  workdir: string;
}

export type VerificationSpecResultCache = Map<
  string,
  VerificationSpecResultCacheEntry
>;

export interface FrozenSpecExecutionRequest {
  contract: CompiledContractV3;
  source_root: string;
  workdir: string;
  run_root: string;
  spec_ids: string[];
}

export async function executeFrozenVerificationSpecs(
  request: FrozenSpecExecutionRequest,
): Promise<VerificationSpecResultV2[]> {
  const selected = request.contract.verification_specs.filter((spec) =>
    request.spec_ids.includes(spec.id),
  );
  if (selected.length === 0)
    throw new Error("No frozen verification specs selected");
  const results: VerificationSpecResultV2[] = [];
  for (const spec of selected) {
    const specRoot = await mkdtemp(
      path.join(os.tmpdir(), `ty-context-spec-${spec.id}-`),
    );
    const artifactRoot = path.join(request.run_root, "artifacts", spec.id);
    const commandRoot = path.join(request.run_root, "command-runs", spec.id);
    await mkdir(artifactRoot, { recursive: true });
    try {
      await cp(request.source_root, specRoot, { recursive: true });
      try {
        const command = await runFrozenCommand(
          spec,
          specRoot,
          commandRoot,
          artifactRoot,
        );
        const artifacts = await collectFrozenArtifacts(
          spec,
          artifactRoot,
          command.started_at,
        );
        await writeFile(
          path.join(commandRoot, "command.json"),
          canonicalJson(command),
        );
        await writeFile(
          path.join(commandRoot, "artifacts.json"),
          canonicalJson(artifacts),
        );
        const evidence = path
          .relative(request.workdir, commandRoot)
          .replace(/\\/g, "/");
        const reverify = `ty-context composite-long-task verify ${quote(request.workdir)} --spec ${spec.id}`;
        const artifactIds = new Set([
          ...artifacts.artifacts.map((item) => item.path),
          ...spec.command_steps.flatMap((step) => step.output_artifact_ids),
        ]);
        const evaluated = await evaluateFrozenAssertions(
          spec,
          command,
          evidence,
          reverify,
          artifactIds,
        );
        evaluated.findings.push(
          ...(await scanLongTaskNegativeEvidence(
            spec,
            command,
            artifacts,
            artifactRoot,
            evidence,
            reverify,
          )),
        );
        if (evaluated.findings.length > 0) evaluated.status = "failed";
        results.push(evaluated);
      } catch (error) {
        results.push(
          failedSpec(
            spec.id,
            error,
            path.relative(request.workdir, commandRoot).replace(/\\/g, "/"),
            request.workdir,
          ),
        );
      }
    } finally {
      await rm(specRoot, { recursive: true, force: true });
    }
  }
  return results;
}

export async function verifyLongTask(
  workdir: string,
  specIds?: string[],
  options: VerifyLongTaskOptions = {},
): Promise<VerificationRunResultV2> {
  if (options.repairScope && (!specIds || options.acceptanceGate))
    throw new Error(
      "explicit_repair_scope_requires_non_accepting_spec_selection",
    );
  const contract =
    options.contract ?? (await readCompiledLongTaskContract(workdir));
  await assertLongTaskContractFresh(contract);
  const runId =
    options.run_id ??
    `RUN-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${process.pid}-${contract.contract_sha256.slice(0, 8)}`;
  const runRoot = path.join(workdir, "runs", runId);
  await mkdir(runRoot, { recursive: true });
  const source =
    options.snapshot ??
    (await createLongTaskSnapshot(contract.repository_root, contract, runId));
  const ownsSource = options.snapshot === undefined;
  const workspaceBefore = source.manifest.snapshot_sha256;
  const startedAt = new Date().toISOString();
  const environment = await environmentManifest(source.root);
  try {
    const automatic = specIds
      ? undefined
      : decideLongTaskImpact(
          contract,
          await gitChangedPaths(contract.repository_root),
        );
    const selectedIds = specIds ?? automatic!.verification_spec_ids;
    const specResults = await executeWithExactResultCache({
      contract,
      source,
      environment,
      workdir,
      runRoot,
      selectedIds,
      cache: options.specResultCache,
    });
    const findings = specResults.flatMap((result) =>
      enrichFindings(contract, result.spec_id, result.findings),
    );
    try {
      await assertLongTaskContractFresh(contract);
    } catch (error) {
      findings.push(integrityFinding(runId, workdir, error));
    }
    const workspaceAfter = await hashLongTaskWorkspace(
      contract.repository_root,
      contract,
    );
    if (workspaceAfter !== workspaceBefore)
      findings.push(
        workspaceChanged(runId, workdir, workspaceBefore, workspaceAfter),
      );
    const result: VerificationRunResultV2 = {
      schema_version: "long-task-verification-run-v2",
      run_id: runId,
      contract_sha256: contract.contract_sha256,
      verification_scope: options.acceptanceGate
        ? "full_acceptance"
        : options.repairScope
          ? options.repairScope
          : specIds
            ? "targeted_repair"
            : automatic?.mode === "affected"
              ? "impact_repair"
              : "full_repair",
      acceptance_authorized: options.acceptanceGate === true,
      snapshot: source.manifest,
      environment,
      spec_results: specResults,
      findings,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    };
    await writeFile(
      path.join(runRoot, "snapshot-manifest.json"),
      canonicalJson(source.manifest),
    );
    await writeFile(
      path.join(runRoot, "environment-manifest.json"),
      canonicalJson(environment),
    );
    await writeFile(
      path.join(runRoot, "verification-result.json"),
      canonicalJson(result),
    );
    return result;
  } finally {
    if (ownsSource) await source.dispose();
  }
}

export function verificationSpecExecutionIdentity(
  spec: CompiledContractV3["verification_specs"][number],
  snapshotSha256: string,
  environment: EnvironmentManifestV2,
): string {
  const referencedEnvironment = new Set([
    ...environment.environment_keys,
    ...spec.environment_refs,
    ...spec.command_steps.flatMap((step) => step.environment_refs),
  ]);
  const environmentValues = Object.fromEntries(
    [...referencedEnvironment]
      .sort()
      .map((key) => [key, sha256Hex(process.env[key] ?? "<unset>")]),
  );
  return sha256Hex(
    canonicalJson({
      snapshot_sha256: snapshotSha256,
      normalized_spec_sha256: spec.normalized_sha256,
      oracle_sha256: spec.oracle_sha256,
      executable_sha256: spec.executable_sha256,
      input_paths: spec.input_paths,
      command_steps: spec.command_steps,
      environment: {
        node: environment.node,
        platform: environment.platform,
        arch: environment.arch,
        release: environment.release,
        executable_sha256: environment.executable_sha256,
        environment_value_sha256: environmentValues,
      },
    }),
  );
}

async function executeWithExactResultCache(options: {
  contract: CompiledContractV3;
  source: SnapshotHandle;
  environment: EnvironmentManifestV2;
  workdir: string;
  runRoot: string;
  selectedIds: string[];
  cache?: VerificationSpecResultCache;
}): Promise<VerificationSpecResultV2[]> {
  if (!options.cache) {
    return executeFrozenVerificationSpecs({
      contract: options.contract,
      source_root: options.source.root,
      workdir: options.workdir,
      run_root: options.runRoot,
      spec_ids: options.selectedIds,
    });
  }

  const selected = options.contract.verification_specs.filter((spec) =>
    options.selectedIds.includes(spec.id),
  );
  const results = new Map<string, VerificationSpecResultV2>();
  const missing: string[] = [];
  const identities = new Map<string, string>();
  for (const spec of selected) {
    const identity = verificationSpecExecutionIdentity(
      spec,
      options.source.manifest.snapshot_sha256,
      options.environment,
    );
    identities.set(spec.id, identity);
    const cached = options.cache.get(identity);
    if (!cached) {
      missing.push(spec.id);
      continue;
    }
    await copyCachedEvidence(cached, options.runRoot, spec.id);
    results.set(
      spec.id,
      relocateCachedResult(cached, options.workdir, options.runRoot),
    );
  }

  if (missing.length) {
    const executed = await executeFrozenVerificationSpecs({
      contract: options.contract,
      source_root: options.source.root,
      workdir: options.workdir,
      run_root: options.runRoot,
      spec_ids: missing,
    });
    for (const result of executed) {
      const identity = identities.get(result.spec_id);
      if (!identity)
        throw new Error(`verification_spec_identity_missing:${result.spec_id}`);
      results.set(result.spec_id, result);
      options.cache.set(identity, {
        identity_sha256: identity,
        result: structuredClone(result),
        run_root: options.runRoot,
        workdir: options.workdir,
      });
    }
  }
  return selected.map((spec) => {
    const result = results.get(spec.id);
    if (!result) throw new Error(`verification_spec_result_missing:${spec.id}`);
    return result;
  });
}

async function copyCachedEvidence(
  entry: VerificationSpecResultCacheEntry,
  targetRunRoot: string,
  specId: string,
): Promise<void> {
  for (const directory of ["artifacts", "command-runs"] as const) {
    const source = path.join(entry.run_root, directory, specId);
    const target = path.join(targetRunRoot, directory, specId);
    await rm(target, { recursive: true, force: true });
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: true });
  }
}

function relocateCachedResult(
  entry: VerificationSpecResultCacheEntry,
  targetWorkdir: string,
  targetRunRoot: string,
): VerificationSpecResultV2 {
  const result = structuredClone(entry.result);
  const oldPrefix = path
    .relative(entry.workdir, entry.run_root)
    .replace(/\\/g, "/");
  const newPrefix = path
    .relative(targetWorkdir, targetRunRoot)
    .replace(/\\/g, "/");
  result.findings = result.findings.map((finding) => ({
    ...finding,
    evidence_path:
      finding.evidence_path === oldPrefix ||
      finding.evidence_path.startsWith(`${oldPrefix}/`)
        ? `${newPrefix}${finding.evidence_path.slice(oldPrefix.length)}`
        : finding.evidence_path,
    reverify_command: finding.reverify_command.replace(
      quote(entry.workdir),
      quote(targetWorkdir),
    ),
  }));
  return result;
}

function failedSpec(
  specId: string,
  error: unknown,
  evidencePath: string,
  workdir: string,
): VerificationSpecResultV2 {
  const actual = message(error);
  const category = actual.split(":", 1)[0] || "verification_execution_failed";
  return {
    spec_id: specId,
    status: "failed",
    assertion_results: {},
    population_results: {},
    observations: {},
    findings: [
      {
        category,
        verification_spec_id: specId,
        expected:
          "frozen verification spec completes and emits trusted observations",
        actual,
        evidence_path: evidencePath,
        next_action: `Fix ${specId} verifier or implementation failure`,
        reverify_command: `ty-context composite-long-task verify ${quote(workdir)} --spec ${specId}`,
      },
    ],
  };
}
function integrityFinding(
  runId: string,
  workdir: string,
  error: unknown,
): LongTaskFindingV2 {
  return {
    category: "frozen_identity_changed_during_verify",
    expected:
      "source, Context, oracle, executable and verifier hashes remain frozen",
    actual: message(error),
    evidence_path: `runs/${runId}/snapshot-manifest.json`,
    next_action:
      "Restore frozen verifier/oracle/source identities and recompile before continuing",
    reverify_command: `ty-context composite-long-task verify ${quote(workdir)}`,
  };
}
function workspaceChanged(
  runId: string,
  workdir: string,
  before: string,
  after: string,
): LongTaskFindingV2 {
  return {
    category: "worktree_changed_during_verify",
    expected: before,
    actual: after,
    evidence_path: `runs/${runId}/snapshot-manifest.json`,
    next_action: "Stabilize the product workspace and rerun verification",
    reverify_command: `ty-context composite-long-task verify ${quote(workdir)}`,
  };
}
function enrichFindings(
  contract: CompiledContractV3,
  specId: string,
  findings: LongTaskFindingV2[],
): LongTaskFindingV2[] {
  const ac = contract.acceptance_criteria.find((criterion) =>
    criterion.verification_spec_ids.includes(specId),
  );
  if (!ac) return findings;
  const bindings = ac.obligation_refs.flatMap((obligation_id) => {
    const obligation = contract.obligations.find(
      (item) => item.id === obligation_id,
    );
    const requirements = obligation?.source_requirement_ids ?? [];
    return requirements.length
      ? requirements.map((requirement_id) => ({
          requirement_id,
          obligation_id,
          ac_id: ac.id,
        }))
      : [{ obligation_id, ac_id: ac.id }];
  });
  return findings.flatMap((finding) =>
    bindings.map((binding) => ({ ...finding, ...binding })),
  );
}
async function gitChangedPaths(root: string): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn(
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      { cwd: root, shell: false, windowsHide: true },
    );
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", () => resolve([]));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      resolve(
        Buffer.concat(chunks)
          .toString("utf8")
          .split("\0")
          .filter(Boolean)
          .map((field) =>
            field
              .slice(3)
              .replace(/.* -> /, "")
              .replace(/\\/g, "/"),
          ),
      );
    });
  });
}
async function environmentManifest(
  snapshotRoot: string,
): Promise<EnvironmentManifestV2> {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    executable: process.execPath,
    executable_sha256: sha256Hex(await readFile(process.execPath)),
    cwd: snapshotRoot,
    environment_keys: [
      "PATH",
      "Path",
      "PATHEXT",
      "SYSTEMROOT",
      "WINDIR",
      "HOME",
      "USERPROFILE",
      "TMP",
      "TEMP",
      "CI",
      "LANG",
      "LC_ALL",
    ]
      .filter((key) => process.env[key] !== undefined)
      .sort(),
  };
}
function quote(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
