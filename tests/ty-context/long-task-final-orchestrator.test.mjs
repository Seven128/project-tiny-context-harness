import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runLongTaskFinalGate, stopCheckLongTask } from "./long-task-test-runtime.mjs";
import { observationV2OracleScript, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
import { canonicalJson } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { assertLongTaskFinalTraceSequenceV3, createLongTaskFinalTraceV3 } from "../../packages/ty-context/dist/lib/long-task-final-steps.js";
import { readCanonicalJsonV3, writeDurableCanonicalJsonV3 } from "../../packages/ty-context/dist/lib/long-task-durable-json.js";
import { LongTaskHostRegistryServiceV1 } from "../../packages/ty-context/dist/lib/long-task-host-service.js";

const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;
const stepIds = [
  "host_registry_read",
  "compiled_contract_read",
  "source_context_freshness",
  "oracle_closure_freshness",
  "trusted_tool_identity",
  "final_source_snapshot",
  "dependency_layers",
  "real_specs",
  "environment_probes",
  "binding_evaluation",
  "counterfactual_controls",
  "proof_projection",
  "ac_projection",
  "obligation_projection",
  "plan_item_projection",
  "requirement_projection",
  "negative_evidence",
  "population_validation",
  "workspace_stability",
  "durable_result_commit"
];
const payloadKeys = ["result_id","registry_id","contract_sha256","run_id","started_at","finished_at","workflow_status","final_snapshot_sha256","workspace_hash_before","workspace_hash_after","dependency_layer_keys","browser_layer_keys","environment_manifest_sha256","spec_results","assertion_results","population_results","binding_results","counterfactual_results","proof_requirement_results","acceptance_criterion_results","obligation_results","plan_item_results","requirement_results","environment_probe_results","findings","external_blocker"].sort();

test("the Final Gate trace validator rejects missing, duplicated, reordered, and skipped steps", () => {
  const entries = stepIds.map((step_id, index) => ({ index: index + 1, step_id, status: "passed", started_at: "2026-01-01T00:00:00.000Z", finished_at: "2026-01-01T00:00:00.001Z", finding_codes: [], evidence_refs: [] }));
  assert.doesNotThrow(() => createLongTaskFinalTraceV3({ result_id: "RESULT-1", registry_id: "REGISTRY-1", contract_sha256: "a".repeat(64), run_id: "RUN-1", steps: entries }));
  assert.throws(() => assertLongTaskFinalTraceSequenceV3(entries.slice(1)), /final_gate_sequence_invalid/u);
  assert.throws(() => assertLongTaskFinalTraceSequenceV3(entries.map((item, index) => index === 2 ? { ...item, step_id: entries[1].step_id } : item)), /final_gate_sequence_invalid/u);
  assert.throws(() => assertLongTaskFinalTraceSequenceV3([entries[1], entries[0], ...entries.slice(2)]), /final_gate_sequence_invalid/u);
  assert.throws(() => assertLongTaskFinalTraceSequenceV3(entries.map((item, index) => index === 8 ? { ...item, status: "skipped" } : item)), /final_gate_sequence_invalid/u);
});

test("durable JSON keeps the prior destination on a pre-rename crash and atomically replaces it later", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-durable-json-"));
  const file = path.join(root, "final-result.json");
  await writeDurableCanonicalJsonV3(file, { generation: 1 });
  await assert.rejects(() => writeDurableCanonicalJsonV3(file, { generation: 2 }, { fault(point) { if (point === "after_file_sync") throw new Error("injected_crash"); } }), /injected_crash/u);
  assert.deepEqual((await readCanonicalJsonV3(file)).value, { generation: 1 });
  assert.ok((await readdir(root)).some((name) => name.endsWith(".tmp")));
  await writeDurableCanonicalJsonV3(file, { generation: 3 });
  assert.deepEqual((await readCanonicalJsonV3(file)).value, { generation: 3 });
});

