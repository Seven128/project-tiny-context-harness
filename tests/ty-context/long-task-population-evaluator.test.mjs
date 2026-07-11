import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePopulation } from "../../packages/ty-context/dist/lib/long-task-population-evaluator.js";

const rule={observation_id:"population",exclusion_rule_ids:["EXCLUSION-001"],required_coverage_percent:100};
const observation=(enumerated_ids,validated_ids,exclusions=[])=>({kind:"population_coverage",actual:{enumerated_ids,validated_ids,exclusions},artifact_refs:[]});
const codes=(result)=>new Set(result.finding_codes);

test("Harness computes exact full population",()=>{const result=evaluatePopulation(rule,observation(["a","b"],["a","b"]));assert.equal(result.status,"passed");assert.equal(result.coverage_percent,100);});
test("valid declared exclusions are removed from effective population",()=>{const result=evaluatePopulation(rule,observation(["a","b"],["a"],[{id:"b",rule_id:"EXCLUSION-001"}]));assert.equal(result.status,"passed");assert.deepEqual(result.effective_population_ids,["a"]);});
test("empty effective population is not vacuous 100 percent",()=>{const result=evaluatePopulation(rule,observation(["a"],[],[{id:"a",rule_id:"EXCLUSION-001"}]));assert.equal(result.status,"failed");assert.ok(codes(result).has("population_empty"));});
test("duplicate IDs fail",()=>assert.ok(codes(evaluatePopulation(rule,observation(["a","a"],["a"]))).has("population_duplicate_ids")));
test("unknown validated IDs fail",()=>assert.ok(codes(evaluatePopulation(rule,observation(["a"],["b"]))).has("population_unknown_validated")));
test("unknown exclusions fail",()=>assert.ok(codes(evaluatePopulation(rule,observation(["a"],[],[{id:"b",rule_id:"EXCLUSION-001"}]))).has("population_unknown_exclusion")));
test("undeclared exclusion rule fails",()=>assert.ok(codes(evaluatePopulation(rule,observation(["a"],[],[{id:"a",rule_id:"EXCLUSION-OTHER"}]))).has("population_invalid_exclusion")));
test("missing objects fail full population",()=>{const result=evaluatePopulation(rule,observation(["a","b"],["a"]));assert.ok(codes(result).has("population_missing_objects"));assert.ok(codes(result).has("population_not_full"));});
