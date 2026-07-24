import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export const DESIGN_HANDOFF_PATH = "design/handoff.md";
export const DESIGN_RESOURCE_PATH = "design/page.html";
export const DESIGN_SOURCE_ITEM_KEY = "design-main";
export const DESIGN_TARGET_KEY = "main-default";
export const DESIGN_CONDITION_KEY = "desktop-default";

export async function writeDesignResourceHandoffFixture(root, mutate) {
  await mkdir(path.join(root, "design"), { recursive: true });
  const resource =
    "<!doctype html><html><body><main id=\"design-target\">Design target</main></body></html>\n";
  await writeFile(path.join(root, DESIGN_RESOURCE_PATH), resource);
  const handoff = createDesignResourceHandoff(sha256(resource));
  mutate?.(handoff);
  await writeDesignResourceHandoff(root, handoff);
  return { handoff, resource };
}

export async function writeDesignResourceHandoff(root, handoff) {
  const sourceStatement =
    "The main surface must conform to every declared design-resource dimension.";
  const markdown = `# Main design implementation handoff

<a id="main-design"></a>
<!-- ty-source-item:start key=${DESIGN_SOURCE_ITEM_KEY} kind=requirement -->
${sourceStatement}
<!-- ty-source-item:end -->

\`\`\`yaml design-resource-handoff-v1
${YAML.stringify(handoff, { lineWidth: 0 }).trimEnd()}
\`\`\`
`;
  await writeFile(path.join(root, DESIGN_HANDOFF_PATH), markdown);
}

export function createDesignResourceHandoff(resourceSha256) {
  const evidence = [
    evidenceItem("frame-main", "frame"),
    evidenceItem("transition-main", "prototype_transition"),
    evidenceItem("responsive-main", "responsive_spec"),
    evidenceItem("accessibility-main", "accessibility_spec"),
    evidenceItem("asset-main", "asset"),
  ];
  return {
    schema_version: "design-resource-handoff-v1",
    intent: "implementation_handoff",
    scope: {
      key: "main-surface",
      style_dependency: "style-bearing",
      surface_keys: ["surface.main"],
      necessary_context: ["The page has no business logic."],
      exclusions: ["All other surfaces."],
    },
    provenance: {
      provider: "fixture-open-design",
      provider_version: "1.0.0",
      project: "fixture-project",
      run: "fixture-run",
      capability: "complex-single-page",
      agent: "fixture-agent",
      model: "fixture-model",
      design_system_id: "fixture-design-system",
    },
    resources: [
      {
        key: "resource.main",
        role: "exact_target",
        path: DESIGN_RESOURCE_PATH,
        media_type: "text/html",
        sha256: resourceSha256,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project",
          update_route: "Create and select a new immutable export.",
        },
      },
    ],
    conditions: [
      {
        key: DESIGN_CONDITION_KEY,
        platform: "desktop-web",
        viewport: { width: 1440, height: 900, unit: "px" },
        modes: ["light"],
        states: ["default", "expanded", "focused"],
        content_cases: ["nominal", "long-copy"],
        input_methods: ["mouse", "keyboard"],
        motion: "full",
      },
    ],
    subjects: [
      {
        key: "surface.main",
        kind: "surface",
        stable_keys: ["surface.main", "control.main"],
      },
    ],
    targets: [
      {
        key: DESIGN_TARGET_KEY,
        interpretation: "exact_target",
        resource_refs: ["resource.main"],
        condition_refs: [DESIGN_CONDITION_KEY],
        selection_basis: "Explicit fixture selection.",
      },
    ],
    evidence,
    coverage: [
      coverage("surface-flow", "surface_flow", ["frame-main"], [
        "layout_geometry",
      ]),
      coverage("visual-content", "visual_content", ["frame-main"], [
        "visual_pixel",
        "design_token",
      ]),
      coverage("component-control", "component_control", ["frame-main"], [
        "visual_pixel",
        "component_state",
      ]),
      coverage(
        "state-interaction",
        "state_interaction",
        ["transition-main"],
        ["component_state", "interaction_trace"],
      ),
      coverage("motion", "motion", ["transition-main"], ["motion_timeline"]),
      coverage(
        "adaptation-input",
        "adaptation_input",
        ["responsive-main"],
        ["responsive_reflow"],
      ),
      coverage(
        "accessibility",
        "accessibility",
        ["accessibility-main"],
        ["accessibility_semantics"],
      ),
      coverage("assets", "assets", ["asset-main"], ["asset_integrity"]),
    ],
    acceptance_blockers: [],
    proposal: {
      reconciliation_status: "applied",
      path: "proposal.md",
      revision: "fixture-selected-v1",
    },
  };
}

function evidenceItem(key, kind) {
  return {
    key,
    resource_ref: "resource.main",
    kind,
    locator: `${DESIGN_RESOURCE_PATH}#${key}`,
    condition_refs: [DESIGN_CONDITION_KEY],
  };
}

function coverage(key, dimension, evidenceRefs, verificationMethods) {
  return {
    key: `coverage.${key}`,
    subject_refs: ["surface.main"],
    dimension,
    disposition: "covered",
    target_refs: [DESIGN_TARGET_KEY],
    condition_refs: [DESIGN_CONDITION_KEY],
    evidence_refs: evidenceRefs,
    source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
    verification_methods: verificationMethods,
    rationale: `The selected resource explicitly covers ${dimension}.`,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
