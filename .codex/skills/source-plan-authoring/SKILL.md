---
name: source-plan-authoring
description: Use only when the user explicitly asks for 初版方案、源方案、方案源稿、Source Plan, initial delivery plan, source draft, or asks to synthesize, refine or audit later implementation or Contract-authoring Source from one draft or mixed inputs such as notes, product/technical documents, screenshots, diagrams or other attachments. Produce one self-contained Markdown Source Plan with complete input coverage, traceable direct/derived/delegated content, control-level UI detail when applicable, stable semantic keys, acceptance scenarios, non-goals, risks and unresolved decisions. Do not trigger for ordinary product discussion, routine coding, implementation work, Delivery Contract authoring or long-task execution.
---

# Source Plan Authoring

## Objective

Produce one high-fidelity, self-contained Markdown Source Plan from either a nearly finished plan or a sparse brief plus mixed supplied artifacts. Preserve the user's real intent, expand it to the detail needed by later `long-task-workflow` Contract authoring and make every added inference or delegated choice traceable.

Record every product, technical and acceptance meaning that later work must not omit, change or silently add. For an in-scope user interface, reach page, region, control, state and feedback granularity. Prefer semantic completeness over template completeness.

## Boundaries

- Produce or revise one Markdown Source Plan. If it does not fit in one response, continue the same document instead of inventing extra Outcomes or plans.
- Preserve the original meaning and every material qualifier from the user's discussion, research and every supplied artifact.
- Do not require the user to pre-normalize inputs or restate content already available in an attachment.
- Do not update `project_context/**` or treat the Source Plan as durable project Context.
- Do not independently turn current repository implementation into product intent. If supplied repository or Context evidence is relevant, cite it and distinguish durable constraints from incidental code shape.
- Do not bind owners, files, runners, verification inputs, proof surfaces or Assertion observations for a real repository. Later Contract authoring owns those bindings.
- Do not generate Delivery Contract YAML, execute implementation, run Long-Task commands or declare work complete.
- Keep plan meaning separate from action authorization. A delegated recommendation may define the intended product or technical default, but payment, contracting, production release, destructive production mutation, a real permission grant, sensitive-data transmission or required legal/security/human approval remains an external confirmation.
- Do not make this recommended structure a mandatory input protocol for later work.

## Relationship To Other Skills

- Keep `source-plan-authoring` focused on high-fidelity Source expression and traceability.
- For material UI, preserve stable surface/control/target keys and enough independent Control meaning for later UI Authority Closure. Do not assume a coarse product flow, `DESIGN.md` configuration or inspiration reference already supplies missing visibility, availability, validation, recovery, permission or accessibility semantics.
- This Skill authors Source, not a Contract Draft.
- It does not replace Contract Draft authoring inside `long-task-workflow`.
- Its recommended structure is optional input guidance.
- Use `context_product_plan` separately when a Tiny Context project needs product decisions classified and written as durable facts in `project_context/**`. This Skill does not replace or invoke that responsibility.
- `design-resource-authoring` may consume the same raw inputs independently or consume an existing Source Plan to commission low/high-fidelity targets, visual candidates, a conditional Figma handoff or an isolated interaction prototype. Neither Skill invokes the other. When explicitly requested after design selection, this Skill may instead consume both a separately revised initial proposal and selected immutable design resources as ordinary inputs; it still does not generate or select those resources.
- Use `long-task-workflow` later to read ordinary Source or a Source Plan with real Context/repository evidence, author one Delivery Contract, bind owners/paths/runners/proof, implement and run the Live Final Gate.

## Intake Modes And Source Coverage

Infer the working mode without asking the user to choose it:

- **Refinement mode:** preserve and improve one substantially complete plan.
- **Synthesis mode:** turn a goal plus mixed notes, documents, images, diagrams, tables or examples into a new plan.
- **Hybrid mode:** use an existing plan as the backbone and fill its gaps from the remaining artifacts.

