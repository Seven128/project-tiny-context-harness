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
    "context = \"project_context/modules/main.md\"",
    "kind = \"app\"",
    "default = true",
    "",
    "# Example optional node:",
    "# [[context]]",
    "# path = \"project_context/modules/main/contracts/api.md\"",
    "# role = \"contract\"",
    "# read_policy = \"on-demand\"",
    "# triggers = [\"api\", \"contract\", \"compatibility\"]",
    ""
  ].join("\n");
}

export async function contextManifestFromExistingModules(projectRoot: string): Promise<string> {
  const modulesRoot = path.join(projectRoot, "project_context", "modules");
  const modules = (await listFiles(modulesRoot))
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (modules.length === 0) {
    return defaultContextManifestTemplate();
  }

  const lines = [
    "# Minimal Context graph manifest.",
    "# Auto-created by upgrade from existing project_context/modules/**/*.md files.",
    "# Review deep or non-module context and move it to explicit [[context]] role entries",
    "# such as foundation, contract, archive, implementation-index or decision-rationale when needed.",
    ""
  ];

  for (const modulePath of modules) {
    const relativeToModules = path.relative(modulesRoot, modulePath).split(path.sep).join("/");
    const contextPath = `project_context/modules/${relativeToModules}`;
    const id = moduleContextId(relativeToModules);
    lines.push(
      "[[areas]]",
      `id = "${id}"`,
      "root = \".\"",
      `context = "${contextPath}"`,
      `kind = "${id === "main" ? "app" : "context-unit"}"`,
      id === "main" ? "default = true" : "default = false",
      ""
    );
  }

  return lines.join("\n");
}

function moduleContextId(relativeToModules: string): string {
  const withoutExtension = relativeToModules.replace(/\.md$/i, "");
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
