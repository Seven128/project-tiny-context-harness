import { CAMPAIGN_SCHEMA_V4 } from "./composite-campaign-schema-v4.js";
import { CAMPAIGN_SCHEMA_V5 } from "./composite-campaign-schema-v5.js";
import { COMPOSITE_V5_SCHEMAS, COMPOSITE_V5_SCHEMA_SET_SHA256 } from "./composite-campaign-schema-registry.js";
import type { SourceUnitPacketBindingV4 } from "./composite-campaign-source-units.js";
import { LONG_TASK_SOURCE_FILES, type AcceptanceChecklistV3, type ProductSourceV3, type TechnicalPlanV3 } from "./long-task-contract-schema.js";

export const COMPOSITE_AUTHORING_PACKET_SCHEMA = "composite-authoring-packet-v3" as const;

export interface CompositeAuthoringPacketV3 {
  schema_version: typeof COMPOSITE_AUTHORING_PACKET_SCHEMA;
  campaign_id: string;
  slice_id: string;
  revision: number;
  previous_packet_sha256: string | null;
  authorities: {
    product_architecture_source: ProductSourceV3;
    technical_realization_plan: TechnicalPlanV3;
    acceptance_checklist: AcceptanceChecklistV3;
  };
  source_unit_bindings?: SourceUnitPacketBindingV4[];
}

export function compositeCampaignV4Contract(): unknown {
  return {
    schema_version: CAMPAIGN_SCHEMA_V5,
    audit_schema: CAMPAIGN_SCHEMA_V4,
    scope_schema: "scope-fit-result-v4",
    goal_manifest_schema: "slice-goal-manifest-v2",
    packet_schema: COMPOSITE_AUTHORING_PACKET_SCHEMA,
    source_coverage_schema: "composite-source-coverage-v1",
    schema_set_sha256: COMPOSITE_V5_SCHEMA_SET_SHA256,
    schemas: Object.fromEntries(Object.entries(COMPOSITE_V5_SCHEMAS).map(([name, schema]) => [name, { id: schema.$id, schema_version: name }])),
    authority_schemas: ["product-source-v3", "technical-plan-v3", "acceptance-checklist-v3"],
    projection_files: LONG_TASK_SOURCE_FILES,
    commands: ["contract", "create", "apply-coverage", "apply-scope", "apply-packet", "render", "preflight", "advance", "bind-goal", "bind-repair-goal", "record-result", "status", "run", "app-server-check", "model-routing", "threads", "interrupt"],
    advance_actions: ["author_packets", "launch_wave", "wait_goals", "repair_integration", "decision_required", "wait_external", "finished"],
    campaign_policy: {
      auto_push: "explicit_boolean_default_false",
      protected_branch_mode: "pull_request",
      preserve_primary_worktree: true,
    },
    compatibility: "none"
  };
}