A short request is sufficient when it identifies the artifact roles, states the product or delivery goal, explains whether references are exact targets or inspiration and asks for synthesis, refinement or elaboration. Do not require a fixed questionnaire or a pre-existing outline. Do not ask the user to approve a defensible recommended plan choice. Ask only when a supplied artifact cannot be accessed, authoritative inputs conflict, the user explicitly reserves a choice, a missing material preference could change the research or recommendation, or no defensible recommendation can be formed.

Before authoring:

1. Assign every supplied artifact a stable input ID and inspect it with format-appropriate capabilities. Cover all pages, frames, screens, tables, diagrams, annotations and visible states that can carry material meaning; never silently sample a multi-part artifact.
2. Classify each input as user instruction, authoritative product requirement, authoritative technical constraint, existing plan, repository/Context evidence, reference or inspiration. User-stated precedence wins; otherwise report material conflicts as `DEC` instead of merging them silently.
3. For screenshots or visual references, inventory visible surfaces, regions, controls, content hierarchy, navigation cues and represented states, then classify the interpretation as `exact-target`, `constraint` or `inspiration`. Treat it as inspiration unless the user or a higher-authority input makes exact/constraint scope explicit; do not import unrelated branding, sample data or product scope.
4. Record an Input Inventory in the Source Plan with each input ID, role, authority, material content incorporated and any unreadable or intentionally unused portion. The inventory is traceability, not a new semantic type or authority.
5. Make the resulting plan self-contained: incorporate every material requirement or constraint into a keyed item. Keep an external artifact reference only when the artifact itself remains necessary for exact visual, legal or other non-textual comparison.

## Preference And Research Gate

Before comparative research or a material product, technical, architecture or provider selection:

1. Identify the decision criteria that could materially change the research scope, candidate set or recommendation. Common axes include quality or fidelity versus cost, delivery speed, reliability or support, privacy or compliance, control or vendor lock-in, operational burden, platform coverage and future extensibility.
2. Treat a preference as known only when it follows from the user's words, a supplied authoritative artifact, project Context or another controlling constraint. Do not silently turn the author's own taste into user intent.
3. If a material criterion is unknown or ambiguous, stop before comparative research or selection and ask the user one concise set of targeted questions about only the decision-changing axes. For example, ask whether quality or total cost should dominate when that answer would change which providers or technologies deserve investigation.
4. Do not ask again when the preference is already available. Do not interrupt minor, reversible choices, or a choice with the same defensible recommendation across plausible preferences. This conditional gate is not a mandatory intake questionnaire.
5. Once the preference envelope is clear, decide whether research is needed and how much. When a choice depends on current external capabilities, pricing, quotas, licensing, compatibility, regional availability, security posture or support, use current authoritative or primary sources and add them to the Input Inventory with their scope and retrieval date.

Preference clarification determines what outcome to optimize. It does not approve a purchase, contract, deployment, permission grant, data transfer or other real-world action.

## Authoring Workflow

1. Build the complete Input Inventory and extract every material statement, including constraints, exceptions, examples that change meaning and already-decided controls or recovery behavior.
2. Preserve direct requirements before reorganizing them. Never compress several distinct requirements into a broad capability statement that loses qualifiers.
3. Classify every material addition as `direct`, `derived`, `delegated`, evidence-backed repository/Context information, or `decision_required`.
4. Resolve the end-to-end user journey and applicable surfaces before enumerating their regions, controls, states and feedback.
5. Define Outcomes only where observable results can be independently judged and later mapped to Requirements and acceptance.
6. Assign stable semantic keys and explicit anchors to important items.
7. Write product requirements, applicable flows/states, controls, technical obligations, implementation hints and observable acceptance without hiding new semantics between types.
8. Trace every input to incorporated items or an explicit unused/unreadable disposition.
9. Run the completeness check, revise the same document and end with a compact readiness summary.

## Expansion Boundary

### Direct requirements

Preserve directly stated intent and qualifiers. Do not reduce a scoped or conditional requirement to a generic feature label. Retain a source reference, quoted source key or clear provenance when the inputs provide one.

### Necessary derivations

Derive only what is unavoidable to make an explicit requirement complete, executable or falsifiable.

For every derived item:

- mark it `derived`;
- identify the original Requirement or source statement under `Derived From`;
- state why the derivation is necessary;
- confirm that it does not change user capability, business rules or product scope.

