import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { parseSourceItems } from "../../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Source Item inventory is set-equivalent and statement-continuous", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "source.md"),
      `# Fixture source

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=unmapped kind=technical_obligation -->
The implementation must preserve the declared evidence boundary.
<!-- ty-source-item:end -->
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_item_unmapped:unmapped/u,
    );

    fixture.contract.source_claims[0].key = "unknown-item";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_item_unknown:unknown-item/u,
    );

    fixture.contract.source_claims[0].key = "first-observable";
    fixture.contract.source_claims[0].statement =
      "A weaker rewritten statement.";
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `# Fixture source

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_statement_mismatch:first-observable/u,
    );

    fixture.contract.source_claims[0].statement =
      "The first outcome must be observable.";
    fixture.contract.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.first-result"],
    };
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "A weakened acceptance criterion.";
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `# Fixture source

<!-- ty-source-item:start key=first-observable kind=acceptance -->
The first outcome must be observable.
<!-- ty-source-item:end -->
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_acceptance_criterion_mismatch:first-observable/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("every declared Source file contains at least one Material Source Item", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "background.md"),
      "# Background only\n\nNo delivery authority is marked here.\n",
    );
    fixture.contract.task.source_paths.push("background.md");
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_file_material_item_required:background\.md/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Item markers reject malformed declarations", () => {
  const valid = (key, body = "Requirement text.") => `<!-- ty-source-item:start key=${key} kind=requirement -->
${body}
<!-- ty-source-item:end -->`;
  assert.throws(
    () => parseSourceItems("source.md", `${valid("same")}\n${valid("same")}`),
    /source_item_key_duplicate/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        `<!-- ty-source-item:start key=outer kind=requirement -->
<!-- ty-source-item:start key=inner kind=requirement -->
Inner.
<!-- ty-source-item:end -->
<!-- ty-source-item:end -->`,
      ),
    /source_item_nested_or_overlapping/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        "<!-- ty-source-item:start key=open kind=requirement -->\nOpen.",
      ),
    /source_item_unclosed/u,
  );
  assert.throws(
    () => parseSourceItems("source.md", valid("empty", "  ")),
    /source_item_empty/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        "<!-- ty-source-item:start key=Bad_Key kind=requirement -->\nText.\n<!-- ty-source-item:end -->",
      ),
    /source_item_marker_invalid/u,
  );
});

test("typed Source dispositions preserve Result, Risk, and Non-goal meaning", async () => {
  for (const scenario of ["outcome_result", "risk_fact", "non_goal"]) {
    const fixture = await createDeliveryFixture();
    try {
      const statement =
        scenario === "outcome_result"
          ? "The complete first outcome is observable."
          : scenario === "risk_fact"
            ? "The first outcome is a critical user path."
            : "Legacy fallback is not part of this delivery.";
      await writeFile(
        path.join(fixture.root, "source.md"),
        `# Fixture source

<!-- ty-source-item:start key=first-observable kind=${scenario} -->
${statement}
<!-- ty-source-item:end -->
`,
      );
      fixture.contract.source_claims[0].statement = statement;
      if (scenario === "outcome_result")
        fixture.contract.source_claims[0].disposition = {
          type: "outcome_result",
          ref: "first.result",
        };
      else if (scenario === "risk_fact") {
        fixture.contract.risk.facts.critical_user_path = ["first"];
        fixture.contract.source_claims[0].disposition = {
          type: "risk_fact",
          refs: ["critical_user_path:first"],
        };
      } else {
        fixture.contract.global.product.non_goals.push({
          key: "no-legacy",
          statement,
        });
        const globalCheck = structuredClone(
          fixture.contract.outcomes[0].acceptance.checks[0],
        );
        globalCheck.key = "no-legacy";
        globalCheck.positive_assertions = [];
        globalCheck.negative_assertions = [
          {
            key: "no-legacy",
            criterion: statement,
            claims: ["non_goal.no-legacy"],
            observation: "negative",
            operator: "equals",
            expected: false,
          },
        ];
        fixture.contract.global.acceptance.checks.push(globalCheck);
        fixture.contract.source_claims[0].disposition = {
          type: "global_constraint",
          refs: ["non_goal.no-legacy"],
        };
      }
      await writeContract(fixture.workdir, fixture.contract);
      await assert.doesNotReject(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        scenario,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Source risk_fact must resolve to an actual Contract risk fact", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "risk_fact",
    refs: ["security_boundary_change:first"],
  };
  assert.throws(
    () => parse(contract),
    /source_claim_risk_fact_ref_unknown:first-observable:security_boundary_change:first/u,
  );
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
