import { COMPOSITE_INPUT_CONTRACT, compositeInputDocument } from "./composite-input-contract.js";
import {
  loadCompositeSourceFiles,
  type CompositeSourcePathMap,
  type CompositeSourceTextReader
} from "./composite-source-preflight-files.js";
import {
  isCompositeSourceCompileError,
  type CompositeCompileDiagnostic
} from "./superpowers-task-compile-diagnostics.js";
import {
  compileCompositeSourceBundle,
  type CompositeCompiledSourceBundle,
  type CompositeSourceBundle
} from "./superpowers-task-compile-core.js";

export const COMPOSITE_PREFLIGHT_REPORT_VERSION = "composite-preflight-report-v1" as const;

export interface CompositePreflightReport {
  schema_version: typeof COMPOSITE_PREFLIGHT_REPORT_VERSION;
  contract_version: string;
  contract_sha256: string;
  ok: boolean;
  diagnostics: CompositeCompileDiagnostic[];
  error_message: string;
  compiled_bundle?: CompositeCompiledSourceBundle;
}

export type CompositeSourcePaths = CompositeSourcePathMap;

export function preflightCompositeSourceBundle(bundle: CompositeSourceBundle): CompositePreflightReport {
  try {
    return report({ ok: true, diagnostics: [], error_message: "", compiled_bundle: compileCompositeSourceBundle(bundle) });
  } catch (error) {
    if (!isCompositeSourceCompileError(error)) {
      throw error;
    }
    return report({ ok: false, diagnostics: error.diagnostics, error_message: error.message });
  }
}

export async function preflightCompositeSourceFiles(
  root: string,
  sourcePaths: Partial<CompositeSourcePaths> = {}
): Promise<CompositePreflightReport> {
  return preflightCompositeSourceFilesInternal(root, sourcePaths);
}

/** @internal Narrow read seam used to exercise deterministic post-stat read failures. */
export async function preflightCompositeSourceFilesInternal(
  root: string,
  sourcePaths: Partial<CompositeSourcePaths> = {},
  readSourceText?: CompositeSourceTextReader
): Promise<CompositePreflightReport> {
  const paths: CompositeSourcePaths = {
    product_architecture_source: sourcePaths.product_architecture_source ?? compositeInputDocument("product_architecture_source").file,
    technical_realization_plan: sourcePaths.technical_realization_plan ?? compositeInputDocument("technical_realization_plan").file,
    acceptance_checklist: sourcePaths.acceptance_checklist ?? compositeInputDocument("acceptance_checklist").file
  };
  try {
    const bundle = await loadCompositeSourceFiles(root, paths, readSourceText);
    return preflightCompositeSourceBundle(bundle);
  } catch (error) {
    if (!isCompositeSourceCompileError(error)) {
      throw error;
    }
    return report({ ok: false, diagnostics: error.diagnostics, error_message: error.message });
  }
}

function report(
  value: Pick<CompositePreflightReport, "ok" | "diagnostics" | "error_message" | "compiled_bundle">
): CompositePreflightReport {
  return {
    schema_version: COMPOSITE_PREFLIGHT_REPORT_VERSION,
    contract_version: COMPOSITE_INPUT_CONTRACT.schema_version,
    contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
    ...value
  };
}
