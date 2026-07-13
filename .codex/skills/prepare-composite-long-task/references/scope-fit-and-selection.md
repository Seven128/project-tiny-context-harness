# Scope Fit V3, Source Coverage, And Stable SFC Graph

## Purpose

Preserve every delivery-significant item in the discussed plan, decide whether Composite execution fits, and author one complete stable dependency graph. Inspect current Context/code, state assumptions, and never narrow the source because an implementation shortcut is convenient.

## Source Coverage

The exact `source-plan.md` is immutable and hash-bound. Build `source-coverage.json` before Packet authoring. Every declared source item has one disposition:

- one or more SFC IDs;
- one global constraint with explicit applicable SFCs and later requirement/AC/spec bindings;
- explicit out-of-scope with source-backed reason; or
- a genuine decision requirement.

Uncovered items and global constraints block Campaign final acceptance. The CLI proves coverage of declared source items; the authoring review remains responsible for not omitting meaningful plan items from the inventory.

## Scope Fit Decisions

- `fit_for_three_inputs`: one bounded SFC carries the plan without hiding independent outcomes.
- `split_required`: multiple independently executable or acceptance-distinct SFCs are required.
- `blocked_for_decision`: product, ownership, architecture or scope meaning materially changes the graph.
- `not_long_task`: the source does not justify Composite execution.

Stable `SFC-###` IDs and stable keys are append-only and never renumbered or reused. Split by independently reviewable outcomes, not merely file, layer, agent or duration.

## Complete Graph

Each SFC records objective, source refs, scope/non-goals, priority, real semantic `depends_on`, produced/consumed contracts, conflict domains and resource locks. Each global constraint records its applicable SFCs and acceptance bindings. Reject self/cyclic/dangling dependencies, duplicate stable keys, uncovered source refs and missing constraint targets.

`depends_on` is semantic, not a scheduling suggestion. A consumed contract requires its producer to precede the consumer. Lack of an edge is not proof of parallel safety.

Scope Fit may emit `parallel_candidate` or `serial_required` hints from owner surfaces, expected modules, contracts and locks. They are advisory. Final wave placement is computed only after Packet preflight from concrete bindings and resources.

## Scheduling Semantics

Ready means every dependency is `integration_verified`. For the ready frontier, CLI builds pairwise conflict reasons and uses stable `priority`, `stable_key`, `slice_id` order to choose the largest conflict-free set up to the resource/concurrency cap. Unknown conflict defaults to serial. Equal priority never asks the user.

Publish the complete V3 graph and coverage with `apply-scope`, then review `status --json`. Do not author a Packet while its SFC is not in the returned ready frontier.
