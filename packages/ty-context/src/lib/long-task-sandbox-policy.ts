import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { longTaskNodeRuntimeAdapterSourceV1 } from "./long-task-node-runtime-adapter.js";

export const LONG_TASK_SANDBOX_POLICY={schema_version:"long-task-sandbox-policy-v3",source_snapshot:"read_only",oracle_bundle:"read_only",dependency_layer:"read_only",browser_layer:"read_only",writable_roots:["artifact","command_output","temp"],deny_original_workspace_write:true,deny_host_state_write:true,deny_undeclared_paths:true,oracle_child_process:false,oracle_worker:false,oracle_addons:false,oracle_wasi:false,oracle_network:"none_or_frozen_proxy",command_steps:"separate_narrow_profile",child_symlink_main_policy:"project_binary_and_playwright_only",node_runtime_adapter_sha256:sha256Hex(longTaskNodeRuntimeAdapterSourceV1()),node_permission_required:true,os_sandbox_required:true} as const;
export const LONG_TASK_SANDBOX_POLICY_SHA256=sha256Hex(canonicalJson(LONG_TASK_SANDBOX_POLICY));
