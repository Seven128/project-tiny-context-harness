export interface HarnessConfig {
  core: {
    package: string;
    schema_version: string;
  };
  profiles: {
    enabled: HarnessProfile[];
  };
  modularity?: HarnessModularityConfig;
  managed_files: ManagedFile[];
  never_overwrite: string[];
}

export type HarnessProfile =
  "core-portable" | "workflow-default" | "composite-codex";

export interface HarnessModularityConfig {
  limit?: number;
  policy?: "scoped_waivers" | "strict_except_generated";
  waivers?: ModularityWaiverConfig[];
}

export interface ModularityWaiverConfig {
  path?: string;
  category?: string;
  owner?: string;
  introduced_at?: string;
  reason?: string;
  tracking_issue?: string;
  expiry_condition?: string;
}

export interface ManagedFile {
  path: string;
  strategy:
    | "merge-block"
    | "generated"
    | "generated-compat"
    | "managed"
    | "merge-with-local"
    | "create-if-missing";
}

export interface SourceMapping {
  source: string;
  target: string;
  exclude?: string[];
  mode:
    | "extract-managed-block"
    | "copy-tree"
    | "copy-file"
    | "extract-harness-targets";
}

export interface SourceMappingsFile {
  source_mappings: SourceMapping[];
}
