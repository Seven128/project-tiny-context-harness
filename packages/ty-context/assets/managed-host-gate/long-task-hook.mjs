#!/usr/bin/env node
import { createHash, createPublicKey, randomBytes, randomUUID, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX = 1024 * 1024;
const directory = path.dirname(fileURLToPath(import.meta.url));
let failureEvent = "Stop";

try {
  const input = await stdinObject();
  const event = input.hook_event_name;
  if (!["SessionStart", "PostCompact", "Stop"].includes(event)) throw new Error("managed_hook_event_invalid");
  const config = JSON.parse(await readFile(path.join(directory, "host-service-config.json"), "utf8"));
  const publicPem = await readFile(config.attestation_public_key_path, "utf8");
  const params = {
    hook_event_name: event,
    thread_id: text(input.session_id ?? input.thread_id, "thread_id"),
    turn_id: text(input.turn_id, "turn_id"),
    cwd: text(input.cwd, "cwd"),
    source: typeof input.source === "string" ? input.source : null,
    trigger: typeof input.trigger === "string" ? input.trigger : null,
    stop_hook_active: input.stop_hook_active === true,
    last_assistant_message: typeof input.last_assistant_message === "string" ? input.last_assistant_message : null
  };
  if (/^[A-Za-z0-9_-]{43}$/u.test(process.env.TY_CONTEXT_HOST_SMOKE_TOKEN ?? "")) params.host_smoke_token = process.env.TY_CONTEXT_HOST_SMOKE_TOKEN;
  const request = { protocol: "ty-context-host-rpc-v1", request_id: randomUUID(), method: "handle_hook_event", repository_hint: params.cwd, client_nonce: randomBytes(32).toString("base64url"), params };
  const response = await exchange(config.endpoint, frame(request), event === "Stop" ? 21_600_000 : 5_000);
  await attest(response, request, publicPem);
  if (!response.ok) throw new Error(response.code);
  process.stdout.write(`${JSON.stringify(response.result)}\n`);
} catch (error) {
  if (failureEvent === "SessionStart" || failureEvent === "PostCompact") process.stdout.write("{}\n");
  else process.stdout.write(`${JSON.stringify({ decision: "block", reason: `host_completion_gate_unavailable:${safe(error)}` })}\n`);
}

async function stdinObject() {
  const chunks = []; let size = 0;
  for await (const chunk of process.stdin) { size += chunk.length; if (size > MAX) throw new Error("managed_hook_input_too_large"); chunks.push(chunk); }
  const value = JSON.parse(decode(Buffer.concat(chunks)));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("managed_hook_input_invalid");
  failureEvent = typeof value.hook_event_name === "string" ? value.hook_event_name : "Stop";
  return value;
}

function frame(value) { const body = Buffer.from(canonical(value)); if (body.length > MAX) throw new Error("host_rpc_frame_too_large"); const result = Buffer.alloc(body.length + 4); result.writeUInt32BE(body.length); body.copy(result, 4); return result; }
async function exchange(endpoint, request, timeout) { return new Promise((resolve, reject) => { const chunks = []; let size = 0; let done = false; const socket = net.createConnection(endpoint); const timer = setTimeout(() => finish(new Error("timeout")), timeout); timer.unref(); function finish(error, value) { if (done) return; done = true; clearTimeout(timer); socket.destroy(); error ? reject(error) : resolve(value); } socket.once("connect", () => socket.write(request)); socket.on("data", (chunk) => { size += chunk.length; if (size > MAX + 4) return finish(new Error("response_too_large")); chunks.push(chunk); const all = Buffer.concat(chunks); if (all.length < 4) return; const expected = all.readUInt32BE(0) + 4; if (all.length === expected) { try { const text = decode(all.subarray(4)); const value = JSON.parse(text); if (canonical(value) !== text) throw new Error("response_noncanonical"); finish(null, value); } catch (error) { finish(error); } } else if (all.length > expected) finish(new Error("trailing_response")); }); socket.once("error", finish); socket.once("end", () => finish(new Error("truncated_response"))); }); }
async function attest(response, request, publicPem) { const fields = ["attestation", "code", "error", "ok", "protocol", "request_id", "result", "retryable"]; if (!response || typeof response !== "object" || Object.keys(response).sort().join("\0") !== fields.join("\0") || response.request_id !== request.request_id) throw new Error("response_fields"); const signed = { ...response.attestation }; const signature = signed.signature; const hash = signed.record_sha256; delete signed.signature; delete signed.record_sha256; const key = createPublicKey(publicPem); const der = key.export({ type: "spki", format: "der" }); if (signed.key_id !== sha(der) || sha(canonical(signed)) !== hash || !verify(null, Buffer.from(hash, "hex"), key, Buffer.from(signature, "base64url"))) throw new Error("attestation_signature"); if (signed.request_id !== request.request_id || signed.client_nonce !== request.client_nonce || signed.response_code !== response.code || signed.result_sha256 !== sha(canonical(response.result)) || Math.abs(Date.now() - signed.issued_at_unix_ms) > 300_000) throw new Error("attestation_binding"); }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function text(value, name) { if (typeof value !== "string" || !value) throw new Error(`managed_hook_${name}_invalid`); return value; }
function safe(error) { return (error instanceof Error ? error.message : String(error)).replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 160); }
function decode(bytes) { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
