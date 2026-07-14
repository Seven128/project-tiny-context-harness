import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  assertAcceptedCampaignAuthority,
  commitCampaignAcceptanceV5,
  continueAcceptedCleanupIfNeeded,
  injectCampaignFinalizationCrash,
  tryAcceptedCampaignAuthorityV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-accepted-authority.js";
import { readCampaignFinalResult } from "../../packages/ty-context/dist/lib/composite-campaign-final-gate.js";
import {
  advanceCampaignV5,
  recoverStaleTargetReceiptV5,
  statusCampaignV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-orchestrator.js";
import { runCampaignV5 } from "../../packages/ty-context/dist/lib/composite-campaign-thread-orchestrator.js";
import { loadCampaignV5 } from "../../packages/ty-context/dist/lib/composite-campaign-v5.js";
import { listCampaignWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";
import {
  assertTargetFinalizationReceipt,
  buildTargetFinalizationReceipt,
  readTargetFinalizationReceipt,
} from "../../packages/ty-context/dist/lib/composite-campaign-target-receipts.js";
import { finalizeCampaignTarget } from "../../packages/ty-context/dist/lib/composite-campaign-target-finalization.js";
import {
  canonicalJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { CampaignTargetReceiptStaleError } from "../../packages/ty-context/dist/lib/composite-campaign-target-freshness.js";
import {
  addTargetCommit,
  fastForwardMain,
  git,
  readyAcceptedFixture,
  snapshotEvaluation,
} from "./helpers/composite-campaign-finalization-fixture.mjs";

test("accepted_campaign_rerun_returns_finished", async (t) => {
  const fixture = await accept(t, "rerun-finished");
  const result = await advanceCampaignV5(fixture.root, fixture.campaignRoot);
  assert.deepEqual(result, {
    action: "finished",
    campaign_status: "accepted",
    target_commit: fixture.receipt.target_commit,
    cleanup_status: "complete",
  });
});

test("accepted_campaign_does_not_connect_app_server", async (t) => {
  const fixture = await accept(t, "no-app-server");
  let connections = 0;
  const result = await runCampaignV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    clientFactory: () => {
      connections += 1;
      throw new Error("must_not_connect");
    },
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.cleanup_status, "complete");
  assert.equal(connections, 0);
});

test("accepted_campaign_does_not_recreate_integration_worktree", async (t) => {
  const fixture = await accept(t, "no-recreate");
  await advanceCampaignV5(fixture.root, fixture.campaignRoot);
  await advanceCampaignV5(fixture.root, fixture.campaignRoot);
  assert.deepEqual(
    await listCampaignWorktrees({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
    }),
    [],
  );
});

test("accepted_campaign_does_not_reopen_pr", async (t) => {
  const fixture = await accept(t, "no-reopen-pr");
  await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  const before = await readFile(
    path.join(fixture.campaignRoot, "target-finalization-receipt.json"),
    "utf8",
  );
  await advanceCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(
    await readFile(
      path.join(fixture.campaignRoot, "target-finalization-receipt.json"),
      "utf8",
    ),
    before,
  );
});

test("accepted_campaign_does_not_rerun_final_gate", async (t) => {
  const fixture = await accept(t, "no-final-gate");
  await rm(path.join(fixture.campaignRoot, "scope-fit.json"), { force: true });
  const result = await advanceCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(result.action, "finished");
});

test("accepted_authority_mismatch_fails_closed", async (t) => {
  const fixture = await accept(t, "authority-mismatch");
  const receiptFile = path.join(
    fixture.campaignRoot,
    "target-finalization-receipt.json",
  );
  const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
  receipt.target_commit = "f".repeat(40);
  await writeFile(receiptFile, `${JSON.stringify(receipt)}\n`);
  await assert.rejects(
    () => tryAcceptedCampaignAuthorityV5(fixture.root, fixture.campaignRoot),
    /accepted_authority_inconsistent/u,
  );
  await assert.rejects(
    () => statusCampaignV5(fixture.root, fixture.campaignRoot),
    /accepted_authority_inconsistent/u,
  );
});

test("target_moves_after_acceptance_does_not_revoke_campaign", async (t) => {
  const fixture = await accept(t, "target-moves");
  const acceptedCommit = fixture.receipt.target_commit;
  await addTargetCommit(fixture, "after-acceptance.txt");
  const result = await runCampaignV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    clientFactory: () => {
      throw new Error("must_not_connect");
    },
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.target_commit, acceptedCommit);
});

test("acceptance_transaction_commits_campaign_result_receipt_and_event", async (t) => {
  const fixture = await accept(t, "acceptance-transaction");
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  const finalResult = await readCampaignFinalResult(
    path.join(fixture.campaignRoot, "campaign-final-result.json"),
  );
  const receipt = await readTargetFinalizationReceipt(
    path.join(fixture.campaignRoot, "target-finalization-receipt.json"),
  );
  const events = await readFile(path.join(fixture.campaignRoot, "events.ndjson"), "utf8");
  assert.equal(loaded.campaign.campaign_status, "accepted");
  assert.equal(finalResult.workflow_status, "accepted");
  assert.equal(receipt.receipt_sha256, loaded.campaign.finalization.target_receipt_sha256);
  assert.match(events, /"type":"campaign_accepted"/u);
});

test("stale_target_receipt_cannot_commit_acceptance", async (t) => {
  const fixture = await readyAcceptedFixture(t, "stale-cannot-accept");
  await addTargetCommit(fixture, "stale-before-acceptance.txt");
  await assert.rejects(
    () =>
      commitCampaignAcceptanceV5({
        projectRoot: fixture.root,
        campaignPath: fixture.campaignRoot,
        receipt: fixture.receipt,
      }),
    (error) => error instanceof CampaignTargetReceiptStaleError,
  );
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(loaded.campaign.campaign_status, "finalizing");
  assert.equal(loaded.campaign.finalization, null);
});

test("stale_receipt_writes_no_acceptance_artifacts", async (t) => {
  const fixture = await readyAcceptedFixture(t, "stale-no-artifacts");
  const campaignFile = path.join(fixture.campaignRoot, "campaign.yaml");
  const beforeCampaign = await readFile(campaignFile, "utf8");
  await addTargetCommit(fixture, "stale-no-artifacts.txt");
  await assert.rejects(() =>
    commitCampaignAcceptanceV5({
      projectRoot: fixture.root,
      campaignPath: fixture.campaignRoot,
      receipt: fixture.receipt,
    }),
  );
  assert.equal(await readFile(campaignFile, "utf8"), beforeCampaign);
  const finalResult = await readCampaignFinalResult(
    path.join(fixture.campaignRoot, "campaign-final-result.json"),
  );
  assert.equal(finalResult.workflow_status, "ready_to_merge");
  await assert.rejects(() =>
    access(path.join(fixture.campaignRoot, "target-finalization-receipt.json")),
  );
  const events = await readFile(
    path.join(fixture.campaignRoot, "events.ndjson"),
    "utf8",
  );
  assert.doesNotMatch(events, /"type":"campaign_accepted"/u);
  assert.equal(
    (
      await listCampaignWorktrees({
        repositoryRoot: fixture.root,
        campaignId: fixture.campaignId,
      })
    ).some((worktree) => worktree.branch === fixture.integrationBranch),
    true,
  );
});

test("stale_receipt_returns_to_target_finalization", async (t) => {
  const fixture = await readyAcceptedFixture(t, "stale-retry");
  const recovery = await recoverStaleTargetReceiptV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    staleCount: 1,
  });
  assert.deepEqual(recovery, { action: "retry_target_finalization" });
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(loaded.campaign.campaign_status, "finalizing");
  assert.equal(loaded.campaign.execution_host.status, "disconnected");
  assert.match(
    await readFile(path.join(fixture.campaignRoot, "events.ndjson"), "utf8"),
    /"type":"target_changed_before_acceptance"/u,
  );
});

