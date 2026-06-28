import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { createPlanProject, validTaskState, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

test("validate-superpowers-state rejects missing or unknown delivery fields", async () => {
  const cases = [
    {
      name: "missing Product delivery scope",
      mutate(state) {
        delete state.delivery.product_architecture_scope.delivery_scope;
      },
      expected: /Product.*delivery_scope/i
    },
    {
      name: "unknown Product delivery scope",
      mutate(state) {
        state.delivery.product_architecture_scope.delivery_scope = "sampled_framework";
      },
      expected: /delivery_scope.*unknown|unknown.*delivery_scope/i
    },
    {
      name: "missing plan item delivery scope",
      mutate(state) {
        delete state.graph.plan_items["PI-001"].delivery_scope;
      },
      expected: /PI-001.*delivery_scope/i
    },
    {
      name: "missing AC acceptance scope",
      mutate(state) {
        delete state.graph.acceptance_criteria["AC-001"].acceptance_scope;
      },
      expected: /AC-001.*acceptance_scope/i
    },
    {
      name: "missing AC full population requirement",
      mutate(state) {
        delete state.graph.acceptance_criteria["AC-001"].full_population_required;
      },
      expected: /AC-001.*full_population_required/i
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = validTaskState();
      item.mutate(state);
      await writeTaskState(root, state);
      const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), item.expected, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("validate-superpowers-state blocks conflicting capability and full-population scope", async () => {
  const cases = [
    {
      name: "system-capability source plus full-population AC",
      mutate(state) {
        state.delivery.product_architecture_scope.delivery_scope = "system_capability_build";
        state.delivery.product_architecture_scope.full_population_required = false;
        state.graph.acceptance_criteria["AC-001"].acceptance_scope = "full_population_operation";
        state.graph.acceptance_criteria["AC-001"].full_population_required = true;
      }
    },
    {
      name: "full-population source plus framework-only plan",
      mutate(state) {
        state.delivery.product_architecture_scope.delivery_scope = "full_population_operation";
        state.delivery.product_architecture_scope.full_population_required = true;
        state.graph.plan_items["PI-001"].delivery_scope = "system_capability_build";
      }
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = validTaskState();
      item.mutate(state);
      await writeTaskState(root, state);
      const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), /scope_conflict_requires_decision/i, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("validate-superpowers-state rejects final completion when full-population evidence is sample-only", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.delivery.product_architecture_scope.delivery_scope = "full_population_operation";
    state.delivery.product_architecture_scope.full_population_required = true;
    state.graph.plan_items["PI-001"].delivery_scope = "full_population_operation";
    state.graph.acceptance_criteria["AC-001"].acceptance_scope = "full_population_operation";
    state.graph.acceptance_criteria["AC-001"].full_population_required = true;
    state.evidence[0].does_not_prove = ["full population operation", "all-interface completion"];
    state.meta.product_goal_complete = true;
    state.final.product_goal_complete = true;
    state.meta.acceptance_target_status = "complete";
    state.final.acceptance_target_status = "complete";
    await writeTaskState(root, state);

    const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /full[- ]population.*does not prove|sample/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
