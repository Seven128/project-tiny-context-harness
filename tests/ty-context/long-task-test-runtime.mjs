import { runLongTaskFinalGate as directFinal } from "../../packages/ty-context/dist/lib/long-task-final-gate.js";
import { stopCheckLongTask as directStop } from "../../packages/ty-context/dist/lib/long-task-stop-check.js";
import { verifyLongTask as directVerify } from "../../packages/ty-context/dist/lib/long-task-verifier.js";

function sandbox() { const helper = process.env.TY_CONTEXT_HOST_HELPER_BIN; if (!helper) throw new Error("TY_CONTEXT_HOST_HELPER_BIN is required for real Host sandbox tests"); const launcher=process.env.TY_CONTEXT_HOST_SANDBOX_LAUNCHER_BIN;const launcherHash=process.env.TY_CONTEXT_HOST_SANDBOX_LAUNCHER_SHA256;if((launcher&&!launcherHash)||(!launcher&&launcherHash))throw new Error("managed test sandbox launcher identity is incomplete");return { helper_path: helper,...(launcher?{sandbox_launcher_path:launcher,sandbox_launcher_sha256:launcherHash}:{}) }; }
export function verifyLongTask(workdir, specIds, options = {}) { return directVerify(workdir, specIds, { ...options, oracle_sandbox: sandbox() }); }
export function runLongTaskFinalGate(workdir, options = {}) { return directFinal(workdir, { ...options, oracle_sandbox: sandbox() }); }
export function stopCheckLongTask(workdir, message, options = {}) { return directStop(workdir, message, { ...options, oracle_sandbox: sandbox() }); }
