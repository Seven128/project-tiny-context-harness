import { randomBytes, randomUUID } from "node:crypto";
import { canonicalValueJson, parseStrictJson } from "./composite-campaign-codec.js";

export const LONG_TASK_HOST_PROTOCOL = "ty-context-host-rpc-v1" as const;
export const LONG_TASK_HOST_MAX_FRAME_BYTES = 1024 * 1024;
export const NORMAL_HOST_METHODS = [
  "health",
  "record_managed_heartbeat",
  "reserve_authority",
  "compile_and_seal",
  "get_active",
  "verify",
  "final_gate",
  "handle_hook_event"
] as const;

export type NormalHostMethodV1 = typeof NORMAL_HOST_METHODS[number];

export interface HostRequestV1 {
  protocol: typeof LONG_TASK_HOST_PROTOCOL;
  request_id: string;
  method: NormalHostMethodV1;
  repository_hint: string;
  client_nonce: string;
  params: Record<string, unknown>;
}

export interface HostResponseV1 {
  protocol: typeof LONG_TASK_HOST_PROTOCOL;
  request_id: string;
  ok: boolean;
  code: string;
  retryable: boolean;
  result: unknown;
  error: string | null;
  attestation: Record<string, unknown>;
}

export function createHostRequest(method: NormalHostMethodV1, repositoryHint: string, params: Record<string, unknown>): HostRequestV1 {
  if (!NORMAL_HOST_METHODS.includes(method)) throw new Error(`host_rpc_method_forbidden:${method}`);
  return {
    protocol: LONG_TASK_HOST_PROTOCOL,
    request_id: randomUUID(),
    method,
    repository_hint: repositoryHint,
    client_nonce: randomBytes(32).toString("base64url"),
    params
  };
}

export function encodeHostFrame(value: unknown): Buffer {
  const payload = Buffer.from(canonicalValueJson(value), "utf8");
  if (payload.length > LONG_TASK_HOST_MAX_FRAME_BYTES) throw new Error("host_rpc_frame_too_large");
  const frame = Buffer.allocUnsafe(payload.length + 4);
  frame.writeUInt32BE(payload.length, 0);
  payload.copy(frame, 4);
  return frame;
}

export function decodeHostFrame(frame: Buffer): unknown {
  if (frame.length < 4) throw new Error("host_rpc_frame_invalid:short_header");
  const length = frame.readUInt32BE(0);
  if (length > LONG_TASK_HOST_MAX_FRAME_BYTES) throw new Error("host_rpc_frame_invalid:too_large");
  if (frame.length !== length + 4) throw new Error("host_rpc_frame_invalid:length_mismatch");
  try {
    const text = frame.subarray(4).toString("utf8");
    const value = parseStrictJson(text);
    if (canonicalValueJson(value) !== text) throw new Error("noncanonical_json");
    return value;
  } catch (error) {
    throw new Error(`host_rpc_frame_invalid:${message(error)}`);
  }
}

export function assertHostRequest(value: unknown): asserts value is HostRequestV1 {
  if (!isObject(value)) throw new Error("host_rpc_request_invalid:not_object");
  const expected = ["client_nonce", "method", "params", "protocol", "repository_hint", "request_id"];
  if (Object.keys(value).sort().join("\0") !== expected.join("\0")) throw new Error("host_rpc_request_invalid:fields");
  if (value.protocol !== LONG_TASK_HOST_PROTOCOL) throw new Error("host_rpc_request_invalid:protocol");
  if (typeof value.request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value.request_id)) throw new Error("host_rpc_request_invalid:request_id");
  if (typeof value.method !== "string" || !NORMAL_HOST_METHODS.includes(value.method as NormalHostMethodV1)) throw new Error("host_rpc_request_invalid:method");
  if (typeof value.repository_hint !== "string" || typeof value.client_nonce !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value.client_nonce)) throw new Error("host_rpc_request_invalid:identity");
  if (!isObject(value.params)) throw new Error("host_rpc_request_invalid:params");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
