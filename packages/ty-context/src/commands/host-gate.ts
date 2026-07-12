import path from "node:path";
import { canonicalJson } from "../lib/composite-campaign-codec.js";
import { installManagedHostReleaseV1, uninstallManagedHostReleaseV1 } from "../lib/long-task-host-installer.js";
import { managedHostLayout, managedHostLayoutUnder } from "../lib/long-task-managed-host-layout.js";
import { materializeHostReleaseSourceV1 } from "../lib/long-task-host-release-archive.js";

interface HostGateCommandDependencies {
  test_root?: string;
  test_admin?: boolean;
  write?: (value: string) => void;
}

export async function hostGate(args: string[], dependencies: HostGateCommandDependencies = {}): Promise<void> {
  const command = args[0] ?? "help";
  if (command === "help") { help(dependencies.write); return; }
  const isolated = dependencies.test_root !== undefined || dependencies.test_admin !== undefined;
  if (isolated && (!dependencies.test_root || dependencies.test_admin !== true)) throw new Error("host_gate_test_namespace_invalid");
  const layout = dependencies.test_root ? managedHostLayoutUnder(dependencies.test_root, process.platform) : managedHostLayout(process.platform);
  if (command === "install") {
    const release = exactOption(args, 1, "--release", "host_gate_release_required");
    const codexLauncher = exactOption(args, 3, "--codex-launcher", "host_gate_codex_launcher_required");
    if (args.length !== 5) throw new Error("host_gate_install_arguments_invalid");
    if (!path.isAbsolute(release)) throw new Error("host_gate_release_path_absolute_required");
    if (!path.isAbsolute(codexLauncher)) throw new Error("host_gate_codex_launcher_absolute_required");
    const materialized = await materializeHostReleaseSourceV1(release);
    try {
      write(await installManagedHostReleaseV1({
        source: materialized.root,
        layout,
        codex_launcher_path: codexLauncher,
        test_admin: dependencies.test_admin
      }), dependencies.write);
    } finally {
      await materialized.cleanup();
    }
    return;
  }
  if (command === "uninstall") {
    if (args.length !== 1) throw new Error("host_gate_uninstall_arguments_invalid");
    write(await uninstallManagedHostReleaseV1({ layout, test_admin: dependencies.test_admin }), dependencies.write);
    return;
  }
  throw new Error("host_gate_command_invalid");
}

function exactOption(args: string[], index: number, name: string, missing: string): string {
  if (args[index] !== name || !args[index + 1]) throw new Error(missing);
  return args[index + 1]!;
}

function write(value: unknown, destination: HostGateCommandDependencies["write"]): void {
  const text = canonicalJson(value);
  if (destination) destination(text); else console.log(text);
}

function help(destination?: (value: string) => void): void {
  const value = "ty-context host-gate commands:\n  install --release <absolute-directory-or-tgz> --codex-launcher <absolute-path>\n  uninstall";
  if (destination) destination(value); else console.log(value);
}
