# Contract Authoring Reference

Read this only while authoring or structurally revising the one `delivery-contract.yaml` Draft.

## Source And Semantic Boundary

- Every declared Source file contains at least one Material Source Item. Mark items in original Markdown without rendering or changing meaning.
- Marker keys and `source_claim` keys are set-equal and globally unique. `statement` preserves marked text after line-ending normalization, surrounding blank-line removal and trailing-space cleanup.
- Typed dispositions keep Result, Requirement, Control, Technical Obligation, Non-completing Claim, Acceptance, Global Constraint/Non-goal, Forbidden Shortcut, Risk, External Confirmation and Decision distinct.
- Every non-decision Source item owns exactly one same-kind, text-identical canonical target; no target may collapse multiple Source items. `out_of_scope` is not a resolution.
- A Source AC maps criterion-identically to one named Assertion and proves at least one independently Source-backed non-Result Claim.
- Missing recommended Source Plan headings or keys never blocks authoring. Missing mandatory Material Source Item markers does.

## Outcome Boundary

Create an Outcome only when its result is independently observable, decidable, target-verifiable, dependency-expressible and localizable to its own Claims, Assertions, Checks and owner boundary. Requirement coupling, dependency-ready work, targeted verification, precise failure localization, semantic resume and stale-result invalidation are valid reasons to decompose. File count, implementation layer, context length, desired parallelism and Agent capacity are not.

For every Outcome declare:

- one complete observable result;
- atomic requirements and actually applicable controls/states;
- non-completing claims;
- owner Context/surfaces and expected/support/forbidden path envelopes;
- stable technical obligations, Bindings, forbidden shortcuts and recovery requirements;
- risk facts;
- executable Checks and named AC Assertions.

Global non-goals, constraints and forbidden shortcuts remain Global authority and use Global Checks/Assertions when machine proof is required.

## Architecture Closure

Architecture protection is risk-triggered and project-specific. Use it when the delivery declares module ownership, unique source of truth, dependency direction, API/schema/data boundary, state lifecycle, persistence/recovery, security boundary, compatibility/migration or a forbidden bypass.

Represent the invariant with existing Contract fields:

1. a Source-backed technical obligation, global constraint or forbidden shortcut;
2. owner Context and expected/support/forbidden paths;
3. a Binding to the implementation carrier when Counterfactual sensitivity is required;
4. a project-owned executable architecture check, such as the repository's lint, AST, dependency or contract test;
5. a separate Assertion when functional behavior could pass while the architecture invariant fails.

Do not encode subjective “clean architecture” or generic quality prose as machine authority. If no reliable observation can falsify it, keep it as durable Context/review judgment or return `decision_required`. Harness routes the repository's architecture check; it does not become a language-generic dependency analyzer.

## Compact Authoring

Compact V2 may omit only deterministic defaults: empty optional arrays/nulls, `context_snapshot_mode: referenced`, `requested_level: auto`, runner `argv: []`, `cwd: .`, `timeout_ms: 30000`, `retry_policy: none`, `idempotent: false`, and empty output/artifact/assertion/environment lists.

Goal, Source/Source Claims, Context, observable results, owners/paths, REQ, applicable CTRL states, OBL, proof surfaces, runner targets/effects, verification inputs, Assertions, risk, forbidden shortcuts and external confirmations remain explicit.

Compiler-generated Outcome/Check/Claim identities replace handwritten mechanical cross-entity references. This does not authorize compiler inference of product meaning, owners, architecture, proof or risk.