Do not disguise one possible product choice as a necessary derivation.

### Delegated elaboration

When the user explicitly asks the Skill to synthesize, refine, complete, flesh out or use its judgment, treat that as default plan-authoring delegation to make coherent product and technical choices needed by the stated goal. A recommendation is defensible only when material decision criteria are known and supplied evidence, project Context, established conventions or a conservative no-effect baseline supports the result. After the Preference And Research Gate is satisfied, adopt and record that recommendation instead of pausing for approval. High impact alone does not make a plan choice unresolved.

Typical delegated choices include information hierarchy, screen grouping, navigation between already requested capabilities, control placement and labels, input validation implied by the data, non-destructive loading/empty/error/retry feedback, representative content needed to make acceptance falsifiable, product defaults, thresholds, permission models, retention, platform scope and staged provider or automation policies when a defensible recommendation exists.

For every delegated item or tightly coupled group:

- mark it `delegated`;
- state `Delegated By`, citing the user's authoring instruction;
- state `Basis`, citing the relevant input IDs, constraints or convention;
- state why the choice is coherent and what product meaning it adds;
- keep it within the stated goal and do not contradict a higher-authority input.

For high-risk domains, prefer a conservative pre-authorization baseline when it still satisfies the stated goal: zero spend until approved, disabled production capability, least privilege, explicit opt-in, minimum justified retention, staging or POC before production, and no automated destructive behavior. Record the intended later capability separately from the gate that enables it. A conservative action gate does not substitute for an unknown preference that would change the intended product or technical choice.

Delegation authorizes plan meaning only. It never authorizes payment or purchase, signature or contract acceptance, production deployment or public release, destructive mutation of production or user data, granting real permissions, transmitting sensitive data, bypassing legal/security review, or substituting a plan for required POC, field, accessibility or human validation. Declare each applicable real-world gate as an `EXT` external confirmation and continue authoring without asking for plan approval.

### Repository or Context evidence

When supplied project evidence establishes an existing module boundary, state model, interface constraint, component system or verification entry, record the evidence and its source. Do not promote incidental current implementation into a product requirement.

Leave real owner/path/binding/runner selection to later repository-aware Contract authoring.

### New product semantics

Use a `DEC` item with status `decision_required` only when authoritative inputs conflict, the user explicitly reserves the choice, a material preference remains unknown after the targeted question, or no single defensible recommendation can be supported by the known preference envelope, available evidence, Context, established convention or a conservative no-effect default. Several possible options do not by themselves require a decision when the decision criteria are known: recommend one, record its delegated basis and keep any real high-risk action as `EXT`.

The following choices require an explicit direct or recorded delegated basis and may require a corresponding `EXT`; they are not automatic `DEC` items when a defensible recommendation exists:

- a new user capability or changed business rule;
- a default, threshold, range or metric;
- a permission or role;
- deletion, overwrite or irreversible behavior;
- an automation policy;
- platform support scope;
- data persistence or retention behavior;
- a product recovery path after failure;
- sample versus full-population coverage;
- a pricing, quota, budget or risk rule.

## Outcome Rules

Create one or more Outcomes according to whether each observable result can be independently judged and later bound to its own Requirements and acceptance.

Do not split an Outcome because of:

- response or document length;
- frontend/backend or other implementation layers;
- file or module count;
- desired parallelism;
- Agent capacity;
- a wish to distribute execution.

Do not merge independently decidable results merely to make the document shorter.

## Stable Keys And Anchors

Use stable semantic lowercase-kebab keys and explicit Markdown `id` anchors for important items.

```markdown
<a id="<outcome-key>.requirement.<requirement-key>"></a>

- **REQ `<requirement-key>`**
  ...
```

Use the same pattern for controls, obligations, acceptance, decisions and other typed items. Describe meaning rather than implementation location.

Key rules:

- preserve a key when wording changes but meaning does not;
- never renumber keys because ordering changes;
- never reuse a deleted key for a different meaning;
- when merging or splitting an item, record which new keys replace the old key;
- avoid pure sequence keys such as `req-17`;
- avoid implementation keys such as `map-hook-change` or `src-button`.

