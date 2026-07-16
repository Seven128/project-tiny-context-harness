export interface WorkspaceFileV2 {
  path: string;
  mode: number;
  size: number;
  sha256: string;
}

export interface WorkspaceFingerprintV2 {
  head: string;
  head_tree: string;
  index_tree: string;
  staged_diff_sha256: string;
  unstaged_diff_sha256: string;
  untracked_sha256: string;
  status_sha256: string;
  identity: string;
}

export interface WorkspaceManifestV2 {
  repository_root: string;
  git_head: string;
  files: WorkspaceFileV2[];
  fingerprint: WorkspaceFingerprintV2;
  snapshot_sha256: string;
}
