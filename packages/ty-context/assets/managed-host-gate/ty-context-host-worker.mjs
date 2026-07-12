#!/usr/bin/env node
import { createHash } from "node:crypto";
import { open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX = 1024 * 1024;

try {
  const options = argumentsOf(process.argv.slice(2));
  const config = await jsonFile(options.config);
  if (config.schema_version !== "ty-context-host-service-config-v1") throw new Error("host_worker_config_invalid");
  const stateRoot = await realpath(config.state_root);
  const requestPath = await privatePath(stateRoot, options.request, true);
  const resultPath = await privatePath(stateRoot, options.result, false);
  const runtimePath = await realpath(config.cli_worker_path);
  if (sha(await readFile(runtimePath)) !== config.cli_worker_sha256) throw new Error("host_worker_runtime_identity_changed");
  await verifyRuntimeManifest(config.cli_runtime_manifest, config.cli_runtime_manifest_sha256);
  const request = await jsonFile(requestPath);
  const runtime = await import(pathToFileURL(runtimePath).href);
  if (typeof runtime.runManagedHostWorkerRequestV1 !== "function") throw new Error("host_worker_runtime_invalid");
  const result = await runtime.runManagedHostWorkerRequestV1(request, config);
  await atomicResult(resultPath, { schema_version: "ty-context-host-worker-result-v1", ok: true, code: "ok", result });
} catch (error) {
  const result = option(process.argv.slice(2), "--result");
  if (result) await atomicResult(result, { schema_version: "ty-context-host-worker-result-v1", ok: false, code: safeCode(error), result: null }).catch(() => undefined);
  process.exitCode = 1;
}

function argumentsOf(argv) { const config = option(argv, "--config"); const request = option(argv, "--request"); const result = option(argv, "--result"); if (!config || !request || !result || argv.length !== 6) throw new Error("host_worker_arguments_invalid"); return { config, request, result }; }
function option(argv, key) { const index = argv.indexOf(key); return index >= 0 ? argv[index + 1] : undefined; }
async function jsonFile(file) { const bytes = await readFile(file); if (bytes.length > MAX) throw new Error("host_worker_file_too_large"); const text = bytes.toString("utf8"); const value = JSON.parse(text); if (canonical(value) !== text) throw new Error("host_worker_json_noncanonical"); return value; }
async function privatePath(root, candidate, mustExist) { const absolute = path.resolve(candidate); const parent = await realpath(path.dirname(absolute)); if (!inside(root, parent)) throw new Error("host_worker_path_outside_state"); if (mustExist && await realpath(absolute) !== absolute) throw new Error("host_worker_path_noncanonical"); return absolute; }
async function atomicResult(file, value) { const content = canonical(value); if (Buffer.byteLength(content) > MAX) throw new Error("host_worker_result_too_large"); const temporary = `${file}.tmp-${process.pid}`; const handle = await open(temporary, "wx", 0o600); try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); } await rename(temporary, file); await rm(temporary, { force: true }); }
function inside(root, candidate) { const left = normalized(root); const right = normalized(candidate); return right === left || right.startsWith(`${left}${path.sep}`); }
function normalized(value) { const resolved = path.resolve(value).replace(/^\\\\\?\\/u, ""); return process.platform === "win32" ? resolved.toLocaleLowerCase("en-US") : resolved; }
function canonical(value) { return JSON.stringify(sort(value)); }
function sort(value) { if (Array.isArray(value)) return value.map(sort); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])); return value; }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
async function verifyRuntimeManifest(manifest, expected) { if (!manifest || manifest.schema_version !== "ty-context-host-cli-runtime-manifest-v1" || !Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > 20000 || sha(canonical(manifest)) !== expected) throw new Error("host_worker_runtime_manifest_invalid"); let total = 0; for (const item of manifest.files) { if (!item || typeof item.path !== "string" || typeof item.sha256 !== "string" || typeof item.size !== "number" || item.size < 0) throw new Error("host_worker_runtime_manifest_invalid"); const actual = await realpath(item.path); if (normalized(actual) !== normalized(item.path)) throw new Error("host_worker_runtime_path_changed"); const bytes = await readFile(actual); total += bytes.length; if (bytes.length !== item.size || sha(bytes) !== item.sha256) throw new Error("host_worker_runtime_identity_changed"); } if (total > 512 * 1024 * 1024) throw new Error("host_worker_runtime_manifest_invalid"); }
function safeCode(error) { const message = error instanceof Error ? error.message : String(error); const direct = message.split(":", 1)[0]; if (/^[a-z][a-z0-9_.-]{0,95}$/u.test(direct)) return direct; const codes=[...new Set(message.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gu)??[])].filter((value)=>value.length<=96);for(const priority of [/^(?:empty|duplicate)_/u,/^plan_item_without_/u,/^obligation_without_/u,/^ac_without_/u,/^unrelated_/u,/^proof_surface_without_/u,/^binding_without_/u]){const value=codes.find((code)=>priority.test(code));if(value)return value;}return codes[0]??"host_worker_failed"; }
