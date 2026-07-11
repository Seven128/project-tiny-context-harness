import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeHappyContract } from "./long-task-v2-fixtures.mjs";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";

test("happy V2 contract compiles deterministically and freezes all authority planes", async () => { const root = await mkdtemp(path.join(os.tmpdir(), "ltw-contract-")); const workdir = await writeHappyContract(root); const first = await compileLongTaskContract(workdir, root); const second = await compileLongTaskContract(workdir, root); assert.equal(first.contract_sha256, second.contract_sha256); assert.deepEqual(Object.keys(first.requirement_graph), ["PR-001"]); assert.equal(first.verification_specs[0].executable_path, process.execPath); assert.match(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), /compiled-long-task-contract-v2/); });

for (const [name, mutate, diagnostic] of [
  ["product_requirement_without_pi", (d) => d.plan.plan_items[0].obligations[0].source_requirement_ids = [], "product_requirement_without_pi"],
  ["pi_obligation_without_ac", (d) => d.plan.plan_items[0].obligations[0].related_ac_ids = [], "pi_obligation_without_ac"],
  ["ac_without_verifier", (d) => d.checklist.acceptance_criteria[0].verification_specs = [], "ac_without_verifier"],
  ["non_completing_outcome_without_negative_assertion", (d) => d.checklist.acceptance_criteria[0].verification_specs[0].negative_assertions[0].source_non_completing_ids = [], "non_completing_outcome_without_negative_assertion"],
  ["owner_surface_without_ui_browser", (d) => d.product.requirements[0].owner_surfaces = ["main-page"], "owner_surface_without_ui_browser"],
  ["manual_only_ac", (d) => { const s=d.checklist.acceptance_criteria[0].verification_specs[0]; s.positive_assertions=[]; s.negative_assertions=[]; }, "manual_only_ac"],
  ["sample_only_for_full_population", (d) => { d.product.full_population_required=true; d.product.requirements[0].population_policy="full_population"; }, "sample_only_for_full_population"]
]) test(name, async () => { const root = await mkdtemp(path.join(os.tmpdir(), `ltw-${name}-`)); const workdir = await writeHappyContract(root, mutate); await assert.rejects(compileLongTaskContract(workdir, root), new RegExp(diagnostic)); });
