import assert from "node:assert/strict";
import test from "node:test";

import { buildReviewPayload, suggestLabels } from "../src/label-routing/suggest-labels.mjs";

test("suggests labels with reasons from issue text", () => {
  assert.deepEqual(suggestLabels({ title: "Docs example is unclear", body: "How do I configure this?" }), [
    { label: "documentation", reason: "Issue text asks for documentation or examples." },
    { label: "question", reason: "Issue text asks for clarification." }
  ]);
});

test("builds an advisory-only review payload without an apply URL", () => {
  const payload = buildReviewPayload({
    number: 42,
    title: "Crash on startup",
    body: "The app throws an exception."
  });

  assert.equal(payload.issueNumber, 42);
  assert.equal(payload.advisoryOnly, true);
  assert.equal(payload.applyUrl, null);
  assert.deepEqual(payload.suggestedLabels, [{ label: "bug", reason: "Issue text describes broken behavior." }]);
});

