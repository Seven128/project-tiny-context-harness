import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const libRoot = path.join(repoRoot, "packages/ty-context/src/lib");
const PURE_ROOTS = [
  "superpowers-task-compile-core.ts",
  "superpowers-task-source-parser.ts",
  "superpowers-task-compile-guards.ts",
  "superpowers-task-command-specs.ts",
  "composite-campaign-renderer.ts",
  "composite-campaign-preflight.ts"
];
const FORBIDDEN_LOCAL_MODULES = new Set([
  "fs.ts",
  "superpowers-task-state.ts",
  "superpowers-task-events.ts",
  "superpowers-task-current-evidence.ts",
  "composite-campaign-store.ts",
  "composite-campaign-atomic.ts",
  "composite-campaign-events.ts",
  "composite-campaign-paths.ts"
]);
const UNRESOLVED_MODULE_SPECIFIER = "<unresolved-module-specifier>";

test("composite compile, packet rendering, and preflight have a filesystem-free transitive import graph", async () => {
  const violations = [];
  const visited = new Set();
  const queue = PURE_ROOTS.map((file) => ({ file: path.join(libRoot, file), chain: [file] }));

  while (queue.length > 0) {
    const current = queue.shift();
    const normalized = path.normalize(current.file);
    if (visited.has(normalized)) {
      continue;
    }
    visited.add(normalized);
    const source = await readFile(normalized, "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier === UNRESOLVED_MODULE_SPECIFIER) {
        violations.push(`${current.chain.join(" -> ")} -> ${UNRESOLVED_MODULE_SPECIFIER}`);
        continue;
      }
      if (specifier === "node:path" || specifier.startsWith("node:path/") || specifier === "node:fs" || specifier.startsWith("node:fs/")) {
        violations.push(`${current.chain.join(" -> ")} -> ${specifier}`);
        continue;
      }
      if (!specifier.startsWith(".")) {
        continue;
      }
      const target = path.resolve(path.dirname(normalized), specifier.replace(/\.js$/, ".ts"));
      const basename = path.basename(target);
      const chain = [...current.chain, basename];
      if (FORBIDDEN_LOCAL_MODULES.has(basename)) {
        violations.push(chain.join(" -> "));
      }
      queue.push({ file: target, chain });
    }
  }

  assert.deepEqual(violations, []);
});

test("purity import parsing catches dynamic, require, and literal-syntax bypass forms", () => {
  const source = `
import fsDefault from "fs";
import nodeFs = require("node:fs");
export { readFile } from "fs/promises";
const dynamicFs = import("node:fs/promises");
const requiredPath = require("path");
const requiredNodePath = require("node:path");
const templateFs = import(\`node:fs\`);
const templatePath = require(\`path\`);
const parenthesizedFs = import(("node:fs/promises"));
const asConstPath = require("node:path" as const);
const assertedFs = import(<const>"fs");
const nonNullPath = require(("path")!);
const satisfiesFs = import("node:fs" satisfies string);
`;

  assert.deepEqual(importSpecifiers(source), [
    "node:fs",
    "node:fs",
    "node:fs/promises",
    "node:fs/promises",
    "node:path",
    "node:path",
    "node:fs",
    "node:path",
    "node:fs/promises",
    "node:path",
    "node:fs",
    "node:path",
    "node:fs"
  ]);
});

test("purity import parsing fails closed for dynamic module specifiers", () => {
  const source = `
const moduleName = "node:fs";
const dynamicImport = import(moduleName);
const dynamicRequire = require(moduleName);
const interpolatedImport = import(\`node:\${moduleName}\`);
const missingImport = import();
const missingRequire = require();
`;

  assert.deepEqual(importSpecifiers(source), [
    UNRESOLVED_MODULE_SPECIFIER,
    UNRESOLVED_MODULE_SPECIFIER,
    UNRESOLVED_MODULE_SPECIFIER,
    UNRESOLVED_MODULE_SPECIFIER,
    UNRESOLVED_MODULE_SPECIFIER
  ]);
});

function importSpecifiers(source) {
  const specifiers = [];
  const sourceFile = ts.createSourceFile("purity-boundary.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const specifier = staticStringValue(node.moduleSpecifier);
      specifiers.push(specifier === undefined ? UNRESOLVED_MODULE_SPECIFIER : normalizeBuiltinSpecifier(specifier));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression) {
      const specifier = staticStringValue(node.moduleReference.expression);
      specifiers.push(specifier === undefined ? UNRESOLVED_MODULE_SPECIFIER : normalizeBuiltinSpecifier(specifier));
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) {
        const specifier = node.arguments.length > 0 ? staticStringValue(node.arguments[0]) : undefined;
        specifiers.push(specifier === undefined ? UNRESOLVED_MODULE_SPECIFIER : normalizeBuiltinSpecifier(specifier));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function staticStringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (
    ts.isParenthesizedExpression(node)
    || ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node)
    || ts.isNonNullExpression(node)
    || ts.isSatisfiesExpression(node)
  ) {
    return staticStringValue(node.expression);
  }
  return undefined;
}

function normalizeBuiltinSpecifier(specifier) {
  if (specifier === "fs" || specifier.startsWith("fs/") || specifier === "path" || specifier.startsWith("path/")) {
    return `node:${specifier}`;
  }
  return specifier;
}
