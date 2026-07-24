import type {
  DesignResourceDimension,
  DesignResourceEvidenceKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";

export const DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION: Record<
  DesignResourceDimension,
  readonly DesignResourceEvidenceKind[]
> = {
  surface_flow: [
    "frame",
    "prototype_state",
    "prototype_transition",
    "annotation",
  ],
  visual_content: ["frame", "component_variant", "token_spec", "annotation"],
  component_control: [
    "frame",
    "component_variant",
    "prototype_state",
    "token_spec",
    "annotation",
  ],
  state_interaction: [
    "component_variant",
    "prototype_state",
    "prototype_transition",
    "input_spec",
  ],
  motion: ["prototype_transition", "motion_spec", "motion_capture"],
  adaptation_input: ["responsive_spec", "input_spec"],
  accessibility: ["accessibility_spec", "semantic_tree", "input_spec"],
  assets: ["asset", "token_spec", "annotation"],
};

export const DESIGN_RESOURCE_METHODS_BY_DIMENSION: Record<
  DesignResourceDimension,
  readonly DesignResourceVerificationMethod[]
> = {
  surface_flow: ["layout_geometry", "interaction_trace"],
  visual_content: ["visual_pixel", "design_token", "content"],
  component_control: ["visual_pixel", "design_token", "component_state"],
  state_interaction: ["component_state", "interaction_trace"],
  motion: ["motion_timeline"],
  adaptation_input: ["responsive_reflow", "input_method"],
  accessibility: ["accessibility_semantics"],
  assets: ["asset_integrity"],
};
