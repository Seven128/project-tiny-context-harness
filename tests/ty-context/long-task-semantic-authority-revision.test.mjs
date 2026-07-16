import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  expectDecision,
  prepareSemanticAuthority,
} from "./long-task-semantic-authority-revision-fixture.mjs";

test("Source authority is locked by first compile even before verify", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "source.md"),
      "# Fixture source\n\nRevised before execution.\n",
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "compile",
          fixture.workdir,
          "--revise",
        ]),
      /authority_change_requires_user_decision/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source, Context, Product, Global, and Product Claim changes require exact approval after verify", async () => {
  const fixture = await createDeliveryFixture();
  try {
    prepareSemanticAuthority(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    const sourceFile = path.join(fixture.root, "source.md");
    const contextFile = path.join(
      fixture.root,
      "project_context",
      "areas",
      "main.md",
    );
    const manifestFile = path.join(
      fixture.root,
      "project_context",
      "context.toml",
    );
    const sourceBaseline = await readFile(sourceFile, "utf8");
    const contextBaseline = await readFile(contextFile, "utf8");
    const manifestBaseline = await readFile(manifestFile, "utf8");
    const contractBaseline = structuredClone(fixture.contract);

    await writeFile(sourceFile, `${sourceBaseline}\nChanged after verify.\n`);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    const firstSourcePending = await expectDecision(fixture, {
      field: "source_files_changed",
      includes: "source.md",
      reason: "source_file_content_changed",
    });
    assert.notEqual(
      firstSourcePending.previous_material_hashes.source_hashes_sha256,
      firstSourcePending.next_material_hashes.source_hashes_sha256,
    );
    await runCli(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      firstSourcePending.revision_identity,
    ]);
    await writeFile(
      sourceFile,
      `${sourceBaseline}\nA different post-approval change.\n`,
    );
    const secondSourcePending = await expectDecision(fixture, {
      field: "source_files_changed",
      includes: "source.md",
      reason: "source_file_content_changed",
    });
    assert.notEqual(
      secondSourcePending.revision_identity,
      firstSourcePending.revision_identity,
    );
    await writeFile(sourceFile, sourceBaseline);

    await writeFile(contextFile, `${contextBaseline}\nChanged Context.\n`);
    await expectDecision(fixture, {
      field: "context_files_changed",
      includes: "project_context/areas/main.md",
      reason: "context_authority_changed",
    });
    await writeFile(contextFile, contextBaseline);

    await writeFile(
      manifestFile,
      manifestBaseline.replace('id = "main"', 'id = "main-revised"'),
    );
    const topologyPending = await expectDecision(fixture, {
      field: "context_topology_changed",
      equals: true,
      reason: "context_authority_changed",
    });
    assert.notEqual(
      topologyPending.previous_materials.context_snapshot.topology_sha256,
      topologyPending.next_materials.context_snapshot.topology_sha256,
    );
    await writeFile(manifestFile, manifestBaseline);

    const semanticCases = [
      {
        address: "task.goal",
        mutate(contract) {
          contract.task.goal = "A changed delivery goal.";
        },
      },
      {
        address: "outcomes.first.observable_result",
        mutate(contract) {
          contract.outcomes[0].product.observable_result =
            "A rewritten observable result.";
        },
      },
      {
        address: "outcomes.first.controls.submit.success_state",
        mutate(contract) {
          contract.outcomes[0].product.controls[0].success_state =
            "A changed success state.";
        },
      },
      {
        address: "outcomes.first.controls.submit.failure_state",
        mutate(contract) {
          contract.outcomes[0].product.controls[0].failure_state =
            "A changed failure state.";
        },
      },
      {
        address: "outcomes.first.non_completing.exit-zero-only",
        mutate(contract) {
          contract.outcomes[0].product.non_completing_outcomes[0].statement =
            "A rewritten non-completing condition.";
        },
      },
    ];
    for (const scenario of semanticCases) {
      const candidate = structuredClone(contractBaseline);
      scenario.mutate(candidate);
      await writeContract(fixture.workdir, candidate);
      await expectDecision(fixture, {
        field: "product_semantics_changed",
        includes: scenario.address,
        reason: "product_semantics_changed",
      });
    }

    const globalCandidate = structuredClone(contractBaseline);
    globalCandidate.global.technical.constraints[0].statement =
      "A rewritten global constraint.";
    await writeContract(fixture.workdir, globalCandidate);
    await expectDecision(fixture, {
      field: "global_semantics_changed",
      includes: "global.technical.constraints.stable-runtime",
      reason: "global_semantics_changed",
    });

    const addedClaim = structuredClone(contractBaseline);
    addedClaim.outcomes[0].technical.obligations.push({
      key: "new-product-scope",
      statement: "Implement newly declared product scope.",
      required_proof_surfaces: ["runtime_behavior"],
    });
    addedClaim.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "new-product-scope-proof",
      claims: ["obligation.new-product-scope"],
      observation: "result",
      operator: "equals",
      expected: true,
    });
    await writeContract(fixture.workdir, addedClaim);
    await expectDecision(fixture, {
      field: "product_claims_added",
      includes: "first.obligation.new-product-scope",
      reason: "product_claim_added",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("mechanical proof additions and path tightening remain automatic revisions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests", "extra-input.mjs"),
      "export const extra = true;\n",
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "additional-proof",
      claims: ["result"],
      observation: "result",
      operator: "truthy",
    });
    await writeContract(fixture.workdir, fixture.contract);
    let result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 2);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra-input.mjs",
    );
    await writeContract(fixture.workdir, fixture.contract);
    result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 3);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    fixture.contract.outcomes[0].technical.expected_change_paths = [
      "src/state.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 4);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
