import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalYaml,
  parseStrictJson,
  sha256Hex,
} from "../composite-campaign-codec.js";
import {
  COMPOSITE_AUTHORING_PACKET_SCHEMA as PACKET_SCHEMA,
  type CompositeAuthoringPacketV3,
} from "../composite-authoring-packet-v3.js";
import type { CampaignV6 } from "../composite-campaign-schema-v6.js";
import { LONG_TASK_SOURCE_FILES } from "../long-task-contract-schema.js";
import { resolveInside } from "../long-task-path-policy.js";
import {
  parseScopeFitResultV4,
  type ScopeFitResultV4,
} from "../scope-fit-v4.js";
import type { CampaignContextBaseline } from "../context-graph-snapshot.js";

const MAX_PACKET_FILE_BYTES = 1024 * 1024;

export async function readPacketInputV6(
  projectRoot: string,
  packetFile: string,
): Promise<CompositeAuthoringPacketV3> {
  const raw = (await readSafeFileV6(projectRoot, packetFile, "packet-input"))
    .text;
  assertNoRawSecret(raw, "packet");
  return parseStrictJson(raw) as CompositeAuthoringPacketV3;
}

export async function readSafeFileV6(
  projectRoot: string,
  supplied: string,
  label: string,
): Promise<{ path: string; text: string }> {
  const project = await realpath(path.resolve(projectRoot));
  const actual = await realpath(resolveInside(project, supplied, label));
  if (!inside(project, actual))
    throw new Error(`${label}_escapes_repository_through_symlink`);
  return { path: actual, text: await readBounded(actual, label) };
}

export function revisionRootV6(
  root: string,
  sliceId: string,
  revision: number,
): string {
  return path.join(
    root,
    "slices",
    sliceId,
    "revisions",
    String(revision).padStart(4, "0"),
  );
}

export function currentPacketRevisionPathV6(
  root: string,
  campaign: Pick<CampaignV6, "slices">,
  sliceId: string,
): string {
  const revision = campaign.slices[sliceId]?.packet_revision;
  if (!revision)
    throw new Error(`campaign_slice_packet_revision_missing:${sliceId}`);
  return revisionRootV6(root, sliceId, revision);
}

export async function optionalScopeV6(
  root: string,
): Promise<ScopeFitResultV4 | null> {
  try {
    return parseCurrentScopeV6(
      await readFile(path.join(root, "scope-fit.json"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function optionalPacketContextBaselineV6(
  root: string,
): Promise<CampaignContextBaseline | null> {
  try {
    return parseStrictJson(
      await readFile(path.join(root, "context-baseline.json"), "utf8"),
    ) as unknown as CampaignContextBaseline;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readPacketRevisionV6(
  revisionPath: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<CompositeAuthoringPacketV3> {
  const packet = parseStrictJson(
    await readBounded(
      path.join(revisionPath, "authoring-packet.json"),
      "authoring-packet.json",
    ),
  ) as CompositeAuthoringPacketV3;
  validatePacketV6(packet, campaign, sliceId);
  if (
    sha256Hex(canonicalJson(packet)) !== campaign.slices[sliceId].packet_sha256
  )
    throw new Error("immutable_packet_revision_hash_mismatch");
  return packet;
}

export function validatePacketV6(
  packet: CompositeAuthoringPacketV3,
  campaign: CampaignV6,
  sliceId: string,
): void {
  if (packet.schema_version !== PACKET_SCHEMA)
    throw new Error(`packet_schema_required:${PACKET_SCHEMA}`);
  if (
    packet.campaign_id !== campaign.campaign_id ||
    packet.slice_id !== sliceId
  )
    throw new Error("packet_campaign_slice_identity_mismatch");
  if (!Number.isInteger(packet.revision) || packet.revision < 1)
    throw new Error("packet_revision_must_be_positive_integer");
  if (
    packet.authorities?.product_architecture_source?.schema_version !==
      "product-source-v3" ||
    packet.authorities?.technical_realization_plan?.schema_version !==
      "technical-plan-v3" ||
    packet.authorities?.acceptance_checklist?.schema_version !==
      "acceptance-checklist-v3"
  )
    throw new Error("packet_authorities_require_three_v3_schemas");
}

export async function assertPacketProjectionsV6(
  root: string,
  packet: CompositeAuthoringPacketV3,
): Promise<void> {
  for (const [file, content] of packetAuthorityFilesV6(packet)) {
    const current = await readFile(path.join(root, file), "utf8");
    if (current !== content)
      throw new Error(`packet_projection_changed:${file}`);
  }
}

export function packetAuthorityFilesV6(
  packet: CompositeAuthoringPacketV3,
): Array<[string, string]> {
  const values = {
    [LONG_TASK_SOURCE_FILES.product]:
      packet.authorities.product_architecture_source,
    [LONG_TASK_SOURCE_FILES.plan]:
      packet.authorities.technical_realization_plan,
    [LONG_TASK_SOURCE_FILES.checklist]: packet.authorities.acceptance_checklist,
  };
  return Object.entries(values).map(([file, value]) => [
    file,
    canonicalYaml(value),
  ]);
}

export function relativeCampaignPathV6(root: string, target: string): string {
  return path.relative(root, target).replace(/\\/gu, "/");
}

export function parseCurrentScopeV6(content: string): ScopeFitResultV4 {
  if (schemaOf(parseStrictJson(content)) !== "scope-fit-result-v4")
    throw new Error("campaign_v6_requires_scope_fit_result_v4");
  return parseScopeFitResultV4(content);
}

export function validatePortableIdV6(value: string, label: string): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) ||
    /[. ]$/u.test(value) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(value)
  )
    throw new Error(`${label}_id_not_portable`);
}

async function readBounded(file: string, label: string): Promise<string> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_PACKET_FILE_BYTES)
    throw new Error(
      `${label}_must_be_regular_file_no_larger_than_${MAX_PACKET_FILE_BYTES}`,
    );
  return readFile(file, "utf8");
}

function assertNoRawSecret(value: string, label: string): void {
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/iu.test(
      value,
    )
  )
    throw new Error(`${label}_contains_raw_credential_or_private_key`);
}

function schemaOf(value: unknown): string | undefined {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).schema_version === "string"
    ? (value as Record<string, string>).schema_version
    : undefined;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
