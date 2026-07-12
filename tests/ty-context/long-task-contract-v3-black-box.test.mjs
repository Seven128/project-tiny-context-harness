import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addSecondRequirementBranch, runCompositeCompile, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
const managedHost = !!process.env.TY_CONTEXT_MANAGED_HOST_READY;

async function run(name, mutate = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-v3-${name}-`));
  const task = await writeHappyV3Contract(root, mutate);
  return { root, task, result: runCompositeCompile(root, task) };
}

test("happy Contract V3 compiles through the public CLI and preserves the full graph", { skip: !managedHost }, async () => {
  const { task, result } = await run("happy");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const contract = JSON.parse(await readFile(path.join(task, "compiled-contract.json"), "utf8"));
  assert.equal(contract.schema_version, "compiled-long-task-contract-v3");
  for (const key of ["requirements", "plan_items", "obligations", "bindings", "acceptance_criteria", "proof_requirements", "verification_specs", "counterfactual_controls"]) assert.ok(Array.isArray(contract[key]) && contract[key].length > 0, key);
  assert.deepEqual(contract.plan_items[0].obligation_ids, ["PI-001-OB-001"]);
});

for (const [name, mutate, diagnostic] of [
  ["empty_product_requirements", (d) => { d.product.requirements = []; }, "empty_product_requirements"],
  ["duplicate_plan_item", (d) => { d.plan.plan_items.push(structuredClone(d.plan.plan_items[0])); }, "duplicate_plan_item"],
  ["plan_item_without_obligation", (d) => { d.plan.plan_items[0].obligations = []; }, "plan_item_without_obligation"],
  ["obligation_without_binding", (d) => { d.plan.plan_items[0].obligations[0].implementation_bindings = []; }, "obligation_without_binding"],
  ["empty_validates", (d) => { d.checklist.acceptance_criteria[0].validates = []; }, "empty_validates"],
  ["empty_does_not_validate", (d) => { d.checklist.acceptance_criteria[0].does_not_validate = []; }, "empty_does_not_validate"],
  ["unrelated_negative_assertion", (d) => { addSecondRequirementBranch(d); const n=d.checklist.verification_specs[0].negative_assertions[0]; n.source_boundary_ids=["PB-002"];n.source_non_completing_ids=["NCO-002"];n.source_forbidden_shortcut_ids=["FS-002"]; }, "unrelated_negative_assertion"],
  ["unrelated_browser_route", (d) => { const s=d.product.owner_surfaces[0];s.kind="web";s.location="/message-center";s.primary_action="run-self-test";s.expected_feedback="verified-result-visible";const b=d.plan.plan_items[0].obligations[0].implementation_bindings[1];b.kind="route";b.target="/unrelated";d.checklist.proof_requirements[0].proof_surface="ui_browser";const spec=d.checklist.verification_specs[0];spec.proof_capabilities=["ui_browser"];spec.command_steps[0].tool="playwright_test";spec.positive_assertions[0].observation_kind="browser_interaction"; }, "unrelated_browser_route"],
  ["proof_surface_without_capability", (d) => { d.checklist.verification_specs[0].proof_capabilities=[]; }, "proof_surface_without_capability"],
  ["binding_without_observer", (d) => { delete d.plan.plan_items[0].obligations[0].implementation_bindings[1].verification.observation_id; }, "binding_without_observer"]
]) {
  test(name, { skip: !managedHost }, async () => {
    const { result } = await run(name, mutate);
    assert.notEqual(result.status, 0, `${name} unexpectedly compiled`);
    assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(diagnostic));
  });
}
