import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { writeContract } from "./long-task-delivery-fixtures.mjs";

export async function addGlobalClaim(
  fixture,
  { counterfactual, constant = false },
) {
  const statement = "The global state remains valid.";
  const source = await readFile(path.join(fixture.root, "source.md"), "utf8");
  await writeFile(
    path.join(fixture.root, "source.md"),
    `${source.trimEnd()}\n\n<!-- ty-source-item:start key=global-state-source kind=technical_obligation -->\n${statement}\n<!-- ty-source-item:end -->\n`,
  );
  fixture.contract.source_claims.push({
    key: "global-state-source",
    source_ref: "source.md",
    statement,
    disposition: {
      type: "global_constraint",
      refs: ["constraint.global-state"],
    },
  });
  fixture.contract.global.technical.constraints.push({
    key: "global-state",
    statement,
  });
  const check = structuredClone(
    fixture.contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "global-state-check";
  check.runner.argv = ["first", "global"];
  check.positive_assertions = [
    {
      key: "global-state-assertion",
      criterion: statement,
      claims: ["constraint.global-state"],
      observation: constant ? "negative" : "result",
      operator: "equals",
      expected: constant ? false : true,
    },
  ];
  check.negative_assertions = [];
  fixture.contract.global.acceptance.checks.push(check);
  if (counterfactual) await addGlobalCounterfactual(fixture.contract);
  await writeContract(fixture.workdir, fixture.contract);
}

export async function addGlobalCounterfactual(contract) {
  contract.global.acceptance.counterfactual_controls.push({
    key: "remove-global-state",
    binding_ref: "first.state-first",
    claims: ["constraint.global-state"],
    check_key: "global-state-check",
    mutation: { type: "remove_paths", paths: ["src/state.json"] },
    expected_assertion_failures: ["global-state-assertion"],
  });
}

export async function assertPreflightAndCompileReject(fixture, code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `missing Preflight diagnostic ${code}: ${JSON.stringify(preflight)}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
  );
}
