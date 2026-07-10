import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSITE_INPUT_CONTRACT,
  COMPOSITE_INPUT_CONTRACT_VERSION
} from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import { validateCompositeAuthoringPacketV1 } from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import {
  HASH_B,
  HASH_C,
  invalidFieldValue,
  packetFields,
  packetFixture
} from "./composite-campaign-schema-fixtures.mjs";

export function registerPacketSchemaCases() {
  test("packet fields derive only from CompositeInputContract and validate PI/AC references", () => {
    const packet = packetFixture();
    assert.deepEqual(packet.input_contract, {
      schema_version: COMPOSITE_INPUT_CONTRACT_VERSION,
      contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256
    });
    const wrongContract = structuredClone(packet);
    wrongContract.input_contract.contract_sha256 = HASH_C;
    assert.throws(() => validateCompositeAuthoringPacketV1(wrongContract), /input contract.*sha256|contract.*mismatch/i);
    const unknownField = structuredClone(packet);
    unknownField.authorities.product_architecture_source.fields.future = "hidden";
    assert.throws(() => validateCompositeAuthoringPacketV1(unknownField), /unknown.*future/i);
    const wrongType = structuredClone(packet);
    wrongType.authorities.product_architecture_source.fields.full_population_required = "false";
    assert.throws(() => validateCompositeAuthoringPacketV1(wrongType), /full_population_required.*boolean/i);
    const danglingPi = structuredClone(packet);
    danglingPi.authorities.acceptance_checklist.acceptance_criteria[0].fields.related_plan_items = ["PI-999"];
    assert.throws(() => validateCompositeAuthoringPacketV1(danglingPi), /PI-999|related_plan_items/i);
    const danglingAc = structuredClone(packet);
    danglingAc.authorities.technical_realization_plan.plan_items[0].fields.related_acs = ["AC-999"];
    assert.throws(() => validateCompositeAuthoringPacketV1(danglingAc), /AC-999|related_acs/i);
  });

  test("every packet field follows contract requiredness, type, enum, and required text metadata", () => {
    for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
      for (const field of document.fields) {
        const wrongType = packetFixture();
        packetFields(wrongType, document.id)[field.name] = invalidFieldValue(field.type);
        assert.throws(
          () => validateCompositeAuthoringPacketV1(wrongType),
          new RegExp(`${field.name}.*${field.type}|${field.type}.*${field.name}`, "i"),
          `${document.id}.${field.name} type`
        );
        if (field.enum_values.length > 0) {
          const wrongEnum = packetFixture();
          packetFields(wrongEnum, document.id)[field.name] = "future_enum_value";
          assert.throws(
            () => validateCompositeAuthoringPacketV1(wrongEnum),
            new RegExp(`${field.name}.*enum|${field.name}.*allowed|invalid.*${field.name}`, "i"),
            `${document.id}.${field.name} enum`
          );
        }
        if (field.required) {
          const missing = packetFixture();
          delete packetFields(missing, document.id)[field.name];
          assert.throws(
            () => validateCompositeAuthoringPacketV1(missing),
            new RegExp(`${field.name}.*required|required.*${field.name}|missing.*${field.name}`, "i"),
            `${document.id}.${field.name} required`
          );
        }
        if (field.required && field.type === "text") {
          for (const blank of ["", "   "]) {
            const blankText = packetFixture();
            packetFields(blankText, document.id)[field.name] = blank;
            assert.throws(
              () => validateCompositeAuthoringPacketV1(blankText),
              new RegExp(`${field.name}.*required|${field.name}.*non.empty|${field.name}.*blank`, "i"),
              `${document.id}.${field.name} blank`
            );
          }
        }
      }
    }
    const optionalFieldsOmitted = packetFixture();
    for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
      for (const field of document.fields.filter((candidate) => !candidate.required)) {
        delete packetFields(optionalFieldsOmitted, document.id)[field.name];
      }
    }
    assert.deepEqual(validateCompositeAuthoringPacketV1(optionalFieldsOmitted), optionalFieldsOmitted);

    const optionalTextEmpty = packetFixture();
    for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
      for (const field of document.fields.filter((candidate) => !candidate.required && candidate.type === "text")) {
        packetFields(optionalTextEmpty, document.id)[field.name] = "";
      }
    }
    assert.deepEqual(validateCompositeAuthoringPacketV1(optionalTextEmpty), optionalTextEmpty);

    for (const mutate of [
      (packet) => { packet.authorities.technical_realization_plan.plan_items[0].title = "   "; },
      (packet) => { packet.authorities.acceptance_checklist.acceptance_criteria[0].title = "   "; }
    ]) {
      const blankTitle = packetFixture();
      mutate(blankTitle);
      assert.throws(() => validateCompositeAuthoringPacketV1(blankTitle), /title.*non.empty|title.*blank/i);
    }
  });

  test("packet structural identities, nested exact keys, contract, and Context candidates are strict", () => {
    const duplicatePi = packetFixture();
    duplicatePi.authorities.technical_realization_plan.plan_items.push(structuredClone(duplicatePi.authorities.technical_realization_plan.plan_items[0]));
    assert.throws(() => validateCompositeAuthoringPacketV1(duplicatePi), /PI-001|duplicate/i);
    const duplicateAc = packetFixture();
    duplicateAc.authorities.acceptance_checklist.acceptance_criteria.push(structuredClone(duplicateAc.authorities.acceptance_checklist.acceptance_criteria[0]));
    assert.throws(() => validateCompositeAuthoringPacketV1(duplicateAc), /AC-001|duplicate/i);
    for (const [label, mutate] of [
      ["PI", (packet) => { packet.authorities.technical_realization_plan.plan_items[0].id = "pi-001"; }],
      ["AC", (packet) => { packet.authorities.acceptance_checklist.acceptance_criteria[0].id = "AC-1"; }]
    ]) {
      const packet = packetFixture();
      mutate(packet);
      assert.throws(() => validateCompositeAuthoringPacketV1(packet), new RegExp(`${label}-###|${label}.*canonical`, "i"));
    }
    const exactKeyMutations = [
      (packet) => { packet.input_contract.extra = true; },
      (packet) => { packet.context_delta_candidate.extra = true; },
      (packet) => { packet.authorities.product_architecture_source.extra = true; },
      (packet) => { packet.authorities.technical_realization_plan.plan_items[0].extra = true; },
      (packet) => { packet.authorities.acceptance_checklist.acceptance_criteria[0].extra = true; }
    ];
    for (const mutate of exactKeyMutations) {
      const packet = packetFixture();
      mutate(packet);
      assert.throws(() => validateCompositeAuthoringPacketV1(packet), /unknown key.*extra|extra.*unknown/i);
    }
    const wrongVersion = packetFixture();
    wrongVersion.input_contract.schema_version = "composite-input-contract-v2";
    assert.throws(() => validateCompositeAuthoringPacketV1(wrongVersion), /input contract.*version|schema_version.*contract/i);
    for (const field of ["product", "technical"]) {
      const invalid = packetFixture();
      invalid.context_delta_candidate[field] = "maybe";
      assert.throws(() => validateCompositeAuthoringPacketV1(invalid), new RegExp(`${field}.*none|required|context.*${field}`, "i"));
    }
    const badNotes = packetFixture();
    badNotes.context_delta_candidate.notes = "not-an-array";
    assert.throws(() => validateCompositeAuthoringPacketV1(badNotes), /notes.*array/i);
  });

  test("packet Product mapping and immutable revision identity are strict", () => {
    assert.deepEqual(validateCompositeAuthoringPacketV1(packetFixture()), packetFixture());
    assert.deepEqual(validateCompositeAuthoringPacketV1(packetFixture({ fitted: true })), packetFixture({ fitted: true }));
    const blocked = packetFixture();
    blocked.authorities.product_architecture_source.fields.scope_fit_decision = "blocked_for_decision";
    assert.throws(() => validateCompositeAuthoringPacketV1(blocked), /cannot create.*packet|blocked_for_decision/i);
    const mismatchedSplit = packetFixture();
    mismatchedSplit.authorities.product_architecture_source.fields.selected_scope_fit_slice = "none";
    assert.throws(() => validateCompositeAuthoringPacketV1(mismatchedSplit), /selected_scope_fit_slice|selected_from_split/i);
    const mismatchedFit = packetFixture({ fitted: true });
    mismatchedFit.authorities.product_architecture_source.fields.selected_scope_fit_slice = "SFC-001";
    assert.throws(() => validateCompositeAuthoringPacketV1(mismatchedFit), /selected_scope_fit_slice|fit_for_three_inputs/i);
    const badPrevious = packetFixture();
    badPrevious.revision = 2;
    badPrevious.previous_packet_sha256 = null;
    assert.throws(() => validateCompositeAuthoringPacketV1(badPrevious), /previous_packet_sha256/i);
    const firstWithPrevious = packetFixture();
    firstWithPrevious.previous_packet_sha256 = HASH_B;
    assert.throws(() => validateCompositeAuthoringPacketV1(firstWithPrevious), /revision 1|previous_packet_sha256/i);
    const siblingSplit = packetFixture();
    siblingSplit.authorities.product_architecture_source.fields.selected_scope_fit_slice = "SFC-002";
    assert.throws(() => validateCompositeAuthoringPacketV1(siblingSplit), /selected_scope_fit_slice|packet.*slice_id|SFC-001/i);
    const invalidDate = packetFixture();
    invalidDate.created_at = "2026-02-30T01:02:03.000Z";
    assert.throws(() => validateCompositeAuthoringPacketV1(invalidDate), /created_at|timestamp|ISO/i);
  });
}
