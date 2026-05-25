#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const packageName = "agent-project-sdlc";
const workspaceName = "agent-project-sdlc";
const packageManifestPath = path.join(projectRoot, "packages", "sdlc-harness", "package.json");

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
  const targetVersion = resolveTargetVersion(args.version, currentVersion, latestBefore);

  if (await registryHasVersion(targetVersion)) {
    throw new Error(`${packageName}@${targetVersion} already exists on npm.`);
  }

  const report = {
    packageName,
    currentVersion,
    latestBefore,
    targetVersion,
    publish: args.publish,
    startedAt: new Date().toISOString(),
    steps: []
  };

  await step(report, `bump package version to ${targetVersion}`, async () => {
    if (currentVersion === targetVersion) {
      console.log(`${packageName} is already at ${targetVersion}`);
      return;
    }
    await run("npm", ["version", targetVersion, "--workspace", workspaceName, "--no-git-tag-version"]);
  });

  await step(report, "npm test", () => run("npm", ["test"]));
  await step(report, "package source drift check", () =>
    run("node", ["packages/sdlc-harness/dist/cli.js", "package", "check-source"])
  );

  const pack = await step(report, "npm pack dry run", async () => {
    const result = await run("npm", ["pack", "--dry-run", "--json", "--workspace", workspaceName], {
      capture: true
    });
    return parsePackJson(result.output);
  });
  report.pack = pack;

  await step(report, "pre-publish diff check", () => run("git", ["diff", "--check"]));

  if (args.publish) {
    await step(report, "npm publish", () => run("npm", ["publish", "--workspace", workspaceName]));
    report.registry = await step(report, "registry latest verification", async () =>
      waitForLatest(targetVersion)
    );
    report.smoke = await step(report, "registry installed-consumer smoke", () =>
      installedConsumerSmoke(targetVersion)
    );
  }

  report.finishedAt = new Date().toISOString();
  await writeReleaseDoc(report);
  await step(report, "refresh docs overview", () => run("make", ["docs-overview"]));
  await step(report, "validate harness", () => run("make", ["validate-harness"]));
  if (await hasOpenTask()) {
    await step(report, "validate allowed paths", () => run("python3", ["tools/validate_allowed_paths.py"]));
  }
  await step(report, "final diff check", () => run("git", ["diff", "--check"]));
  await writeReleaseDoc(report);

  console.log("");
  console.log(`${args.publish ? "Published" : "Prepared"} ${packageName}@${targetVersion}`);
  console.log(`Release doc: .docs/08_release/v${targetVersion}_npm_release.md`);
}

