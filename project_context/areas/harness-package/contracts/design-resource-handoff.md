---
context_role: contract
read_policy: on-demand
---
# Design Resource Handoff Adapter Contract

## Purpose

One design-specific purpose of the Single-Goal Long-Task Workflow—and the corresponding outcome on the default Workflow path—is that Agent implementation, acceptance and testing fully conform to every material UI/UX fact selected design resources explicitly express within their declared scope and conditions.

Open Design remains the default generation engine, and HTML, images, prototypes, specifications and human-authored resources remain valid ordinary Source. Direct inspection alone is a lossy interface: an Agent can overlook, flatten or reinterpret layout, control styling, state, interaction, motion, adaptation/input, accessibility and asset meaning. A structured handoff closes category-level omissions, but manually transcribing facts that a native design source already exposes adds cost and another drift opportunity.

The selected hybrid path therefore separates two responsibilities. When Figma-native input is operational and materially useful, it supplies high-density addressable facts from exact versioned nodes—layout, dimensions, component/variant structure, variables/styles, annotations, screenshots, applicable motion/assets and Code Connect mappings—and those facts are frozen into repository-readable immutable resources. The provider-neutral `design-resource-handoff-v1` remains the residual semantic and coverage adapter: it references rather than retypes those native facts, closes scope/conditions/gaps and non-native product semantics, and binds every covered fact to Source Items, production ownership and project verification. Long-Task then maps that meaning into Source Claims, applicable Controls/`surface_bindings`, independently falsifiable Checks and Final Gate. Facts absent from the selected native resources and residual handoff are refined, decided or blocking rather than guessed.

The adapter connects `design-resource-authoring` to both the default Workflow Contract and the Single-Goal Long-Task Workflow; it is not another Design Authority, plan, registry, Gate or acceptance lifecycle.

“Complete conformance” is always bounded by explicit scope and declared conditions. It means every material fact that the selected resources actually express is addressable, consumed and independently falsifiable on the production target. It never means that one static frame implicitly specifies unseen behavior, that aesthetics can be proven universally, or that omitted product rules may be guessed.

## One Shared Handoff

- Exploration and unselected previews remain lightweight and need no handoff file or validator.
- A selected implementation handoff uses one project-native Markdown Source at an arbitrary repository path. It contains readable marked Source Items plus exactly one fenced `design-resource-handoff-v1` YAML block.
- The Markdown file and its immutable repository-local resource snapshots are ordinary Source/verifier inputs. For Figma-native targets, those snapshots preserve exact file version, node/property locators and extracted native facts while the mutable Figma file remains the separately recorded editable upstream. The handoff data is a strict residual index over them, not a replacement for the resources or their owning product/design Context.
- `ty-context design-resource preflight <handoff.md>` is the one shared fail-closed adapter entry. `design-resource-authoring` runs it before calling an implementation handoff ready; the default Workflow reruns it before UI Authority Closure can authorize fidelity; Long-Task Preflight/Compile reruns it while freezing Source authority.
- No fixed directory, mandatory live provider, artifact count, one-file-per-control rule or Cartesian screenshot matrix is required. Repeated controls may be represented by one component-family subject when the selected resource truly gives them identical meaning.

## Optional Figma-Native Producer Profile

Figma is selected only when native editability/inspection, component-library reuse or organizational handoff materially benefits the bounded scope and the connector, authentication and required read/export capabilities are operational. A listed plugin, catalogue entry or remembered tool name is not capability proof, and Tiny Context never installs or authenticates a provider as an implicit side effect.

For each selected Figma target:

1. record the exact file identity, immutable version, selected node IDs, selection basis and declared conditions;
2. acquire bounded logical slices rather than one undifferentiated large canvas: inspect metadata first, then exact-node design context, variables/styles and a screenshot; retrieve motion context, downloadable assets and Code Connect mappings only when applicable and available;
3. prefer source structure that exposes intent—Components/Variants, Variables or token mappings, Auto Layout, semantic layer/component names and Annotations/dev resources—while marking unavailable plan-dependent capabilities honestly;
4. treat truncated/oversized output, rate-limit failure, missing version/node identity, unreadable resources, stale capture and incomplete tool results as blocking for affected claims;
5. preserve a repository-readable immutable capture and SHA-256 identity with addressable node/property locators; keep editable upstream owner/locator/update/export route separate so recovery and Final Gate never depend on live permissions, network access, rate limits or mutable latest state.

