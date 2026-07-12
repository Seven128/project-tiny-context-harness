import { createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalValueJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { verifyHostReleaseDirectoryV1, type HostReleaseManifestV1 } from "./long-task-host-release.js";
import { LongTaskHostRpcClientV1 } from "./long-task-host-rpc-client.js";
import { managedHostLayout, type ManagedHostLayoutV1 } from "./long-task-managed-host-layout.js";
import { inspectManagedRequirementsV1, renderManagedRequirementsV1 } from "./long-task-managed-requirements.js";
import { LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM } from "./long-task-host-release-root.js";
import { createManagedHostRuntimeManifestV1, managedHostRuntimeManifestSha256V1 } from "./long-task-host-runtime-identity.js";

export interface HostGateCheck {
  status: "available" | "host_completion_gate_unavailable";
  bundle_sha256: string;
  findings: string[];
  repair_action: string;
}

export interface HostGateCheckOptionsV1 {
  layout?: ManagedHostLayoutV1;
  pinned_root_public_key?: string;
  client?: LongTaskHostRpcClientV1;
  expected_thread_id?: string;
  workdir?: string;
  allow_existing_authority?: boolean;
  allow_test_namespace?: boolean;
}

interface HostHealthV1 {
  schema_version: string;
  protocol: string;
  service_version: string;
  key_id: string;
  managed_policy_sha256: string;
  release_manifest_sha256: string;
  identities: Record<string, string>;
  heartbeat_fresh: boolean;
  registry_available: boolean;
  active_present: boolean;
  reservation_present: boolean;
  durability_probe: boolean;
  managed_paths_secure: boolean;
  sandbox: { node_permission?: boolean; os_boundary?: boolean; adapter?: string };
  secret_provider: string;
  stop_smoke: { no_active_noop?: boolean; synthetic_active_block?: boolean };
  test_namespace: boolean;
}

export async function checkLongTaskHostGate(repositoryRoot: string, options: HostGateCheckOptionsV1 = {}): Promise<HostGateCheck> {
  const root = path.resolve(repositoryRoot);
  const layout = options.layout ?? managedHostLayout();
  const findings: string[] = [];
  let manifest: HostReleaseManifestV1 | null = null;
  let systemRequirements = "";
  let manifestText = "";
  const rootPublicKey = options.pinned_root_public_key ?? LONG_TASK_HOST_RELEASE_ROOT_PUBLIC_KEY_PEM;
  let hostPublicKey = "";
  let serviceConfigText="";let expectedRuntime:Record<string,string>={};

  try { systemRequirements = await readFile(layout.requirements_file, "utf8"); }
  catch { findings.push("managed_requirements_invalid:missing"); }
  if (systemRequirements) {
    const inspected = inspectManagedRequirementsV1(systemRequirements, layout);
    findings.push(...inspected.findings.map((finding) => `managed_requirements_invalid:${finding}`));
  }

  try {
    manifest = await verifyHostReleaseDirectoryV1(layout.managed_dir, rootPublicKey, { allow_runtime_files: true });
    manifestText = await readFile(layout.release_manifest_path, "utf8");
    if (await readFile(path.join(layout.managed_dir, "requirements.toml"), "utf8") !== renderManagedRequirementsV1(layout)) findings.push("managed_requirements_invalid:release_payload");
  } catch (error) {
    findings.push(`managed_host_release_invalid:${code(error)}`);
  }

  try {
    serviceConfigText = await readFile(layout.service_config_path, "utf8");
    expectedRuntime = await inspectServiceConfig(serviceConfigText, layout, options, findings);
  } catch (error) {
    findings.push(`managed_host_service_config_invalid:${code(error)}`);
  }

  let health: HostHealthV1 | null = null;
  try {
    hostPublicKey = await readFile(layout.attestation_public_key_path, "utf8");
    const client = options.client ?? new LongTaskHostRpcClientV1({ endpoint: layout.endpoint, public_key_path: layout.attestation_public_key_path, timeout_ms: 5000 });
    health = await client.call("health", root, { ...(options.expected_thread_id ? { thread_id: options.expected_thread_id } : {}), ...(options.workdir ? { workdir: path.resolve(options.workdir) } : {}) }) as HostHealthV1;
    inspectHealth(health, layout, systemRequirements, manifestText, hostPublicKey, manifest, findings, options,expectedRuntime);
  } catch (error) {
    findings.push(`managed_host_rpc_unavailable:${code(error)}`);
  }

  const bundleSha256 = sha256Hex(`${systemRequirements}\0${manifestText}\0${rootPublicKey}\0${serviceConfigText}\0${health ? canonicalValueJson(health.identities) : "unavailable"}`);
  return {
    status: findings.length === 0 ? "available" : "host_completion_gate_unavailable",
    bundle_sha256: bundleSha256,
    findings: [...new Set(findings)],
    repair_action: repair(layout)
  };
}

export async function assertLongTaskHostGate(repositoryRoot: string, options: HostGateCheckOptionsV1 = {}): Promise<HostGateCheck> {
  const result = await checkLongTaskHostGate(repositoryRoot, options);
  if (result.status !== "available") throw new Error(`host_completion_gate_unavailable:${result.findings.join(",")};repair=${result.repair_action}`);
  return result;
}

function inspectHealth(health: HostHealthV1, layout: ManagedHostLayoutV1, requirements: string, manifestText: string, hostPublicKey: string, manifest: HostReleaseManifestV1 | null, findings: string[], options: HostGateCheckOptionsV1,expectedRuntime:Record<string,string>): void {
  if (!health || health.schema_version !== "ty-context-host-health-v1" || health.protocol !== "ty-context-host-rpc-v1" || !/^0\.4\.0(?:-|$)/u.test(health.service_version)) findings.push("host_protocol_unsupported");
  if (!health.registry_available || !health.durability_probe) findings.push("host_registry_corrupt");
  if (!health.managed_paths_secure) findings.push("managed_host_paths_insecure");
  if (!health.heartbeat_fresh) findings.push("managed_hook_heartbeat_stale");
  if (!health.sandbox?.node_permission || !health.sandbox?.os_boundary) findings.push("sandbox_capability_unavailable");
  if (!health.secret_provider) findings.push("secret_provider_unavailable");
  if (!health.stop_smoke?.no_active_noop || !health.stop_smoke?.synthetic_active_block) findings.push("managed_hook_stop_smoke_failed");
  if (health.test_namespace && !options.allow_test_namespace) findings.push("managed_host_test_namespace_forbidden");
  if ((health.active_present || health.reservation_present) && !options.allow_existing_authority) findings.push("authority_reservation_conflict");
  if (health.managed_policy_sha256 !== sha256Hex(requirements)) findings.push("managed_requirements_invalid:policy_identity");
  if (health.release_manifest_sha256 !== sha256Hex(manifestText)) findings.push("host_identity_changed:release_manifest");
  const keyId = hostPublicKey ? sha256Hex(createPublicKey(hostPublicKey).export({ type: "spki", format: "der" })) : "";
  if (!keyId || health.key_id !== keyId) findings.push("host_attestation_invalid:key_identity");
  const releaseFiles = new Map((manifest?.files ?? []).map((item) => [item.path, item.sha256]));
  const helperName = layout.platform === "win32" ? "ty-context-host-helper.exe" : "ty-context-host-helper";
  const adminName = layout.platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin";
  const installerUiName = layout.platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui";
  for (const [identity, expected] of [
    ["requirements", requirements ? sha256Hex(requirements) : ""],
    ["helper", releaseFiles.get(helperName) ?? ""],
    ["admin", releaseFiles.get(adminName) ?? ""],
    ["installer_ui", releaseFiles.get(installerUiName) ?? ""],
    ["hook", releaseFiles.get("long-task-hook.mjs") ?? ""],
    ["worker", releaseFiles.get("ty-context-host-worker.mjs") ?? ""]
  ] as const) if (!expected || health.identities?.[identity] !== expected) findings.push(`managed_hook_identity_changed:${identity}`);
  for(const [identity,expected] of Object.entries(expectedRuntime))if(!expected||health.identities?.[identity]!==expected)findings.push(`host_identity_changed:${identity}`);
}

async function inspectServiceConfig(text: string, layout: ManagedHostLayoutV1, options: HostGateCheckOptionsV1, findings: string[]): Promise<Record<string, string>> {
  const config = parseStrictJson(text) as Record<string, unknown>;
  const fixed: Array<[string, string]> = [
    ["state_root", layout.state_root], ["endpoint", layout.endpoint], ["managed_dir", layout.managed_dir],
    ["requirements_file", layout.requirements_file], ["node_path", layout.node_path], ["helper_path", layout.helper_path],
    ["admin_path", layout.admin_path], ["installer_ui_path", layout.installer_ui_path], ["hook_path", layout.hook_path], ["worker_path", layout.worker_path],
    ["attestation_public_key_path", layout.attestation_public_key_path]
  ];
  if (canonicalValueJson(config) !== text || config.schema_version !== "ty-context-host-service-config-v1" || fixed.some(([key, value]) => config[key] !== value)) findings.push("managed_host_service_config_invalid");
  if (config.test_namespace === true && !options.allow_test_namespace) findings.push("managed_host_test_namespace_forbidden");
  const codexLauncher = requiredString(config.codex_launcher_path, "codex_launcher_path");
  const sandboxLauncher = requiredString(config.sandbox_launcher_path, "sandbox_launcher_path");
  const cli = fileURLToPath(new URL("../cli.js", import.meta.url));
  const cliWorker = fileURLToPath(new URL("./long-task-host-worker-runtime.js", import.meta.url));
  const runtime = await createManagedHostRuntimeManifestV1(cli);
  const expected = {
    node: sha256Hex(await readFile(layout.node_path)), sandbox_launcher: sha256Hex(await readFile(sandboxLauncher)),
    admin: sha256Hex(await readFile(layout.admin_path)), installer_ui: sha256Hex(await readFile(layout.installer_ui_path)),
    codex_launcher: sha256Hex(await readFile(codexLauncher)),
    cli: sha256Hex(await readFile(cli)), cli_worker: sha256Hex(await readFile(cliWorker)),
    cli_runtime: managedHostRuntimeManifestSha256V1(runtime), service_config: sha256Hex(text)
  };
  if (config.node_sha256 !== expected.node || config.sandbox_launcher_sha256 !== expected.sandbox_launcher || config.admin_sha256 !== expected.admin || config.installer_ui_sha256 !== expected.installer_ui || config.codex_launcher_sha256 !== expected.codex_launcher) findings.push("managed_host_runtime_identity_changed");
  if (config.cli_path !== cli || config.cli_worker_path !== cliWorker || config.cli_sha256 !== expected.cli || config.cli_worker_sha256 !== expected.cli_worker || config.cli_runtime_manifest_sha256 !== expected.cli_runtime) findings.push("managed_host_cli_identity_changed");
  return expected;
}

function requiredString(value: unknown, name: string): string { if (typeof value !== "string" || !value) throw new Error(`missing_${name}`); return value; }

function code(error: unknown): string { return (error instanceof Error ? error.message : String(error)).replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 160); }
function repair(layout: ManagedHostLayoutV1): string { return `Run as administrator: \"${layout.admin_path}\" status --config \"${layout.service_config_path}\"`; }
