import path from "node:path";
import type { Migration, UpgradePlanItem, UpgradePlanItemStatus } from "./migrations.js";
import { listFiles, pathExists, readText } from "./fs.js";
import { packageAssetPath } from "./paths.js";

const LEGACY_MANAGED_ROOT = "pjsdlc_managed";
const CURRENT_MANAGED_ROOT = "ty-context-managed";
const LEGACY_MAKEFILE = "sdlc-harness.mk";
const CURRENT_MAKEFILE = "ty-context.mk";

export async function detectLegacyManagedDirectory(
  projectRoot: string,
  root: string,
  migration: Migration
): Promise<UpgradePlanItem[]> {
  const legacyRoot = path.join(projectRoot, root, LEGACY_MANAGED_ROOT);
  const files = await listFiles(legacyRoot);
  const items: UpgradePlanItem[] = [];
  for (const file of files) {
    if (path.basename(file) === ".gitkeep") {
      continue;
    }
    const relativeToLegacyRoot = path.relative(legacyRoot, file).split(path.sep).join("/");
    const relativeToProject = path.relative(projectRoot, file).split(path.sep).join("/");
    const classification = await classifyLegacyManagedFile(relativeToLegacyRoot);
    if (classification.kind === "override") {
      items.push(
        item(
          migration,
          "manual_required",
          relativeToProject,
          "Legacy skill overrides are no longer supported; move rules into a standalone project-local Skill."
        )
      );
      continue;
    }
    if (classification.kind === "unknown") {
      items.push(
        item(
          migration,
          "manual_required",
          relativeToProject,
          "Legacy pjsdlc_managed content is not recognized as package-generated; review it manually."
        )
      );
      continue;
    }
    const target = path.join(projectRoot, root, CURRENT_MANAGED_ROOT, ...classification.targetRelative.split("/"));
    if (!(await pathExists(target))) {
      continue;
    }
    const assetContent = await readText(classification.assetPath);
    if ((await readText(target)) !== assetContent) {
      items.push(
        item(
          migration,
          "blocked",
          path.relative(projectRoot, target).split(path.sep).join("/"),
          `Cannot refresh legacy generated file because ${classification.targetRelative} already exists with non-package content.`
        )
      );
    }
  }
  return items;
}

async function classifyLegacyManagedFile(relative: string): Promise<
  | { kind: "generated"; targetRelative: string; assetPath: string }
  | { kind: "override" }
  | { kind: "unknown" }
> {
  if (relative.startsWith("override_skills/")) {
    return { kind: "override" };
  }
  const mapped = legacyGeneratedMapping(relative);
  if (!mapped) {
    return { kind: "unknown" };
  }
  const assetPath = packageAssetPath(...mapped.assetSegments);
  if (!(await pathExists(assetPath))) {
    return { kind: "unknown" };
  }
  return { kind: "generated", targetRelative: mapped.targetRelative, assetPath };
}

function legacyGeneratedMapping(relative: string): { targetRelative: string; assetSegments: string[] } | undefined {
  if (relative === `make/${LEGACY_MAKEFILE}`) {
    return { targetRelative: `make/${CURRENT_MAKEFILE}`, assetSegments: ["make", CURRENT_MAKEFILE] };
  }
  for (const [prefix, assetPrefix] of [
    ["agents/", "agents"],
    ["context_templates/", "context_templates"],
    ["skills/", "skills"],
    ["minimal_tools/", "tools"]
  ] as const) {
    if (relative.startsWith(prefix)) {
      const rest = relative.slice(prefix.length);
      return { targetRelative: `${prefix}${rest}`, assetSegments: [assetPrefix, ...rest.split("/")] };
    }
  }
  return undefined;
}

function item(
  migration: Migration,
  status: UpgradePlanItemStatus,
  pathLabel: string,
  message: string
): UpgradePlanItem {
  return {
    id: migration.id,
    introducedIn: migration.introducedIn,
    description: migration.description,
    scope: migration.scope,
    status,
    path: pathLabel,
    message
  };
}
