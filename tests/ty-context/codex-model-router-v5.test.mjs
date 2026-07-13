import test from "node:test";
import assert from "node:assert/strict";
import { buildModelCatalog } from "../../packages/ty-context/dist/lib/codex-model-catalog.js";
import { EFFORT_ORDER, effortRank, routeCodexModel } from "../../packages/ty-context/dist/lib/codex-model-router.js";

test("Campaign V5 model routing changes only proven Sol xhigh/max profiles",()=>{
  assert.deepEqual(EFFORT_ORDER,["none","low","medium","high","xhigh","max"]);assert.deepEqual(EFFORT_ORDER.map(effortRank),[0,1,2,3,4,5]);
  const catalog=buildModelCatalog([model("gpt-5.6-sol",["low","medium","high","xhigh","max"]),model("gpt-5.6-terra",["medium","xhigh"]),model("gpt-5.6-luna",["medium","max"])]);
  assert.deepEqual(routeCodexModel({model:"gpt-5.6-sol",effort:"xhigh"},catalog).execution_profile,{model:"gpt-5.6-sol",effort:"medium"});
  assert.equal(routeCodexModel({model:"gpt-5.6-sol",effort:"max"},catalog).reason,"sol_max_to_medium");
  for(const profile of [{model:"gpt-5.6-sol",effort:"high"},{model:"gpt-5.6-terra",effort:"xhigh"},{model:"gpt-5.6-luna",effort:"max"}])assert.deepEqual(routeCodexModel(profile,catalog).execution_profile,profile);
  assert.equal(routeCodexModel({model:"unknown-model",effort:"xhigh"},catalog).reason,"unknown_profile_passthrough");
});

test("alias, target availability, and explicit catalog successor are evidence bounded",()=>{
  const successor=buildModelCatalog([model("gpt-5.6-sol",["medium","xhigh"],"gpt-6-orion"),model("gpt-6-orion",["xhigh"])]);
  assert.equal(routeCodexModel({model:"gpt-5.6",effort:"xhigh"},successor).reason,"sol_xhigh_to_medium");
  assert.equal(routeCodexModel({model:"gpt-6-orion",effort:"xhigh"},successor).reason,"catalog_upgrade_to_sol_medium");
  const unavailable=buildModelCatalog([model("gpt-5.6-sol",["high","xhigh"])]);
  const decision=routeCodexModel({model:"gpt-5.6-sol",effort:"xhigh"},unavailable);
  assert.equal(decision.reason,"target_unavailable_passthrough");assert.equal(decision.switched,false);
});

function model(name,efforts,upgrade=null){return{id:name,model:name,upgrade,upgradeInfo:upgrade?{model:upgrade}:null,hidden:false,supportedReasoningEfforts:efforts.map(reasoningEffort=>({reasoningEffort})),defaultReasoningEffort:"medium"};}
