import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./composite-campaign-codec.js";
import type {
  CurrentStatusV3,
  VerificationRunResultV2,
} from "./long-task-run-result.js";

export async function writeLongTaskStatus(
  workdir: string,
  run: VerificationRunResultV2,
): Promise<CurrentStatusV3> {
  const status: CurrentStatusV3 = {
    schema_version: "long-task-current-status-v3",
    workflow_status: "needs_work",
    acceptance_authorized: false,
    verification_scope: run.verification_scope,
    contract_sha256: run.contract_sha256,
    latest_run_id: run.run_id,
    findings: run.findings,
  };
  await atomic(path.join(workdir, "current-status.json"), status);
  return status;
}
export async function readLongTaskStatus(
  workdir: string,
): Promise<CurrentStatusV3> {
  const result = JSON.parse(
    await readFile(path.join(workdir, "current-status.json"), "utf8"),
  ) as CurrentStatusV3;
  if (
    result.schema_version !== "long-task-current-status-v3" ||
    result.workflow_status !== "needs_work" ||
    result.acceptance_authorized !== false ||
    ![
      "targeted_repair",
      "impact_repair",
      "full_repair",
      "full_acceptance",
    ].includes(result.verification_scope)
  )
    throw new Error("Invalid current-status.json");
  return result;
}
export async function atomic(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, canonicalJson(value), { flag: "wx" });
  await rename(temporary, file);
}
