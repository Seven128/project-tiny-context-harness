# Contract Authoring Reference

Read this only while authoring or structurally revising the one `delivery-contract.yaml` Draft.

## Source And Semantic Boundary

- Every declared Source file contains at least one Material Source Item. Mark items in original Markdown without rendering or changing meaning.
- Marker keys and `source_claim` keys are set-equal and globally unique. `statement` preserves marked text after line-ending normalization, surrounding blank-line removal and trailing-space cleanup.
- Typed dispositions keep Result, Requirement, Control, Technical Obligation, Non-completing Claim, Acceptance, Global Constraint/Non-goal, Forbidden Shortcut, Risk, External Confirmation and Decision distinct.
- Every non-decision Source item owns exactly one same-kind, text-identical canonical target; no target may collapse multiple Source items. `out_of_scope` is not a resolution.
- A Source AC maps criterion-identically to one named Assertion and proves at least one independently Source-backed non-Result Claim.
- Missing recommended Source Plan headings or keys never blocks authoring. Missing mandatory Material Source Item markers does.
- `delegated` in a Source Plan is provenance, not a Contract disposition or new Claim kind. An instruction to synthesize, refine, complete, implement or use judgment delegates plan-level authoring, but it does not invent material tradeoff preferences. Before comparative research or a material product, technical, architecture or provider selection, identify the criteria that could change the research scope, candidate set or recommendation. If such a preference is unknown or ambiguous, ask a concise targeted question before research or selection and keep the item `decision_required` until answered; do not impose a fixed questionnaire or re-ask preferences already supplied by the user, Source, Context or controlling constraints.
- Once the material preference envelope is clear, use current authoritative or primary evidence for external capability, price, quota, license, compatibility, region, security posture or support claims. When one defensible recommendation exists, record the authoring instruction, preference/evidence or conservative-default basis and exact added meaning in real Source, then preserve that keyed item as ordinary Source of its semantic kind. If ordinary prose is the Source, append the delegated item without rewriting the user's original text; never place the choice only in Contract YAML.
- A delegated plan choice is not action authorization. Payment, contracting, production deployment/publication, destructive production mutation, real permission grants, sensitive-data transmission and required legal/security/human approval remain named External Confirmations. Conflicting authority, an explicitly user-reserved choice, a missing material preference or the absence of a defensible recommendation remains `decision_required`; high impact or multiple options with known criteria alone does not.

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

## Visual Delivery Authoring

When Source or controlling Context declares a design system, redesign, high-fidelity UI or other material visual result, author it through existing Contract semantics:

- derive a task-local, risk-proportional Visual Coverage Set from declared Source, `project_context/**` and `DESIGN.md`: production surface/route/component, viewport, theme or product mode, interaction/state, content stress and accessibility/motion conditions;
- select representative combinations rather than silently creating a full Cartesian requirement; an omitted combination remains unproven, while Source that explicitly requires full coverage must retain that scope;
- encode each independently falsifiable visual expectation as an atomic Requirement, applicable Control field or named AC Assertion. Name the surface, viewport, theme/state/content condition and observable result when they matter to the claim;
- bind the declared result to the owning Context/`DESIGN.md`, one authored token source and generation direction, production component/route carriers, path envelopes and project-owned browser checks. Detached kits, mocks or marketing specimens may be references but not substitute implementation carriers;
- keep subjective visual direction, taste or approval outside false machine proof. Resolve an undecided direction as `decision_required`; represent required human design or new-baseline approval as an explicit external confirmation.

This guidance adds no visual Schema, Claim kind, risk level, lifecycle state, coverage artifact or Gate. It only makes visual meaning explicit enough for the existing Requirement/Control/Assertion and `ui_browser` mechanisms to verify what was actually declared.

## Compact Authoring

Compact V2 may omit only deterministic defaults: empty optional arrays/nulls, `context_snapshot_mode: referenced`, `requested_level: auto`, runner `argv: []`, `cwd: .`, `timeout_ms: 30000`, `retry_policy: none`, `idempotent: false`, and empty output/artifact/assertion/environment lists.

Goal, Source/Source Claims, Context, observable results, owners/paths, REQ, applicable CTRL states, OBL, proof surfaces, runner targets/effects, verification inputs, Assertions, risk, forbidden shortcuts and external confirmations remain explicit.

Compiler-generated Outcome/Check/Claim identities replace handwritten mechanical cross-entity references. This does not authorize compiler inference of product meaning, owners, architecture, proof or risk.
