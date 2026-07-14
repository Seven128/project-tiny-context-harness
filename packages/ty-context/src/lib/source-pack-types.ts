export type SourcePackMode =
  "code-index" | "source-pack" | "code-bundles" | "task-context";

export interface SourcePackOptions {
  mode: SourcePackMode;
  check?: boolean;
  now?: Date;
  command?: string;
  profile?: string;
  includeContext?: string[];
  includeCode?: string[];
  bundleStrategy?: "auto" | "area" | "topdir" | "config";
  maxPackFiles?: number;
  maxBundleCharacters?: number;
  redactionStrict?: boolean;
  prune?: number;
  taskName?: string;
}

export interface SourcePackArtifactReport {
  kind: string;
  name: string;
  path: string;
  sha256: string;
  characters: number;
  source_count: number;
  source_line_count: number;
  warning_count: number;
}

export interface SourcePackReport {
  mode: SourcePackMode;
  outputDirectory: string;
  outputRelativePath: string;
  artifacts: SourcePackArtifactReport[];
  sourceFiles: string[];
  sourceCodeCount: number;
  totalLines: number;
  totalCharacters: number;
  redactionCount: number;
  warnings: string[];
  omitted: SourcePackOmitted;
  recommendedUploadSets: Record<string, string[]>;
  wrote: boolean;
}

export interface SourcePackOmitted {
  source_file_count: number;
  reason_counts: Record<string, number>;
}

export interface SourcePackRecord {
  relative: string;
  language: string;
  lines: number;
  characters: number;
  sha256: string;
  summary: string;
  content: string;
  tags: string[];
  routes: string[];
  score: number;
  bucket: string;
  bundle: "core" | "extended" | "task" | "task-support" | "omitted";
}

export interface SourcePackProfile {
  context: string[];
  code: string[];
  exclude: string[];
  verification: string[];
  maxBundleCharacters?: number;
}

export interface ContextArtifact {
  relative: string;
  content: string;
  lines: number;
  characters: number;
}

export interface ContextAreaMapping {
  id: string;
  root: string;
  context: string;
}
