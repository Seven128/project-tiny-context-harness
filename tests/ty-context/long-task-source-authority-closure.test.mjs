import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { enrichFinding } from "../../packages/ty-context/dist/lib/long-task-finding-context.js";
import { explainSourceLinks } from "../../packages/ty-context/dist/lib/long-task-explain-source-links.js";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const SOURCE_KIND_BY_TARGET = {
  result: "outcome_result",
  requirement: "requirement",
  control: "control",
  non_completing: "non_completing",
  obligation: "technical_obligation",
  forbidden_shortcut: "forbidden_shortcut",
  global_non_goal: "non_goal",
  global_constraint: "technical_obligation",
  global_forbidden_shortcut: "forbidden_shortcut",
};

test("every non-decision Source item owns exactly one canonical target", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const requirement = fixture.contract.outcomes[0].product.requirements[0];
    fixture.contract.source_claims[0].disposition.refs.push(
      "first.obligation.implement-first",
    );
    await assertPreflightAndCompileReject(
      fixture,
      "source_claim_target_cardinality_invalid",
    );

    fixture.contract.source_claims[0].disposition.refs = [
      "first.requirement.observe-first",
    ];
    fixture.contract.source_claims.push({
      key: "duplicate-owner",
      source_ref: "source.md#fixture-source",
      statement: requirement.statement,
      disposition: {
        type: "claim",
        refs: ["first.requirement.observe-first"],
      },
    });
    await writeSourceItems(fixture.root, [
      {
        key: "first-observable",
        kind: "requirement",
        statement: requirement.statement,
      },
      {
        key: "duplicate-owner",
        kind: "requirement",
        statement: requirement.statement,
      },
    ]);
    await assertPreflightAndCompileReject(
      fixture,
      "source_claim_target_duplicate_owner",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Claim kind and text must match the canonical target", async () => {
  const cases = [
    {
      name: "requirement mapped to obligation",
      mutate(contract) {
        contract.source_claims[0].disposition.refs = [
          "first.obligation.implement-first",
        ];
      },
      code: "source_claim_target_kind_mismatch",
    },
    {
      name: "requirement target text rewritten",
      mutate(contract) {
        contract.outcomes[0].product.requirements[0].statement =
          "A rewritten requirement target.";
      },
      code: "source_claim_target_text_mismatch",
    },
  ];
  for (const scenario of cases) {
    const fixture = await createDeliveryFixture();
    try {
      scenario.mutate(fixture.contract);
      await assertPreflightAndCompileReject(
        fixture,
        scenario.code,
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("first-class Source kinds map to their canonical same-kind targets", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    outcome.product.controls.push({
      key: "submit",
      location: "settings page",
      trigger: "submit",
      input: "valid state",
      loading_state: "shows loading",
      empty_state: "shows empty",
      success_state: "shows success",
      failure_state: "shows error",
      feedback: "announces result",
    });
    outcome.product.non_completing_outcomes.push({
      key: "exit-zero-only",
      statement: "A command exit code alone does not count as completion.",
    });
    outcome.technical.forbidden_shortcuts.push({
      key: "constant-output",
      statement: "A constant success output is forbidden.",
    });
    fixture.contract.global.product.non_goals.push({
      key: "no-legacy",
      statement: "Legacy behavior is not restored.",
    });
    fixture.contract.global.technical.constraints.push({
      key: "stable-runtime",
      statement: "Runtime behavior remains stable.",
    });
    fixture.contract.global.technical.forbidden_shortcuts.push({
      key: "no-fake-evidence",
      statement: "Fake evidence is forbidden.",
    });

    const targetCases = [
      {
        key: "result",
        kind: "outcome_result",
        statement: outcome.product.observable_result,
        disposition: { type: "outcome_result", ref: "first.result" },
      },
      {
        key: "control-location",
        kind: "control",
        statement: "settings page",
        disposition: {
          type: "claim",
          refs: ["first.control.submit.location"],
        },
      },
      {
        key: "non-completing",
        kind: "non_completing",
        statement: "A command exit code alone does not count as completion.",
        disposition: {
          type: "claim",
          refs: ["first.non_completing.exit-zero-only"],
        },
      },
      {
        key: "forbidden-shortcut",
        kind: "forbidden_shortcut",
        statement: "A constant success output is forbidden.",
        disposition: {
          type: "claim",
          refs: ["first.forbidden_shortcut.constant-output"],
        },
      },
      {
        key: "global-non-goal",
        kind: "non_goal",
        statement: "Legacy behavior is not restored.",
        disposition: {
          type: "global_constraint",
          refs: ["non_goal.no-legacy"],
        },
      },
      {
        key: "global-constraint",
        kind: "technical_obligation",
        statement: "Runtime behavior remains stable.",
        disposition: {
          type: "global_constraint",
          refs: ["constraint.stable-runtime"],
        },
      },
      {
        key: "global-forbidden",
        kind: "forbidden_shortcut",
        statement: "Fake evidence is forbidden.",
        disposition: {
          type: "global_constraint",
          refs: ["forbidden_shortcut.no-fake-evidence"],
        },
      },
    ];
    fixture.contract.source_claims = targetCases.map(
      ({ key, statement, disposition }) => ({
        key,
        source_ref: "source.md#fixture-source",
        statement,
        disposition,
      }),
    );
    await writeSourceItems(fixture.root, targetCases);

    for (const testCase of targetCases) {
      const candidate = structuredClone(fixture.contract);
      candidate.source_claims.find(
        (claim) => claim.key === testCase.key,
      ).statement += " rewritten";
      await writeContract(fixture.workdir, candidate);
      const preflight = await preflightDeliveryContract(
        fixture.workdir,
        fixture.root,
      );
      assert.equal(preflight.status, "not_ready", testCase.key);
      assert.ok(
        preflight.diagnostics.some(
          (item) => item.code === "source_claim_target_text_mismatch",
        ),
        testCase.key,
      );
    }

    for (const claim of fixture.contract.source_claims) {
      const targetKind = claim.disposition.type === "outcome_result"
        ? "result"
        : claim.disposition.refs[0].split(".").at(-2) === "location"
          ? "control"
          : targetKindFromReference(claim.disposition.refs[0]);
      assert.equal(
        SOURCE_KIND_BY_TARGET[targetKind],
        targetCases.find((item) => item.key === claim.key).kind,
      );
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Acceptance cannot replace its independently Source-backed Claim", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const criterion = "The exact acceptance scenario passes.";
    const assertion =
      fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions[0];
    assertion.criterion = criterion;
    fixture.contract.source_claims[0] = {
      key: "acceptance-only",
      source_ref: "source.md#fixture-source",
      statement: criterion,
      disposition: {
        type: "acceptance",
        refs: ["first.first-check.first-result"],
      },
    };
    await writeSourceItems(fixture.root, [
      {
        key: "acceptance-only",
        kind: "acceptance",
        statement: criterion,
      },
    ]);
    await assertPreflightAndCompileReject(
      fixture,
      "source_acceptance_without_source_backed_claim",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Acceptance may prove a precisely Source-backed Requirement", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const criterion = "The exact acceptance scenario passes.";
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      criterion;
    fixture.contract.source_claims.push({
      key: "first-acceptance",
      source_ref: "source.md#fixture-source",
      statement: criterion,
      disposition: {
        type: "acceptance",
        refs: ["first.first-check.first-result"],
      },
    });
    await writeSourceItems(fixture.root, [
      {
        key: "first-observable",
        kind: "requirement",
        statement: "The first outcome must be observable.",
      },
      {
        key: "first-acceptance",
        kind: "acceptance",
        statement: criterion,
      },
    ]);
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready");
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Acceptance resolves a Source-backed Global Assertion chain", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configureGlobalSourceAcceptance(fixture, { sourceBacked: true });
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const source = fixture.contract.source_claims.find(
      (claim) => claim.key === "global-acceptance",
    );
    const links = explainSourceLinks(
      fixture.contract,
      compiled.claim_coverage,
      source,
    );
    assert.equal(
      links[0].reference,
      "GLOBAL.no-legacy-check.no-legacy-assertion",
    );
    assert.equal(links[0].scope, "global");
    assert.deepEqual(links[0].source_backed_claims, ["constraint.no-legacy"]);
    assert.deepEqual(links[0].counterfactuals, [
      {
        key: "remove-global-carrier",
        claims: ["constraint.no-legacy"],
        binding_ref: "first.state-first",
        owning_outcome_key: "first",
        expected_assertion_failures: ["no-legacy-assertion"],
      },
    ]);

    const finding = enrichFinding(compiled, {
      code: "assertion_value_mismatch",
      outcome_key: null,
      check_key: "no-legacy-check",
      assertion_key: "no-legacy-assertion",
      claim_keys: ["constraint.no-legacy"],
      criterion: "Every runtime entry rejects legacy fallback.",
      binding_ref: "first.state-first",
      owning_outcome_key: "first",
      owner_paths: ["src/**"],
      message: "Global assertion failed.",
      next_action: "Repair the global assertion.",
    });
    assert.deepEqual(finding.source_claim_keys, [
      "global-acceptance",
      "global-constraint",
    ]);
    assert.deepEqual(finding.source_target_refs, [
      "GLOBAL.no-legacy-check.no-legacy-assertion",
      "constraint.no-legacy",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Source Acceptance rejects unknown, unbacked, cross-scope, and rewritten targets", async () => {
  const scenarios = [
    {
      name: "unknown Global Check",
      sourceBacked: true,
      code: "source_claim_acceptance_ref_unknown",
      mutate(contract) {
        acceptanceSource(contract).disposition.refs = [
          "GLOBAL.unknown-check.no-legacy-assertion",
        ];
      },
    },
    {
      name: "unknown Global Assertion",
      sourceBacked: true,
      code: "source_claim_acceptance_ref_unknown",
      mutate(contract) {
        acceptanceSource(contract).disposition.refs = [
          "GLOBAL.no-legacy-check.unknown-assertion",
        ];
      },
    },
    {
      name: "only a non-Source-backed Global Claim",
      sourceBacked: false,
      code: "source_acceptance_without_source_backed_claim",
      mutate() {},
    },
    {
      name: "Outcome Claim from a Global Assertion",
      sourceBacked: true,
      code: "global_assertion_claim_cross_scope",
      mutate(contract) {
        globalAcceptanceAssertion(contract).claims = [
          "first.requirement.observe-first",
        ];
      },
    },
    {
      name: "criterion rewritten from Source",
      sourceBacked: true,
      code: "source_acceptance_criterion_mismatch",
      mutate(contract) {
        globalAcceptanceAssertion(contract).criterion =
          "A weaker rewritten acceptance criterion.";
      },
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      await configureGlobalSourceAcceptance(fixture, {
        sourceBacked: scenario.sourceBacked,
      });
      scenario.mutate(fixture.contract);
      await assertPreflightAndCompileReject(
        fixture,
        scenario.code,
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function configureGlobalSourceAcceptance(fixture, { sourceBacked }) {
  const constraint = "Global runtime must reject legacy fallback.";
  const criterion = "Every runtime entry rejects legacy fallback.";
  fixture.contract.global.technical.constraints.push({
    key: "no-legacy",
    statement: constraint,
  });
  const check = structuredClone(
    fixture.contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "no-legacy-check";
  check.positive_assertions = [
    {
      key: "no-legacy-assertion",
      criterion,
      claims: ["constraint.no-legacy"],
      observation: "result_copy",
      operator: "equals",
      expected: true,
    },
  ];
  check.negative_assertions = [];
  fixture.contract.global.acceptance.checks.push(check);
  fixture.contract.global.acceptance.counterfactual_controls.push({
    key: "remove-global-carrier",
    binding_ref: "first.state-first",
    claims: ["constraint.no-legacy"],
    check_key: "no-legacy-check",
    mutation: { type: "remove_paths", paths: ["src/state.json"] },
    expected_assertion_failures: ["no-legacy-assertion"],
  });
  if (sourceBacked)
    fixture.contract.source_claims.push({
      key: "global-constraint",
      source_ref: "source.md",
      statement: constraint,
      disposition: {
        type: "global_constraint",
        refs: ["constraint.no-legacy"],
      },
    });
  fixture.contract.source_claims.push({
    key: "global-acceptance",
    source_ref: "source.md",
    statement: criterion,
    disposition: {
      type: "acceptance",
      refs: ["GLOBAL.no-legacy-check.no-legacy-assertion"],
    },
  });
  await writeSourceItems(fixture.root, [
    {
      key: "first-observable",
      kind: "requirement",
      statement: "The first outcome must be observable.",
    },
    ...(sourceBacked
      ? [
          {
            key: "global-constraint",
            kind: "technical_obligation",
            statement: constraint,
          },
        ]
      : []),
    {
      key: "global-acceptance",
      kind: "acceptance",
      statement: criterion,
    },
  ]);
  await writeContract(fixture.workdir, fixture.contract);
}

function acceptanceSource(contract) {
  return contract.source_claims.find(
    (claim) => claim.key === "global-acceptance",
  );
}

function globalAcceptanceAssertion(contract) {
  return contract.global.acceptance.checks
    .find((check) => check.key === "no-legacy-check")
    .positive_assertions.find(
      (assertion) => assertion.key === "no-legacy-assertion",
    );
}

async function assertPreflightAndCompileReject(fixture, code, message = code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready", message);
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `${message}: missing Preflight diagnostic ${code}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
    message,
  );
}

async function writeSourceItems(root, items) {
  await writeFile(
    path.join(root, "source.md"),
    `# Fixture source\n\n${items
      .map(
        (item) =>
          `<!-- ty-source-item:start key=${item.key} kind=${item.kind} -->\n${item.statement}\n<!-- ty-source-item:end -->`,
      )
      .join("\n\n")}\n`,
  );
}

function targetKindFromReference(reference) {
  if (reference.startsWith("GLOBAL.")) return "global_constraint";
  const parts = reference.split(".");
  if (parts[0] === "first") return parts[1];
  return parts[0] === "non_goal"
    ? "global_non_goal"
    : parts[0] === "forbidden_shortcut"
      ? "global_forbidden_shortcut"
      : "global_constraint";
}
