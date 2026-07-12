import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { classifyExternalBlocker } from "../../packages/ty-context/dist/lib/long-task-external-blocker.js";
import { runLongTaskFinalGate } from "./long-task-test-runtime.mjs";
import { stopCheckLongTask } from "./long-task-test-runtime.mjs";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const exec = promisify(execFile);
const action = "Complete the frozen MFA approval and rerun final-gate.";
const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN;

test("trusted_mfa_blocker is produced only from current primary and alternative probes", { skip: !helper, timeout: 60_000 }, async () => {
  await withProbeServer({ "/primary": [401, "mfa_required"], "/alternative": [503, "external_service_persistently_unavailable"] }, async ({ url, counts }) => {
    const fixture = await environmentFixture("trusted-mfa", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`), httpProbe("ENV-PROBE-ALT", `${url}/alternative`)], ["ENV-PROBE-ALT"]);
    const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    assert.equal(result.workflow_status, "externally_blocked");
    assert.equal(result.external_blocker?.minimal_user_action, action);
    assert.deepEqual(counts, { "/primary": 1, "/alternative": 1 });
    assert.deepEqual(attempts(result, "ENV-PROBE-PRIMARY"), [false]);
    assert.deepEqual(attempts(result, "ENV-PROBE-ALT"), [false]);
    for (const record of recordsFor(result, "ENV-PROBE-PRIMARY")) assert.deepEqual(record.descriptor, fixture.contract.environment_probes.find((probe) => probe.id === "ENV-PROBE-PRIMARY").descriptor);
    for (const map of [result.requirement_results, result.plan_item_results, result.obligation_results, result.acceptance_results, result.proof_requirement_results]) assert.ok(Object.values(map).every((item) => item.status === "blocked"));
    assert.ok(Object.values(result.binding_results).every((item) => item.status === "passed"));
    assert.ok(Object.values(result.counterfactual_results).every((item) => item.status === "passed"));
  });
});

test("current command-probe artifact and stable provider code can support a blocker", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await environmentFixture("command-artifact", "mfa_required", [commandProbe("ENV-PROBE-PRIMARY", "CMD-PROBE-PRIMARY", ["probe-proof.json"])], [], async (root) => {
    await writeFile(path.join(root, "tests", "acceptance", "probe.mjs"), `import {writeFile} from "node:fs/promises";import path from "node:path";await writeFile(path.join(process.env.TY_CONTEXT_ARTIFACT_DIR,"probe-proof.json"),JSON.stringify({provider:"fixture"}));console.error("TY_CONTEXT_PROBE_ERROR_CODE=mfa_required");process.exitCode=1;\n`);
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "add frozen artifact probe"], { cwd: root });
  }, (data) => data.checklist.verification_specs[0].command_steps.push({ id: "CMD-PROBE-PRIMARY", tool: "node_script", target: "tests/acceptance/probe.mjs", argv: [], cwd: ".", timeout_ms: 10_000, environment_refs: [], output_artifact_ids: [] }));
  const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
  assert.equal(result.workflow_status, "externally_blocked");
  const [record] = recordsFor(result, "ENV-PROBE-PRIMARY");
  assert.equal(record.error_code, "mfa_required");
  assert.equal(record.artifact_refs.length, 1);
  assert.match(record.artifact_refs[0].path, /probe-proof\.json$/u);
});

test("Stop repeats trusted probes and rejects completion language for an external blocker", { skip: !helper, timeout: 90_000 }, async () => {
  await withProbeServer({ "/primary": [401, "mfa_required"] }, async ({ url, counts }) => {
    const fixture = await environmentFixture("stop-blocker", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`)], []);
    await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    const rejected = await stopCheckLongTask(fixture.task, `done; ${action}`, { contract: fixture.contract });
    assert.equal(rejected.decision, "block");
    assert.match(rejected.reason, /cannot claim completion|blocked reply/iu);
    const allowed = await stopCheckLongTask(fixture.task, `Blocked: ${action}`, { contract: fixture.contract });
    assert.deepEqual(allowed, {});
    assert.equal(counts["/primary"], 3);
  });
});

test("probe graph rejects dangling refs, adapter mismatch, raw actions, and impossible budgets", async () => {
  const cases = [
    ["dangling", /environment_probe_unknown/u, (data) => configureInvalid(data, [httpProbe("ENV-PROBE-PRIMARY", "http://127.0.0.1:9/")], ["ENV-PROBE-MISSING"])],
    ["mismatch", /source_schema_invalid:.*adapter:const|environment_probe_adapter_kind_mismatch/u, (data) => { const probe = httpProbe("ENV-PROBE-PRIMARY", "http://127.0.0.1:9/"); probe.kind = "permission"; configureInvalid(data, [probe], []); }],
    ["raw-action", /environment_minimal_user_action_invalid/u, (data) => { configureInvalid(data, [httpProbe("ENV-PROBE-PRIMARY", "http://127.0.0.1:9/")], []); data.checklist.verification_specs[0].environment_requirements[0].minimal_user_action = "access_token=abcdefghijklmnop"; }],
    ["budget", /environment_probe_budget_exceeded/u, (data) => { const primary = tcpProbe("ENV-PROBE-PRIMARY", "127.0.0.1:9"); primary.timeout_ms = 100_000; const alt = tcpProbe("ENV-PROBE-ALT", "127.0.0.1:9"); alt.timeout_ms = 100_000; configureInvalid(data, [primary, alt], ["ENV-PROBE-ALT"], "external_service_persistently_unavailable"); }]
  ];
  for (const [name, pattern, mutate] of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), `ltw-probe-invalid-${name}-`));
    const task = await writeHappyV3Contract(root, mutate);
    await assert.rejects(() => compileLongTaskContract(task, root), pattern);
  }
});

