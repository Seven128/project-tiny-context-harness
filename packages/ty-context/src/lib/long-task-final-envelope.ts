import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { FinalResultEnvelopeV3, FinalResultPayloadV3 } from "./long-task-run-result.js";
import type { HostDetachedAttestationV3 } from "./long-task-host-signing.js";

const PAYLOAD_KEYS = ["acceptance_criterion_results","assertion_results","binding_results","browser_layer_keys","contract_sha256","counterfactual_results","dependency_layer_keys","environment_manifest_sha256","environment_probe_results","external_blocker","final_snapshot_sha256","findings","finished_at","obligation_results","plan_item_results","population_results","proof_requirement_results","registry_id","requirement_results","result_id","run_id","spec_results","started_at","workflow_status","workspace_hash_after","workspace_hash_before"].sort();

export function finalResultPayloadSha256V3(payload:FinalResultPayloadV3):string{return sha256Hex(canonicalJson(payload));}

export function finalResultAttestationBytesV3(payload:FinalResultPayloadV3,payloadSha256:string):Buffer{return Buffer.from(canonicalJson({schema_version:"long-task-final-result-v3",payload_sha256:payloadSha256,registry_id:payload.registry_id,contract_sha256:payload.contract_sha256,final_snapshot_sha256:payload.final_snapshot_sha256,atomic_write_complete:true}),"utf8");}

export function createFinalResultEnvelopeV3(payload:FinalResultPayloadV3,hostAttestation:HostDetachedAttestationV3):FinalResultEnvelopeV3{const payloadSha256=finalResultPayloadSha256V3(payload);return {schema_version:"long-task-final-result-v3",payload,integrity:{payload_sha256:payloadSha256,atomic_write_complete:true},host_attestation:hostAttestation};}

export function assertFinalResultEnvelopeShapeV3(value:FinalResultEnvelopeV3):void{
  if(!value||typeof value!=="object"||Array.isArray(value)||value.schema_version!=="long-task-final-result-v3")throw new Error("final_result_incomplete:schema");
  if(!exactKeys(value as unknown as Record<string,unknown>,["host_attestation","integrity","payload","schema_version"]))throw new Error("final_result_incomplete:envelope_fields");
  if(!value.payload||typeof value.payload!=="object"||Array.isArray(value.payload)||!exactKeys(value.payload as unknown as Record<string,unknown>,PAYLOAD_KEYS))throw new Error("final_result_incomplete:payload_fields");
  if(!value.integrity||!exactKeys(value.integrity as unknown as Record<string,unknown>,["atomic_write_complete","payload_sha256"])||value.integrity.atomic_write_complete!==true||!hash(value.integrity.payload_sha256))throw new Error("final_result_incomplete:integrity");
  if(!value.host_attestation||!exactKeys(value.host_attestation as unknown as Record<string,unknown>,["key_id","signature"])||!hash(value.host_attestation.key_id)||typeof value.host_attestation.signature!=="string"||value.host_attestation.signature.length<40)throw new Error("final_result_signature_invalid:shape");
  if(finalResultPayloadSha256V3(value.payload)!==value.integrity.payload_sha256)throw new Error("final_result_hash_mismatch");
  if(!/^[A-Za-z0-9._:-]{1,256}$/u.test(value.payload.result_id)||!/^[A-Za-z0-9._:-]{1,256}$/u.test(value.payload.registry_id)||!/^[A-Za-z0-9._:-]{1,256}$/u.test(value.payload.run_id)||!hash(value.payload.contract_sha256)||!hash(value.payload.final_snapshot_sha256)||!hash(value.payload.workspace_hash_before)||!hash(value.payload.workspace_hash_after)||!hash(value.payload.environment_manifest_sha256))throw new Error("final_result_incomplete:identity");
  if(!["accepted","needs_work","externally_blocked"].includes(value.payload.workflow_status)||!timestamp(value.payload.started_at)||!timestamp(value.payload.finished_at)||Date.parse(value.payload.finished_at)<Date.parse(value.payload.started_at))throw new Error("final_result_incomplete:status_time");
}

function exactKeys(value:Record<string,unknown>,expected:string[]):boolean{return canonicalJson(Object.keys(value).sort())===canonicalJson([...expected].sort());}
function hash(value:unknown):value is string{return typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);}
function timestamp(value:unknown):value is string{return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)&&Number.isFinite(Date.parse(value));}
