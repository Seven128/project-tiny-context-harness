import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readCompiledLongTaskContract } from "./long-task-contract-compiler.js";

export async function renderLongTaskGoal(workdir: string): Promise<string> {
  const contract = await readCompiledLongTaskContract(workdir);
  let status = "needs_work";
  let next = `ty-context composite-long-task verify ${quote(workdir)}`;
  try {
    const current = JSON.parse(
      await readFile(path.join(workdir, "current-status.json"), "utf8"),
    ) as {
      workflow_status?: string;
      findings?: Array<{ next_action?: string }>;
    };
    status = current.workflow_status ?? status;
    next = current.findings?.[0]?.next_action ?? next;
  } catch {}
  const value = `Composite Long-Task Workflow Contract V3\n\nWorkdir: ${path.resolve(workdir)}\nContract: ${contract.contract_sha256}\nAuthorities: product-architecture-source.yaml, technical-realization-plan.yaml, acceptance-checklist.yaml\nOnly legal terminal state: accepted\nCurrent status: ${status}\nNext action: ${next}\nRule: needs_work is internal and must continue; only a fresh accepted final result permits completion.\n`;
  await writeFile(path.join(workdir, "goal-objective.txt"), value);
  return value;
}
function quote(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
