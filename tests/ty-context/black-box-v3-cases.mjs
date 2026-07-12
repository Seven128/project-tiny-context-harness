import { compileCaseHandlers } from "./black-box-v3-case-compile.mjs";
import { observationCaseHandlers } from "./black-box-v3-case-observation.mjs";
import { authorityCaseHandlers } from "./black-box-v3-case-authority.mjs";
import { blockerCaseHandlers } from "./black-box-v3-case-blocker.mjs";
import { finalHookCaseHandlers } from "./black-box-v3-case-final-hook.mjs";

export const blackBoxV3CaseHandlers = new Map();
for (const group of [compileCaseHandlers, observationCaseHandlers, authorityCaseHandlers, blockerCaseHandlers, finalHookCaseHandlers]) for (const [id, handler] of group) {
  if (blackBoxV3CaseHandlers.has(id)) throw new Error(`duplicate_black_box_registration:${id}`);
  blackBoxV3CaseHandlers.set(id, handler);
}
export const registeredBlackBoxV3CaseIds = [...blackBoxV3CaseHandlers.keys()].sort();
