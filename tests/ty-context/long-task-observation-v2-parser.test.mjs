import test from "node:test";
import assert from "node:assert/strict";
import { parseObservationV2 } from "../../packages/ty-context/dist/lib/long-task-observation-v2.js";

const spec={positive_assertions:[{id:"PA-001",observation_id:"value",observation_kind:"scalar",operator:"equals",expected:"good"}],negative_assertions:[]};
const json=(observations)=>JSON.stringify({schema_version:"ty-context-observation-v2",observations});

test("strict actual-only scalar parses",()=>assert.equal(parseObservationV2(json({value:{kind:"scalar",actual:"good",artifact_refs:[]}}),spec,new Set()).observations.value.actual,"good"));
test("missing protocol document is distinct from multiple documents",()=>assert.throws(()=>parseObservationV2("",spec,new Set()),/no document was found/));
test("undeclared observations fail",()=>assert.throws(()=>parseObservationV2(json({other:{kind:"scalar",actual:1,artifact_refs:[]}}),spec,new Set()),/undeclared_observation/));
test("recursive self-signing keys fail",()=>assert.throws(()=>parseObservationV2(json({value:{kind:"scalar",actual:{result:{completed:true}},artifact_refs:[]}}),spec,new Set()),/oracle_self_signed_result/));
test("self-signed status value fails",()=>assert.throws(()=>parseObservationV2(json({value:{kind:"scalar",actual:{status:"ok"},artifact_refs:[]}}),spec,new Set()),/oracle_self_signed_result/));
test("typed observations reject unknown fields",()=>{const typed={...spec,positive_assertions:[{...spec.positive_assertions[0],observation_kind:"runtime_behavior"}]};assert.throws(()=>parseObservationV2(json({value:{kind:"runtime_behavior",actual:{binding_id:"IB-001",capability:"x.y",value:1,passed:true},artifact_refs:[]}}),typed,new Set()),/oracle_self_signed_result|observation_protocol_invalid/);});
test("artifact references must belong to the current run",()=>assert.throws(()=>parseObservationV2(json({value:{kind:"scalar",actual:"good",artifact_refs:["old-trace"]}}),spec,new Set()),/artifact_trust_violation/));
