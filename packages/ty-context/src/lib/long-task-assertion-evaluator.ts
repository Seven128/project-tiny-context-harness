import { readFile } from "node:fs/promises";
import type { FrozenVerificationSpecV3 } from "./long-task-contract-schema.js";
import type { CommandRunV2, LongTaskFindingV2, VerificationSpecResultV2 } from "./long-task-run-result.js";
import { parseObservationV2 } from "./long-task-observation-v2.js";
import { evaluateAssertion } from "./long-task-operator-evaluator.js";
import { evaluatePopulation } from "./long-task-population-evaluator.js";

export async function evaluateFrozenAssertions(spec:FrozenVerificationSpecV3,command:CommandRunV2,evidencePath:string,reverifyCommand:string,artifactIds:ReadonlySet<string>):Promise<VerificationSpecResultV2>{
  const findings:LongTaskFindingV2[]=[];const assertion_results:Record<string,boolean>={};const population_results:VerificationSpecResultV2["population_results"]={};let envelope;
  try{envelope=parseObservationV2(await readFile(command.stdout_path,"utf8"),spec,artifactIds);}catch(error){const actual=message(error);findings.push(finding(actual.split(":",1)[0]||"observation_protocol_invalid",spec.id,"one strict actual-only ty-context-observation-v2 envelope",actual,evidencePath,reverifyCommand));return {spec_id:spec.id,status:"failed",assertion_results,population_results,findings};}
  for(const assertion of [...spec.positive_assertions,...spec.negative_assertions]){const evaluated=evaluateAssertion(assertion,envelope.observations[assertion.observation_id]);const passed=command.exit_code===0&&evaluated.passed;assertion_results[assertion.id]=passed;if(!passed){const item=finding(command.exit_code===0?(evaluated.code??"assertion_failed"):"assertion_failed",spec.id,evaluated.expected,command.exit_code===0?evaluated.actual:{exit_code:command.exit_code,actual:evaluated.actual},evidencePath,reverifyCommand);if(assertion.source_forbidden_shortcut_ids?.length)item.forbidden_shortcut=assertion.source_forbidden_shortcut_ids.join(",");findings.push(item);}}
  if(spec.population_enumerator){const population=evaluatePopulation(spec.population_enumerator,envelope.observations[spec.population_enumerator.observation_id]);population_results[spec.population_enumerator.observation_id]=population;for(const code of population.finding_codes)findings.push(finding(code,spec.id,"Harness-computed full-population coverage of exactly 100%",population,evidencePath,reverifyCommand));}
  return {spec_id:spec.id,status:findings.length?"failed":"passed",assertion_results,population_results,findings};
}
function finding(category:string,spec:string,expected:unknown,actual:unknown,evidence_path:string,reverify_command:string):LongTaskFindingV2{return {category,verification_spec_id:spec,expected,actual,evidence_path,next_action:`Fix ${spec} and rerun its frozen verifier`,reverify_command};}
function message(error:unknown):string{return error instanceof Error?error.message:String(error);}
