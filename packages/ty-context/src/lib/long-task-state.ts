import {
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
  CompiledDeliveryContractV1,
  FinalReceiptV1,
  ProgressRecordV1,
  AuthorityHashesV1,
} from "./long-task-delivery-types.js";
import { gitPath } from "./long-task-workspace.js";

const RUNTIME_FOLDER = ".ty-context";
const COMPILED_FILE = "compiled-contract.json";
const PROGRESS_FOLDER = "progress";
const AUTHORITY_PENDING_FILE = "authority-revision-pending.json";
const AUTHORITY_APPROVED_FILE = "authority-revision-approved.json";
const FINAL_FILE = "final-receipt.json";
const ACTIVE_FILE = ".codex/ty-context-active-long-task.json";
const MIRROR_FILE = ".codex/ty-context-final-result-receipt.json";

export interface ActiveLongTaskBindingV1 {
  schema_version: "active-long-task-binding-v1";
  repository_root: string;
  workdir: string;
  task_id: string;
  compiled_identity: string;
  verifier_identity: CompiledDeliveryContractV1["verifier_identity"];
  activated_at: string;
  mode: "contract";
}

export interface ActiveDeliverySetBindingV1 {
  schema_version: "active-long-task-binding-v1";
  mode: "delivery_set";
  repository_root: string;
  set_workdir: string;
  compiled_set_identity: string;
  registered_child_contracts: Record<string, string>;
  verifier_identity: CompiledDeliveryContractV1["verifier_identity"];
  activated_at: string;
}

export type ActiveAuthorityBindingV1 =
  ActiveLongTaskBindingV1 | ActiveDeliverySetBindingV1;

export interface PendingAuthorityRevisionV1 {
  schema_version: "long-task-authority-revision-pending-v1";
  previous_hashes: AuthorityHashesV1;
  next_hashes: AuthorityHashesV1;
  changed_authority_sections: string[];
  reason: string;
  new_risk_floor: "standard" | "strict";
  affected_outcomes_or_contracts: string[];
  revision_identity: string;
  created_at: string;
}

export function runtimePath(workdir: string, file = ""): string {
  return path.join(path.resolve(workdir), RUNTIME_FOLDER, file);
}

export async function writeCompiledDeliveryContract(
  compiled: CompiledDeliveryContractV1,
): Promise<void> {
  await atomicJson(runtimePath(compiled.workdir, COMPILED_FILE), compiled);
}

export async function readCompiledDeliveryContract(
  workdir: string,
): Promise<CompiledDeliveryContractV1> {
  const value = (await readJson(
    runtimePath(workdir, COMPILED_FILE),
  )) as CompiledDeliveryContractV1;
  if (value.schema_version !== "compiled-long-task-delivery-v1")
    throw new Error("compiled_contract_invalid:schema_version");
  const { compiled_identity, ...unsigned } = value;
  if (sha256Hex(canonicalValueJson(unsigned)) !== compiled_identity)
    throw new Error("compiled_contract_invalid:identity");
  if (path.resolve(workdir) !== value.workdir)
    throw new Error("compiled_contract_invalid:workdir");
  return value;
}

export async function activateDeliveryContract(
  compiled: CompiledDeliveryContractV1,
): Promise<ActiveLongTaskBindingV1> {
  const existing = await readActiveLongTaskBinding(compiled.repository_root);
  if (existing?.mode === "delivery_set") {
    const expected =
      existing.registered_child_contracts[
        compiled.delivery_set?.contract_key ?? ""
      ];
    if (
      !compiled.delivery_set ||
      compiled.delivery_set.set_identity !== existing.compiled_set_identity ||
      path.resolve(expected ?? "") !== compiled.workdir
    )
      throw new Error("delivery_set_child_not_registered");
    await ensureRuntimeExcludes(compiled.repository_root, compiled.workdir);
    return existing as unknown as ActiveLongTaskBindingV1;
  }
  if (
    existing &&
    (existing.workdir !== compiled.workdir ||
      existing.task_id !== compiled.task.id)
  )
    throw new Error(`active_task_exists:${existing.workdir}`);
  if (!existing || existing.compiled_identity !== compiled.compiled_identity)
    await invalidateFinalAuthority(compiled.repository_root, compiled.workdir);
  const binding: ActiveLongTaskBindingV1 = {
    schema_version: "active-long-task-binding-v1",
    repository_root: compiled.repository_root,
    workdir: compiled.workdir,
    task_id: compiled.task.id,
    compiled_identity: compiled.compiled_identity,
    verifier_identity: compiled.verifier_identity,
    activated_at: existing?.activated_at ?? new Date().toISOString(),
    mode: "contract",
  };
  await ensureRuntimeExcludes(compiled.repository_root, compiled.workdir);
  await atomicJson(activePath(compiled.repository_root), binding);
  return binding;
}