## Semantic Types

Use only the types that apply.

| Type | Meaning | Later use |
|---|---|---|
| `OUT` | Independently decidable observable result | Outcome |
| `REQ` | Required product or system behavior | Requirement |
| `CTRL` | Decided control task, placement or state | Control |
| `OBL` | Mandatory technical obligation | Technical obligation |
| `NCOMP` | Explicit result that must not be treated as completion | Non-completing Claim |
| `AC` | Falsifiable observable acceptance scenario | Acceptance Assertion |
| `NG` | Explicit non-goal | Non-goal |
| `FS` | Forbidden shortcut or disallowed result | Forbidden shortcut |
| `RISK` | Fact that changes design, verification or recovery | Risk fact |
| `EXT` | Result requiring external confirmation | External confirmation |
| `DEC` | Product decision that cannot be reliably inferred | Decision required |
| `HINT` | Non-binding implementation suggestion | Advisory only |

Keep `OBL` and `HINT` distinct: an `OBL` must be satisfied; a `HINT` may be replaced by another valid implementation.

## Product Surfaces, Controls And States

Do not force a non-interface Source Plan to invent controls. For an in-scope interactive product, however, enumerate every user-visible surface and every material interactive control at control level; a broad feature or screen name is not enough.

For each surface, state its purpose, entry and exit, persistent navigation, major regions, overlays or transient layers, and the Control keys it contains. Treat buttons, links, fields, selectors, tabs, toggles, menus, list or card actions, map or canvas gestures and other actionable elements as controls. Treat material status, validation, permission and recovery feedback as Control fields or independently keyed Requirements rather than decorative prose.

Include a `CTRL` when:

- the user already discussed or decided it;
- its location, task or state changes product meaning;
- leaving it open would permit materially different product designs.

For each included control, state every independently decided field separately: `Surface`, `Region`, `Control type`, `Label/content`, `Location`, `User task`, `Visibility`, `Availability`, `Trigger`, `Input`, `Validation`, `Default`, `Interaction`, `Navigation/result`, `Loading`, `Empty`, `Success`, `Failure`, `Recovery`, `Permission`, `Feedback` and `Accessibility`. Use `not applicable` when a field was considered and genuinely does not apply; do not hide an undecided product choice behind that phrase.

Give every decided Control field its own stable semantic meaning. Do not compress placement, behavior, state or feedback into one broad sentence when more than one field has been decided; later repository-aware authoring must be able to map each field independently. Do not claim exact visual styling, animation, copy or responsive behavior unless it is direct, evidence-backed or within recorded delegation. When exact non-textual comparison remains necessary, preserve the selected reference id/path/URI and its covered viewport/theme/state instead of replacing it with prose.

## Acceptance Scenarios

Write `AC` items as observable behavior, not low-level test commands.

Each `AC` represents exactly one acceptance scenario and explicitly names the `REQ`, `CTRL`, `OBL` and/or `NCOMP` keys it accepts. It contains one `Given`, one `When` and one `Then`; each may be multiline, but together they describe only one independently decidable scenario. Never label one AC as proof for several materially different success, failure, boundary or recovery scenarios; author separate ACs instead.

For every important `REQ` and every material `CTRL` state, provide at least one of:

- a corresponding `AC`;
- an `EXT`;
- a `DEC`;
- an explicit non-goal disposition;
- a reason machine verification is not possible.

Cover the scenarios that actually exist: success, failure, boundary, recovery, permission, empty state, sample/full-population scope and forbidden results. Do not mechanically generate a fixed scenario set.

Never introduce a product requirement for the first time inside an `AC`. Move hidden behavior, defaults, retention periods or recovery policies into a direct or delegated source-backed `REQ`, or into `DEC` only when no defensible recommendation exists.

## Risk And Advisory Boundaries

Each `RISK` states `Fact`, `Affected Outcome`, `Basis` and `Consequence`. `Fact` uses one exact name from the complete Runtime Risk Fact set:

```text
public_api_or_schema_change
persistent_data_change
data_migration
security_boundary_change
permission_boundary_change
irreversible_external_effect
critical_user_path
full_population_operation
multi_repository_change
weak_observability
```

