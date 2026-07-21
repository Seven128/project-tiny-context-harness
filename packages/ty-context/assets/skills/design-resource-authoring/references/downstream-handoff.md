# Design Resource Handoff

Generated resources remain ordinary external Source. This reference preserves enough identity and meaning for later work without creating a Tiny Context-specific pack, registry or authority lifecycle.

## Candidate, selection and authority are separate

- **Candidate:** provider output proposed for review. It authorizes no fidelity.
- **Human selection:** an explicit user/team choice with a stated basis. It permits selected-source preparation, not automatic durable adoption.
- **Authority adoption:** a downstream workflow reconciles the selected Source with product/surface Context and `DESIGN.md`, records durable ownership where required and binds implementation/verification to declared conditions.

The Skill may preserve an input already classified as `exact-target`; it may not promote its own candidate to `exact-target`. Unknown coverage remains unknown.

## Intent-sized response

### Exploration

Return promptly:

- requested scope and intent;
- visible candidate/preview;
- resource dispositions and obvious limitations;
- provider/artifact qualifier when execution is not clean;
- minimal sanity review actually performed.

Do not require files, schemas, packs, hashes or validator runs for a throwaway unselected preview unless they are needed to retrieve/show it reliably.

### Handoff

Add only the fields needed for another person or workflow to consume it:

- stable resource key plus surface/control/state/target keys when known;
- classification: candidate, inspiration, constraint or pre-existing exact target;
- provider version, project/run, selected capability/template, agent/model and design-system provenance as reported live;
- explicit source entry or preview locator and immutable hash/snapshot when available;
- declared platform, viewport, mode, state, content and interaction coverage;
- selection basis if a human selection already exists;
- unresolved decisions, known limitations and forbidden inferences;
- outer review performed and provider status qualifier.

No dedicated Markdown/YAML file or directory is mandatory. Use concise prose for simple work and a task-local structured block when fields would otherwise become ambiguous.

### Selected-source preparation

Require explicit human selection and record who/what supplied the selection basis. Preserve the exact artifact by hash or a user-approved durable snapshot. Do not rely on a mutable preview URL. Do not choose a repository destination, edit authority files or start implementation without separate authorization.

## Accepted-design-decision delta

When raw-draft exploration leads to an explicit selection, report a delta for the separately owned proposal-revision step:

```yaml
selection_basis: explicit user/team decision
selected_resources:
  - resource key, explicit locator and immutable hash/snapshot
accepted:
  - decision and rationale
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
forbidden_inference:
  - candidate iteration did not itself revise the proposal or establish Design Authority
```

This is an explanatory shape, not a required schema. Include only known changes. Do not emit or apply a delta after every iteration: interim observations remain task-local and may be returned once as a consolidated delta when the direction is final. The Skill does not write back the proposal, decide when a separately authorized owner rewrites it, or invoke `source-plan-authoring`.

## Initial proposal and Source Plan routing

The components are independent and composable:

```text
raw draft -> design-resource-authoring -> candidates -> explicit selection
raw draft -> source-plan-authoring -> Source Plan
revised raw draft + selected design resources -> source-plan-authoring -> richer Source Plan
selected design resources -> default Workflow or Long-Task Source
```

The recommended design-first loop for substantial new Web/App work is:

1. explore from the initial proposal;
2. iterate inside the requested scope;
3. obtain explicit human selection;
4. when requested, return one consolidated accepted-design-decision delta;
5. let a separately authorized plan owner revise the proposal;
6. if requested, pass both the revised proposal and selected immutable resources to `source-plan-authoring`.

This is a useful path, not a universal required lifecycle. `source-plan-authoring` remains optional upstream synthesis and does not generate design resources.

## Default Workflow Contract consumption

When the user later authorizes concrete development:

1. bring the selected generated resource as ordinary Source;
2. perform UI Authority Closure against product/surface Context, `DESIGN.md`, tokens and declared targets;
3. classify the resource and confirm selection basis/coverage;
4. decide `Context Delta` and adopt durable facts only through their existing owners;
5. implement and run project-owned verification.

Open Design run success, a candidate screenshot or this handoff cannot authorize fidelity or acceptance.

## Long-Task consumption

- A selected resource and an optional Source Plan are parallel ordinary Source inputs to Contract authoring.
- Contract `source_paths`, bindings, verification inputs, check input paths and artifact globs should name only the stable locators/conditions they actually consume.
- Surface/control/state/target keys should connect product meaning, source targets, implementation and checks where applicable.
- Authority Lock, protected Authority Revision and Final Gate remain the only Long-Task authority lifecycle.
- This Skill creates no Contract Draft, outcome, receipt, Check result or Gate.
- A later Open Design rerun does not silently revise locked Source; the downstream workflow uses its normal revision rules.

## Forbidden inferences

Unless independently proven downstream, never infer that a generated resource:

- is selected, authoritative or accepted;
- covers unlisted states, viewports, modes, platforms or accessibility behavior;
- is a native implementation because an HTML/image preview renders;
- is editable in Figma because a Figma capability was listed;
- changed the initial proposal, Source Plan, Context, `DESIGN.md`, code or Contract;
- proves production fidelity, product correctness, test completion or release readiness.
