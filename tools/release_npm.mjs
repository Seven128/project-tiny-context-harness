#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const packageName = "project-tiny-context-harness";
const workspaceName = "project-tiny-context-harness";
const packageManifestPath = path.join(projectRoot, "packages", "sdlc-harness", "package.json");
const releaseReportRelativePath = ".artifacts/releases/current-release-status.md";
const releasePackDir = path.join(projectRoot, ".artifacts", "releases", "pack");

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (args.help) {
    printHelp();
    return;
  }
  if (args.publish && !args.yes) {
    throw new Error("Refusing to publish without --yes. Run dry-run first or pass --publish --yes.");
  }

  const currentVersion = await readPackageVersion();
  const registryBefore = await npmView(["version", "dist-tags.latest", "--json"], { optional: true });
  const registryPackageExists = Boolean(registryBefore);
  const latestBefore = registryBefore?.["dist-tags.latest"] ?? registryBefore?.version ?? currentVersion;
  const targetVersion = resolveRequestedTargetVersion({
    publish: args.publish,
    versionSpecified: args.versionSpecified,
    specifier: args.version,
    currentVersion,
    latestVersion: latestBefore,
    registryPackageExists
  });

  const report = {
    packageName,
    currentVersion,
    registryPackageExists,
    latestBefore,
    targetVersion,
    publish: args.publish,
    fullGate: args.fullGate,
    registrySmoke: args.registrySmoke,
    otpProvided: Boolean(args.otp),
    startedAt: new Date().toISOString(),
    steps: []
  };

  if (args.publish) {
    const whoami = await step(report, "npm auth check", () => run("npm", ["whoami"], { capture: true }));
    report.npmUser = whoami.stdout.trim();
  }

  if (args.publish || args.versionSpecified) {
    await step(report, "registry version availability", async () => {
      if (await registryHasVersion(targetVersion)) {
        throw new Error(`${packageName}@${targetVersion} already exists on npm.`);
      }
    });
  }

  if (args.publish) {
    await step(report, `bump package version to ${targetVersion}`, async () => {
      if (currentVersion === targetVersion) {
        console.log(`${packageName} is already at ${targetVersion}`);
        return;
      }
      await run("npm", ["version", targetVersion, "--workspace", workspaceName, "--no-git-tag-version"]);
    });
  } else {
    await step(report, "dry-run version check", async () => {
      console.log(`dry-run keeps workspace version at ${currentVersion}`);
      if (targetVersion !== currentVersion) {
        console.log(`publish target would be ${targetVersion}`);
      }
    });
  }

  await step(report, args.publish ? "release version surface sync" : "release version surface check", async () => {
    const syncArgs = ["tools/sync_release_version.mjs"];
    if (!args.publish) {
      syncArgs.push("--check");
    }
    await run("node", syncArgs);
  });

  if (args.publish) {
    await step(report, "package source sync", () =>
      run("node", ["packages/sdlc-harness/dist/cli.js", "package", "sync-source"])
    );
  }

  const pack = await step(report, args.publish ? "npm pack tarball" : "npm pack dry run", () =>
    packPackage({ publish: args.publish })
  );
  report.pack = pack;

  await step(report, "package source drift check", () =>
    run("node", ["packages/sdlc-harness/dist/cli.js", "package", "check-source"])
  );

  if (args.fullGate) {
    await step(report, "full test suite", () => run("node", ["--test", "tests/sdlc-harness/*.test.mjs"]));
    await step(report, "validate context", () =>
      run("node", ["packages/sdlc-harness/dist/cli.js", "validate-context"])
    );
  }

  await step(report, "pre-publish diff check", () => run("git", ["diff", "--check"]));

  if (args.publish) {
    await step(report, "npm publish tarball", () => publishTarball(pack.tarballPath));
    report.registry = await step(report, "registry latest verification", async () =>
      waitForLatest(targetVersion)
    );
    if (args.registrySmoke) {
      report.smoke = await step(report, "registry installed-consumer smoke", () =>
        installedConsumerSmoke(targetVersion)
      );
    }
    report.githubRelease = await step(report, "github release publish", () =>
      publishGitHubRelease(targetVersion)
    );
  }

  report.finishedAt = new Date().toISOString();
  await writeReleaseReport(report);
  await step(report, "final diff check", () => run("git", ["diff", "--check"]));
  await writeReleaseReport(report);

  console.log("");
  console.log(`${args.publish ? "Published" : "Prepared"} ${packageName}@${targetVersion}`);
  console.log(`Current release report: ${releaseReportRelativePath}`);
}

