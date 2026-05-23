import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { listFiles, pathExists, readText } from "./fs.js";
import { parseYaml } from "./yaml.js";

const execFileAsync = promisify(execFile);

export interface ValidatorReport {
  info: string[];
  errors: string[];
}

type Validator = (projectRoot: string) => Promise<ValidatorReport>;

const validators: Record<string, Validator> = {
  "validate-harness": validateHarness,
  "validate-current": validateCurrent,
  "validate-pm": validatePm,
  "validate-design": validateDesign,
  "validate-dev": validateDev,
  "validate-checkpoint": validateCheckpoint
};

export async function runValidator(projectRoot: string, gate: string): Promise<ValidatorReport> {
  const normalized = normalizeGate(gate);
  const validator = validators[normalized];
  if (!validator) {
    return { info: [], errors: [`unknown validator: ${gate}`] };
  }
  return validator(projectRoot);
}

function normalizeGate(gate: string): string {
  return gate.replace(/^make\s+/, "").trim();
}

async function validateHarness(projectRoot: string): Promise<ValidatorReport> {
  const errors: string[] = [];
  for (const required of [
    "AGENTS.md",
    ".docs/INDEX.md",
    ".harness/config.yaml",
    ".harness/state/lifecycle.yaml",
    ".harness/state/tasks.yaml",
    ".harness/agents/skills",
    ".harness/managed/templates",
    ".harness/managed/policies",
    ".agents/skills"
  ]) {
    if (!(await pathExists(path.join(projectRoot, required)))) {
      errors.push(`missing ${required}`);
    }
  }
  return { info: [`validate-harness checked ${projectRoot}`], errors };
}

async function validateCurrent(projectRoot: string): Promise<ValidatorReport> {
  const lifecycle = await readYamlObject(path.join(projectRoot, ".harness/state/lifecycle.yaml"));
  const current = String(lifecycle.current_phase ?? "");
  const gateByPhase: Record<string, string> = {
    REQUIREMENT_GATHERING: "validate-pm",
    ARCHITECTING: "validate-design",
    SPRINTING: "validate-dev"
  };
  return runValidator(projectRoot, gateByPhase[current] ?? "validate-harness");
}

async function validatePm(projectRoot: string): Promise<ValidatorReport> {
  const docs = await markdownFiles(path.join(projectRoot, ".docs/01_product"));
  const text = await combinedText(docs);
  const errors: string[] = [];
  if (docs.length === 0) errors.push("No PRD deliverables found");
  if (!containsAny(text, ["acceptance", "验收"])) errors.push("PRD must include acceptance criteria");
  if (!containsAny(text, ["out of scope", "不做", "边界"])) errors.push("PRD must include out-of-scope boundaries");
  if (!containsAny(text, ["open questions", "未决", "待确认"])) errors.push("PRD must include open questions");
  return { info: [`validate-pm checked ${docs.length} file(s)`], errors };
}

async function validateDesign(projectRoot: string): Promise<ValidatorReport> {
  const architecture = await markdownFiles(path.join(projectRoot, ".docs/02_architecture"));
  const techPlan = await markdownFiles(path.join(projectRoot, ".docs/03_tech_plan"));
  const text = await combinedText([...architecture, ...techPlan]);
  const errors: string[] = [];
  if (architecture.length === 0) errors.push("No architecture deliverables found");
  if (techPlan.length === 0) errors.push("No technical plan deliverables found");
  if (!containsAny(text, ["prd", "requirement", "需求"])) errors.push("Design must cite product requirements");
  if (!containsAny(text, ["api", "interface", "接口", "contract", "契约"])) errors.push("Design must describe interfaces or contracts");
  if (!containsAny(text, ["task", "任务", "breakdown"])) errors.push("Design must include task breakdown");
  return { info: [`validate-design checked ${architecture.length + techPlan.length} file(s)`], errors };
}

async function validateDev(projectRoot: string): Promise<ValidatorReport> {
  const errors: string[] = [];
  const tasksData = await readYamlObject(path.join(projectRoot, ".harness/state/tasks.yaml"));
  const tasks = Array.isArray(tasksData.tasks) ? (tasksData.tasks as Array<Record<string, unknown>>) : [];
  if (tasks.length === 0) errors.push("tasks.yaml must contain at least one task");
  const open = tasks.filter((task) => ["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status)));
  if (open.length > 0) errors.push(`Open tasks remain: ${open.map((task) => task.id).join(", ")}`);
  for (const task of tasks.filter((task) => task.status === "done")) {
    if (task.gate_result !== "PASS") errors.push(`Done task ${task.id} must have gate_result PASS`);
    const implementationDoc = String(task.implementation_doc ?? "");
    if (implementationDoc && !(await pathExists(path.join(projectRoot, implementationDoc)))) {
      errors.push(`Implementation doc missing for ${task.id}: ${implementationDoc}`);
    }
  }
  return { info: [`validate-dev checked ${tasks.length} task(s)`], errors };
}

async function validateCheckpoint(projectRoot: string): Promise<ValidatorReport> {
  const tasksData = await readYamlObject(path.join(projectRoot, ".harness/state/tasks.yaml"));
  const tasks = Array.isArray(tasksData.tasks) ? (tasksData.tasks as Array<Record<string, unknown>>) : [];
  const required = tasks.filter((task) => Boolean(task.checkpoint_required) || task.status === "blocked");
  const errors: string[] = [];
  for (const task of required) {
    const checkpoint = String(task.checkpoint ?? "");
    if (!checkpoint || !(await pathExists(path.join(projectRoot, checkpoint)))) {
      errors.push(`${task.id} checkpoint file does not exist: ${checkpoint}`);
    }
  }
  return { info: required.length ? [`validate-checkpoint checked ${required.length} required checkpoint(s)`] : ["Checkpoint not required"], errors };
}

async function readYamlObject(filePath: string): Promise<Record<string, unknown>> {
  if (!(await pathExists(filePath))) return {};
  return (parseYaml(await readText(filePath)) ?? {}) as Record<string, unknown>;
}

async function markdownFiles(root: string): Promise<string[]> {
  const files = await listFiles(root);
  return files.filter((file) => file.endsWith(".md") && !file.endsWith("overview.md"));
}

async function combinedText(files: string[]): Promise<string> {
  const parts = await Promise.all(files.map((file) => readText(file)));
  return parts.join("\n").toLowerCase();
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

export async function changedFiles(projectRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: projectRoot });
    return stdout
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
