import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handoffCompositeCampaign } from "../../packages/ty-context/dist/lib/composite-campaign-handoff.js";
import {
  recordCompositeCampaignResult,
  verifyCompositeCampaignResult
} from "../../packages/ty-context/dist/lib/composite-campaign-result.js";
import {
  applyCompletionOutputContract,
  resolveCompletionOutputStatus
} from "../../packages/ty-context/dist/lib/superpowers-task-completion-output.js";
import { sha256 } from "../../packages/ty-context/dist/lib/stable-json.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { packetFixture, scopeFitFixture } from "./composite-campaign-schema-fixtures.mjs";

const baseStorePath = "../../packages/ty-context/dist/lib/composite-campaign-store.js";
const projectionStorePath = "../../packages/ty-context/dist/lib/composite-campaign-projection-store.js";
const lifecycleStorePath = "../../packages/ty-context/dist/lib/composite-campaign-lifecycle-store.js";

for (const status of ["accept", "blocked", "reject"]) {
  test(`record-result mirrors a verified current ${status} final gate without mutating execution evidence`, async () => {
    const fixture = await startedCampaign();
    try {
      const gate = await installFinalGate(fixture.workdir, status);
      const beforeEvents = await readFile(path.join(fixture.workdir, "events.ndjson"));
      const verified = await verifyCompositeCampaignResult(fixture.root, {
        campaign_id: "campaign-1", slice_id: "SFC-001", workdir: fixture.workdir
      });
      assert.equal(verified.status, status);
      assert.equal(verified.final_gate_event_sha256, gate.sha256);
      assert.equal(verified.task_attempt_id, gate.taskAttemptId);

      const recorded = await recordCompositeCampaignResult(fixture.root, {
        campaign_id: "campaign-1", slice_id: "SFC-001", workdir: fixture.workdir
      });
      assert.equal(recorded.result.status, status);
      assert.equal(recorded.campaign.slices["SFC-001"].result_projection, status);
      assert.equal(recorded.campaign.slices["SFC-001"].binding.result.final_gate_event_sha256, gate.sha256);
      assert.equal("campaign_complete" in recorded.campaign, false);
      assert.deepEqual(await readFile(path.join(fixture.workdir, "events.ndjson")), beforeEvents);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

test("record-result consumes the real final-gate event shape without rerunning the gate", async () => {
  const fixture = await startedCampaign();
  try {
    const gate = await runFinalGate(fixture.workdir);
    assert.notEqual(gate.completion_output_status, "accept");
    const before = await readFile(path.join(fixture.workdir, "events.ndjson"));
    const recorded = await recordCompositeCampaignResult(fixture.root, {
      campaign_id: "campaign-1", slice_id: "SFC-001", workdir: fixture.workdir
    });
    assert.equal(recorded.result.status, gate.completion_output_status);
    assert.deepEqual(await readFile(path.join(fixture.workdir, "events.ndjson")), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("record-result rejects validator-only, sibling, stale-attempt, and source-mismatched completion", async () => {
  for (const mode of ["final-not-run", "sibling", "stale-attempt", "source-mismatch"]) {
    const fixture = await startedCampaign();
    try {
      const statePath = path.join(fixture.workdir, "task-state.json");
      if (mode !== "final-not-run") await installFinalGate(fixture.workdir, "accept");
      let workdir = fixture.workdir;
      if (mode === "final-not-run") {
        const state = JSON.parse(await readFile(statePath, "utf8"));
        state.gates.validator = { status: "pass", errors: [] };
        state.final.product_goal_complete = true;
        state.final.acceptance_target_status = "complete";
        await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      } else if (mode === "sibling") {
        workdir = path.join(path.dirname(fixture.workdir), "SFC-999-r1");
      } else if (mode === "stale-attempt") {
        const state = JSON.parse(await readFile(statePath, "utf8"));
        const old = state.attempts.find((attempt) => attempt.task_attempt_id === state.current_attempt_id);
        const replacement = { ...old, task_attempt_id: `${old.task_attempt_id}-NEW`, started_at: new Date().toISOString() };
        state.attempts.push(replacement);
        state.current_attempt_id = replacement.task_attempt_id;
        await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      } else {
        const state = JSON.parse(await readFile(statePath, "utf8"));
        state.sources.product_architecture_source.sha256 = "0".repeat(64);
        await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      }
      await assert.rejects(
        recordCompositeCampaignResult(fixture.root, {
          campaign_id: "campaign-1", slice_id: "SFC-001", workdir
        }),
        /final.gate|workdir|sibling|attempt|source|hash|binding/i,
        mode
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("an accept event cannot promote a non-accept final state", async () => {
  const fixture = await startedCampaign();
  try {
    const gate = await installFinalGate(fixture.workdir, "reject");
    const eventsPath = path.join(fixture.workdir, "events.ndjson");
    const lines = (await readFile(eventsPath, "utf8")).trimEnd().split("\n");
    const event = JSON.parse(lines.at(-1));
    event.completion_output_status = "accept";
    event.product_goal_complete = true;
    lines[lines.length - 1] = JSON.stringify(event);
    await writeFile(eventsPath, `${lines.join("\n")}\n`, "utf8");
    await assert.rejects(
      recordCompositeCampaignResult(fixture.root, {
        campaign_id: "campaign-1", slice_id: "SFC-001", workdir: fixture.workdir
      }),
      /final.gate|status|state|mismatch/i
    );
    assert.notEqual(gate.sha256, sha256(`${JSON.stringify(event)}\n`));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function installFinalGate(workdir, status) {
  const statePath = path.join(workdir, "task-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const contract = status === "accept"
    ? resolveCompletionOutputStatus({ final_gate_ran: true, product_goal_complete: true, acceptance_target_status: "complete", audit_task_complete: true })
    : status === "blocked"
      ? resolveCompletionOutputStatus({ final_gate_ran: true, product_goal_complete: false, acceptance_target_status: "blocked", audit_task_complete: true, blocked_reasons: ["environment_blocked"] })
      : resolveCompletionOutputStatus({ final_gate_ran: true, product_goal_complete: false, acceptance_target_status: "invalidated", audit_task_complete: true, rejection_reasons: ["current evidence failed"] });
  applyCompletionOutputContract(state, contract);
  state.gates.final_gate = {
    status: status === "accept" ? "pass" : status,
    completion_output_status: status,
    product_goal_complete: contract.product_goal_complete,
    acceptance_target_status: contract.acceptance_target_status,
    blocked_reasons: contract.blocked_reasons,
    rejection_reasons: contract.rejection_reasons
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  const attempt = state.attempts.find((candidate) => candidate.task_attempt_id === state.current_attempt_id);
  const event = {
    event_type: "final_gate",
    created_at: new Date().toISOString(),
    task_id: state.meta.task_id,
    task_attempt_id: state.current_attempt_id,
    source_bundle_hash: attempt.source_bundle_hash,
    product_source_hash: attempt.product_source_hash,
    technical_plan_hash: attempt.technical_plan_hash,
    acceptance_checklist_hash: attempt.acceptance_checklist_hash,
    product_goal_complete: contract.product_goal_complete,
    completion_output_status: status
  };
  const line = `${JSON.stringify(event)}\n`;
  await appendFile(path.join(workdir, "events.ndjson"), line, "utf8");
  return { sha256: sha256(line), taskAttemptId: state.current_attempt_id };
}

async function startedCampaign() {
  const root = await emptyProject();
  const store = { ...await import(baseStorePath), ...await import(projectionStorePath) };
  const created = await store.createCampaign(root, {
    campaign_id: "campaign-1", request: "Record only a current final-gate result.\n", operation_id: "create:1"
  });
  const scope = scopeFitFixture();
  scope.request_sha256 = created.campaign.request.sha256;
  const scoped = await store.applyScopeFitCas(root, {
    campaign_id: "campaign-1", scope_fit: scope,
    expected_etag: created.manifest_etag_sha256, operation_id: "scope:1"
  });
  const packet = packetFixture();
  packet.request_sha256 = created.campaign.request.sha256;
  packet.created_at = scoped.campaign.updated_at;
  makePacketRenderable(packet);
  const authored = await store.createPacketRevisionCas(root, {
    campaign_id: "campaign-1", packet,
    expected_etag: scoped.manifest_etag_sha256, operation_id: "packet:1"
  });
  await store.publishProjectionCas(root, {
    campaign_id: "campaign-1", slice_id: "SFC-001", revision: 1,
    expected_etag: authored.manifest_etag_sha256, operation_id: "projection:1"
  });
  const handoff = await handoffCompositeCampaign(root, { campaign_id: "campaign-1", slice_id: "SFC-001" });
  const base = await import(baseStorePath);
  const lifecycle = await import(lifecycleStorePath);
  const snapshot = await base.loadCampaignSnapshot(root, "campaign-1");
  await lifecycle.bindGoalCas(root, {
    campaign_id: "campaign-1", slice_id: "SFC-001", goal_id: "goal-1",
    expected_etag: snapshot.manifest_etag_sha256, operation_id: "goal:1"
  });
  return { root, workdir: handoff.workdir };
}

function makePacketRenderable(packet) {
  const product = packet.authorities.product_architecture_source.fields;
  product.representative_samples_do_not_validate = ["manual prose is not machine proof"];
  product.non_completing_outcomes = ["validator-only completion"];
  const plan = packet.authorities.technical_realization_plan.plan_items[0].fields;
  plan.implementation_paths = ["packages/ty-context/src/lib/composite-campaign-result.ts"];
  plan.invalid_implementation_shortcuts = ["promote a validator pass"];
  const acceptance = packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
  acceptance.ac_validates = ["current final-gate identity and hashes"];
  acceptance.ac_does_not_validate = ["manual prose is not machine proof"];
  acceptance.required_proof_layers = ["code"];
  acceptance.positive_assertions = ["current attempt matches"];
  acceptance.negative_assertions = ["sibling result is absent"];
  acceptance.invalid_completion_signals = ["validator-only completion"];
}

async function emptyProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-result-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  return root;
}
