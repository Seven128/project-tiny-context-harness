import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./strict-codec.js";
import type {
  CompiledDeliveryContractV1,
  FinalReceiptV1,
  VerificationCacheV1,
} from "./long-task-delivery-types.js";
import { gitPath } from "./long-task-workspace.js";

const RUNTIME_FOLDER = ".ty-context";
const COMPILED_FILE = "compiled-contract.json";
const VERIFY_FILE = "verification-cache.json";
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
  };
  await ensureRuntimeExcludes(compiled.repository_root, compiled.workdir);
  await atomicJson(activePath(compiled.repository_root), binding);
  return binding;
}

export async function readActiveLongTaskBinding(
  repositoryRoot: string,
): Promise<ActiveLongTaskBindingV1 | null> {
  const value = await readOptionalJson(activePath(repositoryRoot));
  if (value === null) return null;
  const row = value as Partial<ActiveLongTaskBindingV1>;
  if (
    row.schema_version !== "active-long-task-binding-v1" ||
    typeof row.repository_root !== "string" ||
    typeof row.workdir !== "string" ||
    typeof row.task_id !== "string" ||
    typeof row.compiled_identity !== "string" ||
    !row.verifier_identity
  )
    throw new Error("active_binding_invalid");
  return row as ActiveLongTaskBindingV1;
}

export async function assertMatchingActiveBinding(
  compiled: CompiledDeliveryContractV1,
): Promise<ActiveLongTaskBindingV1> {
  const active = await readActiveLongTaskBinding(compiled.repository_root);
  if (!active) throw new Error("active_task_missing");
  if (
    active.workdir !== compiled.workdir ||
    active.compiled_identity !== compiled.compiled_identity
  )
    throw new Error("active_task_identity_mismatch");
  return active;
}

export async function writeVerificationCache(
  workdir: string,
  cache: VerificationCacheV1,
): Promise<void> {
  await atomicJson(runtimePath(workdir, VERIFY_FILE), cache);
}

export async function readVerificationCache(
  workdir: string,
): Promise<VerificationCacheV1 | null> {
  return (await readOptionalJson(
    runtimePath(workdir, VERIFY_FILE),
  )) as VerificationCacheV1 | null;
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
  if (active.workdir !== path.resolve(workdir))
    throw new Error("active_task_identity_mismatch");
  await rm(activePath(repositoryRoot), { force: true });
  return true;
}

export async function abandonLongTaskState(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  await clearActiveBinding(repositoryRoot, workdir);
  await Promise.all([
    rm(runtimePath(workdir), { recursive: true, force: true }),
    rm(mirrorPath(repositoryRoot), { force: true }),
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
    rm(runtimePath(workdir, VERIFY_FILE), { force: true }),
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
