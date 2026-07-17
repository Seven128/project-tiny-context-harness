---
name: source-plan-authoring
description: Use only when the user explicitly asks for 初版方案、源方案、方案源稿、Source Plan, initial delivery plan, or asks to refine or audit such a plan as input for later implementation or Contract authoring. Produce one self-contained Markdown Source Plan with stable semantic keys, traceable derivations, acceptance scenarios, non-goals, risks and unresolved decisions. Do not trigger for ordinary product discussion, routine coding, implementation work, Delivery Contract authoring or long-task execution.
---

# Source Plan Authoring

## Objective

Produce one high-fidelity, self-contained Markdown Source Plan that preserves the user's real intent, supports later refinement and makes every added inference traceable.

Record every product, technical and acceptance meaning that later work must not omit, change or silently add. Prefer semantic completeness over template completeness.

## Boundaries

- Produce or revise one Markdown Source Plan. If it does not fit in one response, continue the same document instead of inventing extra Outcomes or plans.
- Preserve the original meaning and every material qualifier from the user's discussion, research and supplied source material.
- Do not update `project_context/**` or treat the Source Plan as durable project Context.
- Do not independently turn current repository implementation into product intent. If supplied repository or Context evidence is relevant, cite it and distinguish durable constraints from incidental code shape.
- Do not bind owners, files, runners, verification inputs, proof surfaces or Assertion observations for a real repository. Later Contract authoring owns those bindings.
- Do not generate Delivery Contract YAML, execute implementation, run Long-Task commands or declare work complete.
- Do not make this recommended structure a mandatory input protocol for later work.

## Relationship To Other Skills

- Keep `source-plan-authoring` focused on high-fidelity Source expression and traceability.
- This Skill authors Source, not a Contract Draft.
- It does not replace Contract Draft authoring inside `long-task-workflow`.
- Its recommended structure is optional input guidance.
- Use `context_product_plan` separately when a Tiny Context project needs product decisions classified and written as durable facts in `project_context/**`. This Skill does not replace or invoke that responsibility.
- Use `long-task-workflow` later to read ordinary Source or a Source Plan with real Context/repository evidence, author one Delivery Contract, bind owners/paths/runners/proof, implement and run the Live Final Gate.

## Authoring Workflow

1. Inventory every material source statement, including constraints, exceptions, examples that change meaning and already-decided controls or recovery behavior.
2. Preserve direct requirements before reorganizing them. Never compress several distinct requirements into a broad capability statement that loses qualifiers.
3. Classify every addition as `direct`, `derived`, evidence-backed repository/Context information, or `decision_required`.
4. Define Outcomes only where observable results can be independently judged and later mapped to Requirements and acceptance.
5. Assign stable semantic keys and explicit anchors to important items.
6. Write product requirements, applicable flows/states, meaningful controls, technical obligations, implementation hints and observable acceptance without hiding new semantics between types.
7. Run the completeness check, revise the same document and end with a compact status summary.

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

### Repository or Context evidence

When supplied project evidence establishes an existing module boundary, state model, interface constraint, component system or verification entry, record the evidence and its source. Do not promote incidental current implementation into a product requirement.

Leave real owner/path/binding/runner selection to later repository-aware Contract authoring.

### New product semantics

Use a `DEC` item with status `decision_required` whenever more than one materially different choice remains or the sources do not authorize a decision.

Never silently choose:

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

## Controls And States

Do not force every Source Plan to define every control.

Include a `CTRL` when:

- the user already discussed or decided it;
- its location, task or state changes product meaning;
- leaving it open would permit materially different product designs.

For each included control, state every independently decided field separately: `Location`, `User task`, `Trigger`, `Input`, `Loading`, `Empty`, `Success`, `Failure` and `Feedback`. Use `not applicable` when a field was considered and genuinely does not apply; do not hide an undecided product choice behind that phrase. Preserve permission and recovery states separately when they genuinely apply.

Give every decided Control field its own stable semantic meaning. Do not compress location, trigger, input, loading, empty, success, failure or feedback into one broad sentence when more than one field has been decided; later repository-aware authoring must be able to map each field independently.

