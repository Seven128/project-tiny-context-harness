export interface ManagedBlockMarkers {
  start: string;
  end: string;
}

export const MANAGED_BLOCK_START = "<!-- ty-context:managed:begin -->";
export const MANAGED_BLOCK_END = "<!-- ty-context:managed:end -->";
export const LEGACY_PJSDLC_MANAGED_BLOCK_START = "<!-- pjsdlc:sdlc-harness:begin -->";
export const LEGACY_PJSDLC_MANAGED_BLOCK_END = "<!-- pjsdlc:sdlc-harness:end -->";
export const LEGACY_SDLC_MANAGED_BLOCK_START = "<!-- sdlc-harness:begin -->";
export const LEGACY_SDLC_MANAGED_BLOCK_END = "<!-- sdlc-harness:end -->";
export const MAKEFILE_BLOCK_START = "# ty-context:make:begin";
export const MAKEFILE_BLOCK_END = "# ty-context:make:end";
export const LEGACY_PJSDLC_MAKEFILE_BLOCK_START = "# pjsdlc:sdlc-harness:make:begin";
export const LEGACY_PJSDLC_MAKEFILE_BLOCK_END = "# pjsdlc:sdlc-harness:make:end";
export const LEGACY_SDLC_MAKEFILE_BLOCK_START = "# sdlc-harness:make:begin";
export const LEGACY_SDLC_MAKEFILE_BLOCK_END = "# sdlc-harness:make:end";
export const GITHUB_WORKFLOW_BLOCK_START = "# ty-context:github-workflow:begin";
export const GITHUB_WORKFLOW_BLOCK_END = "# ty-context:github-workflow:end";
export const LEGACY_PJSDLC_GITHUB_WORKFLOW_BLOCK_START = "# pjsdlc:sdlc-harness:github-workflow:begin";
export const LEGACY_PJSDLC_GITHUB_WORKFLOW_BLOCK_END = "# pjsdlc:sdlc-harness:github-workflow:end";
export const MANAGED_METADATA_START = "<!-- ty-context-managed";
export const MANAGED_METADATA_END = "-->";

export const AGENTS_BLOCK_MARKERS: ManagedBlockMarkers[] = [
  { start: MANAGED_BLOCK_START, end: MANAGED_BLOCK_END },
  { start: LEGACY_PJSDLC_MANAGED_BLOCK_START, end: LEGACY_PJSDLC_MANAGED_BLOCK_END },
  { start: LEGACY_SDLC_MANAGED_BLOCK_START, end: LEGACY_SDLC_MANAGED_BLOCK_END }
];

export const MAKEFILE_BLOCK_MARKERS: ManagedBlockMarkers[] = [
  { start: MAKEFILE_BLOCK_START, end: MAKEFILE_BLOCK_END },
  { start: LEGACY_PJSDLC_MAKEFILE_BLOCK_START, end: LEGACY_PJSDLC_MAKEFILE_BLOCK_END },
  { start: LEGACY_SDLC_MAKEFILE_BLOCK_START, end: LEGACY_SDLC_MAKEFILE_BLOCK_END }
];

export const GITHUB_WORKFLOW_BLOCK_MARKERS: ManagedBlockMarkers[] = [
  { start: GITHUB_WORKFLOW_BLOCK_START, end: GITHUB_WORKFLOW_BLOCK_END },
  { start: LEGACY_PJSDLC_GITHUB_WORKFLOW_BLOCK_START, end: LEGACY_PJSDLC_GITHUB_WORKFLOW_BLOCK_END }
];
