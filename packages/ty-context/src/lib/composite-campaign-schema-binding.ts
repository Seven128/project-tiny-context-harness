import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { validatePortablePathComponent } from "./composite-campaign-path-component.js";
import {
  COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
  type CompositeCampaignBindingGoalV1,
  type CompositeCampaignBindingResultV1,
  type CompositeCampaignBindingV1,
  type CompositeCampaignResultStatusV1,
  type CompositeCampaignSourceHashesV1
} from "./composite-campaign-types.js";
import {
  campaignIdValue,
  enumValue,
  exactKeys,
  guardSchemaVersion,
  hashValue,
  rejectAggregateCompletionKeys,
  requireRecord,
  revisionValue,
  sfcIdValue,
  stringValue,
  timestampValue
} from "./composite-campaign-schema-common.js";

const RESULT_STATUSES = ["accept", "blocked", "reject"] as const;

export function validateCompositeCampaignBindingV1(value: unknown): CompositeCampaignBindingV1 {
  const object = guardSchemaVersion(value, COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION, "CompositeCampaignBindingV1");
  rejectAggregateCompletionKeys(value);
  exactKeys(object, [
    "schema_version", "binding_id", "campaign_id", "slice_id", "revision", "request_sha256",
    "packet_sha256", "input_contract_sha256", "source_hashes", "workdir", "task", "handed_off_at", "goal", "result"
  ], [], "CompositeCampaignBindingV1");
  const campaignId = campaignIdValue(object.campaign_id, "CompositeCampaignBindingV1.campaign_id");
  const sliceId = sfcIdValue(object.slice_id, "CompositeCampaignBindingV1.slice_id");
  const revision = revisionValue(object.revision, "CompositeCampaignBindingV1.revision");
  const sourceHashes = validateSourceHashes(object.source_hashes, "CompositeCampaignBindingV1.source_hashes");
  const task = validateTask(object.task);
  const goal = object.goal === null ? null : validateGoal(object.goal);
  const result = object.result === null ? null : validateResult(object.result);
  if (result && !goal) throw new Error("Composite campaign binding result requires a bound goal before started result recording");
  if (result && result.task_attempt_id !== task.task_attempt_id) {
    throw new Error("Composite campaign binding result task_attempt_id must match the current task attempt");
  }
  if (result && result.source_hashes_sha256 !== sourceHashesSha256(sourceHashes)) {
    throw new Error("Composite campaign binding result source_hashes_sha256 does not match current source hashes");
  }
  const inputContractHash = hashValue(object.input_contract_sha256, "CompositeCampaignBindingV1.input_contract_sha256");
  if (inputContractHash !== COMPOSITE_INPUT_CONTRACT.canonical_sha256) {
    throw new Error("CompositeCampaignBindingV1.input_contract_sha256 does not match the current input contract");
  }
  return {
    schema_version: COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
    binding_id: stringValue(object.binding_id, "CompositeCampaignBindingV1.binding_id"),
    campaign_id: campaignId,
    slice_id: sliceId,
    revision,
    request_sha256: hashValue(object.request_sha256, "CompositeCampaignBindingV1.request_sha256"),
    packet_sha256: hashValue(object.packet_sha256, "CompositeCampaignBindingV1.packet_sha256"),
    input_contract_sha256: inputContractHash,
    source_hashes: sourceHashes,
    workdir: workdirValue(object.workdir, campaignId, sliceId, revision),
    task,
    handed_off_at: timestampValue(object.handed_off_at, "CompositeCampaignBindingV1.handed_off_at"),
    goal,
    result
  };
}

export function validateSourceHashes(value: unknown, path: string): CompositeCampaignSourceHashesV1 {
  const object = requireRecord(value, path);
  exactKeys(object, [
    "product_architecture_source", "technical_realization_plan", "acceptance_checklist"
  ], [], path);
  return {
    product_architecture_source: hashValue(object.product_architecture_source, `${path}.product_architecture_source`),
    technical_realization_plan: hashValue(object.technical_realization_plan, `${path}.technical_realization_plan`),
    acceptance_checklist: hashValue(object.acceptance_checklist, `${path}.acceptance_checklist`)
  };
}

export function sourceHashesSha256(value: CompositeCampaignSourceHashesV1): string {
  return sha256Hex(canonicalJson(value));
}

function validateTask(value: unknown): CompositeCampaignBindingV1["task"] {
  const path = "CompositeCampaignBindingV1.task";
  const object = requireRecord(value, path);
  exactKeys(object, ["task_id", "task_attempt_id"], [], path);
  return {
    task_id: stringValue(object.task_id, `${path}.task_id`),
    task_attempt_id: stringValue(object.task_attempt_id, `${path}.task_attempt_id`)
  };
}

function validateGoal(value: unknown): CompositeCampaignBindingGoalV1 {
  const path = "CompositeCampaignBindingV1.goal";
  const object = requireRecord(value, path);
  exactKeys(object, ["goal_id", "started_at"], [], path);
  return {
    goal_id: stringValue(object.goal_id, `${path}.goal_id`),
    started_at: timestampValue(object.started_at, `${path}.started_at`)
  };
}

function validateResult(value: unknown): CompositeCampaignBindingResultV1 {
  const path = "CompositeCampaignBindingV1.result";
  const object = requireRecord(value, path);
  exactKeys(object, [
    "status", "task_attempt_id", "source_hashes_sha256", "final_gate_event_sha256", "recorded_at"
  ], [], path);
  return {
    status: enumValue(object.status, RESULT_STATUSES, `${path}.status`) as CompositeCampaignResultStatusV1,
    task_attempt_id: stringValue(object.task_attempt_id, `${path}.task_attempt_id`),
    source_hashes_sha256: hashValue(object.source_hashes_sha256, `${path}.source_hashes_sha256`),
    final_gate_event_sha256: hashValue(object.final_gate_event_sha256, `${path}.final_gate_event_sha256`),
    recorded_at: timestampValue(object.recorded_at, `${path}.recorded_at`)
  };
}

function workdirValue(value: unknown, campaignId: string, sliceId: string, revision: number): string {
  const workdir = stringValue(value, "CompositeCampaignBindingV1.workdir");
  const components = workdir.split("/");
  for (const [index, component] of components.entries()) {
    if (component === "" && index === components.length - 1) continue;
    validatePortablePathComponent(component, "CompositeCampaignBindingV1.workdir");
  }
  const expected = `tmp/ty-context/plan-acceptance/${campaignId}/${sliceId}-r${revision}/`;
  if (workdir !== expected) {
    throw new Error(
      "CompositeCampaignBindingV1.workdir must exactly match the normalized project-relative " +
      "tmp/ty-context/plan-acceptance/<campaign_id>/<slice_id>-r<revision>/ identity path"
    );
  }
  return workdir;
}