export async function readActiveLongTaskBinding(
  repositoryRoot: string,
): Promise<ActiveAuthorityBindingV1 | null> {
  const value = await readOptionalJson(activePath(repositoryRoot));
  if (value === null) return null;
  const row = value as Record<string, unknown>;
  if (row.mode === "delivery_set") {
    if (
      row.schema_version !== "active-long-task-binding-v1" ||
      typeof row.repository_root !== "string" ||
      typeof row.set_workdir !== "string" ||
      typeof row.compiled_set_identity !== "string" ||
      !row.registered_child_contracts ||
      !row.verifier_identity
    )
      throw new Error("active_binding_invalid");
    return row as unknown as ActiveDeliverySetBindingV1;
  }
  if (
    row.schema_version !== "active-long-task-binding-v1" ||
    typeof row.repository_root !== "string" ||
    typeof row.workdir !== "string" ||
    typeof row.task_id !== "string" ||
    typeof row.compiled_identity !== "string" ||
    !row.verifier_identity
  )
    throw new Error("active_binding_invalid");
  return { ...(row as unknown as ActiveLongTaskBindingV1), mode: "contract" };
}

export async function assertMatchingActiveBinding(
  compiled: CompiledDeliveryContractV1,
): Promise<ActiveLongTaskBindingV1> {
  const active = await readActiveLongTaskBinding(compiled.repository_root);
  if (!active) throw new Error("active_task_missing");
  if (active.mode === "delivery_set") {
    if (
      !compiled.delivery_set ||
      compiled.delivery_set.set_identity !== active.compiled_set_identity ||
      active.registered_child_contracts[compiled.delivery_set.contract_key] !==
        compiled.workdir
    )
      throw new Error("active_task_identity_mismatch");
    return active as unknown as ActiveLongTaskBindingV1;
  }
  if (
    active.workdir !== compiled.workdir ||
    active.compiled_identity !== compiled.compiled_identity
  )
    throw new Error("active_task_identity_mismatch");
  return active;
}

export async function activateDeliverySetBinding(
  binding: ActiveDeliverySetBindingV1,
): Promise<void> {
  const existing = await readActiveLongTaskBinding(binding.repository_root);
  if (
    existing &&
    (existing.mode !== "delivery_set" ||
      existing.set_workdir !== binding.set_workdir)
  )
    throw new Error(
      `active_task_exists:${existing.mode === "delivery_set" ? existing.set_workdir : existing.workdir}`,
    );
  await atomicJson(activePath(binding.repository_root), binding);
}

export async function writeProgressRecord(
  workdir: string,
  record: ProgressRecordV1,
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
): Promise<Record<string, ProgressRecordV1>> {
  const folder = runtimePath(workdir, PROGRESS_FOLDER);
  const names = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const rows: Record<string, ProgressRecordV1> = {};
  for (const name of names.filter((name) => name.endsWith(".json")).sort()) {
    const value = (await readJson(path.join(folder, name))) as ProgressRecordV1;
    if (value.schema_version !== "long-task-progress-record-v1")
      throw new Error(`progress_record_invalid:${name}`);
    rows[value.check_internal_id] = value;
  }
  return rows;
}

export async function writePendingAuthorityRevision(
  workdir: string,
  pending: PendingAuthorityRevisionV1,
): Promise<void> {
  await atomicJson(runtimePath(workdir, AUTHORITY_PENDING_FILE), pending);
  await rm(runtimePath(workdir, AUTHORITY_APPROVED_FILE), { force: true });
}

