---
context_role: contract
read_policy: on-demand
---
# Design Resource Handoff Adapter Contract

## Purpose

One design-specific purpose of the Single-Goal Long-Task Workflow—and the corresponding outcome on the default Workflow path—is that Agent implementation, acceptance and testing fully conform to every material UI/UX fact selected design resources explicitly express within their declared scope and conditions.

Open Design HTML, images and prototypes remain the primary visual resources, but passing those artifacts directly to a development Agent or Contract is a lossy interface: layout, control styling, state, interaction, motion, adaptation/input, accessibility and asset meaning may be overlooked, flattened or reinterpreted. `design-resource-authoring` therefore adds a structured textual semantic handoff as part of the selected implementation design-resource set. The shared adapter makes every expressed fact addressable and testable before Long-Task maps it into Source Claims, Controls, project-owned Checks and Final Gate. Facts absent from the selected resources are refined, decided or blocking rather than guessed.

The adapter connects `design-resource-authoring` to both the default Workflow Contract and the Single-Goal Long-Task Workflow; it is not another Design Authority, plan, registry, Gate or acceptance lifecycle.

“Complete conformance” is always bounded by explicit scope and declared conditions. It means every material fact that the selected resources actually express is addressable, consumed and independently falsifiable on the production target. It never means that one static frame implicitly specifies unseen behavior, that aesthetics can be proven universally, or that omitted product rules may be guessed.

## One Shared Handoff

- Exploration and unselected previews remain lightweight and need no handoff file or validator.
- A selected implementation handoff uses one project-native Markdown Source at an arbitrary repository path. It contains readable marked Source Items plus exactly one fenced `design-resource-handoff-v1` YAML block.
- The Markdown file and its immutable repository-local resource snapshots are ordinary Source/verifier inputs. The handoff data is a strict index over them, not a replacement for the resources or their owning product/design Context.
- `ty-context design-resource preflight <handoff.md>` is the one shared fail-closed adapter entry. `design-resource-authoring` runs it before calling an implementation handoff ready; the default Workflow reruns it before UI Authority Closure can authorize fidelity; Long-Task Preflight/Compile reruns it while freezing Source authority.
- No fixed directory, provider, artifact count, one-file-per-control rule or Cartesian screenshot matrix is required. Repeated controls may be represented by one component-family subject when the selected resource truly gives them identical meaning.

## Canonical V1 Meaning

The embedded block records:

- `scope`: one stable scope key, style dependency, in-scope surface keys, necessary context and explicit exclusions;
- `provenance`: provider/version, project/run, capability, agent/model and the verified design-system binding;
- `resources`: stable keys, exact-target/constraint/supporting role, repository path, media type, SHA-256 and editable upstream owner/locator/update route;
- `conditions`: stable keys with platform, viewport, modes, states, content cases, input methods and full/reduced/not-applicable motion;
- `subjects`: stable surface/flow/region/component-family/control/state/asset keys whose material meaning must be accounted for;
- `targets`: selected exact/constraint target keys, resource refs, condition refs and selection basis;
- `evidence`: addressable frame, component-variant, prototype-state/transition, motion, responsive/input, accessibility/semantic, token, asset or annotation evidence within an immutable resource;
- `coverage`: the explicit subject-by-dimension accounting and the Source Items plus project verification methods that carry each claim;
- `acceptance_blockers`: known target-local proof obligations that the consuming workflow must bind rather than dismiss;
- `proposal`: initial-proposal reconciliation status and recoverable path/revision when applicable.

The eight closed coverage dimensions are:

1. `surface_flow`
2. `visual_content`
3. `component_control`
4. `state_interaction`
5. `motion`
6. `adaptation_input`
7. `accessibility`
8. `assets`