Do not invent or accept aliases. A data migration uses `data_migration`, never `migration`. A critical path with weak observability produces two independent `RISK` items with distinct stable keys: one `critical_user_path` and one `weak_observability`, both naming the affected Outcome. Preserve `multi_repository_change` in Source even though the current Runtime rejects multi-repository delivery; the Compiler owns that unsupported-delivery decision. Each risk item names one affected Outcome; repeat the item with a distinct stable key when the same fact affects multiple Outcomes. If Fact or Affected Outcome cannot be determined from Source, create a `DEC` with `decision_required` instead of guessing. Generic risk prose without an affected Outcome is not actionable Source. `HINT` remains advisory and is never a Material Source Item: promote it to `OBL` if the implementation constraint is mandatory.

Use `NCOMP` for an explicit, source-authoritative statement that names an outcome or shortcut that must not count as completion. It is neither an ordinary Requirement nor a non-goal: later Contract authoring maps it to a non-completing Claim and must provide negative or Counterfactual proof.

This Skill emits ordinary Markdown only. Do not emit `ty-source-item` markers; repository-aware `/long-task-workflow` inserts those non-rendering markers later without rewriting the selected Source text.

## Default Markdown Structure

Write in the user's language unless requested otherwise.

```markdown
# <Plan title>

## 1. Goal And Success Definition

- Target users
- Problem
- Final observable results
- Success boundary

## 2. Background, Current State And Problem

- Current situation
- Existing problem
- Why this delivery is needed
- Known constraints

## 3. Input Inventory And Interpretation

- Input ID
- Role and authority
- Material content incorporated
- Unreadable or intentionally unused content

## 4. Delivery Scope

### In Scope

### Non-goals

### Forbidden Shortcuts

## 5. Product Surface Inventory

- Surface purpose
- Entry, exit and navigation
- Regions, overlays and Control keys

## 6. Outcome Overview

- Outcome key
- Observable result
- Dependencies

## 7. Outcomes

<a id="outcome.<outcome-key>"></a>

### OUT `<outcome-key>`: <Outcome title>

#### Observable Result

#### Product Requirements

<a id="<outcome-key>.requirement.<requirement-key>"></a>

- **REQ `<requirement-key>`**
  - Origin: direct | derived | delegated | evidence-backed
  - Source basis:
  - Requirement:

#### Surface And Region Model

- Surface:
- Purpose:
- Entry / exit:
- Regions / overlays:
- Included Control keys:

#### User Flow And States

- Normal flow
- Failure flow
- Recovery flow
- Boundary cases

#### Controls And Product Feedback

<a id="<outcome-key>.control.<control-key>"></a>

- **CTRL `<control-key>`**
  - Origin: direct | derived | delegated | evidence-backed
  - Source basis:
  - Surface:
  - Region:
  - Control type:
  - Label/content:
  - Location:
  - User task:
  - Visibility:
  - Availability:
  - Trigger:
  - Input:
  - Validation:
  - Default:
  - Interaction:
  - Navigation/result:
  - Loading:
  - Empty:
  - Success:
  - Failure:
  - Recovery:
  - Permission:
  - Feedback:
  - Accessibility:

#### Technical Obligations And Boundaries

<a id="<outcome-key>.obligation.<obligation-key>"></a>

- **OBL `<obligation-key>`**
  ...

<a id="<outcome-key>.non-completing.<non-completing-key>"></a>

- **NCOMP `<non-completing-key>`**
  ...

#### Implementation Hints

- **HINT `<hint-key>`**
  ...

#### Acceptance Scenarios

<a id="<outcome-key>.acceptance.<acceptance-key>"></a>

- **AC `<acceptance-key>`**
  - Accepts: REQ `<key>`, CTRL `<key>`, OBL `<key>`, NCOMP `<key>`
  - Given:
  - When:
  - Then:

#### Risks And Recovery

<a id="<outcome-key>.risk.<risk-key>"></a>

- **RISK `<risk-key>`**
  - Fact:
  - Affected Outcome:
  - Basis:
  - Consequence:

## 8. Cross-Outcome Constraints

## 9. External Confirmations

## 10. Source Traceability And Authoring Decisions

- Item or group:
- Origin: direct | derived | delegated | evidence-backed
- Source / Derived From / Delegated By:
- Basis and reason:
- Changes product meaning: no for derived; yes or no for delegated

## 11. Decisions Required

<a id="decision.<decision-key>"></a>

- **DEC `<decision-key>`**
  - Status: decision_required
  - Decision:
  - Options:
  - Why it cannot be reliably derived:
  - Affected REQ / AC:

## 12. Completeness Check

- Covered core requirements
- Unresolved product semantics
- Unbound repository or verification facts
- Explicitly out-of-scope items
```

