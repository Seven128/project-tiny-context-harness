import assert from "node:assert/strict";
import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("scope-only candidates can be diagnosed without state, batched into one exact approval, and adopted with evidence invalidation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests", "extra.mjs"),
      "export const extraProofDependency = true;\n",
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);

    const activeBefore = (await loadActiveLongTaskAuthority(fixture.root))
      .authority;
    assert.ok(activeBefore);
    const runtimeBefore = await readRuntimeProjection(fixture.workdir);
    assert.equal(runtimeBefore.pending, null);
    assert.equal(runtimeBefore.approved, null);
    assert.notEqual(runtimeBefore.final, null);
    assert.ok(runtimeBefore.progress.length > 0);

    const candidate = structuredClone(fixture.contract);
    candidate.outcomes[0].product.owner.path_globs.push("shared/**");
    candidate.outcomes[0].technical.expected_change_paths.push("shared/**");
    candidate.outcomes[0].technical.allowed_support_paths.push("shared/**");
    candidate.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    candidate.outcomes[0].acceptance.checks[0].input_paths.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, candidate);

    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    assert.equal(diagnosis.status, "scope_candidate_exercised");
    assert.equal(diagnosis.acceptance_authorized, false);
    assert.equal(diagnosis.progress_written, false);
    assert.equal(diagnosis.pending_revision_written, false);
    assert.equal(diagnosis.diagnostics_executed, true);
    assert.equal(diagnosis.revision.change_class, "scope_only_expansion");
    assert.equal(diagnosis.revision.approval_required, true);
    assert.equal(
      diagnosis.revision.approval_summary.product_semantics_changed,
      false,
    );
    assert.equal(
      diagnosis.revision.approval_summary.acceptance_or_proof_weakened,
      false,
    );
    assert.equal(
      diagnosis.revision.approval_summary.write_scope_expanded,
      true,
    );
    assert.deepEqual(diagnosis.revision.approval_summary.protected_reasons, [
      "allowed_path_expanded",
      "expected_change_path_expanded",
      "owner_path_expanded",
    ]);
    assert.ok(
      diagnosis.revision.approval_summary.added_verification_dependencies.includes(
        "first.first-check:tests/extra.mjs",
      ),
    );
    assert.equal(diagnosis.check_results[0].status, "passed");

    const activeAfterDiagnosis = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    assert.equal(
      activeAfterDiagnosis.active_authority_identity,
      activeBefore.active_authority_identity,
    );
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      runtimeBefore,
    );

    const firstPendingOutput = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(firstPendingOutput.status, "authority_revision_pending");
    const firstDecision = firstPendingOutput.pending_authority_revision;
    assert.equal(
      firstDecision.revision_identity,
      diagnosis.revision.revision_identity,
    );
    assert.equal(firstDecision.change_class, "scope_only_expansion");

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(status.pending_authority_revision, firstDecision);
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.deepEqual(resume.pending_authority_revision, firstDecision);
    assert.match(resume.next_safe_action, /Ask the user to approve or reject/u);

    await runCli(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      firstDecision.revision_identity,
    ]);
    const pendingBeforeMoreEdits = await readRuntimeProjection(fixture.workdir);
    assert.notEqual(pendingBeforeMoreEdits.approved, null);

    candidate.outcomes[0].product.owner.path_globs.push("config/**");
    candidate.outcomes[0].technical.expected_change_paths.push("config/**");
    await writeContract(fixture.workdir, candidate);
    const revisedDiagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
      "--check",
      "first-check",
    ]);
    assert.notEqual(
      revisedDiagnosis.revision.revision_identity,
      firstDecision.revision_identity,
    );
    assert.equal(revisedDiagnosis.status, "scope_candidate_exercised");
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      pendingBeforeMoreEdits,
      "diagnosis must not refresh pending or approval state",
    );

    const secondPendingOutput = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const secondDecision = secondPendingOutput.pending_authority_revision;
    assert.equal(
      secondDecision.revision_identity,
      revisedDiagnosis.revision.revision_identity,
    );
    assert.notEqual(
      secondDecision.revision_identity,
      firstDecision.revision_identity,
    );
    assert.equal(
      await exists(
        runtimeFile(fixture.workdir, "authority-revision-approved.json"),
      ),
      false,
    );

    await runCli(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      secondDecision.revision_identity,
    ]);
    const adopted = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(adopted.status, "compiled");
    assert.equal(adopted.authority_revision, 2);
    assert.equal(adopted.progress_preserved, false);
    assert.equal(
      adopted.authority_revision_change.change_class,
      "scope_only_expansion",
    );
    assert.equal(await exists(runtimeFile(fixture.workdir, "progress")), false);
    assert.equal(
      await exists(runtimeFile(fixture.workdir, "final-receipt.json")),
      false,
    );
    assert.equal(
      await exists(
        runtimeFile(fixture.workdir, "authority-revision-pending.json"),
      ),
      false,
    );
    assert.equal(
      await exists(
        runtimeFile(fixture.workdir, "authority-revision-approved.json"),
      ),
      false,
    );

    const final = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(final.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function readRuntimeProjection(workdir) {
  const progressFolder = runtimeFile(workdir, "progress");
  const progressNames = await readdir(progressFolder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return {
    compiled: await optionalText(
      runtimeFile(workdir, "compiled-contract.json"),
    ),
    pending: await optionalText(
      runtimeFile(workdir, "authority-revision-pending.json"),
    ),
    approved: await optionalText(
      runtimeFile(workdir, "authority-revision-approved.json"),
    ),
    final: await optionalText(runtimeFile(workdir, "final-receipt.json")),
    progress: await Promise.all(
      progressNames
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map(async (name) => [
          name,
          await readFile(path.join(progressFolder, name), "utf8"),
        ]),
    ),
  };
}

function runtimeFile(workdir, name) {
  return path.join(workdir, ".ty-context", name);
}

async function optionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}
