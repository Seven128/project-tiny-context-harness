import { writeFile } from "node:fs/promises";
import path from "node:path";
import { addSecondRequirementBranch } from "./long-task-v3-fixtures.mjs";
import { createBlackBoxRuntime } from "./black-box-v3-runtime.mjs";

const mutators = {
  empty_product_requirements(data){data.product.requirements=[];},
  duplicate_plan_item(data){data.plan.plan_items.push(structuredClone(data.plan.plan_items[0]));},
  plan_item_without_obligation(data){data.plan.plan_items[0].obligations=[];},
  obligation_without_binding(data){data.plan.plan_items[0].obligations[0].implementation_bindings=[];},
  empty_validates(data){data.checklist.acceptance_criteria[0].validates=[];},
  empty_does_not_validate(data){data.checklist.acceptance_criteria[0].does_not_validate=[];},
  unrelated_negative_assertion(data){addSecondRequirementBranch(data);const value=data.checklist.verification_specs[0].negative_assertions[0];value.source_boundary_ids=["PB-002"];value.source_non_completing_ids=["NCO-002"];value.source_forbidden_shortcut_ids=["FS-002"];},
  unrelated_browser_route(data){const surface=data.product.owner_surfaces[0];surface.kind="web";surface.location="/message-center";surface.primary_action="run-self-test";surface.expected_feedback="verified-result-visible";const binding=data.plan.plan_items[0].obligations[0].implementation_bindings[1];binding.kind="route";binding.target="/unrelated";data.checklist.proof_requirements[0].proof_surface="ui_browser";const spec=data.checklist.verification_specs[0];spec.proof_capabilities=["ui_browser"];spec.command_steps[0].tool="playwright_test";spec.positive_assertions[0].observation_kind="browser_interaction";},
  proof_surface_without_capability(data){data.checklist.verification_specs[0].proof_capabilities=[];},
  binding_without_observer(data){delete data.plan.plan_items[0].obligations[0].implementation_bindings[1].verification.observation_id;},
  v2_product_source_rejected(data){data.product.schema_version="product-source-v2";},
  v2_technical_plan_rejected(data){data.plan.schema_version="technical-plan-v2";},
  v2_acceptance_rejected(data){data.checklist.schema_version="acceptance-checklist-v2";}
};

export const compileCaseHandlers = new Map(Object.keys(mutators).map((id)=>[id,async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{mutate:mutators[id]});
  return rejected(row,await runtime.cli("compile"));
}]));

compileCaseHandlers.set("oracle_dynamic_import_escape",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await writeFile(path.join(value.repository,"tests","acceptance","oracle.mjs"),`const target="./oracle-helper.mjs";export async function observe(){const module=await import(target);return module.value;}\n`);await writeFile(path.join(value.repository,"tests","acceptance","oracle-helper.mjs"),`export const value={schema_version:"ty-context-observation-v2",observations:{}};\n`);await value.commit();}});
  return rejected(row,await runtime.cli("compile"));
});

compileCaseHandlers.set("oracle_unfrozen_npm_dependency",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await writeFile(path.join(value.repository,"tests","acceptance","oracle.mjs"),`import value from "black-box-package-that-is-not-installed";export async function observe(){return value;}\n`);await value.commit();}});
  return rejected(row,await runtime.cli("compile"));
});

compileCaseHandlers.set("oracle_child_process_unpinned_command",async(row,t)=>{
  const runtime=await createBlackBoxRuntime(row,t,{prepare:async(value)=>{await writeFile(path.join(value.repository,"tests","acceptance","oracle.mjs"),`import {execFileSync} from "node:child_process";export async function observe(){execFileSync(process.execPath,["--version"]);return {schema_version:"ty-context-observation-v2",observations:{}};}\n`);await value.commit();}});
  return rejected(row,await runtime.cli("compile"));
});

function rejected(row,result){const text=`${result.stdout}\n${result.stderr}`;return {status:result.status===0?"accepted":"compile_rejected",code:text.includes(row.expected_code)?row.expected_code:firstCode(text),command_status:result.status,raw:text};}
function firstCode(text){return text.match(/\b[a-z][a-z0-9_]{2,}\b/u)?.[0]??"unknown_error";}
