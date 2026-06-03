import path from "node:path";
import { ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";

export interface ContextMigrationOptions {
  write: boolean;
}

export interface ContextMigrationReport {
  mode: "dry-run" | "write";
  changed: string[];
  preview: string[];
  warnings: string[];
}

const MIGRATION_START = "<!-- sdlc-harness:context-migration:begin -->";
const MIGRATION_END = "<!-- sdlc-harness:context-migration:end -->";

export async function runContextMigration(
  projectRoot: string,
  options: ContextMigrationOptions
): Promise<ContextMigrationReport> {
  const report: ContextMigrationReport = {
    mode: options.write ? "write" : "dry-run",
    changed: [],
    preview: [],
    warnings: []
  };
  const facts = await collectLegacyFacts(projectRoot);
  const moduleNames = await detectModules(projectRoot);
  const protectUserAuthoredContext = await hasUserAuthoredContext(projectRoot);
  const generated = new Map<string, string>();
  generated.set("project_context/global.md", renderGlobalContext(facts, moduleNames));
  for (const moduleName of moduleNames) {
    generated.set(`project_context/modules/${moduleName}.md`, renderModuleContext(moduleName, facts));
  }

  for (const [relative, content] of generated) {
    const destination = await migrationDestination(projectRoot, relative, protectUserAuthoredContext);
    report.preview.push(`${relative} -> ${destination}`);
    if (!options.write) {
      continue;
    }
    const targetPath = path.join(projectRoot, destination);
    const next = await mergeContextContent(targetPath, content);
    if (await writeTextIfChanged(targetPath, next)) {
      report.changed.push(destination);
    }
  }

  if (facts.sources.length === 0) {
    report.warnings.push("No legacy README or .work_products facts were found; generated Context uses repository entrypoint guesses only.");
  }
  if (moduleNames.length === 1 && moduleNames[0] === "main") {
    report.warnings.push("No obvious source module names were found; generated project_context/modules/main.md.");
  }
  return report;
}

interface LegacyFacts {
  readme: string;
  product: string[];
  techPlan: string[];
  decisions: string[];
  implementation: string[];
  sources: string[];
  codeEntrypoints: string[];
  testEntrypoints: string[];
}

async function collectLegacyFacts(projectRoot: string): Promise<LegacyFacts> {
  const readmePath = path.join(projectRoot, "README.md");
  const readme = (await pathExists(readmePath)) ? await readText(readmePath) : "";
  const product = await readMarkdownUnder(projectRoot, ".work_products/01_product");
  const techPlan = await readMarkdownUnder(projectRoot, ".work_products/03_tech_plan");
  const decisions = await readMarkdownUnder(projectRoot, ".work_products/05_decisions");
  const implementation = await readMarkdownUnder(projectRoot, ".work_products/04_implementation");
  const sources = [
    ...(readme ? ["README.md"] : []),
    ...(await relativeMarkdownPaths(projectRoot, ".work_products/01_product")),
    ...(await relativeMarkdownPaths(projectRoot, ".work_products/03_tech_plan")),
    ...(await relativeMarkdownPaths(projectRoot, ".work_products/05_decisions")),
    ...(await relativeMarkdownPaths(projectRoot, ".work_products/04_implementation"))
  ];
  return {
    readme,
    product,
    techPlan,
    decisions,
    implementation,
    sources,
    codeEntrypoints: await detectEntrypoints(projectRoot, ["src", "lib", "bin", "server", "app"]),
    testEntrypoints: await detectEntrypoints(projectRoot, ["test", "tests", "__tests__"])
  };
}

async function readMarkdownUnder(projectRoot: string, relativeRoot: string): Promise<string[]> {
  const files = await relativeMarkdownPaths(projectRoot, relativeRoot);
  const out: string[] = [];
  for (const file of files) {
    out.push(await readText(path.join(projectRoot, file)));
  }
  return out;
}

async function relativeMarkdownPaths(projectRoot: string, relativeRoot: string): Promise<string[]> {
  const root = path.join(projectRoot, relativeRoot);
  return (await listFiles(root))
    .filter((file) => file.endsWith(".md") && path.basename(file) !== "overview.md")
    .map((file) => path.relative(projectRoot, file).split(path.sep).join("/"))
    .sort();
}

async function detectModules(projectRoot: string): Promise<string[]> {
  const srcRoot = path.join(projectRoot, "src");
  if (!(await pathExists(srcRoot))) {
    return ["main"];
  }
  const files = await listFiles(srcRoot);
  const names = new Set<string>();
  for (const file of files) {
    const relative = path.relative(srcRoot, file);
    const [first] = relative.split(path.sep);
    if (!first || first.startsWith(".")) continue;
    const parsed = path.parse(first);
    const name = parsed.name || first;
    const normalized = slug(name);
    if (normalized && normalized !== "index") names.add(normalized);
  }
  return [...names].sort().slice(0, 8).concat(names.size === 0 ? ["main"] : []);
}

async function detectEntrypoints(projectRoot: string, roots: string[]): Promise<string[]> {
  const entries: string[] = [];
  for (const root of roots) {
    for (const file of await listFiles(path.join(projectRoot, root))) {
      const relative = path.relative(projectRoot, file).split(path.sep).join("/");
      if (/\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|rb|php|sh)$/.test(relative)) {
        entries.push(relative);
      }
    }
  }
  return entries.sort().slice(0, 12);
}

