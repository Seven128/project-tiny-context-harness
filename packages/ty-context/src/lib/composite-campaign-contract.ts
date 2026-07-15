import { COMPOSITE_AUTHORING_PACKET_SCHEMA } from "./composite-authoring-packet-v3.js";
import { CAMPAIGN_SCHEMA_V4 } from "./composite-campaign-schema-v4.js";
import { CAMPAIGN_SCHEMA_V5 } from "./composite-campaign-schema-v5.js";
import {
  COMPOSITE_V5_SCHEMAS,
  COMPOSITE_V5_SCHEMA_SET_SHA256,
} from "./composite-campaign-schema-registry.js";
import { LONG_TASK_SOURCE_FILES } from "./long-task-contract-schema.js";

export {
  COMPOSITE_AUTHORING_PACKET_SCHEMA,
  type CompositeAuthoringPacketV3,
} from "./composite-authoring-packet-v3.js";

export function compositeCampaignContractV5(): unknown {
  return {
    schema_version: CAMPAIGN_SCHEMA_V5,
    audit_schema: CAMPAIGN_SCHEMA_V4,
    scope_schema: "scope-fit-result-v4",
    goal_manifest_schema: "slice-goal-manifest-v3",
    slice_receipt_schema: "slice-execution-receipt-v2",
    change_envelope_schema: "slice-change-envelope-v1",
    wave_impact_schema: "campaign-wave-impact-v2",
    wave_integration_result_schema: "wave-integration-result-v2",
    packet_schema: COMPOSITE_AUTHORING_PACKET_SCHEMA,
    source_coverage_schema: "composite-source-coverage-v2",
    schema_set_sha256: COMPOSITE_V5_SCHEMA_SET_SHA256,
    schemas: Object.fromEntries(
      Object.entries(COMPOSITE_V5_SCHEMAS).map(([name, schema]) => [
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
      "advance",
      "bind-goal",
      "bind-repair-goal",
      "record-result",
      "status",
      "run",
      "app-server-check",
      "model-routing",
      "threads",
      "interrupt",
    ],
    advance_actions: [
      "author_packets",
      "launch_wave",
      "wait_goals",
      "repair_integration",
      "decision_required",
      "wait_external",
      "finished",
    ],
    campaign_policy: {
      auto_push: true,
      protected_branch_mode: "pull_request",
      preserve_primary_worktree: true,
    },
    compatibility: "none",
  };
}
