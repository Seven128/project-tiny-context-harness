import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prepareScript = path.join(repoRoot, "tools/release_prepare.mjs");
const publishScript = path.join(repoRoot, "tools/release_publish.mjs");
const legacyNpmScript = path.join(repoRoot, "tools/release_npm.mjs");

const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
assert.equal(rootPackage.scripts["release:prepare"], "node tools/release_prepare.mjs");
assert.equal(rootPackage.scripts["release:publish"], "node tools/release_publish.mjs");
assert.equal(rootPackage.scripts["release:npm"], "node tools/release_npm.mjs");

const legacyNoArgs = runNode(legacyNpmScript, []);
assert.equal(legacyNoArgs.status, 0, `${legacyNoArgs.stdout}\n${legacyNoArgs.stderr}`);
assert.match(legacyNoArgs.stdout, /release:prepare/);
assert.match(legacyNoArgs.stdout, /release:publish/);
assert.doesNotMatch(legacyNoArgs.stdout, /Prepared project-tiny-context-harness@/);

const legacyOldPublishArgs = runNode(legacyNpmScript, ["--version", "patch", "--publish", "--yes"]);
assert.notEqual(legacyOldPublishArgs.status, 0);
assert.match(`${legacyOldPublishArgs.stdout}\n${legacyOldPublishArgs.stderr}`, /no longer accepts --version, --publish or --full-gate/);

const fixture = mkdtempSync(path.join(os.tmpdir(), "release-flow-scripts-"));

try {
  seedReleaseFixture(fixture, "1.2.3");

  const prepareLog = path.join(fixture, "prepare-commands.jsonl");
  const prepare = runNode(prepareScript, ["--root", fixture, "--version", "patch", "--update-mode", "upgrade-required"], {
    TY_CONTEXT_RELEASE_COMMAND_LOG: prepareLog
  });
  assert.equal(prepare.status, 0, `${prepare.stdout}\n${prepare.stderr}`);
  assert.match(prepare.stdout, /Prepared project-tiny-context-harness@1\.2\.4/);
  assert.match(read("packages/ty-context/package.json"), /"version": "1\.2\.4"/);
  assert.match(read("package-lock.json"), /"version": "1\.2\.4"/);
  assert.match(read("docs/launch/github-release-1.2.4.md"), /Update Mode: `upgrade-required`/);
  assert.match(read("docs/launch/github-release-1.2.4.md"), /synchronized package assets and CLI build/);

  const prepareCommands = readJsonLines(prepareLog);
  assert.deepEqual(
    prepareCommands.map((entry) => entry.argv.join(" ")),
    [
      "npm run build --workspace project-tiny-context-harness",
      "node packages/ty-context/dist/cli.js package sync-source",
      "node packages/ty-context/dist/cli.js package check-source",
      "npm run release:check-version",
      "node packages/ty-context/dist/cli.js upgrade --check --json",
      "npm test --workspace project-tiny-context-harness",
      "git diff --check"
    ]
  );

  const publishNoFallback = runNode(publishScript, ["--root", fixture], {
    TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(fixture, "publish-guidance.jsonl")
  });
  assert.equal(publishNoFallback.status, 0, `${publishNoFallback.stdout}\n${publishNoFallback.stderr}`);
  assert.match(publishNoFallback.stdout, /Trusted Publishing is preferred/);
  assert.doesNotMatch(publishNoFallback.stdout, /Published project-tiny-context-harness@1\.2\.4/);

  const publishMissingYes = runNode(publishScript, ["--root", fixture, "--local-fallback"], {
    TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(fixture, "publish-missing-yes.jsonl")
  });
  assert.notEqual(publishMissingYes.status, 0);
  assert.match(`${publishMissingYes.stdout}\n${publishMissingYes.stderr}`, /requires --yes/);

  const publishLog = path.join(fixture, "publish-commands.jsonl");
  const publish = runNode(publishScript, ["--root", fixture, "--local-fallback", "--yes"], {
    TY_CONTEXT_RELEASE_COMMAND_LOG: publishLog
  });
  assert.equal(publish.status, 0, `${publish.stdout}\n${publish.stderr}`);
  assert.match(publish.stdout, /Published project-tiny-context-harness@1\.2\.4/);
  assert.match(publish.stdout, /GitHub Release skipped: gh not authenticated/);

  const publishCommands = readJsonLines(publishLog).map((entry) => entry.argv.join(" "));
  assert.ok(publishCommands.includes("npm publish .artifacts/releases/pack/project-tiny-context-harness-1.2.4.tgz --access public"));
  assert.ok(publishCommands.includes("git tag -a v1.2.4 -m Project-Tiny-Context-Harness-1.2.4"));
  assert.ok(publishCommands.includes("git push origin v1.2.4"));
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

function runNode(script, args, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    timeout: 30_000,
    windowsHide: true
  });
}

function seedReleaseFixture(root, version) {
  write("packages/ty-context/package.json", JSON.stringify({ name: "project-tiny-context-harness", version }, null, 2));
  write(
    "package-lock.json",
    JSON.stringify({ packages: { "packages/ty-context": { name: "project-tiny-context-harness", version } } }, null, 2)
  );
  for (const relativePath of [
    "README.md",
    "packages/ty-context/README.md",
    "packages/ty-context/assets/README.md",
    "docs/adopt-existing-repo.md",
    "docs/launch/private-review.md",
    "docs/launch/profile.md"
  ]) {
    write(relativePath, `npm install -D /tmp/project-tiny-context-harness-${version}.tgz\n`);
  }
  write(
    ".github/workflows/npm-publish.yml",
    ["on:", "  workflow_dispatch:", "    inputs:", "      expected_version:", `        default: \"${version}\"`, ""].join("\n")
  );
  write(
    "docs/launch/README.md",
    `For the \`${version}\` GitHub Release fields, see [github-release-${version}.md](github-release-${version}.md).\n`
  );
  write(
    "docs/launch/primary-launch.md",
    [
      `This is the copy-ready launch packet after \`project-tiny-context-harness@${version}\` is published.`,
      `- npm \`project-tiny-context-harness@${version}\` is published and installable.`,
      `- The \`v${version}\` GitHub Release is published from [github-release-${version}.md](github-release-${version}.md).`,
      ""
    ].join("\n")
  );
  write(
    "docs/launch/market-map.md",
    [
      `| GitHub release | Latest release is \`Project Tiny Context Harness ${version}\` |`,
      `| npm package | \`project-tiny-context-harness@${version}\` is published and installable through \`@latest\` |`,
      ""
    ].join("\n")
  );
  write(
    "docs/launch/outreach-targets.md",
    `- \`v${version}\` is published on npm, and the current latest GitHub Release is \`Project Tiny Context Harness ${version}\`.\n`
  );
  write(
    "docs/launch/npm-trusted-publishing.md",
    `The current published package is \`project-tiny-context-harness@${version}\`. Prefer the GitHub Actions Trusted Publishing workflow.\n`
  );

  function write(relativePath, content) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }
}

function read(relativePath) {
  return readFileSync(path.join(fixture, relativePath), "utf8");
}

function readJsonLines(filePath) {
  return readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
