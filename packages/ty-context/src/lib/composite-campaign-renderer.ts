import { COMPOSITE_INPUT_CONTRACT, compositeInputDocument, type CompositeInputDocumentDescriptor } from "./composite-input-contract.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { validateCompositeAuthoringPacketV1 } from "./composite-campaign-schema.js";
import { sourceHashesSha256 } from "./composite-campaign-schema-binding.js";
import {
  assertCompositeCampaignPacketSafe,
  assertCompositeCampaignTrackedFileSize
} from "./composite-campaign-security.js";
import type {
  CompositeAuthoringFieldsV1,
  CompositeAuthoringPacketV1,
  CompositeCampaignSourceHashesV1
} from "./composite-campaign-types.js";

export const COMPOSITE_CAMPAIGN_RENDERED_BUNDLE_VERSION = "composite-campaign-rendered-bundle-v1" as const;

export interface CompositeCampaignRenderedDocumentV1 {
  file: string;
  content: string;
  sha256: string;
}

export interface CompositeCampaignRenderedBundleV1 {
  schema_version: typeof COMPOSITE_CAMPAIGN_RENDERED_BUNDLE_VERSION;
  contract_sha256: string;
  packet_sha256: string;
  documents: {
    product_architecture_source: CompositeCampaignRenderedDocumentV1;
    technical_realization_plan: CompositeCampaignRenderedDocumentV1;
    acceptance_checklist: CompositeCampaignRenderedDocumentV1;
  };
  source_hashes: CompositeCampaignSourceHashesV1;
  bundle_sha256: string;
}

export function renderCompositeCampaignPacket(value: unknown): CompositeCampaignRenderedBundleV1 {
  assertCompositeCampaignPacketSafe(value);
  const validated = validateCompositeAuthoringPacketV1(value);
  const packetContent = canonicalJson(validated);
  assertCompositeCampaignTrackedFileSize(packetContent);
  const packet = normalizeProjectionPacket(validated);
  const product = document(
    compositeInputDocument("product_architecture_source"),
    renderProduct(packet.authorities.product_architecture_source.fields)
  );
  const plan = document(
    compositeInputDocument("technical_realization_plan"),
    renderPlan(packet)
  );
  const acceptance = document(
    compositeInputDocument("acceptance_checklist"),
    renderAcceptance(packet)
  );
  const sourceHashes: CompositeCampaignSourceHashesV1 = {
    product_architecture_source: product.sha256,
    technical_realization_plan: plan.sha256,
    acceptance_checklist: acceptance.sha256
  };
  return {
    schema_version: COMPOSITE_CAMPAIGN_RENDERED_BUNDLE_VERSION,
    contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
    packet_sha256: sha256Hex(packetContent),
    documents: {
      product_architecture_source: product,
      technical_realization_plan: plan,
      acceptance_checklist: acceptance
    },
    source_hashes: sourceHashes,
    bundle_sha256: sourceHashesSha256(sourceHashes)
  };
}

function normalizeProjectionPacket(packet: CompositeAuthoringPacketV1): CompositeAuthoringPacketV1 {
  const global = unique([
    ...arrayField(packet.authorities.product_architecture_source.fields, "representative_samples_do_not_validate"),
    ...arrayField(packet.authorities.product_architecture_source.fields, "non_completing_outcomes")
  ]);
  const plans = packet.authorities.technical_realization_plan.plan_items.map((item) => ({
    ...item,
    fields: {
      ...item.fields,
      invalid_implementation_shortcuts: unique([...arrayField(item.fields, "invalid_implementation_shortcuts"), ...global]),
      non_completing_shortcuts: unique([...arrayField(item.fields, "non_completing_shortcuts"), ...global])
    }
  }));
  const criteria = packet.authorities.acceptance_checklist.acceptance_criteria.map((criterion) => ({
    ...criterion,
    fields: {
      ...criterion.fields,
      ac_does_not_validate: unique([...arrayField(criterion.fields, "ac_does_not_validate"), ...global]),
      invalid_completion_signals: unique([...arrayField(criterion.fields, "invalid_completion_signals"), ...global])
    }
  }));
  materializeLinks(plans, criteria);
  return {
    ...packet,
    authorities: {
      product_architecture_source: packet.authorities.product_architecture_source,
      technical_realization_plan: { plan_items: plans },
      acceptance_checklist: { acceptance_criteria: criteria }
    }
  };
}

