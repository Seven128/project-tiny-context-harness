import path from "node:path";
import { readConfig } from "./config.js";
import { harnessPath, harnessRoot } from "./harness-root.js";
import { listFiles, pathExists, readText } from "./fs.js";
import { unsupportedSchemaMessage } from "./schema-guard.js";

export interface ValidatorReport {
  info: string[];
  errors: string[];
}

type Validator = (projectRoot: string) => Promise<ValidatorReport>;
type ContextRole =
  | "global"
  | "architecture"
  | "area"
  | "domain"
  | "subdomain"
  | "foundation"
  | "archive"
  | "contract"
  | "verification"
  | "deployment"
  | "implementation-index"
  | "decision-rationale";

type SectionSpec = {
  label: string;
  headings: string[];
};

type ManifestValue = string | boolean | string[];

interface ManifestEntry {
  table: "areas" | "context";
  line: number;
  values: Record<string, ManifestValue>;
}

interface ContextManifest {
  areas: ManifestEntry[];
  contexts: ManifestEntry[];
}

const VALIDATORS: Record<string, Validator> = {
  "validate-context": validateContext,
  "validate-harness": validateContext
};

const GLOBAL_REQUIRED_SECTIONS = [
  ...sectionSpecs([
    "Project Goal",
    "Non-goals / Boundaries",
    "Background",
    "Design Rationale",
    "Architecture Context",
    "Verification Entry Points",
    "Current State",
    "Next Safe Action"
  ]),
  sectionSpec("Context Index", ["Context Index", "Module Index"])
];

const ARCHITECTURE_REQUIRED_SECTIONS = sectionSpecs([
  "System Boundary",
  "Component Map",
  "Data / Control Flow",
  "Design Rationale",
  "Constraints And Tradeoffs",
  "Verification Implications",
  "Open Risks"
]);

const ROLE_ALIASES: Record<string, ContextRole> = {
  global: "global",
  architecture: "architecture",
  area: "area",
  domain: "domain",
  subdomain: "subdomain",
  foundation: "foundation",
  archive: "archive",
  contract: "contract",
  verification: "verification",
  deployment: "deployment",
  "implementation-index": "implementation-index",
  implementation_index: "implementation-index",
  "decision-rationale": "decision-rationale",
  decision_rationale: "decision-rationale"
};

const VALID_READ_POLICIES = new Set(["default", "always", "optional", "on-demand", "never-default"]);
const EXPORT_ARTIFACT_NAME_PATTERNS = [
  /full-project-context/i,
  /当前项目context/i,
  /当前项目代码实现(?:context)?/i,
  /code-level-implementation/i,
  /project-overview/i,
  /context-bundle/i,
  /context-summary/i,
  /context-export/i
];

