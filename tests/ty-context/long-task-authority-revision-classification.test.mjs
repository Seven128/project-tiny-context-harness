import assert from "node:assert/strict";
import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("semantic or proof changes are previewed but never candidate-executed", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    const runtimeBefore = await readRuntimeProjection(fixture.workdir);

    const candidate = structuredClone(fixture.contract);
    candidate.outcomes[0].product.owner.path_globs.push("shared/**");
    candidate.outcomes[1].product.owner.label = "changed product owner";
    candidate.outcomes[0].acceptance.checks[0].artifact_globs = [];
    await writeContract(fixture.workdir, candidate);
    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
    ]);
    assert.equal(diagnosis.status, "protected_change_previewed");
    assert.equal(
      diagnosis.revision.change_class,
      "protected_semantic_or_proof_change",
    );
    assert.equal(diagnosis.diagnostics_executed, false);
    assert.deepEqual(diagnosis.check_results, []);
    assert.equal(
      diagnosis.revision.approval_summary.product_semantics_changed,
      true,
    );
    assert.equal(
      diagnosis.revision.approval_summary.acceptance_or_proof_weakened,
      true,
    );
    assert.equal(
      diagnosis.revision.approval_summary.write_scope_expanded,
      true,
    );
    assert.deepEqual(diagnosis.revision.approval_summary.affected_outcomes, [
      "first",
      "second",
    ]);
    assert.ok(
      diagnosis.revision.approval_summary.protected_reasons.includes(
        "artifact_removed",
      ),
    );
    assert.ok(
      diagnosis.revision.approval_summary.protected_reasons.includes(
        "owner_path_expanded",
      ),
    );
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      runtimeBefore,
    );

    const pending = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(
      pending.pending_authority_revision.revision_identity,
      diagnosis.revision.revision_identity,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("additive verification dependencies remain automatic and are summarized", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests", "extra.mjs"),
      "export const extraProofDependency = true;\n",
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    fixture.contract.outcomes[0].acceptance.checks[0].input_paths.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, fixture.contract);
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.status, "compiled");
    assert.equal(revised.authority_revision, 2);
    assert.equal(
      revised.authority_revision_change.change_class,
      "monotonic_evidence_strengthening",
    );
    assert.equal(revised.authority_revision_change.approval_required, false);
    assert.deepEqual(
      revised.authority_revision_change.approval_summary
        .added_verification_dependencies,
      ["first.first-check:tests/extra.mjs"],
    );
    assert.equal(
      await exists(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
      ),
      false,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function readRuntimeProjection(workdir) {
  const runtimeRoot = path.join(workdir, ".ty-context");
  const progressFolder = path.join(runtimeRoot, "progress");
  const progressNames = await readdir(progressFolder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return {
    compiled: await optionalText(
      path.join(runtimeRoot, "compiled-contract.json"),
    ),
    pending: await optionalText(
      path.join(runtimeRoot, "authority-revision-pending.json"),
    ),
    approved: await optionalText(
      path.join(runtimeRoot, "authority-revision-approved.json"),
    ),
    final: await optionalText(path.join(runtimeRoot, "final-receipt.json")),
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

async function optionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