test("second_target_change_returns_wait_external", async (t) => {
  const fixture = await readyAcceptedFixture(t, "stale-bounded");
  await recoverStaleTargetReceiptV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    staleCount: 1,
  });
  const recovery = await recoverStaleTargetReceiptV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    staleCount: 2,
  });
  assert.deepEqual(recovery, {
    action: "wait_external",
    reason: "target_unstable_during_acceptance",
  });
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(loaded.campaign.campaign_status, "finalizing");
  assert.equal(loaded.campaign.execution_host.status, "disconnected");
  assert.equal(loaded.campaign.execution_host.restart_count, 0);
  const events = await readFile(
    path.join(fixture.campaignRoot, "events.ndjson"),
    "utf8",
  );
  assert.equal(
    events.match(/"type":"target_changed_before_acceptance"/gu)?.length,
    2,
  );
});

test("non_revalidated_basis_rejects_non_null_revalidation_hash", async (t) => {
  const fixture = await readyAcceptedFixture(t, "unexpected-revalidation");
  assert.throws(
    () =>
      buildTargetFinalizationReceipt({
        finalResult: fixture.finalResult.value,
        targetBranch: "main",
        targetCommit: fixture.receipt.target_commit,
        targetTree: fixture.receipt.target_tree,
        acceptanceBasis: "exact_commit",
        targetRevalidation: {
          workflow_status: "target_verified",
        },
      }),
    /unexpected_revalidation/u,
  );
  const { receipt_sha256: _oldHash, ...identity } = {
    ...fixture.receipt,
    target_revalidation_result_sha256: "e".repeat(64),
  };
  assert.throws(
    () =>
      assertTargetFinalizationReceipt({
        ...identity,
        receipt_sha256: sha256Hex(canonicalJson(identity)),
      }),
    /revalidation_basis_invalid/u,
  );
});