test("wrong_blocker_reason is needs_work even when every probe really ran", { skip: !helper, timeout: 60_000 }, async () => {
  await withProbeServer({ "/primary": [403, "permission_denied"], "/alternative": [503, "external_service_persistently_unavailable"] }, async ({ url }) => {
    const fixture = await environmentFixture("wrong-reason", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`), httpProbe("ENV-PROBE-ALT", `${url}/alternative`)], ["ENV-PROBE-ALT"]);
    const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    assert.equal(result.workflow_status, "needs_work");
    assert.ok(result.findings.some((item) => item.category === "external_blocker_reason_mismatch"));
    for (const map of [result.requirement_results, result.plan_item_results, result.obligation_results, result.acceptance_results, result.proof_requirement_results]) assert.ok(Object.values(map).every((item) => item.status === "failed"));
  });
});

test("implementation_failure_plus_blocker cannot become externally_blocked", { skip: !helper, timeout: 60_000 }, async () => {
  await withProbeServer({ "/primary": [401, "mfa_required"], "/alternative": [503, "external_service_persistently_unavailable"] }, async ({ url }) => {
    const fixture = await environmentFixture("implementation-failure", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`), httpProbe("ENV-PROBE-ALT", `${url}/alternative`)], ["ENV-PROBE-ALT"]);
    await writeFile(path.join(fixture.root, "src", "value.txt"), "wrong\n");
    const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    assert.equal(result.workflow_status, "needs_work");
    assert.ok(result.findings.some((item) => item.category === "implementation_failure_with_blocker"));
  });
});

