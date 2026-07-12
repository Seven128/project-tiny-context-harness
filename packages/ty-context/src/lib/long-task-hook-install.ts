import type { SyncReport } from "./sync-engine.js";

/**
 * Project sync deliberately does not install completion Hooks. Composite V3 uses
 * only the administrator-installed, signed managed Host Gate.
 */
export async function installLongTaskHooks(_projectRoot: string, report: SyncReport): Promise<void> {
  report.skipped.push("managed Host Gate is installed at the system level; no project Hook was written");
}
