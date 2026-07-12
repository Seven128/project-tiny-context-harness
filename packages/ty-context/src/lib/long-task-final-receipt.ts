import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { FinalResultV3 } from "./long-task-run-result.js";
import { atomic } from "./long-task-status.js";

interface FinalResultReceiptV3 {
  schema_version: "long-task-final-result-receipt-v3";
  repository_root: string;
  workdir: string;
  contract_sha256: string;
  run_id: string;
  workflow_status: FinalResultV3["workflow_status"];
  final_snapshot_sha256: string;
  result_sha256: string;
}

const RECEIPT = "ty-context-final-result-receipt.json";

export async function writeLongTaskFinalAuthority(contract: CompiledContractV3, workdir: string, result: FinalResultV3): Promise<void> {
  const resultFile = path.join(workdir, "final-result.json");
  await atomic(resultFile, result);
  const resultSha256 = sha256Hex(await readFile(resultFile));
  const receipt: FinalResultReceiptV3 = {
    schema_version: "long-task-final-result-receipt-v3",
    repository_root: contract.repository_root,
    workdir: contract.workdir,
    contract_sha256: contract.contract_sha256,
    run_id: result.run_id,
    workflow_status: result.workflow_status,
    final_snapshot_sha256: result.final_snapshot_sha256,
    result_sha256: resultSha256
  };
  for (const file of await receiptFiles(contract.repository_root)) await atomic(file, receipt);
}

export async function assertLongTaskFinalAuthority(contract: CompiledContractV3, resultText: string, result: FinalResultV3): Promise<void> {
  const receipts = await Promise.all((await receiptFiles(contract.repository_root)).map(readReceipt));
  if (canonicalJson(receipts[0]) !== canonicalJson(receipts[1])) invalid("receipt_mismatch");
  const receipt = receipts[0];
  if (
    receipt.repository_root !== contract.repository_root
    || receipt.workdir !== contract.workdir
    || receipt.contract_sha256 !== contract.contract_sha256
    || receipt.run_id !== result.run_id
    || receipt.workflow_status !== result.workflow_status
    || receipt.final_snapshot_sha256 !== result.final_snapshot_sha256
    || receipt.result_sha256 !== sha256Hex(Buffer.from(resultText, "utf8"))
  ) invalid("result_mismatch");
}

export async function invalidateLongTaskFinalAuthority(repositoryRoot: string, workdir: string): Promise<void> {
  const files = [path.join(workdir, "final-result.json"), ...(await receiptFiles(repositoryRoot))];
  await Promise.all(files.map((file) => rm(file, { force: true })));
}

async function readReceipt(file: string): Promise<FinalResultReceiptV3> {
  let value: unknown;
  try { value = JSON.parse(await readFile(file, "utf8")); }
  catch { invalid("receipt_missing_or_invalid"); }
  if (!isReceipt(value)) invalid("receipt_invalid");
  return value;
}

function isReceipt(value: unknown): value is FinalResultReceiptV3 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.schema_version === "long-task-final-result-receipt-v3"
    && typeof item.repository_root === "string"
    && typeof item.workdir === "string"
    && typeof item.contract_sha256 === "string"
    && typeof item.run_id === "string"
    && (item.workflow_status === "accepted" || item.workflow_status === "needs_work")
    && typeof item.final_snapshot_sha256 === "string"
    && typeof item.result_sha256 === "string";
}

async function receiptFiles(repositoryRoot: string): Promise<string[]> {
  return [path.join(repositoryRoot, ".codex", RECEIPT), path.join(await gitDirectory(repositoryRoot), RECEIPT)];
}

async function gitDirectory(repositoryRoot: string): Promise<string> {
  const marker = path.join(repositoryRoot, ".git");
  const info = await stat(marker);
  if (info.isDirectory()) return marker;
  if (!info.isFile()) throw new Error("final_result_receipt_unavailable:git_marker");
  const match = (await readFile(marker, "utf8")).trim().match(/^gitdir:\s*(.+)$/i);
  if (!match) throw new Error("final_result_receipt_unavailable:gitdir");
  return path.resolve(repositoryRoot, match[1]);
}

function invalid(reason: string): never {
  throw new Error(`final_result_receipt_invalid:${reason}`);
}
