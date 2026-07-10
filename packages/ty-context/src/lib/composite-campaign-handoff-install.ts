import { lstat, open, readdir, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import path from "node:path";
import { canonicalJson, parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { validateCompositeCampaignBindingV1 } from "./composite-campaign-schema.js";
import type { CompositeCampaignBindingV1 } from "./composite-campaign-types.js";
import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export const COMPOSITE_CAMPAIGN_HANDOFF_INSTALL_MARKER = ".composite-campaign-handoff.json";
const OWNED_FILES = [
  "acceptance-checklist.md", "events.ndjson", "execution-binding.md", "goal-objective.txt",
  "product-architecture-source.md", "task-state.json", "task-state.schema.json",
  "technical-realization-plan.md", "workflow-protocol.md"
] as const;

interface HandoffInstallMarker {
  schema_version: "composite-campaign-handoff-install-v1";
  binding: CompositeCampaignBindingV1;
  files: Record<string, { sha256: string; bytes: number }>;
}

export async function writeCompositeCampaignHandoffInstallMarker(
  workdir: string,
  binding: CompositeCampaignBindingV1
): Promise<void> {
  const snapshot = await fileSnapshot(workdir);
  assertPristineState(snapshot.contents["task-state.json"], binding);
  const marker: HandoffInstallMarker = {
    schema_version: "composite-campaign-handoff-install-v1",
    binding: validateCompositeCampaignBindingV1(binding),
    files: snapshot.claims
  };
  await writeFile(path.join(workdir, COMPOSITE_CAMPAIGN_HANDOFF_INSTALL_MARKER), canonicalJson(marker), { flag: "wx" });
  await assertOwnedCompositeCampaignHandoffInstall(workdir, binding);
}

export async function assertOwnedCompositeCampaignHandoffInstall(
  workdir: string,
  binding: CompositeCampaignBindingV1
): Promise<void> {
  const marker = await readMarker(workdir);
  if (canonicalJson(marker.binding) !== canonicalJson(validateCompositeCampaignBindingV1(binding))) {
    throw new Error("Composite campaign handoff install marker binding differs from the frozen binding");
  }
  await assertExactShape(workdir);
  const current = await fileSnapshot(workdir);
  if (canonicalJson(current.claims) !== canonicalJson(marker.files)) {
    throw new Error("Composite campaign handoff install files differ from their owned hashes");
  }
  assertPristineState(current.contents["task-state.json"], binding);
}

export async function isOwnedCompositeCampaignHandoffInstall(
  workdir: string,
  expectedBindingId: string
): Promise<boolean> {
  try {
    const marker = await readMarker(workdir);
    return marker.binding.binding_id === expectedBindingId && marker.binding.result === null;
  } catch {
    return false;
  }
}

export async function readOwnedCompositeCampaignHandoffBinding(
  workdir: string,
  expectedBindingId: string
): Promise<CompositeCampaignBindingV1> {
  const marker = await readMarker(workdir);
  if (marker.binding.binding_id !== expectedBindingId || marker.binding.result !== null) {
    throw new Error("Composite campaign handoff install marker does not own the expected binding");
  }
  await assertOwnedCompositeCampaignHandoffInstall(workdir, marker.binding);
  return marker.binding;
}

export async function readCompositeCampaignHandoffInstallOwner(
  workdir: string,
  expectedBindingId: string
): Promise<CompositeCampaignBindingV1> {
  const marker = await readMarker(workdir);
  if (marker.binding.binding_id !== expectedBindingId || marker.binding.result !== null) {
    throw new Error("Composite campaign handoff install marker does not own the expected binding");
  }
  return marker.binding;
}

async function readMarker(workdir: string): Promise<HandoffInstallMarker> {
  const raw = (await readBoundRegularFile(
    path.join(workdir, COMPOSITE_CAMPAIGN_HANDOFF_INSTALL_MARKER), 1024 * 1024
  )).toString("utf8");
  const value = parseStrictJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Composite campaign handoff install marker must be an object");
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== 3 || object.schema_version !== "composite-campaign-handoff-install-v1" ||
    !Object.hasOwn(object, "binding") || !Object.hasOwn(object, "files")) {
    throw new Error("Composite campaign handoff install marker shape or version is invalid");
  }
  const binding = validateCompositeCampaignBindingV1(object.binding);
  const files = object.files;
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("Composite campaign handoff install marker files are invalid");
  const claims = files as Record<string, { sha256: string; bytes: number }>;
  if (canonicalJson(Object.keys(claims).sort()) !== canonicalJson([...OWNED_FILES])) {
    throw new Error("Composite campaign handoff install marker file set is invalid");
  }
  for (const [file, claim] of Object.entries(claims)) {
    if (!claim || typeof claim !== "object" || Object.keys(claim).length !== 2 ||
      !/^[a-f0-9]{64}$/.test(claim.sha256) || !Number.isSafeInteger(claim.bytes) || claim.bytes < 0) {
      throw new Error(`Composite campaign handoff install marker claim is invalid: ${file}`);
    }
  }
  const marker = { schema_version: "composite-campaign-handoff-install-v1" as const, binding, files: claims };
  if (canonicalJson(marker) !== raw) throw new Error("Composite campaign handoff install marker is not canonical JSON");
  return marker;
}

async function fileSnapshot(workdir: string): Promise<{
  claims: HandoffInstallMarker["files"];
  contents: Record<string, Buffer>;
}> {
  const entries = await Promise.all(OWNED_FILES.map(async (file) => {
    const target = path.join(workdir, file);
    const raw = await readBoundRegularFile(target, 4 * 1024 * 1024);
    return { file, raw, claim: { sha256: sha256Hex(raw), bytes: raw.byteLength } };
  }));
  return {
    claims: Object.fromEntries(entries.map(({ file, claim }) => [file, claim])),
    contents: Object.fromEntries(entries.map(({ file, raw }) => [file, raw]))
  };
}

async function readBoundRegularFile(target: string, maximumBytes: number): Promise<Buffer> {
  const handle = await open(target, "r");
  try {
    const before = await handle.stat();
    await assertBoundLeaf(target, before);
    if (before.size > maximumBytes) throw new Error(`Composite campaign handoff file exceeds ${maximumBytes} bytes`);
    const raw = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < raw.length) {
      const read = await handle.read(raw, offset, raw.length - offset, offset);
      if (read.bytesRead === 0) throw new Error("Composite campaign handoff file changed while being read");
      offset += read.bytesRead;
    }
    const after = await handle.stat();
    if (!sameFile(before, after) || before.size !== after.size) throw new Error("Composite campaign handoff file changed while being read");
    await assertBoundLeaf(target, after);
    return raw;
  } finally {
    await handle.close();
  }
}

