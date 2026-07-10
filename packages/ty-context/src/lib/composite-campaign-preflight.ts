import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import {
  renderCompositeCampaignPacket,
  type CompositeCampaignRenderedBundleV1
} from "./composite-campaign-renderer.js";
import {
  isCompositeSourceCompileError,
  type CompositeCompileDiagnostic
} from "./superpowers-task-compile-diagnostics.js";
import {
  compileCompositeSourceBundle,
  type CompositeCompiledSourceBundle,
  type CompositeSourceBundle
} from "./superpowers-task-compile-core.js";

export const COMPOSITE_CAMPAIGN_PREFLIGHT_REPORT_VERSION = "composite-campaign-preflight-report-v1" as const;

export interface CompositeCampaignPreflightReportV1 {
  schema_version: typeof COMPOSITE_CAMPAIGN_PREFLIGHT_REPORT_VERSION;
  contract_version: string;
  contract_sha256: string;
  ok: boolean;
  diagnostics: CompositeCompileDiagnostic[];
  error_message: string;
  rendered_bundle?: CompositeCampaignRenderedBundleV1;
  compiled_bundle?: CompositeCompiledSourceBundle;
}

export function preflightCompositeCampaignPacket(value: unknown): CompositeCampaignPreflightReportV1 {
  let rendered: CompositeCampaignRenderedBundleV1;
  try {
    rendered = renderCompositeCampaignPacket(value);
  } catch (error) {
    return report({
      ok: false,
      diagnostics: [authoringDiagnostic(message(error))],
      error_message: `Composite campaign packet preflight failed: ${message(error)}`
    });
  }
  try {
    const compiled = compileCompositeSourceBundle(sourceBundle(rendered));
    return report({ ok: true, diagnostics: [], error_message: "", rendered_bundle: rendered, compiled_bundle: compiled });
  } catch (error) {
    if (!isCompositeSourceCompileError(error)) throw error;
    return report({ ok: false, diagnostics: error.diagnostics, error_message: error.message });
  }
}

function sourceBundle(rendered: CompositeCampaignRenderedBundleV1): CompositeSourceBundle {
  return {
    product_architecture_source: source(rendered.documents.product_architecture_source),
    technical_realization_plan: source(rendered.documents.technical_realization_plan),
    acceptance_checklist: source(rendered.documents.acceptance_checklist)
  };
}

function source(document: { file: string; content: string }): { path: string; content: string } {
  return { path: document.file, content: document.content };
}

function authoringDiagnostic(value: string): CompositeCompileDiagnostic {
  return {
    category: "blocking_unparseable_object",
    file: "authoring-packet.json",
    line: 1,
    field: "packet",
    why: "the structured authoring packet cannot be rendered as canonical three-input Markdown",
    fix: "repair the packet field reported by error_message and rerun preflight",
    message: value
  };
}

function report(value: Omit<CompositeCampaignPreflightReportV1, "schema_version" | "contract_version" | "contract_sha256">): CompositeCampaignPreflightReportV1 {
  return {
    schema_version: COMPOSITE_CAMPAIGN_PREFLIGHT_REPORT_VERSION,
    contract_version: COMPOSITE_INPUT_CONTRACT.schema_version,
    contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
    ...value
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "unknown authoring packet error";
}
