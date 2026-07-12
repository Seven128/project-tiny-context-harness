import { execFile } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import { longTaskGitArgs } from "./long-task-git.js";

const exec = promisify(execFile);

export interface RepositoryIdentityV1 {
  canonical_path: string;
  volume_or_device: string;
  root_file_id: string;
  birth_identity: string;
  git_common_dir_path: string;
  git_common_dir_volume_or_device: string;
  git_common_dir_file_id: string;
  git_object_format: string;
}

export interface WorkdirIdentityV1 {
  canonical_path: string;
  volume_or_device: string;
  directory_file_id: string;
  birth_identity: string;
  repository_identity_hash: string;
}

export interface AuthorityIdentitiesV1 {
  sources: CompiledContractV3["sources"];
  context: CompiledContractV3["context_snapshot"];
  oracle_bundles: CompiledContractV3["oracle_bundles"];
  verifier: CompiledContractV3["verifier_identity"];
  policy_sha256: string;
  dependency_plan: CompiledContractV3["dependency_plan"];
}

export async function computeRepositoryIdentity(repositoryRoot: string): Promise<{ identity: RepositoryIdentityV1; hash: string }> {
  const canonical = await realpath(path.resolve(repositoryRoot));
  const rootInfo = await stat(canonical, { bigint: true });
  if (!rootInfo.isDirectory()) throw new Error("host_repository_identity_invalid:not_directory");
  const commonRaw = (await exec("git", longTaskGitArgs(canonical, ["rev-parse", "--git-common-dir"]), { cwd: canonical, windowsHide: true })).stdout.trim();
  const common = await realpath(path.resolve(canonical, commonRaw));
  const commonInfo = await stat(common, { bigint: true });
  const objectFormat = (await exec("git", longTaskGitArgs(canonical, ["rev-parse", "--show-object-format"]), { cwd: canonical, windowsHide: true })).stdout.trim();
  const identity: RepositoryIdentityV1 = {
    canonical_path: canonical,
    volume_or_device: String(rootInfo.dev),
    root_file_id: String(rootInfo.ino),
    birth_identity: String(rootInfo.birthtimeNs),
    git_common_dir_path: common,
    git_common_dir_volume_or_device: String(commonInfo.dev),
    git_common_dir_file_id: String(commonInfo.ino),
    git_object_format: objectFormat
  };
  return { identity, hash: sha256Hex(canonicalValueJson(normalizeIdentity(identity))) };
}

export async function computeWorkdirIdentity(repositoryRoot: string, workdir: string): Promise<{ identity: WorkdirIdentityV1; hash: string }> {
  const repository = await computeRepositoryIdentity(repositoryRoot);
  const canonical = await realpath(path.resolve(workdir));
  if (!inside(repository.identity.canonical_path, canonical)) throw new Error("host_workdir_identity_invalid:outside_repository");
  const info = await stat(canonical, { bigint: true });
  if (!info.isDirectory()) throw new Error("host_workdir_identity_invalid:not_directory");
  const identity: WorkdirIdentityV1 = {
    canonical_path: canonical,
    volume_or_device: String(info.dev),
    directory_file_id: String(info.ino),
    birth_identity: String(info.birthtimeNs),
    repository_identity_hash: repository.hash
  };
  return { identity, hash: sha256Hex(canonicalValueJson(normalizeIdentity(identity))) };
}

export function authorityIdentities(contract: CompiledContractV3): AuthorityIdentitiesV1 {
  return {
    sources: contract.sources,
    context: contract.context_snapshot,
    oracle_bundles: contract.oracle_bundles,
    verifier: contract.verifier_identity,
    policy_sha256: contract.dependency_plan.sandbox_policy_sha256,
    dependency_plan: contract.dependency_plan
  };
}

function normalizeIdentity<T extends { canonical_path: string }>(identity: T): T {
  if (process.platform !== "win32") return identity;
  const value = { ...identity };
  value.canonical_path = value.canonical_path.toLocaleLowerCase("en-US");
  if ("git_common_dir_path" in value && typeof value.git_common_dir_path === "string") value.git_common_dir_path = value.git_common_dir_path.toLocaleLowerCase("en-US");
  return value;
}

function inside(root: string, candidate: string): boolean {
  const normalize = (value: string) => process.platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
  const left = normalize(path.resolve(root));
  const right = normalize(path.resolve(candidate));
  return right === left || right.startsWith(`${left}${path.sep}`);
}
