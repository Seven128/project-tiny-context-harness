import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import {
  COMPOSITE_CAMPAIGN_RENDERED_BUNDLE_VERSION,
  renderCompositeCampaignPacket
} from "../../packages/ty-context/dist/lib/composite-campaign-renderer.js";
import {
  COMPOSITE_CAMPAIGN_PREFLIGHT_REPORT_VERSION,
  preflightCompositeCampaignPacket
} from "../../packages/ty-context/dist/lib/composite-campaign-preflight.js";
import { preflightCompositeSourceBundle } from "../../packages/ty-context/dist/lib/composite-source-preflight.js";
import { packetFixture } from "./composite-campaign-schema-fixtures.mjs";

test("packet renderer emits deterministic canonical bytes and descriptor-order fields", () => {
  const packet = renderablePacket();
  const first = renderCompositeCampaignPacket(packet);
  const second = renderCompositeCampaignPacket(structuredClone(packet));

  assert.deepEqual(first, second);
  assert.equal(first.schema_version, COMPOSITE_CAMPAIGN_RENDERED_BUNDLE_VERSION);
  assert.equal(first.packet_sha256, sha256Hex(canonicalJson(packet)));
  assert.deepEqual(Object.keys(first.documents), [
    "product_architecture_source",
    "technical_realization_plan",
    "acceptance_checklist"
  ]);
  for (const document of Object.values(first.documents)) {
    assert.equal(document.content.includes("\r"), false);
    assert.match(document.content, /[^\n]\n$/);
    assert.equal(document.content.endsWith("\n\n"), false);
    assert.equal(document.sha256, sha256Hex(document.content));
  }
  assert.equal(first.bundle_sha256, sha256Hex(canonicalJson(first.source_hashes)));
  assert.deepEqual({ packet: first.packet_sha256, ...first.source_hashes, bundle: first.bundle_sha256 }, {
    packet: "1a6877aa6c4ef0b70243d3bb363d95846044dfa65265c4d79b733f92c4235206",
    product_architecture_source: "ae3ce567faf602ab9e2cdc09121b8cf2a577d5aeebca33d72ea9147c4adc3e2d",
    technical_realization_plan: "fe1d9df3b66260c713f870f543dce50efec760b5ecf952f8fa8ae70f58548b86",
    acceptance_checklist: "c17c8dd3662a5503f2ac1a32c819c3efdb8cf4135c0541ba8aaa5e27916c5476",
    bundle: "3e120d7114e0e5bc7916578612a6e92a8884aa9c69dbbb67f59a5201c4f7dd70"
  });

  const product = first.documents.product_architecture_source.content;
  assert.ok(product.indexOf("delivery_scope:") < product.indexOf("full_population_required:"));
  assert.ok(product.indexOf("source_authority:") < product.indexOf("product_goal:"));
  const plan = first.documents.technical_realization_plan.content;
  assert.ok(plan.indexOf("delivery_scope:") < plan.indexOf("capability_target:"));
  assert.ok(plan.indexOf("implementation_paths:") < plan.indexOf("related_acs:"));
  const acceptance = first.documents.acceptance_checklist.content;
  assert.ok(acceptance.indexOf("acceptance_scope:") < acceptance.indexOf("ac_validates:"));
  assert.ok(acceptance.indexOf("related_plan_items:") < acceptance.indexOf("required_proof_layers:"));
});

test("renderer propagates global non-completion conditions verbatim and materializes reciprocal PI/AC links", () => {
  const packet = renderablePacket();
  packet.authorities.product_architecture_source.fields.representative_samples_do_not_validate = ["sample evidence is not full-population proof"];
  packet.authorities.product_architecture_source.fields.non_completing_outcomes = ["validator-only success"];
  const secondPlan = structuredClone(packet.authorities.technical_realization_plan.plan_items[0]);
  secondPlan.id = "PI-002";
  secondPlan.title = "Publish projection";
  secondPlan.fields.related_acs = [];
  packet.authorities.technical_realization_plan.plan_items.push(secondPlan);
  const secondAc = structuredClone(packet.authorities.acceptance_checklist.acceptance_criteria[0]);
  secondAc.id = "AC-002";
  secondAc.title = "Projection is atomic";
  secondAc.fields.related_plan_items = [];
  packet.authorities.acceptance_checklist.acceptance_criteria.push(secondAc);
  packet.authorities.technical_realization_plan.plan_items[0].fields.related_acs = [];
  packet.authorities.acceptance_checklist.acceptance_criteria[0].fields.related_plan_items = [];

  const rendered = renderCompositeCampaignPacket(packet);
  const plan = rendered.documents.technical_realization_plan.content;
  const acceptance = rendered.documents.acceptance_checklist.content;
  for (const condition of ["sample evidence is not full-population proof", "validator-only success"]) {
    assert.equal((plan.match(new RegExp(condition, "g")) ?? []).length, 4);
    assert.equal((acceptance.match(new RegExp(condition, "g")) ?? []).length, 4);
  }
  for (const id of ["AC-001", "AC-002"]) {
    assert.equal((plan.match(new RegExp(`  - ${id}\\n`, "g")) ?? []).length, 2);
  }
  for (const id of ["PI-001", "PI-002"]) {
    assert.equal((acceptance.match(new RegExp(`  - ${id}\\n`, "g")) ?? []).length, 2);
  }
});

