import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

test("parses one canonical Delivery Contract without cross-entity ids", () => {
  const parsed = parseDeliveryContractText(YAML.stringify(deliveryContract({ twoOutcomes: true })));
  assert.deepEqual(parsed.outcomes.map((outcome) => outcome.key), ["first", "second"]);
  assert.equal(JSON.stringify(parsed).includes("requirement_id"), false);
  assert.equal(JSON.stringify(parsed).includes("obligation_id"), false);
  assert.equal(JSON.stringify(parsed).includes("ac_id"), false);
});

test("rejects duplicate Outcome keys while allowing Outcome-local Check keys", () => {
  const duplicateOutcome = deliveryContract({ twoOutcomes: true });
  duplicateOutcome.outcomes[1].key = "first";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(duplicateOutcome)),
    /outcome_key_duplicate/,
  );
  const duplicateCheck = deliveryContract({ twoOutcomes: true });
  duplicateCheck.outcomes[1].acceptance.checks[0].key = "first-check";
  assert.doesNotThrow(() =>
    parseDeliveryContractText(YAML.stringify(duplicateCheck)),
  );
  duplicateCheck.outcomes[1].acceptance.checks.push({
    ...structuredClone(duplicateCheck.outcomes[1].acceptance.checks[0]),
  });
  assert.throws(() => parseDeliveryContractText(YAML.stringify(duplicateCheck)), /check_key_duplicate/);
});

test("rejects unsupported runners, unknown keys and YAML aliases", () => {
  const unsupported = deliveryContract();
  unsupported.outcomes[0].acceptance.checks[0].runner.type = "shell";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(unsupported)),
    /runner.type:must be one of/,
  );
  const unknown = YAML.stringify(deliveryContract()).replace(
    "schema_version: long-task-delivery-v1",
    "schema_version: long-task-delivery-v1\nunknown: true",
  );
  assert.throws(() => parseDeliveryContractText(unknown), /unknown keys/);
  assert.throws(
    () => parseDeliveryContractText("schema_version: &x long-task-delivery-v1\ntask: *x\n"),
    /aliases|anchors/,
  );
});

test("rejects missing executable proof and cyclic dependencies", () => {
  const noCheck = deliveryContract();
  noCheck.outcomes[0].acceptance.checks = [];
  const parsed = parseDeliveryContractText(YAML.stringify(noCheck));
  assert.equal(parsed.outcomes[0].acceptance.checks.length, 0);
  const cyclic = deliveryContract({ twoOutcomes: true });
  cyclic.outcomes[0].depends_on = ["second"];
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(cyclic)),
    /outcome_dependency_cycle/,
  );
});
