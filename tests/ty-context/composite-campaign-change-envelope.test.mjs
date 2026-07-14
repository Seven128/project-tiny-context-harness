import assert from "node:assert/strict";
import test from "node:test";
import {
  assertChangedPathsWithinEnvelopeV1,
  deriveChangeEnvelopeV1,
  unionChangeEnvelopesV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-change-envelope.js";
import {
  canonicalJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

const hardForbidden = [
  ".codex/composite-long-task/**",
  ".codex/ty-context-active-long-task.json",
  ".codex/ty-context-final-result-receipt.json",
  "project_context/**",
];

function envelope(
  allowed,
  supporting = [],
  forbidden = hardForbidden,
  contractKeys = [],
) {
  const identity = {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: allowed,
    allowed_supporting_paths: supporting,
    allowed_contract_keys: contractKeys,
    forbidden_paths: forbidden,
    undeclared_change_policy: "reject",
  };
  return { ...identity, envelope_sha256: sha256Hex(canonicalJson(identity)) };
}

test("slice_receipt_rejects_unbound_changed_path", () => {
  assert.throws(
    () =>
      assertChangedPathsWithinEnvelopeV1(
        ["src/owned.ts", "src/surprise.ts"],
        envelope(["src/owned.ts"]),
      ),
    /slice_receipt_unbound_changed_path:src\/surprise\.ts/u,
  );
});

test("slice_receipt_rejects_other_slice_path", () => {
  assert.throws(
    () =>
      assertChangedPathsWithinEnvelopeV1(
        ["src/slice-b.ts"],
        envelope(["src/slice-a.ts"]),
      ),
    /slice_receipt_unbound_changed_path:src\/slice-b\.ts/u,
  );
});

test("slice_receipt_rejects_context_change", () => {
  assert.throws(
    () =>
      assertChangedPathsWithinEnvelopeV1(
        ["project_context/global.md"],
        envelope(["src/**"]),
      ),
    /slice_receipt_forbidden_campaign_state_change/u,
  );
});

test("slice_receipt_allows_declared_lockfile", () => {
  assert.doesNotThrow(() =>
    assertChangedPathsWithinEnvelopeV1(
      ["src/owned.ts", "package-lock.json"],
      envelope(["src/owned.ts"], ["package-lock.json"]),
    ),
  );
});

test("slice_receipt_allows_declared_generated_artifact", () => {
  assert.doesNotThrow(() =>
    assertChangedPathsWithinEnvelopeV1(
      ["src/owned.ts", "dist/schema.json"],
      envelope(["src/owned.ts"], ["dist/**"]),
    ),
  );
});

test("Slice envelopes hard-forbid Context and Campaign state even when a binding tries to allow them", () => {
  const bundle = (target) => ({
    plan: {
      plan_items: [
        {
          obligations: [
            {
              implementation_bindings: [
                { id: "IB-001", kind: "path_glob", target },
              ],
            },
          ],
        },
      ],
    },
  });
  const safe = deriveChangeEnvelopeV1(bundle("src/**"));
  assert.deepEqual(safe.forbidden_paths, hardForbidden);
  assert.throws(
    () => deriveChangeEnvelopeV1(bundle("project_context/**")),
    /change_envelope_forbidden_overlap/u,
  );
  assert.throws(
    () => deriveChangeEnvelopeV1(bundle(".codex/composite-long-task/**")),
    /change_envelope_forbidden_overlap/u,
  );
});

test("repair_envelope_is_union_of_affected_slices", () => {
  const actual = unionChangeEnvelopesV1(
    [
      envelope(
        ["src/a.ts"],
        ["package-lock.json"],
        hardForbidden,
        ["schema:api/schema.json#/A"],
      ),
      envelope(
        ["src/b.ts"],
        [],
        hardForbidden,
        ["runtime_capability:api.b"],
      ),
    ],
    ["src/conflict.ts"],
  );
  assert.deepEqual(actual.allowed_write_paths, ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(actual.allowed_supporting_paths, [
    "package-lock.json",
    "src/conflict.ts",
  ]);
  assert.equal(actual.undeclared_change_policy, "reject");
  assert.deepEqual(actual.allowed_contract_keys, [
    "runtime_capability:api.b",
    "schema:api/schema.json#/A",
  ]);
  assert.match(actual.envelope_sha256, /^[a-f0-9]{64}$/u);
});
