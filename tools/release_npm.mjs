#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const packageName = "agent-project-sdlc";
const workspaceName = "agent-project-sdlc";
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
  const latestBefore = registryBefore?.["dist-tags.latest"] ?? registryBefore?.version ?? currentVersion;
  const targetVersion =
    args.publish || args.versionSpecified
      ? resolveTargetVersion(args.version, currentVersion, latestBefore)
      : currentVersion;

  const report = {
    packageName,
    currentVersion,
    latestBefore,
    targetVersion,
    publish: args.publish,
    fullGate: args.fullGate,
    registrySmoke: args.registrySmoke,
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
    await step(report, "npm publish tarball", () => run("npm", ["publish", pack.tarballPath]));
    report.registry = await step(report, "registry latest verification", async () =>
      waitForLatest(targetVersion)
    );
    if (args.registrySmoke) {
      report.smoke = await step(report, "registry installed-consumer smoke", () =>
        installedConsumerSmoke(targetVersion)
      );
    }
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
  node tools/release_npm.mjs [--version patch|minor|major|x.y.z] [--publish --yes] [--full-gate] [--registry-smoke]

Default mode is a non-mutating dry run against the current workspace package. Publishing
defaults to a patch bump, verifies npm auth early, builds once through npm pack, publishes
that tarball, and verifies the registry latest tag.

Optional heavier gates:
  --full-gate       Run the full local node test suite and validate-context before publish.
  --registry-smoke  After publish, install the registry package in a temp consumer project.`);
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
    await run("node", ["-p", "require('./node_modules/agent-project-sdlc/package.json').version"], {
      cwd: tmp,
      capture: true
    })
  ).stdout.trim();
  if (installedVersion !== version) {
    throw new Error(`Installed package version ${installedVersion} did not match ${version}`);
  }
  await run("npx", ["sdlc-harness", "init", "--harness-folder", ".codex"], { cwd: tmp });
  const doctor = await run("npx", ["sdlc-harness", "doctor"], { cwd: tmp, capture: true });
  if (!doctor.output.includes(`core package: ${packageName}@${version}`)) {
    throw new Error("Doctor output did not include the expected package version.");
  }
  return {
    tempDir: tmp,
    installedVersion,
    doctorOutput: doctor.output.trim()
  };
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
  const authStatus = report.publish ? stepStatus(report, "npm auth check") : "SKIPPED，dry-run 未发布";
  const fullGateStatus = report.fullGate ? stepStatus(report, "full test suite") : "SKIPPED，未启用 `--full-gate`";
  const validateStatus = report.fullGate ? stepStatus(report, "validate context") : "SKIPPED，未启用 `--full-gate`";
  const packCommand =
    pack?.mode === "tarball"
      ? `npm pack --json --workspace ${workspaceName} --pack-destination .artifacts/releases/pack`
      : `npm pack --dry-run --json --workspace ${workspaceName}`;
  const publishEvidence = stepPassed(report, "npm publish tarball")
    ? `PASS，registry 返回 ${packageName}@${version}。`
    : report.publish
      ? `${stepStatus(report, "npm publish tarball")}。`
      : "SKIPPED，dry-run 未发布。";
  const registryEvidence = registry
    ? `PASS，version 和 latest 均为 ${version}。`
    : report.publish
      ? "Pending。"
      : "SKIPPED，dry-run 未查询 latest。";
  const smokeEvidence = smoke
    ? `PASS，从 npm registry 安装 ${packageName}@${version} 后，init 和 doctor 均通过，doctor 输出 ${inline(smoke.doctorOutput.split("\n").find((line) => line.includes("core package")) ?? "")}。`
    : report.publish && report.registrySmoke
      ? "Pending。"
      : "SKIPPED，未启用 `--registry-smoke`。";

  const content = `# Current Release Report（当前发布报告）

This report is a generated release artifact under \`.artifacts/**\`. Historical release evidence lives in git tags, npm registry metadata, CI logs and release commits.

## 1. Release Summary（发布摘要）

- Version: \`${packageName}@${version}\`
- Milestone: \`MVP\`
- Date: \`${new Date().toISOString().slice(0, 10)}\`
- Owner: \`release_manager\`
- Registry: \`https://registry.npmjs.org/\`
- Status: \`${status}\`
- Current release report: \`${releaseReportRelativePath}\`

## 2. Included Changes（包含变更）

- 发布当前 workspace 中已同步的 AI SDLC Harness package assets 和 CLI build。
- 本版本由 \`tools/release_npm.mjs\` 执行发布闭环。默认发布路径覆盖 npm auth、version bump、source drift check、tarball pack、publish 和 registry latest verification；\`--full-gate\` 和 \`--registry-smoke\` 可启用更重验证。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | \`${packageName}\` | \`${version}\` |
| package tarball | \`${packCommand}\` | \`${pack?.shasum ?? "Pending"}\` |
| tarball integrity | same | \`${pack?.integrity ?? "Pending"}\` |
| package content | pack output | ${pack ? `${pack.entryCount} files, ${formatBytes(pack.size)} package size, ${formatBytes(pack.unpackedSize)} unpacked size` : "Pending"} |
| registry package | \`npm view ${packageName} version dist-tags.latest dist.integrity --json\` | ${registry ? `\`version ${registry.version}\`, \`latest ${registry["dist-tags.latest"]}\`, \`integrity ${registry["dist.integrity"]}\`` : "Pending"} |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: \`${decision}\`
- Evidence:
  - \`npm whoami\`: ${authStatus}。
  - \`node packages/sdlc-harness/dist/cli.js package check-source\`: ${stepStatus(report, "package source drift check")}。
  - \`node --test tests/sdlc-harness/*.test.mjs\`: ${fullGateStatus}。
  - \`node packages/sdlc-harness/dist/cli.js validate-context\`: ${validateStatus}。
  - \`${packCommand}\`: ${stepStatus(report, pack?.mode === "tarball" ? "npm pack tarball" : "npm pack dry run")}。
  - \`git diff --check\`: ${stepStatus(report, "final diff check")}。
  - \`npm publish <packed tarball>\`: ${publishEvidence}
  - \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`: ${registryEvidence}
  - Registry installed-consumer smoke: ${smokeEvidence}

## 5. Deployment Checklist（部署检查清单）

- [x] Confirm registry latest before publishing.
- [${stepPassed(report, `bump package version to ${version}`) || !report.publish ? "x" : " "}] Bump package version to \`${version}\`.
- [${stepPassed(report, "package source drift check") ? "x" : " "}] Package source drift check passed.
- [${stepPassed(report, "npm pack tarball") || stepPassed(report, "npm pack dry run") ? "x" : " "}] Package pack passed.
- [${stepPassed(report, "npm publish tarball") ? "x" : " "}] Publish package with \`npm publish <packed tarball>\`.
- [${registry ? "x" : " "}] Verify registry package with \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`.
- Optional full local test suite: ${fullGateStatus}。
- Optional registry installed-consumer smoke: ${smoke ? "PASS" : report.registrySmoke ? "Pending" : "SKIPPED，未启用 `--registry-smoke`"}。
- [ ] Create and push git tag \`v${version}\` after publish success.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - \`npm publish\` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release status 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: \`release_manager\`

## 7. Known Issues（已知限制）

- None recorded for this release status. Update this section before publish if smoke, registry or consumer install limitations are discovered.
`;
  await fs.mkdir(path.dirname(docPath), { recursive: true });
  await fs.writeFile(docPath, content);
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
