import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./strict-codec.js";
import type {
  AuthorityHashesV2,
  CompiledDeliveryContractV2,
  FinalReceiptV2,
  InitialTaskBaseV2,
  ProgressRecordV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import {
  gitCommonDir,
  gitConfigGet,
  gitConfigSet,
  gitConfigUnset,
  gitPath,
} from "./long-task-workspace.js";

const RUNTIME_FOLDER = ".ty-context";
const COMPILED_FILE = "compiled-contract.json";
const PROGRESS_FOLDER = "progress";
const AUTHORITY_PENDING_FILE = "authority-revision-pending.json";
const AUTHORITY_APPROVED_FILE = "authority-revision-approved.json";
const FINAL_FILE = "final-receipt.json";
const CONTRACT_FILE = "delivery-contract.yaml";

export interface ActiveLongTaskBindingV2 {
  schema_version: "active-long-task-binding-v2";
  task_id: string;
  repository_root: string;
  worktree_identity: string;
  workdir: string;
  initial_task_base: InitialTaskBaseV2;
  active_authority_identity: string;
  verifier_identity: VerifierIdentityV2;
  activated_at: string;
  authority_revision: number;
}

export interface PendingAuthorityRevisionV2 {
  schema_version: "long-task-authority-revision-pending-v2";
  previous_hashes: AuthorityHashesV2;
  next_hashes: AuthorityHashesV2;
  changed_authority_sections: string[];
  revision_diff: Record<string, unknown> & { reduction_reasons: string[] };
  new_risk_floor: "standard" | "strict";
  affected_outcomes_or_contracts: string[];
  revision_identity: string;
  created_at: string;
}

export function runtimePath(workdir: string, file = ""): string {
  return path.join(path.resolve(workdir), RUNTIME_FOLDER, file);
}

export function worktreeIdentity(repositoryRoot: string): string {
  const normalized = normalizePath(repositoryRoot);
  return `wt-${sha256Hex(normalized)}`;
}

export async function activeRecordPath(
  repositoryRoot: string,
): Promise<string> {
  const identity = worktreeIdentity(repositoryRoot);
  return path.join(
    await gitCommonDir(repositoryRoot),
    "ty-context",
    "long-task",
    "worktrees",
    identity,
    "active.json",
  );
}

export async function writeCompiledDeliveryContract(
  compiled: CompiledDeliveryContractV2,
): Promise<void> {
  await atomicJson(runtimePath(compiled.workdir, COMPILED_FILE), compiled);
}

export async function readCompiledDeliveryContract(
  workdir: string,
): Promise<CompiledDeliveryContractV2> {
  const value = (await readJson(
    runtimePath(workdir, COMPILED_FILE),
  )) as CompiledDeliveryContractV2;
  if (value.schema_version !== "compiled-long-task-delivery-v2")
    throw new Error("compiled_contract_invalid:schema_version");
  const { compiled_identity: compiledIdentity, ...unsigned } = value;
  if (sha256Hex(canonicalValueJson(unsigned)) !== compiledIdentity)
    throw new Error("compiled_contract_invalid:identity");
  if (path.resolve(workdir) !== value.workdir)
    throw new Error("compiled_contract_invalid:workdir");
  return value;
}

export async function activateDeliveryContract(
  compiled: CompiledDeliveryContractV2,
): Promise<ActiveLongTaskBindingV2> {
  const existing = await readActiveLongTaskBinding(compiled.repository_root);
  if (
    existing &&
    (existing.workdir !== compiled.workdir ||
      existing.task_id !== compiled.task.id)
  )
    throw new Error(`active_task_exists:${existing.workdir}`);
  if (
    !existing ||
    existing.active_authority_identity !== compiled.compiled_identity
  )
    await clearFinalReceipt(compiled.repository_root, compiled.workdir);
  const binding: ActiveLongTaskBindingV2 = {
    schema_version: "active-long-task-binding-v2",
    task_id: compiled.task.id,
    repository_root: compiled.repository_root,
    worktree_identity: worktreeIdentity(compiled.repository_root),
    workdir: compiled.workdir,
    initial_task_base: compiled.initial_task_base,
    active_authority_identity: compiled.compiled_identity,
    verifier_identity: compiled.verifier_identity,
    activated_at: existing?.activated_at ?? new Date().toISOString(),
    authority_revision: compiled.authority_revision,
  };
  await ensureRuntimeExcludes(compiled.repository_root, compiled.workdir);
  await atomicJson(await activeRecordPath(compiled.repository_root), binding);
  await gitConfigSet(
    compiled.repository_root,
    markerKey(binding.worktree_identity),
    binding.task_id,
  );
  return binding;
}

export async function readActiveLongTaskBinding(
  repositoryRoot: string,
): Promise<ActiveLongTaskBindingV2 | null> {
  const root = path.resolve(repositoryRoot);
  const identity = worktreeIdentity(root);
  const [marker, raw] = await Promise.all([
    gitConfigGet(root, markerKey(identity)),
    readOptionalJson(await activeRecordPath(root)),
  ]);
  if (marker === null && raw === null) return null;
  if (marker === null) throw new Error("active_binding_marker_missing");
  if (raw === null) throw new Error("active_binding_record_missing");
  const row = raw as Record<string, unknown>;
  if (
    row.schema_version !== "active-long-task-binding-v2" ||
    typeof row.task_id !== "string" ||
    typeof row.repository_root !== "string" ||
    typeof row.worktree_identity !== "string" ||
    typeof row.workdir !== "string" ||
    typeof row.active_authority_identity !== "string" ||
    typeof row.authority_revision !== "number" ||
    !row.initial_task_base ||
    !row.verifier_identity
  )
    throw new Error("active_binding_invalid");
  const binding = row as unknown as ActiveLongTaskBindingV2;
  if (marker !== binding.task_id)
    throw new Error("active_binding_task_marker_mismatch");
  if (binding.worktree_identity !== identity)
    throw new Error("active_binding_worktree_identity_mismatch");
  if (normalizePath(binding.repository_root) !== normalizePath(root))
    throw new Error("active_binding_repository_identity_mismatch");
  await access(binding.workdir).catch(() => {
    throw new Error("active_binding_workdir_missing");
  });
  await access(path.join(binding.workdir, CONTRACT_FILE)).catch(() => {
    throw new Error("active_binding_contract_missing");
  });
  return binding;
}

export async function assertMatchingActiveBinding(
  compiled: CompiledDeliveryContractV2,
): Promise<ActiveLongTaskBindingV2> {
  const active = await readActiveLongTaskBinding(compiled.repository_root);
  if (!active) throw new Error("active_task_missing");
  if (
    active.workdir !== compiled.workdir ||
    active.task_id !== compiled.task.id ||
    active.active_authority_identity !== compiled.compiled_identity ||
    active.authority_revision !== compiled.authority_revision ||
    active.verifier_identity.bundle_sha256 !==
      compiled.verifier_identity.bundle_sha256 ||
    active.verifier_identity.schema_sha256 !==
      compiled.verifier_identity.schema_sha256
  )
    throw new Error("active_task_identity_mismatch");
  return active;
}

export async function writeProgressRecord(
  workdir: string,
  record: ProgressRecordV2,
): Promise<void> {
  await atomicJson(
    runtimePath(
      workdir,
      path.join(PROGRESS_FOLDER, `${record.check_internal_id}.json`),
    ),
    record,
  );
}

export async function readProgressRecords(
  workdir: string,
): Promise<Record<string, ProgressRecordV2>> {
  const folder = runtimePath(workdir, PROGRESS_FOLDER);
  const names = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const rows: Record<string, ProgressRecordV2> = {};
  for (const name of names.filter((name) => name.endsWith(".json")).sort()) {
    const value = (await readJson(path.join(folder, name))) as ProgressRecordV2;
    if (value.schema_version !== "long-task-progress-record-v2")
      throw new Error(`progress_record_invalid:${name}`);
    rows[value.check_internal_id] = value;
  }
  return rows;
}

export async function writePendingAuthorityRevision(
  workdir: string,
  pending: PendingAuthorityRevisionV2,
): Promise<void> {
  await atomicJson(runtimePath(workdir, AUTHORITY_PENDING_FILE), pending);
  await rm(runtimePath(workdir, AUTHORITY_APPROVED_FILE), { force: true });
}

export async function readPendingAuthorityRevision(
  workdir: string,
): Promise<PendingAuthorityRevisionV2 | null> {
  return (await readOptionalJson(
    runtimePath(workdir, AUTHORITY_PENDING_FILE),
  )) as PendingAuthorityRevisionV2 | null;
}

export async function approvePendingAuthorityRevision(
  workdir: string,
  revision: string,
): Promise<void> {
  const pending = await readPendingAuthorityRevision(workdir);
  if (!pending || pending.revision_identity !== revision)
    throw new Error("authority_revision_not_found_or_mismatched");
  await atomicJson(runtimePath(workdir, AUTHORITY_APPROVED_FILE), {
    schema_version: "long-task-authority-revision-approved-v2",
    revision_identity: revision,
    approved_at: new Date().toISOString(),
  });
}

export async function authorityRevisionApproved(
  workdir: string,
  revision: string,
): Promise<boolean> {
  const value = (await readOptionalJson(
    runtimePath(workdir, AUTHORITY_APPROVED_FILE),
  )) as { revision_identity?: unknown } | null;
  return value?.revision_identity === revision;
}

export async function clearAuthorityRevision(workdir: string): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, AUTHORITY_PENDING_FILE), { force: true }),
    rm(runtimePath(workdir, AUTHORITY_APPROVED_FILE), { force: true }),
  ]);
}

