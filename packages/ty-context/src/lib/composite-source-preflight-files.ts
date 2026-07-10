import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { readText } from "./fs.js";
import {
  compileDiagnostic,
  isCompositeSourceCompileError,
  throwCompileErrors,
  type CompileDiagnosticRecord,
  type CompileReportCategory
} from "./superpowers-task-compile-diagnostics.js";
import type { CompositeSourceBundle } from "./superpowers-task-compile-core.js";

export type CompositeSourceTextReader = (target: string) => Promise<string>;
export type CompositeSourcePathMap = Record<keyof CompositeSourceBundle, string>;

type ConfinedSourceFiles = Record<keyof CompositeSourceBundle, { path: string; target: string }>;

const SOURCE_CHECKS: Array<[
  keyof CompositeSourceBundle,
  CompileReportCategory,
  string
]> = [
  ["product_architecture_source", "blocking_missing_source", "Product / Architecture Source"],
  ["technical_realization_plan", "blocking_missing_plan", "Technical Realization Plan"],
  ["acceptance_checklist", "blocking_missing_checklist", "Acceptance Checklist"]
];

export async function loadCompositeSourceFiles(
  root: string,
  sourcePaths: CompositeSourcePathMap,
  readSourceText: CompositeSourceTextReader = readText
): Promise<CompositeSourceBundle> {
  const sourceFiles = await confineRegularSourceFiles(root, sourcePaths);
  const errors: CompileDiagnosticRecord[] = [];
  const bundle = {} as CompositeSourceBundle;
  for (const [key, missingCategory, label] of SOURCE_CHECKS) {
    const file = sourceFiles[key];
    try {
      bundle[key] = { path: file.path, content: await readSourceText(file.target) };
    } catch (error) {
      errors.push(isEnoent(error)
        ? missingSourceDiagnostic(key, file.path, missingCategory, label)
        : unreadableSourceDiagnostic(key, file.path, "source file could not be read", "restore read access to a regular source file and rerun preflight"));
    }
  }
  throwCompileErrors(errors);
  return bundle;
}

async function confineRegularSourceFiles(
  root: string,
  sourcePaths: CompositeSourcePathMap
): Promise<ConfinedSourceFiles> {
  const canonicalRoot = await canonicalDirectoryRoot(root);
  const errors: CompileDiagnosticRecord[] = [];
  const files = {} as ConfinedSourceFiles;
  for (const [key, sourcePath] of Object.entries(sourcePaths) as Array<[keyof CompositeSourceBundle, string]>) {
    const hasTraversal = sourcePath.split(/[\\/]+/).includes("..");
    const lexicalTarget = path.resolve(canonicalRoot, sourcePath);
    if (path.isAbsolute(sourcePath) || hasTraversal || !isInsideRoot(canonicalRoot, lexicalTarget)) {
      errors.push(unsafeSourcePathDiagnostic(key, sourcePath));
      continue;
    }
    let canonicalTarget: string;
    try {
      canonicalTarget = await realpath(lexicalTarget);
    } catch (error) {
      const check = sourceCheck(key);
      errors.push(isEnoent(error)
        ? missingSourceDiagnostic(key, sourcePath, check[1], check[2])
        : unreadableSourceDiagnostic(key, sourcePath, "source path could not be resolved", "restore access to the source path and rerun preflight"));
      continue;
    }
    if (!isInsideRoot(canonicalRoot, canonicalTarget)) {
      errors.push(unsafeSourcePathDiagnostic(key, sourcePath));
      continue;
    }
    try {
      const metadata = await stat(canonicalTarget);
      if (!metadata.isFile()) {
        errors.push(unreadableSourceDiagnostic(key, sourcePath, "source path exists but is not a regular file", "replace the source path with a regular file and rerun preflight"));
        continue;
      }
    } catch (error) {
      const check = sourceCheck(key);
      errors.push(isEnoent(error)
        ? missingSourceDiagnostic(key, sourcePath, check[1], check[2])
        : unreadableSourceDiagnostic(key, sourcePath, "source file metadata could not be read", "restore access to a regular source file and rerun preflight"));
      continue;
    }
    files[key] = { path: sourcePath, target: canonicalTarget };
  }
  throwCompileErrors(errors);
  return files;
}

async function canonicalDirectoryRoot(root: string): Promise<string> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(root);
  } catch {
    throwCompileErrors([
      compileDiagnostic(`Preflight root is not an existing canonical directory: ${root}`, "blocking_unsafe_source_path", root, 1, "preflight_root", "source paths must resolve inside an existing canonical preflight root", "restore the preflight root and rerun preflight")
    ]);
    return "";
  }
  try {
    const metadata = await stat(canonicalRoot);
    if (!metadata.isDirectory()) {
      throwCompileErrors([
        unreadableSourceDiagnostic("preflight_root", root, "preflight root exists but is not a directory", "use an existing directory as the preflight root")
      ]);
    }
  } catch (error) {
    if (isCompositeSourceCompileError(error)) {
      throw error;
    }
    throwCompileErrors([
      unreadableSourceDiagnostic("preflight_root", root, "preflight root metadata could not be read", "restore directory access and rerun preflight")
    ]);
  }
  return canonicalRoot;
}

function sourceCheck(key: keyof CompositeSourceBundle) {
  return SOURCE_CHECKS.find(([candidate]) => candidate === key)!;
}

function missingSourceDiagnostic(
  key: keyof CompositeSourceBundle,
  file: string,
  category: CompileReportCategory,
  label: string
): CompileDiagnosticRecord {
  return compileDiagnostic(`${label} input is missing: ${file}`, category, file, 1, key, "all three authority inputs are required", "restore the missing source file and rerun compile");
}

function unreadableSourceDiagnostic(
  field: keyof CompositeSourceBundle | "preflight_root",
  file: string,
  why: string,
  fix: string
): CompileDiagnosticRecord {
  return compileDiagnostic(`Composite source is unreadable: ${file}`, "blocking_unreadable_source", file, 1, field, why, fix);
}

function unsafeSourcePathDiagnostic(key: keyof CompositeSourceBundle, sourcePath: string): CompileDiagnosticRecord {
  return compileDiagnostic(`Unsafe composite source path: ${sourcePath}`, "blocking_unsafe_source_path", sourcePath, 1, key, "source path resolves outside the canonical preflight root", "use a relative in-root source path without traversal or escaping links");
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function isEnoent(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
