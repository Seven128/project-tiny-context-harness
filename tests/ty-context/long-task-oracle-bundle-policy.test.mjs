import test from "node:test";
import assert from "node:assert/strict";
import { validateOracleBundlePolicy } from "../../packages/ty-context/dist/lib/long-task-oracle-bundle-policy.js";

const root=process.cwd();
function build(imports=[],extraInputs={}){return {warnings:[],metafile:{inputs:{"ty-context-trusted-wrapper.mjs":{bytes:1,imports:[]},"tests/oracle.mjs":{bytes:1,imports},...extraInputs},outputs:{"<stdout>":{bytes:1,inputs:{}}}}};}
test("bundle policy permits only the explicit Node builtin set",()=>{assert.doesNotThrow(()=>validateOracleBundlePolicy(build([{path:"node:fs/promises",kind:"import-statement",external:true},{path:"node:crypto",kind:"import-statement",external:true}]),root));});
test("bundle policy rejects literal dynamic imports",()=>{assert.throws(()=>validateOracleBundlePolicy(build([{path:"tests/helper.mjs",kind:"dynamic-import",external:false}]),root),/oracle_dynamic_import_escape/);});
test("bundle policy rejects forbidden builtins transitively",()=>{assert.throws(()=>validateOracleBundlePolicy(build([{path:"node:worker_threads",kind:"import-statement",external:true}]),root),/oracle_forbidden_builtin/);});
test("bundle policy rejects unbundled npm and URL imports",()=>{assert.throws(()=>validateOracleBundlePolicy(build([{path:"left-pad",kind:"import-statement",external:true}]),root),/oracle_external_dependency/);assert.throws(()=>validateOracleBundlePolicy(build([{path:"https:\/\/example.invalid\/oracle.mjs",kind:"import-statement",external:true}]),root),/oracle_dynamic_import_escape/);});
test("bundle policy rejects native addons and executable WASM",()=>{assert.throws(()=>validateOracleBundlePolicy(build([], {"node_modules/pkg/addon.node":{bytes:1,imports:[]}}),root),/oracle_native_addon_forbidden/);assert.throws(()=>validateOracleBundlePolicy(build([], {"node_modules/pkg/addon.wasm":{bytes:1,imports:[]}}),root),/oracle_native_addon_forbidden/);});
