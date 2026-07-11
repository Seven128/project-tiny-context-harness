import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";

test("happy V3 contract compiles deterministically and freezes all authority planes", async () => { const root = await mkdtemp(path.join(os.tmpdir(), "ltw-contract-")); const workdir = await writeHappyV3Contract(root); const first = await compileLongTaskContract(workdir, root); const second = await compileLongTaskContract(workdir, root); assert.equal(first.contract_sha256, second.contract_sha256); assert.deepEqual(first.requirements.map((item)=>item.id), ["PR-001"]); assert.deepEqual(first.plan_items[0].obligation_ids,["PI-001-OB-001"]); assert.equal(first.verification_specs[0].executable_path, process.execPath); assert.match(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), /compiled-long-task-contract-v3/); });

for (const [name, mutate, diagnostic] of [
  ["product_requirement_without_pi", (d) => d.plan.plan_items[0].obligations[0].source_requirement_ids = [], "product_requirement_without_pi"],
  ["pi_obligation_without_ac", (d) => d.plan.plan_items[0].obligations[0].related_ac_ids = [], "obligation_without_ac"],
  ["ac_without_verifier", (d) => d.checklist.acceptance_criteria[0].verification_spec_ids = [], "ac_without_verifier"],
  ["non_completing_outcome_without_negative_assertion", (d) => d.checklist.verification_specs[0].negative_assertions[0].source_non_completing_ids = [], "non_completing_without_executable_negative_assertion"],
  ["owner_surface_without_ui_browser", (d) => { d.product.owner_surfaces[0].kind="web";d.product.owner_surfaces[0].location="/main"; }, "unrelated_browser_route"],
  ["manual_only_ac", (d) => { const s=d.checklist.verification_specs[0]; s.positive_assertions=[]; s.negative_assertions=[]; }, "manual_only_ac"],
  ["sample_only_for_full_population", (d) => { d.product.full_population_required=true; d.product.requirements[0].population_policy="full_population"; }, "population_contract_incomplete"]
]) test(name, async () => { const root = await mkdtemp(path.join(os.tmpdir(), `ltw-${name}-`)); const workdir = await writeHappyV3Contract(root, mutate); await assert.rejects(compileLongTaskContract(workdir, root), new RegExp(diagnostic)); });