function parseArgs(argv) {
  const parsed = {
    version: "patch",
    versionSpecified: false,
    publish: false,
    yes: false,
    fullGate: false,
    registrySmoke: false,
    otp: null,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      parsed.version = argv[++i];
      parsed.versionSpecified = true;
      continue;
    }
    if (arg === "--publish") {
      parsed.publish = true;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
      continue;
    }
    if (arg === "--full-gate") {
      parsed.fullGate = true;
      continue;
    }
    if (arg === "--registry-smoke" || arg === "--smoke") {
      parsed.registrySmoke = true;
      continue;
    }
    if (arg === "--otp") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--otp requires a one-time password value");
      }
      parsed.otp = value;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node tools/release_npm.mjs [--version patch|minor|major|x.y.z] [--publish --yes] [--full-gate] [--registry-smoke] [--otp 123456]

Default mode is a non-mutating dry run against the current workspace package. Publishing
defaults to the current workspace version when the renamed package has no registry entry
yet; otherwise it defaults to a patch bump. The script verifies npm auth early, syncs
versioned release surfaces, builds once through npm pack, publishes that tarball, and verifies the registry latest tag.

Optional heavier gates:
  --full-gate       Run the full local node test suite and validate-context before publish.
  --registry-smoke  After publish, install the registry package in a temp consumer project.
  --otp             Pass an npm publish one-time password without writing it to the report.`);
}

async function step(report, label, action) {
  console.log(`\n==> ${label}`);
  const startedAt = new Date().toISOString();
  try {
    const value = await action();
    report.steps.push({ label, status: "PASS", startedAt, finishedAt: new Date().toISOString() });
    return value;
  } catch (error) {
    report.steps.push({
      label,
      status: "FAIL",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
    report.finishedAt = new Date().toISOString();
    await writeReleaseReport(report, "BLOCKED");
    throw error;
  }
}

async function readPackageVersion() {
  const manifest = JSON.parse(await fs.readFile(packageManifestPath, "utf8"));
  return manifest.version;
}

function resolveTargetVersion(specifier, currentVersion, latestVersion) {
  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(specifier)) {
    return specifier;
  }
  const base = compareVersions(currentVersion, latestVersion) >= 0 ? currentVersion : latestVersion;
  const parsed = parseVersion(base);
  if (specifier === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  if (specifier === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (specifier === "major") {
    return `${parsed.major + 1}.0.0`;
  }
  throw new Error(`Unsupported --version value: ${specifier}`);
}

function resolveRequestedTargetVersion({
  publish,
  versionSpecified,
  specifier,
  currentVersion,
  latestVersion,
  registryPackageExists
}) {
  if (!publish && !versionSpecified) {
    return currentVersion;
  }
  if (publish && !versionSpecified && !registryPackageExists) {
    return currentVersion;
  }
  return resolveTargetVersion(specifier, currentVersion, latestVersion);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }
  return 0;
}

async function registryHasVersion(version) {
  const result = await run("npm", ["view", `${packageName}@${version}`, "version", "--json"], {
    capture: true,
    quiet: true,
    allowFailure: true
  });
  return result.code === 0;
}

async function npmView(fields, options = {}) {
  const result = await run("npm", ["view", packageName, ...fields], {
    capture: true,
    allowFailure: options.optional,
    quiet: true
  });
  if (result.code !== 0 && options.optional) {
    return undefined;
  }
  return parseJsonFromOutput(result.output);
}

async function waitForLatest(targetVersion) {
  let last;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    last = await npmView(["version", "dist-tags.latest", "dist.integrity", "--json"]);
    if (last.version === targetVersion && last["dist-tags.latest"] === targetVersion) {
      return last;
    }
    await delay(3000);
  }
  throw new Error(
    `Registry latest did not resolve to ${targetVersion}; last response: ${JSON.stringify(last)}`
  );
}

async function packPackage({ publish }) {
  if (publish) {
    await fs.rm(releasePackDir, { recursive: true, force: true });
    await fs.mkdir(releasePackDir, { recursive: true });
  }

  const commandArgs = ["pack", "--json", "--workspace", workspaceName];
  if (publish) {
    commandArgs.push("--pack-destination", releasePackDir);
  } else {
    commandArgs.push("--dry-run");
  }

  const result = await run("npm", commandArgs, { capture: true, quiet: true });
  const pack = parsePackJson(result.output);
  console.log(`${pack.filename}: ${pack.entryCount ?? pack.files?.length ?? "unknown"} files, ${formatBytes(pack.size)}`);
  return {
    ...pack,
    mode: publish ? "tarball" : "dry-run",
    tarballPath: publish ? path.join(releasePackDir, pack.filename) : undefined
  };
}

async function installedConsumerSmoke(version) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sdlc-release-smoke-"));
  await run("npm", ["init", "-y"], { cwd: tmp });
  await run("npm", ["install", "-D", `${packageName}@${version}`], { cwd: tmp });
  const installedVersion = (
    await run("node", ["-p", "require('./node_modules/project-tiny-context-harness/package.json').version"], {
      cwd: tmp,
      capture: true
    })
  ).stdout.trim();
  if (installedVersion !== version) {
    throw new Error(`Installed package version ${installedVersion} did not match ${version}`);
  }
  await run("npx", ["--no-install", "sdlc-harness", "init", "--harness-folder", ".codex"], { cwd: tmp });
  const doctor = await run("npx", ["--no-install", "sdlc-harness", "doctor"], { cwd: tmp, capture: true });
  if (!doctor.output.includes(`core package: ${packageName}@${version}`)) {
    throw new Error("Doctor output did not include the expected package version.");
  }
  return {
    tempDir: tmp,
    installedVersion,
    doctorOutput: doctor.output.trim()
  };
}

async function publishTarball(tarballPath) {
  const commandArgs = ["publish", tarballPath, "--access", "public"];
  if (args.otp) {
    commandArgs.push("--otp", args.otp);
  }
  return run("npm", commandArgs);
}

async function publishGitHubRelease(version) {
  const result = await run("node", ["tools/github_release_publish.mjs", "--version", version], {
    capture: true
  });
  return result.output.trim();
}

async function run(command, commandArgs, options = {}) {
  const cwd = options.cwd ?? projectRoot;
  const capture = options.capture ?? false;
  const quiet = options.quiet ?? false;
  const allowFailure = options.allowFailure ?? false;
  return new Promise((resolve, reject) => {
    const invocation = spawnInvocation(command, commandArgs);
    const child = spawn(invocation.command, invocation.args, {
      cwd,
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

function spawnInvocation(command, args) {
  if (process.platform !== "win32") {
    return { command, args };
  }
  const shellCommand = [command, ...args].map(quoteWindowsArg).join(" ");
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

function parsePackJson(output) {
  const data = parseJsonFromOutput(output);
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) {
    throw new Error("Could not parse npm pack --json output.");
  }
  return {
    filename: item.filename,
    shasum: item.shasum,
    integrity: item.integrity,
    size: item.size,
    unpackedSize: item.unpackedSize,
    entryCount: item.entryCount ?? item.files?.length
  };
}

function parseJsonFromOutput(output) {
  const trimmed = output.trim();
  const candidates = [trimmed];
  for (const marker of ["[", "{", "\""]) {
    const index = trimmed.indexOf(marker);
    if (index >= 0) {
      const extracted = extractJsonCandidate(trimmed, index);
      if (extracted) {
        candidates.push(extracted);
      }
      candidates.push(trimmed.slice(index));
    }
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(`Could not parse JSON from output:\n${output}`);
}

function extractJsonCandidate(input, startIndex) {
  const opener = input[startIndex];
  if (opener === "\"") {
    const endIndex = input.indexOf("\n", startIndex);
    return input.slice(startIndex, endIndex >= 0 ? endIndex : undefined).trim();
  }
  const closerByOpener = { "[": "]", "{": "}" };
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "[" || char === "{") {
      stack.push(closerByOpener[char]);
      continue;
    }
    if ((char === "]" || char === "}") && stack.length > 0) {
      const expected = stack.pop();
      if (char !== expected) {
        return undefined;
      }
      if (stack.length === 0) {
        return input.slice(startIndex, index + 1);
      }
    }
  }
  return undefined;
}

async function writeReleaseReport(report, forcedStatus) {
  const version = report.targetVersion;
  const status = forcedStatus ?? (report.publish ? "RELEASED" : "DRY_RUN");
  const decision = status === "RELEASED" || status === "DRY_RUN" ? "PASS" : "BLOCKED";
  const docPath = path.join(projectRoot, releaseReportRelativePath);
  const pack = report.pack;
  const registry = report.registry;
  const smoke = report.smoke;
  const githubRelease = report.githubRelease;
  const authStatus = report.publish ? stepStatus(report, "npm auth check") : "SKIPPED, dry-run did not publish";
  const fullGateStatus = report.fullGate ? stepStatus(report, "full test suite") : "SKIPPED, --full-gate not enabled";
  const validateStatus = report.fullGate ? stepStatus(report, "validate context") : "SKIPPED, --full-gate not enabled";
  const versionSurfaceLabel = report.publish ? "release version surface sync" : "release version surface check";
  const packageSourceSyncStatus = report.publish
    ? stepStatus(report, "package source sync")
    : "SKIPPED, dry-run did not mutate package assets";
  const packCommand =
    pack?.mode === "tarball"
      ? `npm pack --json --workspace ${workspaceName} --pack-destination .artifacts/releases/pack`
      : `npm pack --dry-run --json --workspace ${workspaceName}`;
  const publishCommand = "npm publish <packed tarball> --access public";
  const publishEvidence = stepPassed(report, "npm publish tarball")
    ? `PASS, registry returned ${packageName}@${version}.`
    : report.publish
      ? `${stepStatus(report, "npm publish tarball")}.`
      : "SKIPPED, dry-run did not publish.";
  const registryEvidence = registry
    ? `PASS, version and latest both resolve to ${version}.`
    : report.publish
      ? "Pending."
      : "SKIPPED, dry-run did not query latest.";
  const smokeEvidence = smoke
    ? `PASS, installed ${packageName}@${version} from the npm registry; init and doctor passed; doctor output ${inline(smoke.doctorOutput.split("\n").find((line) => line.includes("core package")) ?? "")}.`
    : report.publish && report.registrySmoke
      ? "Pending."
      : "SKIPPED, --registry-smoke not enabled.";
  const githubReleaseEvidence = githubRelease
    ? `PASS, ${inline(singleLine(githubRelease))}.`
    : report.publish
      ? `${stepStatus(report, "github release publish")}.`
      : "SKIPPED, dry-run did not mutate GitHub releases.";
  const releaseUpdateMode = await readReleaseUpdateMode(version);

  const content = `# Current Release Report