test("strict packet preflight compiles the rendered bundle and remains compatible with direct complete-bundle preflight", () => {
  const report = preflightCompositeCampaignPacket(renderablePacket());
  assert.equal(report.schema_version, COMPOSITE_CAMPAIGN_PREFLIGHT_REPORT_VERSION);
  assert.equal(report.ok, true);
  assert.equal(report.diagnostics.length, 0);
  assert.ok(report.rendered_bundle);
  assert.ok(report.compiled_bundle);

  const direct = preflightCompositeSourceBundle(Object.fromEntries(
    Object.entries(report.rendered_bundle.documents).map(([id, document]) => [id, {
      path: document.file,
      content: document.content
    }])
  ));
  assert.equal(direct.ok, true);
  assert.deepEqual(report.compiled_bundle, direct.compiled_bundle);
});

test("strict packet preflight returns structured authoring and semantic diagnostics instead of leaking raw errors", () => {
  const invalidPacket = renderablePacket();
  invalidPacket.authorities.technical_realization_plan.plan_items[0].fields.implementation_paths = [];
  const semantic = preflightCompositeCampaignPacket(invalidPacket);
  assert.equal(semantic.ok, false);
  assert.equal(semantic.diagnostics[0].file, "technical-realization-plan.md");
  assert.equal(semantic.diagnostics[0].field, "implementation_paths");
  assert.equal(semantic.rendered_bundle, undefined);
  assert.equal(semantic.compiled_bundle, undefined);

  const malformed = renderablePacket();
  delete malformed.authorities.product_architecture_source.fields.product_goal;
  const authoring = preflightCompositeCampaignPacket(malformed);
  assert.equal(authoring.ok, false);
  assert.equal(authoring.diagnostics[0].category, "blocking_unparseable_object");
  assert.equal(authoring.diagnostics[0].file, "authoring-packet.json");
  assert.match(authoring.error_message, /product_goal/i);
});

test("renderer rejects values whose canonical Markdown representation would change meaning", () => {
  const comma = renderablePacket();
  comma.authorities.technical_realization_plan.plan_items[0].fields.implementation_paths = ["src/a.ts,src/b.ts"];
  assert.throws(() => renderCompositeCampaignPacket(comma), /implementation_paths|round-trip|comma|canonical/i);

  const heading = renderablePacket();
  heading.authorities.technical_realization_plan.plan_items[0].title = "Unsafe\nheading";
  assert.throws(() => renderCompositeCampaignPacket(heading), /title|heading|canonical/i);

  const carriageReturn = renderablePacket();
  carriageReturn.authorities.product_architecture_source.fields.product_goal = "line one\rline two";
  assert.throws(() => renderCompositeCampaignPacket(carriageReturn), /product_goal|carriage|canonical/i);
});

function renderablePacket() {
  const packet = packetFixture();
  const product = packet.authorities.product_architecture_source.fields;
  product.representative_samples_do_not_validate = ["manual prose is not machine proof"];
  product.non_completing_outcomes = ["validation without assertion evidence"];
  const plan = packet.authorities.technical_realization_plan.plan_items[0].fields;
  plan.implementation_paths = ["packages/ty-context/src/lib/composite-campaign-renderer.ts"];
  plan.related_acs = ["AC-001"];
  plan.invalid_implementation_shortcuts = ["write projections before all documents validate"];
  const acceptance = packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
  acceptance.ac_validates = ["three canonical sources compile as one bundle"];
  acceptance.ac_does_not_validate = ["manual prose is not machine proof"];
  acceptance.related_plan_items = ["PI-001"];
  acceptance.required_proof_layers = ["code"];
  acceptance.positive_assertions = ["all three source hashes match rendered bytes"];
  acceptance.negative_assertions = ["one-file partial publication is rejected"];
  acceptance.invalid_completion_signals = ["validation without assertion evidence"];
  return packet;
}
