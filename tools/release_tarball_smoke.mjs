#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeHappyV3Inputs } from "../tests/ty-context/long-task-v3-fixtures.mjs";

const { tarball, portableOnly } = parseArgs(process.argv.slice(2));
const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-tarball-smoke-"));

try {
  run("npm", ["init", "-y"], root);
  run("npm", ["install", "--save-dev", tarball], root);
  await assertNoRuntimeCaches(
    path.join(root, "node_modules", "project-tiny-context-harness"),
  );
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "init",
      "--adopt",
      "--harness-folder",
      ".agent",
    ],
    root,
  );
  if (existsSync(path.join(root, ".codex", "hooks.json"))) {
    throw new Error("portable default unexpectedly installed Codex Hooks");
  }
  run("npx", ["--no-install", "ty-context", "doctor"], root);
  run("npx", ["--no-install", "ty-context", "validate-context"], root);
  if (!portableOnly) {
    run(
      "npx",
      ["--no-install", "ty-context", "enable", "composite-codex"],
      root,
    );
    const workdir = await writeHappyV3Inputs(root);
    await writeFile(path.join(root, ".gitignore"), "node_modules/\n", "utf8");
    run("git", ["init", "-b", "main"], root);
    run("git", ["config", "user.email", "tarball-smoke@example.invalid"], root);
    run("git", ["config", "user.name", "Tarball Smoke"], root);
    run("git", ["add", "."], root);
    run("git", ["commit", "-m", "tarball smoke fixture"], root);
    run(
      "npx",
      ["--no-install", "ty-context", "composite-long-task", "compile", workdir],
      root,
    );
    run(
      "npx",
      [
        "--no-install",
        "ty-context",
        "composite-long-task",
        "final-gate",
        workdir,
      ],
      root,
    );
    const result = JSON.parse(
      await readFile(path.join(workdir, "final-result.json"), "utf8"),
    );
    if (
      result.schema_version !== "long-task-final-result-v3" ||
      result.workflow_status !== "accepted"
    ) {
      throw new Error(
        `minimal Contract V3 smoke was not accepted: ${JSON.stringify(result)}`,
      );
    }
  }
  console.log(
    portableOnly
      ? `Tarball smoke passed: ${path.basename(tarball)}; portable init, doctor and validate-context accepted.`
      : `Tarball smoke passed: ${path.basename(tarball)}; portable init, doctor, validate-context, Contract V3 compile and Contract V3 Final Gate accepted.`,
  );
  await rm(root, { recursive: true, force: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Tarball smoke workspace kept at: ${root}`);
  process.exitCode = 1;
}

async function assertNoRuntimeCaches(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.name === "__pycache__" || /\.(?:pyc|pyo)$/i.test(entry.name)) {
      throw new Error(`tarball contains a Python runtime cache: ${absolute}`);
    }
    if (entry.isDirectory()) await assertNoRuntimeCaches(absolute);
  }
}

function parseArgs(args) {
  const index = args.indexOf("--tarball");
  const value = index >= 0 ? args[index + 1] : args[0];
  const portableOnly = args.includes("--portable-only");
  const expectedLength = portableOnly ? 3 : 2;
  if (
    !value ||
    (index >= 0 && args.length !== expectedLength) ||
    (index < 0 && args.length !== 1)
  ) {
    throw new Error(
      "usage: node tools/release_tarball_smoke.mjs --tarball <package.tgz> [--portable-only]",
    );
  }
  const resolved = path.resolve(value);
  if (!existsSync(resolved) || !resolved.endsWith(".tgz"))
    throw new Error(`tarball not found: ${resolved}`);
  return { tarball: resolved, portableOnly };
}

function run(command, args, cwd) {
  const executable =
    process.platform === "win32" && ["npm", "npx"].includes(command)
      ? (process.env.ComSpec ?? "cmd.exe")
      : command;
  const argv =
    executable === command ? args : ["/d", "/s", "/c", command, ...args];
  const result = spawnSync(executable, argv, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.status !== 0 || result.error) {
    throw (
      result.error ??
      new Error(
        `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
      )
    );
  }
}
