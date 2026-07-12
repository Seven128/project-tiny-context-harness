import path from "node:path";
import { sha256Hex } from "./composite-campaign-codec.js";

export interface ManagedHostLayoutV1 {
  platform: NodeJS.Platform;
  requirements_file: string;
  managed_dir: string;
  unix_managed_dir: string;
  windows_managed_dir: string;
  state_root: string;
  endpoint: string;
  node_path: string;
  unix_node_path: string;
  hook_path: string;
  worker_path: string;
  helper_path: string;
  admin_path: string;
  installer_ui_path: string;
  release_manifest_path: string;
  release_signature_path: string;
  release_root_public_key_path: string;
  attestation_public_key_path: string;
  service_config_path: string;
}

export function managedHostLayout(platform: NodeJS.Platform = process.platform): ManagedHostLayoutV1 {
  if (platform === "win32") return layout(platform, "C:\\ProgramData\\OpenAI\\Codex\\requirements.toml", "C:\\Program Files\\OpenAI\\Codex\\ManagedHooks\\ty-context", "C:\\ProgramData\\OpenAI\\Codex\\ty-context-host", "\\\\.\\pipe\\ty-context-host-gate-v1", process.execPath);
  if (platform === "darwin") return layout(platform, "/etc/codex/requirements.toml", "/Library/Application Support/OpenAI/Codex/ManagedHooks/ty-context", "/Library/Application Support/OpenAI/Codex/ty-context-host", "/var/run/ty-context/host-gate.sock", process.execPath);
  return layout(platform, "/etc/codex/requirements.toml", "/opt/openai/codex/managed-hooks/ty-context", "/var/lib/ty-context", "/run/ty-context/host-gate.sock", process.execPath);
}

export function managedHostLayoutUnder(root: string, platform: NodeJS.Platform = process.platform): ManagedHostLayoutV1 {
  const base = path.resolve(root);
  const suffix = sha256Hex(base).slice(0, 16);
  if (platform === "win32") return layout(platform, path.join(base, "ProgramData", "OpenAI", "Codex", "requirements.toml"), path.join(base, "Program Files", "OpenAI", "Codex", "ManagedHooks", "ty-context"), path.join(base, "ProgramData", "OpenAI", "Codex", "ty-context-host"), `\\\\.\\pipe\\ty-context-host-gate-v1-test-${suffix}`, process.execPath);
  const managed = platform === "darwin" ? path.join(base, "Library", "Application Support", "OpenAI", "Codex", "ManagedHooks", "ty-context") : path.join(base, "opt", "openai", "codex", "managed-hooks", "ty-context");
  const state = platform === "darwin" ? path.join(base, "Library", "Application Support", "OpenAI", "Codex", "ty-context-host") : path.join(base, "var", "lib", "ty-context");
  return layout(platform, path.join(base, "etc", "codex", "requirements.toml"), managed, state, path.join(base, "run", `ty-context-host-gate-${suffix}.sock`), process.execPath);
}

function layout(platform: NodeJS.Platform, requirements: string, managed: string, state: string, endpoint: string, node: string): ManagedHostLayoutV1 {
  const helperName = platform === "win32" ? "ty-context-host-helper.exe" : "ty-context-host-helper";
  const adminName = platform === "win32" ? "ty-context-host-admin.exe" : "ty-context-host-admin";
  const installerUiName = platform === "win32" ? "ty-context-host-installer-ui.exe" : "ty-context-host-installer-ui";
  const unixManaged = platform === "win32" ? "/opt/openai/codex/managed-hooks/ty-context" : managed;
  const windowsManaged = platform === "win32" ? managed : "C:\\Program Files\\OpenAI\\Codex\\ManagedHooks\\ty-context";
  return {
    platform,
    requirements_file: requirements,
    managed_dir: managed,
    unix_managed_dir: unixManaged,
    windows_managed_dir: windowsManaged,
    state_root: state,
    endpoint,
    node_path: node,
    unix_node_path: platform === "win32" ? "/usr/bin/node" : node,
    hook_path: path.join(managed, "long-task-hook.mjs"),
    worker_path: path.join(managed, "ty-context-host-worker.mjs"),
    helper_path: path.join(managed, helperName),
    admin_path: path.join(managed, adminName),
    installer_ui_path: path.join(managed, installerUiName),
    release_manifest_path: path.join(managed, "host-release-manifest.json"),
    release_signature_path: path.join(managed, "host-release-manifest.sig"),
    release_root_public_key_path: path.join(managed, "host-release-root-public.pem"),
    attestation_public_key_path: path.join(managed, "host-service-public.pem"),
    service_config_path: path.join(managed, "host-service-config.json")
  };
}
