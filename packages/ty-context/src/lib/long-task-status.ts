import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type { CurrentStatusV2, VerificationRunResultV2 } from "./long-task-run-result.js";

export async function writeLongTaskStatus(workdir: string, run: VerificationRunResultV2): Promise<CurrentStatusV2> { const blocked = run.spec_results.some((item) => item.status === "blocked") && run.spec_results.every((item) => item.status !== "failed") && run.findings.length === 0; const status: CurrentStatusV2 = { schema_version: "long-task-current-status-v2", workflow_status: blocked ? "externally_blocked" : "needs_work", contract_sha256: run.contract_sha256, latest_run_id: run.run_id, findings: run.findings }; await atomic(path.join(workdir, "current-status.json"), status); return status; }
export async function readLongTaskStatus(workdir: string): Promise<CurrentStatusV2> { const result = JSON.parse(await readFile(path.join(workdir, "current-status.json"), "utf8")) as CurrentStatusV2; if (result.schema_version !== "long-task-current-status-v2" || !["needs_work","externally_blocked"].includes(result.workflow_status)) throw new Error("Invalid current-status.json"); return result; }
export async function atomic(file: string, value: unknown): Promise<void> { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.tmp-${process.pid}-${Date.now()}`; await writeFile(temporary, canonicalJson(value), { flag: "wx" }); await rename(temporary, file); }
