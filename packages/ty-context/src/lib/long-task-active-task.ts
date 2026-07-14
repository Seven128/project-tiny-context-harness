import { mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type {
  CompiledContractV3,
  VerifierTrustInput,
} from "./long-task-contract-schema.js";
import { invalidateLongTaskFinalAuthority } from "./long-task-final-receipt.js";
import {
  ensureLongTaskRuntimeExcludes,
  resolveGitWorktreePath,
  resolveGitWorktreePaths,
  sameFilesystemPath,
} from "./git-worktree-paths.js";

export interface ActiveLongTaskActivationIdentity {
  campaign_id?: string;
  slice_id?: string;
}

export interface ActiveLongTaskBindingV4 {
  schema_version: "active-long-task-binding-v4";
  campaign_id: string | null;
  slice_id: string | null;
  worktree_id: string;
  repository_root: string;
  workdir: string;
  contract_sha256: string;
  verifier: VerifierTrustInput;
  hook_bundle_sha256: string;
}

const ACTIVE_POINTER = "ty-context-active-long-task.json";

export async function assertLongTaskCompilationAllowed(
  contract: CompiledContractV3,
): Promise<void> {
  const active = await readActiveLongTaskBinding(contract.repository_root);
  if (!active) return;
  const worktree = await resolveGitWorktreePaths(contract.repository_root);
  if (
    active.repository_root !== contract.repository_root ||
    active.workdir !== contract.workdir ||
    active.worktree_id !== worktree.worktree_id ||
    active.contract_sha256 !== contract.contract_sha256 ||
    canonicalJson(active.verifier) !== canonicalJson(contract.verifier_identity)
  )
    changed("contract_or_workdir");
}

export async function activateLongTask(
  contract: CompiledContractV3,
  hookBundleSha256: string,
  identity: ActiveLongTaskActivationIdentity = {},
): Promise<void> {
  if (
    (identity.campaign_id === undefined) !==
    (identity.slice_id === undefined)
  )
    changed("campaign_slice_identity");
  if (
    identity.campaign_id !== undefined &&
    (!identity.campaign_id.trim() || !identity.slice_id?.trim())
  )
    changed("campaign_slice_identity");
  const worktree = await resolveGitWorktreePaths(contract.repository_root);
  if (!sameFilesystemPath(worktree.worktree_root, contract.repository_root))
    changed("repository_root");
  const value: ActiveLongTaskBindingV4 = {
    schema_version: "active-long-task-binding-v4",
    campaign_id: identity.campaign_id ?? null,
    slice_id: identity.slice_id ?? null,
    worktree_id: worktree.worktree_id,
    repository_root: contract.repository_root,
    workdir: contract.workdir,
    contract_sha256: contract.contract_sha256,
    verifier: contract.verifier_identity,
    hook_bundle_sha256: hookBundleSha256,
  };
  const active = await readActiveLongTaskBinding(contract.repository_root);
  if (active) {
    if (canonicalJson(active) !== canonicalJson(value))
      changed("binding_identity");
    return;
  }
  await invalidateLongTaskFinalAuthority(
    contract.repository_root,
    contract.workdir,
  );
  await ensureLongTaskRuntimeExcludes(contract.repository_root);
  const content = canonicalJson(value);
  for (const file of await activePointerFiles(contract.repository_root))
    await writeExclusive(file, content);
}

export async function readActiveLongTaskBinding(
  repositoryRoot: string,
): Promise<ActiveLongTaskBindingV4 | null> {
  const [project, git] = await Promise.all(
    (await activePointerFiles(repositoryRoot)).map(readPointer),
  );
  if (!project && !git) return null;
  if (!project || !git) changed("pointer_missing");
  if (canonicalJson(project) !== canonicalJson(git))
    changed("pointer_mismatch");
  return project;
}

// The caller must first validate an accepted, receipt-bound final result. This
// function only clears the matching binding in the current worktree and never
// resolves or removes another worktree's Git state.
export async function clearAcceptedLongTaskBinding(
  repositoryRoot: string,
  workdir: string,
): Promise<boolean> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  if (!active) return false;
  const worktree = await resolveGitWorktreePaths(repositoryRoot);
  if (
    !sameFilesystemPath(worktree.worktree_root, active.repository_root) ||
    worktree.worktree_id !== active.worktree_id ||
    !sameFilesystemPath(active.workdir, workdir)
  )
    changed("clear_binding_identity");
  await Promise.all(
    (await activePointerFiles(repositoryRoot)).map((file) =>
      rm(file, { force: true }),
    ),
  );
  return true;
}

// Campaign gates reuse one owned Integration worktree for multiple Slice
// contracts and retries. Their Campaign result remains the completion
// authority, so the per-Contract Stop-Hook binding must be cleared after each
// gate attempt. Never clear a standalone task or another Campaign's binding.
export async function clearCampaignLongTaskBinding(
  repositoryRoot: string,
  campaignId: string,
): Promise<boolean> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  if (!active) return false;
  const worktree = await resolveGitWorktreePaths(repositoryRoot);
  if (
    !sameFilesystemPath(worktree.worktree_root, active.repository_root) ||
    worktree.worktree_id !== active.worktree_id ||
    active.campaign_id !== campaignId
  )
    changed("clear_campaign_binding_identity");
  await Promise.all(
    (await activePointerFiles(repositoryRoot)).map((file) =>
      rm(file, { force: true }),
    ),
  );
  return true;
}

async function readPointer(
  file: string,
): Promise<ActiveLongTaskBindingV4 | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    changed("pointer_unreadable");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    changed("pointer_invalid_json");
  }
  if (!isActiveBinding(value)) changed("pointer_invalid");
  return value;
}

function isActiveBinding(value: unknown): value is ActiveLongTaskBindingV4 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const standalone = item.campaign_id === null && item.slice_id === null;
  const campaignSlice =
    typeof item.campaign_id === "string" &&
    item.campaign_id.length > 0 &&
    typeof item.slice_id === "string" &&
    item.slice_id.length > 0;
  return (
    item.schema_version === "active-long-task-binding-v4" &&
    (standalone || campaignSlice) &&
    typeof item.worktree_id === "string" &&
    /^[a-f0-9]{64}$/u.test(item.worktree_id) &&
    typeof item.repository_root === "string" &&
    typeof item.workdir === "string" &&
    typeof item.contract_sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(item.contract_sha256) &&
    !!item.verifier &&
    typeof item.verifier === "object" &&
    !Array.isArray(item.verifier) &&
    typeof item.hook_bundle_sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(item.hook_bundle_sha256)
  );
}

async function activePointerFiles(repositoryRoot: string): Promise<string[]> {
  const worktree = await resolveGitWorktreePaths(repositoryRoot);
  if (!sameFilesystemPath(worktree.worktree_root, repositoryRoot))
    changed("repository_root");
  return [
    path.join(worktree.worktree_root, ".codex", ACTIVE_POINTER),
    await resolveGitWorktreePath(repositoryRoot, ACTIVE_POINTER),
  ];
}

async function writeExclusive(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  let handle;
  try {
    handle = await open(file, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      changed("activation_race");
    throw error;
  }
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function changed(reason: string): never {
  throw new Error(`active_contract_changed:${reason}`);
}
