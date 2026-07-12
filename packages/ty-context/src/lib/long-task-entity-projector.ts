import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { BindingResultV3, CounterfactualResultV3, LongTaskEntityResultV3, VerificationRunResultV2 } from "./long-task-run-result.js";
import { createLongTaskProjectionStateV3, projectLongTaskAcceptanceCriteriaV3, projectLongTaskObligationsV3, projectLongTaskPlanItemsV3, projectLongTaskProofsV3, projectLongTaskRequirementsV3 } from "./long-task-result-projector.js";

export interface LongTaskEntityProjectionV3 {
  binding_results:Record<string,BindingResultV3>;
  counterfactual_results:Record<string,CounterfactualResultV3>;
  proof_requirement_results:Record<string,LongTaskEntityResultV3>;
  acceptance_criterion_results:Record<string,LongTaskEntityResultV3>;
  obligation_results:Record<string,LongTaskEntityResultV3>;
  plan_item_results:Record<string,LongTaskEntityResultV3>;
  requirement_results:Record<string,LongTaskEntityResultV3>;
}

export function projectLongTaskEntities(contract:CompiledContractV3,run:VerificationRunResultV2,bindingInput:Record<string,BindingResultV3>,counterInput:Record<string,CounterfactualResultV3>,globalIntegrityCodes:string[]=[]):LongTaskEntityProjectionV3{
  const state=createLongTaskProjectionStateV3(contract,run,bindingInput,counterInput,globalIntegrityCodes);projectLongTaskProofsV3(state);projectLongTaskAcceptanceCriteriaV3(state);projectLongTaskObligationsV3(state);projectLongTaskPlanItemsV3(state);projectLongTaskRequirementsV3(state);return {binding_results:state.binding_results,counterfactual_results:state.counterfactual_results,proof_requirement_results:state.proof_requirement_results,acceptance_criterion_results:state.acceptance_criterion_results,obligation_results:state.obligation_results,plan_item_results:state.plan_item_results,requirement_results:state.requirement_results};
}
