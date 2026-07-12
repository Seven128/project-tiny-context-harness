import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, canonicalYaml, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { compileLongTaskContract, readCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import { parseLongTaskSources } from "./long-task-contract-parser.js";
import { validateLongTaskCoverage } from "./long-task-contract-coverage.js";
import { LONG_TASK_SOURCE_FILES, type AcceptanceChecklistV3, type ProductSourceV3, type TechnicalPlanV3 } from "./long-task-contract-schema.js";
import { compileAndSealLongTaskContract } from "./long-task-host-client.js";
import { resolveInside } from "./long-task-path-policy.js";
import { readCurrentLongTaskFinalResultV3 } from "./long-task-current-final-result.js";

const CAMPAIGN_SCHEMA = "composite-campaign-v3";
const SCOPE_SCHEMA = "scope-fit-result-v3";
const PACKET_SCHEMA = "composite-authoring-packet-v3";
const TERMINAL = new Set(["accepted", "externally_blocked"]);

interface SfcDefinition {
  sfc_id: string;
  stable_key: string;
  title: string;
  objective: string;
  depends_on: string[];
  priority: number;
  scope_summary: string[];
  out_of_scope: string[];
  decisions_required: string[];
}

interface SfcRecord extends SfcDefinition {
  current_revision: number;
  packet_sha256: string;
  handoff_workdir?: string;
  goal_id?: string;
  result?: { workflow_status: string; contract_sha256: string; run_id: string };
}

interface Campaign {
  schema_version: typeof CAMPAIGN_SCHEMA;
  campaign_id: string;
  request_sha256: string;
  generation: number;
  selected_sfc_id: string | null;
  sfcs: Record<string, SfcRecord>;
}

interface ScopeFitResult {
  schema_version: typeof SCOPE_SCHEMA;
  request_sha256: string;
  decision: "fit_for_three_inputs" | "split_required" | "blocked_for_decision" | "not_long_task";
  rationale: string[];
  sfcs: SfcDefinition[];
  selected_sfc_id: string | null;
  decision_required: null | { decision_id: string; question: string; candidates: string[] };
}

interface Packet {
  schema_version: typeof PACKET_SCHEMA;
  campaign_id: string;
  sfc_id: string;
  revision: number;
  previous_packet_sha256: string | null;
  authorities: {
    product_architecture_source: ProductSourceV3;
    technical_realization_plan: TechnicalPlanV3;
    acceptance_checklist: AcceptanceChecklistV3;
  };
}

export function compositeCampaignV3Contract() {
  return {
    schema_version: PACKET_SCHEMA,
    scope_schema_version: SCOPE_SCHEMA,
    sfc_option: "--sfc",
    authority_schemas: ["product-source-v3", "technical-plan-v3", "acceptance-checklist-v3"],
    projection_files: LONG_TASK_SOURCE_FILES,
    compatibility: "none"
  };
}

export async function createCampaignV3(projectRoot: string, id: string, requestFile: string) {
  validateId(id, "campaign");
  const request = await readFile(resolveInside(projectRoot, requestFile, "request-file"), "utf8");
  if (!request.trim()) throw new Error("Composite campaign request must not be empty");
  assertNoRawSecret(request, "request");
  const root = campaignRoot(projectRoot, id);
  await mkdir(path.dirname(root), { recursive: true });
  const staging = `${root}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: false });
  const campaign: Campaign = { schema_version: CAMPAIGN_SCHEMA, campaign_id: id, request_sha256: sha256Hex(request), generation: 1, selected_sfc_id: null, sfcs: {} };
  try {
    await writeFile(path.join(staging, "request.md"), request, { flag: "wx" });
    await writeFile(path.join(staging, "campaign.yaml"), canonicalYaml(campaign), { flag: "wx" });
    await rename(staging, root);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return campaign;
}

export async function applyScopeV3(projectRoot: string, campaignPath: string, inputFile: string) {
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  const input = parseStrictJson(await readFile(resolveInside(projectRoot, inputFile, "scope-input"), "utf8")) as ScopeFitResult;
  validateScope(input, campaign);
  const next: Record<string, SfcRecord> = {};
  for (const definition of input.sfcs) {
    const existing = campaign.sfcs[definition.sfc_id];
    if (existing && canonicalJson(sfcDefinition(existing)) !== canonicalJson(definition)) throw new Error(`scope_graph_existing_sfc_changed:${definition.sfc_id}`);
    next[definition.sfc_id] = existing ?? { ...definition, current_revision: 0, packet_sha256: "" };
  }
  for (const id of Object.keys(campaign.sfcs)) if (!next[id]) throw new Error(`scope_graph_sfc_removed:${id}`);
  campaign.sfcs = next;
  campaign.selected_sfc_id = input.selected_sfc_id;
  campaign.generation += 1;
  await atomic(path.join(root, "scope-fit.json"), canonicalJson(input));
  await saveCampaign(root, campaign);
  return campaign;
}

export async function applyPacketV3(projectRoot: string, campaignPath: string, sfcId: string, inputFile: string) {
  validateSfcId(sfcId);
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  if (campaign.selected_sfc_id !== sfcId) throw new Error("Packet SFC must equal the selected SFC");
  const raw = await readFile(resolveInside(projectRoot, inputFile, "packet-input"), "utf8");
  assertNoRawSecret(raw, "packet");
  const packet = parseStrictJson(raw) as Packet;
  validatePacket(packet, campaign, sfcId);
  const prior = campaign.sfcs[sfcId];
  const expectedRevision = prior.current_revision + 1;
  if (packet.revision !== expectedRevision) throw new Error(`Packet revision must be ${expectedRevision}`);
  if (expectedRevision > 1 && packet.previous_packet_sha256 !== prior.packet_sha256) throw new Error("Packet previous hash mismatch");
  if (expectedRevision === 1 && packet.previous_packet_sha256 !== null) throw new Error("First V3 packet requires previous_packet_sha256=null");
  const packetHash = sha256Hex(canonicalJson(packet));
  const revision = revisionRoot(root, sfcId, packet.revision);
  await mkdir(path.dirname(revision), { recursive: true });
  const staging = `${revision}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(staging, { recursive: false });
  try {
    await writeFile(path.join(staging, "authoring-packet.json"), canonicalJson(packet), { flag: "wx" });
    await renderPacket(staging, packet);
    await rename(staging, revision);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  campaign.sfcs[sfcId] = { ...prior, current_revision: packet.revision, packet_sha256: packetHash };
  campaign.generation += 1;
  await saveCampaign(root, campaign);
  return { campaign, packet_sha256: packetHash, revision_path: revision };
}

export async function renderCampaignV3(projectRoot: string, campaignPath: string, sfcId: string) {
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  const revision = currentRevision(campaign, sfcId);
  const revisionPath = revisionRoot(root, sfcId, revision);
  const packet = parseStrictJson(await readFile(path.join(revisionPath, "authoring-packet.json"), "utf8")) as Packet;
  if (sha256Hex(canonicalJson(packet)) !== campaign.sfcs[sfcId].packet_sha256) throw new Error("Immutable V3 packet revision hash mismatch");
  validatePacket(packet, campaign, sfcId);
  await renderPacket(revisionPath, packet);
  return { revision_path: revisionPath, files: Object.values(LONG_TASK_SOURCE_FILES) };
}

export async function preflightCampaignV3(projectRoot: string, campaignPath: string, sfcId: string) {
  const rendered = await renderCampaignV3(projectRoot, campaignPath, sfcId);
  const bundle = await parseLongTaskSources(rendered.revision_path);
  const coverage = validateLongTaskCoverage(bundle);
  if (!coverage.passed) throw new Error(coverage.errors.join("\n"));
  for (const spec of bundle.checklist.verification_specs) await readFile(path.resolve(projectRoot, spec.oracle.entrypoint));
  return { handoff_ready: true, coverage, revision_path: rendered.revision_path };
}

export async function handoffCampaignV3(projectRoot: string, campaignPath: string, sfcId: string) {
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  await preflightCampaignV3(projectRoot, campaignPath, sfcId);
  const revision = currentRevision(campaign, sfcId);
  const source = revisionRoot(root, sfcId, revision);
  const workdir = path.join(projectRoot, "tmp", "ty-context", "plan-acceptance", campaign.campaign_id, `${sfcId}-r${revision}`);
  await rm(workdir, { recursive: true, force: true });
  await mkdir(workdir, { recursive: true });
  for (const file of Object.values(LONG_TASK_SOURCE_FILES)) await cp(path.join(source, file), path.join(workdir, file));
  const contract = await compileLongTaskContract(workdir, projectRoot);
  campaign.sfcs[sfcId].handoff_workdir = workdir;
  campaign.generation += 1;
  await saveCampaign(root, campaign);
  return { workdir, contract_sha256: contract.contract_sha256, goal_created: false };
}

export async function bindCampaignGoalV3(projectRoot: string, campaignPath: string, sfcId: string, goalId: string, compileAndSeal: (workdir: string, root: string) => Promise<unknown> = compileAndSealLongTaskContract) {
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  const sfc = campaign.sfcs[sfcId];
  const handoff = sfc?.handoff_workdir;
  if (!handoff) throw new Error("Handoff must succeed before binding a Goal");
  if (sfc.goal_id && sfc.goal_id !== goalId) throw new Error("SFC is already bound to a different Goal");
  await compileAndSeal(handoff, projectRoot);
  sfc.goal_id = goalId;
  campaign.generation += 1;
  await saveCampaign(root, campaign);
  return campaign;
}

export async function recordCampaignResultV3(projectRoot: string, campaignPath: string, sfcId: string, workdir: string, currentResult: (workdir: string) => Promise<{ workflow_status: string; contract_sha256: string; run_id: string }> = readCurrentLongTaskFinalResultV3) {
  const { root, campaign } = await loadCampaign(projectRoot, campaignPath);
  const sfc = campaign.sfcs[sfcId];
  if (path.resolve(sfc?.handoff_workdir ?? "") !== path.resolve(projectRoot, workdir)) throw new Error("Result workdir does not match the frozen handoff");
  const contract = await readCompiledLongTaskContract(sfc.handoff_workdir!);
  const result = await currentResult(sfc.handoff_workdir!);
  if (result.contract_sha256 !== contract.contract_sha256 || !TERMINAL.has(result.workflow_status)) throw new Error("Only a freshly recomputed accepted or externally_blocked V3 final result can be projected");
  sfc.result = { workflow_status: result.workflow_status, contract_sha256: result.contract_sha256, run_id: result.run_id };
  campaign.generation += 1;
  await saveCampaign(root, campaign);
  return sfc.result;
}

export async function nextCampaignSfcV3(projectRoot: string, campaignPath: string) {
  const { campaign } = await loadCampaign(projectRoot, campaignPath);
  const selected = campaign.selected_sfc_id ? campaign.sfcs[campaign.selected_sfc_id] : undefined;
  if (selected && !selected.result) return { selected_sfc_id: selected.sfc_id, recommended_sfc_id: null, ready_sfc_ids: [selected.sfc_id], next_action: selected.current_revision ? "handoff_or_execute" : "apply_packet" };
  const ready = Object.values(campaign.sfcs).filter((sfc) => !sfc.result && sfc.depends_on.every((id) => campaign.sfcs[id]?.result?.workflow_status === "accepted"));
  const highest = ready.length ? Math.min(...ready.map((sfc) => sfc.priority)) : null;
  const candidates = ready.filter((sfc) => sfc.priority === highest).map((sfc) => sfc.sfc_id).sort();
  return { selected_sfc_id: null, recommended_sfc_id: candidates.length === 1 ? candidates[0] : null, ready_sfc_ids: candidates, next_action: candidates.length === 1 ? "apply_scope_selection" : candidates.length > 1 ? "user_selection_required" : "no_dependency_ready_sfc" };
}

function validateScope(input: ScopeFitResult, campaign: Campaign): void {
  if (input.schema_version !== SCOPE_SCHEMA) throw new Error(`Legacy scope results are not supported; expected ${SCOPE_SCHEMA}`);
  exactKeys(input, ["schema_version", "request_sha256", "decision", "rationale", "sfcs", "selected_sfc_id", "decision_required"], "scope-fit-result-v3");
  if (input.request_sha256 !== campaign.request_sha256) throw new Error("scope_request_sha256_mismatch");
  if (!["fit_for_three_inputs", "split_required", "blocked_for_decision", "not_long_task"].includes(input.decision)) throw new Error("scope_decision_invalid");
  strings(input.rationale, "scope.rationale", true);
  if (!Array.isArray(input.sfcs)) throw new Error("scope_sfcs_invalid");
  const ids = new Set<string>();
  for (const sfc of input.sfcs) {
    exactKeys(sfc, ["sfc_id", "stable_key", "title", "objective", "depends_on", "priority", "scope_summary", "out_of_scope", "decisions_required"], "scope.sfc");
    validateSfcId(sfc.sfc_id);
    if (ids.has(sfc.sfc_id)) throw new Error(`scope_duplicate_sfc:${sfc.sfc_id}`);
    ids.add(sfc.sfc_id);
    for (const key of ["stable_key", "title", "objective"] as const) if (typeof sfc[key] !== "string" || !sfc[key].trim()) throw new Error(`scope_sfc_${key}_invalid:${sfc.sfc_id}`);
    if (!Number.isSafeInteger(sfc.priority) || sfc.priority < 0) throw new Error(`scope_sfc_priority_invalid:${sfc.sfc_id}`);
    strings(sfc.depends_on, `${sfc.sfc_id}.depends_on`);
    strings(sfc.scope_summary, `${sfc.sfc_id}.scope_summary`, true);
    strings(sfc.out_of_scope, `${sfc.sfc_id}.out_of_scope`);
    strings(sfc.decisions_required, `${sfc.sfc_id}.decisions_required`);
  }
  for (const sfc of input.sfcs) for (const dependency of sfc.depends_on) if (!ids.has(dependency) || dependency === sfc.sfc_id) throw new Error(`scope_dependency_invalid:${sfc.sfc_id}:${dependency}`);
  assertAcyclic(input.sfcs);
  if (input.decision === "fit_for_three_inputs" && input.sfcs.length !== 1) throw new Error("scope_fit_requires_one_sfc");
  if (input.decision === "split_required" && input.sfcs.length < 2) throw new Error("scope_split_requires_multiple_sfcs");
  if (input.decision === "not_long_task" && (input.sfcs.length || input.selected_sfc_id !== null || input.decision_required !== null)) throw new Error("scope_not_long_task_must_be_empty");
  if (input.decision === "blocked_for_decision") {
    if (input.selected_sfc_id !== null || !input.decision_required) throw new Error("scope_blocked_decision_shape_invalid");
    exactKeys(input.decision_required, ["decision_id", "question", "candidates"], "scope.decision_required");
    if (!input.decision_required.decision_id?.trim() || !input.decision_required.question?.trim()) throw new Error("scope_decision_required_invalid");
    strings(input.decision_required.candidates, "scope.decision_required.candidates", true);
    if (input.decision_required.candidates.some((id) => !ids.has(id))) throw new Error("scope_decision_candidate_invalid");
  } else if (input.decision_required !== null) throw new Error("scope_unexpected_decision_required");
  if (["fit_for_three_inputs", "split_required"].includes(input.decision)) {
    if (typeof input.selected_sfc_id !== "string" || !ids.has(input.selected_sfc_id)) throw new Error("scope_selected_sfc_invalid");
    const selected = input.sfcs.find((sfc) => sfc.sfc_id === input.selected_sfc_id)!;
    if (selected.depends_on.some((id) => campaign.sfcs[id]?.result?.workflow_status !== "accepted")) throw new Error(`scope_selected_sfc_dependencies_incomplete:${selected.sfc_id}`);
    const previous = campaign.selected_sfc_id ? campaign.sfcs[campaign.selected_sfc_id] : undefined;
    if (previous && previous.sfc_id !== selected.sfc_id && previous.goal_id && !previous.result) throw new Error("scope_active_goal_selection_conflict");
    if (campaign.sfcs[selected.sfc_id]?.result) throw new Error("scope_selected_sfc_already_terminal");
  }
}

function validatePacket(packet: Packet, campaign: Campaign, sfcId: string): void {
  if (packet.schema_version !== PACKET_SCHEMA) throw new Error("Legacy packets are not supported; expected composite-authoring-packet-v3");
  exactKeys(packet, ["schema_version", "campaign_id", "sfc_id", "revision", "previous_packet_sha256", "authorities"], "authoring-packet");
  if (packet.campaign_id !== campaign.campaign_id || packet.sfc_id !== sfcId) throw new Error("Packet campaign/SFC identity mismatch");
  if (packet.authorities?.product_architecture_source?.schema_version !== "product-source-v3" || packet.authorities?.technical_realization_plan?.schema_version !== "technical-plan-v3" || packet.authorities?.acceptance_checklist?.schema_version !== "acceptance-checklist-v3") throw new Error("Packet authorities must use the three V3 schemas");
}

async function renderPacket(root: string, packet: Packet): Promise<void> {
  const values = { [LONG_TASK_SOURCE_FILES.product]: packet.authorities.product_architecture_source, [LONG_TASK_SOURCE_FILES.plan]: packet.authorities.technical_realization_plan, [LONG_TASK_SOURCE_FILES.checklist]: packet.authorities.acceptance_checklist };
  for (const [file, value] of Object.entries(values)) await atomic(path.join(root, file), canonicalYaml(value));
}

async function loadCampaign(projectRoot: string, supplied: string) {
  const root = path.resolve(projectRoot, supplied);
  const base = path.join(path.resolve(projectRoot), ".codex", "composite-long-task", "campaigns");
  if (root !== base && !root.startsWith(`${base}${path.sep}`)) throw new Error("Campaign path escapes the V3 campaign root");
  const { parseStrictYaml } = await import("./composite-campaign-codec.js");
  const campaign = parseStrictYaml(await readFile(path.join(root, "campaign.yaml"), "utf8")) as Campaign;
  if (campaign.schema_version !== CAMPAIGN_SCHEMA) throw new Error("Legacy campaigns are audit-only and cannot be loaded by V3");
  exactKeys(campaign, ["schema_version", "campaign_id", "request_sha256", "generation", "selected_sfc_id", "sfcs"], "campaign-v3");
  return { root, campaign };
}

function sfcDefinition(value: SfcRecord): SfcDefinition { const { current_revision: _revision, packet_sha256: _packet, handoff_workdir: _handoff, goal_id: _goal, result: _result, ...definition } = value; return definition; }
function campaignRoot(projectRoot: string, id: string) { return path.join(path.resolve(projectRoot), ".codex", "composite-long-task", "campaigns", id); }
function revisionRoot(root: string, sfcId: string, revision: number) { return path.join(root, "sfcs", sfcId, "revisions", String(revision).padStart(4, "0")); }
function currentRevision(campaign: Campaign, sfcId: string) { const value = campaign.sfcs[sfcId]?.current_revision; if (!value) throw new Error("SFC has no V3 packet revision"); return value; }
async function saveCampaign(root: string, campaign: Campaign) { await atomic(path.join(root, "campaign.yaml"), canonicalYaml(campaign)); }
async function atomic(file: string, content: string) { await mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.tmp-${process.pid}-${Date.now()}`; await writeFile(temp, content, { flag: "wx" }); await rename(temp, file); }
function validateId(value: string, label: string) { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value)) throw new Error(`${label} id is not portable`); }
function validateSfcId(value: string) { if (!/^SFC-[0-9]{3,}$/u.test(value)) throw new Error("SFC id must match SFC-###"); }
function strings(value: unknown, label: string, nonempty = false): asserts value is string[] { if (!Array.isArray(value) || (nonempty && !value.length) || value.some((item) => typeof item !== "string" || !item.trim()) || new Set(value).size !== value.length) throw new Error(`${label}_invalid`); }
function exactKeys(value: unknown, expected: string[], label: string) { if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) throw new Error(`${label}_unknown_or_missing_field`); }
function assertAcyclic(sfcs: SfcDefinition[]) { const graph = new Map(sfcs.map((sfc) => [sfc.sfc_id, sfc.depends_on])); const visiting = new Set<string>(); const visited = new Set<string>(); const visit = (id: string) => { if (visiting.has(id)) throw new Error(`scope_dependency_cycle:${id}`); if (visited.has(id)) return; visiting.add(id); for (const dependency of graph.get(id) ?? []) visit(dependency); visiting.delete(id); visited.add(id); }; for (const id of graph.keys()) visit(id); }
function assertNoRawSecret(value: string, label: string) { if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(value)) throw new Error(`${label} contains a raw credential or private key`); }
