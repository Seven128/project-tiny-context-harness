import { runLongTaskFinalOrchestratorV3, type LongTaskFinalOrchestratorOptionsV3 } from "./long-task-final-orchestrator.js";
import type { FinalResultPayloadV3 } from "./long-task-run-result.js";

export type LongTaskFinalGateOptionsV3 = LongTaskFinalOrchestratorOptionsV3;

export async function runLongTaskFinalGate(workdir:string,options:LongTaskFinalGateOptionsV3={}):Promise<FinalResultPayloadV3>{return runLongTaskFinalOrchestratorV3(workdir,options);}
