# Scope Fit V4, Source Units, And Maximal SFC Graph

## Purpose

Preserve every delivery-significant plan item, decide whether Composite execution fits, and author one complete stable dependency graph. Scope is semantic: first preserve control/capability-level detail, then maximize each coherent SFC, and only then analyze parallelism.

## Source Unit Inventory And Coverage

The immutable `source-plan.md` is hash-bound. Before Packet authoring, inventory every delivery-significant item as `SRCU-###` with `kind`, statement, cohesion key, owner boundary, acceptance outcome and `SRC-###` references. Supported kinds are `ui_control`, `route`, `api_operation`, `state_transition`, `worker_action`, `data_schema`, `security_rule`, `cli_command`, `migration` and `integration_contract`.

UI units describe owner surface/location, control/action/input, loading/empty/success/failure states, transition, feedback, API/data dependency, permission boundary and acceptance evidence. API units describe endpoint/method, request/response schema, validation, errors, authorization, state effect, caller and evidence. Runtime/worker units describe trigger/input, transition, side effect, retry/failure/recovery, observable output and evidence. Broad labels without these unit details cannot enter authoring.

Every Source Unit has one SFC owner and later one complete chain:

```text
Source Unit -> SFC -> Product Requirement -> PI Obligation -> AC -> Verification Spec
```

Every declared source item in `source-coverage.json` has one disposition: one or more SFCs; a global constraint with applicable SFCs and later requirement/AC/spec bindings; explicit source-backed out-of-scope; or a genuine decision requirement. Uncovered items/units/global constraints block final acceptance.

Scope Fit decisions remain `fit_for_three_inputs` for one complete SFC, `split_required` for multiple legally separated SFCs, `blocked_for_decision` for unresolved product/ownership/architecture meaning, and `not_long_task` when Composite execution is not warranted.

## Maximal SFC Rule

One SFC is the maximum coherent range inside one independently accepted outcome that can produce complete three-input authority at control/capability-unit detail. Extract units, group by acceptance outcome, merge related owner/state/data chains, stop only at a legal separation boundary, verify three-input completeness, then run sibling over-split checks.

The only legal `separation_reasons` are:

- `independent_acceptance_outcome`
- `semantic_dependency`
- `different_owner_or_authority`
- `separate_rollout_or_rollback`
- `unresolved_product_decision`
- `authoring_capacity_exceeded`

File/layer/subagent differences, possible parallelism, duration estimates and model preference are never split reasons. Every SFC in a multi-SFC Campaign declares its real reason. Two non-dependent SFCs with the same cohesion key/outcome and no owner, rollback, decision or proven capacity boundary fail as `over_split_sfc`.

## Capacity And Stable Evolution

Do not predict a small token threshold. First attempt the maximal Packet, then at most two same-thread repair Turns. Capacity splitting is allowed only for observed truncation, structured-output failure, repeated scope-related undefined fields, actual package file limits or inability to preserve complete Source Unit mapping. The revised graph must cite matching evidence, keep existing Source Units immutable, keep/never renumber existing `SFC-###` IDs and stable keys, append new IDs, split only the affected range and preserve complete coverage.

Graph revisions are allowed only before the first Slice Goal. Once any Goal exists, Scope Fit is permanently frozen.

## Graph And Scheduling

Each SFC records objective, source/unit refs, scope/non-goals, priority, semantic dependencies, produced/consumed contracts, conflict domains, resource locks, migration sequences, generated artifacts, package-manager manifests and environment profiles. Reject self/cyclic/dangling dependencies, duplicate stable keys, missing contract edges, uncovered refs and invalid separation evidence.

Ready means every dependency is `integration_verified`. Packet preflight derives concrete conflicts. Explicit dependencies, contract direction, write/write, write/read, contract keys, resource locks, Context owners, conflict domains, Source Unit cohesion, migration sequences, generated artifacts, package manifests and environment profiles serialize work. Unknown evidence defaults to serial. Stable priority/key/ID ordering selects a maximum conflict-free wave of at most four. Parallelism never changes Scope Fit.

Publish the complete V4 graph and coverage with `apply-scope`, then use `run` for execution. Do not author a Packet outside the returned ready frontier.
