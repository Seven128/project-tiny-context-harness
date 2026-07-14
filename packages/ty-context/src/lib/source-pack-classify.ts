import path from "node:path";
import { SAFE_EXAMPLE_FILE_NAMES } from "./source-files.js";
import type { ContextAreaMapping } from "./source-pack-types.js";

const OVERSIZED_LINES = 1000;
const OVERSIZED_CHARACTERS = 50_000;

export interface CodeClassification {
  language: string;
  summary: string;
  tags: string[];
  routes: string[];
  score: number;
  bucket: string;
}

export function classifyCodeFile(
  relative: string,
  content: string,
  areas: ContextAreaMapping[],
): CodeClassification {
  const language = languageFor(relative) || "text";
  const routes = extractRouteSummary(content);
  const tags = tagsFor(relative, content, language, routes);
  return {
    language,
    summary: summarizeCodeFile(relative, content, language),
    tags,
    routes,
    score: scoreFor(tags, relative),
    bucket: routingBucket(relative, areas),
  };
}

function tagsFor(
  relative: string,
  content: string,
  language: string,
  routes: string[],
): string[] {
  const lower = relative.toLowerCase();
  const tags = new Set<string>();
  const lines = content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
  if (isLikelyEntrypoint(relative)) tags.add("entry");
  if (routes.length > 0 || /route|controller|api/.test(lower)) tags.add("api");
  if (/cli|commands|bin\//.test(lower)) tags.add("cli");
  if (/worker|scheduler|queue|runtime|cron|job/.test(lower)) tags.add("worker");
  if (
    /schema|contract|types?\.|\.d\.ts$/.test(lower) ||
    /\b(interface|type|schema)\b/.test(content)
  )
    tags.add("contract");
  if (/pages|views|screens|components|\.vue$|\.tsx$|\.jsx$/.test(lower))
    tags.add("ui");
  if (/test|spec|verification|makefile/.test(lower)) tags.add("test");
  if (["json", "yaml", "toml", "make", "dockerfile"].includes(language))
    tags.add("config");
  if (lines > OVERSIZED_LINES || content.length > OVERSIZED_CHARACTERS)
    tags.add("oversized");
  return [...tags].sort();
}

function scoreFor(tags: string[], relative: string): number {
  const weights: Record<string, number> = {
    entry: 50,
    api: 35,
    cli: 32,
    worker: 30,
    contract: 28,
    ui: 24,
    test: 18,
    config: 12,
    oversized: -15,
  };
  return (
    tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0) +
    Math.max(0, 20 - relative.split("/").length)
  );
}

function routingBucket(relative: string, areas: ContextAreaMapping[]): string {
  for (const area of areas) {
    if (
      area.root === "." ||
      relative === area.root ||
      relative.startsWith(`${area.root}/`)
    ) {
      return `area:${area.id}`;
    }
  }
  const parts = relative.split("/");
  for (const prefix of ["domains", "apps", "services", "packages", "tools"]) {
    if (parts[0] === prefix && parts[1]) {
      return `${prefix}:${parts[1]}`;
    }
  }
  return parts[0] || "misc";
}

function summarizeCodeFile(
  relative: string,
  content: string,
  language: string,
): string {
  const base = path.posix.basename(relative);
  const symbols = extractSymbolSummary(content, language);
  if (base === "package.json") {
    const packageName = /"name"\s*:\s*"([^"]+)"/.exec(content)?.[1];
    return packageName
      ? `Defines npm package ${packageName} metadata, scripts and dependencies.`
      : "Defines npm package metadata, scripts and dependencies.";
  }
  if (base.toLowerCase() === "makefile") {
    const targets = [...content.matchAll(/^([A-Za-z0-9_.-]+):/gm)]
      .map((match) => match[1])
      .slice(0, 6);
    return targets.length > 0
      ? `Defines Make targets ${targets.join(", ")}.`
      : "Defines Make targets for local automation.";
  }
  if (symbols.length > 0) {
    return `${describeFilePurpose(relative, language)}; exposes ${symbols.slice(0, 6).join(", ")}.`;
  }
  return `${describeFilePurpose(relative, language)}.`;
}

