import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  commitCandidate,
  createDeliveryFixture,
  deliveryContract,
  pathExists,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Delivery Set keeps Child gates non-final and accepts only one current snapshot", async () => {
  const fixture = await createDeliveryFixture();
  const setdir = path.join(fixture.root, ".delivery-set");
  const aDir = path.join(setdir, "contracts", "account");
  const bDir = path.join(setdir, "contracts", "payment");
  try {
    await mkdir(aDir, { recursive: true });
    await mkdir(bDir, { recursive: true });
    await writeFile(path.join(fixture.root, "src", "account-interface.json"), "{}\n");
    await writeFile(path.join(fixture.root, "src", "payment-interface.json"), "{}\n");
    await writeFile(
      path.join(fixture.root, "tests", "set-oracle.mjs"),
      `import { readFile } from "node:fs/promises";
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{result:state.first && state.second}}));
`,
    );
    const account = childContract("account", "first", "first-observable", "src/account-interface.json");
    const payment = childContract("payment", "second", "second-observable", "src/payment-interface.json");
    await writeContract(aDir, account);
    await writeContract(bDir, payment);
    const definition = deliverySetDefinition();
    await writeFile(
      path.join(setdir, "delivery-set.yaml"),
      YAML.stringify(definition, { lineWidth: 0 }),
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["delivery-set", "compile", setdir]);

    await runCli(fixture.root, ["long-task", "compile", aDir]);
    const childA = await runCli(fixture.root, [
      "long-task", "final-gate", aDir,
    ], { skipCandidateCommit: true });
    assert.equal(childA.workflow_status, "contract_gate_passed");
    assert.equal(
      await pathExists(path.join(fixture.root, ".codex", "ty-context-final-result-receipt.json")),
      false,
    );
    const stopped = await runCliFailure(fixture.root, [
      "delivery-set", "stop-check", setdir,
    ]);
    assert.equal(stopped.continue, false);
    const afterA = await runCli(fixture.root, ["delivery-set", "status", setdir]);
    assert.deepEqual(afterA.ready_contracts, ["payment"]);
    assert.deepEqual(afterA.contract_gate_passed, ["account"]);

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    await runCli(fixture.root, ["long-task", "compile", bDir]);
    const childB = await runCli(fixture.root, [
      "long-task", "final-gate", bDir,
    ], { skipCandidateCommit: true });
    assert.equal(childB.workflow_status, "contract_gate_passed");

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: false })}\n`,
    );
    await commitCandidate(fixture.root);
    const failed = await runCliFailure(fixture.root, [
      "delivery-set", "final-gate", setdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(failed.child_check_results.payment.some((item) => item.status === "failed"));

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(fixture.root, [
      "delivery-set", "final-gate", setdir,
    ]);
    assert.equal(accepted.workflow_status, "delivery_set_accepted");
    assert.equal(accepted.child_check_results.account[0].status, "passed");
    assert.equal(accepted.child_check_results.payment[0].status, "passed");
    const allowed = await runCli(fixture.root, [
      "delivery-set", "stop-check", setdir,
    ]);
    assert.equal(allowed.continue, true);
    await runCli(fixture.root, ["delivery-set", "close", setdir]);
    await runCli(fixture.root, ["delivery-set", "close", setdir]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Delivery Set compiler rejects dependency cycles and unsupported multi-repository delivery", async () => {
  const fixture = await createDeliveryFixture();
  const setdir = path.join(fixture.root, ".delivery-set");
  try {
    await mkdir(setdir, { recursive: true });
    const definition = deliverySetDefinition();
    definition.contracts[0].depends_on = ["payment"];
    await writeFile(path.join(setdir, "delivery-set.yaml"), YAML.stringify(definition));
    await runCli(fixture.root, ["enable", "long-task"]);
    await assert.rejects(
      () => runCli(fixture.root, ["delivery-set", "compile", setdir]),
      /dependency_cycle/,
    );
    definition.contracts[0].depends_on = [];
    definition.multi_repository_change = true;
    await writeFile(path.join(setdir, "delivery-set.yaml"), YAML.stringify(definition));
    await assert.rejects(
      () => runCli(fixture.root, ["delivery-set", "compile", setdir]),
      /multi_repository_delivery_not_supported_v1/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function childContract(id, outcomeKey, claimKey, carrierPath) {
  const contract = deliveryContract();
  contract.task.id = id;
  contract.task.title = id;
  contract.source_claims[0].key = claimKey;
  contract.source_claims[0].statement = `${id} remains directly covered.`;
  contract.source_claims[0].disposition.refs = [outcomeKey];
  const outcome = contract.outcomes[0];
  outcome.key = outcomeKey;
  outcome.title = outcomeKey;
  outcome.depends_on = [];
  outcome.product.observable_result = `${id} is independently observable`;
  outcome.acceptance.validates = [`${outcomeKey} is true`];
  outcome.acceptance.checks[0].key = `${outcomeKey}-check`;
  outcome.acceptance.checks[0].runner.argv = [outcomeKey];
  outcome.technical.bindings[0].carrier_paths = [carrierPath];
  return contract;
}

function deliverySetDefinition() {
  const integration = deliveryContract().outcomes[0].acceptance.checks[0];
  integration.key = "integrated-delivery";
  integration.runner.target = "tests/set-oracle.mjs";
  integration.runner.argv = [];
  integration.verification_sources = ["tests/set-oracle.mjs"];
  integration.positive_assertions = [
    { observation: "result", operator: "equals", expected: true },
  ];
  return {
    schema_version: "long-task-delivery-set-v1",
    multi_repository_change: false,
    set: {
      id: "account-payment",
      title: "Account and payment",
      goal: "Deliver account and payment together.",
      source_paths: ["source.md"],
      context_refs: ["project_context/areas/main.md"],
      context_snapshot_mode: "referenced",
      risk_floor: "standard",
    },
    source_claims: [
      {
        key: "account-claim",
        source_ref: "source.md#account",
        statement: "Account is delivered.",
        disposition: { type: "contract", refs: ["account"] },
      },
      {
        key: "payment-claim",
        source_ref: "source.md#payment",
        statement: "Payment is delivered.",
        disposition: { type: "contract", refs: ["payment"] },
      },
    ],
    global: {
      product: { non_goals: [], owner_boundaries: ["fixture"] },
      technical: { constraints: [], forbidden_paths: ["secrets/**"], forbidden_shortcuts: [] },
      acceptance: { integration_checks: [integration], external_confirmations: [] },
    },
    contracts: [
      {
        key: "account",
        workdir: ".delivery-set/contracts/account",
        depends_on: [],
        source_claim_refs: ["account-claim"],
        boundary: {
          observable_result: "Account behavior is independently observable.",
          separation_reason: "independent_product_capability",
          evidence: "It has its own machine check and release boundary.",
        },
      },
      {
        key: "payment",
        workdir: ".delivery-set/contracts/payment",
        depends_on: ["account"],
        source_claim_refs: ["payment-claim"],
        boundary: {
          observable_result: "Payment behavior is independently observable.",
          separation_reason: "different_risk_or_approval_boundary",
          evidence: "Payment has an independent approval and rollback boundary.",
        },
      },
    ],
  };
}
