import { readFile } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import type { CompiledDeliveryContractV2 } from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import { parseDeliveryContractBundle } from "./long-task-delivery-parser.js";

export async function deliveryCompileFreshness(
  compiled: CompiledDeliveryContractV2,
): Promise<string[]> {
  const findings: string[] = [];
  try {
    const currentContract = await parseDeliveryContractBundle(compiled.workdir);
    if (
      sha256Hex(canonicalValueJson(currentContract.contract)) !==
      compiled.contract_sha256
    )
      findings.push(`contract_changed_after_compile:${compiled.contract_file}`);
  } catch {
    findings.push(`contract_changed_after_compile:${compiled.contract_file}`);
  }
  for (const [file, hash] of Object.entries(compiled.contract_files))
    await compareFile(
      path.join(compiled.repository_root, file),
      hash,
      `contract_changed_after_compile:${file}`,
      findings,
    );
  for (const [file, hash] of Object.entries(compiled.source_hashes))
    await compareFile(
      path.join(compiled.repository_root, file),
      hash,
      `source_changed_after_compile:${file}`,
      findings,
    );
  try {
    const current = await captureContextGraphSnapshot(
      compiled.repository_root,
      compiled.task.context_refs,
      compiled.context_snapshot.mode,
    );
    if (current.topology_sha256 !== compiled.context_snapshot.topology_sha256)
      findings.push("context_changed_after_compile:topology");
    if (
      canonicalValueJson(current.files) !==
      canonicalValueJson(compiled.context_snapshot.files)
    )
      findings.push("context_changed_after_compile:file_set");
    for (const [file, hash] of Object.entries(compiled.context_snapshot.sha256))
      if (current.sha256[file] !== hash)
        findings.push(`context_changed_after_compile:${file}`);
  } catch (error) {
    findings.push(`context_changed_after_compile:${message(error)}`);
  }
  try {
    const currentVerifier = await captureVerifierIdentity(
      compiled.repository_root,
      compiled.verifier_identity.hook_sha256 !== "not-required",
    );
    if (
      currentVerifier.bundle_sha256 !==
        compiled.verifier_identity.bundle_sha256 ||
      currentVerifier.schema_sha256 !== compiled.verifier_identity.schema_sha256
    )
      findings.push("verifier_changed_after_compile:bundle");
    if (currentVerifier.hook_sha256 !== compiled.verifier_identity.hook_sha256)
      findings.push("verifier_changed_after_compile:hook");
  } catch {
    findings.push("verifier_changed_after_compile:bundle");
  }
  const checks = [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  for (const check of checks)
    for (const [file, hash] of Object.entries(check.runner.frozen_files))
      await compareFile(
        path.join(compiled.repository_root, file),
        hash,
        `runner_changed_after_compile:${check.internal_id}:${file}`,
        findings,
      );
  return [...new Set(findings)].sort();
}

async function compareFile(
  file: string,
  expected: string,
  finding: string,
  findings: string[],
): Promise<void> {
  try {
    if (sha256Hex(await readFile(file)) !== expected) findings.push(finding);
  } catch {
    findings.push(finding);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
