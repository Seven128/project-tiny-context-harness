import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { evaluateContractBoundary } from "../../packages/ty-context/dist/lib/long-task-boundary-check.js";
import { parseDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

test("outcome_files physical compatibility normalizes fragment order under one authority", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const contract = structuredClone(fixture.contract);
    const [first, second] = contract.outcomes;
    delete contract.outcomes;
    contract.outcome_files = ["outcomes/second.yaml", "outcomes/first.yaml"];
    await mkdir(path.join(fixture.workdir, "outcomes"), { recursive: true });
    await writeFile(
      path.join(fixture.workdir, "outcomes/first.yaml"),
      YAML.stringify({ schema_version: "long-task-outcomes-v2", outcomes: [first] }),
    );
    await writeFile(
      path.join(fixture.workdir, "outcomes/second.yaml"),
      YAML.stringify({ schema_version: "long-task-outcomes-v2", outcomes: [second] }),
    );
    await writeFile(
      path.join(fixture.workdir, "delivery-contract.yaml"),
      YAML.stringify(contract, { lineWidth: 0 }),
    );

    const parsed = await parseDeliveryContract(fixture.workdir);
    assert.deepEqual(parsed.outcomes.map((item) => item.key), ["first", "second"]);
    await runCli(fixture.root, ["enable", "long-task"]);
    const firstCompile = await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
    ]);
    contract.outcome_files.reverse();
    await writeFile(
      path.join(fixture.workdir, "delivery-contract.yaml"),
      YAML.stringify(contract, { lineWidth: 0 }),
    );
    const secondCompile = await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
    ]);
    assert.equal(secondCompile.compiled_identity, firstCompile.compiled_identity);

    second.title = "changed fragment authority";
    await writeFile(
      path.join(fixture.workdir, "outcomes/second.yaml"),
      YAML.stringify({ schema_version: "long-task-outcomes-v2", outcomes: [second] }),
    );
    const status = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.ok(status.findings.some((item) => item.code.includes("contract_changed")));
    assert.equal(status.final_result, "no_final_gate");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("outcome_files compatibility rejects duplicate Outcomes and fragment-owned root authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const contract = deliveryContract();
    const outcome = contract.outcomes[0];
    delete contract.outcomes;
    contract.outcome_files = ["outcomes/a.yaml", "outcomes/b.yaml"];
    await mkdir(path.join(fixture.workdir, "outcomes"), { recursive: true });
    for (const name of ["a", "b"])
      await writeFile(
        path.join(fixture.workdir, `outcomes/${name}.yaml`),
        YAML.stringify({ outcomes: [outcome] }),
      );
    await writeFile(
      path.join(fixture.workdir, "delivery-contract.yaml"),
      YAML.stringify(contract, { lineWidth: 0 }),
    );
    await assert.rejects(() => parseDeliveryContract(fixture.workdir), /outcome_key_duplicate/);
    await writeFile(
      path.join(fixture.workdir, "outcomes/b.yaml"),
      YAML.stringify({ task: { id: "forbidden" }, outcomes: [outcome] }),
    );
    await assert.rejects(
      () => parseDeliveryContract(fixture.workdir),
      /fragment cannot mix root or Outcome keys|unknown key/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Boundary Check keeps one Contract regardless of capacity or split preference", () => {
  const candidate = {
    observable_result: "independently observable",
    executable_acceptance: true,
    separation_reason: "independent_product_capability",
    preserves_atomic_loop: true,
  };
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: false,
      capacity_requires_fragments: true,
      capacity_available: true,
      split_motivations: ["token_count", "parallelism"],
      candidates: [candidate],
    }),
    "single_contract",
  );
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: false,
      capacity_requires_fragments: false,
      capacity_available: true,
      split_motivations: ["product_boundaries"],
      candidates: [candidate, { ...candidate, separation_reason: "different_risk_or_approval_boundary" }],
    }),
    "single_contract",
  );
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: true,
      capacity_requires_fragments: false,
      capacity_available: true,
      split_motivations: ["product_boundaries"],
      candidates: [candidate],
    }),
    "single_contract",
  );
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: false,
      capacity_requires_fragments: false,
      capacity_available: true,
      split_motivations: ["product_boundaries"],
      candidates: [{ ...candidate, observable_result: "" }],
    }),
    "decision_required",
  );
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: false,
      capacity_requires_fragments: true,
      capacity_available: false,
      split_motivations: [],
      candidates: [candidate],
    }),
    "single_contract",
  );
  assert.equal(
    evaluateContractBoundary({
      atomic_user_loop: false,
      capacity_requires_fragments: false,
      capacity_available: true,
      split_motivations: [],
      candidates: [],
    }),
    "decision_required",
  );
});
