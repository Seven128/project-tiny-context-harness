# Figma-Native Design Resource Input — Delivery Source

Status: selected implementation Source
Decision date: 2026-07-24
Scope: Tiny Context design-resource authoring, default Workflow consumption, Single-Goal Long-Task consumption, public guidance, durable Context and source-workspace authoring rules.

## User intent and selected direction

The user selected a hybrid design-resource input model: introduce Figma as an optional native, high-density UI/UX fact source while retaining the structured handoff for meaning that Figma cannot reliably express and for the downstream Source/Contract/verification bindings that Figma does not own. The implementation must use current Figma best practices, update the complete design-purpose causal chain, add a general authoring rule for information-complete and causally rigorous design-thinking/design-purpose changes when existing guidance is insufficient, and prove the result through the real Single-Goal Long-Task Workflow.

## Material Source Items

<!-- ty-source-item:start key=figma-native-input-result kind=outcome_result -->
Tiny Context exposes one coherent, provider-neutral design-resource path in which an operational Figma-native source can carry addressable UI/UX facts, the structured handoff closes residual semantics and downstream bindings, and both default and Long-Task consumers can recover and verify the selected meaning without guessing.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-native-selection kind=requirement -->
Figma-native input is optional and is selected when editable collaboration, native inspectability, component/library reuse or organizational Figma handoff materially benefits the scoped request and the required connector, authentication and read/export capabilities are operational; Figma is never a universal prerequisite and Open Design remains the default generation engine.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-native-acquisition kind=requirement -->
For a selected Figma source, authoring pins the exact file identity, immutable version and selected node IDs plus declared conditions, then uses bounded small-node acquisition: inspect metadata first, retrieve exact-node design context, variables/styles and a screenshot, and retrieve motion context, assets and Code Connect mappings when applicable instead of requesting an undifferentiated large canvas.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-native-authoring-quality kind=requirement -->
Applicable Figma resources use reusable Components and Variants, Variables or token mappings, Auto Layout, semantic layer/component names, Annotations or development resources for non-obvious intent, and Code Connect when it is available and materially maps design components to repository implementations; unavailable plan-dependent capabilities remain explicit rather than fabricated.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-native-freeze kind=requirement -->
Every selected Figma target has a repository-readable immutable capture with exact provenance, addressable node or property locators and SHA-256 identity while its editable upstream owner, locator and update route remain separate; mutable latest-only links, missing version or node identity, truncated or oversized extraction, unreadable inputs, stale captures and incomplete tool results fail closed for affected fidelity claims.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=residual-structured-handoff kind=requirement -->
The provider-neutral design-resource-handoff-v1 remains mandatory for a selected implementation handoff and accounts for all eight existing coverage dimensions, but it references rather than manually retypes addressable Figma-native facts; it additionally owns scope and exclusions, declared conditions, not-applicable versus missing meaning, product/data/permission/recovery semantics, accessibility/input/motion not actually modeled, unresolved or unavailable facts, acceptance blockers, Source Item bindings and project verification methods.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-downstream-proof-chain kind=requirement -->
Every covered Figma-native or residual-handoff fact follows the existing chain from immutable selected resource and handoff coverage through Context-reachable target authority, Source Claims and applicable Controls or surface_bindings into production owners and independently failing design_conformance, interaction, target-runtime and Final Gate evidence; connector success, extraction success, resource integrity, a screenshot or Agent review never proves production conformance.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=design-purpose-causal-chain kind=requirement -->
PROJECT_SPEC, durable Context, package-managed workflow guidance and English/Chinese public documentation describe the complete causal chain and boundary: why direct visual inspection is lossy, what Figma improves, what the residual handoff still supplies, how immutable capture permits deterministic recovery, how Contract bindings preserve meaning, how production evidence falsifies implementation drift, and why the hybrid path improves authoring cost and fidelity without adding a second authority.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=design-rationale-authoring-rule kind=requirement -->
The source-workspace harness authoring Skill requires changes to design-purpose, design-thinking or mechanism-rationale documentation and Context to remain information-complete and causally rigorous by naming the problem and purpose, inputs and transformation, authority and ownership, downstream consumption and proof, fail-closed limits, costs or alternatives, and every indexed surface that must stay aligned.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=provider-neutral-extension kind=technical_obligation -->
Implement Figma as an optional producer and consumption profile over the existing provider-neutral handoff and workflow owners, without a Figma-specific schema version, Resource Pack, provider registry, persistent readiness state, Claim kind, Authority, Gate or acceptance lifecycle.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-native-workflow-verification kind=acceptance -->
One project-owned executable oracle and the existing focused suites must fail when the Figma-native guidance, residual handoff boundary, design-purpose causal chain, authoring-quality rule or managed/generated/package parity is absent or contradictory, and must pass together on the current candidate.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-link-only-or-conformance-substitution kind=forbidden_shortcut -->
Do not treat one mutable Figma URL, a flattened screenshot or export relabeled as native Figma, a metadata-only response, a provider success signal, a handoff preflight pass or a resource digest as complete UI/UX input or production acceptance.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-mandatory-live-figma kind=non_goal -->
This delivery does not require installing or authenticating a Figma connector, make live Figma availability a consumer runtime dependency, replace Open Design or human design workflows, or require every selected design resource to originate in Figma.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=figma-input-critical-path kind=risk_fact fact=critical_user_path outcome=figma-native-input -->
The Figma-native-to-handoff-to-Contract path is a critical authoring and acceptance path because silent loss or substitution of selected UI/UX facts would defeat the stated design purpose even when files and ordinary tests remain present.
<!-- ty-source-item:end -->

