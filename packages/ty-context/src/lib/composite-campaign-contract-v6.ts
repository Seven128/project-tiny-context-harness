import { COMPOSITE_AUTHORING_PACKET_SCHEMA } from "./composite-authoring-packet-v3.js";
import {
  COMPOSITE_V6_SCHEMAS,
  COMPOSITE_V6_SCHEMA_SET_SHA256,
} from "./composite-campaign-schema-registry-v6.js";
import { CAMPAIGN_SCHEMA_V6 } from "./composite-campaign-schema-v6.js";
import { LONG_TASK_SOURCE_FILES } from "./long-task-contract-schema.js";

export function compositeCampaignContractV6(): unknown {
  return {
    schema_version: CAMPAIGN_SCHEMA_V6,
    audit_schema: "composite-campaign-v5",
    execution_engine: "codex-exec-v1",
    scope_schema: "scope-fit-result-v4",
    slice_receipt_schema: "slice-execution-receipt-v3",
    change_envelope_schema: "slice-change-envelope-v1",
    wave_impact_schema: "campaign-wave-impact-v2",
    wave_integration_result_schema: "wave-integration-result-v2",
    packet_schema: COMPOSITE_AUTHORING_PACKET_SCHEMA,
    source_coverage_schema: "composite-source-coverage-v2",
    schema_set_sha256: COMPOSITE_V6_SCHEMA_SET_SHA256,
    schemas: Object.fromEntries(
      Object.entries(COMPOSITE_V6_SCHEMAS).map(([name, schema]) => [
        name,
        { id: schema.$id, schema_version: name },
      ]),
    ),
    authority_schemas: [
      "product-source-v3",
      "technical-plan-v3",
      "acceptance-checklist-v3",
    ],
    projection_files: LONG_TASK_SOURCE_FILES,
    commands: [
      "contract",
      "create",
      "apply-coverage",
      "apply-scope",
      "apply-packet",
      "render",
      "preflight",
      "status",
      "run",
      "interrupt",
      "model-routing",
      "exec-check",
      "workers",
      "cleanup",
    ],
    runner: "single-foreground-scheduler",
    worker_authority: "contract-v3-gate-receipt",
    worktree_budget: {
      integration_worktrees: 1,
      max_sfc_worktrees: 4,
      repair_worktrees: 1,
      max_total_worktrees: 6,
      sfc_mode: "detached",
      repair_mode: "detached",
    },
    v5_compatibility: "accepted_audit_only",
  };
}
