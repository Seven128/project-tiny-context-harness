import path from "node:path";
import { resolveInsideRepository } from "./long-task-workspace.js";

export type PatternContainment =
  | { status: "proven_subset"; reason: string }
  | { status: "not_subset"; reason: string }
  | { status: "unknown"; reason: string };

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

export function proveRepositoryPatternSubset(
  candidateInput: string,
  ownerInput: string,
): PatternContainment {
  const candidate = normalizedSafePattern(candidateInput);
  const owner = normalizedSafePattern(ownerInput);
  if (!candidate || !owner)
    return {
      status: "unknown",
      reason: "unsafe_or_empty_repository_pattern",
    };
  if (candidate === owner)
    return { status: "proven_subset", reason: "patterns_are_equal" };
  if (owner === "**")
    return {
      status: "proven_subset",
      reason: "owner_is_global_recursive_pattern",
    };
  if (!hasPatternSyntax(candidate)) {
    if (matchesRepoPattern(candidate, owner))
      return {
        status: "proven_subset",
        reason: "exact_candidate_matches_owner_pattern",
      };
    if (hasComplexPatternSyntax(owner))
      return {
        status: "unknown",
        reason: "owner_uses_unsupported_complex_glob",
      };
    return {
      status: "not_subset",
      reason: "exact_candidate_does_not_match_owner_pattern",
    };
  }

  const candidatePattern = parseSimplePattern(candidate);
  const ownerPattern = parseSimplePattern(owner);
  if (!candidatePattern || !ownerPattern)
    return {
      status: "unknown",
      reason: "unsupported_complex_glob_relation",
    };

  if (ownerPattern.recursive) {
    if (candidatePattern.segments.length <= ownerPattern.segments.length)
      return {
        status: "not_subset",
        reason: "candidate_can_match_outside_owner_recursive_prefix",
      };
    for (let index = 0; index < ownerPattern.segments.length; index += 1)
      if (
        !simpleSegmentSubset(
          candidatePattern.segments[index],
          ownerPattern.segments[index],
        )
      )
        return {
          status: "not_subset",
          reason: "candidate_prefix_is_not_within_owner_recursive_prefix",
        };
    return {
      status: "proven_subset",
      reason: "candidate_is_within_owner_recursive_subtree",
    };
  }

  if (candidatePattern.recursive)
    return {
      status: "not_subset",
      reason: "recursive_candidate_exceeds_non_recursive_owner",
    };
  if (candidatePattern.segments.length !== ownerPattern.segments.length)
    return {
      status: "not_subset",
      reason: "candidate_and_owner_match_different_path_depths",
    };
  for (let index = 0; index < ownerPattern.segments.length; index += 1)
    if (
      !simpleSegmentSubset(
        candidatePattern.segments[index],
        ownerPattern.segments[index],
      )
    )
      return {
        status: "not_subset",
        reason: "candidate_segment_language_exceeds_owner_segment",
      };
  return {
    status: "proven_subset",
    reason: "simple_segment_languages_are_contained",
  };
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

type SimpleSegment =
  | { kind: "literal"; value: string }
  | { kind: "any" }
  | { kind: "suffix"; value: string };

interface SimplePattern {
  segments: SimpleSegment[];
  recursive: boolean;
}

function normalizedSafePattern(value: string): string | null {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.split("/").includes("..")
  )
    return null;
  return normalized;
}

function hasPatternSyntax(value: string): boolean {
  return /[*?\[\]{}()]/u.test(value);
}

function hasComplexPatternSyntax(value: string): boolean {
  return /[?\[\]{}()]|(?:^|[/])(?:[!+@?*])\(/u.test(value);
}

function parseSimplePattern(value: string): SimplePattern | null {
  const parts = value.split("/");
  const recursiveIndex = parts.indexOf("**");
  if (
    recursiveIndex !== -1 &&
    (recursiveIndex !== parts.length - 1 ||
      parts.lastIndexOf("**") !== recursiveIndex)
  )
    return null;
  const segmentParts =
    recursiveIndex === -1 ? parts : parts.slice(0, recursiveIndex);
  const segments: SimpleSegment[] = [];
  for (const part of segmentParts) {
    if (!part) return null;
    if (part === "*") {
      segments.push({ kind: "any" });
      continue;
    }
    if (/^\*\.[^*?\[\]{}()]+$/u.test(part)) {
      segments.push({ kind: "suffix", value: part.slice(1) });
      continue;
    }
    if (hasPatternSyntax(part)) return null;
    segments.push({ kind: "literal", value: part });
  }
  return { segments, recursive: recursiveIndex !== -1 };
}

function simpleSegmentSubset(
  candidate: SimpleSegment,
  owner: SimpleSegment,
): boolean {
  if (owner.kind === "any") return true;
  if (candidate.kind === "literal") {
    if (owner.kind === "literal") return candidate.value === owner.value;
    return candidate.value.endsWith(owner.value);
  }
  if (candidate.kind === "suffix")
    return owner.kind === "suffix" && candidate.value === owner.value;
  return false;
}