The Figma profile is a producer/consumption convention over V1, not a new parser schema. Existing evidence kinds already represent frame, component variant, prototype state/transition, motion, responsive/input/accessibility/semantic, token, asset and annotation facts. The residual handoff must not duplicate native numeric/style facts merely to be “complete”; it must make them addressable and cover them, while supplying what Figma does not reliably own: scope/exclusions, declared conditions, `not_applicable` versus missing, business/data/permission/recovery meaning, accessibility/input/motion not actually modeled, unresolved/unavailable items, acceptance blockers, Source Item bindings and project verification methods.

## Canonical V1 Meaning

The embedded block records:

- `scope`: one stable scope key, style dependency, in-scope surface keys, necessary context and explicit exclusions;
- `provenance`: provider/version, project/run, capability, agent/model and the verified design-system binding; Figma-native use additionally preserves exact file version and selected node identity in readable resource/evidence locators;
- `resources`: stable keys, exact-target/constraint/supporting role, repository path, media type, SHA-256 and editable upstream owner/locator/update route; a live Figma locator never substitutes for the repository-readable immutable resource;
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

Evidence compatibility prevents category and provider substitution:

- a static frame can carry visible layout/visual/content facts only for its shown condition;
- Figma metadata, a mutable link, a flattened screenshot/export relabeled as native or an oversized/truncated response cannot establish complete native coverage;
- component variants or prototype states carry only the states they expose;
- state/interaction needs inspectable state or transition/input evidence;
- motion needs a timeline/specification/capture or an explicit prototype transition, including reduced-motion coverage when applicable;
- adaptation/input needs responsive or input-method evidence for the declared conditions;
- accessibility needs semantic/accessibility evidence, not visual resemblance;
- asset integrity proves identity only and never implementation conformance.

The adapter checks semantic completeness and immutable resource integrity; provider connection, extraction and export success remain authoring facts only. It does not judge visual taste or prove production conformance. Production checks remain project-owned and must independently fail when the implementation violates the declared verification method.

## Default Workflow Consumption

For a selected implementation handoff, the default Workflow:

1. runs shared preflight and stops on every incomplete, stale or unresolved fact;
2. opens the handoff and all affected immutable exact/constraint resources rather than trusting the index or a live Figma link alone;
3. reconciles stable subject/target/condition keys through owning Surface/Screen/Control Context and `DESIGN.md`;
4. maps every covered Source Item and verification method into the internal implementation plan and project-owned checks;
5. implements through the real production route/component owner, inspects the first runnable real-entry slice, and verifies only the declared combinations;
6. performs final real-entry Contract Conformance and Context drift checking on the current candidate.

This gives the default path the same design-input semantics as Long-Task without creating Authority Lock, Progress, a Final Gate or another workflow state.

## Long-Task Consumption

For every Contract `design_target`, Long-Task Preflight/Compile requires exactly one V1 handoff target with the same key and interpretation. The Contract target conditions and frozen source paths must equal the handoff target conditions plus its handoff/resource files. The handoff Markdown is real marked `task.source_paths` Source; its resource snapshots and the handoff itself are Check `verification_inputs`.

Every covered native or residual-handoff Source Item resolves through `source_claims` to product Claims asserted by the target's root-bound conformance Assertion, with applicable Controls retained through `surface_bindings`. Every handoff acceptance blocker is present in the owning `surface_binding.acceptance_blockers`. Existing `design_conformance`, interaction trace, target-runtime evidence, Counterfactual sensitivity, revision invalidation and one-snapshot Final Gate remain the proof/lifecycle owners. Connector/extraction success, resource presence, digest success, `visual_render`, an isolated route or Agent review cannot substitute for those checks.

## Evolution And Ownership

V1 is strict so a newer producer cannot add semantics that an older consumer silently ignores. The Figma-native profile uses current V1 resources/evidence and adds no provider-specific field. A future dimension, evidence kind or interpretation—not merely a changed Figma tool name, plan or transport—requires a versioned parser/validator and corresponding workflow/test changes. Updating an adopted resource follows its recorded editable upstream route, creates a new immutable version/digest and updates owning references; the previous baseline is never overwritten.

Implementation owners are:

- parser, semantic validator, resource-integrity validator and CLI: `packages/ty-context/src/lib/design-resource-handoff-*.ts` and `packages/ty-context/src/commands/design-resource.ts`;
- Long-Task activation binding: `packages/ty-context/src/lib/long-task-design-resource-handoff.ts` called by shared activation validation;
- Figma-native acquisition/freeze guidance: package-managed `design-resource-authoring/references/figma-native-handoff.md`;
- authoring/consumer guidance: package-managed `design-resource-authoring`, default/engineering/UIUX and `long-task-workflow` Skills;
- deterministic behavior and integration tests: `tests/ty-context/figma-native-design-input-oracle.mjs`, design-resource authoring/provider/parity tests, `tests/ty-context/design-resource-handoff.test.mjs` and Long-Task/default guidance/compiler suites.
