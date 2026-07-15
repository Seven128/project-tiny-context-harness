import { readFile } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import { parseDeliverySet } from "./long-task-delivery-set-parser.js";
import type {
  CompiledDeliverySetV1,
  DeliverySetStatusV1,
} from "./long-task-delivery-set-types.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import { readCompiledDeliveryContract } from "./long-task-state.js";
import {
  computeContractInterfaceIdentity,
  readChildGateReceipt,
  readCompiledDeliverySet,
  readDeliverySetReceipt,
} from "./long-task-delivery-set-state.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import {
  captureWorkspaceManifest,
  currentGitState,
} from "./long-task-workspace.js";

export async function deliverySetCompileFreshness(
  compiled: CompiledDeliverySetV1,
): Promise<string[]> {
  const findings: string[] = [];
  try {
    const current = await parseDeliverySet(compiled.set_workdir);
    if (sha256Hex(canonicalValueJson(current)) !== compiled.set_sha256)
      findings.push("delivery_set_changed_after_compile");
  } catch {
    findings.push("delivery_set_changed_after_compile");
  }
  for (const [file, hash] of Object.entries(compiled.source_hashes))
    try {
      if (
        sha256Hex(await readFile(path.join(compiled.repository_root, file))) !==
        hash
      )
        findings.push(`delivery_set_source_changed_after_compile:${file}`);
    } catch {
      findings.push(`delivery_set_source_changed_after_compile:${file}`);
    }
  try {
    const context = await captureContextGraphSnapshot(
      compiled.repository_root,
      compiled.definition.set.context_refs,
      compiled.context_snapshot.mode,
    );
    if (
      context.topology_sha256 !== compiled.context_snapshot.topology_sha256 ||
      canonicalValueJson(context.sha256) !==
        canonicalValueJson(compiled.context_snapshot.sha256)
    )
      findings.push("delivery_set_context_changed_after_compile");
  } catch {
    findings.push("delivery_set_context_changed_after_compile");
  }
  try {
    const verifier = await captureVerifierIdentity(
      compiled.repository_root,
      compiled.verifier_identity.hook_sha256 !== "not-required",
    );
    if (
      verifier.bundle_sha256 !== compiled.verifier_identity.bundle_sha256 ||
      verifier.hook_sha256 !== compiled.verifier_identity.hook_sha256
    )
      findings.push("delivery_set_verifier_changed_after_compile");
  } catch {
    findings.push("delivery_set_verifier_changed_after_compile");
  }
  for (const check of compiled.integration_checks)
    for (const [file, hash] of Object.entries(check.runner.frozen_files))
      try {
        if (
          sha256Hex(
            await readFile(path.join(compiled.repository_root, file)),
          ) !== hash
        )
          findings.push(
            `delivery_set_runner_changed_after_compile:${check.internal_id}:${file}`,
          );
      } catch {
        findings.push(
          `delivery_set_runner_changed_after_compile:${check.internal_id}:${file}`,
        );
      }
  return [...new Set(findings)].sort();
}

