import { lstat } from "node:fs/promises";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { exactRegularFile, writeExclusiveSynced } from "./composite-campaign-atomic-io.js";

export type CompositeRemovalKind = "file" | "directory";
export interface CompositeRemovalIdentity { dev: number | bigint; ino: number | bigint }

export async function publishCompositeRemovalApproval(
  projectRoot: string,
  target: string,
  kind: CompositeRemovalKind,
  identity: CompositeRemovalIdentity
): Promise<void> {
  await writeExclusiveSynced(projectRoot, target, approvalRaw(kind, identity));
}

export async function assertCompositeRemovalApproval(
  target: string,
  kind: CompositeRemovalKind,
  identity: CompositeRemovalIdentity
): Promise<void> {
  const raw = approvalRaw(kind, identity);
  if (!await exactRegularFile(target, sha256Hex(raw), Buffer.byteLength(raw))) {
    throw new Error("Composite campaign removal approval does not bind the moved inode");
  }
}

export async function assertCompositeRemovalApprovalShape(target: string): Promise<void> {
  const current = await lstat(target);
  if (!current.isFile() || current.isSymbolicLink() || current.size > 256) {
    throw new Error("Composite campaign removal approval is invalid");
  }
}

function approvalRaw(kind: CompositeRemovalKind, identity: CompositeRemovalIdentity): string {
  return canonicalJson({
    schema_version: "composite-removal-approval-v1",
    kind,
    dev: String(identity.dev),
    ino: String(identity.ino)
  });
}
