# Dynamic Resource Selection

Use this reference to derive a bounded design-resource commission from the actual request. It is a decision model, not a fixed production sequence.

## 1. Establish the scope ceiling

Extract the smallest explicit output boundary before interpreting the background:

- subject: one control/component, one page, named pages, a flow or a reusable system;
- platform and viewport when known;
- modes, states and transitions explicitly requested;
- fidelity or editability requested, if any;
- exclusions such as “other pages not included,” “preview only,” “no Figma” or “do not update files.”

Rich background improves a bounded artifact. It never authorizes more artifacts. If the user supplies a complete app plan but asks to preview one button, generate at most the one-control resource.

## 2. Choose the intent

| Intent | User decision being supported | Default stopping point |
| --- | --- | --- |
| `exploration` | “What might this look or feel like?” | Visible scoped candidate plus minimal sanity review |
| `handoff` | “Can another designer/developer reliably consume this?” | Project-native artifact plus provenance, coverage, limitations and relevant checks |
| `selected-source-preparation` | “Preserve this explicitly selected direction for later use.” | Immutable identity or approved snapshot, explicit selection basis and downstream notes |

Intent is task-local and need not be persisted. Selected-source preparation does not itself adopt Design Authority.

## 3. Inventory relevant input roles

Preserve each supplied item's actual role:

- `exact-target`: already authoritative only for its declared conditions;
- `constraint`: a rule that controls only its stated scope;
- `inspiration`: directionally useful but not fidelity authority;
- `current-implementation-evidence`: evidence of current behavior, not desired behavior by default;
- `background`: product/technical context that informs but does not expand generation scope.

An optional Source Plan is one possible input. Raw notes or an initial proposal are equally valid. Never require one merely to make the other usable.

## 4. Identify independent gaps

Ask what remains uncertain inside the scope:

- **structure:** information hierarchy, layout regions or page relationships;
- **flow:** navigation, branching, recovery or multi-step sequence;
- **behavior:** control states, transitions, gestures, feedback, loading/error/empty/disabled cases;
- **visual direction:** composition, typography, color, density, imagery or brand character;
- **platform/responsiveness:** safe areas, breakpoints, input methods or viewport behavior;
- **system reuse:** tokens, component variants or cross-surface rules needed by more than the requested artifact;
- **team editability:** a real need for collaborative editable frames/libraries or an organizational Figma handoff.

Do not manufacture a gap already resolved by selected Source.

## 5. Consider resources conditionally

| Resource | Select when it closes this gap | Usually omit when |
| --- | --- | --- |
| Control/component state study | One control's variants, anatomy, feedback or edge states are the decision | The page target already specifies those states precisely |
| Low-fidelity wireframe | Hierarchy, topology or flow must be judged without visual-style distraction | Structure is settled and only visual direction is unknown |
| High-fidelity visual candidate | Visual hierarchy, tone or composition needs selection | Existing selected targets already govern the requested conditions |
| Interactive prototype | Transitions, navigation, state retention or task feel must be experienced | A static decision is sufficient or the provider cannot produce genuine interaction |
| Flow/journey board | Multiple surfaces, branches or recovery paths must be compared together | The request is one isolated surface/control |
| Design-system slice | Several requested artifacts need shared tokens/components or reuse rules | One exploratory candidate does not justify a system |
| Component inventory/specification | Development handoff needs explicit reusable variants and states | Exploration is visual only and no reuse decision is requested |
| Figma handoff | Editable collaborative frames/libraries are explicitly valuable and operational | A screenshot/HTML/project-native source is sufficient or connector/auth/export is unavailable |
| Image/illustration/icon/media study | Bespoke content materially defines the selected direction | Generic placeholders answer the present decision |

A prototype is often valuable for new Web/App flows, but it is never automatically required. Low- and high-fidelity resources may both be selected only when they answer independent questions.

## 6. Assign a disposition to every considered resource

- `selected`: required to close a current gap;
- `optional`: useful, but not necessary for the current decision;
- `not-needed`: redundant or outside the scope ceiling;
- `unavailable`: justified but not currently supported/configured;
- `decision-required`: a genuine unresolved preference changes the commission materially.

Give one concrete reason. Do not turn `optional` into automatic extra work.

## 7. Build the commission envelope

The task-local envelope should contain only product-specific information:

```yaml
intent: exploration | handoff | selected-source-preparation
scope:
  subjects: [named control/surface/flow keys]
  ceiling: one-control | one-page | named-pages | named-flow | system-slice
  platform: known-or-unknown
  viewports: []
coverage:
  required_content: []
  required_states: []
  required_transitions: []
inputs:
  exact_targets: []
  constraints: []
  inspiration: []
  background: []
selected_capability:
  kind: runtime-discovered-kind
  id: runtime-discovered-id
exclusions: []
expected_entry: known-or-provider-native
review_promise: minimal-sanity | handoff-checks | selected-source-snapshot
```

This is an explanatory shape, not a required file or schema. Never paste or paraphrase the Open Design capability's own seed/template prompt into it.

## 8. Iterate and stop

- Keep each revision inside the original scope ceiling unless the user explicitly expands it.
- Reuse the current Open Design project when that preserves context and provenance; preserve the prior artifact hash before overwriting a selected candidate.
- Do not create low-fi, high-fi, component boards and Figma copies merely because a process diagram lists them.
- Stop as soon as the requested decision is supported.

When a human explicitly selects or rejects a direction, return an accepted-design-decision delta when requested rather than editing the initial proposal. Include accepted, rejected and unresolved choices; product, information, control/state and visual implications; affected stable keys; and selected artifact locators/hashes. Do not require a delta after every iteration. Interim observations remain task-local and may be returned once as a consolidated delta after the design direction is final. A separate plan owner decides whether, when and what to revise.

## Worked scope examples

- **Large draft, one filter control:** select a control-state study if anatomy and states are uncertain; omit page/flow resources.
- **One page, style preview:** select one high-fidelity candidate; do not add a design-system pack or validator run.
- **Three-screen interaction flow:** select a low-fi flow and an interactive high-fi prototype only if topology and interaction/visual behavior are independently unresolved.
- **Local style fix with exact target:** select no new design resource and route to implementation.
- **Raw draft before Source Plan:** iterate only requested candidates, optionally return one consolidated accepted-decision delta when requested after selection, and leave both draft revision and later Source Plan authoring separate.
