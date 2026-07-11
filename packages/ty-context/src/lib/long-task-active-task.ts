import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type { CompiledContractV2 } from "./long-task-contract-schema.js";

export async function activateLongTask(contract: CompiledContractV2, hookBundleSha256: string): Promise<void> { const value = { schema_version: "active-long-task-binding-v2", repository_root: contract.repository_root, workdir: contract.workdir, contract_sha256: contract.contract_sha256, verifier: contract.verifier_identity, hook_bundle_sha256: hookBundleSha256 }; const files = [path.join(contract.repository_root, ".codex", "ty-context-active-long-task.json"), path.join(contract.repository_root, ".git", "ty-context-active-long-task.json")]; for (const file of files) { await mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.tmp-${process.pid}-${Date.now()}`; await writeFile(temp, canonicalJson(value), { flag: "wx" }); await rename(temp, file); } }