Every declared scope surface resolves to an unambiguous surface subject, and stable keys cannot be claimed by two subjects. Every subject/dimension pair appears exactly once after expanding grouped `subject_refs`. Its disposition is exactly one of `covered`, `not_applicable`, `excluded_by_scope`, `decision_required` or `unavailable`. Covered rows require target/condition/evidence/Source-item/verification bindings; referenced design Source Items must be real `requirement`, `control` or `acceptance` facts rather than a non-goal/risk marker. Non-applicable and excluded rows require a source-backed rationale. Decision-required or unavailable rows require a named unresolved reason and make the handoff not ready.

## Fail-Closed Validation

The adapter rejects unknown fields and duplicate/stale keys, path escape, missing files, digest mismatch, unreferenced targets/resources/conditions/evidence, incomplete or overlapping coverage, unsupported evidence/dimension combinations, covered facts without Source Items or verification methods, unresolved coverage and unbound acceptance blockers.

Evidence compatibility prevents category substitution:

- a static frame can carry visible layout/visual/content facts only for its shown condition;
- component variants or prototype states carry only the states they expose;
- state/interaction needs inspectable state or transition/input evidence;
- motion needs a timeline/specification/capture or an explicit prototype transition, including reduced-motion coverage when applicable;
- adaptation/input needs responsive or input-method evidence for the declared conditions;
- accessibility needs semantic/accessibility evidence, not visual resemblance;
- asset integrity proves identity only and never implementation conformance.

The adapter checks semantic completeness and resource integrity; it does not judge visual taste or claim production behavior. Production checks remain project-owned and must independently fail when the implementation violates the declared verification method.

## Default Workflow Consumption

For a selected implementation handoff, the default Workflow:

1. runs shared preflight and stops on every incomplete, stale or unresolved fact;
2. opens the handoff and all affected exact/constraint resources rather than trusting the index alone;
3. reconciles stable subject/target/condition keys through owning Surface/Screen/Control Context and `DESIGN.md`;
4. maps every covered Source Item and verification method into the internal implementation plan and project-owned checks;
5. implements through the real production route/component owner, inspects the first runnable real-entry slice, and verifies only the declared combinations;
6. performs final real-entry Contract Conformance and Context drift checking on the current candidate.

This gives the default path the same design-input semantics as Long-Task without creating Authority Lock, Progress, a Final Gate or another workflow state.

## Long-Task Consumption

For every Contract `design_target`, Long-Task Preflight/Compile requires exactly one V1 handoff target with the same key and interpretation. The Contract target conditions and frozen source paths must equal the handoff target conditions plus its handoff/resource files. The handoff Markdown is real marked `task.source_paths` Source; its resource snapshots and the handoff itself are Check `verification_inputs`.

Every covered handoff Source Item resolves through `source_claims` to product Claims asserted by the target's root-bound conformance Assertion. Every handoff acceptance blocker is present in the owning `surface_binding.acceptance_blockers`. Existing `design_conformance`, interaction trace, target-runtime evidence, Counterfactual sensitivity, revision invalidation and one-snapshot Final Gate remain the proof/lifecycle owners. Resource presence, digest success, `visual_render`, an isolated route or Agent review cannot substitute for those checks.

## Evolution And Ownership

V1 is strict so a newer producer cannot add semantics that an older consumer silently ignores. A future dimension, evidence kind or interpretation requires a versioned parser/validator and corresponding workflow/test changes. Updating an adopted resource follows its recorded editable upstream route, creates a new immutable version/digest and updates owning references; the previous baseline is never overwritten.

Implementation owners are:

- parser, semantic validator, resource-integrity validator and CLI: `packages/ty-context/src/lib/design-resource-handoff-*.ts` and `packages/ty-context/src/commands/design-resource.ts`;
- Long-Task activation binding: `packages/ty-context/src/lib/long-task-design-resource-handoff.ts` called by shared activation validation;
- authoring/consumer guidance: package-managed `design-resource-authoring`, default/engineering/UIUX and `long-task-workflow` Skills;
- deterministic behavior and integration tests: `tests/ty-context/design-resource-handoff.test.mjs` plus Long-Task/default guidance and compiler suites.