const FAKE_VERIFICATION_PATTERNS = [
  /\btests?\s+(?:pass(?:ed|es)?|green)\b/i,
  /\bverified\b/i,
  /\bdeployed\s+successfully\b/i,
  /\bvalidation\s+passed\b/i,
  /\b测试(?:已)?通过\b/,
  /\b验证(?:已)?通过\b/,
  /\b部署(?:已)?成功\b/
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
  const architecturePath = path.join(projectRoot, "project_context", "architecture.md");
  const projectContextRoot = path.join(projectRoot, "project_context");
  const configPath = path.join(projectRoot, harnessPath(root, "config.yaml"));
  const manifestPath = path.join(projectRoot, "project_context", "context.toml");
  const manifestRoles = new Map<string, ContextRole>();
  let schemaVersion = "4";

  if (!(await pathExists(configPath))) {
    errors.push(`${harnessPath(root, "config.yaml")} is missing`);
  } else {
    schemaVersion = (await readConfig(projectRoot)).core.schema_version;
    const unsupportedSchema = unsupportedSchemaMessage(schemaVersion, "validate-context");
    if (unsupportedSchema) {
      errors.push(unsupportedSchema);
      return { info, errors };
    }
  }

  if (!(await pathExists(globalPath))) {
    errors.push("project_context/global.md is missing");
  } else {
    const global = await readText(globalPath);
    assertSections("project_context/global.md", global, GLOBAL_REQUIRED_SECTIONS, errors);
    assertSectionHasContent("project_context/global.md", global, sectionSpec("Verification Entry Points"), errors);
    assertSectionHasContent("project_context/global.md", global, sectionSpec("Next Safe Action"), errors);
    assertNoFakeVerification("project_context/global.md", global, errors);
  }

  if (!(await pathExists(architecturePath))) {
    errors.push("project_context/architecture.md is missing");
  } else {
    const architecture = await readText(architecturePath);
    assertSections("project_context/architecture.md", architecture, ARCHITECTURE_REQUIRED_SECTIONS, errors);
    assertSectionHasContent("project_context/architecture.md", architecture, sectionSpec("System Boundary"), errors);
    assertSectionHasContent("project_context/architecture.md", architecture, sectionSpec("Component Map"), errors);
    assertNoFakeVerification("project_context/architecture.md", architecture, errors);
  }

  if (await pathExists(manifestPath)) {
    const manifest = parseContextManifest(await readText(manifestPath), "project_context/context.toml", errors);
    if (manifest) {
      await validateContextManifest(projectRoot, manifest, manifestRoles, errors);
      info.push(`loaded project_context/context.toml with ${manifest.areas.length} area(s) and ${manifest.contexts.length} context node(s)`);
    }
  } else if (schemaRequiresContextManifest(schemaVersion)) {
    errors.push("project_context/context.toml is missing; run sdlc-harness upgrade to create the Schema v4 Context graph manifest");
  }

  const contextFiles = (await listFiles(projectContextRoot))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file !== globalPath && file !== architecturePath)
    .sort();

  const validatedContextFiles = new Map<string, ContextRole>();
  for (const file of contextFiles) {
    const relative = repoRelative(projectRoot, file);
    const content = await readText(file);
    const frontMatter = parseFrontMatter(content);
    const frontMatterRole = frontMatterContextRole(frontMatter, relative, errors);
    if (frontMatter.read_policy && !VALID_READ_POLICIES.has(frontMatter.read_policy)) {
      errors.push(`${relative} has unsupported read_policy: ${frontMatter.read_policy}`);
    }
    const role = manifestRoles.get(relative) ?? frontMatterRole;
    if (!role) {
      continue;
    }
    validateContextFile(relative, content, role, errors);
    validatedContextFiles.set(relative, role);
  }

  for (const [relative, role] of manifestRoles.entries()) {
    if (!validatedContextFiles.has(relative)) {
      const absolute = path.join(projectRoot, ...relative.split("/"));
      if (await pathExists(absolute)) {
        validateContextFile(relative, await readText(absolute), role, errors);
        validatedContextFiles.set(relative, role);
      }
    }
  }

  info.push(`checked project_context/global.md, project_context/architecture.md and ${validatedContextFiles.size} context graph file(s)`);
  if (errors.length === 0) {
    info.push("Minimal Context validation passed");
  }
  return { info, errors };
}

function validateContextFile(file: string, content: string, role: ContextRole, errors: string[]): void {
  void role;
  assertNoFakeVerification(file, content, errors);
}