This report is a generated release artifact under \`.artifacts/**\`. Historical release evidence lives in git tags, npm registry metadata, CI logs and release commits.

## 1. Release Summary

- Version: \`${packageName}@${version}\`
- Milestone: \`MVP\`
- Date: \`${new Date().toISOString().slice(0, 10)}\`
- Owner: \`release_manager\`
- Registry: \`https://registry.npmjs.org/\`
- Status: \`${status}\`
- Update mode: \`${releaseUpdateMode}\`
- Current release report: \`${releaseReportRelativePath}\`

## 2. Included Changes

- Publish the synchronized Project Tiny Context Harness package assets and CLI build from the current workspace.
- This release is produced by \`tools/release_npm.mjs\`. If the renamed package has no registry entry yet, the script publishes the current workspace version by default; once registry latest exists, the default path bumps patch versions. The release path covers npm auth, version check/bump, source drift check, tarball pack, publish, registry latest verification and GitHub Release create/update. \`--full-gate\` and \`--registry-smoke\` enable heavier validation.
- Versioned release surfaces are synchronized by \`tools/sync_release_version.mjs\` before packing during publish runs. Dry runs use \`--check\` so ordinary validation does not rewrite the repository.
- Release update mode is read from \`docs/launch/github-release-${version}.md\`; users should follow that packet's \`sync-only\`, \`upgrade-required\` or \`manual-required\` path after updating.
- The tarball publish command passes \`--access public\` explicitly so the rename window does not depend on npm default access semantics.

## 3. Build Artifacts

| Artifact | Location | Checksum/Version |
|---|---|---|
| npm package | \`${packageName}\` | \`${version}\` |
| package tarball | \`${packCommand}\` | \`${pack?.shasum ?? "Pending"}\` |
| tarball integrity | same | \`${pack?.integrity ?? "Pending"}\` |
| package content | pack output | ${pack ? `${pack.entryCount} files, ${formatBytes(pack.size)} package size, ${formatBytes(pack.unpackedSize)} unpacked size` : "Pending"} |
| registry package | \`npm view ${packageName} version dist-tags.latest dist.integrity --json\` | ${registry ? `\`version ${registry.version}\`, \`latest ${registry["dist-tags.latest"]}\`, \`integrity ${registry["dist.integrity"]}\`` : "Pending"} |

