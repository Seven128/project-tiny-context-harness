export interface HarnessConfig {
  core: {
    package: string;
    schema_version: string;
  };
  modularity?: HarnessModularityConfig;
  managed_files: ManagedFile[];
  never_overwrite: string[];
}

export interface HarnessModularityConfig {
  limit?: number;
  policy?: "scoped_waivers" | "strict_except_generated";
  waivers?: ModularityWaiverConfig[];
}

export interface ModularityWaiverConfig {
  path?: string;
  category?: string;
  reason?: string;
  future_split_boundary?: string;
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
