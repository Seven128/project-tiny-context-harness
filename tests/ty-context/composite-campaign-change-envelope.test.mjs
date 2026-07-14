import assert from "node:assert/strict";
import test from "node:test";
import {
  assertChangedPathsWithinEnvelopeV1,
  deriveChangeEnvelopeV1,
  unionChangeEnvelopesV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-change-envelope.js";

function envelope(
  allowed,
  supporting = [],
  forbidden = [".codex/composite-long-task/campaigns/CAMP"],
  carriers = {},
) {
  return {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: allowed,
    allowed_supporting_paths: supporting,
    forbidden_paths: forbidden,
    undeclared_change_policy: "reject",
    binding_carrier_paths: carriers,
  };
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

test("slice_receipt_allows_declared_supporting_path", () => {
  assert.doesNotThrow(() =>
    assertChangedPathsWithinEnvelopeV1(
      ["src/owned.ts", "package-lock.json"],
      envelope(["src/owned.ts"], ["package-lock.json"]),
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
      supporting_paths: [],
      forbidden_paths: [],
    },
  });
  const safe = deriveChangeEnvelopeV1(bundle("src/**"));
  assert.deepEqual(safe.forbidden_paths, [
    ".codex/composite-long-task/**",
    "project_context/**",
  ]);
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
  const actual = unionChangeEnvelopesV1([
    envelope(
      ["src/a.ts"],
      ["package-lock.json"],
      [".codex/composite-long-task/campaigns/CAMP"],
      { "IB-A": ["src/a.ts"] },
    ),
    envelope(["src/b.ts"], [], [".codex/composite-long-task/campaigns/CAMP"], {
      "IB-B": ["src/b.ts"],
    }),
  ]);
  assert.deepEqual(actual.allowed_write_paths, ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(actual.allowed_supporting_paths, ["package-lock.json"]);
  assert.equal(actual.undeclared_change_policy, "reject");
  assert.deepEqual(actual.binding_carrier_paths, {
    "IB-A": ["src/a.ts"],
    "IB-B": ["src/b.ts"],
  });
});
