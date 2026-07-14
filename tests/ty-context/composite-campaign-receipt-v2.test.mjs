import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { assertCampaignFinalScopeV1 } from "../../packages/ty-context/dist/lib/composite-campaign-final-gate.js";
import { readSliceExecutionReceiptV2 } from "../../packages/ty-context/dist/lib/composite-campaign-receipt.js";

test("slice_execution_receipt_v2_binds_envelope_and_declares_no_scope_leakage", async () => {
  const fixture = await writeFixture([]);
  const receipt = await readSliceExecutionReceiptV2(fixture.receiptPath);
  assert.equal(receipt.schema_version, "slice-execution-receipt-v2");
  assert.equal(receipt.change_envelope_sha256, fixture.envelope.envelope_sha256);
  assert.deepEqual(receipt.changed_paths, ["src/value.ts"]);
  assert.deepEqual(receipt.undeclared_changed_paths, []);
  await assert.doesNotReject(() => assertCampaignFinalScopeV1([fixture.input]));
});

test("campaign_final_rejects_scope_leakage", async () => {
  const fixture = await writeFixture(["src/leak.ts"]);
  await assert.rejects(
    () => assertCampaignFinalScopeV1([fixture.input]),
    /campaign_final_rejects_scope_leakage/u,
  );
});

async function writeFixture(undeclaredChangedPaths) {
  const root = await mkdtemp(path.join(os.tmpdir(), "receipt-v2-"));
  const packet = path.join(root, "packet");
  await mkdir(packet, { recursive: true });
  const envelopeIdentity = {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: ["src/value.ts"],
    allowed_supporting_paths: [],
    allowed_contract_keys: ["runtime_capability:value.read"],
    forbidden_paths: [
      ".codex/composite-long-task/**",
      ".codex/ty-context-active-long-task.json",
      ".codex/ty-context-final-result-receipt.json",
      "project_context/**",
    ],
    undeclared_change_policy: "reject",
  };
  const envelope = {
    ...envelopeIdentity,
    envelope_sha256: sha256Hex(canonicalJson(envelopeIdentity)),
  };
  await writeFile(
    path.join(packet, "change-envelope.json"),
    canonicalJson(envelope),
  );
  const receiptIdentity = {
    schema_version: "slice-execution-receipt-v2",
    campaign_id: "campaign",
    slice_id: "SFC-001",
    wave_id: "WAVE-001",
    goal_id: "goal",
    branch: "tyctx/slice",
    base_commit: "a".repeat(40),
    head_commit: "b".repeat(40),
    commit_oids: ["b".repeat(40)],
    changed_paths: ["src/value.ts"],
    change_envelope_sha256: envelope.envelope_sha256,
    undeclared_changed_paths: undeclaredChangedPaths,
    contract_sha256: "c".repeat(64),
    final_result_sha256: "d".repeat(64),
    final_snapshot_sha256: "e".repeat(64),
    workflow_status: "accepted",
    worktree_clean: true,
    recorded_at: "2026-07-14T00:00:00.000Z",
  };
  const receipt = {
    ...receiptIdentity,
    receipt_sha256: sha256Hex(canonicalJson(receiptIdentity)),
  };
  const receiptPath = path.join(root, "receipt.json");
  await writeFile(receiptPath, canonicalJson(receipt));
  return {
    envelope,
    receiptPath,
    input: {
      slice_id: "SFC-001",
      packet_revision_path: packet,
      receipt_path: receiptPath,
    },
  };
}