function extractSymbolSummary(content: string, language: string): string[] {
  const patterns =
    language === "python"
      ? [
          /^(?:async\s+)?def\s+([A-Za-z_][\w]*)/gm,
          /^class\s+([A-Za-z_][\w]*)/gm,
        ]
      : language === "go"
        ? [
            /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)/gm,
            /^type\s+([A-Za-z_][\w]*)/gm,
          ]
        : [
            /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
            /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
            /(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/g,
            /(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/g,
            /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)/g,
          ];
  const symbols = new Set<string>();
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) && symbols.size < 10)
      symbols.add(match[1]);
  }
  for (const route of extractRouteSummary(content)) {
    if (symbols.size < 10) symbols.add(route);
  }
  return [...symbols];
}

function extractRouteSummary(content: string): string[] {
  const routes = new Set<string>();
  const patterns = [
    /\.(get|post|put|patch|delete|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    /\bHandle(?:Func)?\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) && routes.size < 8) {
      routes.add(
        match.length === 3
          ? `${match[1].toUpperCase()} ${match[2]}`
          : `route ${match[1]}`,
      );
    }
  }
  return [...routes].sort();
}

function describeFilePurpose(relative: string, language: string): string {
  const lower = relative.toLowerCase();
  if (
    lower.includes("/test") ||
    lower.includes(".test.") ||
    lower.includes(".spec.")
  )
    return `Contains ${language} tests for ${path.posix.basename(relative)}`;
  if (lower.includes("/commands/"))
    return `Implements ${language} command handling for ${path.posix.basename(relative)}`;
  if (
    lower.includes("/cli") ||
    lower.endsWith("/cli.ts") ||
    lower.endsWith("/cli.js")
  )
    return `Implements ${language} CLI behavior for ${path.posix.basename(relative)}`;
  if (
    lower.includes("/components/") ||
    lower.includes("/pages/") ||
    lower.includes("/views/")
  )
    return `Implements ${language} UI behavior for ${path.posix.basename(relative)}`;
  return `Contains ${language} implementation for ${path.posix.basename(relative)}`;
}

function isLikelyEntrypoint(relative: string): boolean {
  const lower = relative.toLowerCase();
  const base = path.posix.basename(lower);
  return (
    [
      "package.json",
      "makefile",
      "dockerfile",
      "main.go",
      "app.py",
      "server.py",
      "index.ts",
      "index.js",
      "cli.ts",
      "cli.js",
    ].includes(base) || /\/src\/(main|app|index)\.[tj]sx?$/.test(lower)
  );
}

function languageFor(relative: string): string {
  const lower = relative.toLowerCase();
  const base = path.posix.basename(lower);
  if (base === "makefile") return "make";
  if (
    base === "dockerfile" ||
    base.startsWith("dockerfile.") ||
    lower.endsWith(".dockerfile")
  )
    return "dockerfile";
  if (SAFE_EXAMPLE_FILE_NAMES.has(base)) return "dotenv";
  for (const [extension, language] of [
    [".tsx", "tsx"],
    [".ts", "typescript"],
    [".jsx", "jsx"],
    [".js", "javascript"],
    [".mjs", "javascript"],
    [".py", "python"],
    [".go", "go"],
    [".vue", "vue"],
    [".sql", "sql"],
    [".json", "json"],
    [".jsonc", "jsonc"],
    [".yaml", "yaml"],
    [".yml", "yaml"],
    [".toml", "toml"],
    [".sh", "bash"],
    [".ps1", "powershell"],
    [".cmd", "batch"],
    [".bat", "batch"],
    [".graphql", "graphql"],
    [".gql", "graphql"],
    [".proto", "protobuf"],
  ] as const) {
    if (lower.endsWith(extension)) return language;
  }
  return "";
}