export async function invalidateDerivedProgress(
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, PROGRESS_FOLDER), { recursive: true, force: true }),
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
  ]);
}

export async function writeFinalReceipt(
  repositoryRoot: string,
  workdir: string,
  unsigned: Omit<FinalReceiptV2, "receipt_sha256">,
): Promise<FinalReceiptV2> {
  const receipt: FinalReceiptV2 = {
    ...unsigned,
    receipt_sha256: sha256Hex(canonicalValueJson(unsigned)),
  };
  const content = canonicalJson(receipt);
  await Promise.all([
    atomicText(runtimePath(workdir, FINAL_FILE), content),
    atomicText(await auditReceiptPath(repositoryRoot), content),
  ]);
  return receipt;
}

export async function readFinalReceipt(
  _repositoryRoot: string,
  workdir: string,
): Promise<FinalReceiptV2 | null> {
  const value = await readOptionalJson(runtimePath(workdir, FINAL_FILE));
  if (value === null) return null;
  const receipt = value as FinalReceiptV2;
  const { receipt_sha256: receiptHash, ...unsigned } = receipt;
  if (
    receipt.schema_version !== "long-task-final-receipt-v2" ||
    receipt.authority_scope !== "audit_only" ||
    receipt.reusable_for_acceptance !== false ||
    sha256Hex(canonicalValueJson(unsigned)) !== receiptHash
  )
    throw new Error("final_receipt_integrity_mismatch");
  return receipt;
}