test("a crash after the signed Host WAL commit is recovered before the result is trusted", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await setup("wal-recovery");
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), "ltw-final-host-state-"));
  let injected = false;
  const crashing = new LongTaskHostRegistryServiceV1({ stateRoot, keyRoot: stateRoot, fault(point) { if (!injected && point === "after_journal_commit:commit_final_result") { injected = true; throw new Error("injected_host_commit_crash"); } } });
  await assert.rejects(() => runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract, host_service: crashing }), /injected_host_commit_crash/u);
  const envelope = (await readCanonicalJsonV3(path.join(fixture.workdir, "final-result.json"))).value;
  const trace = (await readCanonicalJsonV3(path.join(fixture.workdir, "runs", envelope.payload.run_id, "final-trace.json"))).value;
  const recovered = new LongTaskHostRegistryServiceV1({ stateRoot, keyRoot: stateRoot });
  const commit = await recovered.verifyCommittedFinalResult(fixture.root, fixture.workdir, envelope, trace);
  assert.equal(commit.result_id, envelope.payload.result_id);
  assert.equal(commit.payload_sha256, envelope.integrity.payload_sha256);
});

test("Final Gate writes the exact signed V3 envelope and immutable 20-step trace", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await setup("envelope");
  const result = await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const envelope = JSON.parse(await readFile(path.join(fixture.workdir, "final-result.json"), "utf8"));
  assert.equal(result.workflow_status, "accepted");
  assert.equal(envelope.schema_version, "long-task-final-result-v3");
  assert.deepEqual(Object.keys(envelope).sort(), ["host_attestation", "integrity", "payload", "schema_version"]);
  assert.deepEqual(Object.keys(envelope.payload).sort(), payloadKeys);
  assert.match(envelope.integrity.payload_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(envelope.integrity.atomic_write_complete, true);
  assert.match(envelope.host_attestation.key_id, /^[a-f0-9]{64}$/u);
  assert.ok(envelope.host_attestation.signature.length > 40);
  assert.deepEqual(Object.keys(envelope.payload.requirement_results).sort(), fixture.contract.requirements.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.plan_item_results).sort(), fixture.contract.plan_items.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.obligation_results).sort(), fixture.contract.obligations.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.acceptance_criterion_results).sort(), fixture.contract.acceptance_criteria.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.proof_requirement_results).sort(), fixture.contract.proof_requirements.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.binding_results).sort(), fixture.contract.bindings.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.counterfactual_results).sort(), fixture.contract.counterfactual_controls.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.spec_results).sort(), fixture.contract.verification_specs.map((item) => item.id));
  assert.deepEqual(Object.keys(envelope.payload.assertion_results).sort(), fixture.contract.verification_specs.flatMap((spec) => [...spec.positive_assertions, ...spec.negative_assertions].map((item) => item.id)).sort());
  assert.deepEqual(Object.keys(envelope.payload.population_results), []);
  assert.deepEqual(Object.keys(envelope.payload.environment_probe_results), []);
  assert.equal(envelope.payload.findings.length, 0);
  const trace = JSON.parse(await readFile(path.join(fixture.workdir, "runs", result.run_id, "final-trace.json"), "utf8"));
  assert.deepEqual(trace.steps.map((item) => item.step_id), stepIds);
  assert.ok(trace.steps.every((item, index) => item.index === index + 1 && item.status === "passed"));
  assert.match(trace.trace_sha256, /^[a-f0-9]{64}$/u);
});

test("workspace_stability rechecks Oracle identity after counterfactual execution", { skip: !helper, timeout: 90_000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-final-v3-late-oracle-"));
  const workdir = await writeHappyV3Contract(root);
  await writeFile(path.join(root, "tests", "acceptance", "oracle.mjs"), observationV2OracleScript("good", "IB-002", "value.read", 750));
  const contract = await compileLongTaskContract(workdir, root);
  const pending = runLongTaskFinalGate(workdir, { contract });
  await waitForCounterfactual(workdir);
  await appendFile(path.join(root, "tests", "acceptance", "oracle.mjs"), "\n// late identity drift\n");
  const result = await pending;
  assert.equal(result.workflow_status, "needs_work");
  const finding = result.findings.find((item) => item.code === "oracle_changed" && item.step_id === "workspace_stability");
  assert.ok(finding);
  assert.ok(finding.affected_entity_ids.length > 0);
  assert.match(finding.reverify_command, /composite-long-task final-gate/u);
  for (const map of [result.binding_results, result.proof_requirement_results, result.acceptance_criterion_results, result.obligation_results, result.plan_item_results, result.requirement_results]) assert.ok(Object.values(map).every((item) => item.status === "failed" && item.finding_codes.includes("oracle_changed")));
});

