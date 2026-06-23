const releaseUpdateModeEvidence = {
  "sync-only": {
    patterns: [/Upgrade Impact:\s*`none`/, /no user-project migration is required/]
  },
  "upgrade-required": {
    patterns: [
      /Upgrade Impact:\s*`safe migration included`/,
      /upgrade\/migration implementation and upgrade test evidence/
    ]
  },
  "manual-required": {
    patterns: [/Upgrade Impact:\s*`manual follow-up required`/, /automatic upgrade is insufficient/]
  }
};

export function renderUpgradeImpact(releaseUpdateMode) {
  if (releaseUpdateMode === "sync-only") {
    return `Upgrade Impact: \`none\`.

Release preparation classified this version as \`sync-only\`: no user-project migration is required. Users receive any new managed assets or CLI behavior only after running the newly published CLI, and \`ty-context upgrade --check\` remains the default diagnostic path before a direct managed-asset \`sync\`.`;
  }

  if (releaseUpdateMode === "upgrade-required") {
    return `Upgrade Impact: \`safe migration included\`.

Release preparation classified this version as \`upgrade-required\`: the release must ship upgrade/migration implementation and upgrade test evidence before publish. Users should run \`ty-context upgrade --check\` and then \`ty-context upgrade\`; direct \`sync\` is not the release path.`;
  }

  return `Upgrade Impact: \`manual follow-up required\`.

Release preparation classified this version as \`manual-required\`: automatic upgrade is insufficient for the full user-project change, and the release body must tell users which \`manual_required\` items to inspect or change after \`ty-context upgrade --check\`.`;
}

export function assertReleaseUpgradeImpactEvidence(content, releaseUpdateMode, label) {
  if (!/## Upgrade Impact/.test(content) || !/Upgrade Impact:/.test(content)) {
    throw new Error(`${label}: Release upgrade impact evidence missing`);
  }
  const missingEvidence = releaseUpdateModeEvidencePatterns(releaseUpdateMode).filter((pattern) => !pattern.test(content));
  if (missingEvidence.length > 0) {
    throw new Error(`${label}: required ${releaseUpdateMode} upgrade impact evidence missing: ${missingEvidence[0]}`);
  }
}

export function isUpgradeSensitivePath(filePath) {
  return isUpgradeImplementationPath(filePath) || isUpgradeSurfacePath(filePath);
}

export function isUpgradeImplementationPath(filePath) {
  return [
    /^packages\/ty-context\/src\/commands\/upgrade\.ts$/,
    /^packages\/ty-context\/src\/lib\/upgrade\.ts$/,
    /^packages\/ty-context\/src\/lib\/migrations\.ts$/,
    /^packages\/ty-context\/src\/lib\/legacy-.*migration\.ts$/,
    /^packages\/ty-context\/migrations\//,
    /^packages\/ty-context\/src\/lib\/schema-guard\.ts$/
  ].some((pattern) => pattern.test(filePath));
}

export function isUpgradeTestEvidencePath(filePath) {
  return /^tests\/ty-context\/(?:legacy-)?upgrade.*\.test\.mjs$/.test(filePath);
}

function releaseUpdateModeEvidencePatterns(releaseUpdateMode) {
  return releaseUpdateModeEvidence[releaseUpdateMode]?.patterns ?? [];
}

function isUpgradeSurfacePath(filePath) {
  return [
    /^packages\/ty-context\/source-mappings\.yaml$/,
    /^packages\/ty-context\/src\/commands\/(?:init|sync|doctor)\.ts$/,
    /^packages\/ty-context\/src\/lib\/(?:config|constants|context-manifest|init|managed-file|sync-engine)\.ts$/,
    /^\.codex\/ty-context-managed\/(?:AGENTS\.md|Makefile|project_context\/|tools\/|workflows\/)/,
    /^\.codex\/ty-context-managed\/skills\/context_harness_upgrade\//,
    /^packages\/ty-context\/assets\/(?:AGENTS\.md|Makefile|project_context\/|tools\/|workflows\/)/,
    /^packages\/ty-context\/assets\/skills\/context_harness_upgrade\//
  ].some((pattern) => pattern.test(filePath));
}
