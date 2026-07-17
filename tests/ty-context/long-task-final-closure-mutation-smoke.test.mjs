import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  pathExists,
  readState,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { readProgressRecords } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  configureMixedEvidenceContract,
  createFakePlaywrightBin,
  withPath,
  writeSource,
} from "./long-task-final-closure-mutation-fixtures.mjs";

test("controlled closure mutation smoke rejects false authority and stale proof", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  const fakeBin = await createFakePlaywrightBin();
  const env = withPath(fakeBin);
  try {
    configureMixedEvidenceContract(fixture.contract);
    await writeFile(
      path.join(fixture.root, "tests", "ui.spec.ts"),
      "// Executed by the controlled fake Playwright reporter.\n",
    );
    await writeFile(
      path.join(fixture.root, "tests", "constant-oracle.mjs"),
      'console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{result:true}}));\n',
    );
    await writeFile(
      path.join(fixture.root, "src", "ui-mode.json"),
      '"multiple"\n',
    );
    await writeSource(fixture.root, { wrongRequirementTarget: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"], { env });

    let preflight = await runCliFailure(
      fixture.root,
      ["long-task", "preflight", fixture.workdir],
      { env },
    );
    assert.match(JSON.stringify(preflight), /source_target_kind_mismatch/u);
    await assert.rejects(
      () =>
        runCli(fixture.root, ["long-task", "compile", fixture.workdir], {
          env,
        }),
      /source_target_kind_mismatch/u,
    );

    fixture.contract.source_claims[0].statement =
      "The first outcome must be observable.";
    fixture.contract.source_claims[0].disposition.refs = [
      "first.requirement.observe-first",
    ];
    await writeSource(fixture.root, { wrongRequirementTarget: false });
    await writeContract(fixture.workdir, fixture.contract);
    preflight = await runCliFailure(
      fixture.root,
      ["long-task", "preflight", fixture.workdir],
      { env },
    );
    assert.match(
      JSON.stringify(preflight),
      /structured_evidence_sensitivity_required/u,
    );

    fixture.contract.outcomes[1].acceptance.checks[0].artifact_globs = [
      "artifacts/proof.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () =>
        runCli(fixture.root, ["long-task", "compile", fixture.workdir], {
          env,
        }),
      /structured_evidence_sensitivity_required/u,
    );

    const structured = fixture.contract.outcomes[1];
    structured.acceptance.checks[0].runner.target = "tests/oracle.mjs";
    structured.acceptance.checks[0].verification_inputs = ["tests/oracle.mjs"];
    structured.acceptance.counterfactual_controls = [
      {
        key: "remove-second-state",
        binding_key: "state-second",
        claims: [
          "result",
          "requirement.observe-second",
          "obligation.implement-second",
        ],
        check_key: "second-check",
        mutation: { type: "remove_paths", paths: ["src/state.json"] },
        expected_assertion_failures: ["structured-acceptance"],
      },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    const compiled = await runCli(
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      { env },
    );
    assert.equal(compiled.status, "compiled");

    let finalGate = await runCliFailure(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env },
    );
    const invalidUi = finalGate.check_results.find(
      (result) => result.outcome_key === "first",
    );
    assert.equal(invalidUi.status, "invalid_evidence");
    assert.equal(finalGate.workflow_status, "needs_work");

    await writeFile(
      path.join(fixture.root, "src", "ui-mode.json"),
      '"split"\n',
    );
    finalGate = await runCliFailure(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env },
    );
    assert.equal(finalGate.workflow_status, "needs_work");
    const finding = finalGate.check_results
      .flatMap((result) => result.findings)
      .find((item) => item.assertion_key === "structured-acceptance");
    assert.ok(finding);
    assert.deepEqual(finding.claim_keys, [
      "result",
      "requirement.observe-second",
      "obligation.implement-second",
    ]);
    assert.ok(finding.source_claim_keys.includes("second-observable"));
    assert.ok(
      finding.source_claim_keys.includes("second-structured-acceptance"),
    );
    assert.ok(
      finding.source_target_refs.includes(
        "second.requirement.observe-second",
      ),
    );
    assert.ok(
      finding.source_target_refs.includes(
        "second.second-check.structured-acceptance",
      ),
    );
    assert.equal(finding.observation, "result");
    assert.deepEqual(finding.owner_paths, ["src/**"]);

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify(state)}\n`,
    );
    const verified = await runCli(
      fixture.root,
      ["long-task", "verify", fixture.workdir, "--outcome", "second"],
      { env },
    );
    assert.equal(verified.check_results[0].status, "passed");
    assert.notDeepEqual(await readProgressRecords(fixture.workdir), {});
    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env },
    );
    assert.equal(accepted.workflow_status, "machine_accepted");
    const receipt = path.join(
      fixture.workdir,
      ".ty-context",
      "final-receipt.json",
    );
    assert.equal(await pathExists(receipt), true);

    const revisedCriterion =
      "The structured outcome remains observable and implemented.";
    fixture.contract.source_claims.find(
      (claim) => claim.key === "second-structured-acceptance",
    ).statement = revisedCriterion;
    structured.acceptance.checks[0].positive_assertions[0].criterion =
      revisedCriterion;
    await writeSource(fixture.root, {
      wrongRequirementTarget: false,
      structuredCriterion: revisedCriterion,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () =>
        runCli(fixture.root, ["long-task", "compile", fixture.workdir], {
          env,
        }),
      /authority_revision_requires_revise_flag/u,
    );
    await assert.rejects(
      () =>
        runCli(
          fixture.root,
          ["long-task", "compile", fixture.workdir, "--revise"],
          { env },
        ),
      /authority_change_requires_user_decision/u,
    );
    const pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.ok(pending.revision_diff.source_files_changed.includes("source.md"));
    assert.ok(
      pending.revision_diff.reduction_reasons.includes(
        "source_file_content_changed",
      ),
    );
    await runCli(
      fixture.root,
      [
        "long-task",
        "approve-authority-revision",
        fixture.workdir,
        "--revision",
        pending.revision_identity,
      ],
      { env },
    );
    await runCli(
      fixture.root,
      ["long-task", "compile", fixture.workdir, "--revise"],
      { env },
    );
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
    assert.equal(await pathExists(receipt), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(fakeBin, { recursive: true, force: true });
  }
});
