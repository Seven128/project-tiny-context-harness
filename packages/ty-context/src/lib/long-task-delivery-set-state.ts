import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChildContractGateReceiptV1,
  CompiledDeliverySetV1,
  DeliverySetReceiptV1,
} from "./long-task-delivery-set-types.js";
import type {
  CompiledDeliveryContractV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./strict-codec.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { gitPath } from "./long-task-workspace.js";

const RUNTIME_FOLDER = ".ty-context";
const COMPILED_SET_FILE = "compiled-delivery-set.json";
const SET_RECEIPT_FILE = "delivery-set-receipt.json";
const CHILD_RECEIPT_FILE = "contract-gate-receipt.json";
const SET_PENDING_FILE = "authority-revision-pending.json";
const SET_APPROVED_FILE = "authority-revision-approved.json";
const MIRROR_FILE = ".codex/ty-context-final-result-receipt.json";

export async function writeCompiledDeliverySet(
  compiled: CompiledDeliverySetV1,
): Promise<void> {
  await atomicJson(
    runtimePath(compiled.set_workdir, COMPILED_SET_FILE),
    compiled,
  );
  await ensureRuntimeExclude(compiled.repository_root, compiled.set_workdir);
}

export async function readCompiledDeliverySet(
  setdir: string,
): Promise<CompiledDeliverySetV1> {
  const value = (await readJson(
    runtimePath(setdir, COMPILED_SET_FILE),
  )) as CompiledDeliverySetV1;
  if (value.schema_version !== "compiled-long-task-delivery-set-v1")
    throw new Error("compiled_delivery_set_invalid:schema_version");
  const { compiled_set_identity, ...unsigned } = value;
  if (sha256Hex(canonicalValueJson(unsigned)) !== compiled_set_identity)
    throw new Error("compiled_delivery_set_invalid:identity");
  if (path.resolve(setdir) !== value.set_workdir)
    throw new Error("compiled_delivery_set_invalid:set_workdir");
  return value;
}

export async function readOptionalCompiledDeliverySet(
  setdir: string,
): Promise<CompiledDeliverySetV1 | null> {
  try {
    return await readCompiledDeliverySet(setdir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeChildGateReceipt(
  compiled: CompiledDeliveryContractV1,
  manifest: WorkspaceManifestV1,
  checkResults: ChildContractGateReceiptV1["check_results"],
): Promise<ChildContractGateReceiptV1> {
  if (!compiled.delivery_set)
    throw new Error("child_gate_requires_delivery_set_contract");
  const unsigned = {
    schema_version: "long-task-child-contract-gate-receipt-v1" as const,
    workflow_status: "contract_gate_passed" as const,
    set_identity: compiled.delivery_set.set_identity,
    contract_key: compiled.delivery_set.contract_key,
    contract_identity: compiled.compiled_identity,
    snapshot_sha256: manifest.snapshot_sha256,
    interface_identity: computeContractInterfaceIdentity(compiled, manifest),
    check_results: checkResults,
    completed_at: new Date().toISOString(),
  };
  const receipt = {
    ...unsigned,
    receipt_sha256: sha256Hex(canonicalValueJson(unsigned)),
  };
  await atomicJson(runtimePath(compiled.workdir, CHILD_RECEIPT_FILE), receipt);
  return receipt;
}

export async function readChildGateReceipt(
  workdir: string,
): Promise<ChildContractGateReceiptV1 | null> {
  const value = await readOptionalJson(
    runtimePath(workdir, CHILD_RECEIPT_FILE),
  );
  if (!value) return null;
  const receipt = value as ChildContractGateReceiptV1;
  const { receipt_sha256, ...unsigned } = receipt;
  if (
    receipt.schema_version !== "long-task-child-contract-gate-receipt-v1" ||
    sha256Hex(canonicalValueJson(unsigned)) !== receipt_sha256
  )
    throw new Error("child_gate_receipt_invalid");
  return receipt;
}

export async function writeDeliverySetReceipt(
  compiled: CompiledDeliverySetV1,
  unsigned: Omit<DeliverySetReceiptV1, "receipt_sha256">,
): Promise<DeliverySetReceiptV1> {
  const receipt = {
    ...unsigned,
    receipt_sha256: sha256Hex(canonicalValueJson(unsigned)),
  };
  const content = canonicalJson(receipt);
  await Promise.all([
    atomicText(runtimePath(compiled.set_workdir, SET_RECEIPT_FILE), content),
    atomicText(
      path.join(compiled.repository_root, ...MIRROR_FILE.split("/")),
      content,
    ),
  ]);
  return receipt;
}

export async function readDeliverySetReceipt(
  compiled: CompiledDeliverySetV1,
): Promise<DeliverySetReceiptV1 | null> {
  const [local, mirror] = await Promise.all([
    readOptionalJson(runtimePath(compiled.set_workdir, SET_RECEIPT_FILE)),
    readOptionalJson(
      path.join(compiled.repository_root, ...MIRROR_FILE.split("/")),
    ),
  ]);
  if (!local && !mirror) return null;
  if (
    !local ||
    !mirror ||
    canonicalValueJson(local) !== canonicalValueJson(mirror)
  )
    throw new Error("delivery_set_receipt_mirror_mismatch");
  const receipt = local as DeliverySetReceiptV1;
  const { receipt_sha256, ...unsigned } = receipt;
  if (
    receipt.schema_version !== "long-task-delivery-set-receipt-v1" ||
    sha256Hex(canonicalValueJson(unsigned)) !== receipt_sha256
  )
    throw new Error("delivery_set_receipt_invalid");
  return receipt;
}

export async function clearDeliverySetReceipt(
  compiled: CompiledDeliverySetV1,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(compiled.set_workdir, SET_RECEIPT_FILE), { force: true }),
    rm(path.join(compiled.repository_root, ...MIRROR_FILE.split("/")), {
      force: true,
    }),
  ]);
}

export async function abandonDeliverySetState(
  compiled: CompiledDeliverySetV1 | null,
  setdir: string,
): Promise<void> {
  if (compiled) await clearDeliverySetReceipt(compiled);
  await rm(runtimePath(setdir), { recursive: true, force: true });
}

export function computeContractInterfaceIdentity(
  compiled: CompiledDeliveryContractV1,
  manifest: WorkspaceManifestV1,
): string {
  const carriers: Record<string, string> = {};
  for (const outcome of compiled.outcomes)
    for (const binding of outcome.technical.bindings)
      for (const pattern of binding.carrier_paths)
        for (const file of manifest.files)
          if (matchesRepoPattern(file.path, pattern))
            carriers[file.path] = file.sha256;
  return sha256Hex(
    canonicalValueJson({
      public_bindings: compiled.outcomes.flatMap((outcome) =>
        outcome.technical.bindings.map((binding) => ({
          outcome: outcome.key,
          kind: binding.kind,
          target: binding.target,
          carrier_paths: binding.carrier_paths,
        })),
      ),
      carriers,
    }),
  );
}

export async function deliverySetWorkspaceExclusions(
  compiled: CompiledDeliveryContractV1,
): Promise<string[]> {
  if (!compiled.delivery_set) return [];
  const set = await readCompiledDeliverySet(compiled.delivery_set.set_workdir);
  if (set.compiled_set_identity !== compiled.delivery_set.set_identity)
    throw new Error("delivery_set_identity_mismatch");
  return [
    set.set_workdir,
    ...set.contracts.map((contract) => contract.resolved_workdir),
  ].filter((workdir) => workdir !== compiled.workdir);
}

export async function writeSetPendingRevision(
  setdir: string,
  value: Record<string, unknown>,
): Promise<void> {
  await atomicJson(runtimePath(setdir, SET_PENDING_FILE), value);
  await rm(runtimePath(setdir, SET_APPROVED_FILE), { force: true });
}

export async function approveSetPendingRevision(
  setdir: string,
  revision: string,
): Promise<void> {
  const pending = (await readOptionalJson(
    runtimePath(setdir, SET_PENDING_FILE),
  )) as { revision_identity?: unknown } | null;
  if (pending?.revision_identity !== revision)
    throw new Error("authority_revision_not_found_or_mismatched");
  await atomicJson(runtimePath(setdir, SET_APPROVED_FILE), {
    schema_version: "long-task-authority-revision-approved-v1",
    revision_identity: revision,
    approved_at: new Date().toISOString(),
  });
}

export async function setRevisionApproved(
  setdir: string,
  revision: string,
): Promise<boolean> {
  const approved = (await readOptionalJson(
    runtimePath(setdir, SET_APPROVED_FILE),
  )) as { revision_identity?: unknown } | null;
  return approved?.revision_identity === revision;
}

export async function clearSetRevision(setdir: string): Promise<void> {
  await Promise.all([
    rm(runtimePath(setdir, SET_PENDING_FILE), { force: true }),
    rm(runtimePath(setdir, SET_APPROVED_FILE), { force: true }),
  ]);
}

function runtimePath(workdir: string, file = ""): string {
  return path.join(path.resolve(workdir), RUNTIME_FOLDER, file);
}

async function ensureRuntimeExclude(
  root: string,
  workdir: string,
): Promise<void> {
  const exclude = await gitPath(root, "info/exclude");
  await mkdir(path.dirname(exclude), { recursive: true });
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const relative = `${path.relative(root, runtimePath(workdir)).replace(/\\/gu, "/")}/`;
  if (!existing.split(/\r?\n/u).includes(relative))
    await writeFile(
      exclude,
      `${existing.replace(/\s*$/u, "")}\n${relative}\n`,
      "utf8",
    );
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