async function assertBoundLeaf(target: string, handleStats: Stats): Promise<void> {
  const leaf = await lstat(target);
  if (!handleStats.isFile() || !leaf.isFile() || leaf.isSymbolicLink() || !sameFile(handleStats, leaf)) {
    throw new Error("Composite campaign handoff file is not one bound regular file");
  }
}

function sameFile(left: Stats, right: Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

async function assertExactShape(workdir: string): Promise<void> {
  const entries = await readdir(workdir, { withFileTypes: true });
  const expected = [...OWNED_FILES, COMPOSITE_CAMPAIGN_HANDOFF_INSTALL_MARKER, "derived"].sort();
  if (canonicalJson(entries.map((entry) => entry.name).sort()) !== canonicalJson(expected)) {
    throw new Error("Composite campaign handoff workdir contains unknown or missing install entries");
  }
  const derived = entries.find((entry) => entry.name === "derived");
  if (!derived?.isDirectory() || derived.isSymbolicLink() || (await readdir(path.join(workdir, "derived"))).length !== 0) {
    throw new Error("Composite campaign handoff derived directory must be an empty regular directory");
  }
}

function assertPristineState(raw: Buffer, binding: CompositeCampaignBindingV1): void {
  const state = JSON.parse(raw.toString("utf8")) as SuperpowersTaskState;
  if (state.meta.task_id !== binding.task.task_id || state.current_attempt_id !== binding.task.task_attempt_id ||
    state.meta.product_goal_complete || state.final.product_goal_complete || state.final.completion_output_status === "accept") {
    throw new Error("Composite campaign handoff state is not the pristine bound task identity");
  }
  for (const [name, values] of [
    ["evidence", state.evidence], ["command_runs", state.command_runs],
    ["negative_evidence_records", state.negative_evidence_records], ["slices", state.slices],
    ["blockers", state.blockers]
  ] as const) {
    if (!Array.isArray(values) || values.length !== 0) throw new Error(`Composite campaign handoff state revives non-pristine ${name}`);
  }
  if (Object.keys(state.gates ?? {}).length !== 0) throw new Error("Composite campaign handoff state revives gate results");
}