async function validateContextManifest(
  projectRoot: string,
  manifest: ContextManifest,
  manifestRoles: Map<string, ContextRole>,
  errors: string[]
): Promise<void> {
  if (manifest.areas.length === 0) {
    errors.push("project_context/context.toml must declare at least one [[areas]] entry");
  }

  let hasDefaultArea = false;
  for (const area of manifest.areas) {
    const id = stringManifestValue(area, "id", "project_context/context.toml", errors);
    stringManifestValue(area, "root", "project_context/context.toml", errors);
    const context = stringManifestValue(area, "context", "project_context/context.toml", errors);
    optionalStringManifestValue(area, "kind", "project_context/context.toml", errors);
    const defaultArea = optionalBooleanManifestValue(area, "default", "project_context/context.toml", errors);
    hasDefaultArea = hasDefaultArea || defaultArea === true;
    optionalStringArrayManifestValue(area, "forbidden_runtime_dependencies", "project_context/context.toml", errors);
    if (id && context) {
      await addManifestRole(projectRoot, manifestRoles, context, "area", `area ${id}`, errors);
    }
  }
  if (manifest.areas.length > 0 && !hasDefaultArea) {
    errors.push("project_context/context.toml must mark one [[areas]] entry with default = true");
  }

  for (const context of manifest.contexts) {
    const pathValue = stringManifestValue(context, "path", "project_context/context.toml", errors);
    const roleValue = stringManifestValue(context, "role", "project_context/context.toml", errors);
    optionalStringManifestValue(context, "read_when", "project_context/context.toml", errors);
    const readPolicy = optionalStringManifestValue(context, "read_policy", "project_context/context.toml", errors);
    optionalStringArrayManifestValue(context, "triggers", "project_context/context.toml", errors);
    optionalStringArrayManifestValue(context, "default_children", "project_context/context.toml", errors);
    if (readPolicy && !VALID_READ_POLICIES.has(readPolicy)) {
      errors.push(`project_context/context.toml line ${context.line} has unsupported read_policy: ${readPolicy}`);
    }
    const role = roleValue ? normalizeRole(roleValue) : undefined;
    if (roleValue && !role) {
      errors.push(`project_context/context.toml line ${context.line} has unsupported context role: ${roleValue}`);
    }
    if (role && pathValue) {
      await addManifestRole(projectRoot, manifestRoles, pathValue, role, `context ${pathValue}`, errors);
    }
  }
}

async function addManifestRole(
  projectRoot: string,
  roles: Map<string, ContextRole>,
  rawPath: string,
  role: ContextRole,
  source: string,
  errors: string[]
): Promise<void> {
  const relative = normalizeContextPath(rawPath);
  if (looksLikeExportArtifact(relative)) {
    errors.push(
      `project_context/context.toml ${source} must not reference temporary export artifact ${rawPath}; export artifacts belong in tmp/sdlc/context-exports/** and must not be registered as Context graph nodes or implementation-index`
    );
    return;
  }
  if (!relative.startsWith("project_context/") || !relative.endsWith(".md")) {
    errors.push(`project_context/context.toml ${source} must reference a markdown file under project_context/: ${rawPath}`);
    return;
  }
  const existing = roles.get(relative);
  if (existing && existing !== role) {
    errors.push(`project_context/context.toml assigns conflicting roles to ${relative}: ${existing} and ${role}`);
    return;
  }
  roles.set(relative, role);
  if (!(await pathExists(path.join(projectRoot, ...relative.split("/"))))) {
    errors.push(`project_context/context.toml references missing context file: ${relative}`);
  }
}

function assertSections(file: string, content: string, sections: SectionSpec[], errors: string[]): void {
  for (const section of sections) {
    if (!hasAnyHeading(content, section)) {
      errors.push(`${file} is missing section: ${section.label}`);
    }
  }
}

