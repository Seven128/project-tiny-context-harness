import test from "node:test";
import assert from "node:assert/strict";
import { validateScopeFitResultV1 } from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import {
  blockedScopeFitFixture,
  fittedScopeFitFixture,
  notLongTaskScopeFitFixture,
  scopeFitFixture,
  scopeSlice
} from "./composite-campaign-schema-fixtures.mjs";

export function registerScopeSchemaCases() {
  test("Scope Fit enforces exact decisions, stable slice identities, references, and a DAG", () => {
    assert.throws(() => validateScopeFitResultV1({ ...scopeFitFixture(), future: true }), /unknown key.*future/i);
    assert.throws(() => validateScopeFitResultV1({ ...scopeFitFixture(), decision: "selected_from_split" }), /decision/i);
    assert.throws(() => validateScopeFitResultV1({ ...scopeFitFixture(), selected_slice_id: "SFC-999" }), /selected_slice_id|unknown/i);

    const duplicateStableKey = scopeFitFixture();
    duplicateStableKey.slices[1].stable_key = duplicateStableKey.slices[0].stable_key;
    assert.throws(() => validateScopeFitResultV1(duplicateStableKey), /stable_key|duplicate/i);
    const duplicateSliceId = scopeFitFixture();
    duplicateSliceId.slices[1].slice_id = "SFC-001";
    assert.throws(() => validateScopeFitResultV1(duplicateSliceId), /slice_id|duplicate/i);
    const dangling = scopeFitFixture();
    dangling.slices[1].depends_on = ["SFC-999"];
    assert.throws(() => validateScopeFitResultV1(dangling), /depends_on.*SFC-999|unknown.*SFC-999/i);
    const cycle = scopeFitFixture();
    cycle.slices[0].depends_on = ["SFC-002"];
    assert.throws(() => validateScopeFitResultV1(cycle), /cycle/i);
    const selfDependency = scopeFitFixture();
    selfDependency.slices[0].depends_on = ["SFC-001"];
    assert.throws(() => validateScopeFitResultV1(selfDependency), /self|cycle|depends_on/i);
    const nonReadySelection = scopeFitFixture();
    nonReadySelection.selected_slice_id = "SFC-002";
    assert.throws(() => validateScopeFitResultV1(nonReadySelection), /selected.*dependency|dependency.ready|depends_on/i);
    const unresolvedSelected = scopeFitFixture();
    unresolvedSelected.slices[0].decisions_required = ["Choose a durable owner."];
    assert.throws(() => validateScopeFitResultV1(unresolvedSelected), /selected.*decision|decisions_required/i);

    const blocked = blockedScopeFitFixture();
    assert.deepEqual(validateScopeFitResultV1(blocked), blocked);

    const mixedTie = blockedScopeFitFixture();
    mixedTie.slices[1].decisions_required = ["decision-owner"];
    mixedTie.decision_required.decision_id = "choose-frontier-slice";
    assert.deepEqual(validateScopeFitResultV1(mixedTie), mixedTie);

    const remainingInternalDecision = structuredClone(mixedTie);
    remainingInternalDecision.decision_required = {
      decision_id: "decision-owner",
      question: "Which durable owner should SFC-002 use?",
      candidates: ["SFC-002"]
    };
    assert.deepEqual(
      validateScopeFitResultV1(remainingInternalDecision, {
        acceptedSliceIds: new Set(),
        terminalSliceIds: new Set(["SFC-001"])
      }),
      remainingInternalDecision
    );
    const badCandidate = blockedScopeFitFixture();
    badCandidate.decision_required.candidates = ["SFC-999"];
    assert.throws(() => validateScopeFitResultV1(badCandidate), /candidate.*SFC-999|unknown.*SFC-999/i);
    const nonReadyCandidate = blockedScopeFitFixture();
    nonReadyCandidate.slices[1].depends_on = ["SFC-001"];
    assert.throws(() => validateScopeFitResultV1(nonReadyCandidate), /candidate.*dependency|dependency.ready|depends_on/i);
    const uniqueCandidate = blockedScopeFitFixture();
    uniqueCandidate.slices[1].priority = 2;
    assert.throws(() => validateScopeFitResultV1(uniqueCandidate), /blocked_for_decision|unique.*candidate|auto.select/i);

    const unresolved = scopeFitFixture();
    unresolved.decision = "blocked_for_decision";
    unresolved.selected_slice_id = null;
    unresolved.slices[0].decisions_required = ["decision-owner"];
    unresolved.decision_required = {
      decision_id: "decision-owner",
      question: "Which durable owner should this slice use?",
      candidates: ["SFC-001"]
    };
    assert.deepEqual(validateScopeFitResultV1(unresolved), unresolved);
    const mismatchedDecision = structuredClone(unresolved);
    mismatchedDecision.decision_required.decision_id = "decision-unrelated";
    assert.throws(
      () => validateScopeFitResultV1(mismatchedDecision),
      /decision_id|decisions_required|candidate.*decision/i
    );

    assert.deepEqual(validateScopeFitResultV1(fittedScopeFitFixture()), fittedScopeFitFixture());
    assert.deepEqual(validateScopeFitResultV1(notLongTaskScopeFitFixture()), notLongTaskScopeFitFixture());
    const fittedWithTwo = fittedScopeFitFixture();
    fittedWithTwo.slices.push(scopeSlice("SFC-002", "extra", [], 2, "Extra"));
    assert.throws(() => validateScopeFitResultV1(fittedWithTwo), /fit_for_three_inputs|exactly one|slice/i);
    const notLongWithSlice = notLongTaskScopeFitFixture();
    notLongWithSlice.slices.push(scopeSlice("SFC-001", "unexpected", [], 1, "Unexpected"));
    assert.throws(() => validateScopeFitResultV1(notLongWithSlice), /not_long_task|no slices|slice/i);
  });

  test("Scope Fit rejects unsafe integer identities", () => {
    const unsafe = scopeFitFixture();
    unsafe.slices[0].priority = Number.MAX_SAFE_INTEGER + 1;
    assert.throws(() => validateScopeFitResultV1(unsafe), /priority|safe integer/i);
  });

  test("Scope Fit rejects sparse string arrays instead of silently skipping holes", () => {
    const sparseRationale = scopeFitFixture();
    sparseRationale.rationale = new Array(1);
    assert.throws(
      () => validateScopeFitResultV1(sparseRationale),
      /rationale.*(?:sparse|missing|hole|array of strings)/i
    );

    const sparseOrdinaryField = scopeFitFixture();
    sparseOrdinaryField.slices[0].scope_summary = ["first", , "third"];
    assert.throws(
      () => validateScopeFitResultV1(sparseOrdinaryField),
      /scope_summary.*(?:sparse|missing|hole|array of strings)/i
    );
  });
}
