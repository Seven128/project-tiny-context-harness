import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";
import { createUpgradePlan } from "../../packages/ty-context/dist/lib/migrations.js";
import { runUpgradeReport } from "../../packages/ty-context/dist/lib/upgrade.js";
import { sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

test("default library lifecycle leaves future campaign and historical tmp sentinels byte/mtime identical", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-lifecycle-default-"));
  try {
    await writeFile(path.join(root, "package.json"), "{}\n", "utf8");
    await runInit(root, { adopt: true, force: false });
    const sentinels = await seedSentinels(root, ".agent");
    const operations = [
      ["init", () => runInit(root, { adopt: true, force: false })],
      ["sync", () => runSync(root)],
      ["upgrade-check", () => createUpgradePlan(root)],
      ["upgrade", () => runUpgradeReport(root)]
    ];
    for (const [label, operation] of operations) {
      const before = await snapshotSentinels(sentinels);
      const output = await operation();
      assert.deepEqual(await snapshotSentinels(sentinels), before, label);
      assertNoDiscoveryLanguage(JSON.stringify(output), label);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("real configured-root CLI lifecycle never discovers, imports, migrates, or creates campaigns", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-lifecycle-cli-"));
  try {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
    await runInit(root, { adopt: true, force: false });
    const sentinels = await seedSentinels(root, ".harness");
    for (const [label, args] of [
      ["sync", ["sync"]],
      ["upgrade-check", ["upgrade", "--check", "--json"]],
      ["upgrade", ["upgrade", "--json"]],
      ["help", ["help"]]
    ]) {
      const before = await snapshotSentinels(sentinels);
      const result = await execFileAsync(process.execPath, [cliPath, ...args], {
        cwd: root,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024
      });
      assert.deepEqual(await snapshotSentinels(sentinels), before, label);
      assertNoDiscoveryLanguage(`${result.stdout}\n${result.stderr}`, label);
      if (label === "help") {
        assert.doesNotMatch(result.stdout, /import-campaign|attachment.*import|campaign.*migration/i);
      }
    }

    const empty = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-lifecycle-empty-"));
    try {
      await writeFile(path.join(empty, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
      await runInit(empty, { adopt: true, force: false });
      await assert.rejects(
        lstat(path.join(empty, ".harness", "composite-long-task", "campaigns")),
        /ENOENT/
      );
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("lifecycle transitive imports contain no campaign store, atomic, event, or campaign-path discovery edge", async () => {
  const libRoot = path.join(repoRoot, "packages", "ty-context", "src", "lib");
  const roots = ["init.ts", "sync-engine.ts", "upgrade.ts", "migrations.ts", "doctor.ts"];
  const queue = roots.map((file) => ({ file: path.join(libRoot, file), chain: [file] }));
  const visited = new Set();
  const violations = [];
  while (queue.length > 0) {
    const current = queue.shift();
    const normalized = path.normalize(current.file);
    if (visited.has(normalized)) continue;
    visited.add(normalized);
    const source = await readFile(normalized, "utf8");
    if (/composite-long-task[\\/]campaigns|composite-campaign-(?:store|atomic|events|recovery)/i.test(source)) {
      violations.push(`${current.chain.join(" -> ")} contains campaign discovery/store literal`);
    }
    for (const specifier of importSpecifiers(source)) {
      if (specifier === null) {
        violations.push(`${current.chain.join(" -> ")} has unresolved dynamic import`);
        continue;
      }
      if (!specifier.startsWith(".")) continue;
      const target = path.resolve(path.dirname(normalized), specifier.replace(/\.js$/, ".ts"));
      if (!target.startsWith(libRoot + path.sep)) continue;
      queue.push({ file: target, chain: [...current.chain, path.basename(target)] });
    }
  }
  assert.deepEqual(violations, []);
});

async function seedSentinels(root, harnessRoot) {
  const campaign = path.join(root, harnessRoot, "composite-long-task", "campaigns", "future-sentinel");
  const historical = path.join(root, "tmp", "ty-context", "plan-acceptance", "historical-sentinel");
  await mkdir(path.join(campaign, "nested"), { recursive: true });
  await mkdir(path.join(historical, "nested"), { recursive: true });
  await writeFile(path.join(campaign, "campaign.yaml"), "schema_version: composite-campaign-v999\nsecret-shape: malformed\n", "utf8");
  await writeFile(path.join(campaign, "nested", "raw.bin"), Buffer.from([0, 1, 2, 255]));
  await writeFile(path.join(historical, "task-state.json"), "{not valid historical state\n", "utf8");
  await writeFile(path.join(historical, "nested", "evidence.txt"), "must remain untouched\n", "utf8");
  return { campaign, historical };
}

async function snapshotSentinels(sentinels) {
  return {
    campaign: await snapshotTree(sentinels.campaign),
    historical: await snapshotTree(sentinels.historical)
  };
}

async function snapshotTree(root) {
  const result = [];
  async function visit(current, relative = "") {
    const rootMetadata = await lstat(current);
    result.push([relative || ".", rootMetadata.size, rootMetadata.mtimeMs, rootMetadata.isFile() ? sha256Hex(await readFile(current)) : null]);
    if (!rootMetadata.isDirectory()) return;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      await visit(path.join(current, entry.name), relative ? `${relative}/${entry.name}` : entry.name);
    }
  }
  await visit(root);
  return result;
}

function assertNoDiscoveryLanguage(output, label) {
  assert.doesNotMatch(output, /future-sentinel|historical-sentinel/i, label);
  assert.doesNotMatch(output, /import-campaign|attachment.*import|campaign.*migration|historical.*tmp.*discover/i, label);
}

function importSpecifiers(source) {
  const result = [];
  const sourceFile = ts.createSourceFile("lifecycle.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      result.push(staticText(node.moduleSpecifier));
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      result.push(node.arguments.length === 1 ? staticText(node.arguments[0]) : null);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function staticText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) return staticText(node.expression);
  return null;
}