export async function readPendingAuthorityRevision(
  workdir: string,
): Promise<PendingAuthorityRevisionV1 | null> {
  return (await readOptionalJson(
    runtimePath(workdir, AUTHORITY_PENDING_FILE),
  )) as PendingAuthorityRevisionV1 | null;
}

export async function approvePendingAuthorityRevision(
  workdir: string,
  revision: string,
): Promise<void> {
  const pending = await readPendingAuthorityRevision(workdir);
  if (!pending || pending.revision_identity !== revision)
    throw new Error("authority_revision_not_found_or_mismatched");
  await atomicJson(runtimePath(workdir, AUTHORITY_APPROVED_FILE), {
    schema_version: "long-task-authority-revision-approved-v1",
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

export async function writeFinalReceipt(
  repositoryRoot: string,
  workdir: string,
  unsigned: Omit<FinalReceiptV1, "receipt_sha256">,
): Promise<FinalReceiptV1> {
  const receipt: FinalReceiptV1 = {
    ...unsigned,
    receipt_sha256: sha256Hex(canonicalValueJson(unsigned)),
  };
  const content = canonicalJson(receipt);
  await Promise.all([
    atomicText(runtimePath(workdir, FINAL_FILE), content),
    atomicText(mirrorPath(repositoryRoot), content),
  ]);
  return receipt;
}

export async function readFinalReceipt(
  repositoryRoot: string,
  workdir: string,
): Promise<FinalReceiptV1 | null> {
  const [local, mirror] = await Promise.all([
    readOptionalJson(runtimePath(workdir, FINAL_FILE)),
    readOptionalJson(mirrorPath(repositoryRoot)),
  ]);
  if (local === null && mirror === null) return null;
  if (
    local === null ||
    mirror === null ||
    canonicalValueJson(local) !== canonicalValueJson(mirror)
  )
    throw new Error("final_receipt_mirror_mismatch");
  const receipt = local as FinalReceiptV1;
  const { receipt_sha256, ...unsigned } = receipt;
  if (sha256Hex(canonicalValueJson(unsigned)) !== receipt_sha256)
    throw new Error("final_receipt_integrity_mismatch");
  return receipt;
}

export async function clearActiveBinding(
  repositoryRoot: string,
  workdir: string,
): Promise<boolean> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  if (!active) return false;
  const activeWorkdir =
    active.mode === "delivery_set" ? active.set_workdir : active.workdir;
  if (activeWorkdir !== path.resolve(workdir))
    throw new Error("active_task_identity_mismatch");
  await rm(activePath(repositoryRoot), { force: true });
  return true;
}

export async function abandonLongTaskState(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const active = await readActiveLongTaskBinding(repositoryRoot);
  const resolved = path.resolve(workdir);
  const ownsTopAuthority =
    (active?.mode === "contract" && active.workdir === resolved) ||
    (active?.mode === "delivery_set" && active.set_workdir === resolved);
  if (ownsTopAuthority) await clearActiveBinding(repositoryRoot, resolved);
  await Promise.all([
    rm(runtimePath(workdir), { recursive: true, force: true }),
    ...(ownsTopAuthority
      ? [rm(mirrorPath(repositoryRoot), { force: true })]
      : []),
  ]);
}

export async function clearFinalReceipt(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
    rm(mirrorPath(repositoryRoot), { force: true }),
  ]);
}

async function invalidateFinalAuthority(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
    rm(mirrorPath(repositoryRoot), { force: true }),
  ]);
}

async function ensureRuntimeExcludes(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const exclude = await gitPath(repositoryRoot, "info/exclude");
  await mkdir(path.dirname(exclude), { recursive: true });
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const relativeRuntime = `${path.relative(repositoryRoot, runtimePath(workdir)).replace(/\\/gu, "/")}/`;
  const additions = [ACTIVE_FILE, MIRROR_FILE, relativeRuntime].filter(
    (entry) => !existing.split(/\r?\n/u).includes(entry),
  );
  if (additions.length)
    await writeFile(
      exclude,
      `${existing.replace(/\s*$/u, "")}\n${additions.join("\n")}\n`,
      "utf8",
    );
}

function activePath(root: string): string {
  return path.join(root, ...ACTIVE_FILE.split("/"));
}
function mirrorPath(root: string): string {
  return path.join(root, ...MIRROR_FILE.split("/"));
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
