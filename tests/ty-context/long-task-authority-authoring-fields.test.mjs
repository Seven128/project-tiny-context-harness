import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("Requirement, criterion, Source-AC mapping and AC removal remain review authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    const baseline = structuredClone(fixture.contract);

    const removedRequirement = structuredClone(baseline);
    removedRequirement.outcomes[0].product.requirements = [];
    removedRequirement.outcomes[0].acceptance.checks[0].positive_assertions[0].claims =
      ["result", "obligation.implement-first"];
    removedRequirement.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.first-result"],
    };
    removedRequirement.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "The first outcome must be observable.";
    await writeSource(fixture.root, "acceptance");
    await writeContract(fixture.workdir, removedRequirement);
    await expectDecision(fixture, {
      field: "product_claims_removed",
      includes: "first.requirement.observe-first",
      reason: "product_claim_removed",
    });

    const changedCriterion = structuredClone(baseline);
    await writeSource(fixture.root, "requirement");
    changedCriterion.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "A changed readable acceptance criterion.";
    await writeContract(fixture.workdir, changedCriterion);
    await expectDecision(fixture, {
      reason: "acceptance_not_monotonic",
    });

    const changedSourceAcceptance = structuredClone(baseline);
    changedSourceAcceptance.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.first-result"],
    };
    changedSourceAcceptance.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "The first outcome must be observable.";
    await writeSource(fixture.root, "acceptance");
    await writeContract(fixture.workdir, changedSourceAcceptance);
    await expectDecision(fixture, {
      reason: "source_claim_removed_or_changed",
    });

    const replacedAcceptance = structuredClone(baseline);
    replacedAcceptance.outcomes[0].acceptance.checks[0].positive_assertions = [
      {
        ...replacedAcceptance.outcomes[0].acceptance.checks[0]
          .positive_assertions[0],
        key: "replacement-result",
        criterion: "The first outcome must be observable.",
      },
    ];
    replacedAcceptance.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.replacement-result"],
    };
    await writeSource(fixture.root, "acceptance");
    await writeContract(fixture.workdir, replacedAcceptance);
    await expectDecision(fixture, {
      reason: "acceptance_not_monotonic",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeSource(root, kind) {
  await writeFile(
    path.join(root, "source.md"),
    `# Fixture source

<!-- ty-source-item:start key=first-observable kind=${kind} -->
The first outcome must be observable.
<!-- ty-source-item:end -->
`,
  );
}
