# Design Resource Handoff And Proposal Reconciliation

Generated resources remain ordinary external Source. Preserve enough identity and meaning for downstream work without creating a Tiny Context pack, registry or authority lifecycle.

## Candidate, selection and authority are separate

- **Candidate:** provider output proposed for review; it authorizes no fidelity.
- **Selection:** an explicit user/team choice, or explicit delegation with known criteria; it permits proposal reconciliation and selected-source preparation.
- **Authority adoption:** a downstream development workflow reconciles selected Source with product/surface Context and `DESIGN.md` and binds implementation/verification to declared conditions.

This Skill may preserve an input already classified as `exact-target`; it may not promote its own candidate to one. Unknown coverage remains unknown.

## Development-scope coverage

For every material in-scope surface/flow/region/component/control condition, record selected existing Source, newly generated Source, `not-applicable`, `excluded-by-scope`, `decision-required` or `unavailable`. Include only necessary surrounding context and explicit exclusions. One larger addressable artifact may cover several items; a static frame covers only conditions it actually shows.

Design resources may show user-visible triggers, transitions, states, feedback and product-rule presentation. Business, data, permission and algorithmic rules remain owned by product/technical Source and must not be invented by visuals.

## Final proposal reconciliation

Keep a task-local buffer during candidate iteration:

```yaml
selection_basis: explicit user/team choice | explicit delegated selection
selected_resources:
  - stable key, provider/project/run/entry, declared conditions, immutable digest/snapshot
accepted:
  - decision, rationale and affected proposal section/stable keys
rejected:
  - alternative and reason
unresolved:
  - genuine remaining choice
impacts:
  product_rules: []
  information_hierarchy: []
  surface_keys: []
  control_keys: []
  state_keys: []
  interaction_rules: []
  visual_constraints: []
```

This is an explanatory shape, not a schema or required file. Do not write during iteration. Once the direction is final:

1. confirm the selection basis and immutable resource identity;
2. consolidate duplicate/intermediate notes;
3. apply accepted decisions once while preserving all unaffected original requirements and source provenance;
4. exclude rejected and unresolved choices from requirements, keeping unresolved items visibly unresolved;
5. record selected resource keys, conditions, locators and digests in the proposal where downstream consumers can recover them;
6. make reruns idempotent—update the existing decision/reference instead of appending it again;
7. if the initial proposal has an authorized writable path, edit that file; otherwise return the full revised proposal in the response.

Never mutate a Source Plan, `project_context/**`, `DESIGN.md`, Delivery Contract, production code or tests. A small request may generate, select and reconcile in one turn; “once” describes final semantic writeback, not a required waiting phase.

If no selection occurs, return candidates plus a consolidated pending delta and leave the proposal unchanged.

## Intent-sized handoff

### Exploration

Return scope/intent, visible candidates, resource dispositions, obvious limitations, provider/artifact qualifiers and the sanity review performed. Do not require a pack, hash or validator for a throwaway unselected preview unless retrieval needs it.

### Implementation handoff

Add:

- output/development scope, necessary context and exclusions;
- stable resource, surface/control/state/target keys;
- candidate/inspiration/constraint/pre-existing-exact-target classification;
- provider version, project/run, capability/template, agent/model and live design-system binding;
- exact entry/preview locator plus SHA-256 or approved snapshot;
- declared platform, viewport, mode, state, content, interaction, accessibility and motion coverage;
- stable-key coverage mapping and unresolved dispositions;
- selection basis, proposal reconciliation path/status and known limitations;
- outer review and separate provider/artifact/design qualifiers.

No dedicated Markdown/YAML file or directory is mandatory.

## Recommended downstream routing

```text
initial proposal
  -> design-resource-authoring
  -> selected immutable resources + reconciled initial proposal
  -> long-task-workflow (explicit long delivery)
     OR current native Goal + default Workflow Contract (non-long delivery)
```

`source-plan-authoring` is not an intermediate stage. A legacy Source Plan remains valid ordinary Source if supplied, but design-resource authoring never creates or edits one.

### Default Workflow consumption

The consuming Goal brings the revised proposal and selected resources as ordinary Source, performs UI Authority Closure, classifies coverage, decides `Context Delta`, adopts durable facts through existing owners, implements and runs project-owned verification.

### Long-Task consumption

The same revised proposal and selected resources enter `long-task-workflow`. Its integrated Source-quality authoring makes the delivery self-contained, then Contract `source_paths`, Bindings, `verification_inputs`, Check `input_paths` and `artifact_globs` name only stable locators and conditions actually consumed. Authority Lock, protected revision and Final Gate remain the sole lifecycle. This Skill creates no Contract Draft, Outcome, Receipt, Check result or Gate.

## Forbidden inferences

Unless independently proven downstream, never infer that a generated resource:

- is selected, authoritative or accepted;
- covers unlisted states, viewports, modes, platforms or accessibility;
- is native implementation because an HTML/image preview renders;
- is editable in Figma because a capability was listed;
- changed Context, `DESIGN.md`, a Source Plan, code or Contract;
- proves production fidelity, correctness, test completion or release readiness.
