import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";

export const DESIGN_MD_PATH = "DESIGN.md";
export const UNCONFIGURED_DESIGN_AUTHORITY_MARKER =
  "Design authority status: `unconfigured`";

export type DesignAuthorityStatus = "missing" | "unconfigured" | "configured";

export async function createDesignMdIfMissing(
  projectRoot: string,
): Promise<boolean> {
  const target = path.join(projectRoot, DESIGN_MD_PATH);
  if (await pathExists(target)) {
    return false;
  }
  return writeTextIfChanged(target, designMdTemplate());
}

export async function inspectDesignAuthorityStatus(
  projectRoot: string,
): Promise<DesignAuthorityStatus> {
  const target = path.join(projectRoot, DESIGN_MD_PATH);
  if (!(await pathExists(target))) return "missing";
  const content = await readText(target);
  if (content.includes(UNCONFIGURED_DESIGN_AUTHORITY_MARKER)) {
    return "unconfigured";
  }
  const legacyStarter =
    content.includes('name: "Starter Design System"') &&
    content.includes(
      'description: "Neutral baseline design guidance for projects that have not defined their own visual system."',
    );
  return legacyStarter ? "unconfigured" : "configured";
}

function designMdTemplate(): string {
  return [
    "---",
    'version: "alpha"',
    'name: "Unconfigured Project Design"',
    'description: "Starter tokens for explicit prototypes only; not an approved production visual system or page-layout target."',
    "colors:",
    '  canvas: "#F8FAFC"',
    '  surface: "#FFFFFF"',
    '  surface-muted: "#EEF2F7"',
    '  text: "#172033"',
    '  text-muted: "#5D6B82"',
    '  primary: "#2563EB"',
    '  primary-hover: "#1D4ED8"',
    '  on-primary: "#FFFFFF"',
    "typography:",
    "  display:",
    '    fontFamily: "system-ui"',
    '    fontSize: "2.5rem"',
    "    fontWeight: 700",
    "    lineHeight: 1.1",
    "  title:",
    '    fontFamily: "system-ui"',
    '    fontSize: "1.5rem"',
    "    fontWeight: 700",
    "    lineHeight: 1.25",
    "  body:",
    '    fontFamily: "system-ui"',
    '    fontSize: "1rem"',
    "    fontWeight: 400",
    "    lineHeight: 1.6",
    "  label:",
    '    fontFamily: "system-ui"',
    '    fontSize: "0.875rem"',
    "    fontWeight: 600",
    "    lineHeight: 1.3",
    "rounded:",
    "  sm: 4px",
    "  md: 8px",
    "  lg: 12px",
    "spacing:",
    "  xs: 4px",
    "  sm: 8px",
    "  md: 16px",
    "  lg: 24px",
    "  xl: 32px",
    "components: {}",
    "---",
    "",
    "# Design Authority",
    "",
    "## Overview",
    "",
    `- ${UNCONFIGURED_DESIGN_AUTHORITY_MARKER}.`,
    "- This file is a non-authoritative scaffold, not an approved brand, component system or page-layout target.",
    "- Material production UI must not use these starter tokens as permission to invent information hierarchy, layout or visual language.",
    "- Replace this status and the provisional tokens only after project-specific visual decisions stabilize.",
    "",
    "### Design Authority Index",
    "",
    "- Authored exact-value token source: not selected.",
    "- Generation direction and generated token targets: not selected.",
    "- Durable design references: none selected.",
    "- For each selected reference, record a stable id, surface/route/component, project path or URI, `exact-target` / `constraint` / `inspiration` interpretation, and the viewport/theme/state conditions it covers.",
    "",
    "## Colors",
    "",
    "- These colors are provisional accessibility-oriented prototype values only; they are not a project palette or brand decision.",
    "- Replace them from one authored token source before material production styling.",
    "",
    "## Typography",
    "",
    "- The system-font typography is provisional prototype scaffolding only.",
    "- Record the selected type family, hierarchy and loading behavior before fidelity implementation.",
    "",
    "## Layout",
    "",
    "- This scaffold declares no production page composition, information hierarchy or responsive layout.",
    "- Put durable screen responsibility and interaction structure in `project_context/**`; reference selected visual targets in the Design Authority Index.",
    "",
    "## Components",
    "",
    "- No production component visual language is selected yet.",
    "- When components are selected, record their visual tokens and relevant default, hover, active, focus, disabled, loading and error states without duplicating an authored code token source.",
    "",
    "## Do's and Don'ts",
    "",
    "- Do treat `unconfigured` as a stop/routing signal for material production UI, not as visual permission.",
    "- Do classify selected references as `exact-target`, `constraint` or `inspiration` before implementation.",
    "- Do use these tokens only for an explicitly throwaway prototype while authority remains unconfigured.",
    "- Don't promote an implementation screenshot or diff into its own target baseline.",
    "- Don't add generic AI-looking gradients, oversized cards, excessive rounding or decorative blobs without selected design authority.",
    "",
    "## Design Change Workflow",
    "",
    "- Read this file before creating design drafts, redesigning UI, changing visual systems or implementing material production UI.",
    "- When there is a scan target such as UI source, page files, build output or a local/remote URL, run `npx impeccable detect <target>` before finalizing design changes.",
    "- Treat Impeccable findings as design-review signals: fix issues that affect clarity, consistency, accessibility or trust, and note when there is no suitable scan target.",
    "- After design decisions stabilize, replace the unconfigured marker, index the selected targets and authored token source/generation direction, and record durable tokens, component rules and do/don't guidance.",
    "",
  ].join("\n");
}
