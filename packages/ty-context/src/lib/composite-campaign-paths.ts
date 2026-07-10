import path from "node:path";
import { lstat, realpath } from "node:fs/promises";
import { harnessRoot } from "./harness-root.js";
import { validatePortablePathComponent } from "./composite-campaign-path-component.js";
import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import type { CompositeSfcIdV1 } from "./composite-campaign-types.js";

export { validatePortablePathComponent } from "./composite-campaign-path-component.js";
export { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";

export interface CompositeCampaignRevisionFiles {
  authoring_packet: string;
  product_architecture_source: string;
  technical_realization_plan: string;
  acceptance_checklist: string;
}

export interface CompositeCampaignPaths {
  harness_root: string;
  campaigns_root: string;
  campaign_root: string;
  manifest_path: string;
  request_path: string;
  events_path: string;
  revision_path(sliceId: CompositeSfcIdV1 | string, revision: number): string;
  revision_files(sliceId: CompositeSfcIdV1 | string, revision: number): CompositeCampaignRevisionFiles;
}

export interface CompositeCampaignBasePaths {
  project_root: string;
  harness_root: string;
  composite_root: string;
  campaigns_root: string;
}

export function formatCompositeCampaignRevision(revision: number): string {
  if (!Number.isInteger(revision) || revision <= 0) {
    throw new Error("Composite campaign revision must be a positive integer");
  }
  if (revision > 9999) {
    throw new Error("Composite campaign revision must fit the four-digit revision directory format");
  }
  return String(revision).padStart(4, "0");
}

export async function resolveCompositeCampaignBasePaths(projectRoot: string): Promise<CompositeCampaignBasePaths> {
  const roots = await resolveCampaignRoots(projectRoot);
  return {
    project_root: roots.projectRoot,
    harness_root: roots.harnessRoot,
    composite_root: path.join(roots.harnessRoot, "composite-long-task"),
    campaigns_root: roots.campaignsRoot
  };
}

export async function resolveCompositeCampaignPaths(
  projectRoot: string,
  campaignId: string,
  suppliedCampaignPath?: string
): Promise<CompositeCampaignPaths> {
  const id = validateCompositeCampaignId(campaignId);
  const roots = await resolveCampaignRoots(projectRoot);
  const campaignRoot = path.join(roots.campaignsRoot, id);
  if (suppliedCampaignPath !== undefined) {
    const supplied = path.resolve(roots.projectRoot, suppliedCampaignPath);
    const relative = path.relative(roots.campaignsRoot, supplied);
    if (relative !== id) {
      throw new Error(`Supplied campaign path must be the exact direct child for campaign ID ${id}`);
    }
  }
  await assertSafeFromRoots(roots, campaignRoot);
  await assertExistingDirectory(campaignRoot, "Composite campaign root");
  const revisionPath = (sliceId: CompositeSfcIdV1 | string, revision: number) => path.join(
    campaignRoot,
    "slices",
    validateCompositeSfcId(sliceId),
    "revisions",
    formatCompositeCampaignRevision(revision)
  );
  return {
    harness_root: roots.harnessRoot,
    campaigns_root: roots.campaignsRoot,
    campaign_root: campaignRoot,
    manifest_path: path.join(campaignRoot, "campaign.yaml"),
    request_path: path.join(campaignRoot, "request.md"),
    events_path: path.join(campaignRoot, "events.ndjson"),
    revision_path: revisionPath,
    revision_files: (sliceId, revision) => {
      const root = revisionPath(sliceId, revision);
      return {
        authoring_packet: path.join(root, "authoring-packet.json"),
        product_architecture_source: path.join(root, "product-architecture-source.md"),
        technical_realization_plan: path.join(root, "technical-realization-plan.md"),
        acceptance_checklist: path.join(root, "acceptance-checklist.md")
      };
    }
  };
}

export async function assertCompositeCampaignPathSafe(projectRoot: string, targetPath: string): Promise<string> {
  const roots = await resolveCampaignRoots(projectRoot);
  const target = path.resolve(roots.projectRoot, targetPath);
  await assertSafeFromRoots(roots, target);
  return target;
}

interface CampaignRoots {
  projectRoot: string;
  harnessRoot: string;
  campaignsRoot: string;
  realCampaignsRoot: string | null;
}

async function resolveCampaignRoots(projectRoot: string): Promise<CampaignRoots> {
  let canonicalProject: string;
  try {
    canonicalProject = await realpath(path.resolve(projectRoot));
  } catch {
    throw new Error(`Composite campaign project root must be an existing directory: ${projectRoot}`);
  }
  if (!(await lstat(canonicalProject)).isDirectory()) {
    throw new Error(`Composite campaign project root must be an existing directory: ${projectRoot}`);
  }
  const configured = await harnessRoot(canonicalProject);
  assertSafeConfiguredHarness(configured);
  const configuredHarness = path.resolve(canonicalProject, configured);
  if (!isInside(canonicalProject, configuredHarness)) {
    throw new Error("Configured harness path must remain inside the real project root containment boundary");
  }
  await rejectExistingLinks(canonicalProject, configuredHarness, "configured harness");
  await assertExistingDirectory(configuredHarness, "Configured harness root");
  await assertExistingRealContainment(canonicalProject, configuredHarness, "configured harness");
  const compositeRoot = path.join(configuredHarness, "composite-long-task");
  const campaignsRoot = path.join(compositeRoot, "campaigns");
  await rejectExistingLinks(canonicalProject, campaignsRoot, "configured harness");
  await assertExistingDirectory(compositeRoot, "Composite long-task root");
  await assertExistingDirectory(campaignsRoot, "Composite campaign root");
  const realCampaignsRoot = await realpathIfExisting(campaignsRoot);
  if (realCampaignsRoot && !isInside(canonicalProject, realCampaignsRoot)) {
    throw new Error("Configured harness campaign base escapes real project containment");
  }
  return { projectRoot: canonicalProject, harnessRoot: configuredHarness, campaignsRoot, realCampaignsRoot };
}

async function assertSafeFromRoots(roots: CampaignRoots, target: string): Promise<void> {
  if (!isInside(roots.campaignsRoot, target)) {
    throw new Error("Composite campaign path is outside the configured campaign base containment boundary");
  }
  for (const component of path.relative(roots.campaignsRoot, target).split(path.sep).filter(Boolean)) {
    validatePortablePathComponent(component, "Composite campaign path");
  }
  await rejectExistingLinks(roots.projectRoot, target, "campaign path");
  const existing = await deepestExisting(target, roots.projectRoot);
  const canonicalExisting = await realpath(existing);
  const realBase = roots.realCampaignsRoot ?? roots.campaignsRoot;
  if (!isInside(realBase, canonicalExisting) && !isInside(canonicalExisting, realBase)) {
    throw new Error("Composite campaign path realpath escapes the configured campaign base containment boundary");
  }
}

async function rejectExistingLinks(root: string, target: string, label: string): Promise<void> {
  if (!isInside(root, target)) throw new Error(`${label} is outside containment`);
  let current = root;
  const components = path.relative(root, target).split(path.sep).filter(Boolean);
  for (const [index, component] of components.entries()) {
    current = path.join(current, component);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        throw new Error(`${label} contains a symbolic link or junction: ${current}`);
      }
      if (index < components.length - 1 && !metadata.isDirectory()) {
        throw new Error(`${label} contains a non-directory component: ${current}`);
      }
    } catch (error) {
      if (isMissing(error)) break;
      throw error;
    }
  }
}