## Official Figma research basis

The implementation guidance is based on Figma's official developer documentation as retrieved on 2026-07-24:

| Official source | Decision-relevant fact |
| --- | --- |
| [Figma MCP server](https://developers.figma.com/docs/figma-mcp-server/) | The remote MCP server is the broadest current integration surface; connector availability, authentication and product limits remain operational preconditions rather than package guarantees. |
| [Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) | Native inspection is decomposed across design context, metadata, variables, screenshots, motion, assets and Code Connect tools; tool names must be feature-detected. |
| [Structure your Figma file](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/) | Components, Variables, semantic naming, Auto Layout, Annotations/dev resources and Code Connect improve the fidelity and interpretability of generated implementation context. |
| [Avoid large frames](https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/) | Large undifferentiated selections can time out, truncate or lose context; inspect logical components or small node sets. |
| [Code Connect](https://developers.figma.com/docs/code-connect/) | Code Connect maps design components to real implementation components, but availability depends on eligible seats/plans and therefore cannot be assumed. |
| [REST file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/) | File/node reads can be pinned to an explicit file version and node IDs, supporting stable capture and addressable provenance. |
| [REST API rate limits](https://developers.figma.com/docs/rest-api/rate-limits/) | Limits vary by plan, seat and endpoint; bounded requests, caching and explicit 429 handling are necessary operational behavior. |
| [Trigger specific MCP tools](https://developers.figma.com/docs/figma-mcp-server/trigger-specific-tools/) | Agent tool choice is not guaranteed; authoring guidance should explicitly route required native facts to the corresponding tool class. |

## Architecture and lifecycle decision

The current provider-neutral adapter already has the evidence vocabulary needed for Figma-native facts: frames, component variants, prototype states/transitions, motion specifications/captures, responsive/input/accessibility/semantic specifications, tokens, assets and annotations. Its resource records already require repository-local paths, immutable SHA-256 identities and editable-upstream routes. Consequently, a new schema or provider runtime would add lifecycle and migration cost without closing a semantic gap.

The admitted extension is a Figma-native producer profile:

```text
product/technical Source + configured Design Authority
  -> bounded Open Design generation or selected existing resource
  -> optional native Figma inspection/editability path
       metadata -> exact nodes -> design context -> variables/styles
       -> screenshot -> applicable motion/assets/Code Connect
  -> repository-readable immutable capture + editable upstream route
  -> residual provider-neutral design-resource-handoff-v1
       scope/conditions/gaps/product semantics/blockers/bindings
  -> default UI Authority Closure or Long-Task Authority Lock
  -> Source Claims + Controls/surface_bindings + production owners
  -> current target design_conformance/interaction/target-runtime proof
  -> Contract Conformance or the sole Long-Task Final Gate
```

The split is intentional. Figma reduces manual transcription of facts it natively represents, thereby lowering handoff authoring cost and improving precision. The handoff remains the coverage and semantic-loss detector, not a second visual specification. Immutable local capture separates reproducible workflow authority from live network, permission, rate-limit and upstream-mutability risk. Existing Context and Contract owners then determine what the selected resource means durably and how it is falsified in the production target.

## Architecture Deliberation record

- Owners and extension points: the existing handoff adapter contract and parser stay provider-neutral; `design-resource-authoring` owns optional provider acquisition; default/Long-Task workflow guidance owns consumption; project Context and public docs own durable/public meaning.
- Dependency direction: Figma/Open Design outputs feed ordinary Source; Source feeds Context/Contract selection; implementation and project checks consume frozen authority. Provider state never becomes workflow authority and the core adapter never depends on a live provider.
- Alternatives rejected: link-only handoff loses uncovered semantics and recovery; manual duplication of every Figma numeric fact raises drift cost; a Figma pack/registry/schema/Gate duplicates existing owners and locks the package to one provider.
- Future-change challenge: Figma tool names, plans, rate limits or Code Connect availability may change. Only the feature-detected provider profile and research notes should need revision; the eight-dimension handoff and downstream Contract stay stable unless their semantic vocabulary truly changes.
- Debt disposition: replace current Open-Design-primary/Figma-export-only wording everywhere it controls behavior; do not leave contradictory legacy descriptions.
- Forbidden shortcuts: no mutable-latest authority, no relabeled flattened output, no metadata-only completeness, no tool-success-to-acceptance substitution and no unverified claim that Code Connect or native export is operational.
- Project-owned checks: a dedicated oracle, managed/generated/package parity tests, design-resource authoring/provider tests, workflow/Context routing tests, existing handoff validation, Long-Task design-context tests and source-sync/package checks.

## Context Delta

`Context Delta: required`. This delivery changes durable package behavior, workflow mechanism rationale, generated-surface obligations and repeatable verification expectations. The owning Context must be updated before product implementation and remain aligned with `PROJECT_SPEC.md`, managed Skills and public guidance.
