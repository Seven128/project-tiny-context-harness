import { mkdir, open, readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type { CompiledContractV3, VerifierTrustInput } from "./long-task-contract-schema.js";
import { invalidateLongTaskFinalAuthority } from "./long-task-final-receipt.js";

interface ActiveLongTaskBindingV3 {
  schema_version: "active-long-task-binding-v3";
  repository_root: string;
  workdir: string;
  contract_sha256: string;
  verifier: VerifierTrustInput;
  hook_bundle_sha256: string;
}

const ACTIVE_POINTER = "ty-context-active-long-task.json";

export async function assertLongTaskCompilationAllowed(contract: CompiledContractV3): Promise<void> {
  const active = await readActiveLongTaskBinding(contract.repository_root);
  if (!active) return;
  if (
    active.repository_root !== contract.repository_root
    || active.workdir !== contract.workdir
    || active.contract_sha256 !== contract.contract_sha256
    || canonicalJson(active.verifier) !== canonicalJson(contract.verifier_identity)
  ) changed("contract_or_workdir");
}

export async function activateLongTask(contract: CompiledContractV3, hookBundleSha256: string): Promise<void> {
  const value: ActiveLongTaskBindingV3 = {
    schema_version: "active-long-task-binding-v3",
    repository_root: contract.repository_root,
    workdir: contract.workdir,
    contract_sha256: contract.contract_sha256,
    verifier: contract.verifier_identity,
    hook_bundle_sha256: hookBundleSha256
  };
  const active = await readActiveLongTaskBinding(contract.repository_root);
  if (active) {
    if (canonicalJson(active) !== canonicalJson(value)) changed("binding_identity");
    return;
  }
  await invalidateLongTaskFinalAuthority(contract.repository_root, contract.workdir);
  const content = canonicalJson(value);
  for (const file of activePointerFiles(contract.repository_root)) await writeExclusive(file, content);
}

export async function readActiveLongTaskBinding(repositoryRoot: string): Promise<ActiveLongTaskBindingV3 | null> {
  const [project, git] = await Promise.all(activePointerFiles(repositoryRoot).map(readPointer));
  if (!project && !git) return null;
  if (!project || !git) changed("pointer_missing");
  if (canonicalJson(project) !== canonicalJson(git)) changed("pointer_mismatch");
  return project;
}

async function readPointer(file: string): Promise<ActiveLongTaskBindingV3 | null> {
  let text: string;
  try { text = await readFile(file, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    changed("pointer_unreadable");
  }
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { changed("pointer_invalid_json"); }
  if (!isActiveBinding(value)) changed("pointer_invalid");
  return value;
}

function isActiveBinding(value: unknown): value is ActiveLongTaskBindingV3 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.schema_version === "active-long-task-binding-v3"
    && typeof item.repository_root === "string"
    && typeof item.workdir === "string"
    && typeof item.contract_sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(item.contract_sha256)
    && !!item.verifier
    && typeof item.verifier === "object"
    && !Array.isArray(item.verifier)
    && typeof item.hook_bundle_sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(item.hook_bundle_sha256);
}

function activePointerFiles(repositoryRoot: string): string[] {
  return [path.join(repositoryRoot, ".codex", ACTIVE_POINTER), path.join(repositoryRoot, ".git", ACTIVE_POINTER)];
}

async function writeExclusive(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  let handle;
  try { handle = await open(file, "wx"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") changed("activation_race");
    throw error;
  }
  try { await handle.writeFile(content, "utf8"); await handle.sync(); }
  finally { await handle.close(); }
}

function changed(reason: string): never {
  throw new Error(`active_contract_changed:${reason}`);
}
