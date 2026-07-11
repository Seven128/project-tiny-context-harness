import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type { LongTaskHostActiveRegistryV1 } from "./long-task-host-service.js";

export async function writeLongTaskRegistryMirror(active: LongTaskHostActiveRegistryV1): Promise<void> {
  const file = path.join(active.repository_identity.canonical_path, ".codex", "ty-context-active-long-task.json");
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const value = {
    schema_version: "ty-context-host-active-registry-mirror-v1",
    authoritative: false,
    registry_id: active.registry_id,
    state: active.state,
    workdir: active.workdir_identity.canonical_path,
    contract_sha256: active.contract_sha256,
    updated_at: active.updated_at
  };
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(temporary, "wx");
  try { await handle.writeFile(canonicalJson(value)); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, file);
  await rm(path.join(active.repository_identity.canonical_path, ".git", "ty-context-active-long-task.json"), { force: true });
}