async function assertExistingRealContainment(root: string, target: string, label: string): Promise<void> {
  const existing = await deepestExisting(target, root);
  if (!isInside(root, await realpath(existing))) throw new Error(`${label} escapes realpath containment`);
}

async function assertExistingDirectory(target: string, label: string): Promise<void> {
  let candidate = target;
  try {
    while (true) {
      try {
        if (!(await lstat(candidate)).isDirectory()) {
          throw new Error(`${label} path contains a non-directory component: ${candidate}`);
        }
        return;
      } catch (error) {
        if (!isNotFound(error)) throw error;
        const parent = path.dirname(candidate);
        if (parent === candidate) return;
        candidate = parent;
      }
    }
  } catch (error) {
    if (isNotDirectory(error)) throw new Error(`${label} path contains a non-directory component: ${candidate}`);
    throw error;
  }
}

async function deepestExisting(target: string, floor: string): Promise<string> {
  let current = target;
  while (isInside(floor, current)) {
    try {
      await lstat(current);
      return current;
    } catch (error) {
      if (!isMissing(error)) throw error;
      if (current === floor) break;
      current = path.dirname(current);
    }
  }
  return floor;
}

async function realpathIfExisting(target: string): Promise<string | null> {
  try {
    return await realpath(target);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function isMissing(error: unknown): boolean {
  return isNotFound(error);
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function isNotDirectory(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOTDIR");
}

function assertSafeConfiguredHarness(configured: string): void {
  for (const component of configured.replace(/\\/g, "/").split("/")) {
    validatePortablePathComponent(component, "Configured harness");
  }
}