## Completeness Check

Before returning the plan, verify:

1. Every material original requirement is preserved.
2. Distinct requirements were not collapsed into one vague Outcome.
3. Every supplied artifact appears in the Input Inventory with complete coverage or an explicit gap/disposition.
4. Every material input statement maps to a keyed plan item or an explicit unused/conflict disposition.
5. Every `REQ` and material `CTRL` state has an `AC`, `EXT`, `DEC` or explicit exception.
6. Every in-scope interactive surface has purpose, entry/exit, regions and contained Control keys.
7. Every material interactive control is independently enumerated with applicable placement, behavior, state, feedback and accessibility fields.
8. Every declared `CTRL` independently states Surface, Region, Control type, Label/content, Location, User task, Visibility, Availability, Trigger, Input, Validation, Default, Interaction, Navigation/result, Loading, Empty, Success, Failure, Recovery, Permission, Feedback and Accessibility.
9. Every `OBL` is mandatory rather than a suggestion.
10. No `AC` introduces undeclared product semantics.
11. Every derived item identifies its basis and changes no user capability, business rule or product scope.
12. Every delegated item identifies `Delegated By`, its evidence basis, the known material decision criteria and the product meaning it adds.
13. Every delegated recommendation passed the Preference And Research Gate; current external claims use authoritative or primary sources, and any real high-risk action remains an explicit `EXT` rather than implied authorization.
14. Every `DEC` is justified by conflicting authority, an explicitly user-reserved choice, a missing material preference or the absence of a defensible recommendation; high impact or multiple options with known criteria alone never create a pause.
15. Reference or inspiration inputs are not treated as exact targets unless the user requested that authority.
16. Sample, framework, representative validation and full population are not confused.
17. Partial implementation is not worded as full completion.
18. Non-goals and forbidden shortcuts are explicit.
19. Risks concretely affect scope, verification or recovery rather than repeat a generic template.
20. No unsupported number, threshold, metric or conclusion appears; every delegated value cites its evidence, known preference, convention or conservative-default basis.
21. Every `AC` names accepted `REQ`/`CTRL`/`OBL`/`NCOMP` keys and contains exactly one Given/When/Then scenario.
22. Every `NCOMP` is an explicit source meaning rather than a restated Requirement or non-goal.
23. Every `RISK` has one exact Fact, one Affected Outcome, Basis and Consequence; ambiguity is a `DEC`.
24. Every decided control field remains independently traceable instead of being compressed into an aggregate state sentence.
25. The document contains enough incorporated meaning for later Contract authoring without requiring the original conversation; any still-required external artifact is named explicitly.

Do not emit a matrix or machine gate. End with:

```text
Completeness status:
- Ready for Contract authoring: yes|no
- Input coverage gaps: none|...
- Surface/control coverage: complete|not applicable|...
- Decisions required: DEC-...
- Advisory implementation hints: HINT-...
- Unbound project facts: ...
```

## Non-Goals

Do not create:

- a Source Plan Schema or mandatory format validator;
- a Source Plan CLI, Preflight or Compile step;
- a Source Plan Receipt, Coverage Cache, Authority or state file;
- a Delivery Contract, runner, verification input or Assertion observation;
- a low/high-fidelity artifact, visual candidate, Figma handoff or design prototype;
- a Context update, implementation, verification run or completion judgment.

The Source Plan improves the quality of declared Source. It cannot prove that the user has expressed every real requirement.
