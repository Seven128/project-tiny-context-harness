import { appendFile, lstat, mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, canonicalValueJson, canonicalYaml, parseStrictJson, parseStrictYaml, sha256Hex } from "./composite-campaign-codec.js";
import { deriveConflictProfileV4 } from "./composite-campaign-conflicts.js";
import { validateScopeFitGraphV3, validateScopeFitGraphV4 } from "./composite-campaign-graph.js";
import { currentBranch, runGit } from "./composite-campaign-git-baseline.js";
import { CAMPAIGN_SCHEMA_V4, assertCampaignV4, parseScopeFitResultV3, type CampaignSliceV4, type CampaignV4, type ScopeFitResultV3 } from "./composite-campaign-schema-v4.js";
import { assertCampaignV5, CAMPAIGN_SCHEMA_V5, campaignHasGoalV5, emptyThreadStateV5, type CampaignV5 } from "./composite-campaign-schema-v5.js";
import { parseSourceCoverageV1, validateSourceCoverageAgainstScopeV3, validateSourceCoverageAgainstScopeV4, type CampaignPacketEntityIndexV1, type SourceCoverageV1 } from "./composite-campaign-source-coverage.js";
import { assertSourceUnitPacketBindingsV4, type SourceUnitPacketBindingV4 } from "./composite-campaign-source-units.js";
import { portablePathSlug } from "./composite-campaign-worktree.js";
import { parseLongTaskSources } from "./long-task-contract-parser.js";
import { validateLongTaskCoverage } from "./long-task-contract-coverage.js";
import { LONG_TASK_SOURCE_FILES, type AcceptanceChecklistV3, type LongTaskSourceBundleV3, type ProductSourceV3, type TechnicalPlanV3 } from "./long-task-contract-schema.js";
import { resolveInside } from "./long-task-path-policy.js";
import { parseScopeFitResultV4, type ScopeFitResultV4, type SourceUnitV4 } from "./scope-fit-v4.js";

const PACKET_SCHEMA = "composite-authoring-packet-v3" as const;
const MAX_TRACKED_FILE_BYTES = 1024 * 1024;

export interface CompositeAuthoringPacketV3 {
  schema_version: typeof PACKET_SCHEMA;
  campaign_id: string;
  slice_id: string;
  revision: number;
  previous_packet_sha256: string | null;
  authorities: {
    product_architecture_source: ProductSourceV3;
    technical_realization_plan: TechnicalPlanV3;
    acceptance_checklist: AcceptanceChecklistV3;
  };
  source_unit_bindings?: SourceUnitPacketBindingV4[];
}

export function compositeCampaignV4Contract(): unknown {
  return {
    schema_version: CAMPAIGN_SCHEMA_V5,
    audit_schema: CAMPAIGN_SCHEMA_V4,
    scope_schema: "scope-fit-result-v4",
    goal_manifest_schema: "slice-goal-manifest-v2",
    packet_schema: PACKET_SCHEMA,
    source_coverage_schema: "composite-source-coverage-v1",
    authority_schemas: ["product-source-v3", "technical-plan-v3", "acceptance-checklist-v3"],
    projection_files: LONG_TASK_SOURCE_FILES,
    commands: ["contract", "create", "apply-coverage", "apply-scope", "apply-packet", "render", "preflight", "advance", "bind-goal", "bind-repair-goal", "record-result", "status", "run", "app-server-check", "model-routing", "threads", "interrupt"],
    advance_actions: ["author_packets", "launch_wave", "wait_goals", "repair_integration", "decision_required", "wait_external", "finished"],
    compatibility: "none"
  };
}

