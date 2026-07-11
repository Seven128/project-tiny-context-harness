import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseLongTaskSources } from "../../packages/ty-context/dist/lib/long-task-contract-parser.js";
import { validateLongTaskCoverage } from "../../packages/ty-context/dist/lib/long-task-contract-coverage.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

async function diagnostic(id, mutate) { const root = await mkdtemp(path.join(os.tmpdir(), `ltw-coverage-${id}-`)); const workdir = await writeHappyV3Contract(root, mutate); try { const result = validateLongTaskCoverage(await parseLongTaskSources(workdir)); assert.equal(result.passed, false); assert.ok(result.errors.some((value) => value.startsWith(id)), result.errors.join("\n")); } catch (error) { assert.match(String(error),new RegExp(id)); } }

test("ac_without_obligation", () => diagnostic("ac_without_obligation", (d) => { d.checklist.acceptance_criteria[0].obligation_refs = []; }));
test("boundary_without_executable_negative_assertion", () => diagnostic("boundary_without_executable_negative_assertion", (d) => { d.checklist.verification_specs[0].negative_assertions[0].source_boundary_ids = []; }));
test("forbidden_shortcut_without_executable_negative_assertion", () => diagnostic("forbidden_shortcut_without_executable_negative_assertion", (d) => { d.checklist.verification_specs[0].negative_assertions[0].source_forbidden_shortcut_ids = []; }));
test("summary_only_ac", () => diagnostic("ac_without_verifier", (d) => { const ac=d.checklist.acceptance_criteria[0]; ac.title="Final summary"; ac.verification_spec_ids=[]; }));
test("unsafe relative path", () => diagnostic("unsafe_path", (d) => { d.checklist.verification_specs[0].oracle.entrypoint="../escape.mjs"; }));
test("unsafe absolute path", () => diagnostic("unsafe_path", (d) => { d.checklist.verification_specs[0].oracle.entrypoint="C:/escape.mjs"; }));
test("case-colliding paths", () => diagnostic("unsafe_path", (d) => { d.checklist.verification_specs[0].input_paths=["src/A.ts","src/a.ts"]; }));
test("duplicate observation cannot prove two assertions", () => diagnostic("duplicate_observation", (d) => { d.checklist.verification_specs[0].negative_assertions[0].observation_id="works"; }));
test("full population enumerator must be an asserted product surface", () => diagnostic("population_contract_incomplete", (d) => { d.product.full_population_required=true;d.product.requirements[0].population_policy="full_population";d.checklist.verification_specs[0].population_enumerator={observation_id:"population",exclusion_rule_ids:[],required_coverage_percent:100}; }));
