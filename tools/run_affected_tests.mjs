import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { selectAffectedTests } from "./affected_test_selection.mjs";

const exec = promisify(execFile);
const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const options = parseArgs(process.argv.slice(2));
const changedPaths = options.paths.length
  ? options.paths
  : await discoverChangedPaths(options.base);
const selection = selectAffectedTests(changedPaths, { scope: options.scope });

console.log(
  JSON.stringify(
    {
      schema_version: "affected-test-plan-v1",
      changed_paths: changedPaths,
      ...selection,
      build_skipped: options.noBuild,
    },
    null,
    2,
  ),
);

if (options.list) process.exit(0);

if (selection.requires_build && !options.noBuild) {
  await run(npmCommand(), [
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
}

if (selection.mode === "full-suite") {
  await run(npmCommand(), [
    "run",
    "test:built",
    "--workspace",
    "project-tiny-context-harness",
  ]);
} else if (selection.mode === "long-task-suite") {
  await run(npmCommand(), [
    "run",
    "test:long-task-workflow:built",
    "--workspace",
    "project-tiny-context-harness",
  ]);
} else if (selection.tests.length > 0) {
  await run(process.execPath, [
    "--test",
    "--test-concurrency=1",
    ...selection.tests,
  ]);
}

function parseArgs(args) {
  const result = {
    base: null,
    list: false,
    noBuild: false,
    paths: [],
    scope: "auto",
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--list") result.list = true;
    else if (argument === "--no-build") result.noBuild = true;
    else if (argument === "--base")
      result.base = requiredValue(args, ++index, argument);
    else if (argument === "--path")
      result.paths.push(requiredValue(args, ++index, argument));
    else if (argument === "--scope")
      result.scope = requiredValue(args, ++index, argument);
    else if (argument === "--help") {
      console.log(`Usage: node tools/run_affected_tests.mjs [options]

Options:
  --list                 Print the selected plan without running it
  --no-build             Reuse an existing dist build
  --base <ref>           Compare the current HEAD with a specific Git ref
  --path <path>          Supply a changed path directly; may be repeated
  --scope <scope>        auto | long-task | delivery-contract | all
`);
      process.exit(0);
    } else throw new Error(`unknown argument: ${argument}`);
  }
  return result;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value`);
  return value;
}

async function discoverChangedPaths(explicitBase) {
  const changed = new Set();
  for (const file of await gitLines([
    "diff",
    "--name-only",
    "--diff-filter=ACMRTD",
    "HEAD",
  ]))
    changed.add(file);
  for (const file of await gitLines([
    "ls-files",
    "--others",
    "--exclude-standard",
  ]))
    changed.add(file);

  const candidates = [
    explicitBase,
    process.env.AFFECTED_BASE,
    process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : null,
    "origin/main",
    "main",
    "HEAD^",
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    if (!(await gitRefExists(candidate))) continue;
    const files = await gitLines([
      "diff",
      "--name-only",
      "--diff-filter=ACMRTD",
      `${candidate}...HEAD`,
    ]);
    if (!files.length) continue;
    files.forEach((file) => changed.add(file));
    break;
  }
  return [...changed].sort();
}

async function gitRefExists(ref) {
  try {
    await exec("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repository,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function gitLines(args) {
  try {
    const result = await exec("git", args, {
      cwd: repository,
      windowsHide: true,
    });
    return result.stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repository,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} terminated by ${signal}`));
      else if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
