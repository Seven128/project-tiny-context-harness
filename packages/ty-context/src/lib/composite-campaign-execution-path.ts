import { lstat, mkdir, mkdtemp, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";

export async function resolveCompositeCampaignExecutionPath(
  projectRoot: string,
  workdir: string
): Promise<{ project_root: string; final_path: string; parent_path: string }> {
  const project = await realpath(path.resolve(projectRoot));
  const relative = workdir.replace(/\/$/, "").split("/");
  if (relative.some((component) => !component || component === "." || component === "..")) {
    throw new Error("Composite campaign execution workdir must be one canonical project-relative path");
  }
  const finalPath = path.join(project, ...relative);
  if (!isInside(project, finalPath)) throw new Error("Composite campaign execution workdir escapes the project root");
  const parent = path.dirname(finalPath);
  await ensureSafeDirectoryTree(project, parent);
  await assertExistingPathSafe(project, parent);
  return { project_root: project, final_path: finalPath, parent_path: parent };
}

export async function resolveExistingCompositeCampaignExecutionPath(
  projectRoot: string,
  workdir: string
): Promise<{ project_root: string; final_path: string; parent_path: string }> {
  const project = await realpath(path.resolve(projectRoot));
  const relative = workdir.replace(/\/$/, "").split("/");
  if (relative.some((component) => !component || component === "." || component === "..")) {
    throw new Error("Composite campaign execution workdir must be one canonical project-relative path");
  }
  const finalPath = path.join(project, ...relative);
  if (!isInside(project, finalPath)) throw new Error("Composite campaign execution workdir escapes the project root");
  const metadata = await lstat(finalPath);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Composite campaign execution workdir is not a safe directory");
  }
  await assertExistingPathSafe(project, finalPath);
  return { project_root: project, final_path: finalPath, parent_path: path.dirname(finalPath) };
}

export async function compositeCampaignExecutionChildFile(
  projectRoot: string,
  workdir: string,
  fileName: string
): Promise<string> {
  if (!/^[a-z0-9][a-z0-9.-]{0,127}$/.test(fileName)) {
    throw new Error("Composite campaign execution child filename is unsafe");
  }
  const target = path.join(workdir, fileName);
  if (!isInside(workdir, target)) throw new Error("Composite campaign execution child escapes its workdir");
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`Composite campaign execution ${fileName} must be a regular file`);
  }
  await assertExistingPathSafe(projectRoot, target);
  if (!isInside(workdir, await realpath(target))) {
    throw new Error(`Composite campaign execution ${fileName} realpath escapes its workdir`);
  }
  return target;
}

export async function createCompositeCampaignExecutionStage(
  paths: Awaited<ReturnType<typeof resolveCompositeCampaignExecutionPath>>,
  prefix: string
): Promise<string> {
  const stage = await mkdtemp(path.join(paths.parent_path, `.${prefix}.handoff-`));
  await assertExistingPathSafe(paths.project_root, stage);
  return stage;
}

export async function publishCompositeCampaignExecutionStage(stage: string, finalPath: string, projectRoot: string): Promise<void> {
  await assertExistingPathSafe(projectRoot, stage);
  await assertMissingOrSafeDirectory(projectRoot, finalPath);
  await rename(stage, finalPath);
  await assertExistingPathSafe(projectRoot, finalPath);
}

export async function removeCompositeCampaignExecutionStage(stage: string, projectRoot: string): Promise<void> {
  if (!isInside(projectRoot, stage) || !path.basename(stage).includes(".handoff-")) {
    throw new Error("Refusing to remove an unowned composite campaign handoff stage");
  }
  try {
    const metadata = await lstat(stage);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("Composite campaign handoff stage is not an owned regular directory");
    }
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  await assertExistingPathSafe(projectRoot, stage);
  await rm(stage, { recursive: true, force: false });
}

export async function removeOwnedCompositeCampaignExecutionWorkdir(target: string, projectRoot: string): Promise<void> {
  if (!isInside(projectRoot, target) || !/^SFC-\d{3}-r\d+$/.test(path.basename(target))) {
    throw new Error("Refusing to remove an unowned composite campaign execution workdir");
  }
  const metadata = await lstat(target);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Composite campaign execution workdir is not an owned regular directory");
  }
  await assertExistingPathSafe(projectRoot, target);
  await rm(target, { recursive: true, force: false });
}

export async function compositeCampaignExecutionDirectoryExists(projectRoot: string, target: string): Promise<boolean> {
  try {
    const metadata = await lstat(target);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("Composite campaign execution workdir is not a safe directory");
    await assertExistingPathSafe(projectRoot, target);
    return true;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}

async function ensureSafeDirectoryTree(root: string, target: string): Promise<void> {
  let current = root;
  for (const component of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      await mkdir(current);
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
    }
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Composite campaign execution path contains an unsafe component: ${current}`);
    }
  }
}

async function assertExistingPathSafe(root: string, target: string): Promise<void> {
  if (!isInside(root, target)) throw new Error("Composite campaign execution path escapes the project root");
  let current = root;
  for (const component of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) throw new Error(`Composite campaign execution path contains a symbolic link: ${current}`);
  }
  if (!isInside(root, await realpath(target))) throw new Error("Composite campaign execution realpath escapes the project root");
}

async function assertMissingOrSafeDirectory(root: string, target: string): Promise<void> {
  try {
    const metadata = await lstat(target);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("Composite campaign execution target is unsafe");
    await assertExistingPathSafe(root, target);
    throw new Error("Composite campaign execution target already exists");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function hasCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