function assertSectionHasContent(file: string, content: string, section: SectionSpec, errors: string[]): void {
  const body = sectionBodyForSpec(content, section);
  if (!body || body.replace(/[-*`\s]/g, "").length === 0) {
    errors.push(`${file} section ${section.label} must describe concrete project facts`);
  }
}

function assertNoFakeVerification(file: string, content: string, errors: string[]): void {
  const verification =
    sectionBody(content, "Verification Entry Points") ??
    sectionBody(content, "Verification Paths") ??
    sectionBody(content, "Deployment Paths") ??
    sectionBody(content, "Test Entry Points") ??
    sectionBody(content, "Verification Implications") ??
    sectionBody(content, "Tests");
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

function hasAnyHeading(content: string, section: SectionSpec): boolean {
  return section.headings.some((heading) => hasHeading(content, heading));
}

function hasHeading(content: string, heading: string): boolean {
  const escaped = escapeRegExp(heading);
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(content);
}

function sectionBodyForSpec(content: string, section: SectionSpec): string | undefined {
  for (const heading of section.headings) {
    const body = sectionBody(content, heading);
    if (body !== undefined) {
      return body;
    }
  }
  return undefined;
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

function schemaRequiresContextManifest(schemaVersion: string): boolean {
  const major = Number.parseInt(schemaVersion, 10);
  return Number.isNaN(major) || major >= 4;
}

function frontMatterContextRole(frontMatter: Record<string, string>, file: string, errors: string[]): ContextRole | undefined {
  const role = frontMatter.context_role;
  if (!role) {
    return undefined;
  }
  const normalized = normalizeRole(role);
  if (!normalized) {
    errors.push(`${file} has unsupported context_role: ${role}`);
  }
  return normalized;
}

function parseFrontMatter(content: string): Record<string, string> {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return {};
  }
  const values: Record<string, string> = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "---") {
      return values;
    }
    const match = /^([A-Za-z0-9_-]+):\s*(.+?)\s*$/.exec(line);
    if (match) {
      values[match[1]] = stripQuotes(match[2]);
    }
  }
  return {};
}

function parseContextManifest(content: string, file: string, errors: string[]): ContextManifest | undefined {
  const manifest: ContextManifest = { areas: [], contexts: [] };
  let current: ManifestEntry | undefined;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = stripTomlComment(lines[index]).trim();
    if (!line) {
      continue;
    }
    const tableMatch = /^\[\[(areas|context)\]\]$/.exec(line);
    if (tableMatch) {
      current = { table: tableMatch[1] as "areas" | "context", line: lineNumber, values: {} };
      if (current.table === "areas") {
        manifest.areas.push(current);
      } else {
        manifest.contexts.push(current);
      }
      continue;
    }
    if (!current) {
      errors.push(`${file} line ${lineNumber} must appear inside [[areas]] or [[context]]`);
      continue;
    }
    const assignment = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!assignment) {
      errors.push(`${file} line ${lineNumber} is not a supported manifest assignment`);
      continue;
    }
    const parsed = parseTomlValue(assignment[2]);
    if (parsed === undefined) {
      errors.push(`${file} line ${lineNumber} has an unsupported value; use strings, booleans or string arrays`);
      continue;
    }
    current.values[assignment[1]] = parsed;
  }
  return manifest;
}

function parseTomlValue(raw: string): ManifestValue | undefined {
  const value = raw.trim();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return stripQuotes(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    const values: string[] = [];
    for (const part of inner.split(",")) {
      const item = part.trim();
      if (!((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'")))) {
        return undefined;
      }
      values.push(stripQuotes(item));
    }
    return values;
  }
  return undefined;
}

function stripTomlComment(line: string): string {
  let quote: string | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function stringManifestValue(entry: ManifestEntry, key: string, file: string, errors: string[]): string | undefined {
  const value = entry.values[key];
  if (typeof value === "string") {
    return value;
  }
  errors.push(`${file} line ${entry.line} must include string field ${key}`);
  return undefined;
}

function optionalStringManifestValue(entry: ManifestEntry, key: string, file: string, errors: string[]): string | undefined {
  const value = entry.values[key];
  if (value === undefined || typeof value === "string") {
    return value;
  }
  errors.push(`${file} line ${entry.line} field ${key} must be a string`);
  return undefined;
}

function optionalBooleanManifestValue(entry: ManifestEntry, key: string, file: string, errors: string[]): boolean | undefined {
  const value = entry.values[key];
  if (value === undefined || typeof value === "boolean") {
    return value;
  }
  errors.push(`${file} line ${entry.line} field ${key} must be a boolean`);
  return undefined;
}

function optionalStringArrayManifestValue(entry: ManifestEntry, key: string, file: string, errors: string[]): string[] | undefined {
  const value = entry.values[key];
  if (value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"))) {
    return value as string[] | undefined;
  }
  errors.push(`${file} line ${entry.line} field ${key} must be an array of strings`);
  return undefined;
}

function normalizeRole(value: string): ContextRole | undefined {
  return ROLE_ALIASES[value.trim().toLowerCase()];
}

function normalizeContextPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function looksLikeExportArtifact(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return EXPORT_ARTIFACT_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function sectionSpec(label: string, headings = [label]): SectionSpec {
  return { label, headings };
}

function sectionSpecs(labels: string[]): SectionSpec[] {
  return labels.map((label) => sectionSpec(label));
}