test("ff_accepted_authority_survives_removing_diagnostic_revalidation", async (t) => {
  const fixture = await readyAcceptedFixture(t, "ff-diagnostic-removed", {
    remote: true,
  });
  const finalized = await finalizeCampaignTarget({
    ...fixture.options,
    snapshotEvaluator: (worktree) => snapshotEvaluation(worktree, "needs_work"),
  });
  assert.equal(finalized.status, "accepted");
  assert.equal(finalized.receipt.acceptance_basis, "remote_fast_forward");
  assert.equal(finalized.receipt.target_revalidation_result_sha256, null);
  await commitCampaignAcceptanceV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    receipt: finalized.receipt,
  });
  await rm(
    path.join(fixture.campaignRoot, "target-revalidation-result.json"),
    { force: true },
  );
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  const authority = await assertAcceptedCampaignAuthority(
    loaded.root,
    loaded.campaign,
  );
  assert.equal(authority.target_commit, finalized.target_commit);
});

test("integration_branch_not_deleted_before_acceptance_commit", async (t) => {
  const fixture = await readyAcceptedFixture(t, "branch-order");
  await commitCampaignAcceptanceV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    receipt: fixture.receipt,
  });
  const branches = (await git(fixture.root, "branch", "--list", fixture.integrationBranch)).stdout;
  assert.match(branches, new RegExp(fixture.integrationBranch.replaceAll("/", "\\/"), "u"));
});

test("crash_after_target_delivery_before_acceptance_transaction_recovers", async (t) => {
  const fixture = await readyAcceptedFixture(t, "crash-delivery");
  await fastForwardMain(fixture);
  const delivered = await finalizeCampaignTarget(fixture.options);
  assert.equal(delivered.status, "accepted");
  assert.equal((await loadCampaignV5(fixture.root, fixture.campaignRoot)).campaign.campaign_status, "finalizing");
  process.env.TY_CONTEXT_FINALIZE_CRASH_AT =
    "after_target_delivery_before_acceptance_transaction";
  try {
    assert.throws(
      () =>
        injectCampaignFinalizationCrash(
          "after_target_delivery_before_acceptance_transaction",
        ),
      /simulated_crash/u,
    );
  } finally {
    delete process.env.TY_CONTEXT_FINALIZE_CRASH_AT;
  }
  await commitCampaignAcceptanceV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    receipt: delivered.receipt,
  });
  assert.equal((await tryAcceptedCampaignAuthorityV5(fixture.root, fixture.campaignRoot)).target_commit, delivered.target_commit);
});

