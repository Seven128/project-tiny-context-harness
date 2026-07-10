import { readFile } from "node:fs/promises";
import { sha256Hex } from "./composite-campaign-codec.js";

export interface CompositeCampaignFinalGateEvent {
  event_type: "final_gate";
  created_at: string;
  task_id: string;
  task_attempt_id: string;
  source_bundle_hash: string;
  product_source_hash: string;
  technical_plan_hash: string;
  acceptance_checklist_hash: string;
  product_goal_complete: boolean;
  completion_output_status: "accept" | "blocked" | "reject";
}

export async function readCurrentCompositeCampaignFinalGateEvent(
  eventsPath: string,
  taskAttemptId: string
): Promise<{ event: CompositeCampaignFinalGateEvent; line: string; sha256: string }> {
  const raw = await readFile(eventsPath);
  if (raw.byteLength > 16 * 1024 * 1024) throw new Error("Composite execution events exceed the 16 MiB result-recording limit");
  if (raw.byteLength === 0 || raw.at(-1) !== 0x0a) throw new Error("Composite execution events must end with LF");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  const lines = text.slice(0, -1).split("\n");
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]!;
    if (Buffer.byteLength(line) + 1 > 64 * 1024) throw new Error("Composite execution event line exceeds 64 KiB");
    let value: unknown;
    try { value = JSON.parse(line); } catch { throw new Error("Composite execution events contain invalid JSON"); }
    if (!isRecord(value) || value.event_type !== "final_gate" || value.task_attempt_id !== taskAttemptId) continue;
    const event = validateFinalGateEvent(value);
    const exact = `${line}\n`;
    return { event, line: exact, sha256: sha256Hex(exact) };
  }
  throw new Error("No current-attempt final_gate event is recorded in the bound workdir");
}

function validateFinalGateEvent(value: Record<string, unknown>): CompositeCampaignFinalGateEvent {
  const required = [
    "event_type", "created_at", "task_id", "task_attempt_id", "source_bundle_hash",
    "product_source_hash", "technical_plan_hash", "acceptance_checklist_hash",
    "product_goal_complete", "completion_output_status"
  ];
  for (const key of required) if (!Object.hasOwn(value, key)) throw new Error(`Current final_gate event is missing ${key}`);
  const status = value.completion_output_status;
  if (status !== "accept" && status !== "blocked" && status !== "reject") {
    throw new Error("Current final_gate event completion_output_status is invalid");
  }
  const createdAt = text(value.created_at, "created_at");
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("Current final_gate event created_at is invalid");
  if (typeof value.product_goal_complete !== "boolean") throw new Error("Current final_gate event product_goal_complete is invalid");
  return {
    event_type: "final_gate",
    created_at: createdAt,
    task_id: text(value.task_id, "task_id"),
    task_attempt_id: text(value.task_attempt_id, "task_attempt_id"),
    source_bundle_hash: hash(value.source_bundle_hash, "source_bundle_hash"),
    product_source_hash: hash(value.product_source_hash, "product_source_hash"),
    technical_plan_hash: hash(value.technical_plan_hash, "technical_plan_hash"),
    acceptance_checklist_hash: hash(value.acceptance_checklist_hash, "acceptance_checklist_hash"),
    product_goal_complete: value.product_goal_complete,
    completion_output_status: status
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || /[\r\n\0]/.test(value)) throw new Error(`Current final_gate event ${label} is invalid`);
  return value;
}
function hash(value: unknown, label: string): string {
  const result = text(value, label);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error(`Current final_gate event ${label} is not SHA-256`);
  return result;
}
