import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAssertion } from "../../packages/ty-context/dist/lib/long-task-operator-evaluator.js";

const observation=(actual,kind="scalar")=>({kind,actual,artifact_refs:[]});
const assertion=(operator,expected,observation_kind="scalar")=>({id:"PA-UNIT",observation_id:"value",observation_kind,operator,...(expected===NO_EXPECTED?{}:{expected})});
const NO_EXPECTED=Symbol("no-expected");

for(const [name,operator,actual,expected,passed] of [
  ["equals","equals",{"a":1},{"a":1},true],
  ["not equals","not_equals","a","b",true],
  ["contains string","contains","abcdef","bcd",true],
  ["not contains array","not_contains",[1,2],3,true],
  ["matches RE2","matches","Error: BOOM",{pattern:"error: .+",flags:"i"},true],
  ["not matches RE2","not_matches","safe",{pattern:"danger",flags:""},true],
  ["greater than","greater_than",3,2,true],
  ["greater or equal","greater_or_equal",2,2,true],
  ["less than","less_than",1,2,true],
  ["less or equal","less_or_equal",2,2,true],
  ["truthy boolean","truthy",true,NO_EXPECTED,true],
  ["falsy boolean","falsy",false,NO_EXPECTED,true],
  ["set equals","set_equals",["a","b"],["b","a"],true],
  ["subset","subset_of",["a"],["a","b"],true],
  ["superset","superset_of",["a","b"],["a"],true]
])test(name,()=>assert.equal(evaluateAssertion(assertion(operator,expected),observation(actual)).passed,passed));

test("exists and not_exists operate only on observation presence",()=>{assert.equal(evaluateAssertion(assertion("exists",NO_EXPECTED),observation(null)).passed,true);assert.equal(evaluateAssertion(assertion("not_exists",NO_EXPECTED),undefined).passed,true);});
test("operators do not coerce types",()=>assert.equal(evaluateAssertion(assertion("equals",1),observation("1")).code,"assertion_type_mismatch"));
test("truthy rejects non-booleans",()=>assert.equal(evaluateAssertion(assertion("truthy",NO_EXPECTED),observation(1)).code,"assertion_type_mismatch"));
test("duplicate set members are invalid",()=>assert.equal(evaluateAssertion(assertion("set_equals",["a"]),observation(["a","a"])).code,"assertion_type_mismatch"));
test("unsafe or unsupported regex is rejected by RE2",()=>assert.equal(evaluateAssertion(assertion("matches",{pattern:"(a)\\1",flags:""}),observation("aa")).code,"unsafe_regex"));
test("typed observation kind must match the assertion",()=>assert.equal(evaluateAssertion(assertion("equals",{},"api_contract"),observation({},"runtime_behavior")).code,"assertion_type_mismatch"));
test("deep equality ignores object insertion order",()=>assert.equal(evaluateAssertion(assertion("equals",{a:1,b:{c:2}}),observation({b:{c:2},a:1})).passed,true));
