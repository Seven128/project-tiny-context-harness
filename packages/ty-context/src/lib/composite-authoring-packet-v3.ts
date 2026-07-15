import type { SourceUnitPacketBindingV4 } from "./composite-campaign-source-units.js";
import type {
  AcceptanceChecklistV3,
  ProductSourceV3,
  TechnicalPlanV3,
} from "./long-task-contract-schema.js";

export const COMPOSITE_AUTHORING_PACKET_SCHEMA =
  "composite-authoring-packet-v3" as const;

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
