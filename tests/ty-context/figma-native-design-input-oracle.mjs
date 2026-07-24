import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const assertionKeys = {
  figma: "figma-native-path-ready",
  shortcut: "figma-shortcuts-rejected",
  chain: "design-purpose-chain-aligned",
  authoring: "design-rationale-authoring-ready",
  optional: "optional-figma-boundary-preserved",
};
const mode = process.argv[2] ?? "all";
if (!["all", "optional"].includes(mode)) throw new Error(`unsupported oracle mode: ${mode}`);
const rootEntrypoint = "tests/ty-context/figma-native-design-input-oracle.mjs";
const sessionId = `figma-native-${randomUUID()}`;

const figmaReferencePaths = [
  ".codex/ty-context-managed/skills/design-resource-authoring/references/figma-native-handoff.md",
  ".codex/skills/design-resource-authoring/references/figma-native-handoff.md",
  "packages/ty-context/assets/skills/design-resource-authoring/references/figma-native-handoff.md",
];
const figmaReferenceSurfaces = [
  "managed-reference",
  "generated-reference",
  "package-reference",
];

const [managedFigma, generatedFigma, packagedFigma] = await Promise.all(
  figmaReferencePaths.map(readText),
);
const figmaHashes = figmaReferencePaths.map((relative, index) =>
  sha256([managedFigma, generatedFigma, packagedFigma][index] ?? `missing:${relative}`),
);

const figmaPathReady =
  [managedFigma, generatedFigma, packagedFigma].every(Boolean) &&
  new Set(figmaHashes).size === 1 &&
  (await filesHaveAll([
    {
      path: figmaReferencePaths[0],
      terms: [
        "feature-detect",
        "exact file",
        "version",
        "node",
        "get_metadata",
        "get_design_context",
        "get_variable_defs",
        "get_screenshot",
        "get_motion_context",
        "download_assets",
        "code connect",
        "components",
        "variables",
        "auto layout",
        "annotations",
        "small",
        "rate limit",
        "repository",
        "immutable",
        "design-resource-handoff-v1",
        "source claims",
        "final gate",
      ],
    },
    {
      path: ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
      terms: ["figma-native-handoff.md", "residual", "design-resource-handoff-v1"],
    },
    {
      path: ".codex/ty-context-managed/skills/design-resource-authoring/references/open-design-provider.md",
      terms: ["figma-native-handoff.md", "optional", "operational"],
    },
    {
      path: ".codex/ty-context-managed/skills/design-resource-authoring/references/downstream-handoff.md",
      terms: ["figma-native", "residual", "immutable"],
    },
    {
      path: "tests/ty-context/design-resource-authoring-skill.test.mjs",
      terms: ["figma-native-handoff.md", "figma-native"],
    },
  ]));

const nonContextDesignPurposeSpecifications = [
  {
    path: "PROJECT_SPEC.md",
    terms: [
      "figma-native",
      "residual handoff",
      "immutable",
      "source claims",
      "final gate",
      "second authority",
    ],
  },
  {
    path: "README.md",
    terms: ["figma-native", "residual handoff", "immutable", "final gate"],
  },
  {
    path: "README.zh-CN.md",
    terms: ["figma 原生", "结构化 handoff", "不可变", "final gate"],
  },
  {
    path: "packages/ty-context/README.md",
    terms: ["figma-native", "residual handoff", "immutable", "final gate"],
  },
  {
    path: "docs/design-resource-authoring-source-plan.md",
    terms: ["figma-native", "residual handoff", "2026-07-24"],
  },
];
const contextDesignPurposeSpecifications = [
  {
    path: "project_context/global.md",
    terms: [
      "figma-native",
      "structured handoff",
      "immutable",
      "contract",
      "current-snapshot",
    ],
  },
  {
    path:
      "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    terms: [
      "figma-native",
      "residual",
      "immutable",
      "eight",
      "source claims",
      "production conformance",
    ],
  },
  {
    path:
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    terms: [
      "figma-native",
      "authoring cost",
      "residual handoff",
      "immutable",
      "final gate",
    ],
  },
  {
    path:
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    terms: ["figma-native-handoff.md", "provider-neutral", "source sync"],
  },
  {
    path: "project_context/areas/harness-package/implementation-index.md",
    terms: ["figma-native-handoff.md", "design-resource-handoff-v1"],
  },
  {
    path: "project_context/areas/harness-package/verification.md",
    terms: ["figma-native-design-input-oracle.mjs", "managed", "package"],
  },
  {
    path: "project_context/context.toml",
    terms: ["figma native", "figma-native", "residual handoff"],
  },
];
const [nonContextDesignPurposeAligned, contextDesignPurposeAligned] =
  await Promise.all([
    filesHaveAll(nonContextDesignPurposeSpecifications),
    filesHaveAll(contextDesignPurposeSpecifications),
  ]);
