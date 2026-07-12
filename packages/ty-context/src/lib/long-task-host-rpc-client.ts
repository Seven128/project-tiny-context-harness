import { createPublicKey, randomBytes, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import { createHostRequest, decodeHostFrame, encodeHostFrame, LONG_TASK_HOST_MAX_FRAME_BYTES, type NormalHostMethodV1 } from "./long-task-host-protocol.js";

export interface LongTaskHostRpcClientOptionsV1 { endpoint: string; public_key_path: string; timeout_ms: number }
interface HostResponseWireV1 { protocol: string; request_id: string; ok: boolean; code: string; retryable: boolean; result: unknown; error: string | null; attestation: Record<string, unknown> }

export class HostRpcErrorV1 extends Error { constructor(readonly code: string, readonly retryable: boolean) { super(code); this.name = "HostRpcErrorV1"; } }

export class LongTaskHostRpcClientV1 {
  constructor(private readonly options: LongTaskHostRpcClientOptionsV1) {
    if (!options.endpoint || options.timeout_ms < 1 || options.timeout_ms > 6 * 60 * 60_000) throw new Error("host_rpc_client_options_invalid");
  }

  async call(method: NormalHostMethodV1, repositoryHint: string, params: Record<string, unknown>): Promise<any> {
    const request = createHostRequest(method, repositoryHint, params);
    const response = assertResponse(await exchange(this.options, encodeHostFrame(request)));
    await verifyAttestation(response, request, await readFile(this.options.public_key_path, "utf8"));
    if (!response.ok) throw new HostRpcErrorV1(response.code, response.retryable);
    return response.result;
  }
}

async function exchange(options: LongTaskHostRpcClientOptionsV1, frame: Buffer): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let total = 0; let settled = false;
    const socket = net.createConnection(options.endpoint);
    const timer = setTimeout(() => finish(new Error("host_rpc_timeout")), options.timeout_ms); timer.unref();
    const finish = (error?: unknown, value?: unknown) => { if (settled) return; settled = true; clearTimeout(timer); socket.destroy(); error ? reject(error) : resolve(value); };
    socket.once("connect", () => socket.write(frame));
    socket.on("data", (chunk: Buffer) => { total += chunk.length; if (total > LONG_TASK_HOST_MAX_FRAME_BYTES + 4) { finish(new Error("host_rpc_frame_invalid:too_large")); return; } chunks.push(chunk); if (total >= 4) { const all = Buffer.concat(chunks); const expected = 4 + all.readUInt32BE(0); if (total === expected) { try { finish(undefined, decodeHostFrame(all)); } catch (error) { finish(error); } } else if (total > expected) finish(new Error("host_rpc_frame_invalid:trailing_bytes")); } });
    socket.once("error", (error) => {
      const socketError = error as NodeJS.ErrnoException;
      finish(new Error(`host_rpc_unavailable:${socketError.code ?? socketError.message}`));
    });
    socket.once("end", () => { if (!settled) finish(new Error("host_rpc_frame_invalid:truncated")); });
  });
}

function assertResponse(value: unknown): HostResponseWireV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("host_rpc_response_invalid:not_object");
  const response = value as Record<string, unknown>; const fields = ["attestation", "code", "error", "ok", "protocol", "request_id", "result", "retryable"];
  if (Object.keys(response).sort().join("\0") !== fields.join("\0") || response.protocol !== "ty-context-host-rpc-v1" || typeof response.request_id !== "string" || typeof response.ok !== "boolean" || typeof response.code !== "string" || typeof response.retryable !== "boolean" || (response.error !== null && typeof response.error !== "string") || !response.attestation || typeof response.attestation !== "object" || Array.isArray(response.attestation)) throw new Error("host_rpc_response_invalid:fields");
  return response as unknown as HostResponseWireV1;
}

async function verifyAttestation(response: HostResponseWireV1, request: { request_id: string; client_nonce: string }, publicPem: string): Promise<void> {
  const signed = { ...response.attestation } as Record<string, unknown>; const signature = take(signed, "signature"); const recordSha256 = take(signed, "record_sha256");
  const publicKey = createPublicKey(publicPem); const publicDer = publicKey.export({ type: "spki", format: "der" });
  if (signed.key_id !== sha256Hex(publicDer) || sha256Hex(canonicalValueJson(signed)) !== recordSha256 || !verify(null, Buffer.from(recordSha256, "hex"), publicKey, Buffer.from(signature, "base64url"))) throw new Error("host_rpc_attestation_invalid:signature");
  if (signed.schema_version !== "ty-context-host-response-attestation-v1" || signed.request_id !== request.request_id || signed.client_nonce !== request.client_nonce || signed.response_code !== response.code || signed.result_sha256 !== sha256Hex(canonicalValueJson(response.result)) || typeof signed.issued_at_unix_ms !== "number" || Math.abs(Date.now() - signed.issued_at_unix_ms) > 5 * 60_000 || typeof signed.server_nonce !== "string" || !timingLength(signed.server_nonce)) throw new Error("host_rpc_attestation_invalid:binding");
}

function take(value: Record<string, unknown>, key: string): string { const item = value[key]; delete value[key]; if (typeof item !== "string") throw new Error(`host_rpc_attestation_invalid:${key}`); return item; }
function timingLength(value: string): boolean { try { return Buffer.from(value, "base64url").length === 32 && randomBytes(0).length === 0; } catch { return false; } }
