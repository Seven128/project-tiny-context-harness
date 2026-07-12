import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileAndSealLongTaskContractViaHost, finalGateLongTaskViaHost, verifyLongTaskViaHost } from "../lib/long-task-host-client.js";
import { renderLongTaskGoal } from "../lib/long-task-goal.js";
import { LONG_TASK_SOURCE_FILES } from "../lib/long-task-contract-schema.js";
import { readLongTaskStatus } from "../lib/long-task-status.js";
import { assertLongTaskHostGate } from "../lib/long-task-hook-preflight.js";

export async function compositeLongTask(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help"; if (subcommand === "help") { help(); return; } const workdirArg = args[1]; if (!workdirArg) throw new Error(`${subcommand} requires <workdir>`); const workdir = path.resolve(process.cwd(), workdirArg);
  if (subcommand === "init") { await assertLongTaskHostGate(process.cwd()); await initialize(workdir); console.log(`initialized composite long-task Contract V3 at ${workdirArg}`); return; }
  if (subcommand === "compile") { await assertLongTaskHostGate(process.cwd(),{workdir,allow_existing_authority:true}); const { summary } = await compileAndSealLongTaskContractViaHost(workdir); console.log(`compiled contract=${summary.contract_sha256} registry=${summary.registry_id} requirements=${summary.counts.requirements} plan_items=${summary.counts.plan_items} obligations=${summary.counts.obligations} bindings=${summary.counts.bindings} acs=${summary.counts.acceptance_criteria} proofs=${summary.counts.proof_requirements} specs=${summary.counts.verification_specs}`); return; }
  if (subcommand === "verify") { const spec = option(args, "--spec"); rejectUnknown(args.slice(2), spec ? ["--spec", spec] : []); const result = await verifyLongTaskViaHost(workdir, spec ? [spec] : undefined); console.log(JSON.stringify(result)); if (result.findings_count > 0) process.exitCode = 1; return; }
  if (subcommand === "status") { rejectUnknown(args.slice(2), []); console.log(JSON.stringify(await readLongTaskStatus(workdir), null, 2)); return; }
  if (subcommand === "final-gate") { rejectUnknown(args.slice(2), []); const result = await finalGateLongTaskViaHost(workdir); console.log(JSON.stringify(result)); if (result.workflow_status !== "accepted") process.exitCode = 1; return; }
  if (subcommand === "render-goal") { rejectUnknown(args.slice(2), []); console.log(await renderLongTaskGoal(workdir)); return; }
  if (subcommand === "stop-check") { const { stopCheckLongTask } = await import("../lib/long-task-stop-check.js"); const message = option(args, "--message") ?? ""; rejectUnknown(args.slice(2), message ? ["--message", message] : []); console.log(JSON.stringify(await stopCheckLongTask(workdir, message))); return; }
  throw new Error(`Unknown composite-long-task subcommand: ${subcommand}`);
}

async function initialize(workdir: string): Promise<void> { await mkdir(workdir, { recursive: true }); for (const file of Object.values(LONG_TASK_SOURCE_FILES)) { const target = path.join(workdir, file); try { await writeFile(target, template(file), { flag: "wx" }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; } } }
function template(file: string): string { if (file.startsWith("product")) return "schema_version: product-source-v3\nproduct_goal: TODO\ndelivery_scope: system_capability_build\nfull_population_required: false\nowner_surfaces: []\nrequirements: []\nboundaries: []\nnon_completing_outcomes: []\npopulation_exclusion_rules: []\nrepresentative_samples_validate: []\nrepresentative_samples_do_not_validate: []\nout_of_scope_backlog: []\n"; if (file.startsWith("technical")) return "schema_version: technical-plan-v3\nplan_items: []\ncounterfactual_controls: []\n"; return "schema_version: acceptance-checklist-v3\ncounterexample_fixtures: []\nproof_requirements: []\nacceptance_criteria: []\nverification_specs: []\nenvironment_probes: []\n"; }
function option(args: string[], key: string): string | undefined { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : undefined; }
function rejectUnknown(actual: string[], allowed: string[]): void { if (actual.join("\0") !== allowed.join("\0")) throw new Error(`Unknown or injected arguments: ${actual.join(" ")}`); }
function help(): void { console.log(`ty-context composite-long-task commands:\n  init <workdir>\n  compile <workdir>\n  verify <workdir> [--spec <verification-spec-id>]\n  status <workdir>\n  final-gate <workdir>\n  stop-check <workdir> [--message <text>]\n  render-goal <workdir>`); }
