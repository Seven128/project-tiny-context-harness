#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "project-tiny-context-harness";
const releaseUpdateMode = "manual-required";
const releaseUpdateModes = ["sync-only", "upgrade-required", "manual-required"];

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv) {
  const parsed = { check: false, root: defaultRepoRoot, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    if (arg === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--root requires a path");
      }
      parsed.root = path.resolve(value);
      index += 1;
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
  console.log(`sync_release_version.mjs

Synchronizes release-version surfaces to packages/sdlc-harness/package.json.

Usage:
  node tools/sync_release_version.mjs
  node tools/sync_release_version.mjs --check

Options:
  --check       Report drift without writing files.
  --root PATH   Repository root override for tests.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const version = readPackageVersion(args.root);
  const edits = [];

  for (const relativePath of [
    "README.md",
    "packages/sdlc-harness/README.md",
    "packages/sdlc-harness/assets/README.md",
    "docs/adopt-existing-repo.md",
    "docs/launch/private-review.md",
    "docs/launch/profile.md"
  ]) {
    replaceInFile(edits, relativePath, /project-tiny-context-harness-\d+\.\d+\.\d+\.tgz/g, `${packageName}-${version}.tgz`);
  }

  replaceInFile(edits, ".github/workflows/npm-publish.yml", /default:\s*"\d+\.\d+\.\d+"/, `default: "${version}"`);
  replaceInFile(
    edits,
    "docs/launch/README.md",
    /For the `\d+\.\d+\.\d+` GitHub Release fields, see \[github-release-\d+\.\d+\.\d+\.md\]\(github-release-\d+\.\d+\.\d+\.md\)\./,
    `For the \`${version}\` GitHub Release fields, see [github-release-${version}.md](github-release-${version}.md).`
  );
  replaceInFile(
    edits,
    "docs/launch/primary-launch.md",
    /project-tiny-context-harness@\d+\.\d+\.\d+|v\d+\.\d+\.\d+|github-release-\d+\.\d+\.\d+\.md/g,
    (match) => {
      if (match.startsWith("project-tiny-context-harness@")) {
        return `${packageName}@${version}`;
      }
      if (match.startsWith("github-release-")) {
        return `github-release-${version}.md`;
      }
      return `v${version}`;
    }
  );
  replaceInFile(
    edits,
    "docs/launch/market-map.md",
    /Project Tiny Context Harness \d+\.\d+\.\d+|project-tiny-context-harness@\d+\.\d+\.\d+/g,
    (match) => (match.startsWith("Project Tiny Context Harness") ? `Project Tiny Context Harness ${version}` : `${packageName}@${version}`)
  );
  replaceInFile(
    edits,
    "docs/launch/outreach-targets.md",
    /v\d+\.\d+\.\d+|Project Tiny Context Harness \d+\.\d+\.\d+/g,
    (match) => (match.startsWith("Project Tiny Context Harness") ? `Project Tiny Context Harness ${version}` : `v${version}`)
  );
  replaceInFile(
    edits,
    "docs/launch/npm-trusted-publishing.md",
    /The current published package is `project-tiny-context-harness@\d+\.\d+\.\d+`/,
    `The current published package is \`${packageName}@${version}\``
  );

  syncReleasePacket(edits, version);

  const changed = edits.filter((edit) => edit.changed);
  if (args.check) {
    if (changed.length > 0) {
      throw new Error(
        `release version surfaces are out of sync with ${packageName}@${version}:\n${changed
          .map((edit) => `- ${edit.relativePath}`)
          .join("\n")}\nRun \`node tools/sync_release_version.mjs\`.`
      );
    }
    console.log(`release version surfaces OK for ${packageName}@${version}`);
    return;
  }

  for (const edit of changed) {
    writeText(edit.relativePath, edit.next);
  }
  console.log(`release version surfaces synced for ${packageName}@${version}; changed=${changed.length}`);
  for (const edit of changed) {
    console.log(`- ${edit.relativePath}`);
  }
}

function readPackageVersion(repoRoot) {
  const manifest = JSON.parse(readText("packages/sdlc-harness/package.json", repoRoot));
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`Invalid package version: ${manifest.version}`);
  }
  return manifest.version;
}

function replaceInFile(edits, relativePath, pattern, replacement) {
  const current = readText(relativePath);
  if (!pattern.test(current)) {
    throw new Error(`${relativePath}: expected release-version pattern not found`);
  }
  pattern.lastIndex = 0;
  const next = current.replace(pattern, replacement);
  edits.push({ relativePath, next, changed: next !== current });
}