export async function clearActiveBinding(
  repositoryRoot: string,
  workdir: string,
): Promise<boolean> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  if (!active) return false;
  if (active.workdir !== path.resolve(workdir))
    throw new Error("active_task_identity_mismatch");
  const activeFile = await activeRecordPath(repositoryRoot);
  const clearing = `${activeFile}.clearing-${process.pid}-${Date.now()}`;
  await rename(activeFile, clearing);
  try {
    await gitConfigUnset(repositoryRoot, markerKey(active.worktree_identity));
    await rm(clearing, { force: true });
  } catch (error) {
    await rename(clearing, activeFile).catch(() => undefined);
    throw error;
  }
  return true;
}

export async function abandonLongTaskState(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  const resolved = path.resolve(workdir);
  if (active?.workdir === resolved)
    await clearActiveBinding(repositoryRoot, resolved);
  await rm(runtimePath(workdir), { recursive: true, force: true });
}

export async function clearFinalReceipt(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
    rm(await auditReceiptPath(repositoryRoot), { force: true }),
  ]);
}

async function auditReceiptPath(repositoryRoot: string): Promise<string> {
  return path.join(
    path.dirname(await activeRecordPath(repositoryRoot)),
    "last-final-receipt.json",
  );
}

async function ensureRuntimeExcludes(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const exclude = await gitPath(repositoryRoot, "info/exclude");
  await mkdir(path.dirname(exclude), { recursive: true });
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const relativeRuntime = `${path
    .relative(repositoryRoot, runtimePath(workdir))
    .replace(/\\/gu, "/")}/`;
  if (!existing.split(/\r?\n/u).includes(relativeRuntime))
    await writeFile(
      exclude,
      `${existing.replace(/\s*$/u, "")}\n${relativeRuntime}\n`,
      "utf8",
    );
}

function markerKey(identity: string): string {
  return `ty-context.longTask.${identity}`;
}

function normalizePath(value: string): string {
  const normalized = path.resolve(value).replace(/\\/gu, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readOptionalJson(file: string): Promise<unknown | null> {
  try {
    return await readJson(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  await atomicText(file, canonicalJson(value));
}

async function atomicText(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, file);
}