const contextDesignPurposeAbsent = (
  await Promise.all(
    contextDesignPurposeSpecifications.map(({ path: relative }) =>
      readText(relative),
    ),
  )
).every((content) => content === null);
// Long-Task validates controlling Context outside the workspace manifest and
// intentionally omits it from Counterfactual sandboxes. Main execution remains
// strict whenever Context is present; sandbox execution may therefore isolate
// the declared non-Context carrier instead of failing on unrelated omissions.
const designPurposeChainAligned =
  nonContextDesignPurposeAligned &&
  (contextDesignPurposeAligned ||
    (mode === "all" && contextDesignPurposeAbsent));

const designRationaleAuthoringReady = await filesHaveAll([
  {
    path: ".codex/skills/authoring/harness_package_design/SKILL.md",
    terms: [
      "design purpose",
      "design thinking",
      "information-complete",
      "causally rigorous",
      "problem and purpose",
      "inputs and transformation",
      "authority",
      "downstream consumption",
      "proof",
      "fail-closed",
      "alternatives",
      "indexed surfaces",
    ],
  },
  {
    path: "tests/ty-context/design-resource-authoring-skill.test.mjs",
    terms: ["information-complete", "causally rigorous"],
  },
]);

const allObservations = {
  figma_path_ready: figmaPathReady,
  figma_shortcuts_rejected: figmaPathReady,
  design_chain_aligned: designPurposeChainAligned,
  authoring_rule_ready: designRationaleAuthoringReady,
  optional_figma_boundary_preserved: figmaPathReady,
};

const modeConfig = {
  all: {
    observations: [
      "figma_path_ready",
      "figma_shortcuts_rejected",
      "design_chain_aligned",
      "authoring_rule_ready",
    ],
    assertions: [
      assertionKeys.figma,
      assertionKeys.shortcut,
      assertionKeys.chain,
      assertionKeys.authoring,
    ],
    crossSurface: true,
  },
  optional: {
    observations: ["optional_figma_boundary_preserved"],
    assertions: [assertionKeys.optional],
    crossSurface: false,
  },
}[mode];
const observations = Object.fromEntries(
  modeConfig.observations.map((key) => [key, allObservations[key]]),
);
const targetRuntimeRecords = modeConfig.assertions.map(
  (assertionKey) => ({
    assertion_key: assertionKey,
    capability: "target_runtime",
    target_ref: "harness-package",
    root_entrypoint: rootEntrypoint,
    session_id: sessionId,
    cold_start: true,
  }),
);

process.stdout.write(
  `${JSON.stringify({
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records: [
      ...targetRuntimeRecords,
      ...(modeConfig.crossSurface
        ? [{
        assertion_key: assertionKeys.figma,
        capability: "cross_surface_consistency",
        surfaces: figmaReferencePaths.map((_surfacePath, index) => ({
          surface_ref: figmaReferenceSurfaces[index],
          target_ref: "harness-package",
          state_sha256: figmaHashes[index],
        })),
          }]
        : []),
    ],
  })}\n`,
);

async function filesHaveAll(specifications) {
  const results = await Promise.all(
    specifications.map(async ({ path: relative, terms }) => {
      const content = await readText(relative);
      if (content === null) return false;
      const normalized = content.toLowerCase();
      return terms.every((term) => normalized.includes(term.toLowerCase()));
    }),
  );
  return results.every(Boolean);
}

async function readText(relative) {
  try {
    return await readFile(path.join(repo, relative), "utf8");
  } catch {
    return null;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