test("binding_failure_plus_blocker is needs_work with the stable conflict finding", { skip: !helper, timeout: 60_000 }, async () => {
  await withProbeServer({ "/primary": [401, "mfa_required"] }, async ({ url }) => {
    const fixture = await environmentFixture("binding-failure", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`)], [], async () => {}, (data) => { data.plan.plan_items[0].obligations[0].implementation_bindings.find((binding) => binding.id === "IB-002").target = "value.wrong"; });
    const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    assert.equal(result.workflow_status, "needs_work");
    assert.ok(result.findings.some((item) => item.category === "implementation_failure_with_blocker"));
    assert.equal(result.binding_results["IB-002"].status, "failed");
  });
});

test("missing_probe_artifact fails closed instead of trusting an exit/error claim", { skip: !helper, timeout: 60_000 }, async () => {
  const fixture = await environmentFixture("missing-artifact", "mfa_required", [commandProbe("ENV-PROBE-PRIMARY", "CMD-PROBE-PRIMARY", ["probe-proof.json"])], [], async (root) => {
    await writeFile(path.join(root, "tests", "acceptance", "probe.mjs"), `console.error("TY_CONTEXT_PROBE_ERROR_CODE=mfa_required");process.exitCode=1;\n`);
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "add frozen probe"], { cwd: root });
  }, (data) => data.checklist.verification_specs[0].command_steps.push({ id: "CMD-PROBE-PRIMARY", tool: "node_script", target: "tests/acceptance/probe.mjs", argv: [], cwd: ".", timeout_ms: 10_000, environment_refs: [], output_artifact_ids: [] }));
  const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
  assert.equal(result.workflow_status, "needs_work");
  assert.ok(result.findings.some((item) => item.category === "environment_probe_artifact_missing"));
});

test("local_alternative_succeeds and converts the condition into an available path", { skip: !helper, timeout: 60_000 }, async () => {
  await withProbeServer({ "/primary": [401, "mfa_required"], "/alternative": [204, null] }, async ({ url, counts }) => {
    const fixture = await environmentFixture("alternative-succeeds", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", `${url}/primary`), httpProbe("ENV-PROBE-ALT", `${url}/alternative`)], ["ENV-PROBE-ALT"]);
    const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
    assert.equal(result.workflow_status, "accepted");
    assert.equal(result.external_blocker, undefined);
    assert.deepEqual(counts, { "/primary": 1, "/alternative": 1 });
    assert.deepEqual(attempts(result, "ENV-PROBE-ALT"), [true]);
  });
});

test("external_service_persistently_unavailable uses fresh attempts starting at 0, 5, and 20 seconds", { skip: !helper, timeout: 55_000 }, async () => {
  const endpoint = await closedEndpoint();
  const fixture = await environmentFixture("persistent-service", "external_service_persistently_unavailable", [tcpProbe("ENV-PROBE-PRIMARY", endpoint)], []);
  const started = Date.now();
  const result = await runLongTaskFinalGate(fixture.task, { contract: fixture.contract });
  const records = recordsFor(result, "ENV-PROBE-PRIMARY");
  assert.equal(result.workflow_status, "externally_blocked");
  assert.equal(records.length, 3);
  const offsets = records.map((item) => Date.parse(item.started_at) - Date.parse(records[0].started_at));
  assert.ok(offsets[1] >= 4_500 && offsets[1] < 8_000, JSON.stringify(offsets));
  assert.ok(offsets[2] >= 19_500 && offsets[2] < 23_000, JSON.stringify(offsets));
  assert.ok(Date.now() - started >= 19_500);
  const run = JSON.parse(await readFile(path.join(fixture.task, "runs", result.run_id, "verification-result.json"), "utf8"));
  const probeRun = JSON.parse(await readFile(path.join(fixture.task, "runs", result.run_id, "environment-probes.json"), "utf8"));
  Object.values(probeRun.results)[0].attempts.splice(1, 1);
  const invalid = classifyExternalBlocker(run, fixture.contract, probeRun);
  assert.ok(invalid.findings.some((item) => item.category === "external_service_not_persistent"));
});

test("legacy Oracle-authored blocker and unexecuted-alternative lists have no authority", async () => {
  const fixture = await environmentFixture("legacy-forgery", "mfa_required", [httpProbe("ENV-PROBE-PRIMARY", "http://127.0.0.1:9/"), httpProbe("ENV-PROBE-ALT", "http://127.0.0.1:9/")], ["ENV-PROBE-ALT"]);
  const forgedRun = { schema_version: "long-task-verification-run-v2", run_id: "RUN-FORGED", contract_sha256: fixture.contract.contract_sha256, snapshot: {}, environment: {}, findings: [], started_at: new Date().toISOString(), completed_at: new Date().toISOString(), spec_results: [{ spec_id: "VS-AC-001", status: "blocked", assertion_results: {}, population_results: {}, observations: {}, findings: [], external_blocker: { environment_requirement_id: "ER-PRIMARY", reason_code: "mfa_required", actual: "oracle text", attempted_local_alternatives: ["ENV-PROBE-ALT"], minimal_user_action: action } }] };
  const classified = classifyExternalBlocker(forgedRun, fixture.contract, undefined);
  assert.equal(classified.externally_blocked, false);
  assert.ok(classified.findings.some((item) => item.category === "environment_probe_failed"));
});

async function environmentFixture(name, reasonCode, probes, alternatives, after = async () => {}, mutate = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-probe-${name}-`));
  const task = await writeHappyV3Contract(root, (data) => {
    mutate(data);
    data.checklist.environment_probes = probes;
    data.checklist.verification_specs[0].environment_requirements = [{ id: "ER-PRIMARY", reason_code: reasonCode, probe_spec_id: "ENV-PROBE-PRIMARY", local_alternative_probe_ids: alternatives, minimal_user_action: action }];
  });
  await after(root);
  const contract = await compileLongTaskContract(task, root);
  return { root, task, contract };
}

function httpProbe(id, target) { return { id, kind: "network_endpoint", adapter: "http_endpoint", target, timeout_ms: 2_000, expected: { exit_codes: [0], error_codes: [] }, artifact_globs: [], environment_refs: [] }; }
function tcpProbe(id, target) { return { id, kind: "network_endpoint", adapter: "tcp_endpoint", target, timeout_ms: 1_000, expected: { exit_codes: [0], error_codes: [] }, artifact_globs: [], environment_refs: [] }; }
function commandProbe(id, target, artifactGlobs) { return { id, kind: "command_step", adapter: "frozen_command_step", target, timeout_ms: 10_000, expected: { exit_codes: [0], error_codes: [] }, artifact_globs: artifactGlobs, environment_refs: [] }; }
function configureInvalid(data, probes, alternatives, reason = "mfa_required") { data.checklist.environment_probes = probes; data.checklist.verification_specs[0].environment_requirements = [{ id: "ER-PRIMARY", reason_code: reason, probe_spec_id: "ENV-PROBE-PRIMARY", local_alternative_probe_ids: alternatives, minimal_user_action: action }]; }
function recordsFor(result, probeId) { const values = Object.values(result.environment_probe_results ?? {}); return values.filter((item) => item.probe_id === probeId).flatMap((item) => item.attempts); }
function attempts(result, probeId) { return recordsFor(result, probeId).map((item) => item.satisfied); }

async function withProbeServer(routes, body) {
  const counts = Object.fromEntries(Object.keys(routes).map((key) => [key, 0]));
  const server = createServer((request, response) => { const route = request.url ?? "/"; counts[route] = (counts[route] ?? 0) + 1; const [status, code] = routes[route] ?? [404, "not_found"]; response.statusCode = status; if (code) response.setHeader("x-ty-context-error-code", code); response.end(code ?? "available"); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await body({ url: `http://127.0.0.1:${address.port}`, counts }); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

async function closedEndpoint() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return `127.0.0.1:${address.port}`;
}