test("crash_after_acceptance_transaction_before_cleanup_returns_finished", async (t) => {
  const fixture = await readyAcceptedFixture(t, "crash-acceptance");
  process.env.TY_CONTEXT_FINALIZE_CRASH_AT =
    "after_acceptance_transaction_before_cleanup";
  try {
    await assert.rejects(
      () =>
        commitCampaignAcceptanceV5({
          projectRoot: fixture.root,
          campaignPath: fixture.campaignRoot,
          receipt: fixture.receipt,
        }),
      /simulated_crash/u,
    );
  } finally {
    delete process.env.TY_CONTEXT_FINALIZE_CRASH_AT;
  }
  const result = await runCampaignV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    clientFactory: () => {
      throw new Error("must_not_connect");
    },
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.cleanup_status, "complete");
});

test("crash_after_cleanup_before_cleanup_status_is_idempotent", async (t) => {
  const fixture = await accept(t, "crash-cleanup");
  process.env.TY_CONTEXT_FINALIZE_CRASH_AT = "after_cleanup_before_cleanup_status";
  try {
    await assert.rejects(
      () =>
        continueAcceptedCleanupIfNeeded({
          projectRoot: fixture.root,
          campaignPath: fixture.campaignRoot,
        }),
      /simulated_crash/u,
    );
  } finally {
    delete process.env.TY_CONTEXT_FINALIZE_CRASH_AT;
  }
  const recovered = await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  assert.equal(recovered.cleanup_status, "complete");
});

test("cleanup_failure_does_not_revoke_acceptance", async (t) => {
  const fixture = await accept(t, "cleanup-failure");
  const externalBranch = fixture.integrationBranch.replace(/integration$/u, "external");
  const externalPath = path.join(fixture.parent, "external-worktree");
  await git(fixture.root, "branch", externalBranch, "main");
  await git(fixture.root, "worktree", "add", externalPath, externalBranch);
  const result = await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  assert.equal(result.cleanup_status, "pending");
  assert.equal((await loadCampaignV5(fixture.root, fixture.campaignRoot)).campaign.campaign_status, "accepted");
});

test("accepted_cleanup_is_idempotent", async (t) => {
  const fixture = await accept(t, "cleanup-idempotent");
  await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  const first = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  const second = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  assert.equal(first.campaign.generation, second.campaign.generation);
  assert.equal(second.campaign.finalization.cleanup_status, "complete");
});

test("accepted_cleanup_only_removes_owned_assets", async (t) => {
  const fixture = await accept(t, "cleanup-owned");
  const unrelatedPath = path.join(fixture.parent, "unrelated-worktree");
  await git(fixture.root, "branch", "unrelated", "main");
  await git(fixture.root, "worktree", "add", unrelatedPath, "unrelated");
  const primaryHead = (await git(fixture.root, "rev-parse", "HEAD")).stdout.trim();
  await continueAcceptedCleanupIfNeeded({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
  });
  await access(unrelatedPath);
  assert.equal((await git(fixture.root, "rev-parse", "HEAD")).stdout.trim(), primaryHead);
  assert.match((await git(fixture.root, "branch", "--list", "unrelated")).stdout, /unrelated/u);
});

async function accept(t, label) {
  const fixture = await readyAcceptedFixture(t, label);
  await commitCampaignAcceptanceV5({
    projectRoot: fixture.root,
    campaignPath: fixture.campaignRoot,
    receipt: fixture.receipt,
  });
  const loaded = await loadCampaignV5(fixture.root, fixture.campaignRoot);
  await assertAcceptedCampaignAuthority(loaded.root, loaded.campaign);
  return fixture;
}
