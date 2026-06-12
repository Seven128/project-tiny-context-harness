import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/github_release_publish.mjs");
const fixture = mkdtempSync(path.join(os.tmpdir(), "github-release-publish-"));

try {
  write(
    "docs/launch/github-release-1.2.3.md",
    `# GitHub Release Packet: 1.2.3

## Release Fields

Tag:

\`\`\`text
v1.2.3
\`\`\`

Title:

\`\`\`text
Project Tiny Context Harness 1.2.3
\`\`\`

Update Mode: \`manual-required\`

## Release Body

\`\`\`\`markdown
Project Tiny Context Harness 1.2.3 is live.

\`\`\`sh
npm install -D project-tiny-context-harness@latest
\`\`\`

Use \`sync\` only for releases explicitly marked \`sync-only\`.
\`\`\`\`

## Manual UI Path

This maintainer-only section must not enter the GitHub Release notes.
`
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--root", fixture, "--version", "1.2.3", "--target", "abc123", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /would publish GitHub Release v1\.2\.3/);
  assert.match(result.stdout, /title: Project Tiny Context Harness 1\.2\.3/);
  assert.match(result.stdout, /target: abc123/);
  assert.match(result.stdout, /body: \d+ characters from docs\/launch\/github-release-1\.2\.3\.md/);
  assert.doesNotMatch(result.stdout, /Manual UI Path/);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

function write(relativePath, content) {
  const absolutePath = path.join(fixture, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}