function materializeLinks(
  plans: CompositeAuthoringPacketV1["authorities"]["technical_realization_plan"]["plan_items"],
  criteria: CompositeAuthoringPacketV1["authorities"]["acceptance_checklist"]["acceptance_criteria"]
): void {
  const byPlan = new Map(plans.map((item) => [item.id, new Set<string>()]));
  const byAcceptance = new Map(criteria.map((criterion) => [criterion.id, new Set<string>()]));
  let edges = 0;
  const edge = (pi: string, ac: string) => {
    if (!byPlan.get(pi)!.has(ac)) edges += 1;
    byPlan.get(pi)!.add(ac);
    byAcceptance.get(ac)!.add(pi);
  };
  for (const item of plans) for (const ac of arrayField(item.fields, "related_acs")) edge(item.id, ac);
  for (const criterion of criteria) for (const pi of arrayField(criterion.fields, "related_plan_items")) edge(pi, criterion.id);
  if (edges === 0) for (const item of plans) for (const criterion of criteria) edge(item.id, criterion.id);
  for (const item of plans) {
    if (byPlan.get(item.id)!.size === 0) {
      for (const criterion of criteria) edge(item.id, criterion.id);
    }
  }
  for (const criterion of criteria) {
    if (byAcceptance.get(criterion.id)!.size === 0) {
      for (const item of plans) edge(item.id, criterion.id);
    }
  }
  for (const item of plans) {
    item.fields.related_acs = criteria.filter((criterion) => byPlan.get(item.id)!.has(criterion.id)).map((criterion) => criterion.id);
  }
  for (const criterion of criteria) {
    criterion.fields.related_plan_items = plans.filter((item) => byAcceptance.get(criterion.id)!.has(item.id)).map((item) => item.id);
  }
}

function renderProduct(fields: CompositeAuthoringFieldsV1): string {
  return lines(["# Product / Architecture Source", "", ...renderFields(fields, compositeInputDocument("product_architecture_source"))]);
}

function renderPlan(packet: CompositeAuthoringPacketV1): string {
  const body = ["# Technical Realization Plan"];
  for (const item of packet.authorities.technical_realization_plan.plan_items) {
    body.push("", `## ${canonicalHeading(item.id, "plan item id")}: ${canonicalHeading(item.title, `${item.id} title`)}`, "");
    body.push(...renderFields(item.fields, compositeInputDocument("technical_realization_plan")));
  }
  return lines(body);
}

function renderAcceptance(packet: CompositeAuthoringPacketV1): string {
  const body = ["# Acceptance Checklist"];
  for (const criterion of packet.authorities.acceptance_checklist.acceptance_criteria) {
    body.push("", `## ${canonicalHeading(criterion.id, "acceptance criterion id")}: ${canonicalHeading(criterion.title, `${criterion.id} title`)}`, "");
    body.push(...renderFields(criterion.fields, compositeInputDocument("acceptance_checklist")));
  }
  return lines(body);
}

function renderFields(fields: CompositeAuthoringFieldsV1, descriptor: CompositeInputDocumentDescriptor): string[] {
  const result: string[] = [];
  for (const field of descriptor.fields) {
    if (!Object.hasOwn(fields, field.name)) continue;
    const value = fields[field.name];
    if (field.type === "array") {
      result.push(`${field.name}:`);
      for (const entry of value as string[]) result.push(`  - ${canonicalArrayEntry(entry, field.name)}`);
    } else if (field.type === "boolean") {
      result.push(`${field.name}: ${String(value)}`);
    } else if (field.type === "enum") {
      result.push(`${field.name}: ${canonicalScalar(value as string, field.name)}`);
    } else if (value === "") {
      result.push(`${field.name}:`);
    } else {
      const text = canonicalText(value as string, field.name);
      result.push(`${field.name}: |`, ...text.split("\n").map((entry) => `  ${entry}`));
    }
  }
  return result;
}

function canonicalText(value: string, label: string): string {
  if (value.includes("\r")) throw new Error(`${label} contains a carriage return and is not canonical Markdown text`);
  if (value !== value.trim()) throw new Error(`${label} has leading or trailing whitespace and cannot round-trip canonically`);
  if (/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label} contains a control character and cannot round-trip canonically`);
  }
  return value;
}

function canonicalArrayEntry(value: string, label: string): string {
  const scalar = canonicalScalar(value, label);
  if (scalar.includes(",") || scalar.includes(";") || scalar.includes("\n")) {
    throw new Error(`${label} array values cannot contain commas, semicolons, or newlines in canonical Markdown`);
  }
  return scalar;
}

function canonicalHeading(value: string, label: string): string {
  const scalar = canonicalScalar(value, label);
  if (scalar.includes("\n")) throw new Error(`${label} must be one canonical heading line`);
  return scalar;
}

function canonicalScalar(value: string, label: string): string {
  canonicalText(value, label);
  if (value.replace(/^[-#*\s]+/u, "").trim() !== value) {
    throw new Error(`${label} begins with Markdown marker text and cannot round-trip canonically`);
  }
  return value;
}

function document(
  descriptor: CompositeInputDocumentDescriptor,
  content: string
): CompositeCampaignRenderedDocumentV1 {
  assertCompositeCampaignTrackedFileSize(content);
  return { file: descriptor.file, content, sha256: sha256Hex(content) };
}

function arrayField(fields: CompositeAuthoringFieldsV1, name: string): string[] {
  const value = fields[name];
  return Array.isArray(value) ? value : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function lines(value: string[]): string {
  while (value.at(-1) === "") value.pop();
  return `${value.join("\n")}\n`;
}