function syncReleasePacket(edits, version) {
  const relativePath = `docs/launch/github-release-${version}.md`;
  const current = exists(relativePath) ? readText(relativePath) : "";
  const next = current || renderReleasePacket(version);
  validateReleasePacket(relativePath, next, version);
  edits.push({ relativePath, next, changed: next !== current });
}

function validateReleasePacket(relativePath, content, version) {
  for (const pattern of [
    new RegExp(`v${escapeRegExp(version)}`),
    new RegExp(`Project Tiny Context Harness ${escapeRegExp(version)}`),
    /Update Mode:/,
    new RegExp(escapeRegExp(releaseUpdateMode)),
    /sync-only/,
    /upgrade-required/,
    /manual-required/,
    /sdlc-harness upgrade --check/,
    /tools\/github_release_publish\.mjs/,
    /Dry runs do not create or edit GitHub releases/,
    /safe_pending/,
    /manual_required/,
    /blocked/,
    /npm install -D project-tiny-context-harness@latest/,
    /keep the memory, drop the ceremony/i,
    new RegExp(`Do not retarget \`v${escapeRegExp(version)}\``),
    /Do not claim benchmark wins or adoption/
  ]) {
    if (!pattern.test(content)) {
      throw new Error(`${relativePath}: required release packet content missing: ${pattern}`);
    }
  }
}

function renderReleasePacket(version) {
  return `# GitHub Release Packet: ${version}

Snapshot date: ${new Date().toISOString().slice(0, 10)}.

Use this packet to create the GitHub Release for the current public \`${packageName}\` npm package line.

## Release Fields

Tag:

\`\`\`text
v${version}
\`\`\`

Target:

\`\`\`text
Use the commit that bumps \`packages/sdlc-harness/package.json\` to ${version} and is published to npm.
\`\`\`

Title:

\`\`\`text
Project Tiny Context Harness ${version}
\`\`\`

Update Mode: \`${releaseUpdateMode}\`

Allowed modes: ${releaseUpdateModes.map((mode) => `\`${mode}\``).join(", ")}.

## Release Body

\`\`\`\`markdown
Project Tiny Context Harness ${version} is the current public release line under the renamed npm package:

\`\`\`sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init
make validate-context
\`\`\`

Update mode: \`${releaseUpdateMode}\`. After updating the package, run:

\`\`\`sh
npx --yes --package project-tiny-context-harness@latest sdlc-harness upgrade --check
npx --yes --package project-tiny-context-harness@latest sdlc-harness upgrade
\`\`\`

Use \`sync\` only for releases explicitly marked \`sync-only\`; sync does not run migrations. Upgrade plans report \`safe_pending\`, \`manual_required\` and \`blocked\`.

## What Changed

- Publishes \`${packageName}@${version}\` through npm Trusted Publishing.
- Keeps the install path on the renamed package: \`${packageName}\`.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: \`AGENTS.md\` is the startup router, \`project_context/**\` keeps durable recovery facts, and \`validate-context\` checks recoverability.
- Makes package updates explicit through release update modes: ${releaseUpdateModes.map((mode) => `\`${mode}\``).join(", ")}.
- Keeps the old stage-based SDLC workflow out of the default package surface.

## Boundary

This release does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. It packages the smaller recovery surface: keep the memory, drop the ceremony.

## Useful Links

- npm: https://www.npmjs.com/package/project-tiny-context-harness
- README: https://github.com/Seven128/project-tiny-context-harness#readme
- Fresh-agent recovery walkthrough: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md
- Minimal Context sample: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md
- Comparison guide: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/comparison.md
\`\`\`\`

## GitHub Release Automation

After npm publish and registry verification, run:

\`\`\`sh
node tools/github_release_publish.mjs --version ${version}
\`\`\`

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open \`https://github.com/Seven128/project-tiny-context-harness/releases/new\`.
2. Choose tag \`v${version}\`.
3. Confirm the target is the commit that was published to npm for \`${packageName}@${version}\`.
4. Use title \`Project Tiny Context Harness ${version}\`.
5. Paste the release body above.
6. Publish the release.
7. Run \`npm run launch:strict-external\`.

## Do Not

- Do not retarget \`v${version}\` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm \`${packageName}@${version}\` remains live and installable.
`;
}

function readText(relativePath, root = args.root) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`${relativePath}: file does not exist`);
  }
  return readFileSync(absolutePath, "utf8");
}

function writeText(relativePath, content) {
  const absolutePath = path.join(args.root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function exists(relativePath) {
  return existsSync(path.join(args.root, relativePath));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
