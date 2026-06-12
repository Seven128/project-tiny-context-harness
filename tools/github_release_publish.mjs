#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "project-tiny-context-harness";

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv) {
  const parsed = { root: defaultRepoRoot, version: null, target: null, repo: null, dryRun: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      parsed.root = path.resolve(requireValue(argv, ++index, "--root"));
    } else if (arg === "--version") {
      parsed.version = requireValue(argv, ++index, "--version");
    } else if (arg === "--target") {
      parsed.target = requireValue(argv, ++index, "--target");
    } else if (arg === "--repo") {
      parsed.repo = requireValue(argv, ++index, "--repo");
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`github_release_publish.mjs

Creates or updates the GitHub Release that matches the current npm package version.

Usage:
  node tools/github_release_publish.mjs [--version x.y.z] [--target <sha>] [--repo owner/name]
  node tools/github_release_publish.mjs --dry-run

Options:
  --version x.y.z  Package version. Defaults to packages/sdlc-harness/package.json.
  --target sha     Commit or branch used when GitHub needs to create tag v<version>.
  --repo owner/name
                  Repository passed through to gh release commands.
  --dry-run        Parse and report the planned release without contacting GitHub.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const version = args.version ?? (await readPackageVersion());
  const tag = `v${version}`;
  const packetPath = path.join(args.root, "docs", "launch", `github-release-${version}.md`);
  const packet = await fs.readFile(packetPath, "utf8");
  const title = extractReleaseTitle(packet, version);
  const body = extractReleaseBody(packet);
  const target = args.target ?? (args.dryRun ? "HEAD" : await gitHead());

  if (args.dryRun) {
    console.log(`would publish GitHub Release ${tag}`);
    console.log(`title: ${title}`);
    console.log(`target: ${target}`);
    console.log(`body: ${body.length} characters from ${slash(path.relative(args.root, packetPath))}`);
    return;
  }

  const notesPath = path.join(args.root, ".artifacts", "releases", `github-release-${version}-notes.md`);
  await fs.mkdir(path.dirname(notesPath), { recursive: true });
  await fs.writeFile(notesPath, body, "utf8");

  const exists = await ghReleaseExists(tag);
  if (exists) {
    await gh(["release", "edit", tag, "--title", title, "--notes-file", notesPath, "--latest"]);
    console.log(`updated GitHub Release ${tag}`);
  } else {
    await gh(["release", "create", tag, "--target", target, "--title", title, "--notes-file", notesPath, "--latest"]);
    console.log(`created GitHub Release ${tag}`);
  }
}

async function readPackageVersion() {
  const manifestPath = path.join(args.root, "packages", "sdlc-harness", "package.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid package version: ${manifest.version}`);
  }
  return manifest.version;
}

function extractReleaseTitle(packet, version) {
  const match = packet.match(/Title:\s*```text\s*([\s\S]*?)\s*```/);
  const title = match?.[1]?.trim();
  if (!title) {
    throw new Error("GitHub release packet is missing the title block.");
  }
  if (!title.includes(version)) {
    throw new Error(`GitHub release title must include ${version}.`);
  }
  return title;
}

function extractReleaseBody(packet) {
  const match = packet.match(/## Release Body\s+````markdown\s*([\s\S]*?)\s*````/);
  const body = match?.[1]?.trim();
  if (!body) {
    throw new Error("GitHub release packet is missing the fenced markdown release body.");
  }
  if (!/npm install -D project-tiny-context-harness@latest/.test(body)) {
    throw new Error("GitHub release body must include the npm install command.");
  }
  if (/## Manual UI Path/.test(body)) {
    throw new Error("GitHub release body must not include maintainer-only manual UI instructions.");
  }
  return `${body}\n`;
}

async function gitHead() {
  const result = await run("git", ["rev-parse", "HEAD"], { capture: true, quiet: true });
  return result.stdout.trim();
}

async function ghReleaseExists(tag) {
  const result = await gh(["release", "view", tag, "--json", "tagName"], { capture: true, quiet: true, allowFailure: true });
  return result.code === 0;
}

function gh(commandArgs, options = {}) {
  const repoArgs = args.repo ? ["--repo", args.repo] : [];
  return run("gh", [...commandArgs, ...repoArgs], options);
}

async function run(command, commandArgs, options = {}) {
  const capture = options.capture ?? false;
  const quiet = options.quiet ?? false;
  const allowFailure = options.allowFailure ?? false;
  return new Promise((resolve, reject) => {
    const invocation = spawnInvocation(command, commandArgs);
    const child = spawn(invocation.command, invocation.args, {
      cwd: args.root,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (!quiet) {
          process.stdout.write(text);
        }
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (!quiet) {
          process.stderr.write(text);
        }
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, stdout, stderr, output: `${stdout}${stderr}` };
      if (code === 0 || allowFailure) {
        resolve(result);
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

function spawnInvocation(command, commandArgs) {
  if (process.platform !== "win32") {
    return { command, args: commandArgs };
  }
  const shellCommand = [command, ...commandArgs].map(quoteWindowsArg).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", shellCommand]
  };
}

function quoteWindowsArg(value) {
  const text = String(value);
  if (text === "") {
    return "\"\"";
  }
  if (!/[ \t\n\v"&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replace(/(\\*)"/g, "$1$1\\\"").replace(/\\+$/g, "$&$&")}"`;
}

function slash(value) {
  return value.replace(/\\/g, "/");
}