## 4. Smoke Test Result

- Decision: \`${decision}\`
- Evidence:
  - \`npm whoami\`: ${authStatus}.
  - npm publish OTP: ${report.otpProvided ? "PROVIDED, not written to the report." : "NOT PROVIDED"}.
  - Release update mode: \`${releaseUpdateMode}\` from \`docs/launch/github-release-${version}.md\`.
  - \`node tools/sync_release_version.mjs${report.publish ? "" : " --check"}\`: ${stepStatus(report, versionSurfaceLabel)}.
  - \`node packages/sdlc-harness/dist/cli.js package sync-source\`: ${packageSourceSyncStatus}.
  - \`node packages/sdlc-harness/dist/cli.js package check-source\`: ${stepStatus(report, "package source drift check")}.
  - \`node --test tests/sdlc-harness/*.test.mjs\`: ${fullGateStatus}.
  - \`node packages/sdlc-harness/dist/cli.js validate-context\`: ${validateStatus}.
  - \`${packCommand}\`: ${stepStatus(report, pack?.mode === "tarball" ? "npm pack tarball" : "npm pack dry run")}.
  - \`git diff --check\`: ${stepStatus(report, "final diff check")}.
  - \`${publishCommand}\`: ${publishEvidence}
  - \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`: ${registryEvidence}
  - Registry installed-consumer smoke: ${smokeEvidence}
  - GitHub Release create/update: ${githubReleaseEvidence}

