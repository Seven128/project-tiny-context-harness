import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/sync_release_version.mjs");
const fixture = mkdtempSync(path.join(os.tmpdir(), "sync-release-version-"));

write("packages/sdlc-harness/package.json", JSON.stringify({ version: "1.2.3" }, null, 2));
for (const relativePath of [
  "README.md",
  "packages/sdlc-harness/README.md",
  "packages/sdlc-harness/assets/README.md",
  "docs/adopt-existing-repo.md",
  "docs/launch/private-review.md",
  "docs/launch/profile.md"
]) {
  write(relativePath, "npm install -D /tmp/project-tiny-context-harness-1.2.2.tgz\n");
}
write(
  ".github/workflows/npm-publish.yml",
  [
    "on:",
    "  workflow_dispatch:",
    "    inputs:",
    "      expected_version:",
    "        default: \"1.2.2\"",
    ""
  ].join("\n")
);
write(
  "docs/launch/README.md",
  "For the `1.2.2` GitHub Release fields, see [github-release-1.2.2.md](github-release-1.2.2.md).\n"
);
write(
  "docs/launch/primary-launch.md",
  [
    "This is the copy-ready launch packet after `project-tiny-context-harness@1.2.2` is published.",
    "- npm `project-tiny-context-harness@1.2.2` is published and installable.",
    "- The `v1.2.2` GitHub Release is published from [github-release-1.2.2.md](github-release-1.2.2.md).",
    ""
  ].join("\n")
);
write(
  "docs/launch/market-map.md",
  [
    "| GitHub release | Latest release is `Project Tiny Context Harness 1.2.2` |",
    "| npm package | `project-tiny-context-harness@1.2.2` is published and installable through `@latest` |",
    ""
  ].join("\n")
);
write(
  "docs/launch/outreach-targets.md",
  "- `v1.2.2` is published on npm through Trusted Publishing, and the current latest GitHub Release is `Project Tiny Context Harness 1.2.2`.\n"
);
write(
  "docs/launch/npm-trusted-publishing.md",
  "The current published package is `project-tiny-context-harness@1.2.2`. It is published through the GitHub Actions Trusted Publishing workflow.\n"
);

const checkBefore = run(["--root", fixture, "--check"]);
assert.notEqual(checkBefore.status, 0);
assert.match(`${checkBefore.stdout}\n${checkBefore.stderr}`, /release version surfaces are out of sync/);

const sync = run(["--root", fixture]);
assert.equal(sync.status, 0, sync.stderr);
assert.match(sync.stdout, /changed=13/);

const checkAfter = run(["--root", fixture, "--check"]);
assert.equal(checkAfter.status, 0, checkAfter.stderr);
assert.match(checkAfter.stdout, /release version surfaces OK/);

for (const relativePath of [
  "README.md",
  "packages/sdlc-harness/README.md",
  "packages/sdlc-harness/assets/README.md",
  "docs/adopt-existing-repo.md",
  "docs/launch/private-review.md",
  "docs/launch/profile.md",
  ".github/workflows/npm-publish.yml",
  "docs/launch/README.md",
  "docs/launch/primary-launch.md",
  "docs/launch/market-map.md",
  "docs/launch/outreach-targets.md",
  "docs/launch/npm-trusted-publishing.md",
  "docs/launch/github-release-1.2.3.md"
]) {
  const content = read(relativePath);
  assert.match(content, /1\.2\.3/, `${relativePath} should contain current version`);
  assert.doesNotMatch(content, /1\.2\.2/, `${relativePath} should not contain stale version`);
}

const releasePacket = read("docs/launch/github-release-1.2.3.md");
assert.match(releasePacket, /Project Tiny Context Harness 1\.2\.3/);
assert.match(releasePacket, /Do not retarget `v1\.2\.3`/);
assert.match(releasePacket, /Do not claim benchmark wins or adoption/);

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true
  });
}

function write(relativePath, content) {
  const absolutePath = path.join(fixture, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function read(relativePath) {
  return readFileSync(path.join(fixture, relativePath), "utf8");
}