function parseArgs(argv) {
  const parsed = {
    version: "patch",
    publish: false,
    yes: false,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      parsed.version = argv[++i];
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
  node tools/release_npm.mjs [--version patch|minor|major|x.y.z] [--publish --yes]

Default mode is a dry run that bumps the package version, runs release gates, and writes
the release doc. Pass --publish --yes to publish to npm and run registry smoke.`);
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
    await writeReleaseDoc(report, "BLOCKED");
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
    allowFailure: options.optional
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
  await run("npx", ["sdlc-harness", "init", "--harness-folder", ".agent"], { cwd: tmp });
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
    const child = spawn(command, commandArgs, {
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

async function writeReleaseDoc(report, forcedStatus) {
  const version = report.targetVersion;
  const status = forcedStatus ?? (report.publish ? "RELEASED" : "DRY_RUN");
  const decision = status === "RELEASED" || status === "DRY_RUN" ? "PASS" : "BLOCKED";
  const docPath = path.join(projectRoot, ".docs", "08_release", `v${version}_npm_release.md`);
  const pack = report.pack;
  const registry = report.registry;
  const smoke = report.smoke;
  const publishEvidence = stepPassed(report, "npm publish")
    ? `PASS，registry 返回 ${packageName}@${version}。`
    : report.publish
      ? `${stepStatus(report, "npm publish")}。`
      : "SKIPPED，dry-run 未发布。";
  const registryEvidence = registry
    ? `PASS，version 和 latest 均为 ${version}。`
    : report.publish
      ? "Pending。"
      : "SKIPPED，dry-run 未查询 latest。";
  const smokeEvidence = smoke
    ? `PASS，从 npm registry 安装 ${packageName}@${version} 后，init 和 doctor 均通过，doctor 输出 ${inline(smoke.doctorOutput.split("\n").find((line) => line.includes("core package")) ?? "")}。`
    : report.publish
      ? "Pending。"
      : "SKIPPED，dry-run 未安装 registry package。";

  const content = `# Release Note And Rollback Plan（发布说明与回滚方案）

## 1. Release Summary（发布摘要）

- Version: \`${packageName}@${version}\`
- Milestone: \`MVP\`
- Date: \`${new Date().toISOString().slice(0, 10)}\`
- Owner: \`release_manager\`
- Registry: \`https://registry.npmjs.org/\`
- Status: \`${status}\`

## 2. Included Changes（包含变更）

- 发布当前 workspace 中已同步的 AI SDLC Harness package assets 和 CLI build。
- 本版本由 \`tools/release_npm.mjs\` 执行发布闭环，覆盖 version bump、test、source drift check、pack dry-run、publish、registry latest verification 和 installed-consumer smoke。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | \`${packageName}\` | \`${version}\` |
| dry-run tarball | \`npm pack --dry-run --json --workspace ${workspaceName}\` | \`${pack?.shasum ?? "Pending"}\` |
| dry-run integrity | same | \`${pack?.integrity ?? "Pending"}\` |
| package content | dry-run output | ${pack ? `${pack.entryCount} files, ${formatBytes(pack.size)} package size, ${formatBytes(pack.unpackedSize)} unpacked size` : "Pending"} |
| registry package | \`npm view ${packageName} version dist-tags.latest dist.integrity --json\` | ${registry ? `\`version ${registry.version}\`, \`latest ${registry["dist-tags.latest"]}\`, \`integrity ${registry["dist.integrity"]}\`` : "Pending"} |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: \`${decision}\`
- Evidence:
  - \`npm test\`: ${stepStatus(report, "npm test")}。
  - \`node packages/sdlc-harness/dist/cli.js package check-source\`: ${stepStatus(report, "package source drift check")}。
  - \`make validate-harness\`: ${stepStatus(report, "validate harness")}。
  - \`npm pack --dry-run --json --workspace ${workspaceName}\`: ${stepStatus(report, "npm pack dry run")}。
  - \`git diff --check\`: ${stepStatus(report, "final diff check")}。
  - \`npm publish --workspace ${workspaceName}\`: ${publishEvidence}
  - \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`: ${registryEvidence}
  - Registry installed-consumer smoke: ${smokeEvidence}

## 5. Deployment Checklist（部署检查清单）

- [x] Confirm registry latest before publishing.
- [x] Bump package version to \`${version}\`.
- [${stepPassed(report, "package source drift check") ? "x" : " "}] Package source drift check passed.
- [${stepPassed(report, "npm test") ? "x" : " "}] npm tests passed.
- [${stepPassed(report, "npm pack dry run") ? "x" : " "}] Pack dry run passed.
- [${stepPassed(report, "npm publish") ? "x" : " "}] Publish package with \`npm publish --workspace ${workspaceName}\`.
- [${registry ? "x" : " "}] Verify registry package with \`npm view ${packageName} version dist-tags.latest dist.integrity --json\`.
- [${smoke ? "x" : " "}] Run installed-consumer smoke from npm registry.
- [ ] Create and push git tag \`v${version}\` after publish success.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - \`npm publish\` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release doc 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: \`release_manager\`
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

async function hasOpenTask() {
  try {
    const plan = await fs.readFile(path.join(projectRoot, ".agent", "state", "plan.yaml"), "utf8");
    return /^current_task_id:\s*"[^"]+"/m.test(plan) && !/^current_task_id:\s*""/m.test(plan);
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
