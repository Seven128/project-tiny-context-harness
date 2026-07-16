import type { ProofSurface } from "./long-task-contract-types.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import type { WorkspaceManifestV2 } from "./long-task-workspace-runtime-types.js";

export interface AuthorityHashesV2 {
  source_authority_hash: string;
  product_authority_hash: string;
  acceptance_authority_hash: string;
  risk_authority_hash: string;
  technical_authority_hash: string;
}

export interface ProductSemanticProjectionV2 {
  task_goal: string;
  global_non_goals: Array<{ key: string; statement: string }>;
  outcomes: Array<{
    key: string;
    title: string;
    observable_result: string;
    owner: {
      label: string;
      owner_surfaces: string[];
    };
    requirements: Array<{
      key: string;
      statement: string;
      required_proof_surfaces: ProofSurface[];
    }>;
    controls: Array<{
      key: string;
      location: string;
      trigger: string;
      input: string;
      loading_state: string;
      empty_state: string;
      success_state: string;
      failure_state: string;
      feedback: string;
    }>;
    non_completing_outcomes: Array<{ key: string; statement: string }>;
  }>;
}

export interface GlobalSemanticProjectionV2 {
  constraints: Array<{ key: string; statement: string }>;
  forbidden_shortcuts: Array<{ key: string; statement: string }>;
}

export interface ContextAuthoritySnapshotV2 {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
}

export interface NextAuthorityMaterialsV2 {
  source_hashes: Record<string, string>;
  source_items: CompiledSourceItemV2[];
  context_snapshot: ContextAuthoritySnapshotV2;
  product_semantics: ProductSemanticProjectionV2;
  global_semantics: GlobalSemanticProjectionV2;
}

export interface AuthorityMaterialHashesV2 {
  source_hashes_sha256: string;
  context_snapshot_sha256: string;
  product_semantics_sha256: string;
  global_semantics_sha256: string;
}

export interface InitialTaskBaseV2 {
  git_commit: string;
  git_tree: string;
  workspace_manifest: WorkspaceManifestV2;
}

export interface VerifierContentAuthority {
  package_name: string;
  bundle_sha256: string;
  schema_sha256: string;
  hook_sha256: string;
  bundle_files: Record<string, string>;
}

export interface VerifierRuntimeLocator {
  package_version: string;
  package_root: string;
}

export interface VerifierIdentityV2
  extends VerifierContentAuthority, VerifierRuntimeLocator {
  package_name: "project-tiny-context-harness";
}
