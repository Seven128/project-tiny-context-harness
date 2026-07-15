import path from "node:path";
import { resolveInsideRepository } from "./long-task-workspace.js";

export function normalizeRepoPattern(value: string, label: string): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  )
    throw new Error(`unsafe_path:${label}:${value}`);
  const prefix = normalized.split(/[?*{[]/u, 1)[0].replace(/\/$/u, "");
  if (prefix) resolveInsideRepository(process.cwd(), prefix, label);
  return normalized;
}

export function assertRepositoryPattern(
  repositoryRoot: string,
  value: string,
  label: string,
): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  )
    throw new Error(`unsafe_path:${label}:${value}`);
  const prefix = normalized.split(/[?*{[]/u, 1)[0].replace(/\/$/u, "");
  if (prefix) resolveInsideRepository(repositoryRoot, prefix, label);
  return normalized;
}

export function matchesRepoPattern(
  fileInput: string,
  patternInput: string,
): boolean {
  const file = fileInput.replace(/\\/gu, "/").replace(/^\.\//u, "");
  const pattern = patternInput.replace(/\\/gu, "/").replace(/^\.\//u, "");
  const expression = pattern
    .split(/(\*\*|\*|\?)/u)
    .map((part) => {
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      if (part === "?") return "[^/]";
      return part.replace(/[.+^${}()|[\]\\]/gu, "\\$&");
    })
    .join("");
  return new RegExp(`^${expression}$`, "u").test(file);
}

export function findScopeEscapes(
  changedPaths: string[],
  allowedPatterns: string[],
  forbiddenPatterns: string[],
): string[] {
  return changedPaths.filter(
    (file) =>
      forbiddenPatterns.some((pattern) => matchesRepoPattern(file, pattern)) ||
      !allowedPatterns.some((pattern) => matchesRepoPattern(file, pattern)),
  );
}

export function patternsOverlap(left: string, right: string): boolean {
  const prefix = (value: string) =>
    value
      .replace(/\\/gu, "/")
      .split(/[?*{[]/u, 1)[0]
      .replace(/\/$/u, "");
  const a = prefix(left);
  const b = prefix(right);
  return Boolean(
    a && b && (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)),
  );
}
