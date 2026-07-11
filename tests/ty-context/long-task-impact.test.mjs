import test from "node:test";
import assert from "node:assert/strict";
import { decideLongTaskImpact } from "../../packages/ty-context/dist/lib/long-task-impact.js";
const spec=(id,input_paths,global_invariant=false)=>({id,input_paths,global_invariant});
const contract={verification_specs:[spec("VS-A",["src/a/**"]),spec("VS-B",["src/b/**"]),spec("VS-GLOBAL",["security/**"],true)]};
test("mapped changes select owner plus global invariants",()=>assert.deepEqual(decideLongTaskImpact(contract,["src/a/file.ts"]).verification_spec_ids,["VS-A","VS-GLOBAL"]));
test("unmapped change conservatively selects all",()=>assert.equal(decideLongTaskImpact(contract,["unknown/file"]).mode,"all"));
test("unmapped change with no global-only match selects all",()=>{const plain={verification_specs:contract.verification_specs.map((s)=>({...s,global_invariant:false}))};assert.deepEqual(decideLongTaskImpact(plain,["unknown/file"]).verification_spec_ids,["VS-A","VS-B","VS-GLOBAL"]);});
