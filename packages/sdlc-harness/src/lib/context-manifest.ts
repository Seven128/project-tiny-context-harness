import path from "node:path";
import { listFiles } from "./fs.js";

export const CONTEXT_MANIFEST_PATH = "project_context/context.toml";

export function defaultContextManifestTemplate(): string {
  return [
    "# Schema v4 Minimal Context graph manifest.",
    "# Keep the default area for ordinary projects. Add [[context]] nodes only for durable",
    "# on-demand context such as contracts, foundations, archives or implementation indexes.",
    "",
    "[[areas]]",
    "id = \"main\"",
    "root = \".\"",
    "context = \"project_context/areas/main.md\"",
    "kind = \"app\"",
    "default = true",
    "",
    "# Example optional node:",
    "# [[context]]",
    "# path = \"project_context/areas/main/contracts/api.md\"",
    "# role = \"contract\"",
    "# read_policy = \"on-demand\"",
    "# triggers = [\"api\", \"contract\", \"compatibility\"]",
    ""
  ].join("\n");
}

export async function contextManifestFromExistingAreas(projectRoot: string): Promise<string> {
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  const areas = (await listFiles(areasRoot))
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (areas.length === 0) {
    return defaultContextManifestTemplate();
  }

  const lines = [
    "# Minimal Context graph manifest.",
    "# Auto-created by upgrade from existing project_context/areas/**/*.md files.",
    "# Review deep or non-area context and move it to explicit [[context]] role entries",
    "# such as foundation, contract, archive, implementation-index or decision-rationale when needed.",
    ""
  ];

  const areaEntries = areas.map((areaPath) => {
    const relativeToAreas = path.relative(areasRoot, areaPath).split(path.sep).join("/");
    const contextPath = `project_context/areas/${relativeToAreas}`;
    const id = contextUnitId(relativeToAreas);
    return { contextPath, id };
  });
  const defaultId = areaEntries.some((entry) => entry.id === "main") ? "main" : areaEntries[0]?.id;

  for (const { contextPath, id } of areaEntries) {
    lines.push(
      "[[areas]]",
      `id = "${id}"`,
      "root = \".\"",
      `context = "${contextPath}"`,
      `kind = "${id === "main" ? "app" : "context-unit"}"`,
      id === defaultId ? "default = true" : "default = false",
      ""
    );
  }

  return lines.join("\n");
}

function contextUnitId(relativeToAreas: string): string {
  const withoutExtension = relativeToAreas.replace(/\.md$/i, "");
  const parts = withoutExtension.split("/");
  const last = parts.at(-1)?.toLowerCase();
  const semanticParts = last === "readme" || last === "index" ? parts.slice(0, -1) : parts;
  const raw = (semanticParts.length > 0 ? semanticParts : ["main"]).join("-");
  const slug = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "main";
}
