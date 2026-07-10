import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import {
  type CompositeCampaignProjectionV1,
  type CompositeCampaignRevisionV1,
  type CompositeCampaignSourceHashesV1
} from "./composite-campaign-types.js";
import { sourceHashesSha256 } from "./composite-campaign-schema-binding.js";
import {
  exactKeys,
  hashValue,
  requireRecord,
  revisionValue,
  timestampValue
} from "./composite-campaign-schema-common.js";

export function validateCampaignRevision(value: unknown, path: string): CompositeCampaignRevisionV1 {
  const object = requireRecord(value, path);
  exactKeys(object, [
    "revision", "created_at", "packet_sha256", "previous_packet_sha256", "input_contract_sha256", "projections"
  ], [], path);
  const revision = revisionValue(object.revision, `${path}.revision`);
  const previous = object.previous_packet_sha256 === null
    ? null
    : hashValue(object.previous_packet_sha256, `${path}.previous_packet_sha256`);
  if ((revision === 1) !== (previous === null)) {
    throw new Error(`${path}.previous_packet_sha256 must be null only for revision 1`);
  }
  const contractHash = hashValue(object.input_contract_sha256, `${path}.input_contract_sha256`);
  if (contractHash !== COMPOSITE_INPUT_CONTRACT.canonical_sha256) {
    throw new Error(`${path}.input_contract_sha256 does not match the current input contract`);
  }
  return {
    revision,
    created_at: timestampValue(object.created_at, `${path}.created_at`),
    packet_sha256: hashValue(object.packet_sha256, `${path}.packet_sha256`),
    previous_packet_sha256: previous,
    input_contract_sha256: contractHash,
    projections: object.projections === null ? null : validateProjection(object.projections, `${path}.projections`)
  };
}

export function projectionSourceHashes(projection: CompositeCampaignProjectionV1): CompositeCampaignSourceHashesV1 {
  return {
    product_architecture_source: projection.product_architecture_source_sha256,
    technical_realization_plan: projection.technical_realization_plan_sha256,
    acceptance_checklist: projection.acceptance_checklist_sha256
  };
}

function validateProjection(value: unknown, path: string): CompositeCampaignProjectionV1 {
  const object = requireRecord(value, path);
  exactKeys(object, [
    "product_architecture_source_sha256", "technical_realization_plan_sha256",
    "acceptance_checklist_sha256", "bundle_sha256", "rendered_at"
  ], [], path);
  const projection = {
    product_architecture_source_sha256: hashValue(object.product_architecture_source_sha256, `${path}.product_architecture_source_sha256`),
    technical_realization_plan_sha256: hashValue(object.technical_realization_plan_sha256, `${path}.technical_realization_plan_sha256`),
    acceptance_checklist_sha256: hashValue(object.acceptance_checklist_sha256, `${path}.acceptance_checklist_sha256`),
    bundle_sha256: hashValue(object.bundle_sha256, `${path}.bundle_sha256`),
    rendered_at: timestampValue(object.rendered_at, `${path}.rendered_at`)
  };
  if (projection.bundle_sha256 !== sourceHashesSha256(projectionSourceHashes(projection))) {
    throw new Error(`${path}.bundle_sha256 does not match the three canonical source hashes`);
  }
  return projection;
}