export async function readDeliverySetStatus(
  setdir: string,
): Promise<DeliverySetStatusV1> {
  const compiled = await readCompiledDeliverySet(setdir);
  const manifest = await captureWorkspaceManifest(
    compiled.repository_root,
    compiled.set_workdir,
    undefined,
    compiled.contracts.map((contract) => contract.resolved_workdir),
  );
  const setStale = await deliverySetCompileFreshness(compiled);
  const passed = new Set<string>();
  const stale = new Set<string>();
  const findings = setStale.map((code) => ({
    code,
    outcome_key: null,
    check_key: null,
    message: "A compiled Delivery Set authority input changed.",
    next_action: "Review the change and recompile the Delivery Set.",
  }));
  for (const entry of compiled.contracts) {
    const state = await childGateState(compiled, entry, manifest);
    if (state === "stale") stale.add(entry.key);
    if (state === "passed") passed.add(entry.key);
  }
  const decisionBlocked = new Set(
    compiled.contracts
      .filter((entry) =>
        compiled.definition.source_claims.some(
          (claim) =>
            claim.disposition.type === "decision_required" &&
            entry.source_claim_refs.includes(claim.key),
        ),
      )
      .map((entry) => entry.key),
  );
  const ready = compiled.contracts
    .filter(
      (entry) =>
        !passed.has(entry.key) &&
        !stale.has(entry.key) &&
        !decisionBlocked.has(entry.key) &&
        entry.depends_on.every((dependency) => passed.has(dependency)),
    )
    .map((entry) => entry.key);
  const blocked = compiled.contracts
    .filter(
      (entry) =>
        !passed.has(entry.key) &&
        !stale.has(entry.key) &&
        !ready.includes(entry.key),
    )
    .map((entry) => entry.key);
  let receipt = null;
  let receiptError = false;
  try {
    receipt = await readDeliverySetReceipt(compiled);
  } catch {
    receiptError = true;
  }
  const git = await currentGitState(compiled.repository_root);
  const finalFresh = Boolean(
    receipt &&
    receipt.compiled_set_identity === compiled.compiled_set_identity &&
    receipt.snapshot_sha256 === manifest.snapshot_sha256 &&
    receipt.git_head === git.head &&
    receipt.git_tree === git.tree &&
    git.dirty.length === 0 &&
    setStale.length === 0 &&
    stale.size === 0 &&
    !receiptError,
  );
  const finalResult = projectFinalResult(
    finalFresh,
    receipt?.workflow_status,
    Boolean(receipt),
    passed.size + stale.size,
  );
  return {
    schema_version: "long-task-delivery-set-status-v1",
    set_id: compiled.definition.set.id,
    compiled_set_identity: compiled.compiled_set_identity,
    workspace_snapshot_sha256: manifest.snapshot_sha256,
    ready_contracts: ready,
    blocked_contracts: blocked,
    contract_gate_passed: [...passed].sort(),
    stale_contracts: [...stale].sort(),
    remaining_contracts: compiled.contracts
      .map((entry) => entry.key)
      .filter((key) => !passed.has(key)),
    final_result: finalResult,
    findings,
  };
}

async function childGateState(
  compiled: CompiledDeliverySetV1,
  entry: CompiledDeliverySetV1["contracts"][number],
  manifest: Awaited<ReturnType<typeof captureWorkspaceManifest>>,
): Promise<"missing" | "stale" | "passed"> {
  const child = await readCompiledDeliveryContract(
    entry.resolved_workdir,
  ).catch(() => null);
  const receipt = await readChildGateReceipt(entry.resolved_workdir);
  if (!child || !receipt) return "missing";
  const childStale = await deliveryCompileFreshness(child);
  const interfaceIdentity = computeContractInterfaceIdentity(child, manifest);
  return child.delivery_set?.set_identity === compiled.compiled_set_identity &&
    child.delivery_set.contract_key === entry.key &&
    receipt.set_identity === compiled.compiled_set_identity &&
    receipt.contract_identity === child.compiled_identity &&
    receipt.interface_identity === interfaceIdentity &&
    childStale.length === 0
    ? "passed"
    : "stale";
}

function projectFinalResult(
  fresh: boolean,
  status: string | undefined,
  receiptExists: boolean,
  progressCount: number,
): DeliverySetStatusV1["final_result"] {
  if (fresh)
    return status === "machine_accepted_external_pending"
      ? "machine_accepted_external_pending_fresh"
      : "delivery_set_accepted_fresh";
  if (receiptExists) return "accepted_stale";
  return progressCount ? "needs_work" : "none";
}

export async function resumeDeliverySet(
  setdir: string,
): Promise<Record<string, unknown>> {
  const compiled = await readCompiledDeliverySet(setdir);
  const [status, git] = await Promise.all([
    readDeliverySetStatus(setdir),
    currentGitState(compiled.repository_root),
  ]);
  const { schema_version: _statusSchema, ...statusFields } = status;
  return {
    schema_version: "long-task-delivery-set-resume-v1",
    set: {
      id: compiled.definition.set.id,
      title: compiled.definition.set.title,
      goal: compiled.definition.set.goal,
    },
    git,
    ...statusFields,
    next_safe_action:
      status.ready_contracts.length > 0
        ? `Author, compile, implement and gate ready Contract: ${status.ready_contracts[0]}.`
        : status.stale_contracts.length > 0
          ? `Recompile and rerun stale Contract Gate: ${status.stale_contracts[0]}.`
          : status.remaining_contracts.length === 0
            ? "Create a clean candidate commit and run the Delivery Set Final Gate."
            : "Resolve the declared dependency or source decision before continuing.",
  };
}
