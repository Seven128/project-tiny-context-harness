import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolPath = fileURLToPath(import.meta.url);
const defaultRepositoryRoot = path.resolve(path.dirname(toolPath), "..");
const stampRelativePath = ".artifacts/test-suite/package-build-fingerprint.json";
const buildInputRoots = Object.freeze([
  "package-lock.json",
  "packages/ty-context/package.json",
  "packages/ty-context/tsconfig.json",
  "packages/ty-context/src",
  "tools/package_build_fingerprint.mjs",
]);

export async function writePackageBuildFingerprint(options = {}) {
  const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
  const stampPath = resolveStampPath(repositoryRoot, options.stampPath);
  const input = await fingerprintPaths(repositoryRoot, buildInputRoots);
  if (
    options.expectedInputSha256 &&
    input.sha256 !== options.expectedInputSha256
  ) {
    await rm(stampPath, { force: true });
    throw new Error(
      "build_inputs_changed_during_build: package inputs changed before the build fingerprint could be committed; rebuild the stable snapshot",
    );
  }
  const output = await fingerprintPaths(repositoryRoot, [
    "packages/ty-context/dist",
  ]);
  const stamp = {
    schema_version: "ty-context-package-build-fingerprint-v1",
    input_sha256: input.sha256,
    input_file_count: input.file_count,
    dist_sha256: output.sha256,
    dist_file_count: output.file_count,
  };
  await writeJsonAtomically(stampPath, stamp);
  return { ...stamp, stamp_path: stampPath };
}

export async function verifyPackageBuildFingerprint(options = {}) {
  const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
  const stampPath = resolveStampPath(repositoryRoot, options.stampPath);
  let stamp;
  try {
    stamp = JSON.parse(await readFile(stampPath, "utf8"));
  } catch (error) {
    throw new Error(
      `build_fingerprint_missing: ${relativeDisplay(repositoryRoot, stampPath)} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (stamp?.schema_version !== "ty-context-package-build-fingerprint-v1")
    throw new Error("build_fingerprint_stale: unsupported fingerprint schema");

  const input = await fingerprintPaths(repositoryRoot, buildInputRoots);
  const output = await fingerprintPaths(repositoryRoot, [
    "packages/ty-context/dist",
  ]);
  const mismatches = [];
  if (stamp.input_sha256 !== input.sha256) mismatches.push("build inputs");
  if (stamp.dist_sha256 !== output.sha256) mismatches.push("dist output");
  if (mismatches.length > 0)
    throw new Error(
      `build_fingerprint_stale: ${mismatches.join(" and ")} differ from the recorded build; run the package build before reusing --no-build`,
    );
  return {
    schema_version: stamp.schema_version,
    input_sha256: input.sha256,
    dist_sha256: output.sha256,
    stamp_path: stampPath,
  };
}

export async function buildPackage(options = {}) {
  const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
  const stampPath = resolveStampPath(repositoryRoot, options.stampPath);
  const distPath = path.join(repositoryRoot, "packages", "ty-context", "dist");
  const before = await fingerprintPaths(repositoryRoot, buildInputRoots);
  await rm(stampPath, { force: true });
  await rm(distPath, { recursive: true, force: true });
  await runTypeScript(repositoryRoot);
  const after = await fingerprintPaths(repositoryRoot, buildInputRoots);
  if (after.sha256 !== before.sha256) {
    await rm(stampPath, { force: true });
    throw new Error(
      "build_inputs_changed_during_build: package inputs changed while TypeScript was running; rebuild the stable snapshot",
    );
  }
  return writePackageBuildFingerprint({
    repositoryRoot,
    stampPath,
    expectedInputSha256: before.sha256,
  });
}

async function fingerprintPaths(repositoryRoot, relativeRoots) {
  const files = [];
  for (const relativeRoot of relativeRoots)
    await collectFiles(repositoryRoot, relativeRoot, files);
  files.sort((left, right) => left.localeCompare(right, "en"));
  const hash = createHash("sha256");
  for (const relative of files) {
    const content = await readFile(resolveRelative(repositoryRoot, relative));
    hash.update(relative.replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return { sha256: hash.digest("hex"), file_count: files.length };
}

async function collectFiles(repositoryRoot, relative, files) {
  const absolute = resolveRelative(repositoryRoot, relative);
  let info;
  try {
    info = await stat(absolute);
  } catch (error) {
    throw new Error(
      `build_fingerprint_input_missing: ${relative} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (info.isFile()) {
    files.push(relative.replaceAll("\\", "/"));
    return;
  }
  if (!info.isDirectory())
    throw new Error(`build_fingerprint_input_unsupported: ${relative}`);
  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name, "en"),
  )) {
    if (!entry.isFile() && !entry.isDirectory())
      throw new Error(
        `build_fingerprint_input_unsupported: ${path.join(relative, entry.name)}`,
      );
    await collectFiles(repositoryRoot, path.join(relative, entry.name), files);
  }
}

async function writeJsonAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rm(target, { force: true });
  await rename(temporary, target);
}

async function runTypeScript(repositoryRoot) {
  const tsc = path.join(
    repositoryRoot,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [tsc, "-p", path.join("packages", "ty-context", "tsconfig.json")],
      {
        cwd: repositoryRoot,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`typescript_build_signal:${signal}`));
      else if (code === 0) resolve();
      else reject(new Error(`typescript_build_exit:${code ?? 1}`));
    });
  });
}

function resolveRepositoryRoot(value) {
  return path.resolve(value ?? defaultRepositoryRoot);
}

function resolveStampPath(repositoryRoot, value) {
  if (!value) return path.join(repositoryRoot, ...stampRelativePath.split("/"));
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

function resolveRelative(repositoryRoot, relative) {
  return path.join(repositoryRoot, ...relative.replaceAll("\\", "/").split("/"));
}

function relativeDisplay(repositoryRoot, target) {
  return path.relative(repositoryRoot, target).replaceAll("\\", "/");
}

async function main() {
  const command = process.argv[2] ?? "build";
  const result =
    command === "build"
      ? await buildPackage()
      : command === "verify"
        ? await verifyPackageBuildFingerprint()
        : null;
  if (!result)
    throw new Error(
      "Usage: node tools/package_build_fingerprint.mjs <build|verify>",
    );
  console.log(
    JSON.stringify({
      schema_version: "package-build-fingerprint-command-v1",
      command,
      input_sha256: result.input_sha256,
      dist_sha256: result.dist_sha256,
      stamp_path: relativeDisplay(defaultRepositoryRoot, result.stamp_path),
    }),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
)
  await main();