export async function createCampaignV4(projectRoot: string, id: string, planFile: string, targetBranch?: string): Promise<{ campaign: CampaignV4; campaign_path: string }> {
  validatePortableId(id, "campaign");
  const root = path.resolve(projectRoot);
  const source = await readSafeFile(root, planFile, "plan-file");
  if (!source.text.trim()) throw new Error("Composite campaign plan must not be empty");
  assertNoRawSecret(source.text, "plan");
  const target = targetBranch ?? await currentBranch(root);
  await runGit(root, ["check-ref-format", "--branch", target]);
  const campaignPath = campaignRootV4(root, id);
  await mkdir(path.dirname(campaignPath), { recursive: true });
  const integrationBranch = `tyctx/campaign/${portablePathSlug(id)}/integration`;
  const campaign: CampaignV4 = {
    schema_version: CAMPAIGN_SCHEMA_V4,
    campaign_id: id,
    source_plan_sha256: sha256Hex(source.text),
    source_kind: "discussed_plan",
    created_at: new Date().toISOString(),
    target_branch: target,
    base_commit: null,
    integration_branch: integrationBranch,
    integration_head: null,
    graph: { graph_revision: 0, graph_sha256: sha256Hex(canonicalValueJson({ slices: [] })), slices: {} },
    slices: {},
    waves: {},
    generation: 1,
    campaign_status: "planning"
  };
  const staging = `${campaignPath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: false });
  try {
    await writeFile(path.join(staging, "source-plan.md"), source.text, { flag: "wx" });
    await writeFile(path.join(staging, "source-coverage.json"), canonicalJson({ schema_version: "composite-source-coverage-draft-v1", source_plan_sha256: campaign.source_plan_sha256, status: "authoring_required", items: [], global_constraint_bindings: [] }), { flag: "wx" });
    await writeFile(path.join(staging, "campaign.yaml"), canonicalYaml(campaign), { flag: "wx" });
    await writeFile(path.join(staging, "events.ndjson"), `${canonicalValueJson(event("campaign_created", campaign))}\n`, { flag: "wx" });
    await rename(staging, campaignPath);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return { campaign, campaign_path: campaignPath };
}

export async function applyCampaignScopeV4(projectRoot: string, campaignPath: string, scopeFile: string, coverageFile: string): Promise<CampaignV4> {
  const scope = parseCurrentScope((await readSafeFile(projectRoot, scopeFile, "scope-input")).text);
  const coverage = parseSourceCoverageV1((await readSafeFile(projectRoot, coverageFile, "source-coverage-input")).text);
  const graph = scope.schema_version === "scope-fit-result-v4" ? validateScopeFitGraphV4(scope) : validateScopeFitGraphV3(scope);
  if (scope.schema_version === "scope-fit-result-v4") validateSourceCoverageAgainstScopeV4(scope, coverage); else validateSourceCoverageAgainstScopeV3(scope, coverage);
  return withCampaignMutation(projectRoot, campaignPath, "scope_applied", async (root, campaign) => {
    const currentSchema = schemaOf(campaign);
    if (currentSchema === CAMPAIGN_SCHEMA_V5 && scope.schema_version !== "scope-fit-result-v4") throw new Error("Campaign V5 requires scope-fit-result-v4");
    if (currentSchema === CAMPAIGN_SCHEMA_V4 && scope.schema_version !== "scope-fit-result-v3") throw new Error("Campaign V4 audit data requires scope-fit-result-v3");
    if (scope.request_sha256 !== campaign.source_plan_sha256 || coverage.source_plan_sha256 !== campaign.source_plan_sha256) throw new Error("Campaign scope/source plan hash mismatch");
    if (currentSchema === CAMPAIGN_SCHEMA_V5 ? campaignHasGoalV5(assertCampaignV5(campaign)) : Object.keys(campaign.waves).length > 0) throw new Error("Scope Fit graph is frozen after the first Campaign Goal is set");
    const prior = await optionalScope(root);
    if (prior) {
      if (scope.schema_version !== prior.schema_version) throw new Error("Scope Fit schema cannot change within a Campaign");
      if (scope.schema_version === "scope-fit-result-v4") validateScopeFitGraphV4(scope, prior as ScopeFitResultV4); else validateScopeFitGraphV3(scope, prior as ScopeFitResultV3);
    }
    const slices: Record<string, CampaignSliceV4> = {};
    for (const slice of scope.slices) slices[slice.slice_id] = campaign.slices[slice.slice_id] ?? emptyCampaignSlice(currentSchema === CAMPAIGN_SCHEMA_V5);
    campaign.graph = {
      graph_revision: campaign.graph.graph_revision + 1,
      graph_sha256: graph.graph_sha256,
      slices: Object.fromEntries(scope.slices.map((slice) => [slice.slice_id, { stable_key: slice.stable_key, depends_on: [...slice.depends_on], priority: slice.priority }]))
    };
    campaign.slices = slices;
    campaign.campaign_status = scope.decision === "blocked_for_decision" ? "decision_blocked" : "authoring";
    await atomic(path.join(root, "scope-fit.json"), canonicalJson(scope));
    await atomic(path.join(root, "source-coverage.json"), canonicalJson(coverage));
    return campaign;
  });
}

export async function applyCampaignPacketV4(projectRoot: string, campaignPath: string, sliceId: string, packetFile: string): Promise<{ campaign: CampaignV4; packet_sha256: string; revision_path: string }> {
  validatePortableId(sliceId, "slice");
  const raw = (await readSafeFile(projectRoot, packetFile, "packet-input")).text;
  assertNoRawSecret(raw, "packet");
  const packet = parseStrictJson(raw) as CompositeAuthoringPacketV3;
  let result!: { campaign: CampaignV4; packet_sha256: string; revision_path: string };
  await withCampaignMutation(projectRoot, campaignPath, "packet_applied", async (root, campaign) => {
    validatePacket(packet, campaign, sliceId);
    const slice = campaign.slices[sliceId];
    if (!slice || !["planned", "packet_pending", "packet_ready"].includes(slice.status)) throw new Error("Campaign Slice cannot accept a Packet in its current state");
    const expected = (slice.packet_revision ?? 0) + 1;
    if (packet.revision !== expected) throw new Error(`Packet revision must be ${expected}`);
    if (expected === 1 && packet.previous_packet_sha256 !== null) throw new Error("First Packet requires previous_packet_sha256=null");
    if (expected > 1 && packet.previous_packet_sha256 !== slice.packet_sha256) throw new Error("Packet previous hash mismatch");
    const packetSha = sha256Hex(canonicalJson(packet));
    const revisionPath = revisionRoot(root, sliceId, packet.revision);
    await mkdir(path.dirname(revisionPath), { recursive: true });
    const staging = `${revisionPath}.tmp-${process.pid}-${Date.now()}`;
    await mkdir(staging, { recursive: false });
    try {
      await writeFile(path.join(staging, "authoring-packet.json"), canonicalJson(packet), { flag: "wx" });
      await renderPacket(staging, packet);
      await rename(staging, revisionPath);
    } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
    slice.packet_revision = packet.revision;
    slice.packet_sha256 = packetSha;
    slice.status = "packet_pending";
    result = { campaign, packet_sha256: packetSha, revision_path: revisionPath };
    return campaign;
  });
  return result;
}

export async function renderCampaignPacketV4(projectRoot: string, campaignPath: string, sliceId: string): Promise<{ revision_path: string; files: string[] }> {
  const { root, campaign } = await loadCampaignV4(projectRoot, campaignPath);
  const revisionPath = currentRevisionRoot(root, campaign, sliceId);
  const packet = await readPacket(revisionPath, campaign, sliceId);
  await renderPacket(revisionPath, packet);
  return { revision_path: revisionPath, files: Object.values(LONG_TASK_SOURCE_FILES) };
}

export async function preflightCampaignPacketV4(projectRoot: string, campaignPath: string, sliceId: string): Promise<{ packet_ready: true; coverage: unknown; revision_path: string; packet_index: CampaignPacketEntityIndexV1; conflict_profile: unknown }> {
  const verified = await verifyCampaignPacketV4(projectRoot, campaignPath, sliceId);
  await withCampaignMutation(projectRoot, campaignPath, "packet_preflight_passed", async (_campaignRoot, campaign) => {
    const slice = campaign.slices[sliceId];
    if (!slice) throw new Error("Unknown Campaign Slice");
    slice.status = "packet_ready";
    return campaign;
  });
  return { packet_ready: true, ...verified };
}

export async function verifyCampaignPacketV4(projectRoot: string, campaignPath: string, sliceId: string): Promise<{ coverage: unknown; revision_path: string; packet_index: CampaignPacketEntityIndexV1; conflict_profile: unknown }> {
  const rendered = await renderCampaignPacketV4(projectRoot, campaignPath, sliceId);
  const bundle = await parseLongTaskSources(rendered.revision_path);
  const coverage = validateLongTaskCoverage(bundle);
  if (!coverage.passed) throw new Error(coverage.errors.join("\n"));
  for (const spec of bundle.checklist.verification_specs) await readFile(resolveInside(projectRoot, spec.oracle.entrypoint, `${spec.id}.oracle`));
  const index = packetEntityIndex(sliceId, bundle);
  const { root, campaign } = await loadCampaignV4(projectRoot, campaignPath);
  const scope = parseCurrentScope(await readFile(path.join(root, "scope-fit.json"), "utf8"));
  const sourceCoverage = parseSourceCoverageV1(await readFile(path.join(root, "source-coverage.json"), "utf8"));
  validateSliceGlobalBindings(sourceCoverage, index);
  const scopeSlice = scope.slices.find((slice) => slice.slice_id === sliceId);
  if (!scopeSlice) throw new Error("Packet Slice is absent from Scope Fit");
  let sourceUnits: SourceUnitV4[] = [];
  if (scope.schema_version === "scope-fit-result-v4") {
    const packet = await readPacket(rendered.revision_path, campaign, sliceId);
    assertSourceUnitPacketBindingsV4(scope, sliceId, packet.source_unit_bindings, bundle);
    const scopeSliceV4 = scope.slices.find((slice) => slice.slice_id === sliceId)!;
    const selected = new Set(scopeSliceV4.source_unit_refs); sourceUnits = scope.source_units.filter((unit) => selected.has(unit.unit_id));
  }
  const profile = deriveConflictProfileV4(scopeSlice, bundle, sourceUnits);
  await atomic(path.join(rendered.revision_path, "packet-index.json"), canonicalJson(index));
  await atomic(path.join(rendered.revision_path, "conflict-profile.json"), canonicalJson(profile));
  return { coverage, revision_path: rendered.revision_path, packet_index: index, conflict_profile: profile };
}

export async function loadCampaignV4(projectRoot: string, supplied: string): Promise<{ root: string; campaign: CampaignV4 }> {
  const project = path.resolve(projectRoot);
  const base = path.join(project, ".codex", "composite-long-task", "campaigns");
  const root = path.resolve(project, supplied);
  if (!inside(base, root) || root === base) throw new Error("Campaign path escapes the V4 campaign root");
  const [baseReal, rootReal] = await Promise.all([realpath(base), realpath(root)]);
  if (!inside(baseReal, rootReal) || rootReal === baseReal) throw new Error("Campaign realpath escapes the V4 campaign root");
  const text = await readBounded(path.join(rootReal, "campaign.yaml"), "campaign.yaml");
  const parsed = parseStrictYaml(text); const campaign = (schemaOf(parsed) === CAMPAIGN_SCHEMA_V5 ? assertCampaignV5(parsed) : assertCampaignV4(parsed)) as unknown as CampaignV4;
  if (sha256Hex(await readBounded(path.join(rootReal, "source-plan.md"), "source-plan.md")) !== campaign.source_plan_sha256) throw new Error("Immutable source-plan.md hash mismatch");
  return { root: rootReal, campaign };
}

export async function mutateCampaignV4(projectRoot: string, campaignPath: string, eventType: string, mutate: (root: string, campaign: CampaignV4) => Promise<CampaignV4>): Promise<CampaignV4> {
  return withCampaignMutation(projectRoot, campaignPath, eventType, mutate);
}

export function campaignRootV4(projectRoot: string, id: string): string { return path.join(path.resolve(projectRoot), ".codex", "composite-long-task", "campaigns", id); }
export function currentPacketRevisionPathV4(campaignRoot: string, campaign: CampaignV4, sliceId: string): string { return currentRevisionRoot(path.resolve(campaignRoot), campaign, sliceId); }

async function withCampaignMutation(projectRoot: string, campaignPath: string, eventType: string, mutate: (root: string, campaign: CampaignV4) => Promise<CampaignV4>): Promise<CampaignV4> {
  const loaded = await loadCampaignV4(projectRoot, campaignPath);
  const lock = path.join(loaded.root, ".campaign.lock");
  let handle;
  try { handle = await open(lock, "wx"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Campaign is being updated by another process"); throw error; }
  try {
    const current = (await loadCampaignV4(projectRoot, loaded.root)).campaign;
    if (current.generation !== loaded.campaign.generation) throw new Error("Campaign generation changed; retry the operation");
    const next = await mutate(loaded.root, current);
    next.generation = current.generation + 1;
    assertCurrentCampaign(next);
    await atomic(path.join(loaded.root, "campaign.yaml"), canonicalYaml(next));
    await appendFile(path.join(loaded.root, "events.ndjson"), `${canonicalValueJson(event(eventType, next))}\n`, "utf8");
    return next;
  } finally { await handle.close(); await rm(lock, { force: true }); }
}

function emptyCampaignSlice(v5 = false): CampaignSliceV4 { const slice: CampaignSliceV4 = { status: "planned", packet_revision: null, packet_sha256: null, wave_id: null, branch: null, worktree: null, goal_id: null, base_commit: null, head_commit: null, final_receipt_sha256: null, merge_commit: null }; return v5 ? { ...slice, thread: emptyThreadStateV5() } as unknown as CampaignSliceV4 : slice; }
function revisionRoot(root: string, sliceId: string, revision: number): string { return path.join(root, "slices", sliceId, "revisions", String(revision).padStart(4, "0")); }
function currentRevisionRoot(root: string, campaign: CampaignV4, sliceId: string): string { const revision = campaign.slices[sliceId]?.packet_revision; if (!revision) throw new Error("Slice has no Packet revision"); return revisionRoot(root, sliceId, revision); }
async function optionalScope(root: string): Promise<ScopeFitResultV3 | ScopeFitResultV4 | null> { try { return parseCurrentScope(await readFile(path.join(root, "scope-fit.json"), "utf8")); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } }

async function readPacket(revisionPath: string, campaign: CampaignV4, sliceId: string): Promise<CompositeAuthoringPacketV3> {
  const packet = parseStrictJson(await readBounded(path.join(revisionPath, "authoring-packet.json"), "authoring-packet.json")) as CompositeAuthoringPacketV3;
  validatePacket(packet, campaign, sliceId);
  if (sha256Hex(canonicalJson(packet)) !== campaign.slices[sliceId].packet_sha256) throw new Error("Immutable Packet revision hash mismatch");
  return packet;
}

function validatePacket(packet: CompositeAuthoringPacketV3, campaign: CampaignV4, sliceId: string): void {
  if (packet.schema_version !== PACKET_SCHEMA) throw new Error(`Legacy packets are not supported; expected ${PACKET_SCHEMA}`);
  if (packet.campaign_id !== campaign.campaign_id || packet.slice_id !== sliceId) throw new Error("Packet campaign/slice identity mismatch");
  if (!Number.isInteger(packet.revision) || packet.revision < 1) throw new Error("Packet revision must be a positive integer");
  if (packet.authorities?.product_architecture_source?.schema_version !== "product-source-v3" || packet.authorities?.technical_realization_plan?.schema_version !== "technical-plan-v3" || packet.authorities?.acceptance_checklist?.schema_version !== "acceptance-checklist-v3") throw new Error("Packet authorities must use the three V3 schemas");
}

async function renderPacket(root: string, packet: CompositeAuthoringPacketV3): Promise<void> {
  const values = { [LONG_TASK_SOURCE_FILES.product]: packet.authorities.product_architecture_source, [LONG_TASK_SOURCE_FILES.plan]: packet.authorities.technical_realization_plan, [LONG_TASK_SOURCE_FILES.checklist]: packet.authorities.acceptance_checklist };
  for (const [file, value] of Object.entries(values)) await atomic(path.join(root, file), canonicalYaml(value));
}

function packetEntityIndex(sliceId: string, bundle: LongTaskSourceBundleV3): CampaignPacketEntityIndexV1 {
  return { slice_id: sliceId, requirement_ids: bundle.product.requirements.map((item) => item.id), acceptance_criterion_ids: bundle.checklist.acceptance_criteria.map((item) => item.id), verification_spec_ids: bundle.checklist.verification_specs.map((item) => item.id), global_invariant_spec_ids: bundle.checklist.verification_specs.filter((item) => item.input_paths.includes("**") || item.proof_capabilities.includes("security_boundary") || item.proof_capabilities.includes("population_coverage")).map((item) => item.id) };
}

function validateSliceGlobalBindings(coverage: SourceCoverageV1, index: CampaignPacketEntityIndexV1): void {
  const requirements = new Set(index.requirement_ids); const criteria = new Set(index.acceptance_criterion_ids); const globals = new Set(index.global_invariant_spec_ids);
  for (const binding of coverage.global_constraint_bindings.filter((item) => item.slice_id === index.slice_id)) {
    for (const id of binding.requirement_ids) if (!requirements.has(id)) throw new Error(`Global constraint binding references unknown requirement: ${id}`);
    for (const id of binding.acceptance_criterion_ids) if (!criteria.has(id)) throw new Error(`Global constraint binding references unknown AC: ${id}`);
    for (const id of binding.verification_spec_ids) if (!globals.has(id)) throw new Error(`Global constraint binding requires a global-invariant spec: ${id}`);
  }
}

function parseCurrentScope(content: string): ScopeFitResultV3 | ScopeFitResultV4 {
  const schema = schemaOf(parseStrictJson(content));
  if (schema === "scope-fit-result-v4") return parseScopeFitResultV4(content);
  return parseScopeFitResultV3(content);
}

function schemaOf(value: unknown): string | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).schema_version === "string"
    ? (value as Record<string, string>).schema_version : undefined;
}

function assertCurrentCampaign(value: unknown): CampaignV4 {
  return (schemaOf(value) === CAMPAIGN_SCHEMA_V5 ? assertCampaignV5(value) : assertCampaignV4(value)) as unknown as CampaignV4;
}

async function readSafeFile(projectRoot: string, supplied: string, label: string): Promise<{ path: string; text: string }> {
  const project = await realpath(path.resolve(projectRoot)); const lexical = resolveInside(project, supplied, label); const actual = await realpath(lexical);
  if (!inside(project, actual)) throw new Error(`${label} escapes the repository through a symlink`);
  return { path: actual, text: await readBounded(actual, label) };
}
async function readBounded(file: string, label: string): Promise<string> { const info = await stat(file); if (!info.isFile() || info.size > MAX_TRACKED_FILE_BYTES) throw new Error(`${label} must be a regular file no larger than ${MAX_TRACKED_FILE_BYTES} bytes`); return readFile(file, "utf8"); }
async function atomic(file: string, content: string): Promise<void> { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.tmp-${process.pid}-${Date.now()}`; await writeFile(temporary, content, { flag: "wx" }); await rename(temporary, file); }
function event(type: string, campaign: CampaignV4): unknown { return { type, campaign_id: campaign.campaign_id, generation: campaign.generation, campaign_status: campaign.campaign_status, occurred_at: new Date().toISOString() }; }
function validatePortableId(value: string, label: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) || /[. ]$/u.test(value) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value)) throw new Error(`${label} id is not portable`); }
function assertNoRawSecret(value: string, label: string): void { if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(value)) throw new Error(`${label} contains a raw credential or private key`); }
function inside(root: string, candidate: string): boolean { const relative = path.relative(path.resolve(root), path.resolve(candidate)); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }
