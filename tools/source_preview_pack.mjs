#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { outDir: null, clean: false, packIgnoreScripts: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--out-dir requires a path");
      }
      options.outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--pack-ignore-scripts") {
      options.packIgnoreScripts = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`source_preview_pack.mjs

Packs the local project-tiny-context-harness workspace into an installable tarball
for private review, source-preview testing or package development.

Usage:
  node tools/source_preview_pack.mjs [--out-dir tmp/sdlc/source-preview/package] [--clean] [--pack-ignore-scripts]

Options:
  --clean                Remove the output directory before packing.
  --pack-ignore-scripts  Skip npm pack lifecycle scripts. Intended for tests
                         that already built dist.
`);
}

function commandSpec(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", command, ...args]
    };
  }
  return { command, args };
}

function run(command, args, cwd) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd,
    encoding: "utf8"
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}\n${detail}`);
  }
  return result;
}

function defaultOutDir() {
  return path.join(repoRoot, "tmp", "sdlc", "source-preview", "package");
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const outDir = options.outDir ?? defaultOutDir();

try {
  if (options.clean && existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  const before = new Set(readdirSync(outDir).filter((file) => file.endsWith(".tgz")));
  const packArgs = ["pack", "--workspace", "project-tiny-context-harness", "--pack-destination", outDir];
  if (options.packIgnoreScripts) {
    packArgs.push("--ignore-scripts");
  }
  run("npm", packArgs, repoRoot);

  const tarballs = readdirSync(outDir).filter((file) => file.endsWith(".tgz"));
  const created = tarballs.filter((file) => !before.has(file));
  const tarball = created.length === 1 ? created[0] : tarballs.sort().at(-1);
  if (!tarball) {
    throw new Error(`expected a packed tarball in ${outDir}`);
  }

  const tarballPath = path.join(outDir, tarball);
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "packages", "sdlc-harness", "package.json"), "utf8"));
  const report = {
    status: "packed",
    package: `${manifest.name}@${manifest.version}`,
    tarballPath,
    installCommand: `npm install -D ${tarballPath}`,
    initCommand: "npx --no-install sdlc-harness init --adopt",
    validateCommand: "make validate-context"
  };
  writeFileSync(path.join(outDir, "source-preview-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("");
  console.log("Source preview package ready.");
  console.log(`Package: ${report.package}`);
  console.log(`Tarball: ${tarballPath}`);
  console.log("");
  console.log("In a separate test repository:");
  console.log(`  npm install -D ${tarballPath}`);
  console.log("  npx --no-install sdlc-harness init --adopt");
  console.log("  make validate-context");
  console.log("");
  console.log("Use this only for source-preview testing, private review or package development.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Source preview output kept at: ${outDir}`);
  process.exit(1);
}
