import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCampaignFixtureV6 } from "./helpers/campaign-v6-fixture.mjs";
import {
  assertCampaignDispatchAllowedV6,
  CampaignWorkerInterruptedError,
} from "../../packages/ty-context/dist/lib/composite-campaign-dispatch-v6.js";
import { interruptCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-control-v6.js";
import { mutateCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-v6.js";
import {
  acquireCampaignLockV6,
  loadCampaignStoreV6,
} from "../../packages/ty-context/dist/lib/composite-runtime-v6/campaign-store.js";
import {
  captureKnownProcessTreeV1,
  cleanupKnownProcessDescendantsV1,
  terminateKnownProcessTree,
  windowsTaskkillArgvV1,
} from "../../packages/ty-context/dist/lib/process-tree.js";
import {
  getProcessStartIdentity,
  isProcessAlive,
} from "../../packages/ty-context/dist/lib/process-identity.js";

test("interrupt request closes the dispatch boundary before another attempt", async () => {
  const fixture = await createCampaignFixtureV6({ campaignId: "dispatch" });
  try {
    const loaded = await loadCampaignStoreV6(fixture.root, fixture.campaignPath);
    const lock = await acquireCampaignLockV6(loaded.root, "interrupt-test");
    try {
      const options = {
        projectRoot: fixture.root,
        campaignPath: fixture.campaignPath,
        campaignRoot: loaded.root,
        lock,
        expectedRunGeneration: loaded.campaign.run_generation,
      };
      await assertCampaignDispatchAllowedV6(options);
      await writeFile(
        path.join(loaded.root, ".interrupt-request.json"),
        JSON.stringify({ requested: true }),
        "utf8",
      );
      await assert.rejects(
        () => assertCampaignDispatchAllowedV6(options),
        CampaignWorkerInterruptedError,
      );
    } finally {
      await lock.close();
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("PID reuse observation is blocked and never terminates the unrelated process", async () => {
  const fixture = await createCampaignFixtureV6({ campaignId: "pid-reuse" });
  try {
    await mutateCampaignV6(
      fixture.root,
      fixture.campaignPath,
      "test_worker_recorded",
      async (_root, campaign) => {
        campaign.run_generation = 1;
        campaign.campaign_status = "executing";
        const slice = campaign.slices["SFC-001"];
        slice.status = "worker_running";
        slice.current_worker_run = {
          run_id: "pid-reuse-run",
          kind: "execution",
          attempt: 1,
          run_generation: 1,
          pid: process.pid,
          process_start_identity: "not-the-current-process",
          started_at: new Date().toISOString(),
          completed_at: null,
          profile: { model: "fixture", effort: "high" },
          cwd: fixture.root,
          prompt_sha256: "0".repeat(64),
          status: "running",
          exit_code: null,
        };
        return campaign;
      },
    );
    const result = await interruptCampaignV6(fixture.root, fixture.campaignPath);
    assert.equal(isProcessAlive(process.pid), true);
    assert.deepEqual(result.graceful_pids, []);
    assert.deepEqual(result.force_terminated_pids, []);
    assert.deepEqual(result.blockers, [
      "worker_process_identity_unverified:pid-reuse-run",
    ]);
    const current = await loadCampaignStoreV6(fixture.root, fixture.campaignPath);
    assert.equal(
      current.campaign.slices["SFC-001"].current_worker_run.status,
      "interrupted",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("identity-matched termination is bounded to the recorded process tree", async () => {
  const parent = spawn(
    process.execPath,
    [
      "-e",
      "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)",
    ],
    { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
  );
  const childPid = await firstPid(parent);
  const parentPid = parent.pid;
  assert.ok(parentPid);
  const identity = await getProcessStartIdentity(parentPid);
  assert.ok(identity);
  const known = await captureKnownProcessTreeV1(parentPid);
  try {
    const mismatch = await terminateKnownProcessTree(
      parentPid,
      "wrong-identity",
      true,
      known,
    );
    assert.equal(mismatch.process_tree_cleanup_status, "identity_mismatch_skipped");
    assert.equal(isProcessAlive(parentPid), true);
    await terminateKnownProcessTree(parentPid, identity, false, known);
    await waitUntil(() => !isProcessAlive(parentPid), 500);
    if (isProcessAlive(parentPid))
      await terminateKnownProcessTree(parentPid, identity, true, known);
    await waitUntil(() => !isProcessAlive(parentPid), 5_000);
    await cleanupKnownProcessDescendantsV1(parentPid, known);
    await waitUntil(() => !isProcessAlive(childPid), 5_000);
    assert.equal(isProcessAlive(parentPid), false);
    assert.equal(isProcessAlive(childPid), false);
    assert.deepEqual(windowsTaskkillArgvV1(42, false), ["/PID", "42", "/T"]);
    assert.deepEqual(windowsTaskkillArgvV1(42, true), [
      "/PID",
      "42",
      "/T",
      "/F",
    ]);
  } finally {
    if (isProcessAlive(parentPid))
      await terminateKnownProcessTree(parentPid, identity, true, known);
    await cleanupKnownProcessDescendantsV1(parentPid, known);
    parent.kill("SIGKILL");
  }
});

async function firstPid(child) {
  return new Promise((resolve, reject) => {
    let value = "";
    const timer = setTimeout(() => reject(new Error("child_pid_timeout")), 5_000);
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      value += chunk.toString("utf8");
      const match = /^(\d+)/u.exec(value.trim());
      if (!match) return;
      clearTimeout(timer);
      resolve(Number(match[1]));
    });
  });
}
async function waitUntil(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 50));
}