function renderGlobalContext(facts: LegacyFacts, moduleNames: string[]): string {
  const productText = summarize(facts.product.join("\n\n") || facts.readme);
  const techText = summarize(facts.techPlan.join("\n\n"));
  const decisionText = summarize(facts.decisions.join("\n\n"));
  const stateText = summarize(facts.implementation.join("\n\n"));
  return wrapMigrationBlock([
    "# Project / Delivery Context",
    "",
    "## Project Goal",
    "",
    productText || "- Fill in the project goal.",
    "",
    "## Non-goals / Boundaries",
    "",
    "- Preserve explicit product boundaries from legacy PRD or README; fill gaps manually.",
    "",
    "## Background",
    "",
    summarize(facts.readme) || "- Fill in the minimum background a fresh agent needs.",
    "",
    "## Design Rationale",
    "",
    decisionText || techText || "- Record durable design choices that are hard to infer from code.",
    "",
    "## Verification Entry Points",
    "",
    renderList(facts.testEntrypoints, "- Add the project-specific test or smoke command."),
    "",
    "## Current State",
    "",
    stateText || "- Summarize the current implementation state.",
    "",
    "## Next Safe Action",
    "",
    "- Review this migrated Context, remove stale legacy facts, then run the project-specific verification entry point.",
    "",
    "## Module Index",
    "",
    ...moduleNames.map((name) => `- [${name}](modules/${name}.md)`),
    "",
    "## Legacy Source Trace",
    "",
    renderList(facts.sources, "- No legacy source trace found.")
  ]);
}

function renderModuleContext(moduleName: string, facts: LegacyFacts): string {
  return wrapMigrationBlock([
    `# Module Context: ${moduleName}`,
    "",
    "## Responsibility",
    "",
    "- Summarize this module's responsibility after reviewing the linked code entry points.",
    "",
    "## User / System Contract",
    "",
    summarize(facts.product.join("\n\n")) || "- Fill in the relevant user or system contract.",
    "",
    "## Core Data / API / State",
    "",
    summarize(facts.techPlan.join("\n\n")) || "- Fill in core data, APIs, states or rules.",
    "",
    "## Key Constraints",
    "",
    summarize(facts.decisions.join("\n\n")) || "- Fill in constraints not obvious from code alone.",
    "",
    "## Code Entry Points",
    "",
    renderList(facts.codeEntrypoints, "- Add concrete source entry points."),
    "",
    "## Test Entry Points",
    "",
    renderList(facts.testEntrypoints, "- Add focused test entry points."),
    "",
    "## Open Risks",
    "",
    "- Review migrated facts for stale assumptions before relying on this Context."
  ]);
}

function wrapMigrationBlock(lines: string[]): string {
  return `${MIGRATION_START}\n${lines.join("\n").trimEnd()}\n${MIGRATION_END}\n`;
}

function renderList(values: string[], fallback: string): string {
  if (values.length === 0) {
    return fallback;
  }
  return values.map((value) => `- \`${value}\``).join("\n");
}

function summarize(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("|"))
    .slice(0, 8)
    .join("\n");
  if (!cleaned) return "";
  return cleaned
    .split(/\r?\n/)
    .map((line) => (line.startsWith("-") ? line : `- ${line.replace(/^[-*]\s*/, "")}`))
    .join("\n");
}

async function hasUserAuthoredContext(projectRoot: string): Promise<boolean> {
  const globalPath = path.join(projectRoot, "project_context", "global.md");
  if (!(await pathExists(globalPath))) {
    return false;
  }
  const text = await readText(globalPath);
  return !(text.includes(MIGRATION_START) && text.includes(MIGRATION_END));
}

async function migrationDestination(projectRoot: string, relative: string, protectUserAuthoredContext: boolean): Promise<string> {
  const target = path.join(projectRoot, relative);
  if (!(await pathExists(target)) && !protectUserAuthoredContext) {
    return relative;
  }
  if (await pathExists(target)) {
    const text = await readText(target);
    if (text.includes(MIGRATION_START) && text.includes(MIGRATION_END)) {
      return relative;
    }
  }
  return path.join("project_context", "_migration", "latest", path.relative("project_context", relative)).split(path.sep).join("/");
}

async function mergeContextContent(targetPath: string, content: string): Promise<string> {
  if (!(await pathExists(targetPath))) {
    return content;
  }
  const existing = await readText(targetPath);
  const start = existing.indexOf(MIGRATION_START);
  const end = existing.indexOf(MIGRATION_END);
  if (start < 0 || end < start) {
    return content;
  }
  return `${existing.slice(0, start)}${content.trimEnd()}\n${existing.slice(end + MIGRATION_END.length).replace(/^\n/, "")}`;
}

function slug(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "main";
}