test("Stop rejects a final result with a missing complete entity map before recomputation", { skip: !helper, timeout: 90_000 }, async () => {
  const fixture = await setup("missing-map");
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const file = path.join(fixture.workdir, "final-result.json");
  const value = JSON.parse(await readFile(file, "utf8"));
  delete (value.payload ?? value).requirement_results;
  await writeFile(file, canonicalJson(value));
  const stopped = await stopCheckLongTask(fixture.workdir, "completed", { contract: fixture.contract });
  assert.equal(stopped.decision, "block");
  assert.match(stopped.reason ?? "", /final_result_incomplete/iu);
});

test("Stop rejects a historical signed result even when the workspace is unchanged", { skip: !helper, timeout: 120_000 }, async () => {
  const fixture = await setup("historical");
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const file = path.join(fixture.workdir, "final-result.json");
  const historical = await readFile(file);
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  await writeFile(file, historical);
  const stopped = await stopCheckLongTask(fixture.workdir, "completed", { contract: fixture.contract });
  assert.equal(stopped.decision, "block");
  assert.match(stopped.reason ?? "", /historical_result_rejected/iu);
});

test("Stop rejects a hash/signature-tampered result instead of repairing it by rerun", { skip: !helper, timeout: 90_000 }, async () => {
  const fixture = await setup("forged");
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const file = path.join(fixture.workdir, "final-result.json");
  const value = JSON.parse(await readFile(file, "utf8"));
  const payload = value.payload ?? value;
  payload.requirement_results["PR-FORGED"] = { status: "passed", upstream_ids: [], evidence_refs: [], finding_codes: [] };
  await writeFile(file, canonicalJson(value));
  const stopped = await stopCheckLongTask(fixture.workdir, "completed", { contract: fixture.contract });
  assert.equal(stopped.decision, "block");
  assert.match(stopped.reason ?? "", /final_result_(?:hash_mismatch|signature_invalid)|forged_result_rejected/iu);
});

test("Stop rejects a forged Host signature even when the payload hash is unchanged", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await setup("signature");
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const file = path.join(fixture.workdir, "final-result.json");
  const value = JSON.parse(await readFile(file, "utf8"));
  value.host_attestation.signature = `${value.host_attestation.signature.startsWith("A") ? "B" : "A"}${value.host_attestation.signature.slice(1)}`;
  await writeFile(file, canonicalJson(value));
  const stopped = await stopCheckLongTask(fixture.workdir, "completed", { contract: fixture.contract });
  assert.equal(stopped.decision, "block");
  assert.match(stopped.reason ?? "", /final_result_signature_invalid/iu);
});

test("Stop never trusts a truncated destination or crash temporary", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await setup("truncated");
  await runLongTaskFinalGate(fixture.workdir, { contract: fixture.contract });
  const file = path.join(fixture.workdir, "final-result.json");
  await writeFile(`${file}.tmp-crash`, "{\"schema_version\":");
  await writeFile(file, "{\"schema_version\":");
  const stopped = await stopCheckLongTask(fixture.workdir, "completed", { contract: fixture.contract });
  assert.equal(stopped.decision, "block");
});

async function setup(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-final-v3-${name}-`));
  const workdir = await writeHappyV3Contract(root);
  const contract = await compileLongTaskContract(workdir, root);
  return { root, workdir, contract };
}

async function waitForCounterfactual(workdir) {
  const runRoot = path.join(workdir, "runs");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const entries = await readdir(runRoot, { recursive: true });
      if (entries.some((entry) => String(entry).replace(/\\/gu, "/").includes("/counterfactuals/") || String(entry).replace(/\\/gu, "/").endsWith("/counterfactuals"))) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("counterfactual execution did not start");
}