## 5. Deployment Checklist

- [x] Confirm registry latest before publishing.
- [${stepPassed(report, `bump package version to ${version}`) || !report.publish ? "x" : " "}] Bump package version to \`${version}\`.
- [${stepPassed(report, "package source drift check") ? "x" : " "}] Package source drift check passed.
- [${stepPassed(report, "npm pack tarball") || stepPassed(report, "npm pack dry run") ? "x" : " "}] Package pack passed.
- [${stepPassed(report, "npm publish tarball") ? "x" : " "}] Publish package with \`${publishCommand}\`.
- [${registry ? "x" : " "}] Verify registry package with \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`.
- [${stepPassed(report, "github release publish") ? "x" : " "}] Create or update GitHub Release \`v${version}\`.
- Optional full local test suite: ${fullGateStatus}.
- Optional registry installed-consumer smoke: ${smoke ? "PASS" : report.registrySmoke ? "Pending" : "SKIPPED, --registry-smoke not enabled"}.

## 6. Rollback Plan

- Triggers:
  - \`npm publish\` fails and the package was not created.
  - Publish succeeds, but install, init, doctor or packaged asset/source drift verification fails.
  - Publish succeeds, but GitHub Release create/update fails.
- Steps:
  1. If publish did not succeed, do not create a release tag. Keep the current release status blocked, fix the issue and rerun the release gate.
  2. If publish succeeded but smoke failed, stop promoting that version immediately.
  3. If only GitHub Release create/update failed, fix credentials or release conflicts and rerun \`node tools/github_release_publish.mjs --version ${version}\`.
  4. Because npm package versions cannot be reused, bump to the next patch version after package-content fixes, then rerun the test/release gate and publish again.
  5. If consumers need to roll back, tell them to install the previous stable version or pin the dependency by git commit/tag.
- Data considerations:
  - This package ships the CLI and Harness assets; it does not migrate data outside the npm registry.
  - Consumer repository sync/upgrade follows the release update mode and managed-file incremental rules; rollback must not overwrite user-owned local customization.
- Owner: \`release_manager\`

## 7. Known Issues

- None recorded for this release status. Update this section before publish if smoke, registry or consumer install limitations are discovered.
`;
  await fs.mkdir(path.dirname(docPath), { recursive: true });
  await fs.writeFile(docPath, content);
}

async function readReleaseUpdateMode(version) {
  const packetPath = path.join(projectRoot, "docs", "launch", `github-release-${version}.md`);
  const packet = await fs.readFile(packetPath, "utf8");
  const match = packet.match(/Update Mode:\s*`(sync-only|upgrade-required|manual-required)`/);
  if (!match) {
    throw new Error(`Release update mode missing from ${path.relative(projectRoot, packetPath)}`);
  }
  return match[1];
}

function stepStatus(report, label) {
  const found = report.steps.find((stepItem) => stepItem.label === label);
  return found?.status ?? "Pending";
}

function stepPassed(report, label) {
  return stepStatus(report, label) === "PASS";
}

function inline(value) {
  return value ? `\`${value}\`` : "`doctor output missing core package line`";
}

function singleLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function formatBytes(value) {
  if (typeof value !== "number") {
    return "unknown";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} kB`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
