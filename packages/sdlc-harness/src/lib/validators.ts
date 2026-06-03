import path from "node:path";
import { harnessPath, harnessRoot } from "./harness-root.js";
import { listFiles, pathExists, readText } from "./fs.js";

export interface ValidatorReport {
  info: string[];
  errors: string[];
}

type Validator = (projectRoot: string) => Promise<ValidatorReport>;

const VALIDATORS: Record<string, Validator> = {
  "validate-context": validateContext,
  "validate-harness": validateContext
};

const GLOBAL_REQUIRED_SECTIONS = [
  "Project Goal",
  "Non-goals / Boundaries",
  "Background",
  "Design Rationale",
  "Verification Entry Points",
  "Current State",
  "Next Safe Action",
  "Module Index"
];

const MODULE_REQUIRED_SECTIONS = [
  "Responsibility",
  "User / System Contract",
  "Core Data / API / State",
  "Key Constraints",
  "Code Entry Points",
  "Test Entry Points",
  "Open Risks"
];

const FAKE_VERIFICATION_PATTERNS = [
  /\btests?\s+(?:pass(?:ed|es)?|green)\b/i,
  /\bverified\b/i,
  /\bvalidation\s+passed\b/i,
  /\b测试(?:已)?通过\b/,
  /\b验证(?:已)?通过\b/
];

export async function runValidator(projectRoot: string, gate: string): Promise<ValidatorReport> {
  const validator = VALIDATORS[gate];
  if (!validator) {
    return {
      info: [],
      errors: [
        `unknown validator: ${gate}. Minimal Context Harness supports validate-context and validate-harness only.`
      ]
    };
  }
  return validator(projectRoot);
}

async function validateContext(projectRoot: string): Promise<ValidatorReport> {
  const info: string[] = [];
  const errors: string[] = [];
  const root = await harnessRoot(projectRoot);

  const globalPath = path.join(projectRoot, "project_context", "global.md");
  const modulesRoot = path.join(projectRoot, "project_context", "modules");
  const configPath = path.join(projectRoot, harnessPath(root, "config.yaml"));

  if (!(await pathExists(configPath))) {
    errors.push(`${harnessPath(root, "config.yaml")} is missing`);
  }

  if (!(await pathExists(globalPath))) {
    errors.push("project_context/global.md is missing");
  } else {
    const global = await readText(globalPath);
    assertSections("project_context/global.md", global, GLOBAL_REQUIRED_SECTIONS, errors);
    assertSectionHasContent("project_context/global.md", global, "Verification Entry Points", errors);
    assertSectionHasContent("project_context/global.md", global, "Next Safe Action", errors);
    assertNoFakeVerification("project_context/global.md", global, errors);
  }

  const moduleFiles = (await listFiles(modulesRoot))
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (moduleFiles.length === 0) {
    errors.push("project_context/modules/ must contain at least one module context markdown file");
  }

  for (const file of moduleFiles) {
    const relative = repoRelative(projectRoot, file);
    const content = await readText(file);
    assertSections(relative, content, MODULE_REQUIRED_SECTIONS, errors);
    assertSectionHasContent(relative, content, "Code Entry Points", errors);
    assertSectionHasContent(relative, content, "Test Entry Points", errors);
    assertNoFakeVerification(relative, content, errors);
  }

  info.push(`checked project_context/global.md and ${moduleFiles.length} module context file(s)`);
  if (errors.length === 0) {
    info.push("Minimal Context validation passed");
  }
  return { info, errors };
}

function assertSections(file: string, content: string, sections: string[], errors: string[]): void {
  for (const section of sections) {
    if (!hasHeading(content, section)) {
      errors.push(`${file} is missing section: ${section}`);
    }
  }
}

function assertSectionHasContent(file: string, content: string, section: string, errors: string[]): void {
  const body = sectionBody(content, section);
  if (!body || body.replace(/[-*`\s]/g, "").length === 0) {
    errors.push(`${file} section ${section} must describe concrete project facts`);
  }
}

function assertNoFakeVerification(file: string, content: string, errors: string[]): void {
  const verification = sectionBody(content, "Verification Entry Points") ?? sectionBody(content, "Test Entry Points");
  if (!verification) {
    return;
  }
  for (const pattern of FAKE_VERIFICATION_PATTERNS) {
    if (pattern.test(verification)) {
      errors.push(`${file} must list verification entry points, not claim tests were already executed`);
      return;
    }
  }
}

function hasHeading(content: string, heading: string): boolean {
  const escaped = escapeRegExp(heading);
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(content);
}

function sectionBody(content: string, heading: string): string | undefined {
  const escaped = escapeRegExp(heading);
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(content);
  if (!match) {
    return undefined;
  }
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repoRelative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}