## Acceptance Scenarios

Write `AC` items as observable behavior, not low-level test commands.

Each `AC` represents exactly one acceptance scenario and explicitly names the `REQ`, `CTRL`, `OBL` and/or `NCOMP` keys it accepts. It contains one `Given`, one `When` and one `Then`; each may be multiline, but together they describe only one independently decidable scenario. Never label one AC as proof for several materially different success, failure, boundary or recovery scenarios; author separate ACs instead.

For every important `REQ`, provide at least one of:

- a corresponding `AC`;
- an `EXT`;
- a `DEC`;
- an explicit non-goal disposition;
- a reason machine verification is not possible.

Cover the scenarios that actually exist: success, failure, boundary, recovery, permission, empty state, sample/full-population scope and forbidden results. Do not mechanically generate a fixed scenario set.

Never introduce a product requirement for the first time inside an `AC`. Move hidden behavior, defaults, retention periods or recovery policies into a source-backed `REQ` or unresolved `DEC`.

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

## 3. Delivery Scope

### In Scope

### Non-goals

### Forbidden Shortcuts

## 4. Outcome Overview

- Outcome key
- Observable result
- Dependencies

## 5. Outcomes

<a id="outcome.<outcome-key>"></a>

### OUT `<outcome-key>`: <Outcome title>

#### Observable Result

#### Product Requirements

<a id="<outcome-key>.requirement.<requirement-key>"></a>

- **REQ `<requirement-key>`**
  ...

#### User Flow And States

- Normal flow
- Failure flow
- Recovery flow
- Boundary cases

#### Controls And Product Feedback

<a id="<outcome-key>.control.<control-key>"></a>

- **CTRL `<control-key>`**
  - Location:
  - User task:
      - Trigger:
      - Input:
      - Loading:
      - Empty:
      - Success:
      - Failure:
      - Feedback:

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

## 6. Cross-Outcome Constraints

## 7. External Confirmations

## 8. Derived Content And Sources

- Derived Item:
- Derived From:
- Reason:
- Changes product meaning: no

## 9. Decisions Required

<a id="decision.<decision-key>"></a>

- **DEC `<decision-key>`**
  - Status: decision_required
  - Decision:
  - Options:
  - Why it cannot be reliably derived:
  - Affected REQ / AC:

## 10. Completeness Check

- Covered core requirements
- Unresolved product semantics
- Unbound repository or verification facts
- Explicitly out-of-scope items
```

## Completeness Check

Before returning the plan, verify:

1. Every material original requirement is preserved.
2. Distinct requirements were not collapsed into one vague Outcome.
3. Every `REQ` has an `AC`, `EXT`, `DEC` or explicit exception.
4. Every declared `CTRL` independently states Location, User task, Trigger, Input, Loading, Empty, Success, Failure and Feedback.
5. Every `OBL` is mandatory rather than a suggestion.
6. No `AC` introduces undeclared product semantics.
7. Every derived item identifies its basis.
8. Multiple reasonable product choices remain decisions rather than silent model choices.
9. Sample, framework, representative validation and full population are not confused.
10. Partial implementation is not worded as full completion.
11. Non-goals and forbidden shortcuts are explicit.
12. Risks concretely affect scope, verification or recovery rather than repeat a generic template.
13. No unsupported number, threshold, metric or conclusion appears.
14. Every `AC` names accepted `REQ`/`CTRL`/`OBL`/`NCOMP` keys and contains exactly one Given/When/Then scenario.
15. Every `NCOMP` is an explicit source meaning rather than a restated Requirement or non-goal.
16. Every `RISK` has one exact Fact, one Affected Outcome, Basis and Consequence; ambiguity is a `DEC`.
17. Every decided control field remains independently traceable instead of being compressed into an aggregate state sentence.

Do not emit a matrix or machine gate. End with:

```text
Completeness status:
- Ready for further refinement: yes|no
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
- a Context update, implementation, verification run or completion judgment.

The Source Plan improves the quality of declared Source. It cannot prove that the user has expressed every real requirement.
