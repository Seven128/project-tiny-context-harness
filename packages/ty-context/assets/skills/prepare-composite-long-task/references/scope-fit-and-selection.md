# Scope Fit And Stable SFC Selection

## Purpose

Decide whether the raw request belongs in the strict three-input workflow, then create the smallest stable SFC dependency graph that preserves the user's product outcome. This is semantic work: inspect current Context and code, state assumptions, and do not use implementation convenience to narrow the request.

## Decisions

- `fit_for_three_inputs`: one bounded SFC can carry the request without hiding independent outcomes or unresolved ownership.
- `split_required`: the request contains multiple independently executable or acceptance-distinct SFC outcomes. Emit stable `SFC-###` IDs and dependency edges.
- `blocked_for_decision`: a product, ownership, architecture, scope, or priority choice materially changes the graph or packet.
- `not_long_task`: the request does not justify this composite workflow; recommend the appropriate smaller path without creating a campaign execution entry.

A selected child of `split_required` uses `selected_from_split` in its Product source. IDs are append-only and never renumbered when later facts add, supersede, or block SFCs.

## SFC Decomposition Rules

Each SFC must own one independently reviewable outcome, its boundary, dependencies, non-goals, non-completing outcomes, and acceptance direction. Split when outcomes can fail independently, require materially different owners/surfaces, or need separate Goal evidence. Do not split solely by file, layer, agent, or estimated duration.

Preserve explicit dependency edges. A candidate is dependency-ready only when all prerequisites have an accepted mirrored result. Select the unique highest-priority ready candidate automatically. If multiple same-priority candidates remain, ask the user to choose; do not use array order, filename order, or model preference as a tie-breaker.

Ask one narrow decision question when possible. Record only the chosen answer and its provenance; do not fabricate an answer from adjacent code.

## JSON Shape

Use this structural shape; values remain semantic authoring decisions and the CLI validator is authoritative:

```json
{
  "schema_version": "scope-fit-result-v3",
  "request_sha256": "<request hash>",
  "decision": "fit_for_three_inputs",
  "rationale": ["<source-backed reason>"],
  "sfcs": [{
    "sfc_id": "SFC-001", "stable_key": "<never reused>", "title": "<title>",
    "objective": "<independent outcome>", "depends_on": [], "priority": 1,
    "scope_summary": ["<in scope>"], "out_of_scope": ["<not in scope>"],
    "decisions_required": []
  }],
  "selected_sfc_id": "SFC-001",
  "decision_required": null
}
```

Allowed `decision` values are `fit_for_three_inputs`, `split_required`, `blocked_for_decision`, and `not_long_task`. `selected_sfc_id` is either one real SFC ID or JSON `null`; it is never a union-expression string.

For `blocked_for_decision`, `selected_sfc_id` is `null` and `decision_required` is `{ "decision_id": "...", "question": "...", "candidates": ["SFC-001", "SFC-002"] }`. After the user chooses, publish a new `apply-scope` input with the same stable graph/IDs, `decision: "split_required"`, the chosen `selected_sfc_id`, cleared `decision_required`, and the explicit user answer plus decision ID in `rationale`; clear only the resolved SFC decision. This is the persisted choice/provenance path.

For `not_long_task`, use no SFCs, no selected SFC, and no decision payload. Normally classify this before campaign creation; only persist it when the user explicitly wants an opt-in campaign record.

## Apply And Review

Write the versioned Scope Fit result and graph to an in-root JSON file, then run:

```text
ty-context composite-campaign apply-scope --campaign <path> --input <scope.json>
ty-context composite-campaign next --campaign <path> --json
```

Review stable IDs, edges, statuses, selected candidate, and unresolved decisions before authoring. `next` is read-only. Never treat recommendation, selection, handoff, or a result projection as aggregate campaign completion.
