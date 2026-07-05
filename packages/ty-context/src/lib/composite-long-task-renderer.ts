import { createHash } from "node:crypto";
import path from "node:path";
import { CANONICAL_CORE_PACKAGE } from "./constants.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { packageAssetPath, packageRoot } from "./paths.js";

const SOURCE_ASSET =
  "packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md";

const REQUIRED_SOURCE_FILES = [
  "product-architecture-source.md",
  "technical-realization-plan.md",
  "acceptance-checklist.md"
] as const;

export interface CompositeLongTaskGoalRenderResult {
  workdir: string;
  protocolPath: string;
  protocolSha256: string;
  executionBindingPath: string;
  goalObjectivePath: string;
  goalObjectiveLength: number;
}

export async function renderCompositeLongTaskGoal(workdir: string): Promise<CompositeLongTaskGoalRenderResult> {
  const resolvedWorkdir = path.resolve(workdir);
  await assertReadyWorkdir(resolvedWorkdir);

  const protocolBody = ensureTrailingNewline(
    normalizeNewlines(await readText(packageAssetPath("skills", "composite-long-task-workflow", "references", "composite-long-task-workflow-protocol.md")))
  );
  const protocolSha256 = sha256(protocolBody);
  const protocolVersion = await packageVersion();
  const protocolSnapshot = [
    "protocol_name: composite-long-task-workflow",
    `protocol_version: ${protocolVersion}`,
    `protocol_sha256: ${protocolSha256}`,
    `generated_at: ${new Date().toISOString()}`,
    `source_asset: ${SOURCE_ASSET}`,
    "---",
    protocolBody.trimEnd()
  ].join("\n") + "\n";

  const protocolPath = path.join(resolvedWorkdir, "workflow-protocol.md");
  await writeTextIfChanged(protocolPath, protocolSnapshot);

  const executionBinding = await renderExecutionBinding(resolvedWorkdir, protocolSha256);
  const executionBindingPath = path.join(resolvedWorkdir, "execution-binding.md");
  await writeTextIfChanged(executionBindingPath, executionBinding);

  const goalObjective = await renderGoalObjective(workdirForPrompt(resolvedWorkdir));
  if (goalObjective.length > 3850) {
    throw new Error(`goal-objective.txt exceeds 3850 characters (${goalObjective.length})`);
  }
  if (/^\/goal\s+read\s+\S+\s*\.?$/i.test(goalObjective.trim())) {
    throw new Error("goal-objective.txt must not be a single read-file pointer");
  }
  const goalObjectivePath = path.join(resolvedWorkdir, "goal-objective.txt");
  await writeTextIfChanged(goalObjectivePath, goalObjective);

  return {
    workdir: resolvedWorkdir,
    protocolPath,
    protocolSha256,
    executionBindingPath,
    goalObjectivePath,
    goalObjectiveLength: goalObjective.length
  };
}

async function assertReadyWorkdir(workdir: string): Promise<void> {
  for (const sourceFile of REQUIRED_SOURCE_FILES) {
    const sourcePath = path.join(workdir, sourceFile);
    if (!(await pathExists(sourcePath))) {
      throw new Error(`render-goal requires ${sourceFile}; provide the three input files first`);
    }
  }
  const statePath = path.join(workdir, "task-state.json");
  if (!(await pathExists(statePath))) {
    throw new Error("render-goal requires task-state.json; run ty-context composite-long-task init/compile before render-goal");
  }
  const state = JSON.parse(await readText(statePath)) as {
    graph?: { plan_items?: Record<string, unknown>; acceptance_criteria?: Record<string, unknown> };
  };
  const planItemCount = Object.keys(state.graph?.plan_items ?? {}).length;
  const acceptanceCriteriaCount = Object.keys(state.graph?.acceptance_criteria ?? {}).length;
  if (planItemCount === 0 || acceptanceCriteriaCount === 0) {
    throw new Error("render-goal requires compiled task-state.json; run ty-context composite-long-task compile before render-goal");
  }
}

async function renderExecutionBinding(workdir: string, protocolSha256: string): Promise<string> {
  return renderTemplateAsset(["skills", "composite-long-task-workflow", "assets", "execution-binding.template.md"], {
    workdir: path.normalize(workdir),
    protocol_sha256: protocolSha256
  });
}

async function renderGoalObjective(workdir: string): Promise<string> {
  return renderTemplateAsset(["skills", "composite-long-task-workflow", "assets", "goal-objective.template.md"], {
    workdir
  });
}

async function packageVersion(): Promise<string> {
  const packageJson = JSON.parse(await readText(path.join(packageRoot(), "package.json"))) as { version?: string };
  return packageJson.version ?? "unknown";
}

function workdirForPrompt(workdir: string): string {
  const cwd = process.cwd();
  const relative = path.relative(cwd, workdir);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return workdir.replace(/\\/g, "/");
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function ensureTrailingNewline(value: string): string {
  return `${value.trimEnd()}\n`;
}

async function renderTemplateAsset(segments: string[], values: Record<string, string>): Promise<string> {
  let rendered = normalizeNewlines(await readText(packageAssetPath(...segments)));
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return ensureTrailingNewline(rendered);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const COMPOSITE_LONG_TASK_WORKFLOW_SKILL_NAME = "composite-long-task-workflow";
export const COMPOSITE_LONG_TASK_PUBLIC_COMMAND = "composite-long-task";
export const COMPOSITE_LONG_TASK_PACKAGE = CANONICAL_CORE_PACKAGE;
